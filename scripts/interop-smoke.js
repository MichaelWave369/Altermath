/**
 * Optional actual source integration: uses NBGPocketMesh's route + verifyReceipt
 * and PhiKernel's route_relational through a local Python subprocess.
 * NO production actions, network I/O, user warrants, or remote permissions.
 *
 * MESH_ROOT=/path/NBGPocketMesh KERNEL_ROOT=/path/PhiKernel npm run interop:smoke
 */
import {spawnSync} from "node:child_process";
import {existsSync} from "node:fs";
import {fileURLToPath,pathToFileURL} from "node:url";
import {dirname,resolve,join} from "node:path";
import {
  createJunctionBridge, routeKey, setPeerEnabled, junctionMetrics
} from "../src/junction-contract.js";
import {submitLocallyVerified,stepLocallyVerified,verifyLocalEvidence} from "../src/verified-interop.js";

const here=dirname(fileURLToPath(import.meta.url));
const project=resolve(here,"..");
const meshRoot=resolve(process.env.MESH_ROOT || resolve(project,"../NBGPocketMesh"));
const kernelRoot=resolve(process.env.KERNEL_ROOT || resolve(project,"../PhiKernel"));
const required=[join(meshRoot,"src/router.mjs"),join(meshRoot,"src/fixtures.mjs"),
  join(kernelRoot,"src/phikernel/relational_router.py")];
if(required.some(f=>!existsSync(f))) {
  console.error("Missing adjacent NBGPocketMesh/PhiKernel checkouts. Set MESH_ROOT and KERNEL_ROOT.");
  process.exitCode=2;
} else {
  try {
    const mesh=await import(pathToFileURL(join(meshRoot,"src/router.mjs")).href);
    const fixtures=await import(pathToFileURL(join(meshRoot,"src/fixtures.mjs")).href);
    const task=structuredClone(fixtures.TASK);
    const manifests=structuredClone(fixtures.MANIFESTS);
    const proposal={id:"verified1",from:"mesh",to:"kernel",
      topic:"summarize",value:0.369,ttl:3};
    if(task.capability!==proposal.topic) throw new Error("Fixture capability drift");
    const evaluate=(p,mode="allow")=>{
      const child=spawnSync(process.env.PYTHON_BIN||"python3",[
        join(here,"evaluate-phikernel.py"),kernelRoot,routeKey(p),mode
      ],{cwd:project,encoding:"utf8",timeout:10000,maxBuffer:1024*256});
      if(child.error || child.status!==0) throw new Error(
        "PhiKernel unavailable: "+(child.stderr||child.error?.message||child.status));
      return JSON.parse(child.stdout);
    };
    const providers={task,manifests,
      route:mesh.route,verifyReceipt:mesh.verifyReceipt,
      evaluate:p=>evaluate(p)};
    const make=()=>createJunctionBridge({peers:[
      {id:"mesh",enabled:true,inbound:[],outbound:["kernel"],topics:["summarize"]},
      {id:"kernel",enabled:true,inbound:["mesh"],outbound:[],topics:["summarize"]}
    ]});
    let bridge=make();
    const first=submitLocallyVerified(bridge,proposal,providers);
    if(!first.verification.ok) throw new Error("real source check denied: "+first.verification.reason);
    bridge=stepLocallyVerified(first.bridge,providers);
    if(junctionMetrics(bridge).delivered!==1)
      throw new Error("verified source path did not deliver");

    const deny=verifyLocalEvidence({...proposal,id:"denied"},{
      ...providers,evaluate:p=>evaluate(p,"deny")
    });
    if(deny.ok || deny.reason!=="KERNEL_SELECTION_INVALID")
      throw new Error("denied warrant was not rejected");

    // A genuine mesh receipt that has been tampered with must fail comparison
    // to its original task/manifest set before any junction can be proposed.
    const tampered=verifyLocalEvidence({...proposal,id:"tampered"},{
      ...providers,route:(t,m)=>({...mesh.route(t,m),manifestDigest:"tampered"})
    });
    if(tampered.ok || tampered.reason!=="MESH_RECEIPT_UNVERIFIED")
      throw new Error("tampered mesh receipt was accepted");

    const later={...proposal,id:"revoked"};
    let queued=submitLocallyVerified(make(),later,providers);
    if(!queued.verification.ok) throw new Error("revoke preparation failed");
    let pending=setPeerEnabled(queued.bridge,"kernel",false);
    pending=stepLocallyVerified(pending,providers);
    if(junctionMetrics(pending).delivered!==0 || junctionMetrics(pending).revoked!==1)
      throw new Error("closed boundary allowed delivery");

    const midflight={...proposal,id:"midflight"};
    queued=submitLocallyVerified(make(),midflight,providers);
    let changed=stepLocallyVerified(queued.bridge,{
      ...providers,evaluate:p=>evaluate(p,"deny")
    });
    if(junctionMetrics(changed).delivered!==0 || junctionMetrics(changed).revoked!==1)
      throw new Error("hard policy revocation was not enforced at delivery");
    console.log(JSON.stringify({
      status:"PASS",mode:"OFFLINE_REAL_SOURCE_SIMULATION",
      sources:["NBGPocketMesh.E0.v1 route + verifyReceipt","PhiKernel route_relational"],
      accepted:junctionMetrics(bridge).accepted,
      delivered:junctionMetrics(bridge).delivered,
      tamperedReceiptDenied:true,deniedWarrantDenied:true,
      boundaryRevocationDenied:true,policyRecheckDenied:true
    },null,2));
  } catch(e) {
    console.error(e instanceof Error?e.message:String(e));
    process.exitCode=1;
  }
}
