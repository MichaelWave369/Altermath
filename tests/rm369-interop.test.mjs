import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { compose, inverse, pocketId, decodeRM1, encodeRM1, executeRM2, verifyRM2 } from '../src/rm369-interop.mjs';

const makeCases = () => [
  { depth: 1, entries: [], operations: [[[], 1], [[], 4]], fuel: 3 },
  { depth: 2, entries: [[[], 7], [[0], 5]], operations: [[[], 4], [[0], 2]], fuel: 2 },
  { depth: 12, entries: [[[8, 3, 6], 7]], operations: [[[8, 3, 6], 1], [[8, 3, 6], 4], [[], 2]], fuel: 3 },
  { depth: 64, entries: [[Array(63).fill(8), 7]], operations: [[Array(63).fill(8), 7]], fuel: 1 },
  { depth: 3, entries: [], operations: [], fuel: 0 },
];
const snapshotFor = ({ depth, entries }) => encodeRM1(depth, new Map(entries.map(([p, g]) => [pocketId(depth, p), g])));

test('RM2 group and snapshot round trips', () => {
  for (let a = 0; a < 8; a++) {
    assert.equal(compose(a, inverse(a)), 0);
    for (let b = 0; b < 8; b++) for (let c = 0; c < 8; c++) {
      assert.equal(compose(a, compose(b, c)), compose(compose(a, b), c));
    }
  }
  assert.equal(compose(1, 4), 5);
  assert.equal(compose(4, 1), 7);
  for (const c of makeCases()) {
    const input = snapshotFor(c);
    const { output, receipt } = executeRM2(input, c.operations, c.fuel);
    assert.deepEqual(encodeRM1(c.depth, decodeRM1(input).overrides), input);
    assert.deepEqual(executeRM2(output, receipt.inverse_program, c.operations.length).output, input);
    assert.equal(verifyRM2(input, c.operations, c.fuel, output, receipt), true);
    assert.equal(verifyRM2(input, c.operations, c.fuel, output, { ...receipt, authority: 'GRANTED' }), false);
    assert.equal(verifyRM2(input, c.operations, c.fuel, Buffer.concat([output, Buffer.from([0])]), receipt), false);
  }
  assert.equal(pocketId(64, Array(63).fill(8)), (9n ** 64n - 1n) / 8n - 1n);
});

test('RM1 malformed records and invalid program refuse', () => {
  const input = Buffer.from('524d31020000000200010907', 'hex');
  assert.equal(decodeRM1(input).overrides.size, 2);
  for (const hex of ['524d31020000000200000907', '524d31020000000209070001', '524d31020000000200010908', '524d31020000000200010007', '524d31020000000200010a07']) {
    assert.throws(() => decodeRM1(Buffer.from(hex, 'hex')));
  }
  assert.throws(() => decodeRM1(input.subarray(0, -1)));
  assert.throws(() => executeRM2(input, [[[9], 1]], 1));
  assert.throws(() => executeRM2(input, [[[], true]], 1));
  assert.throws(() => executeRM2(input, [[[], 1]], 0));
  assert.throws(() => executeRM2(input, [[[], 1], [[0, 0], 2]], 2));
});

// Explicit opt-in; the CI workflow supplies the pinned Codex checkout.
test('pinned Codex Python producer agrees byte-for-byte', { skip: !process.env.RM369_CODEX_PATH }, () => {
  const cases = makeCases();
  const py = spawnSync('python', ['scripts/rm369-python-oracle.py'], {
    input: JSON.stringify(cases), encoding: 'utf8',
    env: { ...process.env, PYTHONPATH: process.env.RM369_CODEX_PATH },
    maxBuffer: 1024 * 1024,
  });
  assert.equal(py.status, 0, py.stderr);
  const expected = JSON.parse(py.stdout);
  assert.equal(expected.length, cases.length);
  for (const [i, c] of cases.entries()) {
    const input = snapshotFor(c);
    const actual = executeRM2(input, c.operations, c.fuel);
    assert.equal(input.toString('hex'), expected[i].input);
    assert.equal(actual.output.toString('hex'), expected[i].output);
    assert.deepEqual(actual.receipt, expected[i].receipt);
  }
});
