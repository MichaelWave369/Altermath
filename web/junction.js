import {createJunctionDemo,proposeJunction,demoEvidence,stepJunctionBridge,
  setPeerEnabled,junctionMetrics} from "../src/junction-contract.js";
const $ = id => document.getElementById(id);
let world=createJunctionDemo(),id=0,denyPolicy=false;
function draw() {
  const m=junctionMetrics(world);
  for (const key of ["accepted","delivered","denied","expired","revoked","queued"]) $(key).textContent=String(m[key]);
  const gate=world.peers.find(p=>p.id==="kernel").enabled;
  $("gate").textContent=gate?"Revoke kernel boundary":"Restore kernel boundary";
  $("diagram-status").textContent=gate?"Boundary: OPEN":"Boundary: REVOKED";
  $("policy").textContent=denyPolicy?"Policy: deny":"Policy: allow";
  $("trace").textContent=world.events.slice(0,35).map(e=>
    "#"+e.tick+" "+e.kind+" "+e.id+" "+e.reason).join("\n")||"No junction events yet.";
}
$("submit").addEventListener("click",()=>{
  const p={id:"message"+(++id),from:"mesh",to:"kernel",topic:"signal",value:(id%10)/10,ttl:2};
  world=proposeJunction(world,p,demoEvidence(p,{admissible:!denyPolicy}));
  draw();
});
$("deliver").addEventListener("click",()=>{world=stepJunctionBridge(world);draw()});
$("gate").addEventListener("click",()=>{
  const isOpen=world.peers.find(p=>p.id==="kernel").enabled;
  world=setPeerEnabled(world,"kernel",!isOpen);draw();
});
$("policy").addEventListener("click",()=>{denyPolicy=!denyPolicy;draw()});
$("reset").addEventListener("click",()=>{id=0;denyPolicy=false;world=createJunctionDemo();draw()});
draw();
