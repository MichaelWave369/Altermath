# Rung 5: Verified Local Interoperability

**Status:** Real **local source function** calls with synthetic demo routing and an ephemeral synthetic PhiKernel warrant. Not a production trust boundary, signed authority system, or live PhiOS integration.

## Why this rung exists

- NBGPocketMesh exports \`route(task, manifests)\` and \`verifyReceipt(receipt,task,manifests)\` from its E0 source module.
- PhiKernel exports \`route_relational(request,candidates)\` using its own hard-admissibility rules, including warrants.
- Altermath can propose a scalar-only junction after both modules approve their own roles.

The earlier Rung 4 accepted mock-shaped receipts. Rung 5 creates those records through **the actual source functions** in *locally checked out repos*, and exercises a fresh PhiKernel evaluation at both proposal and delivery. It never stores or executes arbitrary payloads.

## Local setup

Use Node.js 20+ and Python 3.11+ with dependencies from PhiKernel's pyproject.

Place repositories alongside each other:

    root/
      Altermath/
      NBGPocketMesh/
      PhiKernel/

    cd PhiKernel && python3 -m pip install -e . && cd ../Altermath
    npm run check
    npm run interop:smoke

If not siblings, set \`MESH_ROOT\` and \`KERNEL_ROOT\` to local checkout locations. Optional \`PYTHON_BIN\` selects a Python interpreter. The smoke run uses real NBGPocketMesh fixture task and manifests with no real AI models.

## Fail-closed proof points

1. The mesh creates a route receipt for its own task and manifest list.
2. Its exported \`verifyReceipt\` checks the full reconstructed receipt against the same inputs. A modified manifest digest is rejected.
3. A local Python subprocess imports PhiKernel's \`RelationalRoutingRequest\`, \`RouteCandidate\`, \`Warrant\`, and \`route_relational\` rather than spoofing a boolean.
4. A **synthetic and in-process-only warrant** permits an \`observe:junction\` action. The deliberate deny scenario uses a mismatched warrant scope.
5. The Altermath bridge independently requires route/topic/peer permissions and bounded scalar payloads. On delivery, the source checks run again: closing the boundary or changing the Python policy to deny prevents delivery.
6. Unit tests use injected stubs only for adverse cases; the separate CI interoperability job fetches pinned public source commits and exercises the actual implementations.

## Critical limitations

- The route receipt uses a deterministic SHA-256 hash. **It is not a signature** and does not establish the identity or integrity of an untrusted remote sender. Recompute-able hashes cannot be treated as authentication.
- The Python warrant is a controlled **local fixture**, not a human authorization. Do not reuse the fixture issuer, path, or values in real permissions.
- The mesh routing decision relates to fixture local compute manifests, not a cryptographically bound endpoint for the Altermath junction. **No production endpoint or authority is established.**
- The checked-out source modules themselves must be trusted. Pin and verify repository revisions before deployment.
- No HTTP, distributed queue, real device pairing, GPU weights, permission tokens, tool execution, or persistent credentials.
- A local demo receipt does not create a sixth spatial dimension or prove consciousness.
- The optional CI source-verification job is pinned at known source commit SHAs; bump those pins only after validating changes.

## Next rung

Design an authenticated endpoint binding and protocol between the owning systems using explicit human-authorized contracts, freshness, issuer identity, revocation, and receiver-side checks. Keep routing advisory and execution authority in the PhiKernel owner.
