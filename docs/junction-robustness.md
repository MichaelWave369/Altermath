# Rung 11 — Holdout robustness matrix for adaptive junctions

## Research question
Does the Rung 10 present-state junction controller improve phase synchronization **reliably**, or only under its original gain, permission-revocation schedule, and artificial switching cost?

The answer can be negative. Our experiment records both signs and does not modify a learned selection after seeing holdout results.

## Setup and frozen training

1. Run the existing Rung 8 full-graph marginal junction ablations **once**, using a disjoint training seed range (default 369–377), gain **1.9**, and 60 warmup ticks.
2. Keep the k links (default six) whose removal most reduced mean phase coherence. **Freeze this list.**
3. Reuse the same starting list across all five predetermined stress profiles, without retraining or hyperparameter selection against holdout results.
4. Evaluate four policies on the same synthetic holdout seed range, default 10369–10377: adaptive phase score, frozen trained, rotating priority, and static shuffled. Each respects a k-link maximum and the same synthetic Horos hard gate in its profile.
5. Compare three score treatments from **the same trajectory data**: no switching penalty, 0.002 penalty per voluntary activation, and 0.01 penalty. Recalculating fees must not alter the actual simulated states.

## Preregistered stress matrix

| Profile | Gain | Permission denial starts | Permission restores | Change from reference |
|---|---:|---:|---:|---|
| Reference | 1.9 | 60 | 110 | baseline |
| Weaker coupling | 0.9 | 60 | 110 | gain only |
| Stronger coupling | 2.7 | 60 | 110 | gain only |
| Earlier revocation | 1.9 | 25 | 75 | timing only |
| Later revocation | 1.9 | 105 | 155 | timing only |

All cases run 180 post-disturbance ticks, with max 2 voluntary activations/replacements per 12 ticks and 12-tick minimum dwell. Forced revocation is immediate and outranks the optimizer. The allowed junction set is synthetic and cannot grant runtime permissions.

The original trained selection remains fixed across stresses. At each profile the initial phases and frequencies are exactly shared between controls for every holdout seed; changes in gain or revocation times are shared by all controls inside that profile.

## Metrics

For any method, mean coherence is the average Kuramoto-type global phase order R, a unitless number from 0–1. Fee-adjusted score:

    adjusted = mean_coherence - (fee × number_of_voluntary_activations)

We report **paired adaptive minus frozen, rotating, and static-shuffled** differences, counts of positive and negative holdouts, and the worst profile at each fee. The primary comparison is adaptive vs frozen. An adverse or inconclusive result is a finding, not a failure to be omitted.

We do **not** claim the four policy methods have identical instantaneous link counts: each merely has the same **maximum allowed** k. We explicitly export average active links. No claim of equal resource use is warranted.

## Run

    npm run test --prefix site
    npm run junction:robustness -- 369 6 9 9

The React panel shows a five-profile by three-fee stress matrix, all signs, summary metrics, and exports the full per-seed report. Use 3, 6, or 9 training and held-out seeds. All source models are deterministic.

## Limits

- This is a finite suite of synthetic stresses on **one** 18-node oscillator graph. These profiles are not physical measurements and do not establish general system robustness.
- The dataset is one deterministic train/holdout split, not replicated k-fold validation. Further tuning on the same holdout would contaminate it.
- Fee units are arbitrary synchronization-score penalties, not actual watts, dollars, latency, or packet-loss costs.
- The training and policy schedule remain shared across compared methods, but changing gain or denial timing also changes the task itself.
- The performance of one phase-heuristic does not validate Gnostic symbolism, dimensional hypotheses, or machine awareness.
- The Aero-Alter Physics 01 department remains separate: none of its lift, resonance, thrust, or buoyancy equations are used here.
