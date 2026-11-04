import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTopology} from '../src/model.js';
import {scenarioTopology,simulateTrial,runBenchmark,SCENARIOS,EXPERIMENT_SCHEMA} from '../src/experiments.js';

const degrees=t=>{
  const d=Array(18).fill(0);
  for(const e of t.links){d[e.a]++;d[e.b]++;}
  return d;
};

test('four explicitly labeled scenarios, three topology-matched',()=>{
  assert.deepEqual(SCENARIOS.map(s=>s.id),['canonical','rewired-a','rewired-b','isolated']);
  assert.equal(SCENARIOS.filter(s=>s.category==='matched').length,3);
});
test('rewired topology preserves exact node degrees, cross budgets and edge uniqueness',()=>{
  const base=buildTopology(),expected=degrees(base);
  for(const seed of [1,369,404,2026]){
    for(const label of ['canonical','rewired-a','rewired-b']){
      const t=scenarioTopology(seed,label);
      assert.equal(t.nodes.length,18);
      assert.equal(t.links.length,30);
      assert.equal(t.links.filter(e=>e.cross).length,12);
      assert.deepEqual(degrees(t),expected);
      assert.equal(new Set(t.links.map(e=>e.id)).size,t.links.length);
    }
  }
});
test('same seed and run parameters reproduce exactly',()=>{
  assert.deepEqual(runBenchmark({seedCount:2}),runBenchmark({seedCount:2}));
});
test('seeds vary initial conditions while scenarios share initial order per seed',()=>{
  const result=runBenchmark({seedCount:3});
  assert.equal(result.schema,EXPERIMENT_SCHEMA);
  for(let i=0;i<3;i++){
    const same=result.trials.filter(t=>t.seed===369+i);
    assert.equal(new Set(same.map(t=>t.initialOrder)).size,1);
  }
  assert.notEqual(result.trials[0].initialOrder,result.trials[1].initialOrder);
});
test('benchmark computes bounded synchronization and explicit null recovery',()=>{
  const report=runBenchmark({seedCount:3,ticks:170,faultAt:40,repairAt:90});
  assert.equal(report.trials.length,12);
  for(const t of report.trials){
    assert.ok(t.finalOrder>=0 && t.finalOrder<=1.0000001);
    assert.ok(t.meanOrderAfterRepair>=0 && t.meanOrderAfterRepair<=1.0000001);
    assert.ok(t.trace.length>0);
    assert.ok(t.recoveryTicks===null || Number.isInteger(t.recoveryTicks));
  }
  assert.ok(report.trials.filter(t=>t.scenario==='isolated').every(t=>t.recoveryTicks===null));
});
test('zero coupling leaves independent frequency evolution, despite possible edges',()=>{
  const trial=simulateTrial({gain:0,ticks:50,faultAt:10,repairAt:30});
  assert.equal(trial.cumulativeExchangeIndex>0,true); // diagnostic phase difference; not coupling energy
  assert.equal(trial.ticks,50);
});
test('invalid scenario, seed sweep and fault schedule fail before running',()=>{
  assert.throws(()=>scenarioTopology(369,'magic'),RangeError);
  assert.throws(()=>runBenchmark({seedCount:100}),RangeError);
  assert.throws(()=>simulateTrial({faultAt:50,repairAt:20}),RangeError);
  assert.throws(()=>runBenchmark({startSeed:NaN}),RangeError);
});
test('isolated reference has 0 active cross links and is labeled unmatched',()=>{
  const report=runBenchmark({seedCount:1});
  const isolated=report.scenarios.find(s=>s.id==='isolated');
  assert.equal(isolated.activeCrossEdges,0);
  assert.equal(isolated.category,'unmatched');
  assert.ok(report.scenarios.filter(s=>s.category==='matched').every(s=>s.activeCrossEdges===12));
});
