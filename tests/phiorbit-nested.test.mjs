import test from 'node:test';
import assert from 'node:assert/strict';
import { compileDomains, clockTrace, compileJobs, runNested, fixtureDomains, fixtureJobs, studyNested } from '../src/phiorbit-nested.mjs';
import { executeCube, initialCube } from '../src/phiorbit-cube.mjs';

const ds = fixtureDomains();
const layer = (axis, layer) => ({ kind: 'layer', axis, layer, turns: 1 });
const job = (id, overrides = {}) => ({ id, domain: 3, release: 0, deadline: 20,
  operation: layer('x', 0), ...overrides });

test('nested clocks advance on parent activations, independent of jobs', () => {
  const trace = clockTrace(ds, 31);
  const active = id => trace.filter(t => t.active[id]).map(t => t.tick);
  assert.deepEqual(active(1).slice(0, 5), [0, 2, 4, 6, 8]);
  assert.deepEqual(active(3), [0, 6, 12, 18, 24, 30]);
  assert.deepEqual(active(4), [2, 12, 22]);
  assert.deepEqual(active(5), [1, 7, 13, 19, 25]);
  assert.deepEqual(active(6), [7, 22]);
  assert.equal(trace[1].opportunities[3], null);
  assert.equal(trace[2].opportunities[3], 1);
  assert.deepEqual(runNested(ds, [], { horizon: 31 }).ticks.map(({ tick, active, opportunities }) =>
    ({ tick, active, opportunities })), trace);
});

test('parent and root caps are shared across child domains', () => {
  const jobs = Array.from({ length: 8 }, (_, i) => job(i, { domain: 3 + i % 2 }));
  const r = runNested(ds, jobs, { policy: 'flat-edf', horizon: 8 });
  assert.equal(r.metrics.completed, 8);
  assert.equal(r.ticks[0].used[1], 3);
  assert.equal(r.ticks[0].used[0], 3);
  for (const t of r.ticks) {
    for (const d of ds) assert.ok(t.used[d.id] <= d.cap);
    assert.equal(t.used[1], t.used[3] + t.used[4]);
    assert.equal(t.used[0], t.used[1] + t.used[2]);
  }
});

test('intersecting layers are ordered while disjoint slices and frames can reorder', () => {
  const jobs = [
    job(0), job(1, { operation: layer('x', 2), deadline: 0 }),
    job(2, { operation: layer('y', 0) }),
    job(3, { operation: { kind: 'frame', axis: 'z', turns: 1 }, deadline: 0 }),
    job(4, { operation: { kind: 'frame', axis: 'x', turns: 1 } }),
  ];
  const p = compileJobs(jobs, ds);
  assert.deepEqual(p.map(j => j.depends), [[], [], [0, 1], [], [3]]);
  const r = runNested(ds, jobs, { policy: 'flat-edf', horizon: 21 });
  assert.equal(r.metrics.completed, 5);
  assert.deepEqual(r.completed.map(j => j.id), [1, 3, 0, 2, 4]);
  const expected = executeCube(initialCube(), jobs.map(j => j.operation), 5).output;
  assert.equal(r.final_cubes[3], expected.toString('hex'));
  assert.ok(r.final_cubes.every((v, i) => i === 3 || v === initialCube().toString('hex')));
});

test('strict windows can fail; fallback preserves deadlines without bypassing dependencies', () => {
  const jobs = [job(0, { release: 1, deadline: 1 }),
    job(1, { release: 2, operation: layer('y', 0) })];
  const strict = runNested(ds, jobs, { policy: 'nested', horizon: 8 });
  assert.deepEqual(strict.rejected.map(j => [j.id, j.reason]), [[0, 'expired'], [1, 'blocked']]);
  const fallback = runNested(ds, jobs, { policy: 'nested-fallback', horizon: 8 });
  assert.deepEqual(fallback.completed.map(j => j.id), [0, 1]);
  assert.equal(fallback.completed[0].aligned, false);
  assert.equal(fallback.metrics.root_fuel_used, 2);
});

test('invalid domains, cycles, jobs and horizons refuse', () => {
  assert.throws(() => compileDomains([{ ...ds[0], period: 2 }]));
  assert.throws(() => compileDomains([ds[0], { ...ds[1], parent: 1 }]));
  assert.throws(() => compileJobs([job(0, { depends: [1] }), job(1)], ds));
  assert.throws(() => compileJobs([job(0, { depends: [99] })], ds));
  assert.throws(() => compileJobs([job(0, { operation: layer('z', 3) })], ds));
  assert.throws(() => runNested(ds, [], { horizon: 513 }));
});

test('all policies conserve hierarchical fuel and causal order on frozen fixtures', () => {
  for (const seed of [369, 636, 963]) for (const pattern of ['mixed', 'burst', 'tight']) {
    const jobs = fixtureJobs(seed, pattern);
    for (const policy of ['flat-edf', 'nested', 'nested-fallback']) {
      const r = runNested(ds, jobs, { policy });
      const done = new Set();
      for (const j of r.completed) {
        assert.ok(j.depends.every(d => done.has(d)));
        assert.ok(j.release <= j.tick && j.tick <= j.deadline);
        if (policy === 'nested') assert.equal(j.aligned, true);
        done.add(j.id);
      }
      const accounted = [...done, ...r.rejected.map(j => j.id), ...r.outstanding];
      assert.equal(accounted.length, jobs.length);
      assert.equal(new Set(accounted).size, jobs.length);
      assert.equal(r.metrics.root_fuel_used, done.size);
      for (const t of r.ticks) for (const d of ds) assert.ok(t.used[d.id] <= d.cap);
    }
  }
  assert.equal(studyNested().rows.length, 27);
});

test('complete execution trace is reproducible', () => {
  const jobs = fixtureJobs(369, 'mixed').slice(0, 24);
  const a = runNested(ds, jobs), b = runNested(ds, jobs);
  assert.deepEqual(a, b);
  assert.ok(a.completed.length > 0);
});
