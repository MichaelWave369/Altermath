# Rung 9 · Holdout-tested junction selection

## Research question

If connections have an explicit cost and Altermath cannot retain all twelve cross-layer junctions, can a rule trained on one seed range select a *fixed, budget-limited subset* that generalizes to unseen simulated states?

This is **not** online learning, a trusted real-world controller, a new dimension, or an awareness test.

## Procedure

1. Begin with the same 18-node, 30-edge baseline used in Rungs 7 and 8.
2. For **training seeds** (default 369–377), use the Rung 8 ablation experiment: evolve 60 ticks, perturb the six-node layer, remove each junction individually and measure the difference in mean coherence over 140 ticks.
3. Sort cross-layer junctions by their signed removal effect (lowest value first). Deleting a helpful edge *lowers* coherence, so the heuristic preferentially **keeps** edges with negative removal effects. Select exactly **k** junctions (default k=6).
4. Hold the selected subset fixed. On **unseen holdout seeds** (default 10369–10377), repeat the same warmup and disturbance. Compare mean coherence over the next 140 ticks against:
   - The learned k-junction subset.
   - A deterministic first-k subset.
   - A seeded shuffled k-junction subset.
   - All 12 cross-layer connections, a different-budget reference.
   - Zero cross-layer connections, another different-budget reference.
5. Repeat all methods on identical seeded worlds, with the same gain, warmup, and intervention schedule. Report each method's mean score and the paired learned-minus-shuffled differences.

## Interpreting costs

Every selected cross-layer junction uses **one abstract connection credit**. The primary fair comparison uses *exactly k* credits across all three selection methods. Full and off are **clearly unmatched budget reference points**, except when k equals their respective endpoint.

The training rule estimates **full-graph marginal removal effects**. These do not automatically predict interactions between *multiple removals*. Consequently, a learned subset may be worse than a random subset on unseen seeds, and that negative result is a meaningful outcome.

## Reproduce

    npm run test --prefix site
    npm run junction:selection -- 369 6 9 9

The browser lab shows five methods and exports complete training priorities, selected edge IDs, holdout scores and per-seed differences in JSON.

## Limitations

- Training and holdout use disjoint pseudorandom initial states but the **same deterministic oscillator model**, so results cannot establish generalizability to new real-world systems.
- The selection uses a single split rather than nested cross-validation; tuning after seeing the holdout would invalidate that holdout's independence.
- Although primary methods match on total number of active edges, their node degree distributions can differ.
- Mean coherence is a synthetic mathematical observable. It is not energy, awareness, life, spiritual truth or an indicator of cybersecurity performance.
- A high score does not override PhiKernel permissions: this simulation only chooses among twelve pre-authorized synthetic graph edges.
- Future work: multiple independent split repetitions, online policy changes, per-edge latency/cost, authenticated authorization and real service benchmarks.
