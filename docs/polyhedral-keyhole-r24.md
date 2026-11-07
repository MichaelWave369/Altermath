# Rung 24 · POLY-01: Polyhedral Keyhole Observatory

**Status:** implemented deterministic synthetic graph experiment. **Authority:** NONE.
This is an experimental extension inspired by the 4/8/12 faces of three Platonic solids. The numbers are a topology selection, not a cosmological discovery. Existing Altermath 3/6/9 semantics and previous rungs remain unchanged.

[Open the React laboratory after deployment](https://michaelwave369.github.io/Altermath/#polyhedral-keyholes)

## Predeclared question

If an observer measures only the sum of binary states on a connected graph, can two full states with identical measured sums have different next measured sums under a fixed, known update law?

This is a standard conditional-observability problem, not evidence of new mathematics or physical dimensions.

## Graph custody

Each vertex stands for one **face-pocket** of a regular solid. Two vertices are adjacent if the original faces share an edge. This makes the working graph the *dual* polyhedron:

| Source solid | Original faces / model vertices | Dual graph | Neighbors per vertex | Edges |
|---|---:|---|---:|---:|
| Tetrahedron | 4 | Tetrahedron (K4) | 3 | 6 |
| Octahedron | 8 | Cube | 3 | 12 |
| Dodecahedron | 12 | Icosahedron | 5 | 30 |

3D dual vertex coordinates are canonical algebraic coordinates. Adjacency is recovered by shortest nonzero pairwise distance, with bounded numerical tolerance, then checked for degree, reciprocal edges, absence of self-edges and connectivity. Rendering rotates the *projection*, not the graph.

**Nesting is optional inspiration only:** each face vertex could later hold a recursive 4-way NBG pocket, but POLY-01 implements no PocketMesh payload, adapter, provider, model inference, network call, authorization grant, or real device I/O.

## Model and exact observable

State \(X_t\in\{-1,+1\}^{n}\); a uniform prior over the exact \(2^n\) configurations; no random training data.

For each pocket \(i\), update synchronously by strict neighbor majority:

\[
X_{i,t+1} = \operatorname{sign}\left(\sum_{j\in N(i)}X_{j,t}\right).
\]

All degrees are odd, hence the sum cannot be zero. The **Keyhole** reveals only

\[
M_t=\sum_{i=1}^n X_{i,t},\qquad
Y=M_{t+1}.
\]

Enumerate every \(X_t\); count exact empirical \(P(Y=y\mid M=m)\) under the uniform prior. Report

\[
H(Y\mid M)=\sum_mP(m)\left[-\sum_yP(y\mid m)\log_2P(y\mid m)\right].
\]

This is not \(I(X_t;Y\mid M)\) if \(Y\) were noisy, but under our deterministic step, \(H(Y\mid X_t,M)=0\), so the two are equal here.

Two states form a **causal collision** when they share \(M_t\) but have distinct \(M_{t+1}\). A visible collision is not a violation of causality; it is a loss of information through the observer's projection.

## Fixed exact census (canonical graphs)

| Face-pockets | Enumerated states | \(H(Y\mid M)\), bits |
|---:|---:|---:|
| 4 | 16 | 0 |
| 8 | 256 | 0.47437549538726076 |
| 12 | 4096 | 1.4487438178946757 |

These figures are computational results **of this specified toy rule**. They are NOT universal constants, evidence of E8, observational cosmology, spiritual planes, causal influence from other realms or quantum entanglement.

## Adversarial controls and limitations

- Eight fixed-seed alternatives per selected geometry via *double-edge swaps*. Every accepted swap preserves vertex number, edge number and vertex degrees; disconnected candidates are rejected. Seeds 369/636/963 are available; exports include all control graphs and their exact census.
- The tetrahedral graph K4 has **no alternative** connected simple 3-regular graph on four labeled vertices. Its control is therefore identical; the UI explicitly reports this.
- Results across 4, 8 and 12 vertices change **size and geometry at once**. They cannot be used to claim that geometric form is the cause of the change.
- Finite seeded rewiring controls cannot establish a statistical null distribution over all regular graphs.
- The uniform full-state prior and one synchronous majority rule were chosen for tractability, not because they model intelligence, biology, cosmology or data traffic.
- Conditional entropy here measures hidden *predictive uncertainty*. Higher values are not inherently better, more conscious, more intelligent or more efficient.

## Reproduction and falsification

From repository root:

~~~sh
npm run test --prefix site
npm run build --prefix site
~~~

The dedicated test is site/tests/polyhedralKeyhole.test.js and uses Node's built-in runner. It checks exact entropy values, face/edge/degree counts, collisions, update consistency, deterministic rewiring, and malformed input refusal.

To falsify any implementation claim, exhibit an enumerated mask whose reported \(Y\) disagrees with the synchronous update rule, a repeated input yielding different counts, or a control whose degree/connectivity differs from its source. Such a failure blocks promotion.

## Next gates (not claimed as delivered)

1. Hold **vertex count, degree and update rule fixed** while comparing a broader, enumerated class of control graphs. Measure uncertainty and confidence intervals across independent graph samples.
2. Run alternate local rules (including identity, self-inclusive majority, voter-style update, phase coupling) under matching priors. Re-test negative controls.
3. Run held-out application-level PocketMesh tasks only after documenting a typed, capability-checked interface. Maintain existing fail-closed receipt, privacy, and authority boundaries.
4. Compare against ordinary graph encodings and routers; require improvements in measured prediction, error, reliability, and cost, not aesthetic pattern matches.

**Repository roles:** Altermath = observable experiment; NestedBubbleGear = source/claim ledger and research theory; NBGPocketMesh = *future optional adapter after gates*, not a current dependency.
