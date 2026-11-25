import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeRM1, executeRM2, pocketId } from '../src/rm369-interop.mjs';
import { encodeAdaptive, decodeAdaptive, describeAdaptive, executeAdaptive, report } from '../src/rm369-elastic.mjs';

function fixture(depth, count) {
  return encodeRM1(depth, new Map(Array.from({ length: count }, (_, i) => [BigInt(i), i % 7 + 1])));
}

test('canonical modes and measured encoded lengths', () => {
  const cases = [
    [2, 0, 'dormant', 5], [2, 2, 'packed', 9], [2, 10, 'packed', 9],
    [4, 2, 'sparse', 19], [4, 100, 'sparse', 313], [4, 101, 'packed', 313],
    [4, 820, 'packed', 313], [12, 2, 'sparse', 25],
  ];
  for (const [depth, count, mode, bytes] of cases) {
    const rm1 = fixture(depth, count);
    const encoded = encodeAdaptive(rm1);
    assert.equal(encoded.length, bytes);
    assert.equal(describeAdaptive(rm1).mode, mode);
    assert.deepEqual(decodeAdaptive(encoded), rm1);
    assert.deepEqual(encodeAdaptive(decodeAdaptive(encoded)), encoded);
  }
  assert.equal(report().cases.every(c => c.roundtrip_exact), true);
});

test('all 3-bit orientations at every packed alignment', () => {
  // 91 orientation nodes, including all 8 possible bit offsets.
  for (let g = 0; g < 8; g++) {
    const rm1 = encodeRM1(3, new Map(Array.from({ length: 91 }, (_, i) => [BigInt(i), (i + g) % 8]).filter(([, v]) => v)));
    assert.equal(describeAdaptive(rm1).mode, 'packed');
    assert.deepEqual(decodeAdaptive(encodeAdaptive(rm1)), rm1);
  }
});

test('large physical addresses remain exact without a packed allocation', () => {
  const path = Array(63).fill(8);
  const rm1 = encodeRM1(64, new Map([[pocketId(64, path), 7]]));
  const info = describeAdaptive(rm1);
  assert.equal(info.mode, 'sparse');
  assert.equal(info.packed_candidate_bytes, null);
  assert.deepEqual(decodeAdaptive(encodeAdaptive(rm1)), rm1);
});

test('noncanonical, malformed and capped payloads refuse', () => {
  const packed = encodeAdaptive(fixture(2, 10));
  const padding = Buffer.from(packed);
  padding[padding.length - 1] |= 128;
  const wrongMode = Buffer.concat([Buffer.from([82, 65, 52, 2, 1]), fixture(2, 10)]);
  const wrongDepth = Buffer.concat([Buffer.from([82, 65, 52, 3, 1]), fixture(2, 10)]);
  const zeroPacked = Buffer.from([82, 65, 52, 2, 2, 0, 0, 0, 0]);
  for (const bad of [
    Buffer.alloc(0), packed.subarray(0, -1), Buffer.concat([packed, Buffer.from([0])]),
    padding, wrongMode, wrongDepth, zeroPacked,
    Buffer.from([82, 65, 52, 64, 2]), Buffer.from([82, 65, 52, 2, 9]),
    Buffer.from([82, 65, 52, 0, 0]), Buffer.from([82, 65, 52, 2, 0, 0]),
  ]) assert.throws(() => decodeAdaptive(bad));
});

test('gear execution crosses storage modes and reverses byte-for-byte', () => {
  const initial = encodeAdaptive(encodeRM1(2));
  const operations = [[[], 1], [[8], 7]];
  const result = executeAdaptive(initial, operations, 2);
  assert.equal(initial[4], 0);
  assert.equal(result.output[4], 2);
  const expected = executeRM2(decodeAdaptive(initial), operations, 2);
  assert.deepEqual(result.receipt, expected.receipt);
  assert.deepEqual(decodeAdaptive(result.output), expected.output);
  assert.deepEqual(executeAdaptive(result.output, result.receipt.inverse_program, 2).output, initial);

  const sparse = encodeAdaptive(fixture(4, 100));
  const path = [1, 0, 0]; // physical ID 172, not among IDs 0..99
  const changed = executeAdaptive(sparse, [[path, 1]], 1);
  assert.equal(sparse[4], 1);
  assert.equal(changed.output[4], 2);
  assert.deepEqual(executeAdaptive(changed.output, changed.receipt.inverse_program, 1).output, sparse);
});
