# Rung 27 / POLY-04: Held-out Predictive Keyhole Benchmark

**Status:** executable, strictly synthetic held-out forecasting; **authority NONE**.
**Predecessors:** [POLY-01](polyhedral-keyhole-r24.md), [POLY-02](polyhedral-robustness-r25.md), [POLY-03](polyhedral-ensemble-r26.md).
[React lab after merge and deployment](https://michaelwave369.github.io/Altermath/#keyhole-forecast)

## Question

Does observing **one or two additional raw pocket signs** improve held-out one-step aggregate prediction beyond observing the aggregate alone, and beyond a same-budget fixed sensor baseline? Can a sensor chosen through validation alone generalize to untouched state configurations?

POLY-03 showed topology-sensitive conditional uncertainty on toy graphs. This does **not** demonstrate a practical router or neural advantage. POLY-04 deliberately tests an operationally motivated *synthetic* forecast task, retains negative outcomes, and guards against test leakage.

## Exact task and inputs

Each of five predeclared eight-vertex, degree-three connected graph representatives from POLY-03 has a complete set of \(2^8=256\) binary states \(X_t\). The coarse Keyhole gives the current sum \(M_t=\sum_i X_{i,t}\). Under a declared synchronous update rule \(F\), the target is \(Y=\sum_i F(X_t)_i\).

Four rules are available from POLY-02: neighbor majority, parity, self-inclusive inertia/tie-to-self majority, and identity null. These are mathematical specifications, not natural phenomena.

All predictors are **discrete empirical-mode lookups**, not trained LLMs. They predict an aggregate target from their available observation keys. If no entry exists for (aggregate, extra sensed bits), predict the aggregate-only trained mode; if that aggregate was unseen, use the training global modal next aggregate. Every tie is broken deterministically by the smallest absolute forecast, then numeric order. No target values are disclosed through test features.

## Locked partition: train / validation / holdout

The complete state set is grouped into 128 complementary **pairs** \((x,x\oplus 255)\). Deterministic XorShift32 Fisher–Yates shuffling of these pairs, with seeds **369, 636, 963**, generates:

| Subset | Complement pairs | States | Permitted use |
|---|---:|---:|---|
| Train | 64 | 128 | Fit empirical forecast counts |
| Validation | 32 | 64 | Choose sensor indices (never fit on validation) |
| Holdout | 32 | 64 | Final accuracy and MAE only |

Every state appears exactly once and its bitwise complement remains in the same subset. Within any given seed/graph/rule condition, all compared models share **the exact same train/validation/holdout masks**.

**Important:** complement pairing enforces sign balance, not independence of experiments across seeds. Data come from the same deterministic toy law. No external validation or generalization to real-world tasks is claimed.

## Equal observation budgets and baselines

All methods receive \(M_t\). Budget \(k\in\{0,1,2\}\) measures the **number of additional raw binary pocket-state sensors**, not total physical hardware cost.

1. **Aggregate-only** \(k=0\): prediction from \(M_t\).
2. **Fixed-location baseline**: first \(k\) pocket bits in canonical graph indexing; selection doesn't read validation or holdout labels.
3. **Random-location baseline**: fixed-seed selection of \(k\) distinct pocket indices, not tuned to labels.
4. **Validation-selected candidate**: exhaustive choice of one index among eight, or two indices among 28 possible pairs; fit candidate models on training states only, choose by highest validation exact-match accuracy then lowest validation MAE. Lexicographic index order breaks remaining ties.
5. **Budget-zero sanity**: selected, random, fixed and aggregate must have identical held-out scores when no additional bits are permitted.

No feature uses a next-step pocket state as input. This is critical because that would leak the prediction target. The update rule is used only to produce the labels, and the evaluation never reveals the holdout labels to sensor selection.

## Outcomes and what counts

For each of the five graph representatives and each predeclared seed, evaluate **64 holdout state masks** and report:
- Exact-match accuracy \((\#\hat{Y}=Y)/64\);
- Mean absolute error \((1/64)\sum|\hat{Y}-Y|\);
- Selected sensor indices and their validation accuracy;
- Candidate-minus-aggregate and candidate-minus-fixed accuracy changes, **including negative values**;
- Per-condition split sizes and deterministic graph fingerprint.

A full 3-seed report has 15 graph-by-seed conditions and 960 evaluated test predictions per chosen (rule, budget), but those observations are highly related synthetic states, **not** 960 independent real-world trials. No confidence interval, causal discovery or operational routing claim is made.

A model can get worse after adding a feature due to data sparsity and validation overfitting. Negative/no-gain outcomes should remain visible. A no-gain result is a valid outcome, not a software failure.

## Test and claim integrity

Run:

~~~sh
npm run test --prefix site
npm run build --prefix site
~~~

Dedicated test module: \`site/tests/keyholeForecast.test.js\`. It checks:
- Every one of 256 state masks occurs exactly once, and complements are within a split.
- Disjoint 128/64/64 partitions repeat exactly across fixed seeds.
- An independent array-of-signs oracle recomputes target labels for all four rules.
- Exactly 8 one-sensor and 28 two-sensor candidates.
- Model predictions cannot distinguish samples with the same current aggregate and the same observed raw bits.
- Budget-zero equality, held-out score arithmetic, unsuppressed negative deltas, deterministic three-seed reproduction, and rejection of unsupported inputs.

**Stop conditions:** overlapping train/test masks; selecting features from holdout labels; a target-derived feature in the observed Keyhole; diverging oracle labels; hidden negative outcomes; or broken permission/authority boundaries.

## Promotion gate to NBGPocketMesh

POLY-04's results are **only a toy supervised prediction experiment**. The next step must be a separately approved evaluation on actual tasks, with independent task datasets and fixed train/validation/holdout partitions, comparing existing E0/E1 routes, simple task metadata and budgets, and any graph-informed candidate. Record accuracy, latency, memory, refusal errors and cost per correct result. The graph is **never** an authorization or identity provider. No network requests, model weights, private data, credentials, or real routing are involved here.

Neither 3/6/9 nor 4/8/12 gains a physical interpretation from this work; no E8, dimensional, gravitational, quantum signaling, consciousness or "ascension" claim is made.
