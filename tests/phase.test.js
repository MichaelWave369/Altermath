import test from 'node:test';
import assert from 'node:assert/strict';
import {NODE_COUNT,EDGE_COUNT,createTopology,connected,degreeSequence,layerEdges,inDifferentBubble} from '../src/phase-geometry.js';
import {createPhaseWorld,phaseOrder,phaseMetrics,activeEdges,stepPhase,setGate,setCoupling,benchmark} from '../src/phase-network.js';

test('Q4 tesseract is 16 vertices, 32 edges and degree 4',()=>{
  const q=createTopology('tesseract');
  assert.equal(NODE_COUNT,16);assert.equal(q.edges.length,EDGE_COUNT);
  assert.ok(degreeSequence(q).every(d=>d===4));
  assert.equal(layerEdges(q).length,8);
  for(const [a,b] of q.edges) assert.equal(((a^b).toString(2).match(/1/g)||[]).length,1);
});
test('all comparison graphs have same size, degree sequence and connectivity',()=>{
  for(const name of ['tesseract','circulant','rewired']){
    const graph=createTopology(name,369);
    assert.equal(graph.edges.length,32);
    assert.ok(degreeSequence(graph).every(d=>d===4));
    assert.equal(new Set(graph.edges.map(x=>x.join(':'))).size,32);
    assert.ok(connected(graph.edges));
  }
});
test('rewiring is deterministic given a seed',()=>{
  assert.deepEqual(createTopology('rewired',369),createTopology('rewired',369));
});
test('hypercube boundary switches eight edges off and on',()=>{
  const shut=createPhaseWorld({gate:false});
  assert.equal(activeEdges(shut).length,24);
  assert.equal(phaseMetrics(shut).interEdges,0);
  const open=setGate(shut,true);
  assert.equal(activeEdges(open).length,32);
  assert.equal(phaseMetrics(open).interEdges,8);
  assert.equal(open.events[0].type,'junctions-authorized');
  assert.equal(setGate(open,false).events[0].type,'horos-boundary-closed');
});
test('junctions only carry phase effects when authorized',()=>{
  let closed=createPhaseWorld({gate:false,spread:0});
  let opened=setGate(closed,true);
  closed=stepPhase(closed); opened=stepPhase(opened);
  assert.equal(closed.lastCrossTransfer,0);
  assert.ok(opened.lastCrossTransfer>0);
  assert.ok(opened.transfer>0);
});
test('identical phases have perfect global order',()=>{
  assert.ok(Math.abs(phaseOrder(Array(16).fill(Math.PI/3))-1)<1e-12);
});
test('opposed equal phase groups have near-zero global order',()=>{
  assert.ok(phaseOrder([...Array(8).fill(0),...Array(8).fill(Math.PI)])<1e-10);
});
test('oscillator values stay finite and in [0,2pi)',()=>{
  let w=createPhaseWorld({topology:'rewired',gate:true,seed:3});
  for(let i=0;i<500;i++)w=stepPhase(w);
  assert.equal(w.tick,500);
  assert.ok(w.phases.every(x=>Number.isFinite(x) && x>=0 && x<Math.PI*2));
  assert.ok(phaseMetrics(w).order<=1+1e-12);
});
test('initial conditions are identical across networks',()=>{
  const a=createPhaseWorld({topology:'tesseract',seed:369});
  const b=createPhaseWorld({topology:'circulant',seed:369});
  assert.deepEqual(a.phases,b.phases);
  assert.deepEqual(a.frequencies,b.frequencies);
});
test('phase parameters are validated',()=>{
  assert.throws(()=>createTopology('fake'),/Unknown topology/);
  assert.throws(()=>createPhaseWorld({coupling:-1}),/Coupling/);
  assert.throws(()=>createPhaseWorld({dt:1}),/Time step/);
  assert.throws(()=>setCoupling(createPhaseWorld(),11),/Coupling/);
  assert.throws(()=>benchmark({faultAt:90,repairAt:50}),/schedule/);
});
test('comparison is deterministic and has matched budgets',()=>{
  const a=benchmark({seed:369,steps:120,faultAt:20,repairAt:45});
  const b=benchmark({seed:369,steps:120,faultAt:20,repairAt:45});
  assert.deepEqual(a,b);
  assert.equal(a.length,3);
  assert.ok(a.every(x=>x.edges===32 && x.degrees.every(d=>d===4)));
  assert.equal(a[0].initialOrder,a[1].initialOrder);
});
