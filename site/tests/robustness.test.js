import test from 'node:test';
import assert from 'node:assert/strict';
import {runRobustness,STRESS_PROFILES,SWITCH_FEES,ROBUSTNESS_SCHEMA} from '../src/robustness.js';

const quick={trainingSeeds:2,holdoutSeeds:2,horizon:160,warmup:10};
test('five scenarios change one factor each relative to reference',()=>{
 const reference=STRESS_PROFILES[0];
 assert.equal(STRESS_PROFILES.length,5);
 for(const s of STRESS_PROFILES.slice(1)){
  const changed=['gain','revocationStart','revocationEnd']
    .filter(field=>s[field]!==reference[field]);
  if(s.change==='gain only')assert.deepEqual(changed,['gain']);
  else assert.deepEqual(changed,['revocationStart','revocationEnd']);
 }
});
test('deterministic, documented schema and all scenarios included',()=>{
 const a=runRobustness(quick),b=runRobustness(quick);
 assert.deepEqual(a,b);
 assert.equal(a.schema,ROBUSTNESS_SCHEMA);
 assert.equal(a.scenarios.length,5);
});
test('one training selection remains fixed across profile comparisons',()=>{
 const r=runRobustness({...quick,budget:4});
 assert.equal(r.selection.fixedStartingJunctions.length,4);
 assert.equal(new Set(r.selection.fixedStartingJunctions).size,4);
 assert.deepEqual(r.setup.trainingSeeds,[369,370]);
 assert.deepEqual(r.setup.holdoutSeeds,[10369,10370]);
});
test('four fair maximum-budget methods preserve permission invariants',()=>{
 const r=runRobustness({...quick,budget:3});
 for(const s of r.scenarios){
  assert.equal(s.methods.length,4);
  for(const m of s.methods){
   assert.equal(m.policyViolations,0);
   assert.ok(m.maxActive<=3);
   assert.ok(m.meanActive<=3+1e-12);
  }
 }
});
test('per-scenario methods start at identical disturbed phase coherence',()=>{
 const r=runRobustness(quick);
 for(const s of r.scenarios){
  for(let i=0;i<2;i++){
   assert.equal(new Set(s.methods.map(m=>m.trials[i].preFault)).size,1);
   assert.equal(new Set(s.methods.map(m=>m.trials[i].postFault)).size,1);
  }
 }
});
test('at zero switching cost paired difference is exactly raw coherence delta',()=>{
 const r=runRobustness(quick);
 for(const s of r.scenarios){
  const a=s.methods.find(x=>x.id==='adaptive');
  const b=s.methods.find(x=>x.id==='frozen');
  const comparison=s.costs.find(x=>x.fee===0).adaptiveVsFrozen;
  assert.ok(Math.abs(comparison.meanDelta-(a.meanOrder-b.meanOrder))<1e-12);
 }
});
test('switching-cost sweep does not change raw trajectories',()=>{
 const r=runRobustness(quick);
 assert.deepEqual(r.switchFees,[...SWITCH_FEES]);
 for(const s of r.scenarios){
  const a=s.methods.find(m=>m.id==='adaptive');
  for(const cost of s.costs){
   const f=s.methods.find(m=>m.id==='frozen');
   const expected=(a.meanOrder-f.meanOrder)-cost.fee*(a.meanActivations-f.meanActivations);
   assert.ok(Math.abs(cost.adaptiveVsFrozen.meanDelta-expected)<1e-12);
  }
 }
});
test('each comparison preserves signed adverse results and complete holdout counts',()=>{
 const r=runRobustness(quick);
 for(const s of r.scenarios)for(const c of s.costs)
  for(const pair of [c.adaptiveVsFrozen,c.adaptiveVsRotating,c.adaptiveVsShuffled]){
   assert.equal(pair.bySeed.length,2);
   assert.equal(pair.positive+pair.negative+pair.tied,2);
   assert.ok(pair.meanDelta>=pair.minDelta-1e-12);
   assert.ok(pair.meanDelta<=pair.maxDelta+1e-12);
  }
});
test('zero budget forces all methods identical, no switching',()=>{
 const r=runRobustness({...quick,budget:0});
 for(const s of r.scenarios){
  assert.equal(new Set(s.methods.map(x=>x.meanOrder)).size,1);
  assert.ok(s.methods.every(x=>x.meanActivations===0 && x.maxActive===0));
  assert.ok(s.costs.every(x=>x.adaptiveVsFrozen.meanDelta===0));
 }
});
test('nonoverlap and invalid settings validated before experiments',()=>{
 assert.throws(()=>runRobustness({...quick,budget:13}),RangeError);
 assert.throws(()=>runRobustness({...quick,trainingSeeds:10}),RangeError);
 assert.throws(()=>runRobustness({...quick,holdoutSeeds:0}),RangeError);
 assert.throws(()=>runRobustness({...quick,horizon:120}),RangeError);
 assert.throws(()=>runRobustness({...quick,startSeed:Number.MAX_SAFE_INTEGER}),RangeError);
 assert.throws(()=>runRobustness({...quick,selectionEvery:0}),RangeError);
});
test('aggregate rollups contain every profile and avoid claiming universal wins',()=>{
 const r=runRobustness(quick);
 assert.equal(r.rollup.length,3);
 for(const x of r.rollup){
  assert.equal(x.profilesPositive+x.profilesNegative+x.profilesTied,5);
  assert.ok(STRESS_PROFILES.some(p=>p.id===x.worstProfile));
  assert.ok(Number.isFinite(x.meanAcrossProfiles));
 }
});
