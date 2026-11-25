import test from 'node:test';
import assert from 'node:assert/strict';
import {
  position, coordinates, rotation, rigidFrames, frameCompose, composePermutation,
  inversePermutation, nestedAddress, transformPath, initialCube, decodeCube,
  observeCube, executeCube, verifyCube, footprint, studyCube,
} from '../src/phiorbit-cube.mjs';

const id = Array.from({ length: 27 }, (_, i) => i);
const turn = (kind, axis, turns = 1, layer) => kind === 'layer' ?
  { kind, axis, turns, layer } : { kind, axis, turns };

test('24 proper rigid frames close, invert and preserve handedness', () => {
  const frames = rigidFrames();
  assert.equal(frames.length, 24);
  assert.equal(new Set(frames.map(p => p.join(','))).size, 24);
  for (const [a, p] of frames.entries()) {
    assert.deepEqual([...p].sort((x, y) => x - y), id);
    assert.equal(p[13], 13);
    const center = coordinates(p[13]);
    const basis = [14, 16, 22].map(i => coordinates(p[i]).map((v, j) => v - center[j]));
    const [u, v, w] = basis;
    const cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    assert.deepEqual(cross.map(n => n || 0), w);
    assert.deepEqual(composePermutation(p, inversePermutation(p)), id);
    for (let b = 0; b < 24; b++) {
      assert.deepEqual(frames[frameCompose(a, b)], composePermutation(p, frames[b]));
      for (let c = 0; c < 24; c++) {
        assert.equal(frameCompose(a, frameCompose(b, c)), frameCompose(frameCompose(a, b), c));
      }
    }
  }
  frames[0][0] = 99;
  assert.deepEqual(rigidFrames()[0], id);
});

test('all axis/layer rotations are reversible and leave outside positions fixed', () => {
  for (const axis of ['x', 'y', 'z']) for (const layer of [null, 0, 1, 2]) {
    const p = rotation(axis, 1, layer);
    const index = ['x', 'y', 'z'].indexOf(axis);
    for (let i = 0; i < 27; i++) {
      assert.equal(position(...coordinates(i)), i);
      if (layer !== null && coordinates(i)[index] !== layer) assert.equal(p[i], i);
    }
    assert.deepEqual(composePermutation(p, rotation(axis, 3, layer)), id);
    const p2 = composePermutation(p, p);
    assert.deepEqual(composePermutation(p2, p2), id);
    assert.deepEqual(p2, rotation(axis, 2, layer));
  }
  let p = id;
  for (let layer = 0; layer < 3; layer++) p = composePermutation(rotation('z', 1, layer), p);
  assert.deepEqual(p, rotation('z', 1));
});

test('view rotation does not mutate the physical labels', () => {
  const input = initialCube();
  const view = executeCube(input, [turn('frame', 'z')], 1).output;
  const active = executeCube(input, [turn('whole', 'z')], 1).output;
  assert.deepEqual(decodeCube(view).labels, id);
  assert.equal(decodeCube(active).frame, 0);
  assert.notDeepEqual(view, active);
  for (let i = 0; i < 27; i++) assert.equal(observeCube(view, i), observeCube(active, i));
});

test('disjoint layers commute; intersecting layers need causal order', () => {
  const input = initialCube();
  const a = turn('layer', 'x', 1, 0), b = turn('layer', 'x', 1, 2);
  const c = turn('layer', 'y', 1, 0);
  const run = ops => executeCube(input, ops, ops.length).output;
  assert.deepEqual(run([a, b]), run([b, a]));
  assert.notDeepEqual(run([a, c]), run([c, a]));
  assert.equal(footprint(a).positions.length, 9);
  assert.equal(footprint(a).positions.filter(i => footprint(c).positions.includes(i)).length, 3);
  assert.deepEqual(footprint(turn('frame', 'x')), { frame: true, positions: [] });
});

test('mixed program restores exact bytes and receipts reject tampering', () => {
  const input = initialCube(), original = Buffer.from(input);
  const ops = [turn('frame', 'x'), turn('whole', 'y', 2), turn('layer', 'z', 3, 1),
    turn('frame', 'z', 3), turn('layer', 'x', 1, 0)];
  const result = executeCube(input, ops, 6);
  assert.equal(result.receipt.remaining, 1);
  assert.deepEqual(executeCube(result.output, result.receipt.inverse_program, 5).output, input);
  assert.deepEqual(input, original);
  assert.equal(verifyCube(input, ops, 6, result.output, result.receipt), true);
  assert.equal(verifyCube(input, ops, 6, result.output, { ...result.receipt, authority: 'GRANTED' }), false);
  assert.deepEqual(result, executeCube(input, ops, 6));
  assert.equal(studyCube().exact_inverse, true);
});

test('nested addresses and virtual frame mapping are exact', () => {
  const path = Array(64).fill(26);
  assert.equal(nestedAddress(path), (27n ** 65n - 27n) / 26n);
  for (let a = 0; a < 24; a++) {
    const inverse = Array.from({ length: 24 }, (_, b) => b).find(b => frameCompose(b, a) === 0);
    assert.deepEqual(transformPath(transformPath(path, a), inverse), path);
  }
  assert.throws(() => nestedAddress([27]));
  assert.throws(() => nestedAddress(Array(65).fill(0)));
});

test('malformed state and operations refuse without mutation', () => {
  const input = initialCube(), duplicate = Buffer.from(input), badFrame = Buffer.from(input);
  duplicate[5] = 0; badFrame[3] = 24;
  for (const bad of [duplicate, badFrame, input.subarray(1), Buffer.concat([input, Buffer.from([0])])]) {
    assert.throws(() => decodeCube(bad));
  }
  for (const op of [turn('layer', 'x', 1, 3), turn('whole', 'w'), turn('frame', 'z', 0),
    { kind: 'whole', axis: 'z', turns: 1, layer: 0 }, null]) {
    assert.throws(() => executeCube(input, [op], 1));
  }
  assert.throws(() => executeCube(input, [turn('whole', 'x')], 0));
  assert.deepEqual(input, initialCube());
});
