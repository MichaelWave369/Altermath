import test from "node:test";
import assert from "node:assert/strict";
import {createJunctionBridge,createJunctionDemo,demoEvidence,proposeJunction,
  stepJunctionBridge,fromNBGPocketMeshE0,fromPhiKernelEvaluation,
  setPeerEnabled,junctionMetrics,routeKey} from "../src/junction-contract.js";

const m=(id,change={})=>({id,from:"mesh",to:"kernel",topic:"signal",value:0.6,ttl:2,...change});
const send=(w,p,opts)=>proposeJunction(w,p,demoEvidence(p,opts));

test("Rung 4 demo declares three bounded peers",()=>{
  const w=createJunctionDemo();
  assert.equal(w.peers.length,3);
  assert.equal(junctionMetrics(w).queued,0);
});
test("valid signed-off mock envelope queues, then delivers",()=>{
  let w=send(createJunctionDemo(),m("a"));
  assert.equal(junctionMetrics(w).accepted,1);
  assert.equal(w.delivered.length,0);
  w=stepJunctionBridge(w);
  assert.equal(w.delivered.length,1);
  assert.equal(w.delivered[0].value,0.6);
  assert.equal(junctionMetrics(w).queued,0);
});
test("hard admissibility failure rejects even if mesh routes",()=>{
  const w=send(createJunctionDemo(),m("a"),{admissible:false});
  assert.equal(w.queue.length,0);
  assert.equal(w.events[0].reason,"HARD_ADMISSIBILITY");
});
test("mesh route is advisory, refusal blocks, no mesh cannot grant",()=>{
  const p=m("a");
  let w=send(createJunctionDemo(),p,{routed:false});
  assert.equal(w.events[0].reason,"MESH_ROUTE_UNAVAILABLE");
  w=proposeJunction(createJunctionDemo(),p,{kernel:demoEvidence(p).kernel});
  assert.equal(w.queue.length,0);
});
test("kernel cannot be bypassed by forging permissive mesh record",()=>{
  const p=m("x");
  const e=demoEvidence(p);
  const w=proposeJunction(createJunctionDemo(),p,{mesh:e.mesh});
  assert.equal(w.events[0].reason,"HARD_ADMISSIBILITY");
});
test("wrong route key, blocked reasons and wrong topics fail closed",()=>{
  const p=m("a");const e=demoEvidence(p);
  const w=proposeJunction(createJunctionDemo(),p,{
    kernel:{...e.kernel,routeKey:"another-route"},mesh:e.mesh});
  assert.equal(w.events[0].reason,"HARD_ADMISSIBILITY");
  const denied=fromPhiKernelEvaluation({route_key:routeKey(p),admissible:true,
    hard_block_reasons:["human veto"]});
  assert.equal(denied.admissible,false);
  assert.equal(send(createJunctionDemo(),m("b",{topic:"wrong"})).events[0].reason,"BOUNDARY_DENIED");
});
test("replay IDs are reserved including denied attempt",()=>{
  let w=send(createJunctionDemo(),m("a"),{admissible:false});
  w=send(w,m("a"));
  assert.equal(w.counters.replayed,1);
  assert.equal(w.queue.length,0);
});
test("queue bound enforced and overflow measured",()=>{
  let w=createJunctionDemo();
  for(let i=0;i<5;i++)w=send(w,m("id"+i));
  assert.equal(w.queue.length,4);
  assert.equal(w.counters.overflow,1);
});
test("revocation after enqueue prevents delivery",()=>{
  let w=send(createJunctionDemo(),m("a"));
  w=setPeerEnabled(w,"kernel",false);
  w=stepJunctionBridge(w);
  assert.equal(w.delivered.length,0);
  assert.equal(w.counters.revoked,1);
});
test("queued messages expire when processing is backlogged",()=>{
  let w=createJunctionDemo();
  w=send(w,m("first",{ttl:1}));
  w=send(w,m("second",{ttl:1}));
  w=stepJunctionBridge(w,{limit:1});
  assert.equal(w.delivered.length,1);
  w=stepJunctionBridge(w);
  assert.equal(w.counters.expired,1);
});
test("reverse direction is not implicitly permitted",()=>{
  const p={id:"back",from:"kernel",to:"mesh",topic:"signal",value:0.1,ttl:2};
  assert.equal(proposeJunction(createJunctionDemo(),p,demoEvidence(p)).events[0].reason,"BOUNDARY_DENIED");
});
test("scalars validated; malformed adapter data rejected",()=>{
  assert.throws(()=>send(createJunctionDemo(),m("bad",{value:Infinity})),/Invalid scalar/);
  assert.throws(()=>send(createJunctionDemo(),m("bad",{ttl:0})),/Invalid scalar/);
  assert.throws(()=>createJunctionBridge({peers:[
    {id:"p",enabled:true,inbound:[],outbound:[],topics:[]},
    {id:"p",enabled:true,inbound:[],outbound:[],topics:[]}
  ]}),/Duplicate/);
  assert.throws(()=>fromNBGPocketMeshE0({schema:"bad",authority:"NONE",decision:"ROUTE",task:{capability:"signal"}}),/Invalid/);
});
test("same scripted sequence produces identical events and counters",()=>{
  const run=()=>{
    let w=createJunctionDemo();
    w=send(w,m("a"));
    w=send(w,m("b",{value:0.2}));
    w=stepJunctionBridge(w);
    w=stepJunctionBridge(w);
    return w;
  };
  assert.deepEqual(run(),run());
});
