# PhiOrbit O1: dependency-aware orbital execution

Status: SIMULATED / authority NONE. Local D4 write scheduler for the
bounded E7 graph, not a general concurrent or distributed runtime.

## Reproduce

```sh
node --test tests/phiorbit-causal.test.mjs
node scripts/phiorbit-causal-study.mjs
```

O0's exact CI study (run 45559299614) confirms 1398 FIFO, 1399 EDF,
1055 strict orbit and 1380 orbit-fallback completions of 1420 offers.
O1 adds correctness constraints; those O0 throughput counts are not
directly comparable to O1's more conflict-heavy traces.

## Causal contract

Input array order defines writes to the same physical address
(field ID, local orientation node). The compiler inserts a predecessor
edge for each consecutive write to that address, unions explicit
depends IDs, validates all references and rejects cycles using Kahn's
algorithm. Forward explicit references are allowed if acyclic. No
cross-address read/write inference beyond explicit dependencies:
every instruction is a local D4 edit, not an arbitrary program.

A job is eligible only when released, affordable and all predecessors
have completed. All four O0 policies operate on the eligible set.
Dependencies may complete earlier in the same tick; execution is
sequential, not concurrent. Deadlines are inclusive. Expired jobs
cause descendants to be blocked transitively, even before release.
Failure closure gives dependency failure precedence over expiration
at a boundary. At the horizon, unresolved jobs are outstanding.
No policy bypasses prerequisites or the fuel cap.

For an identical admitted set, per-address operation order is invariant.
Independent-address edits commute in this model, so complete logical
states agree despite different execution traces. Policies may admit
different sets, so their final states need not agree. A failure does
not roll back already completed predecessors: no program-wide atomicity.

## Evidence

Tests show O0 EDF can reverse a rotate/reflect pair while O1 preserves
the input order. Independent address edits can reorder with equal final
state and distinct receipt traces. Tests also cover unknown IDs,
cycles, blocked descendants, deadlines, budget conservation and
actual E7 replay with an independent orientation-array fold oracle.
The oracle uses the established D4 compose function; this is not a
second independent implementation of D4 arithmetic.

The study uses O0's three seeds and three workload types, concentrating
writes at three local addresses per field and inserting an explicit
dependency every fifth job. Each policy receives the same causal
fixture. Report includes completion, expiration, blocked and outstanding
counts. A separate selected trace replays actual E7 gears and checks
its state against original per-address order. Dedicated CI retains
the full evidence. No performance or scheduling superiority asserted.

O1 does not implement real thread safety, durable exactly-once delivery,
cryptographic authorization, arbitrary read/write conflict detection,
or authenticated transport. Fuel is an abstract hop/gear budget, not
wall-clock usage. Next: 3D cube rotations as a separate exact
permutation family, with reversible state and explicit frame semantics.
