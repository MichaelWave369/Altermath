import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateBioLattice,BIO_LATTICE_SCHEMA} from '../src/bioLattice.js';

test('schema, dimensions and deterministic output',()=>{
  const a=simulateBioLattice({seed:77}),b=simulateBioLattice({seed:77});
  assert.equal(a.schema,BIO_LATTICE_SCHEMA);
  assert.equal(a.probabilities.length,18*13);
  assert.deepEqual(a,b);
});
for(const mode of ['hopping','amplitude']){
  test(mode+' conserves total population without loss',()=>{
    const x=simulateBioLattice({mode,steps:70,loss:0,coupling:.85,disorder:.35});
    assert.ok(Math.abs(x.metrics.survival-1)<1e-9);
    assert.ok(x.probabilities.every(p=>p>=-1e-12));
  });
  test(mode+' exactly applies controlled per-step loss',()=>{
    const loss=.015,steps=45,x=simulateBioLattice({mode,steps,loss,coupling:.5});
    assert.ok(Math.abs(x.metrics.survival-(1-loss)**steps)<1e-9);
  });
  test(mode+' stays localized with zero coupling',()=>{
    const x=simulateBioLattice({mode,steps:40,loss:0,coupling:0});
    assert.equal(x.metrics.effectiveSites,1);
    assert.ok(Math.abs(x.probabilities[x.source]-1)<1e-9);
  });
}
test('rejects malformed and unbounded parameters',()=>{
  assert.throws(()=>simulateBioLattice({mode:'quantum-consciousness'}),RangeError);
  assert.throws(()=>simulateBioLattice({steps:Infinity}),RangeError);
  assert.throws(()=>simulateBioLattice({loss:-1}),RangeError);
  assert.throws(()=>simulateBioLattice({rings:200}),RangeError);
});
test('models are not relabeled versions of the same distribution',()=>{
  const a=simulateBioLattice({mode:'hopping',steps:44,coupling:.85,disorder:.5,loss:0});
  const b=simulateBioLattice({mode:'amplitude',steps:44,coupling:.85,disorder:.5,loss:0});
  assert.notDeepEqual(a.probabilities,b.probabilities);
});
