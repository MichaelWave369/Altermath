import test from "node:test";
import assert from "node:assert/strict";
import {createJunctionBridge,junctionMetrics,setPeerEnabled} from "../src/junction-contract.js";
import {
  verifyLocalEvidence,submitLocallyVerified,stepLocallyVerified
} from "../src/verified-interop.js";

const proposal=(id="a")=>({id,from:"mesh",to:"kernel",topic:"summarize",value:0.369,ttl:2});
const make=()=>createJunctionBridge({peers:[
  {id:"mesh",enabled:true,inbound:[],outbound:["kernel"],topics:["summarize"]},
  {id:"kernel",enabled:true,inbound:["mesh"],outbound:[],topics:["summarize"]}
]});
const task={id:"x",capability:"summarize"};
const manifests=[{id:"one"}];
const good=()=>({
  task,manifests,
  route:()=>({schema:"NBGPocketMesh.E0.v1",authority:"NONE",
    task,decision:"ROUTE",receiptSha256:"synthetic"}),
  verifyReceipt:()=>true,
  evaluate:p=>({
    selected_route_key:"mesh:kernel:summarize",authority_change:"NONE",
    evaluation:{route_key:"mesh:kernel:summarize",admissible:true,
      hard_block_reasons:[]}
  })
});
test("injected local provider verifies route, kernel and delivers",()=>{
  const p=proposal();
  const sent=submitLocallyVerified(make(),p,good());
  assert.equal(sent.verification.ok,true);
  const delivered=stepLocallyVerified(sent.bridge,good());
  assert.equal(junctionMetrics(delivered).delivered,1);
});
test("missing trusted provider fails closed",()=>{
  const r=verifyLocalEvidence(proposal(),{task,manifests});
  assert.equal(r.reason,"MISSING_TRUSTED_PROVIDER");
});
test("topic must match task binding",()=>{
  const r=verifyLocalEvidence({...proposal(),topic:"other"},good());
  assert.equal(r.reason,"MISSING_TRUSTED_PROVIDER");
});
test("receipt verifier denial blocks queue",()=>{
  const p=good();p.verifyReceipt=()=>false;
  const r=submitLocallyVerified(make(),proposal(),p);
  assert.equal(r.verification.reason,"MESH_RECEIPT_UNVERIFIED");
  assert.equal(junctionMetrics(r.bridge).accepted,0);
});
test("mesh route denial blocks regardless of PhiKernel",()=>{
  const p=good();p.route=()=>({...good().route(),decision:"REFUSE"});
  assert.equal(verifyLocalEvidence(proposal(),p).reason,"MESH_ROUTE_REFUSED");
});
test("kernel hard denial blocks a positive mesh",()=>{
  const p=good();
  p.evaluate=()=>({selected_route_key:null,authority_change:"NONE",
    evaluation:{route_key:"mesh:kernel:summarize",admissible:false,
      hard_block_reasons:["warrant denied"]}});
  assert.equal(verifyLocalEvidence(proposal(),p).reason,"KERNEL_SELECTION_INVALID");
});
test("kernel selection route mismatch rejected",()=>{
  const p=good();p.evaluate=()=>({selected_route_key:"other",
    authority_change:"NONE",evaluation:{route_key:"other",admissible:true,
      hard_block_reasons:[]}});
  assert.equal(verifyLocalEvidence(proposal(),p).reason,"KERNEL_SELECTION_INVALID");
});
test("kernel authority changes rejected",()=>{
  const p=good();p.evaluate=()=>({selected_route_key:"mesh:kernel:summarize",
    authority_change:"GRANT",evaluation:{route_key:"mesh:kernel:summarize",
      admissible:true,hard_block_reasons:[]}});
  assert.equal(verifyLocalEvidence(proposal(),p).reason,"KERNEL_SELECTION_INVALID");
});
test("provider exception is a hard failure",()=>{
  const p=good();p.route=()=>{throw Error("offline");};
  assert.equal(verifyLocalEvidence(proposal(),p).reason,"VERIFICATION_EXCEPTION");
});
test("policy rechecked before delivery and can revoke",()=>{
  const p=good(), sent=submitLocallyVerified(make(),proposal(),p);
  const denied={...p,evaluate:()=>({selected_route_key:null,authority_change:"NONE",
    evaluation:{route_key:"mesh:kernel:summarize",admissible:false,
      hard_block_reasons:["revoked"]}})};
  const after=stepLocallyVerified(sent.bridge,denied);
  assert.equal(junctionMetrics(after).delivered,0);
  assert.equal(junctionMetrics(after).revoked,1);
});
test("boundary still authoritative with a verified provider",()=>{
  const sent=submitLocallyVerified(make(),proposal(),good());
  const closed=setPeerEnabled(sent.bridge,"kernel",false);
  const after=stepLocallyVerified(closed,good());
  assert.equal(junctionMetrics(after).delivered,0);
});
test("replay remains enforced across verified submissions",()=>{
  const p=proposal(),first=submitLocallyVerified(make(),p,good());
  const replay=submitLocallyVerified(first.bridge,p,good());
  assert.equal(junctionMetrics(replay.bridge).replayed,1);
});
