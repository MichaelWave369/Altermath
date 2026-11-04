import test from 'node:test';
import assert from 'node:assert/strict';
import {runBioLatticeHoldout,BIO_HOLDOUT_SCHEMA,HOLDOUT_OFFSET}
  from '../src/bioLatticeHoldout.js';

const SMALL={rings:8,protofilaments:9,coupling:.4,disorder:.2,loss:.01,steps:9};
const config={base:SMALL,sweepKey:'disorder',startSeed:369,trainingSeeds:3,holdoutSeeds:3};
const full=()=>runBioLatticeHoldout(config);

test('R15 repeatability and disjoint seed blocks',()=>{
  const a=full(),b=full();
  assert.deepEqual(a,b);
  assert.equal(a.schema,BIO_HOLDOUT_SCHEMA);
  assert.equal(a.evidenceClass,'synthetic_disjoint_seed_replay_only');
  assert.deepEqual(a.training.seeds,[369,370,371]);
  assert.deepEqual(a.holdout.seeds,[369+HOLDOUT_OFFSET,370+HOLDOUT_OFFSET,371+HOLDOUT_OFFSET]);
  assert.equal(a.diagnostics.uniqueSeeds,6);
  assert.equal(a.diagnostics.disjointSeeds,true);
  assert.equal(a.diagnostics.heldoutGridEvaluations,1);
  assert.equal(a.holdout.perSeed.length,3);
});
test('selection is fixed exclusively by absolute training mean with first-grid ties',()=>{
  const a=full(),grid=a.training.candidates;
  const target=Math.max(...grid.map(x=>Math.abs(x.meanDelta)));
  assert.ok(target-Math.abs(grid[a.training.selectedIndex].meanDelta)<1e-12);
  assert.equal(a.training.selectedValue,grid[a.training.selectedIndex].sweepValue);
  for(let i=0;i<a.training.selectedIndex;i++)
    assert.ok(Math.abs(grid[i].meanDelta)<target-1e-12);
  assert.equal(a.holdout.selectedConfiguration.disorder,a.training.selectedValue);
});
test('changing holdout count cannot change the trained selection',()=>{
  const a=full(),b=runBioLatticeHoldout({...config,holdoutSeeds:9});
  assert.deepEqual(a.training,b.training);
  assert.deepEqual(a.input.grid,b.input.grid);
  assert.equal(a.holdout.seeds.length,3);
  assert.equal(b.holdout.seeds.length,9);
});
test('two transport-null controls and survival invariant are enforced',()=>{
  const a=full();
  assert.equal(a.controls.length,2);
  assert.deepEqual(a.controls.map(c=>c.name),['zero_coupling','zero_steps']);
  assert.ok(a.controls.every(c=>c.passed&&c.maxAbsoluteSpread<=1e-10));
  assert.ok(a.diagnostics.survivalMaxError<1e-9);
  assert.equal(a.diagnostics.nullControlsPassed,true);
});
test('zero coupling throughout loss sweep results in no direction',()=>{
  const a=runBioLatticeHoldout({
    ...config,sweepKey:'loss',base:{...SMALL,coupling:0}
  });
  assert.equal(a.training.selectedIndex,0);
  assert.equal(a.holdout.directionalStatus,'NO_TRAIN_DIRECTION');
  assert.equal(a.holdout.meanDelta,0);
  assert.deepEqual(a.holdout.bootstrapMeanPercentileRange,[0,0]);
  assert.equal(a.holdout.pairedSeedSigns.ties,3);
});
test('every heldout seed and sign is recorded, resampling bounds are ordered',()=>{
  const a=full(),values=a.holdout.perSeed.map(x=>x.amplitudeMinusMarkov);
  assert.equal(a.holdout.pairedSeedSigns.positive+
    a.holdout.pairedSeedSigns.negative+a.holdout.pairedSeedSigns.ties,3);
  assert.ok(a.holdout.meanDelta>=Math.min(...values)-1e-10);
  assert.ok(a.holdout.meanDelta<=Math.max(...values)+1e-10);
  assert.ok(a.holdout.bootstrapMeanPercentileRange[0]<=a.holdout.bootstrapMeanPercentileRange[1]);
  assert.ok(a.holdout.bootstrapMeanPercentileRange.every(Number.isFinite));
  assert.ok(a.training.candidates.every(c=>c.bySeed.length===3));
  assert.ok(a.limitations.some(s=>s.includes('not independent biological')));
});
test('parameter bounds fail closed before any simulation loop',()=>{
  assert.throws(()=>runBioLatticeHoldout({...config,trainingSeeds:4}),RangeError);
  assert.throws(()=>runBioLatticeHoldout({...config,holdoutSeeds:0}),RangeError);
  assert.throws(()=>runBioLatticeHoldout({...config,sweepKey:'unknown'}),RangeError);
  assert.throws(()=>runBioLatticeHoldout({...config,startSeed:Infinity}),RangeError);
  assert.throws(()=>runBioLatticeHoldout({...config,startSeed:2147483647}),RangeError);
  assert.throws(()=>runBioLatticeHoldout({...config,base:{...SMALL,seed:200}}),RangeError);
  assert.throws(()=>runBioLatticeHoldout({...config,base:{...SMALL,steps:Infinity}}),RangeError);
  assert.throws(()=>runBioLatticeHoldout({...config,base:{...SMALL,steps:121}}),RangeError);
});
test('larger 6 + 9 paired seed split finishes and preserves strict disjointness',()=>{
  const a=runBioLatticeHoldout({...config,trainingSeeds:6,holdoutSeeds:9});
  assert.equal(a.training.candidates[0].bySeed.length,6);
  assert.equal(a.holdout.perSeed.length,9);
  assert.equal(a.diagnostics.uniqueSeeds,15);
  assert.equal(a.diagnostics.disjointSeeds,true);
  assert.equal(a.diagnostics.heldoutGridEvaluations,1);
});
