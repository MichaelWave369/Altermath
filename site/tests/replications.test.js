import test from 'node:test';
import assert from 'node:assert/strict';
import {runReplications,validateReplicationParams,REPLICATION_SCHEMA,
  SPLIT_STRIDE,BASELINES} from '../src/replications.js';
import {STRESS_PROFILES,SWITCH_FEES} from '../src/robustness.js';
import {HOLDOUT_GAP} from '../src/selection.js';

const quick={splitCount:3,trainingSeeds:3,holdoutSeeds:3,budget:4,
 warmup:6,horizon:160};
let memo=null;
const result=()=>memo??(memo=runReplications(quick));

test('Rung 12 uses three independently trained partitions and all fixed stress profiles',()=>{
 const r=result();
 assert.equal(r.schema,REPLICATION_SCHEMA);
 assert.equal(r.splits.length,3);
 assert.equal(r.baselines.length,BASELINES.length);
 assert.deepEqual(r.baselines[0].profiles.map(p=>p.id),STRESS_PROFILES.map(p=>p.id));
 assert.deepEqual(r.baselines[0].profiles[0].fees.map(f=>f.fee),[...SWITCH_FEES]);
});
test('all training and holdout seeds globally disjoint, with explicit stride',()=>{
 const r=result();
 const seen=new Set();
 for(const s of r.splits){
  assert.equal(s.startSeed,369+(s.split-1)*SPLIT_STRIDE);
  assert.equal(s.holdoutSeeds[0],s.startSeed+HOLDOUT_GAP);
  for(const x of [...s.trainingSeeds,...s.holdoutSeeds]){
   assert.equal(seen.has(x),false);seen.add(x);
  }
 }
 assert.equal(seen.size,18);
});
test('exact selection budget is enforced for each independently trained split',()=>{
 const r=result();
 for(const s of r.splits){
  assert.equal(s.selection.length,4);
  assert.equal(new Set(s.selection).size,4);
 }
});
test('all comparisons preserve within-split signs and per-seed evidence',()=>{
 const r=result();
 for(const b of r.baselines)for(const p of b.profiles)for(const fee of p.fees){
  assert.equal(fee.bySplit.length,3);
  assert.equal(fee.wins+fee.losses+fee.ties,3);
  assert.equal(fee.bySeed.length,9);
  const splitAvg=fee.bySplit.reduce((sum,x)=>sum+x.delta,0)/3;
  assert.ok(Math.abs(fee.meanDelta-splitAvg)<1e-12);
  assert.ok(fee.meanDelta>=fee.minSplitDelta-1e-12);
  assert.ok(fee.meanDelta<=fee.maxSplitDelta+1e-12);
 }
});
test('selection Jaccard overlap is bounded, includes all unordered pairs',()=>{
 const s=result().selectionStability;
 assert.equal(s.pairs.length,3);
 assert.ok(s.meanPairwiseJaccard>=0&&s.meanPairwiseJaccard<=1);
 assert.ok(s.pairs.every(x=>x.jaccard>=0&&x.jaccard<=1));
});
test('summary flags adverse outcomes instead of clipping to positive',()=>{
 const r=result(),s=r.summary;
 assert.equal(s.wins+s.losses+s.ties,15);
 assert.equal(s.splitSummary.wins+s.splitSummary.losses+s.splitSummary.ties,3);
 assert.equal(s.meanBySplit.length,3);
 assert.ok(Number.isFinite(s.meanAcrossSplitProfileCells));
 assert.ok(s.worstCell.delta<=s.meanAcrossSplitProfileCells+1e-12);
});
test('re-running exact inputs gives byte-stable deterministic data',()=>{
 const a=runReplications({splitCount:3,trainingSeeds:3,holdoutSeeds:3,budget:0,warmup:0,horizon:160});
 const b=runReplications({splitCount:3,trainingSeeds:3,holdoutSeeds:3,budget:0,warmup:0,horizon:160});
 assert.equal(JSON.stringify(a),JSON.stringify(b));
});
test('zero connection budget yields ties against all budgeted baselines',()=>{
 const r=runReplications({...quick,budget:0});
 for(const b of r.baselines)for(const p of b.profiles)for(const f of p.fees){
  assert.ok(Math.abs(f.meanDelta)<1e-12);
  assert.equal(f.losses,0);assert.equal(f.wins,0);
  assert.equal(f.ties,3);
 }
 assert.equal(r.selectionStability.meanPairwiseJaccard,1);
});
test('invalid split count, budget, seed, horizon and seed count rejected',()=>{
 assert.throws(()=>validateReplicationParams({splitCount:2}),RangeError);
 assert.throws(()=>validateReplicationParams({trainingSeeds:2}),RangeError);
 assert.throws(()=>validateReplicationParams({holdoutSeeds:0}),RangeError);
 assert.throws(()=>validateReplicationParams({budget:13}),RangeError);
 assert.throws(()=>validateReplicationParams({horizon:50}),RangeError);
 assert.throws(()=>validateReplicationParams({startSeed:Number.MAX_SAFE_INTEGER}),RangeError);
});
test('all experiment results remain finite and baseline identities intact',()=>{
 const r=result();
 assert.deepEqual(r.baselines.map(x=>x.key),BASELINES.map(x=>x.key));
 for(const b of r.baselines)for(const p of b.profiles)for(const f of p.fees){
  assert.ok(Number.isFinite(f.meanDelta));
  assert.ok(Number.isFinite(f.minSplitDelta));
  assert.ok(Number.isFinite(f.maxSplitDelta));
 }
});
