import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runTimeChallenge,TIME_CHALLENGE_SCHEMA,CHALLENGE_TIME_GRID,
  CHALLENGE_HOLDOUT_OFFSET,CHALLENGE_THRESHOLD
} from '../src/bioLatticeTimeChallenge.js';

const small={rings:8,protofilaments:9,coupling:.4,disorder:.2,loss:.01,steps:10};
const options={base:small,startSeed:369,trainingSeeds:3,holdoutSeeds:3};
let cached;
const sample=()=>cached??(cached=runTimeChallenge(options));

test('R18 is deterministic with disjoint blocks and one held-out time',()=>{
 const a=sample(),b=runTimeChallenge(options);
 assert.deepEqual(a,b);
 assert.equal(a.schema,TIME_CHALLENGE_SCHEMA);
 assert.equal(a.diagnostics.seedsDisjoint,true);
 assert.equal(a.diagnostics.uniqueSeeds,6);
 assert.deepEqual(a.protocol.trainSeeds,[369,370,371]);
 assert.deepEqual(a.protocol.holdoutSeeds,[
   369+CHALLENGE_HOLDOUT_OFFSET,370+CHALLENGE_HOLDOUT_OFFSET,371+CHALLENGE_HOLDOUT_OFFSET
 ]);
 assert.equal(a.holdout.evaluatedTimepointCount,1);
 assert.equal(a.diagnostics.holdoutGridSwept,false);
});
test('time grid includes zero control, and train selects nonzero maximum absolute gap',()=>{
 const a=sample(),rows=a.training.series;
 assert.deepEqual(a.protocol.observationGrid,[...CHALLENGE_TIME_GRID]);
 assert.equal(rows.length,CHALLENGE_TIME_GRID.length);
 assert.equal(a.training.selectedTime,rows[a.training.selectedIndex].steps);
 assert.ok(a.training.selectedIndex>=1);
 assert.ok(rows.every(row=>Math.abs(row.meanDifference)<=
   Math.abs(rows[a.training.selectedIndex].meanDifference)+1e-9));
 assert.equal(rows[0].meanDifference,0);
 for(const row of rows)assert.equal(row.perSeed.length,3);
});
test('training selection is invariant to changes in holdout count',()=>{
 const a=sample();
 const b=runTimeChallenge({...options,holdoutSeeds:9});
 assert.deepEqual(a.training,b.training);
 assert.deepEqual(a.protocol.trainSeeds,b.protocol.trainSeeds);
 assert.equal(b.holdout.perSeed.length,9);
 assert.equal(b.diagnostics.uniqueSeeds,12);
});
test('all displayed training curves use actual three-model source results',()=>{
 const a=sample();
 for(const row of a.training.series){
  const avg=field=>row.perSeed.reduce((s,r)=>s+r[field],0)/row.perSeed.length;
  assert.ok(Math.abs(row.meanAmplitude-avg('amplitude'))<1e-12);
  assert.ok(Math.abs(row.meanHopping-avg('hopping'))<1e-12);
  assert.ok(Math.abs(row.meanMarkov-avg('markov'))<1e-12);
 }
});
test('loss, zero coupling and zero ticks behave as synthetic invariants',()=>{
 const a=sample();
 assert.equal(a.controls.length,2);
 assert.ok(a.controls.every(c=>c.passed&&c.maxAbsoluteGap<1e-10));
 assert.equal(a.diagnostics.nullControlsPassed,true);
 assert.ok(a.diagnostics.maxSurvivalError<1e-9);
 assert.ok(a.holdout.perSeed.every(r=>r.steps===a.training.selectedTime));
});
test('zero coupling removes difference for both supported metrics and baselines',()=>{
 for(const metric of ['axialSpreadSites','effectiveSites'])
  for(const baseline of ['markov','hopping']){
   const a=runTimeChallenge({...options,base:{...small,coupling:0},
     metric,baseline});
   assert.equal(a.training.selectedIndex,1);
   assert.equal(a.training.selectedMeanDifference,0);
   assert.equal(a.holdout.meanDifference,0);
   assert.equal(a.holdout.directionalStatus,'NO_TRAIN_DIRECTION');
   assert.equal(a.holdout.descriptiveDecision,
     'SYNTHETIC_PREDECLARED_CRITERION_NOT_MET');
  }
});
test('alternative baseline/metric is handled without conflating quantities',()=>{
 const a=runTimeChallenge({...options,metric:'effectiveSites',baseline:'hopping'});
 assert.equal(a.protocol.metric,'effectiveSites');
 assert.equal(a.protocol.baseline,'hopping');
 assert.equal(a.holdout.perSeed.length,3);
 const count=a.holdout.signs;
 assert.equal(count.positive+count.negative+count.ties,3);
});
test('positive/negative/ties are all recorded and threshold is fixed ahead of holdout',()=>{
 const a=sample(),values=a.holdout.perSeed.map(r=>r.difference);
 assert.equal(a.protocol.fixedDescriptiveGapThreshold,CHALLENGE_THRESHOLD);
 assert.equal(a.holdout.signs.positive+a.holdout.signs.negative+a.holdout.signs.ties,3);
 assert.ok(a.holdout.meanDifference>=Math.min(...values)-1e-10);
 assert.ok(a.holdout.meanDifference<=Math.max(...values)+1e-10);
 assert.equal(a.protocol.externalPreregistration,false);
});
test('invalid numbers, seeds and categories fail closed',()=>{
 for(const steps of [Infinity,NaN,-1,121,1.5])
  assert.throws(()=>runTimeChallenge({...options,base:{...small,steps}}),RangeError);
 assert.throws(()=>runTimeChallenge({...options,metric:'quantum_consciousness'}),RangeError);
 assert.throws(()=>runTimeChallenge({...options,baseline:'none'}),RangeError);
 assert.throws(()=>runTimeChallenge({...options,trainingSeeds:4}),RangeError);
 assert.throws(()=>runTimeChallenge({...options,holdoutSeeds:0}),RangeError);
 assert.throws(()=>runTimeChallenge({...options,startSeed:Infinity}),RangeError);
 assert.throws(()=>runTimeChallenge({...options,startSeed:2147483647}),RangeError);
 assert.throws(()=>runTimeChallenge({...options,base:{...small,calibrateNm:1}}),RangeError);
});
test('descriptive report does not masquerade as an externally preregistered experiment',()=>{
 const a=sample();
 assert.equal(a.evidenceClass,'synthetic_train_holdout_time_selection_only');
 assert.equal(a.protocol.parameterFit,'none');
 assert.equal(a.protocol.externalPreregistration,false);
 assert.ok(a.limitations.some(s=>s.includes('not measured microtubules')));
 assert.ok(a.limitations.some(s=>s.includes('not independently registered')));
});
