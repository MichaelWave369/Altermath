# Rung 7 · Controlled Threefold Comparisons

**Status:** reproducible local toy oscillator experiment. No physical, historical or consciousness claims.

## Why compare?

The existing interactive 3–6–9 visualization shows synchronization with 12 cross-layer junctions, but a striking graphic does not prove the network architecture is superior. This rung compares **three degree-preserving** topologies built from the same eighteen nodes, then adds a clearly labeled disconnected control.

| Scenario | Active nodes | Graph edges | Active junctions | Degree-preserving vs canonical? |
| --- | --- | --- | --- | --- |
| Canonical 3/6/9 | 18 | 30 | 12 | baseline |
| Rewired A | 18 | 30 | 12 | yes |
| Rewired B | 18 | 30 | 12 | yes |
| Isolated control | 18 | 18 active | 0 | **no**, fewer active links |

Each original ring retains its cyclic links: 3+6+9=18. All connected cases retain exactly 6 links between the 3/6 rings and 6 links between the 6/9 rings. Rewired cross-ring endpoints are shuffled deterministically while preserving the degree of *every node*, not merely aggregate edge count.

## Procedure

1. For each seed from **369** through **369+count−1**, initialize identical phase and frequency vectors across scenarios.
2. Simulate to tick 80.
3. Measure pre-fault synchronization, perturb the six-node ring, and close cross-layer junctions in connected scenarios.
4. At tick 130 reopen authorized cross-layer junctions; isolated control remains closed.
5. Simulate to tick 260 and report each scenario's mean final order, mean post-repair order, and count recovering to at least 90% of pre-fault coherence.
6. Return sampled time traces and per-seed details in JSON to enable independent re-analysis.

The recovery timer begins at junction reopening. If no recovery occurs within the observation window, the result is **null**, not zero.

## Run

    npm run threefold:benchmark
    npm run threefold:benchmark -- 369 9
    npm run test --prefix site

The React front door also has a repeatable compare-and-export panel. Its starting seed and trial count can be changed interactively without altering the underlying source.

## Interpret with care

- This is a Kuramoto-like **discrete oscillator model**, with arbitrary time units; the reported "exchange index" is **not physical energy**.
- Degree-matching removes one obvious confound, but not path length, clustering or other graph differences. Differences describe *this implemented model*.
- The isolated reference has fewer active edges and should not be described as a network-topology matched control.
- Averaging 3, 6 or 9 seeds is an exploratory comparison, **not statistical evidence of universal benefit**.
- The 3–6–9 symbolism is a design inspiration, not a newly discovered physical principle.
