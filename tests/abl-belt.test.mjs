import test from 'node:test';
import assert from 'node:assert/strict';
import { parseABL, runABL, verifyABLReceipts } from '../src/abl-belt.mjs';

const program = `DESCEND 3\nOBSERVE bits\nGEAR count-ones\nEXECUTE\nFOLD bits\nUNFOLD bits\nASCEND\nRETURN`;
const pockets = () => ({
  root: { fields: { summary: 5 }, links: [] },
  'root/3': { fields: { bits: '10110110' }, links: ['root/6'] },
  'root/6': { fields: { bits: '0011' }, links: ['root/3'] }
});
const grants = () => ({
  root: { descend: ['3'] },
  'root/3': { observe: ['bits'], gear: ['count-ones'], execute: ['count-ones'], fold: ['bits'], unfold: ['bits'], ascend: ['..'], lateral: ['root/6'] },
  'root/6': { observe: ['bits'], ascend: ['..'], receive: ['root/3'], lateral: ['root/3'] }
});
const run = (overrides = {}) => runABL({ program, pockets: pockets(), grants: grants(), ...overrides });

test('bounded parser accepts strict line-oriented opcodes', () => {
  assert.equal(parseABL(program).length, 8);
  assert.throws(() => parseABL('EVAL js\nRETURN'), /unknown opcode/);
  assert.throws(() => parseABL('RETURN\nOBSERVE bits'), /terminal RETURN/);
  assert.throws(() => parseABL('OBSERVE bits extra\nRETURN'), /invalid operands/);
  assert.throws(() => parseABL(''), /instruction count/);
});
test('bidirectional navigation, typed gear, exact round trip and deterministic receipts', () => {
  const a = run(); const b = run();
  assert.equal(a.ok, true);
  assert.equal(a.pocket, 'root');
  assert.equal(a.result, '10110110');
  assert.equal(a.archiveEntries, 1);
  assert.equal(a.steps, 8);
  assert.equal(a.receiptHead, b.receiptHead);
  assert.equal(verifyABLReceipts(a.receipts), true);
  assert.deepEqual(a.receipts, b.receipts);
  assert.equal(a.receipts.find(x => x.op === 'FOLD').info.length, 8);
});
test('cannot unfold a lossy summary with no residual', () => {
  assert.throws(() => run({ program: 'DESCEND 3\nUNFOLD bits\nRETURN' }), /missing or damaged exact residual/);
});
test('refuse private observations and operations lacking explicit grant', () => {
  const g = grants(); delete g['root/3'].observe;
  assert.throws(() => run({ grants: g }), /permission denied/);
  const h = grants(); delete h['root/3'].unfold;
  assert.throws(() => run({ grants: h }), /permission denied/);
});
test('refuse forbidden traversal, bad links and excessive budget', () => {
  assert.throws(() => run({ program: 'DESCEND 6\nRETURN' }), /permission denied/);
  assert.throws(() => run({ maxSteps: 7 }), /step budget exceeded/);
  const p = pockets(); p['root/3'].links = ['no-such-pocket'];
  assert.throws(() => run({ pockets: p }), /unknown lateral destination/);
});
test('a lateral junction requires consent from source and destination', () => {
  const path = 'DESCEND 3\nLATERAL root/6\nOBSERVE bits\nASCEND\nRETURN';
  const a = run({ program: path });
  assert.equal(a.pocket, 'root'); assert.equal(a.result, '0011');
  const g = grants(); g['root/6'].receive = [];
  assert.throws(() => run({ program: path, grants: g }), /junction refused/);
});
test('a gear checks types and execution authority', () => {
  const path = 'DESCEND 3\nOBSERVE bits\nGEAR double\nEXECUTE\nRETURN';
  const g = grants(); g['root/3'].gear = ['double']; g['root/3'].execute = ['double'];
  assert.throws(() => run({ program: path, grants: g }), /type mismatch/);
});
test('hash receipts detect edits but do not authenticate any operator', () => {
  const receipts = structuredClone(run().receipts);
  receipts[2].op = 'EXECUTE';
  assert.equal(verifyABLReceipts(receipts), false);
});
test('execution never mutates source pocket data, including on refusal', () => {
  const p = pockets(); const snapshot = JSON.stringify(p);
  run({ pockets: p });
  assert.equal(JSON.stringify(p), snapshot);
  assert.throws(() => run({ pockets: p, program: 'ASCEND\nRETURN' }), /no parent/);
  assert.equal(JSON.stringify(p), snapshot);
});

test('navigation invalidates input and a gear cannot consume values from another pocket', () => {
  const path = 'DESCEND 3\nOBSERVE bits\nASCEND\nGEAR count-ones\nEXECUTE\nRETURN';
  const g = grants(); g.root.gear = ['count-ones']; g.root.execute = ['count-ones'];
  assert.throws(() => run({ program: path, grants: g }), /fresh, local gear input/);
});
test('cannot terminate while nested or skip required return path', () => {
  assert.throws(() => run({ program: 'DESCEND 3\nRETURN' }), /unbalanced return path/);
});
