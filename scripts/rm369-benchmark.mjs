// Emit raw measurements plus medians; no timing thresholds or winner claims.
import os from 'node:os';
import { study } from '../src/rm369-benchmark.mjs';

const timed = process.argv.includes('--timed');
if (process.argv.slice(2).some(arg => arg !== '--timed')) throw new Error('use --timed or no arguments');
const result = study({ timed });
const median = values => {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};
const summary = result.cases.flatMap(c => c.reference.map(ref => {
  const samples = c.samples.filter(s => s.mode === ref.mode);
  return {
    scenario: c.scenario, seed: c.seed, mode: ref.mode,
    mean_snapshot_bytes: ref.checkpoints.reduce((sum, row) => sum + row.bytes, 0) / ref.checkpoints.length,
    peak_snapshot_bytes: Math.max(...ref.checkpoints.map(row => row.bytes)),
    storage_modes: ref.checkpoints.map(row => row.mode),
    median_batch_total_ms: samples.length ? Object.fromEntries(
      Object.keys(samples[0].times).map(key => [key, median(samples.map(s => s.times[key]))])) : null,
    median_initial_memory_delta_bytes: samples.length && samples[0].memory_delta_bytes ? Object.fromEntries(
      Object.keys(samples[0].memory_delta_bytes).map(key => [key, median(samples.map(s => s.memory_delta_bytes[key]))])) : null,
  };
}));
console.log(JSON.stringify({
  ...result, summary,
  environment: timed ? {
    node: process.version, v8: process.versions.v8, platform: process.platform,
    arch: process.arch, cpu: os.cpus()[0]?.model ?? 'unknown',
    logical_cpus: os.cpus().length, total_memory_bytes: os.totalmem(),
  } : null,
}, null, 2));
