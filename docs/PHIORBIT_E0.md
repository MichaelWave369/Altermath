# PhiOrbit E0: orbital activation scheduler

Status: SIMULATED / authority NONE. A bounded discrete-time scheduling
experiment on the existing E7 branching mesh. Not physical orbital
mechanics, actual distributed scheduling, or a 3D Rubik's cube engine.

## Reproduce

```sh
node --test tests/phiorbit-scheduler.test.mjs
node scripts/phiorbit-study.mjs
```

Twelve fields from five Fibonacci growth waves, each with 91 orientation
nodes (regional field depth 3). A field's activation period is selected
cyclically from 1,2,3,5,8,13. Phase is floor(field_id/6) modulo period.
A field is aligned if tick modulo period equals phase. Orientation
changes do not affect period, phase, field identity, or routing.

Jobs specify an inclusive deadline, release tick, start/target field,
orientation node and D4 gear. A job's cost is shortest path hop count
plus one gear operation. Completion occurs within one simulated tick.
Fuel limits admitted costs per tick, not actual time or processor work.
No preemption, concurrency, network latency, or dynamic link failures.

Four deterministic strategies receive identical frozen job streams:
FIFO (earliest release among affordable jobs), EDF (earliest deadline
among affordable jobs), strict orbit (EDF among affordable aligned jobs),
and orbital fallback (aligned EDF first, ordinary EDF when no aligned
job fits). All strategies can bypass unaffordable jobs. All use nine
fuel units per tick, 120 ticks, 96 arrival ticks; seed 369/636/963 and
mixed, burst, tight-deadline fixtures. Report completed, expired,
outstanding, waits, fuel usage and per-field outcomes. Strict orbit
can introduce avoidable deadline misses; no claim Fibonacci is optimal.
The full study is scheduling simulation, not measured wall-clock
performance. Compare other period families under matched duty cycles
before assigning any advantage specifically to Fibonacci periods.

A separate replay runs selected scheduled jobs on the actual E7 mesh
with state-bound synthetic grants. It checks actual fuel cost and
records ordered E7 receipts, final state digest and trace digest.
Different schedules can reorder noncommutative gears and therefore
produce different final states. Equal completion counts do not establish
semantic equivalence. No dependency-aware ordering is implemented;
jobs are independent fixture requests, not arbitrary application programs.
Replay exercises the existing D4 local orientation gear, not 3D layer
permutation. No authenticated identity, production authorization,
physical movement, or live ABL integration.

Next: dependency-aware scheduling, matched period-family controls,
fairness and starvation analysis, and bounded activation across
regional fields without scanning complete state on every dispatch.
