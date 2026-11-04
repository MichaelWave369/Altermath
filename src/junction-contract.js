/**
 * Altermath Junction Contract v1. Deterministic, local, simulation-only.
 *
 * A routing recommendation never grants authority. PhiKernel hard admissibility
 * and this bridge's own boundary checks must both permit a message.
 * No network I/O, execution, signatures, remote access, or secrets.
 */
export const JUNCTION_SCHEMA = "Altermath.Junction.v1";
export const NBG_SCHEMA = "NBGPocketMesh.E0.v1";
const token = value => typeof value === "string" && /^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/.test(value);
const list = value => Array.isArray(value) && value.every(token) && new Set(value).size === value.length;
const has = (arr, value) => arr.includes(value);
const positiveInt = n => Number.isSafeInteger(n) && n >= 1;
const finiteSignal = n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;

function validatePeer(input) {
  if (!input || !token(input.id) || !list(input.inbound) || !list(input.outbound) ||
    !list(input.topics) || typeof input.enabled !== "boolean") {
    throw new TypeError("Invalid peer contract: explicit id, inbound, outbound, topics and enabled required");
  }
  return {id:input.id, inbound:[...input.inbound], outbound:[...input.outbound],
    topics:[...input.topics],enabled:input.enabled};
}

export function createJunctionBridge({peers,maxQueue=8,maxEvents=60}={}) {
  if (!Array.isArray(peers) || peers.length<2 || peers.length>32 ||
      !positiveInt(maxQueue) || maxQueue>1000 || !positiveInt(maxEvents) || maxEvents>1000)
    throw new TypeError("Invalid bridge configuration");
  const clean=peers.map(validatePeer);
  if (new Set(clean.map(p=>p.id)).size!==clean.length) throw new TypeError("Duplicate peer ID");
  return {
    schema:JUNCTION_SCHEMA, peers:clean, queue:[], delivered:[], seen:[],
    events:[],tick:0,maxQueue,maxEvents,
    counters:{accepted:0,delivered:0,denied:0,replayed:0,expired:0,revoked:0,overflow:0}
  };
}

/** Adapter for PhiKernel CandidateFieldEvaluation.to_record / dataclass serialization.
 * Hard blocks take precedence even if a misconfigured caller sets admissible=true.
 * This is a local representation, not an authenticated PhiKernel service response.
 */
export function fromPhiKernelEvaluation(candidate) {
  if (!candidate || typeof candidate.admissible!=="boolean" ||
      !token(candidate.route_key) && !(typeof candidate.route_key==="string" && /^[A-Za-z][A-Za-z0-9_.:-]{1,191}$/.test(candidate.route_key)) ||
      !Array.isArray(candidate.hard_block_reasons) ||
      !candidate.hard_block_reasons.every(x=>typeof x==="string"))
    throw new TypeError("Invalid PhiKernel route evaluation");
  const hardBlocks=[...candidate.hard_block_reasons];
  return {source:"PhiKernel.CandidateFieldEvaluation",routeKey:candidate.route_key,
    admissible:candidate.admissible && hardBlocks.length===0,hardBlocks};
}

/** Advisory-only interpretation of NBGPocketMesh E0, which explicitly sets authority NONE.
 * This does not verify receipt hashes. A future real adapter MUST call verifyReceipt
 * in the owning NBGPocketMesh runtime before trusting route information.
 */
export function fromNBGPocketMeshE0(receipt) {
  if (!receipt || receipt.schema!==NBG_SCHEMA || receipt.authority!=="NONE" ||
      !["ROUTE","REFUSE"].includes(receipt.decision) ||
      !receipt.task || !token(receipt.task.capability))
    throw new TypeError("Invalid NBGPocketMesh E0 route receipt");
  return {source:NBG_SCHEMA,topic:receipt.task.capability,
    routed:receipt.decision==="ROUTE",advisoryOnly:true};
}

export const routeKey = ({from,to,topic}) => [from,to,topic].join(":");

function note(bridge,kind,id,reason) {
  const event={tick:bridge.tick,kind,id,reason};
  return {...bridge,events:[event,...bridge.events].slice(0,bridge.maxEvents)};
}
function denied(bridge,id,reason,metric="denied") {
  const n=note(bridge,"denied",id,reason);
  return {...n,counters:{...n.counters,[metric]:n.counters[metric]+1}};
}
function authorizedPeer(bridge,m) {
  const a=bridge.peers.find(p=>p.id===m.from), b=bridge.peers.find(p=>p.id===m.to);
  return Boolean(a && b && a.enabled && b.enabled && has(a.outbound,b.id) &&
    has(b.inbound,a.id) && has(a.topics,m.topic) && has(b.topics,m.topic));
}

