# ABL R0: Bidirectional Altermath Belt Language

**Status:** executable, deterministic, offline research prototype. **Authority:** SIMULATED_LOCAL / NONE.

## Origin and purpose

This preserves the November 2026 Infinite Pocket Square / NBG / Altermath concept: a *logical conveyor belt* carrying instructions, observations, a typed working value, and execution history inward, outward, or sideways through nested contexts. It is not a physical conveyor, newly discovered dimension, replacement operating system, neural compression breakthrough, autonomous AI agent, or general-purpose runtime.

The goal is to turn a promising idea into a **small falsifiable program**. We distinguish navigation, state transformation, observation, and reconstruction instead of treating each as magical motion along a fractal.

## Vocabulary

| Term | R0 meaning |
| --- | --- |
| Pocket | Bounded logical address holding allowlisted bitstring/number fields |
| Scale | Parent-child depth, not a physical dimension |
| Keyhole | Explicit permission to observe named fields |
| Gear | Locally allowlisted typed transformation |
| Belt | Program counter, current pocket, parent-return stack and working value |
| Inward | DESCEND to an explicitly existing child |
| Outward | ASCEND using the recorded stack |
| Lateral | LATERAL to a linked same-parent peer, with reciprocal grant |
| Fold | Produce a count summary of a bitstring, while archiving its full original |
| Unfold | Reconstruct exactly **only** from a stored and checked residual |
| Receipt | Deterministic hash-linked metadata for replay, not a signature |

The word *language* refers to a bounded interpreter and defined opcodes. The word *operating system* is an architectural analogy. This code has no processes, hardware control, kernel, filesystem writes, network, provider calls, remote agents, or model execution.

## The R0 instruction language

Case-sensitive opcode per line; full-line # comments and blank lines are permitted. No loops, branches, expressions, shell, scripts, dynamic code, or network access. One terminal RETURN is required.

~~~text
# The source script requests operations; grants determine whether they run.
DESCEND 3
OBSERVE bits
GEAR count-ones
EXECUTE
FOLD bits
UNFOLD bits
ASCEND
RETURN
~~~

- **DESCEND child-id:** traverse an existing child, requiring a source-pocket grant.
- **ASCEND:** return along a recorded parent stack, requiring an outbound grant.
- **LATERAL root/peer:** transfer to a linked peer with source-side lateral and receiver-side receive permissions; no implicit authorization.
- **OBSERVE field:** read only an explicitly allowlisted field in the current pocket.
- **GEAR name:** select a built-in transform; does not execute it.
- **EXECUTE:** require a separate execute grant, matching type, and fresh input observed within the same pocket.
- **FOLD field:** summarize a bitstring by its length and one-count, and keep its original in a local residual archive.
- **UNFOLD field:** recover the full bitstring with explicit grant and matching residual checksum.
- **RETURN:** terminate only after all descendant navigation has returned to root.

Available *local-only* gears: count-ones (bits to number), reverse-bits (bits to bits), and double (number to number). No user-defined JavaScript is compiled or invoked.

## Run it

Requires Node.js 20+; no dependencies, downloads or credentials.

~~~sh
node scripts/abl-belt-demo.mjs
node --test tests/abl-belt.test.mjs
npm test
~~~

Import *runABL*, *parseABL*, and *verifyABLReceipts* from src/abl-belt.mjs. Pass an explicit program string, pocket-address map, independent grant map, optional start (root only in R0), maximum steps and depth. R0 limits programs to 128 instructions, effective depth to 12 and bit fields to 4096 bits.

A refusal throws an ABL_REFUSE error without publishing a partial result. The interpreter copies supported pocket fields and does not mutate caller-owned state. Receipts include opcode, old/new pocket, index, chained SHA-256 digest and non-payload metadata. The archive is ephemeral and is excluded from receipts. Neither a digest nor a receipt establishes author identity, trusted execution, source truth, or access permission.

Important privacy note: a receipt may still disclose field names and logical pocket addresses. Do not feed it secrets or treat it as a verified privacy boundary. The same Node.js process is trusted; there is no sandbox.

## What R0 demonstrates, and what it doesn't

**Demonstrated by local tests:** parse and bound a small instruction vocabulary; traverse down/up; move laterally only with reciprocal permission; refuse unauthorized observation; execute typed allowlisted gears; invalidate working input across navigation; preserve original data on refusal; fold then reconstruct exactly if a residual exists; reject unsupported reconstruction; create deterministic, tamper-evident under recomputation receipts.

**Not demonstrated:** smaller resident memory, faster inference, a learned decision policy, task-aware predictive compression, cross-repo routing, model-sharded weights, cryptographic authority, reversible arbitrary computation, scientific validation of a holographic universe, or a live VR operating system. In particular the original bitstring remains stored, and the additional archive **increases** local storage. A shorter summary does not imply net compression.

Navigating back does not undo an operation. Exact reconstruction after a lossy transform requires sufficient retained information; discarded bits do not reappear from the summary alone.

## Interfaces and future work

This interpreter lives in **Altermath** because it implements authorized junctions, relational transitions, and return-path rules. It proposes interfaces rather than modifying adjacent repos:

- **NestedBubbleGear**: explicit observational Keyholes and prediction adequacy tests, not automatic permission.
- **NBGPocketMesh**: future typed, versioned capability selection and content-addressed Pocket Album; E0 routes are not wired into ABL.
- **PhiMemory9**: optional future append-only memory/lineage after explicit policy agreement; no SQLite writes today.
- **PhiFractalCity**: future visualization of belt state as a view, not the authoritative runtime; existing 3x3 district addresses differ from Pocket Library's quadtree notation.
- **PhiKernel**: any real cross-repository authority would require independently enforced source/destination checks and revocation, not hashes or visual links.

A proposed R1 research ladder:

1. Make two independent implementations of navigation and reconstructability, then test equivalence and negative controls against ordinary tree zippers / stacks.
2. Specify typed versioned adapters between distinct address spaces, rather than silently assuming the same 3x3 and 4-child geometry.
3. Create held-out prediction tasks where an additional observation may improve forecasts. Compare fixed sensing, random sensing, flat retrieval, and adaptive refinement under matched information and resource budgets.
4. Measure actual process memory, cold-load time, lookup costs, archive bytes and correctness. Charge metadata and residuals as overhead.
5. Distinguish navigation-back, verified inverse computation, and lossy reconstruction as separate instruction families.
6. Preserve no-advantage and regression results; never promote synthetic scores to deployment authority.

## Related implementation and research

- [Altermath mathematical foundations](mathematical-foundations.md)
- [Altermath resonance, skip and runtime note](resonance-skip-runtime.md)
- [Altermath POLY-05 holdout benchmark](keyhole-transfer-r28.md)
- [NestedBubbleGear](https://github.com/MichaelWave369/NestedBubbleGear)
- [NBGPocketMesh](https://github.com/MichaelWave369/NBGPocketMesh)
- [PhiMemory9](https://github.com/MichaelWave369/PhiMemory9)
- [PhiFractalCity](https://github.com/MichaelWave369/PhiFractalCity)

**Design shorthand:** Pocket = context; Keyhole = observable view; gear = admissible transform; belt = ordered execution; memory = provenance; return = measurable result.

**Next decisive question:** can an observer-aware, scale-navigation interpreter beat a conventional hierarchy on a real held-out task, after accounting for *all* stored information and execution costs?
