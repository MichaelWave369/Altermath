import test from 'node:test';
import {simulateBioLattice} from '../src/bioLattice.js';
import assert from 'node:assert/strict';
import {simulateMarkovTransport,runBioLatticeStudy,STUDY_MODES,SWEEP_GRID,BIO_STUDY_SCHEMA}
  from '../src/bioLatticeStudy.js';

test('Markov walk is deterministic with bounded nodes and traceable parameters',()=>{
  const a=simulateMarkovTransport({steps:40,seed:77});
  assert.deepEqual(a,simulateMarkovTransport({steps:40,seed:77}));
  assert.equal(a.probabilities.length,18*13);
  assert.equal(a.mode,'markov');
  assert.ok(a.probabilities.every(p=>p>=-1e-14));
});
test('synchronous Markov conserves population without loss',()=>{
  const r=simulateMarkovTransport({coupling:1,disorder:1,loss:0,steps:110,rings:10});
  assert.ok(Math.abs(r.metrics.survival-1)<1e-10);
  assert.ok(r.metrics.axialSpreadSites>=0);
});
test('loss is applied exactly once per tick and zero coupling remains localized',()=>{
  const loss=.03,steps=60;
  const r=simulateMarkovTransport({coupling:.6,disorder:.7,loss,steps});
  assert.ok(Math.abs(r.metrics.survival-(1-loss)**steps)<1e-10);
  const zero=simulateMarkovTransport({coupling:0,loss:0,steps});
  assert.equal(zero.metrics.effectiveSites,1);
  assert.equal(zero.probabilities[zero.source],1);
});
test('sweep is fully deterministic, has 3 models and paired seeds in every cell',()=>{
  const a=runBioLatticeStudy(),b=runBioLatticeStudy();
  assert.equal(a.schema,BIO_STUDY_SCHEMA);
  assert.deepEqual(a,b);
  assert.equal(a.rows.length,SWEEP_GRID.disorder.length);
  assert.equal(a.diagnostics.comparisons,15);
  assert.equal(a.diagnostics.uniqueSeeds,3);
  for(const row of a.rows){
    assert.deepEqual(Object.keys(row.means),STUDY_MODES);
    assert.deepEqual(row.seeds,[369,370,371]);
    assert.equal(row.perSeed.length,3);
    assert.equal(row.pairedSeedSigns.positive+row.pairedSeedSigns.negative+row.pairedSeedSigns.ties,3);
    assert.ok(row.maxSurvivalError<1e-10);
  }
});
test('sweep respects new dimensions and holds other controls fixed',()=>{
  const base={rings:11,protofilaments:13,coupling:.3,disorder:.2,loss:.02,steps:12};
  const result=runBioLatticeStudy({base,sweepKey:'coupling',startSeed:100,seedCount:6});
  assert.deepEqual(result.parameters.grid,[0,.25,.5,.75,1]);
  assert.equal(result.rows[0].means.markov.spread,0);
  assert.equal(result.diagnostics.comparisons,30);
  assert.equal(result.rows[1].perSeed[3].seed,103);
  assert.equal(result.rows[0].perSeed[0].amplitude.axialSpreadSites,0);
  assert.equal(result.parameters.base.disorder,.2);
});
test('loss sweep leaves survival agreement and all cases in the export',()=>{
  const result=runBioLatticeStudy({sweepKey:'loss',seedCount:9,base:{rings:8,protofilaments:9,coupling:.4,disorder:.4,loss:.008,steps:8}});
  assert.equal(result.rows.length,5);
  assert.equal(result.diagnostics.comparisons,45);
  assert.ok(result.diagnostics.maxSurvivalError<1e-10);
  assert.ok(result.rows[4].perSeed.every(s=>s.markov.survival<1));
});
test('invalid data are rejected without silent clamping',()=>{
  assert.throws(()=>runBioLatticeStudy({sweepKey:'magic'}),RangeError);
  assert.throws(()=>runBioLatticeStudy({seedCount:4}),RangeError);
  assert.throws(()=>runBioLatticeStudy({startSeed:-1}),RangeError);
  assert.throws(()=>runBioLatticeStudy({startSeed:2147483647}),RangeError);
  assert.throws(()=>runBioLatticeStudy({base:{coupling:10}}),RangeError);
  assert.throws(()=>simulateMarkovTransport({steps:Infinity}),RangeError);
});
test('differing update rules produce different distributions at nonzero coupling',()=>{
  const base={rings:10,protofilaments:13,coupling:1,disorder:.7,loss:0,steps:15,seed:5};
  const markov=simulateMarkovTransport(base);
  assert.ok(markov.metrics.axialSpreadSites>0);
  const hopping=simulateBioLattice({...base,mode:'hopping'});
  assert.ok(hopping.metrics.axialSpreadSites>=0);
  assert.notEqual(markov.metrics.axialSpreadSites,
    hopping.metrics.axialSpreadSites);
});
