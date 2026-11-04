import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTopology} from '../src/model.js';
import {runController,runControllerTrial,chooseOnline,authorizedJunctions,
  validateController,CONTROLLER_SCHEMA,HOLDOUT_GAP} from '../src/controller.js';
import {createWorld} from '../src/model.js';
import {junctionCatalogue} from '../src/ablation.js';

const ids=junctionCatalogue().map(x=>x.id).sort();
const opts={trainingSeeds:2,holdoutSeeds:2,horizon:75,
  revocationStart:20,revocationEnd:45,warmup:10};
test('repeatable deterministic training and holdout comparison',()=>{
  const a=runController(opts),b=runController(opts);
  assert.deepEqual(a,b);
  assert.equal(a.schema,CONTROLLER_SCHEMA);
});
test('separate train and holdout ranges',()=>{
  const r=runController(opts);
  assert.deepEqual(r.training.seeds,[369,370]);
  assert.deepEqual(r.parameters.holdoutSeeds,
    [369+HOLDOUT_GAP,370+HOLDOUT_GAP]);
});
test('six baselines explicitly labeled and paired against frozen',()=>{
  const r=runController(opts);
  assert.deepEqual(r.outcomes.map(x=>x.id),
    ['adaptive','frozen','rotating','shuffled','full','off']);
  assert.equal(r.outcomes.filter(x=>x.category==='budgeted').length,4);
  assert.equal(r.pairedAdaptiveVsFrozen.bySeed.length,2);
});
test('all synthetic policies revoke the same three IDs only during window',()=>{
  const p=validateController(opts);
  assert.equal(authorizedJunctions(0,p).length,12);
  assert.equal(authorizedJunctions(p.revocationStart,p).length,9);
  assert.equal(authorizedJunctions(p.revocationEnd,p).length,12);
});
test('adaptive and frozen start from identical post-disturbance state',()=>{
  const initial=ids.slice(0,6);
  const a=runControllerTrial(369,'adaptive',initial,opts);
  const f=runControllerTrial(369,'frozen',initial,opts);
  assert.equal(a.preFault,f.preFault);
  assert.equal(a.postFault,f.postFault);
});
test('no budget overflow and never an unauthorized active junction',()=>{
  const r=runController({...opts,budget:4});
  for(const row of r.outcomes){
    assert.equal(row.policyViolations,0);
    if(row.category==='budgeted')assert.ok(row.maxActive<=4);
  }
  assert.ok(r.outcomes.find(x=>x.id==='full').maxActive<=12);
  assert.equal(r.outcomes.find(x=>x.id==='off').maxActive,0);
});
test('locked edges do not voluntarily switch before minimum dwell',()=>{
  const p=validateController({...opts,budget:2,minDwell:70,
    maxSwaps:2});
  const initial=new Set(ids.slice(0,2));
  const selectedAt=new Map(ids.slice(0,2).map(id=>[id,0]));
  const result=chooseOnline(createWorld(369),initial,selectedAt,
    12,p,'adaptive',369);
  assert.deepEqual([...result.selected].sort(),[...initial].sort());
  assert.equal(result.additions,0);
});
test('policy loss immediately removes a junction even within minimum dwell',()=>{
  const p=validateController({...opts,budget:3,minDwell:100});
  const blocked=ids[0];
  const before=new Set([blocked,ids[1],ids[2]]);
  const result=chooseOnline(createWorld(369),before,
    new Map([...before].map(id=>[id,19])),20,p,'adaptive',369);
  assert.equal(result.selected.has(blocked),false);
  assert.equal(result.forcedDrops,1);
});
test('max swaps per update enforces a finite churn limit',()=>{
  const p=validateController({...opts,budget:6,maxSwaps:1,minDwell:0});
  const prior=new Set(ids.slice(0,6));
  const result=chooseOnline(createWorld(369),prior,
    new Map([...prior].map(id=>[id,0])),12,p,'adaptive',369);
  assert.ok(result.additions<=1);
});
test('zero budget behaves identically for budgeted methods',()=>{
  const r=runController({...opts,budget:0});
  const matched=r.outcomes.filter(x=>x.category==='budgeted');
  assert.equal(new Set(matched.map(x=>x.meanOrder)).size,1);
  assert.ok(matched.every(x=>x.maxActive===0));
});
test('zero coupling removes all raw phase advantages',()=>{
  const r=runController({...opts,gain:0});
  for(const x of r.outcomes)assert.ok(
    Math.abs(x.meanOrder-r.outcomes[0].meanOrder)<1e-12);
});
test('paired net delta exactly accounts for activation fee',()=>{
  const r=runController(opts);
  const a=r.outcomes[0].trials,f=r.outcomes[1].trials;
  for(let i=0;i<a.length;i++){
    const d=r.pairedAdaptiveVsFrozen.bySeed[i];
    assert.ok(Math.abs(d.net-(a[i].netScore-f[i].netScore))<1e-12);
  }
});
test('switching penalty reduces or leaves unchanged dynamic net score',()=>{
  const r=runController(opts);
  for(const o of r.outcomes)assert.ok(o.meanNetScore<=o.meanOrder+1e-12);
});
test('invalid settings and unknown junctions fail closed',()=>{
  assert.throws(()=>validateController({budget:13}),RangeError);
  assert.throws(()=>validateController({selectionEvery:0}),RangeError);
  assert.throws(()=>validateController({startSeed:Number.MAX_SAFE_INTEGER}),RangeError);
  assert.throws(()=>validateController({revocationStart:70,revocationEnd:60,horizon:75}),RangeError);
  assert.throws(()=>runControllerTrial(369,'adaptive',['made-up'],opts),TypeError);
  assert.throws(()=>runControllerTrial(369,'magic',[],opts),RangeError);
});
test('each result is finite and coherence between 0 and 1',()=>{
  const r=runController(opts);
  for(const o of r.outcomes){
    assert.ok(o.meanOrder>=0&&o.meanOrder<=1);
    assert.ok(Number.isFinite(o.meanNetScore));
    assert.ok(o.averageActive>=0&&o.averageActive<=12);
    assert.ok(o.sampleTrace.length>2);
  }
});
