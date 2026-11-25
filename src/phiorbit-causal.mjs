// PhiOrbit O1: dependency-aware bounded scheduling for local D4 gear edits.
import { createHash } from 'node:crypto';
import { BranchMesh, topology, route } from './rm369-branch-mesh.mjs';
import { isAligned, fixture } from './phiorbit-scheduler.mjs';
import { compose } from './rm369-interop.mjs';

const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const sha = x => createHash('sha256').update(x).digest('hex');
const POLICIES = ['fifo', 'edf', 'orbital', 'orbital-fallback'];

// Input array order defines the reference order of writes to each address.
// Explicit dependencies may add cross-address edges but may not create cycles.
export function compile(jobs) {
  must(Array.isArray(jobs) && jobs.length <= 4096, 'invalid jobs');
  const graph = topology(5), allowed = graph.nodes.map(n => n.id);
  const previous = new Map(), byId = new Map();
  const program = Array.from(jobs, j => {
    must(j && int(j.id, 0, 4095) && !byId.has(j.id) &&
      int(j.release, 0, 4095) && int(j.deadline, j.release, 4095) &&
      int(j.start, 0, 11) && int(j.target, 0, 11) && int(j.node, 0, 90) &&
      int(j.gear, 0, 7), 'invalid job');
    const explicit = j.depends === undefined ? [] : j.depends;
    must(Array.isArray(explicit) && Array.from(explicit).every(d => int(d, 0, 4095)) &&
      new Set(explicit).size === explicit.length && !explicit.includes(j.id), 'invalid dependencies');
    const address = j.target + ':' + j.node;
    const deps = new Set(explicit);
    if (previous.has(address)) deps.add(previous.get(address));
    previous.set(address, j.id);
    const r = route(graph, j.start, j.target, allowed, 4096);
    must(r.status === 'ok', 'unreachable fixture');
    const entry = { id: j.id, release: j.release, deadline: j.deadline, start: j.start,
      target: j.target, node: j.node, gear: j.gear, cost: r.cost + 1,
      depends: [...deps].sort((a, b) => a - b) };
    byId.set(j.id, entry);
    return entry;
  });
  // Kahn validation, including forward references and conflict-induced cycles.
  const indegree = new Map(), children = new Map(program.map(j => [j.id, []]));
  for (const j of program) {
    indegree.set(j.id, j.depends.length);
    for (const d of j.depends) {
      must(byId.has(d), 'unknown dependency');
      children.get(d).push(j.id);
    }
  }
  const ready = program.filter(j => !indegree.get(j.id)).map(j => j.id);
  for (let i = 0; i < ready.length; i++) for (const child of children.get(ready[i])) {
    const n = indegree.get(child) - 1;
    indegree.set(child, n);
    if (!n) ready.push(child);
  }
  must(ready.length === program.length, 'cyclic dependency');
  return program;
}

