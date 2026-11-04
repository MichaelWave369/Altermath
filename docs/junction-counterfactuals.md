# Rung 8 · Junction Counterfactual Lab

**Research question:** Within the deterministic 3/6/9 toy oscillator system, what changes when a particular Altermath junction is removed after an identical prior history?

## Experimental design

The graph has 18 nodes, 18 within-ring links, and 12 cross-ring links. For each seed, the canonical graph runs for **60 warmup ticks** with all junctions present. Immediately before branching, we apply the *same* six-ring phase disturbance in every case. Then we fork that fully specified state (phases, frequencies, coupling, and tick) into:

1. **Untouched control:** all twelve cross-ring junctions remain.
2. **Twelve single-edge interventions:** exactly one specified cross-ring junction is removed in each branch.
3. **Full isolation:** all twelve cross-ring junctions are removed (a clearly unmatched reference, not a single-edge comparison).

Each branch runs for another **140 ticks** with the same dynamics and parameters. The only altered variable for the single-edge comparisons is whether the chosen edge exists.

We report **the paired difference** \`R_removed - R_control\` in mean coherence during that window and at the final tick. Positive means deleting that edge increased phase coherence in this model; negative means it decreased coherence. Effects are ordered by **absolute magnitude**, not by desirability. We retain the original signed value and the observed min/max across seeds. No interpretation as benefit is assumed.

Example:
- A mean difference of \`-0.015\` means deletion lowered average synchronization by 0.015 (1.5 percentage points) for the selected seeds/parameters.
- A difference of \`+0.015\` means deleting it *increased* average synchronization. This is allowed and scientifically useful; Altermath does not presume all junctions are helpful.

## Reproduce

    npm run junction:ablation
    npm run junction:ablation -- 369 9
    npm run test --prefix site

The React interface offers 3/6/9-seed sweeps, a list of all 12 junction effects, a side-by-side sample trace, and JSON export including per-seed results.

## Limitations and next steps

- Deleting an edge also changes endpoint degrees, so the intervention is **not graph-degree-matched**. That is intentional: it measures the effect of edge presence in this implementation, not optimal topology independent of degree.
- There is no real independent variable corresponding to intelligence, knowledge, spirit, or human consciousness. \`R\` is the Kuramoto-type phase coherence of eighteen mathematical oscillators.
- Results depend on seed, coupling, timing, and horizon. The observed range across seeds is **not** a statistical confidence interval.
- This is a deterministic **within-model counterfactual**, not a real-world randomized causal trial.
- Later experiments should vary coupling/delay, graph sizes and fault schedules, compare connection costs and explicitly separate edge selection from policy authorization.
