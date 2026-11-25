import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeRM1, executeRM2 } from '../src/rm369-interop.mjs';
import { encodeAdaptive } from '../src/rm369-elastic.mjs';
import { RegionalField } from '../src/rm369-regional.mjs';

test('physical BFS mapping is a bijection for each bounded depth', () => {
  for (let d = 2; d <= 7; d++) {
    const f = new RegionalField(d);
    assert.equal(f.locate(0), null);
    for (let id = 1; id < f.nodes; id++) {
      const [slot, local] = f.locate(id);
      assert.equal(f.globalId(slot, local), id);
    }
  }
});

test('regions independently promote, demote and return to dormant', () => {
  const f = new RegionalField(4);
  const n = f.regionNodes;
  const high = Math.ceil(n * 0.2), low = Math.floor(n * 0.1);
  for (let i = 0; i < high; i++) f.write(f.globalId(0, i), i % 7 + 1);
  f.write(f.globalId(1, 0), 3);
  assert.deepEqual(f.modes().slice(0, 3), ['packed', 'sparse', 'dormant']);
  f.write(f.globalId(0, high - 1), 0);
  assert.equal(f.modes()[0], 'packed');
  for (let i = low; i < high - 1; i++) f.write(f.globalId(0, i), 0);
  assert.equal(f.modes()[0], 'sparse');
  for (let i = 0; i < low; i++) f.write(f.globalId(0, i), 0);
  assert.equal(f.modes()[0], 'dormant');
  assert.equal(f.read(f.globalId(1, 0)), 3);
});

test('mixed field saves bytes and retains exact RM1 state', () => {
  const f = new RegionalField(6);
  f.write(0, 4);
  for (let i = 0; i < f.regionNodes; i++) f.write(f.globalId(0, i), i % 7 + 1);
  f.write(f.globalId(1, 0), 6);
  const rm1 = f.toRM1(), rr6 = f.snapshot();
  assert.deepEqual(RegionalField.restore(rr6).toRM1(), rm1);
  assert.deepEqual(RegionalField.fromRM1(rm1).snapshot(), rr6);
  assert.ok(rr6.length < encodeAdaptive(rm1).length);
  assert.equal(rr6.length, 5 + 6 + Math.ceil(3 * f.regionNodes / 8) + 6 + 3);
  assert.deepEqual(RegionalField.restore(rr6).snapshot(), rr6);
});

test('local gear agrees with RM2, including unchanged descendant addresses', () => {
  const f = new RegionalField(4);
  f.write(10, 7);
  const before = f.toRM1();
  f.gear(1, 4);
  f.gear(10, 1);
  const expected = executeRM2(before, [[[0], 4], [[0, 0], 1]], 2);
  assert.deepEqual(f.toRM1(), expected.output);
  f.gear(10, 3);
  f.gear(1, 4);
  assert.deepEqual(f.toRM1(), before);
});

test('reject invalid addresses, modes, padding and noncanonical payloads', () => {
  const f = new RegionalField(2);
  const empty = f.snapshot();
  assert.equal(empty.length, 5);
  f.write(1, 7);
  const packed = f.snapshot();
  const padding = Buffer.from(packed);
  padding[padding.length - 1] |= 128;
  for (const invalid of [
    Buffer.alloc(0), packed.subarray(0, -1), padding,
    Buffer.concat([packed, packed.subarray(5)]),
    Buffer.concat([empty, Buffer.from([0, 1, 0, 0, 0, 2, 0, 7])]),
    Buffer.concat([empty, Buffer.from([0, 2, 0, 0, 0, 1, 0])]),
    Buffer.from([82, 82, 54, 8, 0]),
  ]) assert.throws(() => RegionalField.restore(invalid));
  assert.throws(() => f.write(-1, 1));
  assert.throws(() => f.write(1, 8));
  assert.throws(() => RegionalField.fromRM1(encodeRM1(8)));
});
