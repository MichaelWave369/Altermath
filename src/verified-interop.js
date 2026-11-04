/**
 * Local verified-adapter composition. Never treats a mesh routing receipt as
 * authority. The caller must provide TRUSTED local source functions and a
 * trusted PhiKernel evaluation provider; raw JSON supplied over a network is
 * not acceptable production authorization evidence.
 */
import {
  fromNBGPocketMeshE0, fromPhiKernelEvaluation, routeKey,
  proposeJunction, stepJunctionBridge
} from "./junction-contract.js";

const failure = reason => ({ok:false,reason,evidence:null});

export function verifyLocalEvidence(proposal, {task,manifests,route,verifyReceipt,evaluate}={}) {
  // Fail closed on absent runtimes, mismatched task bindings, exceptions, and
  // malformed or contradictory assessment data.
  try {
    if (!proposal || !task || task.capability !== proposal.topic ||
        !Array.isArray(manifests) || typeof route!=="function" ||
        typeof verifyReceipt!=="function" || typeof evaluate!=="function")
      return failure("MISSING_TRUSTED_PROVIDER");
    const receipt=route(task,manifests);
    if (verifyReceipt(receipt,task,manifests)!==true)
      return failure("MESH_RECEIPT_UNVERIFIED");
    const mesh=fromNBGPocketMeshE0(receipt);
    if (!mesh.routed) return failure("MESH_ROUTE_REFUSED");
    const assessment=evaluate(proposal);
    if (!assessment || assessment.authority_change!=="NONE" ||
        assessment.selected_route_key!==routeKey(proposal) ||
        !assessment.evaluation)
      return failure("KERNEL_SELECTION_INVALID");
    const kernel=fromPhiKernelEvaluation(assessment.evaluation);
    if (kernel.routeKey!==routeKey(proposal) || !kernel.admissible)
      return failure("KERNEL_HARD_DENIAL");
    return {ok:true,reason:"LOCALLY_VERIFIED",evidence:{mesh,kernel}};
  } catch {
    return failure("VERIFICATION_EXCEPTION");
  }
}

export function submitLocallyVerified(bridge,proposal,providers) {
  const verification=verifyLocalEvidence(proposal,providers);
  // Preserve replay protection and the existing bridge event accounting.
  // Rejected verification cannot be transformed into a route grant.
  const next=proposeJunction(bridge,proposal,verification.ok?verification.evidence:{});
  return {bridge:next,verification};
}

export function stepLocallyVerified(bridge,providers,{limit=1}={}) {
  return stepJunctionBridge(bridge,{limit,
    authorizeDelivery:message=>verifyLocalEvidence(message,providers).ok});
}
