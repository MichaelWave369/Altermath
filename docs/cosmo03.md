# COSMO-03 / Altermath R31 · Equal-Observation Representation Parity

**Status: SIMULATED / authority NONE.** COSMO-03 studies **finite conditional inference** about inherited binary signals. It does **not** simulate a baby universe, demonstrate extra dimensions, gravity, quantum behavior, black holes, new physical information, novel intelligence, reduced real memory usage, or an NBG capability advantage.

## Question and preregistered null

> Does adding the explicit nesting/ancestry structure of a child improve prediction over a conventional flat bit-string when **both observers receive the same signals, the same target rule, and the same observation budget**?

**Null H0:** Given equal information, both mathematical representations make exactly the same analytic Bayes-optimal prediction. If they agree, no representational predictive advantage is demonstrated. A donor-aware sensor policy may beat fixed/random placement, but that is an effect of **sensor relevance and prior knowledge of donor locations**, not a special effect of nesting.

## Generating model and why it differs from COSMO-01/02

Eight fixed original source bits, grouped into two four-bit parents A and B. All 256 initial bit strings have equal prior weight.

The child C is a *logical grouping of two inherited source bits*. Its requested signal count is:

    Y = A[a] + B[b], where a,b are each 0,1,2,3.

The four donor slots of A cross the four slots of B, giving **16 geometries**, evaluated exhaustively. The target is never a newly created signal bit; it is the sum of two existing bits. This extends COSMO-02's fixed donor pair (A3,B0) to all donor positions, **without altering COSMO-02** or asserting that the majority transition from COSMO-01 conserves signals.

Two implementations construct the *same observable problem*:
- **Flat:** 8-bit mask, two source indices. No container hierarchy.
- **Nested:** two parent records of four original bits and child C with two donor ID references and a parent-ID list. The child references the original bits; the representation does not duplicate source information.

Both observe the same compulsory parent totals M = (sum(A), sum(B)). At extra sensor budget k in {0,1,2}, both also observe the *same k particular original raw source bits*. The child signal count is withheld from the observer and used only to score predictions.

## Analytical exact posterior

For a donor index j in one parent, if the donor itself is directly observed, P(bit_j = 1)=observed bit value.

Otherwise, under a uniform input prior conditioned on that parent's total, if m of its four bits are 1, and the observer additionally senses n distinct bits of that parent with observed sum s:

    P(bit_j = 1 | observations) = (m - s) / (4 - n)

Because the parents start independently and the observations do not mix their underlying signals, the two donor probabilities p and q yield:

    P(Y=0) = (1-p)(1-q)
    P(Y=1) = p(1-q) + (1-p)q
    P(Y=2) = pq

For each of all 256 states, predict the maximum-probability Y (ties go to the smaller Y), and measure exact average accuracy, conditional Shannon entropy H(Y|observations), log loss in bits, and mean absolute prediction error. The output includes the number of flat-vs-nested posterior/classification mismatches.

**This is an analytic oracle derived from the data-generating assumptions, not an LLM and not a learned model.** Exact full-state evaluation of this known finite prior is not a true independent holdout inference benchmark; do not describe the result as one.

## Equal-budget sensor policies

For each geometry and budget:
1. **Fixed:** sense A3 at k=1, A3 and B0 at k=2. The positions are predeclared from the original COSMO-02 pair, regardless of the new donor positions.
2. **Seeded random:** deterministically choose k unique positions from the eight, using seed 369 by default; alternative reporting seeds 636 and 963.
3. **Targeted oracle:** sense actual A[a] at k=1 and both actual donors at k=2. This uses **privileged knowledge of the target rule** for sensor selection and must never be presented as a learned sensor-discovery ability.

All three sense **zero** raw bits at k=0. Differences among policies are differences in **which** bits are seen, not in cost. Flat and nested representations use the same selected positions in each trial.

The registered four "reserved" donor geometries are (A0,B0), (A1,B2), (A2,B1), (A3,B3), with 12 others called development. There is **no fitted parameter, tuning, training sample, learned sensor selection, or trained model**; this partition is only a declared structural stress subset, **not meaningful out-of-distribution validation**.

All 16 donor pairs × 3 budgets × 3 policies × 256 state masks yield **144 conditions and 36,864 complete state evaluations per representation**. Preserve negative differences, ties, and all reserved cases. There are no chosen winning seeds.

## Relabeling control

For seeds 369, 636, 963, the permutation maps original node indices to new indices *within* each parent group. The state bits, donor indices, and raw-sensor identities are transformed consistently. The expected exact Bayes results (accuracy/entropy/log loss/MAE) must be invariant, and flat/nested parity must hold. **Changing an index without mapping its semantic identity is not a valid invariance test.**

## Representation cost, limitations and release gate

Serialize a single fixed state as flat mask/index JSON versus parent/child JSON and report UTF-8 byte lengths. This is a **representation-size illustration**, not measured application RAM/VRAM, compute, bandwidth, energy, network performance or privacy. Nested metadata should not be assumed cost-free; JSON can overstate real implementation overhead relative to a compact encoding.

Mandatory checks:
- 144 exact conditions, all 256 states each, equal sensor counts and matching observed positions.
- Flat and nested posterior vectors agree for every condition/state.
- Analytic posterior matches an independently counted empirical conditional frequency table on selected control cases.
- At k=0 all policies are identical; at k=2 the privileged targeted policy predicts Y exactly.
- Consistently relabeled graphs and sensor coordinates preserve the same scores.
- Illegal donors/budgets/relabels and contradictory observed bits fail closed.
- No code changes to original COSMO-01, COSMO-02, PhiMemory9, NBGPocketMesh or PhiKernel.
- Report nulls, regressions and caveats as prominently as positive results.

## How to reproduce

Node.js 20+; no credentials or packages required for the analytic core:

~~~sh
node --test tests/cosmo03.test.js
node scripts/cosmo03-benchmark.mjs 369
npm test
~~~

The benchmark emits the full case matrix plus a SHA-256 digest of JSON serialization. This is a deterministic reproducibility receipt, not a verified source signature or proof of physical truth.

The React lab is mounted under `/Altermath/#cosmo03` after merge and successful GitHub Pages deployment:

~~~sh
npm run test --prefix site
npm run build --prefix site
~~~

The page exposes donor positions, sensor budget/policy, seeded random controls, exact flat/nested scores, serialized sizes, all 16 geometry rows, and JSON export. It does **not** connect to back-end memory, agents, real quantum devices, or an actual physical universe.

## Next rung

COSMO-04 is **not yet implemented**. It would require a meaningful external task where nesting could plausibly help, predeclared training/validation/held-out data, equal compute+memory budgets, a strong flat baseline, real failure counts and cost-per-correct-result metrics. If the hierarchy doesn't help under those fair conditions, retain the null result.

Physical cosmology P0 remains separate, requiring actual GR/Einstein-Cartan/brane-specific equations, units, validated solvers, perturbation predictions and observational comparison.
