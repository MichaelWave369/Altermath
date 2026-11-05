import test from 'node:test';
import assert from 'node:assert/strict';
import {METHODS,decodeGraph,encodeGraph,isomorphic,makeTrials,runStudy,signature} from '../src/invariantDiscovery.js';

test('the same structure survives three distinct encodings and vertex relabeling',()=>{
  const trials=makeTrials(369);
  for(const trial of trials.filter(t=>t.oracleSame)){
    assert.notEqual(trial.left.kind,trial.right.kind);
    assert.equal(isomorphic(trial.left,trial.right),true);
    for(const method of METHODS)assert.equal(signature(trial.left,method.id),signature(trial.right,method.id));
  }
});
test('negative controls show misleading lower-order invariants',()=>{
  const trials=makeTrials(369);
  const negative=trials.filter(t=>!t.oracleSame);
  assert.equal(negative.length,4);
  assert.equal(negative.filter(t=>signature(t.left,'edge-count')===signature(t.right,'edge-count')).length,4);
  assert.equal(negative.filter(t=>signature(t.left,'degree')===signature(t.right,'degree')).length,3);
  assert.equal(negative.filter(t=>signature(t.left,'triangles')===signature(t.right,'triangles')).length,1);
  assert.equal(negative.filter(t=>signature(t.left,'four-cycles')===signature(t.right,'four-cycles')).length,0);
});
test('holdout is disjoint, deterministic, preserves negative results',()=>{
  const a=runStudy({seed:369,trainSeeds:3,holdoutSeeds:6});
  const b=runStudy({seed:369,trainSeeds:3,holdoutSeeds:6});
  assert.deepEqual(a,b);
  assert.equal(a.training.size,24);
  assert.equal(a.holdout.size,48);
  assert.equal(a.selectedByTraining,'four-cycles');
  assert.equal(a.holdout.metrics.find(m=>m.method==='four-cycles').falsePositive,0);
  assert.equal(a.holdout.metrics.find(m=>m.method==='triangles').falsePositive,6);
  assert.equal(new Set([...a.trainSeeds,...a.holdoutSeeds]).size,9);
});
test('untrusted malformed graph views fail closed',()=>{
  const base=makeTrials(2)[0].left;
  assert.throws(()=>decodeGraph({kind:'edges',n:3,edges:[[0,0]]}),/Self loops/);
  assert.throws(()=>decodeGraph({kind:'edges',n:3,edges:[[0,1],[1,0]]}),/Duplicate/);
  assert.throws(()=>decodeGraph({kind:'matrix',n:2,matrix:[[0,1],[0,0]]}),/Asymmetric/);
  assert.throws(()=>decodeGraph({kind:'neighbors',n:2,neighbors:[[1],[]]}),/Asymmetric/);
  assert.throws(()=>decodeGraph({kind:'edges',n:9,edges:[]}),/vertex count/);
  assert.throws(()=>runStudy({seed:369,trainSeeds:0}),/training seed count/);
  assert.throws(()=>signature(base,'invented-method'),/Unknown method/);
});
test('isomorphism is symmetric, and exactly identifies the intended cases',()=>{
  for(const seed of [1,369,10369,9999])for(const trial of makeTrials(seed)){
    assert.equal(isomorphic(trial.left,trial.right),trial.oracleSame);
    assert.equal(isomorphic(trial.right,trial.left),trial.oracleSame);
  }
});
