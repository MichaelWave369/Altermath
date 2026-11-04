import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTopology} from '../src/model.js';
import {junctionCatalogue,ablationTrial,runAblation,ABLATION_SCHEMA} from '../src/ablation.js';

test('exactly twelve cross-layer junctions with unique identifiers',()=>{
 const items=junctionCatalogue(),topology=buildTopology();
 assert.equal(items.length,12);
 assert.equal(new Set(items.map(x=>x.id)).size,12);
 assert.deepEqual(items.map(x=>x.id).sort(),topology.links.filter(x=>x.cross).map(x=>x.id).sort());
});
test('same seed reproduces every branch and report exactly',()=>{
 assert.deepEqual(ablationTrial(369,{horizon:35}),ablationTrial(369,{horizon:35}));
 assert.deepEqual(runAblation({seedCount:3,horizon:35}),runAblation({seedCount:3,horizon:35}));
});
test('all intervention branches share pre-fault state and frequencies',()=>{
 const t=ablationTrial(369,{warmup:11,horizon:12});
 assert.equal(t.sharedState.length,18);
 assert.equal(t.sharedFrequencies.length,18);
 assert.equal(t.outputs.length,13);
 assert.equal(t.baseline.activeEdges,30);
 assert.equal(t.baseline.activeJunctions,12);
});
test('single-edge deletion changes only edge/junction count, unlike all-off',()=>{
 const t=ablationTrial(369,{horizon:12});
 for(const o of t.outputs.filter(x=>x.category==='single-junction')){
   assert.equal(o.removedCount,1);
   assert.equal(o.activeEdges,29);
   assert.equal(o.activeJunctions,11);
 }
 const isolated=t.outputs.find(x=>x.category==='full-isolation');
 assert.equal(isolated.removedCount,12);
 assert.equal(isolated.activeEdges,18);
 assert.equal(isolated.activeJunctions,0);
});
test('paired delta is exactly candidate score minus same-seed baseline',()=>{
 const t=ablationTrial(369,{horizon:55});
 for(const o of t.outputs){
  assert.equal(o.deltaMean,o.meanCoherence-t.baseline.meanCoherence);
  assert.equal(o.deltaFinal,o.finalCoherence-t.baseline.finalCoherence);
 }
});
test('rank ordering uses magnitude and cannot hide an adverse effect',()=>{
 const r=runAblation({seedCount:3,horizon:55});
 assert.equal(r.schema,ABLATION_SCHEMA);
 assert.equal(r.ranked.length,12);
 assert.equal(r.trials.length,3);
 assert.equal(r.isolated.category,'full-isolation');
 for(let i=1;i<r.ranked.length;i++)
   assert.ok(Math.abs(r.ranked[i-1].meanDelta)>=Math.abs(r.ranked[i].meanDelta));
});
test('per-edge outcome sign counts sum to sweep size',()=>{
 const r=runAblation({seedCount:6,horizon:25});
 for(const row of [...r.ranked,r.isolated]){
  assert.equal(row.improved+row.degraded+row.ties,6);
  assert.ok(row.meanDelta>=row.minDelta-1e-12 && row.meanDelta<=row.maxDelta+1e-12);
 }
});
test('all metrics finite and synchronization within mathematical bounds',()=>{
 const r=runAblation({seedCount:3,horizon:100});
 for(const t of r.trials){
   assert.ok(t.baseline.finalCoherence>=0 && t.baseline.finalCoherence<=1);
   for(const o of t.outputs){
     assert.ok(Number.isFinite(o.meanCoherence));
     assert.ok(Number.isFinite(o.deltaMean));
     assert.ok(o.finalCoherence>=0 && o.finalCoherence<=1);
   }
 }
});
test('seeds vary worlds but paired trials retain same intervention schedule',()=>{
 const r=runAblation({seedCount:3,warmup:40,horizon:32});
 assert.deepEqual(r.trials.map(t=>t.seed),[369,370,371]);
 assert.notEqual(r.trials[0].preFault,r.trials[1].preFault);
 assert.ok(r.trials.every(t=>t.outputs.length===13));
});
test('bad parameters and unsafe seed arithmetic fail before simulation',()=>{
 assert.throws(()=>runAblation({seedCount:0}),RangeError);
 assert.throws(()=>runAblation({seedCount:37}),RangeError);
 assert.throws(()=>runAblation({startSeed:NaN}),RangeError);
 assert.throws(()=>runAblation({startSeed:Number.MAX_SAFE_INTEGER,seedCount:2}),RangeError);
 assert.throws(()=>runAblation({gain:Infinity}),RangeError);
 assert.throws(()=>ablationTrial(369,{warmup:-1}),RangeError);
 assert.throws(()=>ablationTrial(369,{horizon:0}),RangeError);
});
test('zero gain produces zero paired effect when only links change',()=>{
 const r=runAblation({seedCount:2,horizon:30,gain:0});
 assert.ok(r.ranked.every(x=>Math.abs(x.meanDelta)<1e-14));
 assert.ok(Math.abs(r.isolated.meanDelta)<1e-14);
});
