# COSMO-04 / Altermath R32: An Unseen Graph Can Punish a "Smart" Gear

**Status:** deterministic synthetic computational experiment; **SIMULATED / authority NONE**. Nothing here is a spacetime, wormhole, quantum circuit, black-hole bridge, multiverse, consciousness effect, observed network, or production router.

## Question

Can a nested representation or precomputed intra-bubble gateways perform better than a strong flat shortest-path baseline **once topology, preprocessing cost, and unseen layouts are accounted for**?

COSMO-03 tested information equivalence with a known analytic target; COSMO-04 moves to a *different applied task*: exact weighted shortest-path routing. It tests the claim that nested grouping provides a computational advantage, with a fair equal-search indexed-flat control and a no-index raw baseline.

## Preregistered synthetic workload and split

Each graph has 16 vertices partitioned into four groups of four. Every group has a short internal weighted path and one additional deterministic chord. Cross-group edges vary by graph **family**:

- **Train**: chain and ring, seeds 11 and 13 each: 4 graphs, 960 ordered source-target queries.
- **Validation**: star, seeds 17 and 19: 2 graphs, 480 ordered queries.
- **Holdout**: mesh, seeds 23 and 29: 2 graphs, 480 ordered queries.

Each graph enumerates all 16×15=240 nontrivial ordered routes. The generator is entirely deterministic; edge weights are integers in [1,9]. Test graph topology and seeds are fixed in source and excluded from training and validation selection. This is a **structurally held-out synthetic test** rather than independent production-network data. Source code is visible; there is no blind external evaluator.

## Three comparators

1. **Raw flat Dijkstra:** exact one-query shortest path on the original adjacency list; no index construction.
2. **Flat indexed:** precompute exact within-parent all-pairs distances and static gateway shortcuts; for each query add source/destination connections into an overlay and run the same deterministic Dijkstra kernel.
3. **Nested indexed:** use the **exact same gateway index and Dijkstra kernel** as flat-indexed, but also carry explicit parent/group and portal ancestry metadata.

The flat indexed method is a critical **control**: adding hierarchy labels alone cannot be counted as routing speedup when the same portal index can be represented flat. Nested and flat-indexed search work tie **by construction**, not through two independently optimized implementations.

All three share source/target requests and full graph data. The nested JSON serialization contains additional metadata and is not storage-budget-identical to raw or indexed-flat, so **no equal-RAM or hardware resource advantage can be inferred**. Report this explicitly rather than hiding the cost.

## Independent correctness oracle

All shortest-path distances, not just a few examples, are checked against a separate Floyd–Warshall all-pairs implementation on the original graph. The implementation also verifies raw, flat-indexed, and nested-indexed distances agree. Incorrect route distances invalidate any efficiency comparison.

### Work units

This is **not elapsed time**. The counted proxy is:

- one vertex candidate scanned by the shared naive Dijkstra kernel;
- one directed adjacency entry checked for relaxation;
- one edge/portal candidate examined while building a query overlay;
- the same work in exactly 16 within-group single-source preprocessing runs, charged **once per graph** when an index is used.

The benchmark does not count JS object allocation, GC, data-structure lookup, bandwidth, actual memory, hardware cache behavior, or CPU nanoseconds. Aggregate cost comparisons are only meaningful **inside this specified work proxy**. An indexed real implementation using priority queues or different storage could behave differently.

## Simple trained selection and validation choice

A tiny two-feature rule is fitted from **training query work only**, selecting "raw" or "indexed" separately for source-target pairs inside the same group or crossing groups. Candidate validation selection compares: "always raw", "always indexed", and this prefit two-feature rule, charging indexing setup in each case.

The minimum validation cost wins. A tie prefers raw first, then indexed, then trained. No tuning consumes mesh holdout query costs or outcomes.

This **cost-fitted policy** is not a trained general-purpose agent, and nothing is inferred about network intelligence.

## Current fixture outcome

For the exact generator and cost metric above:

| Held-out method | Correct | Charged total work units |
| --- | ---: | ---: |
| Raw flat Dijkstra | 480/480 | 80,520 |
| Indexed-flat | 480/480 | 97,576 |
| Nested-indexed | 480/480 | 97,576 |
| Validation-selected indexed policy | 480/480 | 97,576 |

The validation selector chose **indexed**, after it used 22,312 work units versus 79,194 for raw on star validation graphs. Yet on held-out *mesh* graphs, indexed and nested consumed **about 21.2% more counted work than raw**. This is a negative generalization result.

The result does **not** imply hierarchies never work, nor that the raw implementation is universally fastest. The examined network size, generator, query volume, and cost model are narrow. The null indexed-flat/nested tie is expected because they execute the identical search operation; the independent interesting result is the **validation-to-mesh cost reversal**.

## Commands

Node 20+, no network credentials required:

~~~sh
node --test tests/cosmo04.test.js
node scripts/cosmo04-benchmark.mjs
npm test
npm run test --prefix site
npm run build --prefix site
~~~

CLI prints full training/validation settings, holdout graph costs, a deterministic SHA-256 JSON report digest, and negative results, without hiding them.

The React panel is mounted at `/Altermath/#cosmo04` following successful GitHub Pages deployment. It provides graph family/seed selectors, route source and target selectors, all-comparator costs, the validation decision trail, serialized JSON overhead examples, and a full synthetic report download. Exploring a displayed route never changes the heldout selection.

## Failure gates and future work

- All eight registered graphs × 240 ordered routes must match independently computed Floyd–Warshall distances.
- 480/480 holdout correctness for each baseline before comparing counted work.
- Training/validation/holdout family and seed disjointness by exact pairs.
- No mesh test costs or decisions used in the training or validation selection.
- Index construction charged once per graph, no free cache or invisible preprocessing.
- Strong flat indexed baseline has same overlay/cost as nested; metadata overhead reported.
- Adverse holdout findings and workload assumptions displayed prominently.
- No changes to COSMO-01/02/03 or PhiMemory9, NBGPocketMesh or PhiKernel.

**Next possible COSMO-05:** preregister algorithm selection on genuinely sourced network-trace tasks, multiple graph scales, repeated independent topology generators, graph-changing time windows, equal memory / CPU limits, identical caching rules, empirical wall-clock and heap measurements, and an external holdout withheld during tuning. A human or agent must review any learned route optimizer before production use.

The separate physical-cosmology P0 track needs physical field equations, units, observations and independent validation; COSMO-04's routing results do not test universe formation.
