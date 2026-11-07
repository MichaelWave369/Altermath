# Rung 26 · POLY-03: Exhaustive Eight-Pocket Cubic Graph Census

**Evidence:** exact finite synthetic enumeration. **Authority:** NONE.
[Open the lab after merge/deployment](https://michaelwave369.github.io/Altermath/#polyhedral-ensemble)
[Prior rung: POLY-02](polyhedral-robustness-r25.md)

## Predeclared question

R24 and R25 explored face-adjacency graphs of Platonic solids with 4, 8 or 12 pockets, but the node count and some node degrees changed together. POLY-03 removes that confound by fixing **exactly eight pockets, degree three, and twelve undirected links** while changing connectivity patterns.

This is a controlled topology result for a small deterministic graph model, not a statement about actual physical geometry, E8, additional dimensions, quantized consciousness or neural-model routing.

## Complete finite cohort

Let the study universe be all undirected **simple 3-regular graphs on eight labeled vertices**, without self-loops or parallel edges. A constructive exact generator chooses the smallest vertex with unfinished degree, connects it to every admissible k-subset of higher-index unfinished vertices, decrements their required degrees and recurses. Each simple labeled graph is constructed exactly once.

| Population | Exact count |
|---|---:|
| All labeled 3-regular graphs on 8 vertices | 19,355 |
| Disconnected (two disjoint K4 components) | 35 |
| Connected eligible graphs | 19,320 |

Connected graphs are grouped by the pair **(triangle count, 4-cycle count)**. A triangle means a simple cycle of length three, and a four-cycle is counted as an unordered undirected cycle (not as an induced square). There are exactly **five** observed signature groups:

| Triangle:four-cycle signature | Connected labeled graphs | Exact H(Y|M), majority rule, p=0.5 |
|---|---:|---:|
| 4:2 | 2,520 | 0.9574523144989763 bits |
| 2:2 | 10,080 | 1.324181611171151 bits |
| 1:3 | 3,360 | 1.5164507163647825 bits |
| 0:6 (cube) | 840 | 0.47437549538726076 bits |
| 0:4 | 2,520 | 1.2489297378455433 bits |

The cubic cube graph is the **octahedron's dual face-adjacency graph**, thereby preserving continuity with POLY-01. The other graphs are not claimed to be faces of Platonic solids. A triangle/4-cycle signature is **not a general isomorphism oracle**, although these five descriptions partition this finite enumeration.

## Observation, update and entropy

Let \(X\in\{-1,+1\}^{8}\) denote the eight binary pocket states, with the aggregate-only observer measuring \(M(X)=\sum_iX_i\). Under synchronous neighbor-majority updating,
\(F_i(X)=\operatorname{sign}(\sum_{j\in N(i)} X_j)\), the next observable is \(Y(X)=\sum_i F_i(X)\).

All 256 initial configurations have equal probability when \(p=0.5\). For each graph, compute

\[
H(Y\mid M)=-\sum_{m,y}P(M=m,Y=y)\log_2 P(Y=y\mid M=m).
\]

For **every one** of the 19,320 connected labeled graphs, POLY-03 calculates this uniform-majority entropy independently of the R25 weighted-graph implementation. A test requires the minimum and maximum entropy within each signature group to equal the frozen reference value to \(10^{-11}\) bits. This is an exhaustive, finite claim, not an extrapolation.

Because size, degree, update law, state prior and observer are constant, the different results demonstrate that **connectivity matters under this rule**. It does **not** mean that high entropy is better for software agents; here entropy means uncertainty the Keyhole fails to expose.

## Interactive sensitivity inspection

The React lab also evaluates a **single declared graph representative per signature** under all four POLY-02 laws (strict neighbor majority; neighbor parity; self-inclusive majority with tie-to-self; identity null) and all three predeclared Bernoulli priors (0.25, 0.5, 0.75).

Important distinction: the 19,320-graph exhaustive invariance assertion is validated **only** for uniform-prior neighbor majority. Alternative rules/priors are **representative-case calculations**, not an exhaustive cohort result. Their results are marked accordingly.

The page shows:
- the exact five-group majority census, fixed node/degree conditions, and group labeled frequencies;
- a representative eight-node graph diagram per signature;
- live rule and prior selection with entropy comparison;
- a complete inspectable JSON study export with explicit authority NONE.

## Reproduction and adversarial checks

~~~sh
npm run test --prefix site
npm run build --prefix site
~~~

Code:
- \`site/src/polyhedralEnsemble.js\`: exact labeled graph generator, connectivity and cycle-signature computation, an independent majority census, and R25 weighted representative comparisons.
- \`site/tests/polyhedralEnsemble.test.js\`: exact cohort counts and all-group min/max checks; graph invariants; relabeling invariance; R24 cube agreement; full 4-rule × 3-prior representative checks; malformed-input refusal.
- \`site/src/PolyhedralEnsembleLab.jsx\`: browser inspector and export.

Every graph has eight vertices, degree three, and twelve edges. Disconnected graphs are excluded before computing study-family information. Four-cycle counting uses unordered vertex pairs and common-neighbor combinations, then divides by two because each cycle has two pairs of opposite vertices.

A failure of any exact graph count, a signature mismatch, a reproduced entropy difference, or a policy label other than authority NONE blocks promotion.

## Boundaries and possible follow-up

- Labeled frequencies are **not** the same as a probability distribution over unlabeled graph structures. A "random graph" must specify its sampling method and weighting.
- Different topology may change triangles, distance profiles, spectrum and other motifs simultaneously. POLY-03 establishes a topology effect, **not** that triangles alone caused it.
- Entropy is neither intelligence nor practical routing value.
- A successful synthetic census does not authorize PocketMesh training, model inference, remote task access, or modified PhiKernel policy.
- Before any POLY-04 adapter, predeclare held-out task-level comparisons against ordinary aggregate/keyhole predictors and flat routing, with accuracy, runtime, memory and safety-budget checks. If it fails to beat those baselines, publish the null result.

**Current research result:** hidden aggregate prediction *can* depend on connectivity even when all graphs have equal n and degree, in a fully specified synthetic system. No novel physical law is claimed.
