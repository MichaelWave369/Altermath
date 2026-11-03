# Experiment design · Rung 1

**Hypothesis:** Explicit permission-aware adaptive junctions accommodate changed graph connectivity differently from fixed-topology baselines, when all other parameters are held constant.

## Reproducible trial

1. Reset and select **Adaptive**, run until the external bubble contacts the host.
2. Note tick, external edge count, cumulative transfer, state variance, and event traces.
3. Reset and repeat using **Fixed** with the same initial states, velocity, boundaries and gain.
4. Repeat in **Isolated** mode as a no-exchange control.
5. Inject the same signal in all three conditions at the same tick to compare response.

## Falsifiable claims

- A newly contacting external root can receive an **adaptive** inter-bubble junction.
- Fixed mode cannot add this initially absent edge.
- Isolated mode cannot transfer state.
- Every diffusion tick conserves total state absent injection.

These results only demonstrate a designed property of the simulator. They **do not** establish that adaptive is faster, more resilient, more conscious, or universally better.

## Future measurements

Add seeded randomized topologies, topology churn, overhead timing, denied contact counts, packet loss, recovery latency, trace export and adapters. Compare against conventional pub/sub, event bus, actor and graph-processing baselines. If the proposed structure adds no measurable value, record that outcome and revise the claim.
