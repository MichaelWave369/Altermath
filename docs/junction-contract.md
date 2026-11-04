# Rung 4: Junction Contract and Bridge

**Status: deterministic local demonstration, not remote integration or authenticated execution.**

Altermath is a bounded relationship, not a privilege escalation mechanism. NBGPocketMesh and PhiKernel have separate responsibilities:

1. NBGPocketMesh E0 produces a routing receipt with schema NBGPocketMesh.E0.v1, decision ROUTE or REFUSE, and **authority: NONE**. It chooses a candidate path but grants no permissions.
2. PhiKernel's relational router creates CandidateFieldEvaluation records with admissible, route_key and hard_block_reasons. Hard vetoes and warrants must be enforced by PhiKernel itself before any real operation.
3. The Altermath local bridge accepts a **scalar-only** signal proposal only after an explicit admissible result and positive route recommendation, then applies directional boundary rules again at delivery time.

## Wire contract (simulator only)

Proposal:
    {id:"msg1",from:"mesh",to:"kernel",topic:"signal",value:0.75,ttl:3}

Mapped admissibility:
    {source:"PhiKernel.CandidateFieldEvaluation",
     routeKey:"mesh:kernel:signal",admissible:true,hardBlocks:[]}

Mapped routing:
    {source:"NBGPocketMesh.E0.v1",
     topic:"signal",routed:true,advisoryOnly:true}

These mapped objects are **not signed, authenticated, or sufficient for production remote use**. The demo uses local mock records matching the public fields. The NBGPocketMesh adapter does not validate receiptSha256. In a real integration, the originating mesh service must call verifyReceipt with the matching task and manifests, while the PhiKernel owner must supply a trusted, authenticated hard-admissibility decision. Never rely on caller-provided JSON for privilege decisions.

The receiver and sender each have explicit peer permission lists; no wildcard allowance is assumed. The bridge cannot execute code, transfer arbitrary objects, load a model, contact a network, or obtain authority on behalf of another project.

## Lifecycle

PROPOSE → ROUTE ADVISORY → HARD ADMISSIBILITY → BOUNDARY CHECK → ENQUEUE → RECHECK BOUNDARY → DELIVER / REVOKE / EXPIRE.

- Queue limits protect memory; duplicate message IDs are rejected, including IDs already denied.
- Disabling a peer revokes its queued messages when the next tick processes them.
- TTL limits the maximum simulated waiting time.
- Every outcome yields a bounded, non-payload event record.
- The simulated payload is a number in [0,1], avoiding logs of sensitive content.

## Verification

    npm run check
    npm run junction:benchmark
    python -m http.server 8080

Open [junction.html](../junction.html). The benchmark is deterministic but only models logical ticks, not network latency or actual reliability under load.

## Integration sequencing

- **NBGPocketMesh:** future optional adapter calls route() and verifyReceipt() on the owning runtime before passing a non-authoritative recommendation; never duplicate E0 task/manifest validation here.
- **PhiKernel:** future optional Python bridge invokes its normal warrant/constraint checks; the boolean proxy in this test suite must never replace PhiKernel policy.
- **PhiServe / PhiShare / CompAware:** future consumers can subscribe to observational junction-completion records; they are not granted execution or memory-write privileges by a junction event.

## Open questions

Does an explicit junction lifecycle reduce debugging time or accidental policy bypass compared with a conventional message bus? Test against a real baseline before making improvement claims. This rung demonstrates **correctness invariants**, not speedups or consciousness.