export function scheduleCausal(jobs, { policy = 'edf', horizon = 120, fuel = 9 } = {}) {
  must(POLICIES.includes(policy) && int(horizon, 1, 4096) && int(fuel, 1, 4096), 'invalid options');
  const program = compile(jobs);
  const status = new Map(program.map(j => [j.id, 'pending']));
  const completed = [], rejected = [], ticks = [];
  const compare = policy === 'fifo' ? (a, b) => a.release - b.release || a.id - b.id :
    (a, b) => a.deadline - b.deadline || a.release - b.release || a.id - b.id;
  const sorted = [...program].sort(compare);

  function reject(j, reason, tick) {
    status.set(j.id, reason);
    rejected.push({ id: j.id, reason, tick });
  }
  function settle(tick) {
    // Close failures transitively, including descendants not yet released.
    // Dependency failure takes precedence over expiration at this boundary.
    let changed;
    do {
      changed = false;
      for (const j of program) if (status.get(j.id) === 'pending' &&
        j.depends.some(d => ['expired', 'blocked'].includes(status.get(d)))) {
        reject(j, 'blocked', tick); changed = true;
      }
      if (!changed) for (const j of program) if (status.get(j.id) === 'pending' && j.deadline < tick) {
        reject(j, 'expired', tick); changed = true;
      }
    } while (changed);
  }

  for (let tick = 0; tick < horizon; tick++) {
    settle(tick);
    let remaining = fuel;
    const executed = [];
    for (;;) {
      const eligible = j => status.get(j.id) === 'pending' && j.release <= tick &&
        j.cost <= remaining && j.depends.every(d => status.get(d) === 'completed');
      let j = sorted.find(j => eligible(j) &&
        (policy === 'fifo' || policy === 'edf' || isAligned(j.target, tick)));
      if (!j && policy === 'orbital-fallback') j = sorted.find(eligible);
      if (!j) break;
      remaining -= j.cost;
      status.set(j.id, 'completed');
      completed.push({ ...j, tick, aligned: isAligned(j.target, tick) });
      executed.push(j.id);
    }
    ticks.push({ tick, used: fuel - remaining, executed });
  }
  settle(horizon);
  const outstanding = program.filter(j => status.get(j.id) === 'pending').map(j => j.id);
  const expired = rejected.filter(j => j.reason === 'expired').length;
  const blocked = rejected.filter(j => j.reason === 'blocked').length;
  return { schema: 'phiorbit/o1', evidence: 'SIMULATED', authority: 'NONE', policy,
    horizon, fuel_per_tick: fuel, program, completed, rejected, outstanding, ticks,
    metrics: { offered: program.length, completed: completed.length, expired, blocked,
      outstanding: outstanding.length, used_fuel: ticks.reduce((s, t) => s + t.used, 0),
      aligned_completions: completed.filter(j => j.aligned).length } };
}

// Reference fold in original per-address order, restricted to admitted jobs.
// This is an independent state oracle, not a scheduler or deadline oracle.
export function referenceState(program, completedIds) {
  const selected = new Set(completedIds), state = new Uint8Array(12 * 91);
  for (const j of program) if (selected.has(j.id)) {
    const i = j.target * 91 + j.node;
    state[i] = compose(j.gear, state[i]);
  }
  return state;
}

export function replayCausal(jobs, options = {}) {
  const plan = scheduleCausal(jobs, options), mesh = new BranchMesh(5, 3);
  const allowed = mesh.graph().nodes.map(n => n.id), receipts = [];
  const state = new Uint8Array(12 * 91);
  for (const j of plan.completed) {
    const before = mesh.stateDigest();
    const edit = { start: j.start, target: j.target, node: j.node, gear: j.gear };
    const receipt = mesh.execute({ ...edit, expected_sha256: before, budget: j.cost },
      { ...edit, state_sha256: before, max_budget: j.cost, allowed });
    const i = j.target * 91 + j.node;
    must(receipt.before_orientation === state[i] && receipt.used === j.cost, 'execution mismatch');
    state[i] = receipt.after_orientation;
    receipts.push({ job: j.id, tick: j.tick, receipt });
  }
  const reference = referenceState(plan.program, plan.completed.map(j => j.id));
  must(Buffer.from(state).equals(Buffer.from(reference)), 'causal state mismatch');
  return { plan, receipts, final_state_sha256: mesh.stateDigest(),
    orientation_sha256: sha(state), trace_sha256: sha(JSON.stringify({ plan, receipts })) };
}

// Same frozen trace for every policy; concentrated writes force conflicts.
export function causalFixture(seed, pattern) {
  const jobs = fixture(seed, pattern);
  return jobs.map((j, i) => ({ ...j, node: j.node % 3,
    depends: i >= 5 && i % 5 === 0 ? [jobs[i - 5].id] : [] }));
}
export function studyCausal() {
  const rows = [];
  for (const seed of [369, 636, 963]) for (const pattern of ['mixed', 'burst', 'tight']) {
    const jobs = causalFixture(seed, pattern);
    for (const policy of POLICIES) {
      const plan = scheduleCausal(jobs, { policy });
      rows.push({ seed, pattern, policy, ...plan.metrics });
    }
  }
  return { schema: 'phiorbit/o1-study', evidence: 'SIMULATED', authority: 'NONE', rows };
}
