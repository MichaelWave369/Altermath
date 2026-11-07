import test from 'node:test';
import assert from 'node:assert/strict';
import {makePolyhedralGraph,validateGraph} from '../src/polyhedralKeyhole.js';
import {exactWeightedKeyhole,RULES,PRIORS} from '../src/polyhedralRobustness.js';
import {
  POLY03_FAMILIES,makePoly03Graph,signatureOfGraph,
  exhaustivePoly03Census,runPoly03,
} from '../src/polyhedralEnsemble.js';

const EXPECTED={
  '4:2':{count:2520,bits:.9574523144989763},
  '2:2':{count:10080,bits:1.324181611171151},
  '1:3':{count:3360,bits:1.5164507163647825},
  '0:6':{count:840,bits:.47437549538726076},
  '0:4':{count:2520,bits:1.2489297378455433},
};
test('complete finite cubic graph census has 19,355 labeled graphs, 35 disconnected and 19,320 connected',()=>{
  const census=exhaustivePoly03Census();
  assert.equal(census.labeledTotal,19355);
  assert.equal(census.connectedTotal,19320);
  assert.equal(census.disconnectedTotal,35);
  assert.equal(census.groups.length,5);
  assert.equal(census.groups.reduce((a,g)=>a+g.count,0),19320);
  for(const group of census.groups){
    const expected=EXPECTED[group.signature];
    assert.ok(expected,'Undeclared triangle/square signature '+group.signature);
    assert.equal(group.count,expected.count);
    assert.ok(Math.abs(group.minMajorityBits-expected.bits)<1e-11);
    assert.ok(Math.abs(group.maxMajorityBits-expected.bits)<1e-11);
    assert.ok(Math.abs(group.firstMajorityBits-expected.bits)<1e-11);
  }
});
test('all five registered representatives preserve exactly 8 vertices, degree 3, 12 edges, and expected signatures',()=>{
  assert.equal(POLY03_FAMILIES.length,5);
  for(const def of POLY03_FAMILIES){
    const graph=makePoly03Graph(def.id);
    assert.ok(validateGraph(graph));
    assert.equal(graph.neighbors.length,8);
    assert.ok(graph.neighbors.every(neighbors=>neighbors.length===3));
    assert.equal(graph.neighbors.reduce((s,neighbors)=>s+neighbors.length,0)/2,12);
    assert.equal(signatureOfGraph(graph),def.signature);
    assert.equal(def.labeledCount,EXPECTED[def.signature].count);
  }
});
test('graph relabeling does not alter exact entropy or cycle signature',()=>{
  for(const def of POLY03_FAMILIES){
    const graph=makePoly03Graph(def.id);
    const permutation=[7,1,3,5,0,2,6,4];
    const transformed={...graph,
      coordinates:Array(8),
      neighbors:Array.from({length:8},()=>[])};
    for(let i=0;i<8;i++){
      transformed.coordinates[permutation[i]]=[...graph.coordinates[i]];
      transformed.neighbors[permutation[i]]=graph.neighbors[i].map(j=>permutation[j]).sort((a,b)=>a-b);
    }
    assert.ok(validateGraph(transformed));
    assert.equal(signatureOfGraph(transformed),def.signature);
    for(const rule of ['majority','inertia','identity']){
      const original=exactWeightedKeyhole(graph,{rule,prior:.25});
      const relabeled=exactWeightedKeyhole(transformed,{rule,prior:.25});
      assert.ok(Math.abs(original.conditionalEntropyBits-relabeled.conditionalEntropyBits)<1e-10);
    }
  }
});
test('cube representative matches the earlier octahedron-face dual model',()=>{
  const old=exactWeightedKeyhole(makePolyhedralGraph('octahedron'),{rule:'majority',prior:.5});
  const newModel=exactWeightedKeyhole(makePoly03Graph('cube'),{rule:'majority',prior:.5});
  assert.ok(Math.abs(old.conditionalEntropyBits-newModel.conditionalEntropyBits)<1e-12);
});
test('fixed-size, fixed-degree majority comparison has nonzero, reproducible structural variation',()=>{
  const study=runPoly03();
  assert.deepEqual(study,runPoly03());
  assert.equal(study.authority,'NONE');
  assert.equal(study.vertexCount,8);
  assert.equal(study.degree,3);
  assert.equal(study.labeledGraphs,19355);
  assert.equal(study.connectedGraphs,19320);
  assert.equal(study.families.length,5);
  assert.ok(study.maxBits-study.minBits>1);
  for(const family of study.families){
    assert.ok(Math.abs(family.entropyBits-EXPECTED[family.signature].bits)<1e-11);
  }
});
test('four update laws and three Bernoulli priors remain exact and normalized on each registered graph',()=>{
  for(const rule of RULES)for(const prior of PRIORS){
    const study=runPoly03({rule:rule.id,prior});
    for(const family of study.families){
      assert.ok(Number.isFinite(family.entropyBits));
      const sum=family.distribution.reduce((a,b)=>a+b.weight,0);
      assert.ok(Math.abs(sum-1)<1e-11);
      if(rule.id==='identity')assert.equal(family.entropyBits,0);
    }
  }
});
test('invalid graph IDs, rule choices and priors fail closed',()=>{
  assert.throws(()=>makePoly03Graph('magical-e8'),/Unknown eight-pocket/);
  assert.throws(()=>runPoly03({rule:'unknown'}),/Unsupported update rule/);
  assert.throws(()=>runPoly03({prior:.31}),/predeclared priors/);
  assert.throws(()=>signatureOfGraph(makePolyhedralGraph('tetrahedron')),/eight-vertex cubic/);
});
