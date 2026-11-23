import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCausalScore, runCausalScore, verifyCausalReceipts, CAUSAL_VERSION } from '../src/causal-belt.mjs';

const pockets = () => ({
  root: { fields: { rootMetric: 3 } },
  'root/net': { fields: { latency: 16 } },
  'root/render': { fields: { frame: 9, frameDetailed: 12 } }
});
const grants = () => ({
  root: { delegate: ['root/net', 'root/render'], compose: ['sum'], finish: ['result'], cancel: ['root/net'], observe: ['rootMetric'] },
  'root/net': { observe: ['latency'], execute: ['double'], return: ['root'] },
  'root/render': { observe: ['frame', 'frameDetailed'], refine: ['frameDetailed'], return: ['root'] }
});
const score = () => [
  { id: 'd_net', op: 'DELEGATE', pocket: 'root', deps: [], child: 'root/net', allocation: 7 },
  { id: 'd_render', op: 'DELEGATE', pocket: 'root', deps: [], child: 'root/render', allocation: 7 },
  { id: 'net_obs', op: 'OBSERVE', pocket: 'root/net', deps: ['d_net'], field: 'latency' },
  { id: 'net_calc', op: 'EXECUTE', pocket: 'root/net', deps: ['net_obs'], gear: 'double', source: 'net_obs' },
  { id: 'net_return', op: 'RETURN', pocket: 'root/net', deps: ['net_calc'], source: 'net_calc' },
  { id: 'render_obs', op: 'OBSERVE', pocket: 'root/render', deps: ['d_render'], field: 'frame' },
  { id: 'render_refine', op: 'REFINE', pocket: 'root/render', deps: ['render_obs'], field: 'frameDetailed', source: 'render_obs' },
  { id: 'render_return', op: 'RETURN', pocket: 'root/render', deps: ['render_refine'], source: 'render_refine' },
  { id: 'combined', op: 'COMPOSE', pocket: 'root', deps: ['net_return', 'render_return'], sources: ['net_return', 'render_return'], gear: 'sum' },
  { id: 'finished', op: 'FINISH', pocket: 'root', deps: ['combined'], source: 'combined' }
];
const go = (options = {}) => runCausalScore({ score: score(), pockets: pockets(), grants: grants(), ...options });

