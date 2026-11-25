// Matched E5 traces; preserve raw results, no timing assertions.
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { RegionalField } from '../src/rm369-regional.mjs';
import { workload, runCase } from '../src/rm369-benchmark.mjs';

const seeds = [369, 636, 963];
const scenarios = [
  { name: 'dormant', depth: 4, density: 0, pattern: 'clear' },
  { name: 'sparse-random', depth: 6, density: 0.01, pattern: 'random' },
  { name: 'dense-random', depth: 6, density: 0.9, pattern: 'random' },
  { name: 'clustered', depth: 6, density: 0.05, pattern: 'clustered' },
  { name: 'threshold-oscillation', depth: 4, density: 0, pattern: 'threshold' },
];
const modes = ['map', 'packed', 'byte-array', 'ra4', 'regional'];
const sha = b => createHash('sha256').update(b).digest('hex');
const must = (ok, msg) => { if (!ok) throw new Error(msg); };

function regional(work, timed) {
  const oracle = new Uint8Array(work.initial);
  let store = new RegionalField(work.depth);
  for (let i = 0; i < oracle.length; i++) if (oracle[i]) store.write(i, oracle[i]);
  const times = { read_ms: 0, update_ms: 0, encode_ms: 0, decode_ms: 0 };
  const measure = (key, fn) => {
    const start = timed ? performance.now() : 0;
    const result = fn();
    if (timed) times[key] += performance.now() - start;
    return result;
  };
  const checkpoints = [];
  for (const { reads, writes } of work.batches) {
    const observed = new Uint8Array(reads.length);
    measure('read_ms', () => { for (let i = 0; i < reads.length; i++) observed[i] = store.read(reads[i]); });
    for (let i = 0; i < reads.length; i++) must(observed[i] === oracle[reads[i]], 'read mismatch');
    measure('update_ms', () => { for (const [i, v] of writes) store.write(i, v); });
    for (const [i, v] of writes) oracle[i] = v;
    const liveBefore = store.modes();
    const snapshot = measure('encode_ms', () => store.snapshot());
    measure('decode_ms', () => { store = RegionalField.restore(snapshot); });
    for (let i = 0; i < oracle.length; i++) must(store.read(i) === oracle[i], 'restore mismatch');
    checkpoints.push({ bytes: snapshot.length, state_sha256: sha(oracle),
      snapshot_sha256: sha(snapshot), live_before_restore: liveBefore, live_after_restore: store.modes() });
  }
  return { mode: 'regional', checkpoints, times: timed ? times : null,
    final_state_sha256: sha(oracle) };
}
const timed = process.argv.includes('--timed');
const cases = [];
for (const scenario of scenarios) for (const seed of seeds) {
  const work = workload(scenario, seed);
  const run = (mode, t) => mode === 'regional' ? regional(work, t) : runCase(mode, work, { timed: t });
  const reference = modes.map(mode => run(mode, false));
  const check = row => must(row.checkpoints.every((c, i) =>
    c.state_sha256 === reference[0].checkpoints[i].state_sha256), 'backend mismatch');
  reference.forEach(check);
  const samples = [];
  if (timed) for (let rep = 0; rep < 3; rep++) for (let i = 0; i < modes.length; i++) {
    const row = run(modes[(i + rep + seed % modes.length) % modes.length], true);
    check(row); samples.push({ repetition: rep, ...row });
  }
  cases.push({ scenario: scenario.name, seed, reference, samples });
}
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const summary = cases.flatMap(c => c.reference.map(ref => {
  const samples = c.samples.filter(s => s.mode === ref.mode);
  return { scenario: c.scenario, seed: c.seed, mode: ref.mode,
    mean_snapshot_bytes: ref.checkpoints.reduce((sum, p) => sum + p.bytes, 0) / ref.checkpoints.length,
    median_batch_total_ms: samples.length ? Object.fromEntries(
      Object.keys(samples[0].times).map(k => [k, median(samples.map(s => s.times[k]))])) : null };
}));
console.log(JSON.stringify({ schema: 'rm369/e6-study', evidence: 'SIMULATED', authority: 'NONE',
  environment: timed ? { node: process.version, platform: process.platform, arch: process.arch,
    cpu: os.cpus()[0]?.model ?? 'unknown' } : null, cases, summary }, null, 2));
