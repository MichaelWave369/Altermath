// PhiOrbit O3: bounded nested clocks, hierarchical fuel and QC2 execution.
import { createHash } from 'node:crypto';
import { initialCube, executeCube, footprint } from './phiorbit-cube.mjs';

const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const sha = x => createHash('sha256').update(x).digest('hex');
const POLICIES = ['flat-edf', 'nested', 'nested-fallback'];

// Every domain owns one QC2 cube. Parent IDs precede children.
export function compileDomains(domains) {
  must(Array.isArray(domains) && domains.length >= 1 && domains.length <= 64, 'invalid domains');
  const result = [];
  for (const [id, d] of domains.entries()) {
    must(d && d.id === id && int(d.period, 1, 34) && int(d.phase, 0, d.period - 1) &&
      int(d.cap, 1, 64), 'invalid domain');
    must(id === 0 ? d.parent === null && d.period === 1 && d.phase === 0 :
      int(d.parent, 0, id - 1), 'invalid parent');
    const ancestors = id === 0 ? [0] : [...result[d.parent].ancestors, id];
    must(ancestors.length <= 8, 'domain nesting cap');
    result.push({ id, parent: d.parent, period: d.period, phase: d.phase, cap: d.cap, ancestors });
  }
  return result;
}

function clocks(compiled, horizon) {
  const counters = compiled.map(() => 0), ticks = [];
  for (let tick = 0; tick < horizon; tick++) {
    const active = [], opportunities = [];
    for (const d of compiled) {
      const opportunity = d.parent === null || active[d.parent];
      const local = opportunity ? counters[d.id]++ : null;
      opportunities.push(local);
      active.push(opportunity && local % d.period === d.phase);
    }
    ticks.push({ tick, active, opportunities });
  }
  return ticks;
}
export function clockTrace(domains, horizon) {
  must(int(horizon, 1, 512), 'invalid horizon');
  return clocks(compileDomains(domains), horizon);
}

// Infer conservative conflicts from O2 physical footprints and frame writes.
// Same-address frame updates conflict with each other, not physical writes.
export function compileJobs(jobs, domains) {
  must(Array.isArray(jobs) && jobs.length <= 512, 'invalid jobs');
  const ds = compileDomains(domains), ids = new Set(), previous = new Map();
  const program = Array.from(jobs, j => {
    must(j && int(j.id, 0, 4095) && !ids.has(j.id) &&
      int(j.domain, 0, ds.length - 1) && int(j.release, 0, 511) &&
      int(j.deadline, j.release, 511), 'invalid job');
    ids.add(j.id);
    const explicit = j.depends === undefined ? [] : j.depends;
    must(Array.isArray(explicit) && Array.from(explicit).every(x => int(x, 0, 4095)) &&
      new Set(explicit).size === explicit.length && !explicit.includes(j.id), 'invalid dependencies');
    const fp = footprint(j.operation);
    const op = j.operation.kind === 'layer' ?
      { kind: j.operation.kind, axis: j.operation.axis, turns: j.operation.turns, layer: j.operation.layer } :
      { kind: j.operation.kind, axis: j.operation.axis, turns: j.operation.turns };
    const keys = fp.frame ? [j.domain + ':frame'] : fp.positions.map(i => j.domain + ':' + i);
    const deps = new Set(explicit);
    for (const key of keys) {
      if (previous.has(key)) deps.add(previous.get(key));
      previous.set(key, j.id);
    }
    return { id: j.id, domain: j.domain, release: j.release, deadline: j.deadline,
      operation: op, depends: [...deps].sort((a, b) => a - b) };
  });
  const children = new Map(program.map(j => [j.id, []]));
  const indegree = new Map(program.map(j => [j.id, j.depends.length]));
  for (const j of program) for (const d of j.depends) {
    must(ids.has(d), 'unknown dependency');
    children.get(d).push(j.id);
  }
  const ready = program.filter(j => !j.depends.length).map(j => j.id);
  for (let i = 0; i < ready.length; i++) for (const child of children.get(ready[i])) {
    const left = indegree.get(child) - 1; indegree.set(child, left);
    if (!left) ready.push(child);
  }
  must(ready.length === program.length, 'cyclic dependency');
  return program;
}