export function proposeJunction(bridge,proposal,{kernel,mesh}={}) {
  if (!proposal || !token(proposal.id) || !token(proposal.from) ||
      !token(proposal.to) || proposal.from===proposal.to ||
      !token(proposal.topic) || !finiteSignal(proposal.value) ||
      !positiveInt(proposal.ttl) || proposal.ttl>100)
    throw new TypeError("Invalid scalar-only junction proposal");
  if (bridge.seen.includes(proposal.id)) return denied(bridge,proposal.id,"REPLAY","replayed");
  // Reserve IDs even for refused proposals so a replay can't become a fresh grant.
  let next={...bridge,seen:[...bridge.seen,proposal.id]};
  if (!kernel || kernel.source!=="PhiKernel.CandidateFieldEvaluation" ||
      kernel.routeKey!==routeKey(proposal) || kernel.admissible!==true ||
      !Array.isArray(kernel.hardBlocks) || kernel.hardBlocks.length>0)
    return denied(next,proposal.id,"HARD_ADMISSIBILITY");
  if (!mesh || mesh.source!==NBG_SCHEMA || mesh.advisoryOnly!==true ||
      mesh.topic!==proposal.topic || mesh.routed!==true)
    return denied(next,proposal.id,"MESH_ROUTE_UNAVAILABLE");
  if (!authorizedPeer(next,proposal)) return denied(next,proposal.id,"BOUNDARY_DENIED");
  if (next.queue.length>=next.maxQueue) return denied(next,proposal.id,"QUEUE_FULL","overflow");
  const item={id:proposal.id,from:proposal.from,to:proposal.to,topic:proposal.topic,
    value:proposal.value,issuedAt:next.tick,expiresAt:next.tick+proposal.ttl};
  next={...next,queue:[...next.queue,item],
    counters:{...next.counters,accepted:next.counters.accepted+1}};
  return note(next,"accepted",proposal.id,"JUNCTION_QUEUED");
}

export function setPeerEnabled(bridge,peerId,enabled) {
  if (!token(peerId) || !bridge.peers.some(p=>p.id===peerId) ||
      typeof enabled!=="boolean") throw new TypeError("Invalid peer gate");
  return {...bridge,peers:bridge.peers.map(p=>p.id===peerId?{...p,enabled}:p)};
}

export function stepJunctionBridge(bridge,{limit=1,authorizeDelivery=null}={}) {
  if (!positiveInt(limit) || limit>1000) throw new TypeError("Invalid delivery limit");
  if (authorizeDelivery !== null && typeof authorizeDelivery !== "function")
    throw new TypeError("Invalid delivery authorizer");
  let next={...bridge,tick:bridge.tick+1,queue:[],delivered:[...bridge.delivered]};
  let served=0;
  for (const m of bridge.queue) {
    if (next.tick>m.expiresAt) {
      next=denied(next,m.id,"EXPIRED","expired");
    } else if (!authorizedPeer(next,m)) {
      next=denied(next,m.id,"BOUNDARY_REVOKED","revoked");
    } else if (served>=limit) {
      next.queue.push(m);
    } else {
      let stillAuthorized=true;
      if (authorizeDelivery !== null) {
        try { stillAuthorized=authorizeDelivery(m) === true; }
        catch { stillAuthorized=false; }
      }
      if (!stillAuthorized) {
        next=denied(next,m.id,"AUTHORIZATION_REVOKED","revoked");
        continue;
      }
      served++;
      next.delivered.push({...m,deliveredAt:next.tick});
      next={...next,counters:{...next.counters,delivered:next.counters.delivered+1}};
      next=note(next,"delivered",m.id,"JUNCTION_COMPLETE");
    }
  }
  return next;
}

export function junctionMetrics(bridge) {
  return {...bridge.counters,tick:bridge.tick,queued:bridge.queue.length,
    totalMessages:bridge.seen.length,peersEnabled:bridge.peers.filter(p=>p.enabled).length};
}

export function createJunctionDemo() {
  return createJunctionBridge({peers:[
    {id:"mesh",enabled:true,inbound:[],outbound:["kernel"],topics:["signal"]},
    {id:"kernel",enabled:true,inbound:["mesh"],outbound:["brain"],topics:["signal"]},
    {id:"brain",enabled:true,inbound:["kernel"],outbound:[],topics:["signal"]}
  ],maxQueue:4});
}

/** Explicit local mock data, NOT actual connected-service attestation. */
export function demoEvidence(proposal,{admissible=true,routed=true}={}) {
  return {
    kernel:fromPhiKernelEvaluation({route_key:routeKey(proposal),admissible,
      hard_block_reasons:admissible?[]:["simulated policy denial"]}),
    mesh:fromNBGPocketMeshE0({schema:NBG_SCHEMA,authority:"NONE",
      task:{capability:proposal.topic},decision:routed?"ROUTE":"REFUSE"})
  };
}
