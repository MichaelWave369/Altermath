# PhiOrbit O4: adaptive orbital rhythm

Status: SIMULATED / authority NONE. Workload-aware clock policy on
the existing bounded O3 hierarchy and QC2 cube engine.

## Reproduce

```sh
node --test tests/phiorbit-adaptive.test.mjs
node --input-type=module -e "import {studyAdaptive} from './src/phiorbit-adaptive.mjs'; console.log(JSON.stringify(studyAdaptive(),null,2))"
```

## Motivation and controls

O3's successful run 45564374478 reports 1432 offered jobs per
policy across nine traces. Flat EDF and nested fallback completed
all 1432; strict nested completed 178, expired 52 and blocked 1202.
These are deterministic synthetic results, not wall-clock performance.

O4 reuses the exact O3 domain and job fixtures, compiler and QC2
operations. Compare flat EDF, fixed nested, fixed nested fallback,
adaptive strict and adaptive fallback across all nine traces.
All policies retain identical per-tick root/ancestor caps, deadlines,
dependencies and job costs. Fixed policies execute the actual O3 code.

## Controller

Each global tick, settle failed dependencies and expired jobs.
Count currently released, causally ready jobs on each domain's
ancestor path. Mark urgency if slack is at most two ticks.
No future arrivals are consulted; demand is sampled before dispatch,
not recalculated during the tick.

Nonroot periods use ladder 1,2,3,5,8,13,21,34 and never exceed
their original period. Urgency immediately reduces period to one.
Otherwise, after a minimum three-global-tick interval between
changes, backlog >=2 lowers the period one ladder step; zero
demand restores it one step toward its original value. A single
nonurgent ready job leaves the period unchanged. These thresholds
are fixed design choices, not trained or optimized parameters.
Root remains period one. Period changes do not reset counters;
effective phase is original phase modulo the current period.
Parent-opportunity counters remain monotonic. Fallback may execute
unaligned work but does not advance clocks or bypass caps.

Each operation consumes one unit from the same ancestor path as O3.
Activation windows and period changes are counted separately from
execution fuel. Controller overhead is not charged to the abstract
gear budget; no energy, CPU or physical-time saving is established.

## Evidence and limitations

Report per-domain offered/completed counts, minimum served-domain
completion fraction, completed-job mean/max waits, total activation
windows, off-orbit completions, period changes, and full state hashes.
Waits exclude failed jobs, so interpret alongside completion and
blocked counts. Activation counts include empty windows. The
ordinary EDF comparator has no alignment restriction; its reported
windows describe the original clocks, not actual CPU activity.

Tests cover urgency waking the entire ancestor path, idle restoration,
no anticipatory changes, blocked-job exclusion, exact budget and
dependency constraints, deterministic receipts and final state checks.
The reference fold shares O2 arithmetic but independently checks
admitted-job order. Different admitted sets need not produce equal
states. All 45 policy/trace combinations and a selected full trace
are retained in CI. No performance winner is asserted.

This is a deterministic heuristic, not a learned controller, physical
resonance or general fairness guarantee. It can reduce waiting by
increasing activation frequency, so compare both completion and
activation-window counts. Matched activation-cost or non-Fibonacci
period controls, wall-clock overhead and starvation-specific workloads
remain future experiments. Existing O0-O3 engines are unchanged.
