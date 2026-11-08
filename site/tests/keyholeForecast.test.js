import test from 'node:test';
import assert from 'node:assert/strict';
import {POLY03_FAMILIES,makePoly03Graph} from '../src/polyhedralEnsemble.js';
import {RULES,stepPocketState} from '../src/polyhedralRobustness.js';
import {
  FORECAST_SEEDS,candidateSensors,makeForecastSplit,fitForecast,scoreForecast,
  selectForecastSensors,runForecastStudy,runForecastSweep,
} from '../src/keyholeForecast.js';

function independentNext(graph,mask,rule){
  const state=Array.from({length:8},(_,i)=>Math.floor(mask/2**i)%2?1:-1);
  const after=state.map((value,i)=>{
    const adjacent=graph.neighbors[i].map(j=>state[j]);
    if(rule==='identity')return value;
    if(rule==='parity')return adjacent.reduce((a,b)=>a*b,1);
    const sum=adjacent.reduce((a,b)=>a+b,0);
    if(rule==='majority')return sum>0?1:-1;
    const total=sum+value;
    return total===0?value:total>0?1:-1;
  });
  return after.reduce((a,b)=>a+b,0);
}
test('pre-registered splits are exactly 128/64/64 with disjoint states and preserved complement pairing',()=>{
  for(const family of POLY03_FAMILIES)for(const seed of FORECAST_SEEDS){
    const graph=makePoly03Graph(family.id);
    const split=makeForecastSplit(graph,{rule:'majority',seed});
    const groups=[split.train,split.validation,split.holdout];
    assert.deepEqual(groups.map(g=>g.length),[128,64,64]);
    const all=groups.flat();
    assert.equal(new Set(all.map(r=>r.mask)).size,256);
    assert.equal(all.length,256);
    for(const group of groups){
      const masks=new Set(group.map(x=>x.mask));
      assert.ok([...masks].every(mask=>masks.has(mask^255)));
    }
    assert.deepEqual(makeForecastSplit(graph,{rule:'majority',seed}),split);
  }
});
test('holdout labels match an independent array-based transition oracle for all four rules',()=>{
  for(const family of POLY03_FAMILIES){
    const graph=makePoly03Graph(family.id);
    for(const rule of RULES){
      const {train,validation,holdout}=makeForecastSplit(graph,{rule:rule.id,seed:369});
      for(const sample of [...train,...validation,...holdout]){
        assert.equal(sample.nextAggregate,independentNext(graph,sample.mask,rule.id));
        const result=stepPocketState(graph,sample.mask,rule.id);
        const plus=Array.from({length:8},(_,i)=>result&(1<<i)?1:-1)
          .reduce((a,b)=>a+b,0);
        assert.equal(sample.nextAggregate,plus);
      }
    }
  }
});
test('sensor candidate sets have controlled raw-bit cost',()=>{
  assert.deepEqual(candidateSensors(0),[[]]);
  assert.equal(candidateSensors(1).length,8);
  assert.equal(candidateSensors(2).length,28);
  assert.deepEqual(candidateSensors(2)[0],[0,1]);
  assert.deepEqual(candidateSensors(2).at(-1),[6,7]);
  assert.throws(()=>candidateSensors(3),/budget/);
});
test('model prediction only depends on aggregate and explicitly observed sensor bits',()=>{
  const graph=makePoly03Graph('cube');
  const split=makeForecastSplit(graph,{seed:369});
  const sensors=[0];
  const model=fitForecast(split.train,sensors);
  const byKey=new Map();
  for(let mask=0;mask<256;mask++){
    const sample={mask,observed:2*Array.from({length:8},(_,i)=>(mask>>>i)&1).reduce((a,b)=>a+b,0)-8};
    const key=sample.observed+'|'+((mask>>>sensors[0])&1);
    const prediction=model.predict(sample);
    if(byKey.has(key))assert.equal(prediction,byKey.get(key));
    else byKey.set(key,prediction);
  }
  assert.ok(scoreForecast(model,split.holdout).total===64);
});
test('sensor selection uses training and validation only, is deterministic, and no larger than its budget',()=>{
  for(const id of ['cube','one-triangle']){
    const split=makeForecastSplit(makePoly03Graph(id),{seed:369});
    for(const budget of [0,1,2]){
      const a=selectForecastSensors(split.train,split.validation,budget);
      const b=selectForecastSensors(split.train,split.validation,budget);
      assert.deepEqual(a,b);
      assert.equal(a.sensors.length,budget);
      assert.ok(a.validation.accuracy>=0&&a.validation.accuracy<=1);
    }
  }
});
test('budget zero is exactly aggregate baseline on untouched test states',()=>{
  for(const rule of RULES){
    const study=runForecastStudy({rule:rule.id,budget:0,seed:369});
    for(const row of study.rows){
      assert.equal(row.baseline.accuracy,row.tuned.accuracy);
      assert.equal(row.baseline.accuracy,row.random.accuracy);
      assert.equal(row.baseline.accuracy,row.fixed.accuracy);
      assert.equal(row.tuned.mae,row.baseline.mae);
    }
  }
});
test('report preserves negative outcomes without artificially clamping deltas to improvements',()=>{
  for(const rule of RULES)for(const budget of [1,2]){
    const study=runForecastStudy({rule:rule.id,seed:636,budget});
    assert.equal(study.protocol,'POLY-04');
    assert.equal(study.authority,'NONE');
    assert.deepEqual(study.rows.map(row=>row.partition),Array.from({length:5},()=>({
      train:128,validation:64,holdout:64,
    })));
    for(const row of study.rows){
      assert.ok(row.baseline.accuracy>=0&&row.baseline.accuracy<=1);
      assert.ok(row.tuned.accuracy>=0&&row.tuned.accuracy<=1);
      assert.ok(Math.abs(row.deltaAgainstAggregate-(row.tuned.accuracy-row.baseline.accuracy))<1e-12);
      assert.ok(Math.abs(row.deltaAgainstFixed-(row.tuned.accuracy-row.fixed.accuracy))<1e-12);
      assert.equal(row.selectedSensors.length,budget);
    }
  }
});
test('predeclared 3-seed study never mixes test masks into model training',()=>{
  const sweep=runForecastSweep({rule:'majority',budget:1});
  assert.equal(sweep.conditionCount,15);
  assert.equal(sweep.heldoutCases,960);
  assert.deepEqual(sweep.seeds,[369,636,963]);
  assert.deepEqual(runForecastSweep({rule:'majority',budget:1}),sweep);
  assert.ok(Object.values(sweep.means).every(value=>value>=0&&value<=1));
});
test('malformed rule, seed, budget and sensors fail closed',()=>{
  const graph=makePoly03Graph('cube');
  assert.throws(()=>makeForecastSplit(graph,{seed:0}),/Seed/);
  assert.throws(()=>makeForecastSplit(graph,{rule:'magic'}),/Unknown update rule/);
  assert.throws(()=>runForecastStudy({rule:'entanglement'}),/Unknown update rule/);
  assert.throws(()=>runForecastStudy({budget:3}),/budget/);
  assert.throws(()=>runForecastStudy({seed:-9}),/Seed/);
  assert.throws(()=>fitForecast([],[]),/Nonempty/);
  assert.throws(()=>fitForecast([{mask:0,observed:-8,nextAggregate:-8}],[0,0]),/distinct/);
  assert.throws(()=>scoreForecast(fitForecast([{mask:0,observed:-8,nextAggregate:-8}]),[]),/Empty/);
});
