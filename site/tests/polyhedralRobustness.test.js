import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makePolyhedralGraph, validateGraph, graphEdges, exactKeyholeStudy, nextState,
} from '../src/polyhedralKeyhole.js';
import {
  RULES, PRIORS, stepPocketState, exactWeightedKeyhole, runPoly02, poly02Sweep,
} from '../src/polyhedralRobustness.js';

// Independent reference: arrays of -1/+1 and direct lookup, not the
// optimized production bit-sum and popcount helpers.
function independentOracle(graph,rule,prior){
  const n=graph.neighbors.length;
  const byObserved=new Map();
  for(let integer=0;integer<2**n;integer++){
    const before=Array.from({length:n},(_,i)=>Math.floor(integer/2**i)%2?1:-1);
    const after=before.map((self,i)=>{
      const values=graph.neighbors[i].map(j=>before[j]);
      const sum=values.reduce((a,b)=>a+b,0);
      if(rule==='identity')return self;
      if(rule==='majority')return sum>0?1:-1;
      if(rule==='parity')return values.reduce((a,b)=>a*b,1);
      const joined=sum+self;
      return joined===0?self:joined>0?1:-1;
    });
    const obs=before.reduce((a,b)=>a+b,0);
    const future=after.reduce((a,b)=>a+b,0);
    const ones=before.filter(x=>x===1).length;
    const w=prior**ones*(1-prior)**(n-ones);
    if(!byObserved.has(obs))byObserved.set(obs,new Map());
    const ys=byObserved.get(obs);
    ys.set(future,(ys.get(future)||0)+w);
  }
  let H=0;
  for(const b of byObserved.values()){
    const total=[...b.values()].reduce((a,c)=>a+c,0);
    for(const w of b.values())H-=w*Math.log2(w/total);
  }
  return H;
}
test('all 36 exact weighted/rule configurations agree with independent array oracle',()=>{
  for(const id of ['tetrahedron','octahedron','dodecahedron']){
    const graph=makePolyhedralGraph(id);
    for(const {id:rule} of RULES)for(const prior of PRIORS){
      const fast=exactWeightedKeyhole(graph,{rule,prior});
      const independent=independentOracle(graph,rule,prior);
      assert.ok(Math.abs(fast.conditionalEntropyBits-independent)<1e-11,
        id+' '+rule+' prior='+prior);
      assert.ok(Math.abs(fast.probabilityMass-1)<1e-11);
      assert.ok(Math.abs(fast.distribution.reduce((s,d)=>s+d.weight,0)-1)<1e-11);
    }
  }
});
test('R24 uniform-majority baseline is exactly reproduced without modifying frozen R24 core',()=>{
  for(const id of ['tetrahedron','octahedron','dodecahedron']){
    const graph=makePolyhedralGraph(id);
    const a=exactWeightedKeyhole(graph,{rule:'majority',prior:.5});
    const b=exactKeyholeStudy(graph);
    assert.ok(Math.abs(a.conditionalEntropyBits-b.conditionalEntropyBits)<1e-11);
    for(const mask of [0,1,3,11]){
      assert.equal(stepPocketState(graph,mask,'majority'),nextState(graph,mask));
    }
  }
});
test('identity null rule destroys all predictive uncertainty for every state prior',()=>{
  for(const id of ['tetrahedron','octahedron','dodecahedron']){
    const graph=makePolyhedralGraph(id);
    for(const prior of PRIORS){
      assert.equal(exactWeightedKeyhole(graph,{rule:'identity',prior}).conditionalEntropyBits,0);
    }
  }
});
test('sign-symmetric rules yield identical entropy under p and 1-p',()=>{
  for(const id of ['tetrahedron','octahedron','dodecahedron']){
    const graph=makePolyhedralGraph(id);
    for(const {id:rule} of RULES){
      const one=exactWeightedKeyhole(graph,{rule,prior:.25}).conditionalEntropyBits;
      const other=exactWeightedKeyhole(graph,{rule,prior:.75}).conditionalEntropyBits;
      assert.ok(Math.abs(one-other)<1e-10,rule+' '+id);
    }
  }
});
test('controls preserve n, degree, connectivity, and protocol labels',()=>{
  for(const id of ['tetrahedron','octahedron','dodecahedron']){
    const result=runPoly02({id,rule:'inertia',prior:.25,seed:369,controls:8});
    assert.equal(result.authority,'NONE');
    assert.equal(result.protocol,'POLY-02');
    assert.equal(result.alternatives.length,8);
    assert.equal(result.distinctLabelledControls,new Set(result.alternatives.map(c=>c.graphFingerprint)).size);
    assert.deepEqual(runPoly02({id,rule:'inertia',prior:.25,seed:369,controls:8}),result);
    for(const control of result.alternatives){
      assert.ok(validateGraph(control.graph));
      assert.equal(control.graph.neighbors.length,result.graph.neighbors.length);
      assert.deepEqual(control.graph.neighbors.map(row=>row.length),result.graph.neighbors.map(row=>row.length));
      assert.equal(graphEdges(control.graph).length,graphEdges(result.graph).length);
    }
    if(id==='tetrahedron')assert.equal(result.unchangedControls,8);
  }
});
test('full fixed factorial sweep has exactly 4 rules x 3 priors',()=>{
  const a=poly02Sweep({id:'octahedron',seed:369,controls:2});
  assert.deepEqual(a,poly02Sweep({id:'octahedron',seed:369,controls:2}));
  assert.equal(a.rows.length,12);
  assert.equal(new Set(a.rows.map(r=>r.rule+':'+r.prior)).size,12);
  assert.ok(a.rows.every(r=>Number.isFinite(r.canonicalBits)&&Number.isFinite(r.matchedControlMeanBits)));
});
test('fail closed on malformed rule, prior, seed, control count, or mask',()=>{
  const graph=makePolyhedralGraph('octahedron');
  assert.throws(()=>exactWeightedKeyhole(graph,{rule:'telepathy'}),/Unsupported update rule/);
  assert.throws(()=>exactWeightedKeyhole(graph,{prior:1}),/Prior/);
  assert.throws(()=>exactWeightedKeyhole(graph,{prior:0}),/Prior/);
  assert.throws(()=>stepPocketState(graph,256),/Invalid pocket mask/);
  assert.throws(()=>stepPocketState(graph,2,'unknown'),/Unsupported update rule/);
  assert.throws(()=>runPoly02({id:'octahedron',seed:0}),/Seed/);
  assert.throws(()=>runPoly02({id:'octahedron',controls:17}),/Control count/);
  assert.throws(()=>runPoly02({id:'truncated-icosahedron'}),/Unsupported polyhedron/);
});
