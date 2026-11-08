import test from 'node:test';
import assert from 'node:assert/strict';
import {POLY03_FAMILIES,makePoly03Graph} from '../src/polyhedralEnsemble.js';
import {validateGraph} from '../src/polyhedralKeyhole.js';
import {RULES} from '../src/polyhedralRobustness.js';
import {selectForecastSensors} from '../src/keyholeForecast.js';
import {
  TRANSFER_RELABEL_SEEDS,vertexPermutation,relabelGraph,
  enumerateGraphForecastRows,makeTransferFold,runCrossTopologyTransfer,
} from '../src/keyholeTransfer.js';

const identity=Array.from({length:8},(_,i)=>i);
test('five-fold leave-one-topology-out partitions are disjoint by graph family',()=>{
  for(const def of POLY03_FAMILIES){
    const fold=makeTransferFold(def.id);
    assert.equal(fold.holdoutId,def.id);
    assert.equal(fold.trainIds.length,3);
    assert.equal(new Set([...fold.trainIds,fold.validationId,fold.holdoutId]).size,5);
    assert.equal(fold.train.length,768);
    assert.equal(fold.validation.length,256);
    assert.equal(fold.train.filter(x=>x.mask===0).length,3);
    assert.equal(fold.validation.filter(x=>x.mask===0).length,1);
    assert.equal(enumerateGraphForecastRows(fold.holdoutGraph).length,256);
  }
});
test('relabeling is graph-isomorphic and preserves degree/edge count without mutating original',()=>{
  for(const family of POLY03_FAMILIES){
    const original=makePoly03Graph(family.id);
    const before=JSON.stringify(original);
    for(const seed of TRANSFER_RELABEL_SEEDS){
      const permutation=vertexPermutation(seed);
      assert.equal(new Set(permutation).size,8);
      const changed=relabelGraph(original,permutation);
      assert.ok(validateGraph(changed));
      assert.ok(changed.neighbors.every(n=>n.length===3));
      assert.equal(changed.neighbors.reduce((sum,row)=>sum+row.length,0)/2,12);
      for(let i=0;i<8;i++){
        const mapped=changed.neighbors[permutation[i]];
        assert.deepEqual(mapped,original.neighbors[i].map(j=>permutation[j]).sort((a,b)=>a-b));
      }
    }
    assert.equal(JSON.stringify(original),before);
    assert.deepEqual(relabelGraph(original,identity),original);
  }
});
test('relabelled state dynamics commute with the same vertex permutation',()=>{
  for(const family of POLY03_FAMILIES){
    const graph=makePoly03Graph(family.id);
    for(const seed of TRANSFER_RELABEL_SEEDS){
      const permutation=vertexPermutation(seed);
      const other=relabelGraph(graph,permutation);
      for(const rule of RULES){
        const canonical=enumerateGraphForecastRows(graph,rule.id);
        const changed=enumerateGraphForecastRows(other,rule.id);
        for(const original of canonical){
          let newMask=0;
          for(let i=0;i<8;i++)if(original.mask&(1<<i))newMask|=1<<permutation[i];
          assert.equal(changed[newMask].observed,original.observed);
          assert.equal(changed[newMask].nextAggregate,original.nextAggregate);
        }
      }
    }
  }
});
test('sensor selection consumes only training and validation graph labels',()=>{
  const fold=makeTransferFold('cube','majority');
  const selected=selectForecastSensors(fold.train,fold.validation,2);
  assert.deepEqual(selected,selectForecastSensors(fold.train,fold.validation,2));
  assert.equal(selected.sensors.length,2);
  assert.ok(fold.train.every(sample=>Number.isInteger(sample.nextAggregate)));
  assert.notEqual(fold.validationId,fold.holdoutId);
  assert.ok(!fold.trainIds.includes(fold.holdoutId));
});
test('all fold conditions and relabel variants preserve fair observation budgets and negative deltas',()=>{
  for(const budget of [0,1,2]){
    const report=runCrossTopologyTransfer({budget});
    assert.equal(report.authority,'NONE');
    assert.equal(report.evaluatedConditions,20);
    assert.equal(report.evaluatedPredictionsPerModel,5120);
    assert.equal(report.folds.length,5);
    for(const fold of report.folds){
      assert.equal(fold.selectedSensors.length,budget);
      assert.equal(fold.fixedSensors.length,budget);
      assert.equal(fold.randomSensors.length,budget);
      assert.equal(fold.results.length,4);
      for(const row of fold.results){
        assert.equal(row.trainCount,768);
        assert.equal(row.validationCount,256);
        assert.equal(row.testCount,256);
        for(const method of ['aggregate','fixed','random','selected']){
          assert.equal(row[method].total,256);
          assert.ok(row[method].accuracy>=0&&row[method].accuracy<=1);
          assert.ok(row[method].mae>=0);
        }
        assert.equal(row.deltaVsFixed,row.selected.accuracy-row.fixed.accuracy);
        assert.equal(row.deltaVsAggregate,row.selected.accuracy-row.aggregate.accuracy);
        if(budget===0){
          assert.equal(row.aggregate.accuracy,row.selected.accuracy);
          assert.equal(row.fixed.accuracy,row.selected.accuracy);
          assert.equal(row.random.accuracy,row.selected.accuracy);
        }
      }
    }
  }
});
test('identity null rule is exactly predicted from aggregate on every unseen graph',()=>{
  const report=runCrossTopologyTransfer({rule:'identity',budget:2});
  for(const fold of report.folds)for(const row of fold.results){
    assert.equal(row.aggregate.accuracy,1);
    assert.equal(row.fixed.accuracy,1);
    assert.equal(row.random.accuracy,1);
    assert.equal(row.selected.accuracy,1);
    assert.equal(row.selected.mae,0);
  }
});
test('all update laws work on unfamiliar graph topology and deterministic relabels',()=>{
  for(const rule of RULES){
    const study=runCrossTopologyTransfer({rule:rule.id,budget:1});
    assert.deepEqual(study,runCrossTopologyTransfer({rule:rule.id,budget:1}));
    assert.equal(study.byVariant.length,4);
    for(const variant of study.byVariant)assert.equal(variant.folds,5);
  }
});
test('invalid graph IDs and permutations fail closed',()=>{
  const g=makePoly03Graph('cube');
  assert.throws(()=>makeTransferFold('infinite-cube'),/Unknown holdout topology/);
  assert.throws(()=>vertexPermutation(-1),/Invalid permutation seed/);
  assert.throws(()=>relabelGraph(g,[0,1,2,3,4,5,6,6]),/permutation/);
  assert.throws(()=>relabelGraph(g,[0,1,2,3,4,5,6,9]),/permutation/);
  assert.throws(()=>runCrossTopologyTransfer({rule:'magic'}),/Unknown transition rule/);
  assert.throws(()=>runCrossTopologyTransfer({budget:3}),/Budget/);
  assert.throws(()=>runCrossTopologyTransfer({relabelSeeds:[369,369]}),/unique/);
});
