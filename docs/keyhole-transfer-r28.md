# Rung 28 / POLY-05: Cross-Topology Transfer and Relabeling Audit

**Status:** deterministic synthetic cross-topology prediction benchmark, **authority NONE**.
[Altermath Live after merge and deployment](https://michaelwave369.github.io/Altermath/#keyhole-transfer).
Earlier protocols: [POLY-03](polyhedral-ensemble-r26.md) and [POLY-04](keyhole-forecast-r27.md).

## The next research question

POLY-04 evaluated prediction on withheld binary states **from the same graph and update law** used to construct training examples. That design checks state holdout, but not whether a fitted Keyhole predictor transfers to a different network.

POLY-05 holds vertex count (8), vertex degree (3), observation type (the signed aggregate plus 0/1/2 raw pocket bits), and the known update law constant while holding **whole graph structures** out of training and sensor selection.

A second orthogonal stress test relabels the unseen graph's vertices through three fixed permutations. A relabeling is an isomorphism, so the underlying graph is not changed. However, a sensor choice encoded as a literal vertex index can become useless after relabeling; the model has no guaranteed semantic anchor for that index across independent graph families.

## Frozen five-family leave-one-out procedure

Use the five canonical cubic-graph representatives from POLY-03, with signatures 4:2, 2:2, 1:3, 0:6 (cube), and 0:4. For each target family at array index i:

- **Holdout:** graph i. Neither its graph outcome labels nor its relabeled versions enter training or validation.
- **Validation:** graph (i+1) mod 5, chosen by fixed rule before any evaluation.
- **Training:** the other three graphs.
- Each graph contributes all 256 binary masks. Thus train has 768 labeled graph–state samples, validation has 256, and every heldout condition has 256.
- The same mask values occur on different graphs. We test **out-of-graph** transfer only, *not* disjoint mask transfer.
- For the heldout graph, test canonical indices plus fixed pseudorandom vertex permutations with seeds **369, 636, 963**. This yields **5 × 4 = 20** graph–label conditions and **5,120** test predictions per predictor per selected rule/budget.
- Relabeling is audited by checking that graph adjacency is a bijective transform, and that exact state evolution and aggregate outcomes commute with a correspondingly relabeled state.

These are not 5,120 independent physical experiments. They are repeated evaluations over five small synthetic graphs under a specified model.

## Four predictors, equal observation budget

Every predictor sees the current signed aggregate \(M_t=\sum_i X_{t,i}\).
Each extra sensor costs **one raw binary pocket sign**. Choose k=0, 1, or 2:

1. **Aggregate baseline** uses k=0.
2. **Fixed-index baseline** uses the first k indices, irrespective of graph or outcomes.
3. **Seeded-random index baseline** selects k indices before seeing test labels.
4. **Validation-selected candidate** selects k indices from all 8 choices (k=1), 28 pairs (k=2), or none (k=0), maximizing validation exact-match accuracy then minimizing validation MAE, with deterministic lexicographic ties.

Predictions use the POLY-04 empirical-mode forecast code: observed aggregate and allowed raw sensor bits index a count-based training model. Unseen feature keys back off to the aggregate-only training mode and finally to the global training mode.

A *holdout graph's transition labels* are computed only when scoring; they never select sensor indices or update any model.

## Metric and explicit failure criteria

Report exact-match prediction accuracy, mean absolute error, and candidate accuracy minus both same-budget fixed-index and aggregate-only baselines **without clipping negative outcomes**.

Success is **not** defined as any single positive percentage. Report all 20 conditions, alongside per-relabel means, and inspect whether an apparent gain vanishes or reverses under arbitrary graph index permutations.

Further negative controls:
- k=0 must make all four methods equal in every test condition.
- Identity update must yield 100% aggregate baseline accuracy and no possible improvement. If it doesn't, the experiment is invalid.
- A relabel permutation must preserve connectedness, degree, edges, and exact updates after relabeling masks.
- Graph families used for train/validation/test must be disjoint by family ID for every fold.

The test suite checks fixed-seed reproducibility, exhaustive state coverage, no target-family contamination of train/validation sources, full graph-relabel transition covariance across all four update rules, score arithmetic and null outcomes.

## Reproduce

~~~sh
npm run test --prefix site
npm run build --prefix site
~~~

Implementation: \`site/src/keyholeTransfer.js\`.
Regression tests: \`site/tests/keyholeTransfer.test.js\`.
React inspector: \`site/src/KeyholeTransferLab.jsx\`.

## Interpretation limits

This remains an educational **synthetic** experiment. The five structures are selected representatives, not independently sampled operational tasks; the labels come from a known deterministic update rule. A target graph's abstract node indices have no physical or semantic identity across networks.

An apparent transfer gain can depend on arbitrary indexing or an unrepresentative graph split. A negative result is equally valuable and should prevent claiming a computational advantage.

**No production authorization or PocketMesh adapter:** A real deployment requires predeclared consented task data, privacy-preserving interfaces, independent task sources, task-accuracy/latency/memory/cost-per-success comparison against existing PocketMesh baselines, and fail-closed PhiKernel policy. This work does not offer evidence of physical extra dimensions, E8 cosmology, consciousness, quantum messaging, anomalous forces or higher-dimensional realms.
