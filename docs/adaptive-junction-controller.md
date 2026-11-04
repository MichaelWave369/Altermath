# Rung 10 — Online adaptive junction selection (synthetic)

## Question

Can an online rule that sees only *current* oscillator phases keep a 3–6–9 nested-bubble network better synchronized than the same initially selected junctions held static, after a sudden boundary permission change? Can it do so while respecting an explicit link budget and accounting for switching costs?

**This is an algorithmic simulation. It is not a deployment of live network control or an authorization system.**

## Setup

Training is separate from testing: use Rung 8's full-graph marginal-removal effects to choose six links by default, based on seeds 369–371. All comparisons use fresh holdout seeds 10369–10371. For a given holdout seed, every method starts with the same initialization, 60 warmup ticks and identical disturbance to the six-node ring.

The controller then operates over 180 simulated ticks. It can use at most six active junctions. Every 12 ticks it may activate or replace up to two links, respecting a minimum dwell of 12 ticks for voluntary removal. **Forced authorization revocations ignore dwell** and immediately remove disallowed links.

The synthetic Horos-like policy denies three predetermined edges from tick 60 (inclusive) until tick 110 (exclusive). The same policy applies to *all* methods, even the full-link reference. When policy reopens, frozen methods may restore their original allowed links.

## Methods

| Method | Budget | Connection policy |
| --- | --- | --- |
| Adaptive phase-score | k | Prioritize largest observed absolute phase mismatch, no future data |
| Frozen trained | k | Hold the original Rung 9 subset, subject to policy gate |
| Rotating priority | k | Deterministic changing priority, same reconfiguration limits as adaptive |
| Static shuffled | k | Static seeded shuffled subset, subject to policy gate |
| Full | 12 | Unmatched high-budget reference, subject to policy gate |
| Off | 0 | Unmatched no-link reference |

Phase mismatch is a *heuristic*, not guaranteed to maximize coherence; its negative outcomes are equally important. Rotating priority provides a dynamic baseline so mere reconfiguration is not mistaken for intelligence.

## Measurement and cost

For each holdout seed and method, compute mean coherence over the evaluation horizon, mean active links, count of voluntary activations, and **net coherence**:

    netScore = meanCoherence - switchCost × voluntaryActivations

Default switchCost is 0.002 coherence units per voluntary activation. This is **not physical energy, latency, money, or empirical networking cost**.

Measure signed paired adaptive-minus-frozen differences, including a separate cost-adjusted result. The full and off references intentionally violate the k-link budget and are not fair primary baselines. For matched k-link methods, instantaneous active counts may differ after a forced revocation or during replacement, so report averages rather than silently equating them.

## Permission invariant

Every evaluation tick filters active links through a synthetic local authorization set; removing a disallowed link overrides the optimizer. No actual PhiKernel decisions are made here; in a production system only PhiKernel can provide authenticated hard-admissibility results. NBGPocketMesh routing remains advisory; Altermath cannot invent authority.

## Replication

    npm run test --prefix site
    npm run junction:controller -- 369 6 9 9
    npm run build --prefix site

The React Rung 10 lab offers budget, seed sweep, switch fee, synchronized traces, and a JSON evidence export. Each output records seeds, permission window, method results, selected set, traces and limitations.

## Caveats

- Only one deterministic policy-change schedule and one graph are studied.
- The controller uses instantaneous phase mismatch. This does not imply awareness, cognition, or predictive capability.
- Model tuning on holdout results would undermine their independence.
- Node degrees and instantaneous active-link counts may change during reconfiguration.
- Scores represent a synthetic oscillator system, not real networks or physical dimensions.
