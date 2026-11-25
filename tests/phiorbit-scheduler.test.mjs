import test from 'node:test';
import assert from 'node:assert/strict';
import { orbit, isAligned, fixture, schedule, replay, study } from '../src/phiorbit-scheduler.mjs';
import { RegionalField } from '../src/rm369-regional.mjs';
import { compose } from '../src/rm369-interop.mjs';

test('periods and phases are independent of gear state', () => {
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => orbit(i).period), [1, 2, 3, 5, 8, 13]);
  assert.deepEqual(orbit(8), { period: 3, phase: 1 });
  assert.equal(isAligned(8, 1), true);
  assert.equal(isAligned(8, 2), false);
  assert.equal(isAligned(8, 4), true);
  assert.throws(() => orbit(88));
});

test('all policies conserve fuel and account for every job', () => {
  for (const pattern of ['mixed', 'burst', 'tight']) {
    const jobs = fixture(369, pattern);
    for (const policy of ['fifo', 'edf', 'orbital', 'orbital-fallback']) {
      const r = schedule(jobs, { policy });
      const accounted = [...r.completed.map(j => j.id), ...r.expired, ...r.outstanding];
      assert.equal(new Set(accounted).size, jobs.length);
      assert.deepEqual(accounted.sort((a, b) => a - b), jobs.map(j => j.id));
      assert.ok(r.ticks.every(t => t.used <= 9 && t.used >= 0));
      for (const t of r.ticks) {
        assert.equal(t.used, r.completed.filter(j => j.tick === t.tick).reduce((s, j) => s + j.cost, 0));
      }
      assert.ok(r.completed.every(j => j.release <= j.tick && j.tick <= j.deadline));
      if (policy === 'orbital') assert.ok(r.completed.every(j => j.aligned));
      assert.deepEqual(r, schedule(jobs, { policy }));
    }
  }
  assert.equal(study().rows.length, 36);
});

test('strict orbital windows can cause avoidable deadline misses', () => {
  const jobs = [{ id: 0, release: 1, deadline: 1, start: 5, target: 5, node: 0, gear: 1 }];
  const options = { horizon: 3, fuel: 1 };
  assert.deepEqual(schedule(jobs, { ...options, policy: 'orbital' }).expired, [0]);
  assert.equal(schedule(jobs, { ...options, policy: 'edf' }).metrics.completed, 1);
  assert.equal(schedule(jobs, { ...options, policy: 'orbital-fallback' }).metrics.completed, 1);
  assert.equal(schedule(jobs, { ...options, policy: 'orbital-fallback' }).metrics.aligned_completions, 0);
});

test('boundary accounting and invalid jobs fail closed', () => {
  const j = { id: 0, release: 2, deadline: 2, start: 0, target: 0, node: 0, gear: 1 };
  assert.deepEqual(schedule([j], { horizon: 2 }).outstanding, [0]);
  assert.equal(schedule([j], { horizon: 3 }).metrics.completed, 1);
  assert.throws(() => schedule([j, j]));
  assert.throws(() => schedule([{ ...j, node: 91 }]));
  assert.throws(() => schedule([{ ...j, deadline: 1 }]));
  assert.throws(() => schedule([j], { fuel: 0 }));
});

test('replay executes genuine E7 gears with exact receipt chain', () => {
  const jobs = fixture(636, 'mixed').slice(0, 24);
  const options = { horizon: 32, fuel: 9, policy: 'orbital-fallback' };
  const r = replay(jobs, options);
  assert.equal(r.receipts.length, r.plan.completed.length);
  const fields = Array.from({ length: 12 }, () => new RegionalField(3));
  for (const [i, j] of r.plan.completed.entries()) {
    const receipt = r.receipts[i].receipt;
    const f = fields[j.target], before = f.read(j.node);
    assert.equal(receipt.before_orientation, before);
    f.write(j.node, compose(j.gear, before));
    assert.equal(receipt.after_orientation, f.read(j.node));
    assert.equal(receipt.used, j.cost);
    if (i) assert.equal(receipt.before_sha256, r.receipts[i - 1].receipt.after_sha256);
  }
  assert.equal(r.final_state_sha256, r.receipts.at(-1).receipt.after_sha256);
  assert.deepEqual(r, replay(jobs, options));
});