export function runNested(domains, jobs, { policy = 'nested-fallback', horizon = 120 } = {}) {
  must(POLICIES.includes(policy) && int(horizon, 1, 512), 'invalid scheduler options');
  const ds = compileDomains(domains), program = compileJobs(jobs, domains);
  const trace = clocks(ds, horizon);
  const cubes = ds.map(() => initialCube()), status = new Map(program.map(j => [j.id, 'pending']));
  const sorted = [...program].sort((a, b) => a.deadline - b.deadline || a.release - b.release || a.id - b.id);
  const completed = [], rejected = [], ticks = [];
  const reject = (j, reason, tick) => { status.set(j.id, reason); rejected.push({ id: j.id, reason, tick }); };
  function settle(tick) {
    let changed;
    do {
      changed = false;
      for (const j of program) if (status.get(j.id) === 'pending' &&
        j.depends.some(d => ['blocked', 'expired'].includes(status.get(d)))) {
        reject(j, 'blocked', tick); changed = true;
      }
      if (!changed) for (const j of program) if (status.get(j.id) === 'pending' && j.deadline < tick) {
        reject(j, 'expired', tick); changed = true;
      }
    } while (changed);
  }
  for (const clock of trace) {
    settle(clock.tick);
    const remaining = ds.map(d => d.cap), executed = [];
    for (;;) {
      const eligible = j => status.get(j.id) === 'pending' && j.release <= clock.tick &&
        j.depends.every(d => status.get(d) === 'completed') &&
        ds[j.domain].ancestors.every(a => remaining[a] >= 1);
      let job = sorted.find(j => eligible(j) && (policy === 'flat-edf' || clock.active[j.domain]));
      if (!job && policy === 'nested-fallback') job = sorted.find(eligible);
      if (!job) break;
      const result = executeCube(cubes[job.domain], [job.operation], 1);
      cubes[job.domain] = result.output;
      for (const a of ds[job.domain].ancestors) remaining[a]--;
      status.set(job.id, 'completed');
      completed.push({ ...job, tick: clock.tick, aligned: clock.active[job.domain], receipt: result.receipt });
      executed.push(job.id);
    }
    ticks.push({ ...clock, used: ds.map(d => d.cap - remaining[d.id]), executed });
  }
  settle(horizon);
  const outstanding = program.filter(j => status.get(j.id) === 'pending').map(j => j.id);
  const selected = new Set(completed.map(j => j.id));
  // Reference fold in original input order, using same QC2 algebra.
  const oracle = ds.map(() => initialCube());
  for (const j of program) if (selected.has(j.id)) {
    oracle[j.domain] = executeCube(oracle[j.domain], [j.operation], 1).output;
  }
  must(cubes.every((b, i) => b.equals(oracle[i])), 'causal cube state mismatch');
  const final = cubes.map(b => b.toString('hex'));
  const result = { schema: 'phiorbit/o3', evidence: 'SIMULATED', authority: 'NONE',
    policy, horizon, domains: ds, program, completed, rejected, outstanding, ticks,
    final_cubes: final, final_state_sha256: sha(JSON.stringify(final)),
    metrics: { offered: program.length, completed: completed.length,
      expired: rejected.filter(j => j.reason === 'expired').length,
      blocked: rejected.filter(j => j.reason === 'blocked').length, outstanding: outstanding.length,
      aligned: completed.filter(j => j.aligned).length,
      root_fuel_used: ticks.reduce((sum, t) => sum + t.used[0], 0) } };
  result.trace_sha256 = sha(JSON.stringify(result));
  return result;
}

export function fixtureDomains() {
  return [
    { id: 0, parent: null, period: 1, phase: 0, cap: 6 },
    { id: 1, parent: 0, period: 2, phase: 0, cap: 3 },
    { id: 2, parent: 0, period: 3, phase: 1, cap: 3 },
    { id: 3, parent: 1, period: 3, phase: 0, cap: 2 },
    { id: 4, parent: 1, period: 5, phase: 1, cap: 2 },
    { id: 5, parent: 2, period: 2, phase: 0, cap: 2 },
    { id: 6, parent: 2, period: 5, phase: 2, cap: 2 },
  ];
}
export function fixtureJobs(seed, pattern) {
  must(int(seed, 1, 0xffffffff) && ['mixed', 'burst', 'tight'].includes(pattern), 'invalid fixture');
  let x = seed >>> 0;
  const next = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
  const jobs = [];
  for (let release = 0; release < 96; release++) {
    const arrivals = pattern === 'burst' ? (release % 8 === 0 ? 8 : 0) : 1 + next() % 3;
    for (let k = 0; k < arrivals; k++) {
      const kind = ['layer', 'layer', 'whole', 'frame'][next() % 4];
      const operation = { kind, axis: ['x', 'y', 'z'][next() % 3], turns: 1 + next() % 3 };
      if (kind === 'layer') operation.layer = next() % 3;
      const id = jobs.length;
      jobs.push({ id, domain: 3 + next() % 4, release,
        deadline: release + (pattern === 'tight' ? 2 : 4 + next() % 12), operation,
        depends: id >= 7 && id % 7 === 0 ? [id - 7] : [] });
    }
  }
  return jobs;
}
export function studyNested() {
  const rows = [];
  for (const seed of [369, 636, 963]) for (const pattern of ['mixed', 'burst', 'tight']) {
    const jobs = fixtureJobs(seed, pattern);
    for (const policy of POLICIES) {
      const r = runNested(fixtureDomains(), jobs, { policy });
      rows.push({ seed, pattern, policy, ...r.metrics, final_state_sha256: r.final_state_sha256 });
    }
  }
  return { schema: 'phiorbit/o3-study', evidence: 'SIMULATED', authority: 'NONE', rows };
}
