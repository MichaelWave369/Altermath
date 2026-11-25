// RM-369 E5: matched orientation-store workloads. No live routing.
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { encodeRM1, decodeRM1 } from './rm369-interop.mjs';
import { encodeAdaptive, decodeAdaptive } from './rm369-elastic.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const must = (ok, message) => { if (!ok) throw new Error(message); };
const nodeCount = depth => (9 ** depth - 1) / 8;
const modes = ['map', 'packed', 'byte-array', 'ra4'];
const seeds = [369, 636, 963];
const scenarios = [
  { name: 'dormant', depth: 4, density: 0, pattern: 'clear' },
  { name: 'sparse-random', depth: 6, density: 0.01, pattern: 'random' },
  { name: 'dense-random', depth: 6, density: 0.9, pattern: 'random' },
  { name: 'clustered', depth: 6, density: 0.05, pattern: 'clustered' },
  { name: 'threshold-oscillation', depth: 4, density: 0, pattern: 'threshold' },
];

function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return x >>> 0;
  };
}

export function workload(scenario, seed) {
  const { depth, density, pattern } = scenario;
  const n = nodeCount(depth), next = rng(seed);
  const initial = new Uint8Array(n);
  const order = Uint32Array.from({ length: n }, (_, i) => i);
  const count = Math.floor(n * density);
  for (let i = 0; i < count; i++) {
    const j = i + next() % (n - i);
    [order[i], order[j]] = [order[j], order[i]];
    initial[pattern === 'clustered' ? i : order[i]] = 1 + next() % 7;
  }
  if (pattern === 'threshold') initial.fill(1, 0, 100);
  const batches = Array.from({ length: 12 }, (_, batch) => {
    const reads = Array.from({ length: 512 }, () =>
      next() % (pattern === 'clustered' ? Math.floor(n / 16) : n));
    const writes = pattern === 'threshold' ? [[100, batch % 2 === 0 ? 7 : 0]] :
      Array.from({ length: 128 }, () => [
        next() % (pattern === 'clustered' ? Math.floor(n / 16) : n),
        pattern === 'clear' ? 0 : next() % 8,
      ]);
    return { reads, writes };
  });
  return { depth, initial, batches };
}

function packedGet(buf, i) {
  const bit = 3 * i, byte = bit >>> 3, shift = bit & 7;
  return ((buf[byte] | ((buf[byte + 1] ?? 0) << 8)) >>> shift) & 7;
}
function packedSet(buf, i, value) {
  const bit = 3 * i, byte = bit >>> 3, shift = bit & 7;
  buf[byte] = (buf[byte] & ~(7 << shift)) | ((value << shift) & 255);
  if (shift > 5) {
    const mask = 7 >>> (8 - shift);
    buf[byte + 1] = (buf[byte + 1] & ~mask) | (value >>> (8 - shift));
  }
}
function mapFrom(values) {
  const map = new Map();
  for (let i = 0; i < values.length; i++) if (values[i]) map.set(BigInt(i), values[i]);
  return map;
}
function payloadHeader(depth, mode) {
  return Buffer.from([69, 53, 66, depth, mode]); // E5B benchmark-only baseline
}

function makeStore(mode, depth, initial) {
  const n = nodeCount(depth);
  if (mode === 'map' || mode === 'ra4') {
    let map = mapFrom(initial);
    return {
      read: i => map.get(BigInt(i)) ?? 0,
      write: (i, v) => { if (v) map.set(BigInt(i), v); else map.delete(BigInt(i)); },
      snapshot: () => {
        const rm1 = encodeRM1(depth, map);
        return mode === 'ra4' ? encodeAdaptive(rm1) : rm1;
      },
      restore: bytes => {
        const rm1 = mode === 'ra4' ? decodeAdaptive(bytes) : bytes;
        const decoded = decodeRM1(rm1);
        must(decoded.depth === depth, 'depth mismatch');
        map = decoded.overrides;
      },
    };
  }
  const packed = mode === 'packed';
  let buf = Buffer.alloc(packed ? Math.ceil(3 * n / 8) : n);
  const write = (i, v) => { if (packed) packedSet(buf, i, v); else buf[i] = v; };
  for (let i = 0; i < n; i++) write(i, initial[i]);
  const header = payloadHeader(depth, packed ? 1 : 2);
  return {
    read: i => packed ? packedGet(buf, i) : buf[i],
    write,
    snapshot: () => Buffer.concat([header, buf]),
    restore: bytes => {
      must(bytes.length === header.length + buf.length &&
        bytes.subarray(0, 5).equals(header), 'baseline length or header mismatch');
      buf = Buffer.from(bytes.subarray(5));
    },
  };
}

