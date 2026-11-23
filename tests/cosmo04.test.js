import test from 'node:test';
import assert from 'node:assert/strict';
import {
 COSMO04_AUTHORITY,COSMO04_SPLITS,COSMO04_FAMILIES,COSMO04_NODE_COUNT,
 cosmo04Graph,cosmo04Index,cosmo04NestedIndex,cosmo04Oracle,
 cosmo04RawRoute,cosmo04IndexedRoute,cosmo04NestedRoute,cosmo04Case,cosmo04Report
} from '../src/cosmo04.js';

test('registered splits are disjoint by family and full workload',()=>{
  assert.deepEqual(COSMO04_FAMILIES,['chain','ring','star','mesh']);
  assert.deepEqual(COSMO04_SPLITS.train.map(p=>p[0]),['chain','chain','ring','ring']);
  assert.deepEqual(COSMO04_SPLITS.validation.map(p=>p[0]),['star','star']);
  assert.deepEqual(COSMO04_SPLITS.holdout.map(p=>p[0]),['mesh','mesh']);
  assert.equal(COSMO04_NODE_COUNT,16);
  const names=Object.values(COSMO04_SPLITS).flat().map(p=>p.join(':'));
  assert.equal(new Set(names).size,8);
});

test('positive, undirected graph weights, no self edges, symmetric independent oracle',()=>{
  for(const configs of Object.values(COSMO04_SPLITS))for(const [family,seed] of configs){
    const g=cosmo04Graph(family,seed);
    const d=cosmo04Oracle(g);
    assert.equal(g.nodes.length,16);
    const edges=new Set();
    for(const e of g.edges){
      assert.ok(e.u>=0&&e.u<e.v&&e.v<16);
      assert.ok(e.w>=1&&e.w<=9);
      assert.ok(!edges.has(e.u+':'+e.v));edges.add(e.u+':'+e.v);
    }
    for(let s=0;s<16;s++)for(let t=0;t<16;t++){
      assert.equal(d[s][t],d[t][s]);
      assert.ok(Number.isFinite(d[s][t]));
      if(s===t)assert.equal(d[s][t],0);
    }
  }
});

test('all eight networks x 240 ordered routes match independent Floyd-Warshall',()=>{
  for(const configs of Object.values(COSMO04_SPLITS))for(const [family,seed] of configs){
    const g=cosmo04Graph(family,seed),idx=cosmo04Index(g),nested=cosmo04NestedIndex(idx);
    const distance=cosmo04Oracle(g);
    assert.ok(idx.setupWork>0);
    for(let s=0;s<16;s++)for(let t=0;t<16;t++)if(s!==t){
      const raw=cosmo04RawRoute(g,s,t);
      const flat=cosmo04IndexedRoute(idx,s,t);
      const hierarchical=cosmo04NestedRoute(nested,s,t);
      assert.equal(raw.distance,distance[s][t],family+'/'+seed+'/'+s+'/'+t);
      assert.equal(flat.distance,distance[s][t]);
      assert.deepEqual(hierarchical,flat);
    }
  }
});

test('selection uses training and validation graph families, not mesh test',()=>{
  const r=cosmo04Report();
  assert.equal(r.authority,COSMO04_AUTHORITY);
  assert.deepEqual(r.splitDefinitions,COSMO04_SPLITS);
  assert.deepEqual(r.trainingPolicy,{same:'indexed',cross:'indexed'});
  assert.equal(r.validationSelection.winner,'indexed');
  assert.equal(r.validationSelection.candidates.length,3);
  assert.equal(r.holdoutGraphs.length,2);
  assert.ok(r.holdoutGraphs.every(g=>g.family==='mesh'));
  assert.ok(!r.splitDefinitions.train.some(x=>x[0]==='mesh'));
  assert.ok(!r.splitDefinitions.validation.some(x=>x[0]==='mesh'));
});

test('holdout reports unfavorable indexed result and flat/nested work parity',()=>{
  const r=cosmo04Report();
  for(const m of ['raw','indexedFlat','nested','chosenFlat','chosenNested']){
    const x=r.heldout[m];
    assert.equal(x.queries,480);
    assert.equal(x.correct,480);
    assert.equal(x.routeAccuracy,1);
    assert.equal(x.graphs,2);
  }
  assert.deepEqual(r.heldout.indexedFlat,r.heldout.nested);
  assert.deepEqual(r.heldout.chosenFlat,r.heldout.chosenNested);
  assert.deepEqual(r.heldout.indexedFlat,r.heldout.chosenFlat);
  assert.ok(r.heldout.indexedFlat.totalWork>r.heldout.raw.totalWork);
  assert.ok(r.heldout.indexedFlat.indexSetupWork>0);
  assert.equal(r.heldout.raw.indexSetupWork,0);
  assert.ok(r.holdoutGraphs.every(g=>g.nestedJsonBytes>g.flatIndexJsonBytes));
});

test('preprocessing charged once per graph rather than once per query',()=>{
  const r=cosmo04Report();
  assert.equal(r.heldout.indexedFlat.indexSetupWork,
    r.holdoutGraphs.reduce((s,g)=>s+g.setupWork,0));
  assert.equal(r.heldout.raw.queryWork,r.heldout.raw.totalWork);
  assert.equal(r.heldout.indexedFlat.queryWork+r.heldout.indexedFlat.indexSetupWork,
    r.heldout.indexedFlat.totalWork);
  assert.equal(r.heldout.indexedFlat.indexedRequests,480);
  assert.equal(r.heldout.raw.indexedRequests,0);
});

test('single query inspector has matching optimal distances and nested work',()=>{
  for(const family of COSMO04_FAMILIES){
    const x=cosmo04Case(family,29,0,15);
    assert.equal(x.raw.distance,x.flatIndexed.distance);
    assert.deepEqual(x.flatIndexed,x.nested);
    assert.ok(x.setupWork>0);
  }
  assert.deepEqual(cosmo04Report(),cosmo04Report());
});

test('invalid family, seed, endpoints and index rejected',()=>{
  assert.throws(()=>cosmo04Graph('wormhole'),TypeError);
  assert.throws(()=>cosmo04Graph('mesh',-1),RangeError);
  assert.throws(()=>cosmo04Graph('mesh',1.5),RangeError);
  const graph=cosmo04Graph('mesh',23),index=cosmo04Index(graph);
  assert.throws(()=>cosmo04RawRoute(graph,-1,4),RangeError);
  assert.throws(()=>cosmo04IndexedRoute(index,16,0),RangeError);
  assert.throws(()=>cosmo04NestedRoute({},0,1),TypeError);
  assert.throws(()=>cosmo04Index(null),TypeError);
});
