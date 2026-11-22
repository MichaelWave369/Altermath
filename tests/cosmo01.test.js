import test from 'node:test';
import assert from 'node:assert/strict';
import { cosmo01Step, cosmo01Score, cosmo01Matrix, COSMO01_AUTHORITY } from '../src/cosmo01.js';

test('all states are enumerated exactly and scores are deterministic', () => {
  const first = cosmo01Matrix();
  assert.deepEqual(first, cosmo01Matrix());
  assert.equal(first.rows.length, 9);
  for (const x of first.rows) {
    assert.equal(x.authority, COSMO01_AUTHORITY);
    assert.equal(x.stateCount, 256);
    assert.ok(x.conditionalEntropyBits >= 0);
    assert.ok(x.conditionalEntropyWithEndpointBits >= 0);
    assert.ok(x.informationGainBits >= -1e-12);
    assert.ok(x.conditionalEntropyWithEndpointBits <= x.conditionalEntropyBits + 1e-12);
  }
});

test('closed permission, contact, or compatibility gate matches isolation on all 256 masks', () => {
  for (const gate of ['permit', 'contact', 'compatible']) {
    for (let m = 0; m < 256; m++) {
      const a = cosmo01Step(m, { mode: 'fixed', [gate]: false });
      const b = cosmo01Step(m, { mode: 'isolated' });
      assert.equal(a.bridge, false);
      assert.deepEqual(a.after, b.after);
    }
  }
});

test('fixed, isolated and adaptive junction policies are not interchangeable', () => {
  const fixed = cosmo01Score({ mode: 'fixed' });
  const isolated = cosmo01Score({ mode: 'isolated' });
  const adaptive = cosmo01Score({ mode: 'adaptive' });
  assert.equal(fixed.bridgeCases, 256);
  assert.equal(isolated.bridgeCases, 0);
  assert.ok(adaptive.bridgeCases > 0 && adaptive.bridgeCases < 256);
  let fixedEffect = 0;
  let adaptiveEffect = 0;
  for (let mask = 0; mask < 256; mask++) {
    const a = cosmo01Step(mask, { mode: 'isolated' }).after.join('');
    if (cosmo01Step(mask, { mode: 'fixed' }).after.join('') !== a) fixedEffect++;
    if (cosmo01Step(mask, { mode: 'adaptive' }).after.join('') !== a) adaptiveEffect++;
  }
  assert.ok(fixedEffect > 0);
  assert.ok(adaptiveEffect > 0);
});

test('identity null law contains no hidden predictive uncertainty', () => {
  for (const mode of ['isolated', 'fixed', 'adaptive']) {
    const s = cosmo01Score({ mode, rule: 'identity' });
    assert.equal(s.conditionalEntropyBits, 0);
    assert.equal(s.informationGainBits, 0);
    for (let m = 0; m < 256; m++) assert.deepEqual(
      cosmo01Step(m, { mode, rule: 'identity' }).before,
      cosmo01Step(m, { mode, rule: 'identity' }).after
    );
  }
});

test('coarse observational collision has a valid independently checked witness', () => {
  const result = cosmo01Score({ mode: 'isolated', topologyA: 'cycle', topologyB: 'path' });
  const w = result.witness;
  assert.ok(w, 'expected at least one causal-predictive collision');
  const a = cosmo01Step(w.mask1, result.options), b = cosmo01Step(w.mask2, result.options);
  assert.deepEqual(a.coarse, b.coarse);
  assert.notDeepEqual(a.outcome, b.outcome);
  assert.deepEqual(a.outcome, w.outcome1);
  assert.deepEqual(b.outcome, w.outcome2);
});

test('state gate, topology and update-rule input validation fail closed', () => {
  assert.throws(() => cosmo01Step(-1), RangeError);
  assert.throws(() => cosmo01Step(256), RangeError);
  assert.throws(() => cosmo01Step(1.5), RangeError);
  for (const invalid of [{ mode: 'wormhole' }, { rule: 'gravity' },
    { topologyA: 'brane' }, { permit: 1 }, { contact: 'yes' }]) {
    assert.throws(() => cosmo01Step(0, invalid), TypeError);
  }
  assert.deepEqual(cosmo01Step(0, { mode: 'fixed' }).after, Array(8).fill(0));
  assert.deepEqual(cosmo01Step(255, { mode: 'fixed' }).after, Array(8).fill(1));
});