function memory() {
  const { heapUsed, arrayBuffers, rss } = process.memoryUsage();
  return { heapUsed, arrayBuffers, rss };
}

function verifyStore(store, oracle) {
  for (let i = 0; i < oracle.length; i++) {
    must(store.read(i) === oracle[i], 'full state mismatch at node ' + i);
  }
}

// Validation and trace generation are outside timed sections. Memory
// deltas are noisy process-level samples, not exact object sizes.
export function runCase(mode, work, { timed = false } = {}) {
  must(modes.includes(mode), 'unknown store');
  const oracle = new Uint8Array(work.initial);
  if (timed && global.gc) global.gc();
  const before = timed && global.gc ? memory() : null;
  const store = makeStore(mode, work.depth, work.initial);
  if (timed && global.gc) global.gc();
  const after = before ? memory() : null;
  const memoryDelta = before ? Object.fromEntries(
    Object.keys(before).map(key => [key, after[key] - before[key]])) : null;
  const times = { read_ms: 0, update_ms: 0, encode_ms: 0, decode_ms: 0 };
  const measure = (key, f) => {
    const start = timed ? performance.now() : 0;
    const result = f();
    if (timed) times[key] += performance.now() - start;
    return result;
  };
  const checkpoints = [];
  let readCount = 0, writeCount = 0;
  verifyStore(store, oracle);
  for (const { reads, writes } of work.batches) {
    const observed = new Uint8Array(reads.length);
    measure('read_ms', () => { for (let i = 0; i < reads.length; i++) observed[i] = store.read(reads[i]); });
    for (let i = 0; i < reads.length; i++) must(observed[i] === oracle[reads[i]], 'read mismatch');
    readCount += reads.length;
    measure('update_ms', () => { for (const [i, v] of writes) store.write(i, v); });
    for (const [i, v] of writes) oracle[i] = v;
    writeCount += writes.length;
    const snapshot = measure('encode_ms', () => store.snapshot());
    measure('decode_ms', () => store.restore(snapshot));
    verifyStore(store, oracle);
    checkpoints.push({
      bytes: snapshot.length,
      mode: mode === 'ra4' ? ['dormant', 'sparse', 'packed'][snapshot[4]] : mode,
      state_sha256: hash(oracle), snapshot_sha256: hash(snapshot),
    });
  }
  return {
    mode, depth: work.depth, read_count: readCount, write_count: writeCount,
    checkpoints, final_state_sha256: hash(oracle),
    times: timed ? times : null, memory_delta_bytes: memoryDelta,
  };
}

export function study({ timed = false, repetitions = 3 } = {}) {
  must(Number.isInteger(repetitions) && repetitions >= 1 && repetitions <= 5, 'invalid repetitions');
  const cases = [];
  for (const scenario of scenarios) for (const seed of seeds) {
    const work = workload(scenario, seed);
    // Warm-up same trace once per backend, excluded from measurements.
    const reference = modes.map(mode => runCase(mode, work));
    for (const row of reference) {
      must(row.checkpoints.every((c, i) => c.state_sha256 === reference[0].checkpoints[i].state_sha256),
        'backend disagreement');
    }
    const samples = [];
    if (timed) for (let rep = 0; rep < repetitions; rep++) {
      // Rotate backend order to reduce systematic order effects.
      for (let k = 0; k < modes.length; k++) {
        const mode = modes[(k + rep + seed % modes.length) % modes.length];
        const result = runCase(mode, work, { timed: true });
        must(result.final_state_sha256 === reference[0].final_state_sha256, 'timed state mismatch');
        samples.push({ repetition: rep, ...result });
      }
    }
    cases.push({ scenario: scenario.name, seed, reference, samples });
  }
  return { schema: 'rm369/e5', evidence: 'SIMULATED', authority: 'NONE',
    timing_enabled: timed, gc_enabled: typeof global.gc === 'function', cases };
}
