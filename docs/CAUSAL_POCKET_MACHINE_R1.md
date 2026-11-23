# Causal Pocket Machine · ABL R1 / Causal Belt E0

**Status:** deterministic offline research prototype. **Authority:** `SIMULATED_LOCAL / NONE`.

This track preserves the Nested Blob Gear / Infinite Pocket Square / Altermath idea of many local instruction belts forming one **causally constrained computational score**. It adds a small task DAG and explicit bounded delegation to [ABL R0](ABL_BELT_R0.md) without changing R0 or granting any existing repo new privileges.

## What has been implemented

- Explicit task events with IDs, pocket addresses, and declared dependency IDs.
- Compile-time graph checks: missing dependencies, duplicate events, cycles, invalid pocket ancestry, data sources not declared as causal dependencies, and unauthorized cross-pocket data references are rejected.
- Deterministic topological scheduling, with **ready frontiers** showing which synthetic tasks have no dependency ordering between them. Execution itself is sequential; there is **no real concurrency**.
- Parent-to-direct-child `DELEGATE` and finite **fuel reservation**. Children can only spend their reservation, and unused fuel is returned on `RETURN` or `CANCEL`.
- Local `OBSERVE`, explicit `REFINE`, allowlisted numeric `EXECUTE` gears, and typed `COMPOSE` of actual direct-child `RETURN` outputs.
- Separate permission grants for delegation, observation, refinement, execution, return, composition, cancellation, and root completion.
- Deterministic hash-linked metadata receipts with the declared causal edges, output digests, and fuel balance. They are not signed, authenticated, proof of physical causality, or protected from replay.

**Not implemented:** live agents, a worker pool, genuine parallel execution, queues, streaming, authenticated endpoints, actual PhiKernel authority, cryptographic identity, learned adaptive Keyhole choice, probabilistic prediction, model-weight compression, a global clock, network messages, persistent event recovery, real resource measurements, or connection to PhiMemory9/PhiFractalCity/PocketMesh.

## The causal score

Let pockets be nodes of a containment tree `T`, and let instruction events form a directed acyclic graph `E`. An instruction must be admitted by a pocket-local capability policy and must have enough reserved fuel. A join can execute only when all its declared dependencies are complete.

~~~text
                   root
                  /    \
       DELEGATE net    DELEGATE render
           |               |
       OBSERVE           OBSERVE
           |               |
        EXECUTE           REFINE
           |               |
        RETURN           RETURN
           \               /
             COMPOSE sum
                  |
                FINISH
~~~

All causal edges in this diagram are explicit `deps` arrays, not arrows inferred from timestamps. Two ready events without a path between them may occur in different orders in a future concurrent runtime. The R1 evaluator imposes a stable alphabetical order strictly for reproducibility. That order **does not imply a causal relationship**.

## Opcode and effect contracts

| Opcode | Required data | Permission | Effect |
| --- | --- | --- | --- |
| `DELEGATE` | direct child address, positive fuel allocation | `delegate: [child]` on parent | Activate child and reserve fuel from parent |
| `OBSERVE` | scalar field | `observe: [field]` | Read local allowlisted numeric field |
| `REFINE` | prior local source event and finer field | `observe` **and** `refine` for field | Read an additional local observation, 2 fuel |
| `EXECUTE` | source event, built-in numeric gear | `execute: [gear]` | Transform local observed/refined numeric value |
| `RETURN` | direct local source event | `return: [parent]` | Return numeric result and unused fuel to direct parent; close child |
| `COMPOSE` | at least two direct-child `RETURN` events | `compose: [gear]` | Apply allowlisted sum/min/max to child results |
| `CANCEL` | direct active child address | `cancel: [child]` | Close and refund a child without active descendants |
| `FINISH` | local root source | `finish: [result]` | End only when no child remains active |

Built-in numeric executor gears: `double`, `negate`, `absolute`. Built-in composers: `sum`, `minimum`, `maximum`. Inputs are finite numeric scalars. No dynamic execution, imports, injected code, arbitrary functions, or network access.

`REFINE` is **explicit extra sensing**, not an intelligent choice by a trained predictor. The current prototype does not estimate predictive information, uncertainty, or value of information. R1 E0 lays a causal/budget baseline for a later controlled Keyhole study.

## Scope, authority, and data movement

