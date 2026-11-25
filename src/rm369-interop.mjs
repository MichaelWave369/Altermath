// Independent RM-369 E2 wire consumer. Offline, synthetic, no authority.
import { createHash } from 'node:crypto';

const MAX_RECORDS = 1_000_000;
const MAX_FUEL = 4096;
const requireThat = (ok, message) => { if (!ok) throw new Error(message); };
const integer = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
};
const metadata = depth => {
  requireThat(integer(depth, 1, 64), 'invalid depth');
  const nodes = (9n ** BigInt(depth) - 1n) / 8n;
  const keyBytes = Math.max(1, Math.ceil((nodes - 1n).toString(2).length / 8));
  return { depth, nodes, keyBytes };
};
const readKey = (buf, offset, width) => {
  let n = 0n;
  for (let i = 0; i < width; i++) n = (n << 8n) | BigInt(buf[offset + i]);
  return n;
};
const writeKey = (buf, offset, width, key) => {
  for (let i = width - 1; i >= 0; i--) {
    buf[offset + i] = Number(key & 255n);
    key >>= 8n;
  }
};
export function decodeRM1(snapshot) {
  requireThat(Buffer.isBuffer(snapshot) && snapshot.length >= 8 &&
    snapshot.subarray(0, 3).equals(Buffer.from('RM1')), 'invalid header');
  const info = metadata(snapshot[3]);
  const count = snapshot.readUInt32BE(4);
  const width = info.keyBytes + 1;
  requireThat(count <= MAX_RECORDS && BigInt(count) <= info.nodes &&
    snapshot.length === 8 + count * width, 'invalid length or count');
  const overrides = new Map();
  let previous = -1n;
  for (let offset = 8; offset < snapshot.length; offset += width) {
    const key = readKey(snapshot, offset, info.keyBytes);
    const gear = snapshot[offset + info.keyBytes];
    requireThat(key > previous && key < info.nodes && integer(gear, 1, 7), 'invalid record');
    overrides.set(key, gear);
    previous = key;
  }
  return { ...info, overrides };
}
export function encodeRM1(depth, overrides = new Map()) {
  const { nodes, keyBytes } = metadata(depth);
  requireThat(overrides instanceof Map && overrides.size <= MAX_RECORDS &&
    BigInt(overrides.size) <= nodes, 'invalid records');
  for (const [key, gear] of overrides) {
    requireThat(typeof key === 'bigint' && key >= 0n && key < nodes &&
      integer(gear, 1, 7), 'invalid record');
  }
  const entries = [...overrides].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const buf = Buffer.alloc(8 + entries.length * (keyBytes + 1));
  buf.write('RM1');
  buf[3] = depth;
  buf.writeUInt32BE(entries.length, 4);
  for (const [i, [key, gear]] of entries.entries()) {
    const offset = 8 + i * (keyBytes + 1);
    writeKey(buf, offset, keyBytes, key);
    buf[offset + keyBytes] = gear;
  }
  return buf;
}
export function pocketId(depth, path) {
  metadata(depth);
  requireThat(Array.isArray(path) && path.length < depth &&
    Array.from(path).every(p => integer(p, 0, 8)), 'invalid physical path');
  return path.reduce((key, p) => 9n * key + 1n + BigInt(p), 0n);
}
export function compose(after, before) {
  requireThat(integer(after, 0, 7) && integer(before, 0, 7), 'invalid gear');
  const r = (after % 4 + (after >= 4 ? -1 : 1) * (before % 4) + 4) % 4;
  return r + 4 * Number((after >= 4) !== (before >= 4));
}
export function inverse(gear) {
  requireThat(integer(gear, 0, 7), 'invalid gear');
  return gear >= 4 ? gear : (4 - gear) % 4;
}
export function executeRM2(snapshot, operations, fuel) {
  requireThat(integer(fuel, 0, MAX_FUEL) && Array.isArray(operations) &&
    operations.length <= fuel, 'invalid program or fuel');
  const { depth, overrides } = decodeRM1(snapshot);
  const parsed = Array.from(operations, instruction => {
    requireThat(Array.isArray(instruction) && instruction.length === 2, 'invalid instruction');
    const [path, gear] = instruction;
    const key = pocketId(depth, path);
    requireThat(integer(gear, 0, 7), 'invalid gear');
    return { path: [...path], gear, key };
  });
  const steps = [], undo = [];
  for (const { path, gear, key } of parsed) {
    const before = overrides.get(key) ?? 0;
    const after = compose(gear, before);
    if (after === 0) overrides.delete(key);
    else {
      requireThat(overrides.has(key) || overrides.size < MAX_RECORDS, 'record cap');
      overrides.set(key, after);
    }
    steps.push({ path, gear, before, after });
    undo.push([[...path], inverse(gear)]);
  }
  const output = encodeRM1(depth, overrides);
  const receipt = {
    schema: 'rm369/e2', evidence: 'SIMULATED', authority: 'NONE',
    operation_kind: 'physical_slot_local_orientation',
    input_sha256: digest(snapshot), output_sha256: digest(output),
    fuel_initial: fuel, fuel_remaining: fuel - steps.length,
    steps, inverse_program: undo.reverse()
  };
  receipt.receipt_sha256 = digest(canonical(receipt));
  return { output, receipt };
}
// Replay against the exact input rather than trusting a self-reported checksum.
export function verifyRM2(snapshot, operations, fuel, output, receipt) {
  try {
    const expected = executeRM2(snapshot, operations, fuel);
    return Buffer.isBuffer(output) && output.equals(expected.output) &&
      canonical(receipt) === canonical(expected.receipt);
  } catch { return false; }
}
