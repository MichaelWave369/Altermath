import test from 'node:test';
import assert from 'node:assert/strict';
import {runSelection,chooseJunctions,evaluateSubset,SELECTION_SCHEMA,HOLDOUT_GAP} from '../src/selection.js';
import {junctionCatalogue,runAblation} from '../src/ablation.js';

test('catalogue of authorized synthetic junctions is exactly twelve',()=>{
 assert.equal(junctionCatalogue().length,12);
});
test('same configuration produces identical holdout results',()=>{
 const a=runSelection({trainingSeeds:2,holdoutSeeds:2,horizon:25});
 const b=runSelection({trainingSeeds:2,holdoutSeeds:2,horizon:25});
 assert.deepEqual(a,b);
 assert.equal(a.schema,SELECTION_SCHEMA);
});
test('learned selector ranks training removal effects by ascending delta',()=>{
 const train=runAblation({seedCount:2,horizon:20});
 const keep=chooseJunctions(train,5);
 const expected=[...train.ranked].sort((a,b)=>a.meanDelta-b.meanDelta||a.id.localeCompare(b.id))
   .slice(0,5).map(x=>x.id);
 assert.deepEqual(keep,expected);
});
test('train and unseen holdout seeds are distinct',()=>{
 const r=runSelection({trainingSeeds:3,holdoutSeeds:3,horizon:25});
 assert.deepEqual(r.training.seeds,[369,370,371]);
 const holdout=r.outcomes[0].trials.map(x=>x.seed);
 assert.deepEqual(holdout,[369+HOLDOUT_GAP,370+HOLDOUT_GAP,371+HOLDOUT_GAP]);
 assert.ok(holdout.every(x=>!r.training.seeds.includes(x)));
});
test('all budget-matched methods activate the same exact number of junctions',()=>{
 const r=runSelection({budget:5,trainingSeeds:2,holdoutSeeds:2,horizon:25});
 const matched=r.outcomes.filter(x=>x.category==='budget-matched');
 assert.equal(matched.length,3);
 assert.ok(matched.every(x=>x.activeJunctions===5));
 assert.ok(matched.every(x=>x.ids.length===5 && new Set(x.ids).size===5));
 assert.equal(r.outcomes.find(x=>x.id==='full').activeJunctions,12);
 assert.equal(r.outcomes.find(x=>x.id==='off').activeJunctions,0);
});
test('same initial world state shared by every method for each holdout seed',()=>{
 const r=runSelection({trainingSeeds:2,holdoutSeeds:2,horizon:25});
 for(let i=0;i<2;i++){
  const starts=r.outcomes.map(x=>x.trials[i]);
  assert.equal(new Set(starts.map(x=>x.preFault)).size,1);
  assert.equal(new Set(starts.map(x=>x.postFault)).size,1);
 }
});
test('budget zero makes learned, fixed, shuffle and off identical',()=>{
 const r=runSelection({budget:0,trainingSeeds:1,holdoutSeeds:2,horizon:15});
 const rows=r.outcomes.filter(x=>x.id!=='full');
 assert.ok(rows.every(x=>x.meanOrder===rows[0].meanOrder));
});
test('budget twelve makes learned, fixed, shuffle and full identical',()=>{
 const r=runSelection({budget:12,trainingSeeds:1,holdoutSeeds:2,horizon:15});
 const rows=r.outcomes.filter(x=>x.id!=='off');
 assert.ok(rows.every(x=>x.meanOrder===rows[0].meanOrder));
});
test('zero gain makes every topology score equally',()=>{
 const r=runSelection({gain:0,trainingSeeds:2,holdoutSeeds:2,horizon:25});
 assert.equal(new Set(r.outcomes.map(x=>x.meanOrder)).size,1);
 assert.equal(r.pairedComparison.meanDelta,0);
});
test('sign and paired mean are not silently clipped',()=>{
 const r=runSelection({trainingSeeds:2,holdoutSeeds:3,horizon:20});
 const pairs=r.pairedComparison.bySeed.map(x=>x.delta);
 assert.ok(Math.abs(r.pairedComparison.meanDelta-pairs.reduce((a,b)=>a+b,0)/3)<1e-12);
 assert.equal(r.pairedComparison.positive+r.pairedComparison.negative+r.pairedComparison.ties,3);
});
test('each output and per-seed score is bounded and finite',()=>{
 const r=runSelection({trainingSeeds:2,holdoutSeeds:2,horizon:35});
 for(const o of r.outcomes){
  assert.ok(o.meanOrder>=0 && o.meanOrder<=1);
  assert.ok(o.meanFinalOrder>=0 && o.meanFinalOrder<=1);
  assert.equal(o.trials.length,2);
  assert.ok(o.trials.every(t=>Number.isFinite(t.meanOrder)));
 }
});
test('missing or malformed training evidence fails closed',()=>{
 assert.throws(()=>chooseJunctions({ranked:[]},3),TypeError);
 assert.throws(()=>chooseJunctions(null,3),TypeError);
 assert.throws(()=>evaluateSubset(369,['unknown'],{horizon:12}),TypeError);
 assert.throws(()=>evaluateSubset(369,['3:4','3:4'],{horizon:12}),TypeError);
});
test('out-of-range seed, budget, horizon and size rejected',()=>{
 assert.throws(()=>runSelection({startSeed:Number.MAX_SAFE_INTEGER}),RangeError);
 assert.throws(()=>runSelection({budget:13}),RangeError);
 assert.throws(()=>runSelection({trainingSeeds:10}),RangeError);
 assert.throws(()=>runSelection({holdoutSeeds:0}),RangeError);
 assert.throws(()=>runSelection({horizon:0}),RangeError);
 assert.throws(()=>runSelection({gain:Infinity}),RangeError);
});
