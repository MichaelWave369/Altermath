# Rung 25 · POLY-02: Geometry-versus-Dynamics Robustness

**Status:** exact synthetic model implementation and predeclared controls; **authority NONE**.
**Prerequisite:** [R24 POLY-01](polyhedral-keyhole-r24.md). No new physical or mathematical law is claimed.

[Open Altermath R25 after deployment](https://michaelwave369.github.io/Altermath/#polyhedral-robustness)

## Question

POLY-01 showed that two different pocket configurations can have the same observable aggregate yet evolve into different next aggregates under one synchronous neighbor-majority rule. POLY-02 tests whether the hidden-prediction result is stable under **changes of dynamics and state prior**, using same-node-count, same-degree connected graph rewires as controls.

This is a fully determined *toy model*, not an experiment on physical dimensions, cosmology, an E8 lattice, consciousness, "higher selves", or communication by quantum entanglement.

## Topology and observation

Each graph node represents a **face of the source polyhedron**, with links when original faces share an edge. Graphs are therefore the polyhedra's **duals**.

| Source | Pockets \(n\) | Working dual | Degree | Edges |
|---|---:|---|---:|---:|
| Tetrahedron | 4 | K4 | 3 | 6 |
| Octahedron | 8 | cube | 3 | 12 |
| Dodecahedron | 12 | icosahedron | 5 | 30 |

For state \(X_t\in\{-1,+1\}^n\), the observer sees only \(M_t=\sum_iX_{t,i}\). After a single synchronous update \(F\), the next observable is \(Y=\sum_iF(X_t)_i\).

We calculate exactly (no Monte Carlo over states):

\[
H(Y\mid M)=-\sum_{m,y}P(M=m,Y=y)\log_2P(Y=y\mid M=m).
\]

The full state has an independent Bernoulli prior:

\[
P(X=x)=p^{k(x)}(1-p)^{n-k(x)},\quad
p\in\{0.25,0.50,0.75\},
\]

where \(k(x)\) is the count of +1 pockets. Every one of \(2^n\) states is enumerated. These probabilities are *hypothetical initial-state priors*, not real-world empirical base rates.

## Four predeclared synchronous update rules

1. **Neighbor majority:** \(F_i(X)=\mathrm{sign}(\sum_{j\in N(i)}X_j)\). Degrees 3 and 5 are odd, therefore ties cannot occur.
2. **Neighbor parity:** \(F_i(X)=\prod_{j\in N(i)}X_j\). With odd degree, globally swapping every sign reverses the resulting signs.
3. **Majority with inertia:** \(S_i=X_i+\sum_{j\in N(i)}X_j\); output sign of \(S_i\) unless zero, in which case retain \(X_i\). This has explicit deterministic tie handling.
4. **Identity null:** \(F_i(X)=X_i\). The present sum predicts the future sum exactly, so \(H(Y\mid M)=0\) for **all** priors and graphs. If this fails, the implementation is broken.

We evaluate the full 4-rule × 3-prior grid for each selected source shape.

## Controls and what they do NOT control

Eight deterministic, seed-derived connected **double-edge-swapped** graphs are generated per selected (solid, rule, prior) condition. Both source and control have the same \(n\), vertex degrees, number of edges, update rule, state support and Bernoulli prior. No control can be mistaken for a larger source graph merely because its shape looks different.

- Graph controls are **not** an exhaustive or representative sample of all regular graphs.
- Distinct **labeled** edge sets do not imply distinct graph isomorphism classes. The panel reports the number of distinct labeled controls and the number identical to the original labeled edge set.
- K4 (the 4-node graph) is the **only** simple connected 3-regular graph on four vertices. All eight nominal rewires are duplicates of K4; there is no alternative of matching size and degree.
- Source solids of different face counts still confound size and topology. Direct increases from 4 to 8 to 12 pockets are not clean evidence of a *geometry-only* effect.
- Fixed-seed control comparisons are **descriptive**. No confidence interval, p-value, causal significance, performance benefit or cosmological inference is claimed.

## Falsification and independent cross-checks

A second, separately written **array-of-signs oracle** in tests reproduces all 36 canonical exact cases (three solids × four update rules × three priors). It does not share the optimized bitmask update implementation. Tests also verify:

- R24 uniform-majority values are exactly reproduced to floating tolerance.
- Identity yields zero hidden predictive entropy under all three priors.
- Sign-symmetric rules have identical entropies when changing \(p\) to \(1-p\).
- Weighted probability mass sums to 1 and conditional outcome masses match the input prior.
- Every rewired control passes degree, reciprocal adjacency, no-self-loop, connectivity and repeatability checks.
- Unsupported rules, invalid priors, out-of-range masks, malformed seeds and oversized requested control counts refuse execution.

Use:

~~~sh
npm run test --prefix site
npm run build --prefix site
~~~

Dedicated tests: \`site/tests/polyhedralRobustness.test.js\`. Implementation: \`site/src/polyhedralRobustness.js\`. React interface: \`site/src/PolyhedralRobustnessLab.jsx\`.

## Artifact and provenance policy

The JSON export includes fixed protocol/version identifiers, exact census, graph adjacency for all controls, seed, conditions, a compact factorial sweep and explicit \`authority: NONE\`. It never contains sensitive user prompts, a training dataset, access tokens, measured physical data or a route authorization. It can be re-run or checked independently.

## Promotion gate

These results are **not** a justification to wire this model into a production agent, to assign semantic meaning to 4-8-12 shapes, or to grant capabilities in NBGPocketMesh. Any future adapter requires a separate, consented, budget-limited, capability-checked, held-out application-level test against existing E0/E1 PocketMesh baselines. Reject a "win" if plain scalar/graph features predict as well, or if compute/latency costs erase any improvement.

**Stop condition:** reproducibility failure, unpreserved graph invariants, invalid probability mass, or absence of task-level value prohibits further promotion.
