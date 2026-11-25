// RM-369 E4: canonical adaptive snapshot codec; offline research only.
import { createHash } from 'node:crypto';
import { decodeRM1, encodeRM1, executeRM2 } from './rm369-interop.mjs';

const HEADER = 5;
const PACKED_CAP = 1_000_000n;
const MAGIC = Buffer.from('RA4');
const must = (condition, message) => { if (!condition) throw new Error(message); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const packedBytes = nodes => Number((3n * nodes + 7n) / 8n);
const header = (depth, mode) => Buffer.from([82, 65, 52, depth, mode]);

// The sparse candidate embeds the original RM1 bytes, including its header.
function selection(info, rm1Length) {
  if (info.overrides.size === 0) return 0;
  if (info.nodes <= PACKED_CAP && packedBytes(info.nodes) < rm1Length) return 2;
  return 1; // Ties prefer sparse, and large packed allocations are refused.
}

function pack(info) {
  const body = Buffer.alloc(packedBytes(info.nodes));
  for (const [key, gear] of info.overrides) {
    const bit = 3 * Number(key);
    const byte = Math.floor(bit / 8), shift = bit % 8;
    body[byte] |= (gear << shift) & 255;
    if (shift > 5) body[byte + 1] |= gear >> (8 - shift);
  }
  return body;
}

export function encodeAdaptive(rm1) {
  const info = decodeRM1(rm1);
  const mode = selection(info, rm1.length);
  if (mode === 0) return header(info.depth, mode);
  return Buffer.concat([header(info.depth, mode), mode === 1 ? rm1 : pack(info)]);
}

export function decodeAdaptive(snapshot) {
  must(Buffer.isBuffer(snapshot) && snapshot.length >= HEADER &&
    snapshot.subarray(0, 3).equals(MAGIC), 'invalid RA4 header');
  const depth = snapshot[3], mode = snapshot[4];
  must(Number.isInteger(depth) && depth >= 1 && depth <= 64, 'invalid depth');
  const nodes = (9n ** BigInt(depth) - 1n) / 8n;
  let rm1;
  if (mode === 0) {
    must(snapshot.length === HEADER, 'invalid dormant length');
    rm1 = encodeRM1(depth);
  } else if (mode === 1) {
    rm1 = Buffer.from(snapshot.subarray(HEADER));
    must(decodeRM1(rm1).depth === depth, 'inner depth mismatch');
  } else if (mode === 2) {
    must(nodes <= PACKED_CAP, 'packed node cap');
    must(snapshot.length === HEADER + packedBytes(nodes), 'invalid packed length');
    const body = snapshot.subarray(HEADER);
    const records = new Map();
    for (let i = 0; i < Number(nodes); i++) {
      const bit = 3 * i, byte = Math.floor(bit / 8), shift = bit % 8;
      const value = ((body[byte] | ((body[byte + 1] ?? 0) << 8)) >> shift) & 7;
      if (value) records.set(BigInt(i), value);
    }
    rm1 = encodeRM1(depth, records);
  } else throw new Error('unknown RA4 mode');
  // Re-encoding rejects nonzero padding, alternate modes and trailing data.
  must(encodeAdaptive(rm1).equals(snapshot), 'noncanonical RA4 snapshot');
  return rm1;
}

export function describeAdaptive(rm1) {
  const info = decodeRM1(rm1);
  const snapshot = encodeAdaptive(rm1);
  return {
    depth: info.depth, orientation_nodes: info.nodes.toString(),
    changed_nodes: info.overrides.size,
    mode: ['dormant', 'sparse', 'packed'][snapshot[4]],
    adaptive_bytes: snapshot.length, original_rm1_bytes: rm1.length,
    sparse_candidate_bytes: HEADER + rm1.length,
    packed_candidate_bytes: info.nodes <= PACKED_CAP ? HEADER + packedBytes(info.nodes) : null,
  };
}

export function executeAdaptive(snapshot, operations, fuel) {
  const input = decodeAdaptive(snapshot);
  const { output, receipt } = executeRM2(input, operations, fuel);
  const adaptive = encodeAdaptive(output);
  return {
    output: adaptive,
    // RM2 receipt is bound to the canonical RM1 state, not the RA4 envelope.
    receipt,
    input_adaptive_sha256: sha(snapshot),
    output_adaptive_sha256: sha(adaptive),
  };
}

export function report() {
  const cases = [];
  for (const [depth, count] of [[2, 0], [2, 2], [2, 10], [4, 2], [4, 100],
    [4, 101], [4, 820], [12, 2], [64, 2]]) {
    const records = new Map(Array.from({ length: count }, (_, i) => [BigInt(i), i % 7 + 1]));
    const rm1 = encodeRM1(depth, records);
    const encoded = encodeAdaptive(rm1);
    cases.push({ ...describeAdaptive(rm1), roundtrip_exact: decodeAdaptive(encoded).equals(rm1) });
  }
  return { schema: 'rm369/e4', evidence: 'SIMULATED', authority: 'NONE', cases };
}
