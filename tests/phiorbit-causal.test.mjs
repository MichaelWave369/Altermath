import test from 'node:test';
import assert from 'node:assert/strict';
import { compile, scheduleCausal, replayCausal, referenceState, causalFixture, studyCausal } from '../src/phiorbit-causal.mjs';
import { schedule } from '../src/phiorbit-scheduler.mjs';

const job = (id, overrides = {}) => ({ id, release: 0, deadline: 10, start: 0, target: 0, node: 0, gear: 1, ...overrides });
const policies = ['fifo', 'edf', 'orbital', 'orbital-fallback'];

test('noncommuting writes retain program order despite EDF deadlines', () => {
  const jobs = [job(0, { gear: 1 }), job(1, { gear: 4, deadline: 0 })];
  assert.deepEqual(schedule(jobs, { policy: 'edf' }).completed.map(j => j.id), [1, 0]);
  for (const policy of policies) {
    const r = replayCausal(jobs, { policy, horizon: 2, fuel: 2 });
    assert.deepEqual(r.plan.completed.map(j => j.id), [0, 1]);
    assert.equal(r.receipts[1].receipt.after_orientation, 7);
    assert.equal(referenceState(r.plan.program, [0, 1])[0], 7);
  }
});

test('independent addresses may reorder without changing completed state', () => {
  const jobs = [job(0), job(1, { node: 1, deadline: 0 }), job(2, { node: 2, gear: 4, depends: [0, 1] })];
  const a = replayCausal(jobs, { policy: 'fifo', fuel: 3, horizon: 3 });
  const b = replayCausal(jobs, { policy: 'edf', fuel: 3, horizon: 3 });
  assert.deepEqual(a.plan.completed.map(j => j.id), [0, 1, 2]);
  assert.deepEqual(b.plan.completed.map(j => j.id), [1, 0, 2]);
  assert.equal(a.final_state_sha256, b.final_state_sha256);
  assert.notEqual(a.trace_sha256, b.trace_sha256);
});

test('failed predecessors block descendants, including future releases', () => {
  const jobs = [job(0, { target: 5, deadline: 0 }), job(1, { node: 1, depends: [0] }),
    job(2, { release: 9, deadline: 20, node: 2, depends: [1] }), job(3, { node: 3 })];
  const r = scheduleCausal(jobs, { horizon: 3, fuel: 1 });
  assert.deepEqual(r.completed.map(j => j.id), [3]);
  assert.deepEqual(r.rejected, [{ id: 0, reason: 'expired', tick: 1 },
    { id: 1, reason: 'blocked', tick: 1 }, { id: 2, reason: 'blocked', tick: 1 }]);
  assert.equal(r.outstanding.length, 0);
});

test('compile rejects malformed dependencies and cycles including inferred edges', () => {
  assert.throws(() => compile([job(0), job(0)]));
  assert.throws(() => compile([job(0, { depends: [99] })]));
  assert.throws(() => compile([job(0, { depends: [0] })]));
  assert.throws(() => compile([job(0, { depends: [1] }), job(1)]));
  assert.throws(() => compile([job(0, { depends: [1], node: 1 }), job(1, { depends: [0] })]));
  assert.throws(() => compile([job(0, { depends: [1, 1] }), job(1)]));
  assert.deepEqual(compile([job(0, { depends: [1] }), job(1, { node: 1 })])[0].depends, [1]);
});

test('every policy respects dependencies, deadlines and fuel on all fixtures', () => {
  for (const seed of [369, 636, 963]) for (const pattern of ['mixed', 'burst', 'tight']) {
    const jobs = causalFixture(seed, pattern);
    for (const policy of policies) {
      const r = scheduleCausal(jobs, { policy });
      const done = new Set();
      for (const j of r.completed) {
        assert.ok(j.depends.every(d => done.has(d)));
        assert.ok(j.release <= j.tick && j.tick <= j.deadline);
        if (policy === 'orbital') assert.ok(j.aligned);
        done.add(j.id);
      }
      const all = [...done, ...r.rejected.map(j => j.id), ...r.outstanding];
      assert.equal(all.length, jobs.length);
      assert.equal(new Set(all).size, jobs.length);
      assert.ok(r.ticks.every(t => t.used <= 9));
      assert.equal(r.metrics.used_fuel, r.completed.reduce((s, j) => s + j.cost, 0));
    }
  }
  assert.equal(studyCausal().rows.length, 36);
});

test('replay is deterministic on actual mesh and receipt chain', () => {
  const jobs = causalFixture(369, 'mixed').slice(0, 24);
  const options = { policy: 'orbital-fallback', horizon: 40, fuel: 9 };
  const r = replayCausal(jobs, options);
  assert.ok(r.receipts.length > 0);
  for (let i = 1; i < r.receipts.length; i++) {
    assert.equal(r.receipts[i].receipt.before_sha256, r.receipts[i - 1].receipt.after_sha256);
  }
  assert.deepEqual(r, replayCausal(jobs, options));
});
