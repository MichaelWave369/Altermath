import test from 'node:test';
import assert from 'node:assert/strict';
import { workload, runCase, study } from '../src/rm369-benchmark.mjs';

const modes = ['map', 'packed', 'byte-array', 'ra4'];

test('all stores preserve identical reads, writes and restored checkpoints', () => {
  const result = study();
  assert.equal(result.cases.length, 15);
  assert.equal(result.timing_enabled, false);
  for (const c of result.cases) {
    assert.equal(c.reference.length, 4);
    assert.equal(c.samples.length, 0);
    for (const row of c.reference) {
      assert.equal(row.read_count, 6144);
      assert.equal(row.checkpoints.length, 12);
      assert.equal(row.final_state_sha256, c.reference[0].final_state_sha256);
      assert.deepEqual(row.checkpoints.map(x => x.state_sha256),
        c.reference[0].checkpoints.map(x => x.state_sha256));
    }
  }
});

test('threshold trace forces repeated real sparse/packed transitions', () => {
  const w = workload({ depth: 4, density: 0, pattern: 'threshold' }, 369);
  const r = runCase('ra4', w);
  assert.deepEqual(r.checkpoints.map(c => c.mode),
    Array.from({ length: 12 }, (_, i) => i % 2 === 0 ? 'packed' : 'sparse'));
  assert.equal(r.write_count, 12);
  assert.ok(r.checkpoints.every(c => c.bytes === 313));
});

test('packed bit-boundary writes and zero clearing are exact', () => {
  const initial = new Uint8Array(10);
  const writes = Array.from({ length: 10 }, (_, i) => [i, i % 7 + 1]);
  const work = { depth: 2, initial, batches: [
    { reads: [0, 1, 2, 9], writes },
    { reads: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], writes: writes.map(([i]) => [i, 0]) },
  ] };
  const rows = modes.map(mode => runCase(mode, work));
  assert.ok(rows.every(r => r.final_state_sha256 === rows[0].final_state_sha256));
  assert.deepEqual(rows[3].checkpoints.map(c => [c.mode, c.bytes]), [['packed', 9], ['dormant', 5]]);
  assert.deepEqual(rows[1].checkpoints.map(c => c.bytes), [9, 9]);
  assert.throws(() => runCase('unknown', work));
});

test('timing is optional; never assert a performance winner', () => {
  const work = workload({ depth: 4, density: 0, pattern: 'clear' }, 636);
  const r = runCase('ra4', work, { timed: true });
  assert.ok(Object.values(r.times).every(t => Number.isFinite(t) && t >= 0));
  assert.ok(r.checkpoints.every(c => c.bytes === 5));
  assert.throws(() => study({ repetitions: 0 }));
});
