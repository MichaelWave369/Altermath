// Deterministic E7 graph census and targeted transaction receipt.
import { BranchMesh, study } from '../src/rm369-branch-mesh.mjs';

const mesh = new BranchMesh(7, 3);
const state = mesh.stateDigest();
const request = { expected_sha256: state, start: 1, target: 2, node: 10, gear: 1, budget: 3 };
const grant = { state_sha256: state, start: 1, target: 2, node: 10, gear: 1,
  max_budget: 3, allowed: mesh.graph().nodes.map(n => n.id), disabled: ['1:2'] };
const receipt = mesh.execute(request, grant);
console.log(JSON.stringify({
  schema: 'rm369/e7-study', evidence: 'SIMULATED', authority: 'NONE',
  comparisons: study(7), transaction: receipt,
}, null, 2));
