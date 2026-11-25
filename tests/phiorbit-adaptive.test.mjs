import test from 'node:test';
import assert from 'node:assert/strict';
import { runAdaptive, summarize, studyAdaptive } from '../src/phiorbit-adaptive.mjs';
import { fixtureDomains, fixtureJobs, runNested } from '../src/phiorbit-nested.mjs';

const ds = fixtureDomains();
const job = (id, overrides = {}) => ({ id, domain: 3, release: 1, deadline: 1,
  operation: { kind: 'layer', axis: 'x', layer: 0, turns: 1 }, ...overrides });

test('deadline pressure wakes the entire ancestor path without extra fuel', () => {
  const jobs = [job(0)];
  const strict = runNested(ds, jobs, { policy: 'nested', horizon: 10 });
  assert.equal(strict.metrics.expired, 1);
  const r = runAdaptive(ds, jobs, { horizon: 10 });
  assert.equal(r.metrics.completed, 1);
  assert.equal(r.completed[0].tick, 1);
  assert.equal(r.completed[0].aligned, true);
  assert.deepEqual(r.changes.filter(c => c.tick === 1).map(c => [c.domain, c.after, c.reason]),
    [[1, 1, 'deadline'], [3, 1, 'deadline']]);
  assert.deepEqual(r.ticks[1].used, [1, 1, 0, 1, 0, 0, 0]);
  assert.equal(r.ticks[9].periods[3], 3);
  assert.equal(r.ticks[9].periods[1], 2);
});

test('empty and unreleased workloads cannot cause anticipatory changes', () => {
  const future = job(0, { release: 10, deadline: 10 });
  const a = runAdaptive(ds, [], { horizon: 10 });
  const b = runAdaptive(ds, [future], { horizon: 10 });
  assert.deepEqual(a.ticks, b.ticks);
  assert.deepEqual(b.changes, []);
  assert.deepEqual(b.outstanding, [0]);
  const base = runNested(ds, [], { horizon: 10, policy: 'nested' });
  assert.deepEqual(a.ticks.map(t => t.active), base.ticks.map(t => t.active));
});

test('blocked dependencies cannot drive clocks or execute', () => {
  const jobs = [job(0, { release: 5, deadline: 5, domain: 4 }),
    job(1, { release: 0, deadline: 10, depends: [0] })];
  const r = runAdaptive(ds, jobs, { horizon: 12 });
  assert.ok(r.ticks.slice(0, 5).every(t => t.demand.every(n => n === 0)));
  assert.deepEqual(r.completed.map(j => j.id), [0, 1]);
});

test('period adaptation preserves caps, dependencies and deterministic cube bytes', () => {
  for (const seed of [369, 636, 963]) for (const pattern of ['mixed', 'burst', 'tight']) {
    const jobs = fixtureJobs(seed, pattern);
    for (const policy of ['adaptive', 'adaptive-fallback']) {
      const r = runAdaptive(ds, jobs, { policy });
      const done = new Set();
      for (const j of r.completed) {
        assert.ok(j.depends.every(d => done.has(d)));
        assert.ok(j.release <= j.tick && j.tick <= j.deadline);
        if (policy === 'adaptive') assert.equal(j.aligned, true);
        done.add(j.id);
      }
      const accounted = [...done, ...r.rejected.map(j => j.id), ...r.outstanding];
      assert.equal(accounted.length, jobs.length);
      assert.equal(new Set(accounted).size, jobs.length);
      assert.equal(r.metrics.root_fuel_used, done.size);
      for (const t of r.ticks) for (const d of ds) {
        assert.ok(t.used[d.id] <= d.cap);
        assert.ok(t.periods[d.id] <= d.period);
        assert.ok([1, 2, 3, 5, 8, 13, 21, 34].includes(t.periods[d.id]));
        if (d.parent !== null && t.active[d.id]) assert.equal(t.active[d.parent], true);
      }
      for (const c of r.changes) assert.ok(c.domain > 0);
      const s = summarize(r);
      assert.equal(s.off_orbit + s.aligned, done.size);
      assert.equal(s.period_changes, r.changes.length);
    }
  }
  const jobs = fixtureJobs(369, 'mixed').slice(0, 24);
  assert.deepEqual(runAdaptive(ds, jobs), runAdaptive(ds, jobs));
});

test('five matched policies and invalid options', () => {
  const s = studyAdaptive();
  assert.equal(s.rows.length, 45);
  for (const row of s.rows) assert.equal(row.offered, row.completed + row.expired + row.blocked + row.outstanding);
  assert.throws(() => runAdaptive(ds, [], { policy: 'unknown' }));
  assert.throws(() => runAdaptive(ds, [], { horizon: 513 }));
  const bad = ds.map(d => d.id === 1 ? { ...d, period: 4 } : d);
  assert.throws(() => runAdaptive(bad, []));
});
