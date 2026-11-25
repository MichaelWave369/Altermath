// PhiOrbit O4: bounded workload-driven clock adaptation, same O3 budgets.
import { createHash } from 'node:crypto';
import { compileDomains, compileJobs, runNested, fixtureDomains, fixtureJobs } from './phiorbit-nested.mjs';
import { initialCube, executeCube } from './phiorbit-cube.mjs';

const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const sha = x => createHash('sha256').update(x).digest('hex');
const LADDER = [1, 2, 3, 5, 8, 13, 21, 34];
const MODES = ['adaptive', 'adaptive-fallback'];

// Demand is computed only from currently released, causally ready jobs.
// Demand is propagated up each job's ancestor path. No future arrivals
// or future completion information is available to the controller.
export function runAdaptive(domains, jobs, { policy = 'adaptive', horizon = 120 } = {}) {
  must(MODES.includes(policy) && int(horizon, 1, 512), 'invalid adaptive options');
  const ds = compileDomains(domains), program = compileJobs(jobs, domains);
  must(ds.every(d => LADDER.includes(d.period)), 'adaptive periods must be on ladder');
  const status = new Map(program.map(j => [j.id, 'pending']));
  const sorted = [...program].sort((a, b) => a.deadline - b.deadline || a.release - b.release || a.id - b.id);
  const cubes = ds.map(() => initialCube());
  const periods = ds.map(d => d.period), counters = ds.map(() => 0);
  const lastChange = ds.map(() => -3), changes = [], completed = [], rejected = [], ticks = [];
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
  const ready = (j, tick) => status.get(j.id) === 'pending' && j.release <= tick &&
    j.depends.every(d => status.get(d) === 'completed');

  for (let tick = 0; tick < horizon; tick++) {
    settle(tick);
    const demand = ds.map(() => 0), urgent = ds.map(() => false);
    for (const j of program) if (ready(j, tick)) for (const a of ds[j.domain].ancestors) {
      demand[a]++;
      if (j.deadline - tick <= 2) urgent[a] = true;
    }
    for (const d of ds.slice(1)) {
      const i = d.id, before = periods[i], index = LADDER.indexOf(before);
      let after = before, reason = null;
      // Urgency is the only exception to a three-tick adjustment cooldown.
      if (urgent[i]) { after = 1; reason = 'deadline'; }
      else if (tick - lastChange[i] >= 3) {
        if (demand[i] >= 2) { after = LADDER[Math.max(0, index - 1)]; reason = 'backlog'; }
        else if (demand[i] === 0 && before < d.period) {
          after = LADDER[Math.min(LADDER.indexOf(d.period), index + 1)]; reason = 'idle';
        }
      }
      if (after !== before) {
        periods[i] = after; lastChange[i] = tick;
        changes.push({ tick, domain: i, before, after, reason, demand: demand[i] });
      }
    }
    // Preserve monotonic parent-opportunity counters. Effective phase is
    // original phase modulo the current period; no clock reset on change.
    const active = [], opportunities = [];
    for (const d of ds) {
      const opportunity = d.parent === null || active[d.parent];
      const local = opportunity ? counters[d.id]++ : null;
      opportunities.push(local);
      active.push(opportunity && local % periods[d.id] === d.phase % periods[d.id]);
    }
    const remaining = ds.map(d => d.cap), executed = [];
    for (;;) {
      const eligible = j => ready(j, tick) && ds[j.domain].ancestors.every(a => remaining[a] >= 1);
      let job = sorted.find(j => eligible(j) && active[j.domain]);
      if (!job && policy === 'adaptive-fallback') job = sorted.find(eligible);
      if (!job) break;
      const result = executeCube(cubes[job.domain], [job.operation], 1);
      cubes[job.domain] = result.output;
      for (const a of ds[job.domain].ancestors) remaining[a]--;
      status.set(job.id, 'completed');
      completed.push({ ...job, tick, aligned: active[job.domain], receipt: result.receipt });
      executed.push(job.id);
    }
    ticks.push({ tick, active, opportunities, periods: [...periods], demand,
      used: ds.map(d => d.cap - remaining[d.id]), executed });
  }
  settle(horizon);
  const outstanding = program.filter(j => status.get(j.id) === 'pending').map(j => j.id);
  const selected = new Set(completed.map(j => j.id));
  const oracle = ds.map(() => initialCube());
  for (const j of program) if (selected.has(j.id)) oracle[j.domain] =
    executeCube(oracle[j.domain], [j.operation], 1).output;
  must(cubes.every((b, i) => b.equals(oracle[i])), 'causal cube state mismatch');
  const final = cubes.map(b => b.toString('hex'));
  const result = { schema: 'phiorbit/o4', evidence: 'SIMULATED', authority: 'NONE',
    policy, horizon, domains: ds, program, completed, rejected, outstanding, ticks, changes,
    final_cubes: final, final_state_sha256: sha(JSON.stringify(final)),
    metrics: { offered: program.length, completed: completed.length,
      expired: rejected.filter(j => j.reason === 'expired').length,
      blocked: rejected.filter(j => j.reason === 'blocked').length, outstanding: outstanding.length,
      aligned: completed.filter(j => j.aligned).length,
      root_fuel_used: ticks.reduce((sum, t) => sum + t.used[0], 0) } };
  result.trace_sha256 = sha(JSON.stringify(result));
  return result;
}

export function summarize(result) {
  const per_domain = result.domains.map(d => {
    const offered = result.program.filter(j => j.domain === d.id).length;
    const done = result.completed.filter(j => j.domain === d.id);
    return { domain: d.id, offered, completed: done.length,
      mean_wait: done.length ? done.reduce((s, j) => s + j.tick - j.release, 0) / done.length : null,
      max_wait: done.length ? Math.max(...done.map(j => j.tick - j.release)) : null,
      active_ticks: result.ticks.filter(t => t.active[d.id]).length };
  });
  const served = per_domain.filter(d => d.offered > 0).map(d => d.completed / d.offered);
  return { ...result.metrics, period_changes: result.changes?.length ?? 0,
    activation_windows: per_domain.reduce((s, d) => s + d.active_ticks, 0),
    off_orbit: result.metrics.completed - result.metrics.aligned,
    min_domain_completion: served.length ? Math.min(...served) : null, per_domain };
}

export function studyAdaptive() {
  const rows = [], domains = fixtureDomains();
  for (const seed of [369, 636, 963]) for (const pattern of ['mixed', 'burst', 'tight']) {
    const jobs = fixtureJobs(seed, pattern);
    for (const policy of ['flat-edf', 'nested', 'nested-fallback', ...MODES]) {
      const r = MODES.includes(policy) ? runAdaptive(domains, jobs, { policy }) :
        runNested(domains, jobs, { policy });
      rows.push({ seed, pattern, policy, ...summarize(r), final_state_sha256: r.final_state_sha256 });
    }
  }
  return { schema: 'phiorbit/o4-study', evidence: 'SIMULATED', authority: 'NONE', rows };
}
