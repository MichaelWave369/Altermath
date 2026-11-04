import test from 'node:test';
import assert from 'node:assert/strict';
import {GROUPS,activeLinks,buildTopology,createWorld,disturb,metrics,setGain,setGate,stepWorld,coherence} from '../src/model.js';

test('3-6-9 topology has 18 conceptual nodes',()=>{
  const t=buildTopology();
  assert.deepEqual(GROUPS.map(g=>g.count),[3,6,9]);
  assert.equal(t.nodes.length,18);
  assert.equal(new Set(t.nodes.map(n=>n.id)).size,18);
});
test('edges never duplicate or self-link',()=>{
  const t=buildTopology();
  assert.ok(t.links.length>20);
  assert.equal(new Set(t.links.map(e=>e.id)).size,t.links.length);
  for(const e of t.links)assert.notEqual(e.a,e.b);
});
test('Horos gate removes all cross-layer junctions',()=>{
  const initial=createWorld();
  const closed=setGate(initial,false);
  assert.equal(activeLinks(closed).some(e=>e.cross),false);
  assert.ok(metrics(initial).junctions>0);
  assert.equal(metrics(closed).junctions,0);
});
test('same seed yields deterministic evolution',()=>{
  let a=createWorld(369),b=createWorld(369);
  assert.deepEqual(a,b);
  for(let i=0;i<30;i++){a=stepWorld(a);b=stepWorld(b);}
  assert.deepEqual(a,b);
});
test('order parameter stays within [0,1]',()=>{
  let w=createWorld();
  for(let i=0;i<1200;i++){
    w=stepWorld(w);
    assert.ok(coherence(w.phases)>=0 && coherence(w.phases)<=1.0000000001);
  }
});
test('boundary closure retains ring edges',()=>{
  const w=setGate(createWorld(),false);
  assert.equal(activeLinks(w).length,3+6+9);
});
test('disturbance changes selected layer only',()=>{
  const before=createWorld(),after=disturb(before,6);
  for(const n of before.nodes){
    if(n.group===6) assert.notEqual(before.phases[n.id],after.phases[n.id]);
    else assert.equal(before.phases[n.id],after.phases[n.id]);
  }
  assert.equal(after.events[0].type,'FAULT');
});
test('invalid gain rejected and zero allowed',()=>{
  assert.throws(()=>setGain(createWorld(),-1),RangeError);
  assert.throws(()=>setGain(createWorld(),NaN),RangeError);
  assert.equal(setGain(createWorld(),0).gain,0);
});
test('closed gate does not mutate node count or corrupt phases',()=>{
  let w=setGate(createWorld(),false);
  for(let i=0;i<100;i++)w=stepWorld(w);
  assert.equal(w.nodes.length,18);
  assert.ok(w.phases.every(Number.isFinite));
  assert.equal(w.tick,100);
});
test('event log remains bounded',()=>{
  const initial=createWorld(); let changed=initial;
  for(let i=0;i<30;i++)changed=setGate(changed,i%2===0);
  assert.ok(changed.events.length<=16);
  assert.equal(initial.events.length,1);
});