test('deterministic causal score: sibling task branches, returns, composition', () => {
  const a = go(); const b = go({ score: score().reverse() });
  assert.equal(a.version, CAUSAL_VERSION);
  assert.equal(a.result, 44);
  assert.equal(a.events, 10);
  assert.equal(a.fuelConsumed, 11);
  assert.equal(a.rootFuelRemaining, 29);
  assert.equal(a.receiptHead, b.receiptHead);
  assert.deepEqual(a.receipts, b.receipts);
  assert.deepEqual(a.frontiers[0], ['d_net', 'd_render']);
  assert.equal(verifyCausalReceipts(a.receipts), true);
});
test('different sibling execution orders are not falsely treated as causal dependencies', () => {
  const c = compileCausalScore({ score: score(), pockets: pockets() });
  assert.ok(c.frontiers.some(batch => batch.includes('net_obs') && batch.includes('render_obs')));
  const composeIndex = c.order.findIndex(e => e.id === 'combined');
  assert.ok(c.order.findIndex(e => e.id === 'net_return') < composeIndex);
  assert.ok(c.order.findIndex(e => e.id === 'render_return') < composeIndex);
});
test('cycle, missing dependency, duplicate ID and unknown field fail closed', () => {
  const cyclic = score(); cyclic.find(e => e.id === 'net_obs').deps = ['net_calc'];
  assert.throws(() => go({ score: cyclic }), /cycle/);
  const missing = score(); missing.find(e => e.id === 'net_obs').deps = ['absent'];
  assert.throws(() => go({ score: missing }), /missing or self dependency/);
  const duplicate = score(); duplicate[1].id = 'd_net';
  assert.throws(() => go({ score: duplicate }), /invalid or duplicate event/);
  const unexpected = score(); unexpected[0].secretCode = 'ignore policy';
  assert.throws(() => go({ score: unexpected }), /unexpected event field/);
});
test('every child event must causally descend from its own delegate', () => {
  const detached = score(); detached.find(e => e.id === 'net_obs').deps = [];
  assert.throws(() => go({ score: detached }), /missing causal delegation ancestry/);
});
test('unapproved observations and refinements are denied independently', () => {
  const deniedObserve = grants(); deniedObserve['root/net'].observe = [];
  assert.throws(() => go({ grants: deniedObserve }), /permission denied for observe/);
  const deniedRefine = grants(); deniedRefine['root/render'].refine = [];
  assert.throws(() => go({ grants: deniedRefine }), /permission denied for refine/);
});
test('delegation cannot oversubscribe root or child fuel', () => {
  assert.throws(() => go({ fuel: 12 }), /over budget/);
  const short = score(); short.find(e => e.id === 'd_net').allocation = 2;
  assert.throws(() => go({ score: short }), /insufficient fuel/);
  const denied = grants(); denied.root.delegate = [];
  assert.throws(() => go({ grants: denied }), /permission denied for delegate/);
});
test('a pocket cannot borrow a sibling result through a gear', () => {
  const cross = score();
  cross.find(e => e.id === 'net_calc').source = 'render_obs';
  cross.find(e => e.id === 'net_calc').deps = ['net_obs', 'render_obs'];
  assert.throws(() => go({ score: cross }), /cross-pocket data access forbidden/);
});
test('COMPOSE requires returned direct-child results, not raw sibling observations', () => {
  const cross = score();
  cross.find(e => e.id === 'combined').sources = ['net_obs', 'render_return'];
  cross.find(e => e.id === 'combined').deps = ['net_obs', 'render_return'];
  assert.throws(() => go({ score: cross }), /composition requires returned direct-child results/);
});
test('unreturned children prevent the root from finishing', () => {
  const incomplete = [
    { id: 'd_net', op: 'DELEGATE', pocket: 'root', deps: [], child: 'root/net', allocation: 5 },
    { id: 'root_obs', op: 'OBSERVE', pocket: 'root', deps: [], field: 'rootMetric' },
    { id: 'end', op: 'FINISH', pocket: 'root', deps: ['d_net', 'root_obs'], source: 'root_obs' }
  ];
  assert.throws(() => go({ score: incomplete }), /unfinished children/);
});
test('cancellation releases unused child reservations and invalidates the child', () => {
  const cancelled = [
    { id: 'd_net', op: 'DELEGATE', pocket: 'root', deps: [], child: 'root/net', allocation: 7 },
    { id: 'cancel', op: 'CANCEL', pocket: 'root', deps: ['d_net'], child: 'root/net' },
    { id: 'root_obs', op: 'OBSERVE', pocket: 'root', deps: ['cancel'], field: 'rootMetric' },
    { id: 'end', op: 'FINISH', pocket: 'root', deps: ['root_obs'], source: 'root_obs' }
  ];
  const r = go({ score: cancelled });
  assert.equal(r.result, 3);
  assert.equal(r.fuelConsumed, 4);
  assert.equal(r.rootFuelRemaining, 36);
  const illegal = [...cancelled];
  illegal.splice(2, 0, { id: 'after_cancel', op: 'OBSERVE', pocket: 'root/net', deps: ['cancel', 'd_net'], field: 'latency' });
  assert.throws(() => go({ score: illegal }), /inactive pocket/);
});
test('receipts are deterministic and catch accidental changes but are not signatures', () => {
  const trace = go();
  const receipts = structuredClone(trace.receipts);
  receipts[2].outputDigest = 'forged';
  assert.equal(verifyCausalReceipts(receipts), false);
  assert.ok(!JSON.stringify(trace.receipts).includes('frameDetailed'));
  assert.equal(trace.authority, 'SIMULATED_LOCAL / NONE');
});
test('invalid world state and high risk numeric output refuse', () => {
  const bad = pockets(); bad['root/net'].fields.latency = Number.NaN;
  assert.throws(() => go({ pockets: bad }), /finite numeric/);
  assert.throws(() => go({ fuel: 0 }), /root fuel/);
  const p = pockets(); p['root/net'].fields.latency = Number.MAX_VALUE;
  const tooMany = score();
  tooMany.find(e => e.id === 'net_calc').gear = 'double';
  assert.throws(() => go({ score: tooMany, pockets: p }), /nonfinite computed output/);
});
