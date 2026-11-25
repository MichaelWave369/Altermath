// PhiOrbit E0: bounded deterministic scheduling on the E7 branch mesh.
import { BranchMesh, topology, route } from './rm369-branch-mesh.mjs';
import { createHash } from 'node:crypto';

const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const sha = x => createHash('sha256').update(x).digest('hex');
const PERIODS = [1, 2, 3, 5, 8, 13];
const POLICIES = ['fifo', 'edf', 'orbital', 'orbital-fallback'];

export function orbit(id) {
  must(int(id, 0, 87), 'invalid field');
  const period = PERIODS[id % PERIODS.length];
  return { period, phase: Math.floor(id / PERIODS.length) % period };
}

export function isAligned(id, tick) {
  must(int(tick, 0, 4095), 'invalid tick');
  const { period, phase } = orbit(id);
  return tick % period === phase;
}

// The job stream is frozen before policy selection.
export function fixture(seed = 369, pattern = 'mixed') {
  must(int(seed, 1, 0xffffffff) && ['mixed', 'burst', 'tight'].includes(pattern), 'invalid fixture');
  let x = seed >>> 0;
  const next = () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return x >>> 0;
  };
  const graph = topology(5);
  const jobs = [];
  for (let release = 0; release < 96; release++) {
    const arrivals = pattern === 'burst' ? (release % 8 === 0 ? 8 : 0) : 1 + next() % 3;
    for (let k = 0; k < arrivals; k++) {
      jobs.push({ id: jobs.length, release, deadline: release + (pattern === 'tight' ? 2 : 4 + next() % 12),
        start: 0, target: next() % graph.nodes.length, node: next() % 91, gear: 1 + next() % 7 });
    }
  }
  return jobs;
}

// Single tick completion; cost = minimum route hops + one local gear.
// Deadline is inclusive. Jobs not finished by horizon remain pending.
export function schedule(jobs, { policy = 'edf', horizon = 120, fuel = 9 } = {}) {
  must(POLICIES.includes(policy) && int(horizon, 1, 4096) && int(fuel, 1, 4096), 'invalid scheduler options');
  must(Array.isArray(jobs) && jobs.length <= 4096, 'invalid jobs');
  const graph = topology(5), allowed = graph.nodes.map(n => n.id);
  const ids = new Set();
  const pending = Array.from(jobs, j => {
    must(j && int(j.id, 0, 4095) && !ids.has(j.id) &&
      int(j.release, 0, 4095) && int(j.deadline, j.release, 4095) &&
      int(j.start, 0, allowed.length - 1) && int(j.target, 0, allowed.length - 1) &&
      int(j.node, 0, 90) && int(j.gear, 0, 7), 'invalid job');
    ids.add(j.id);
    const r = route(graph, j.start, j.target, allowed, 4096);
    must(r.status === 'ok', 'unreachable fixture');
    return { id: j.id, release: j.release, deadline: j.deadline, start: j.start,
      target: j.target, node: j.node, gear: j.gear, cost: r.cost + 1 };
  }).sort((a, b) => a.release - b.release || a.id - b.id);
  const compare = policy === 'fifo' ? (a, b) => a.release - b.release || a.id - b.id :
    (a, b) => a.deadline - b.deadline || a.release - b.release || a.id - b.id;
  const queue = [], completed = [], expired = [], ticks = [];
  let cursor = 0;
  for (let tick = 0; tick < horizon; tick++) {
    while (cursor < pending.length && pending[cursor].release <= tick) queue.push(pending[cursor++]);
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].deadline < tick) expired.push(queue.splice(i, 1)[0].id);
    }
    queue.sort(compare);
    let remaining = fuel;
    const executed = [];
    for (;;) {
      const eligible = j => j.cost <= remaining;
      let i = queue.findIndex(j => eligible(j) &&
        (policy === 'fifo' || policy === 'edf' || isAligned(j.target, tick)));
      if (i < 0 && policy === 'orbital-fallback') i = queue.findIndex(eligible);
      if (i < 0) break;
      const j = queue.splice(i, 1)[0];
      remaining -= j.cost;
      completed.push({ ...j, tick, aligned: isAligned(j.target, tick) });
      executed.push(j.id);
    }
    ticks.push({ tick, used: fuel - remaining, executed });
  }
  // Classify deadlines before the horizon boundary, including the last tick.
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].deadline < horizon) expired.push(queue.splice(i, 1)[0].id);
  }
  const outstanding = [...queue, ...pending.slice(cursor)].map(j => j.id).sort((a, b) => a - b);
  const used = ticks.reduce((s, t) => s + t.used, 0);
  const waits = completed.map(j => j.tick - j.release);
  const perField = allowed.map(id => ({
    field: id, offered: pending.filter(j => j.target === id).length,
    completed: completed.filter(j => j.target === id).length,
  }));
  return { schema: 'phiorbit/e0', evidence: 'SIMULATED', authority: 'NONE',
    policy, horizon, fuel_per_tick: fuel, offered: pending.length,
    completed, expired: expired.sort((a, b) => a - b), outstanding, ticks, per_field: perField,
    metrics: { completed: completed.length, expired: expired.length, outstanding: outstanding.length,
      used_fuel: used, available_fuel: horizon * fuel,
      mean_wait: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null,
      max_wait: waits.length ? Math.max(...waits) : null,
      aligned_completions: completed.filter(j => j.aligned).length } };
}

// Execute the exact deterministic plan on the existing E7 mesh.
// Grants here are local synthetic fixture grants, not real authorization.
export function replay(jobs, options = {}) {
  const plan = schedule(jobs, options);
  const mesh = new BranchMesh(5, 3);
  const allowed = mesh.graph().nodes.map(n => n.id);
  const receipts = [];
  for (const j of plan.completed) {
    const state = mesh.stateDigest();
    const request = { expected_sha256: state, start: j.start, target: j.target,
      node: j.node, gear: j.gear, budget: j.cost };
    const grant = { state_sha256: state, start: j.start, target: j.target,
      node: j.node, gear: j.gear, max_budget: j.cost, allowed };
    const receipt = mesh.execute(request, grant);
    must(receipt.used === j.cost, 'execution cost mismatch');
    receipts.push({ job: j.id, tick: j.tick, receipt });
  }
  return { plan, receipts, final_state_sha256: mesh.stateDigest(),
    trace_sha256: sha(JSON.stringify({ plan, receipts })) };
}

export function study() {
  const rows = [];
  for (const seed of [369, 636, 963]) for (const pattern of ['mixed', 'burst', 'tight']) {
    const jobs = fixture(seed, pattern);
    for (const policy of POLICIES) {
      const result = schedule(jobs, { policy });
      rows.push({ seed, pattern, policy, offered: jobs.length, ...result.metrics, per_field: result.per_field });
    }
  }
  return { schema: 'phiorbit/e0-study', evidence: 'SIMULATED', authority: 'NONE', rows };
}