- Every pocket is a predeclared logical address. Root is `root`, with at most eight child path segments and 64 total instantiated pockets.
- A nonroot event must have its own pocket's `DELEGATE` event in its **transitive** causal ancestry.
- An `EXECUTE`, `REFINE`, or `RETURN` source must be a **direct** dependency in the same pocket.
- `COMPOSE` may only read a direct child's `RETURN` event, not observations inside a child, nor another unrelated pocket's data.
- The instruction score carries no permission: independent `grants` must explicitly allow each operation.
- Every event consumes one unit of simulated fuel, except `REFINE`, which consumes two. Delegation additionally reserves child fuel. `RETURN` and `CANCEL` release unused reservations.
- All source data are synthetic, supplied in process and never mutated by the interpreter. Refusal throws before any external action; no partial effects are published.
- A hash-linked receipt demonstrates only local deterministic consistency under the assumed data. It does not prove that the declared action occurred on external equipment, nor that the caller had legitimate real-world authority.

**Threat model limit:** this is code running in one trusted Node.js process, not a sandbox or secure multi-tenant service. Private data must not be given to it; even hashes of low-entropy numeric results can leak values by guessing.

## Reproduce

Node 20+, no packages or services:

~~~sh
node --test tests/causal-belt.test.mjs
node scripts/causal-belt-demo.mjs
npm test
npm run check
~~~

The synthetic demo delegates independent network and rendering observations. Network obtains `16` then applies `double` to produce `32`; rendering obtains `9` and explicitly refines to `12`. Each child returns one numeric value. Root composes `32 + 12 = 44` with 40 initial fuel units. Ten events cost 11 fuel units in total, leaving 29 after refunds. These are **fixtures**, not measured network or GPU performance. The trace includes topological frontiers and a hash chain.

## Four independent structures

1. **Containment tree**: parent/child ownership and bounded depth.
2. **Gear/capability graph**: which typed operations and information requests are permitted.
3. **Causal score graph**: which events are prerequisites for which results.
4. **Observation lattice (future work)**: which additional Keyholes refine what information is available to the task.

The causal score cannot infer the other three structures. A causal edge is not a capability grant; a parent relationship is not necessarily a data-sharing right; and a finer view is not necessarily a better prediction.

## Infinite Hologram Box: six proposed observer faces

| Face | Read-only visualization from future grounded events |
| --- | --- |
| Structure | Pocket depth, parent/child shape, active descendants |
| Causality | Event dependency graph, ready frontiers, actual execution order |
| Information | Current Keyhole, permitted additional observations, uncertainty |
| Authority | Explicit grants and refusals from the actual policy owner |
| Resources | Reserved/used/released fuel, queues, memory (once measured) |
| Memory | Provenance, hashes, evidence lineage and reconstruction paths |

No visual face is implemented in this rung. The frontiers/receipts can eventually drive a **read-only** PhiFractalCity view; the renderer must never become an authority provider.

## R2 experiment gates

1. **Differential tests** versus conventional DAG execution and a straightforward parent-child task queue. Compare exact results, refusal behavior, and overhead.
2. **True concurrency** with structured cancellation, bounded queues, backpressure, deadlock detection, replay and recovery. Preserve determinism where required, without pretending parallel events have a total causal ordering.
3. **Predictive refinement** using held-out NBG Keyhole tasks. Compare fixed/random/adaptive sensing under matched access, fuel, memory, and error budgets. Report negative and no-advantage cases.
4. **Effect handlers** for observation and task submission with explicit policy rechecks and authentication, after independent security review.
5. **Versioned adapter contracts** between ABL, NBGPocketMesh, PhiKernel, PhiMemory9 and PhiFractalCity. Distinguish 3×3 city addresses from Pocket Library's quadtree addresses.
6. **Total cost accounting** including source data, residuals, indexes, runtime and measurement overhead. No compression or speed claim from synthetic fuel units.

**Research premise:** bounded, causally ordered pockets may provide a useful way to coordinate task-specific observation and specialized computation. **Nonclaim:** this is not a new law of physics, an infinite memory device, a holographic compression breakthrough, or evidence of machine consciousness.

Related: [NBG](https://github.com/MichaelWave369/NestedBubbleGear), [Altermath R0 belt](ABL_BELT_R0.md), [Pocket Library](https://github.com/MichaelWave369/NBGPocketMesh/blob/main/docs/POCKET_LIBRARY_V1.md), [PhiMemory9](https://github.com/MichaelWave369/PhiMemory9), [PhiFractalCity](https://github.com/MichaelWave369/PhiFractalCity).
