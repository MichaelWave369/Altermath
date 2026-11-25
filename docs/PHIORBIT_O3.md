# PhiOrbit O3: nested orbital domains

Status: SIMULATED / authority NONE. Bounded hierarchical clock and QC2
execution experiment. O2's exact head passed all four CI workflows.

## Run

```sh
node --test tests/phiorbit-nested.test.mjs
node --input-type=module -e "import {studyNested} from './src/phiorbit-nested.mjs'; console.log(JSON.stringify(studyNested(), null, 2))"
```

## Clocks and budgets

A domain has a stable numeric ID, parent, integer period 1..34, phase
0..period-1 and per-global-tick fuel cap 1..64. Root has period 1 and
phase 0. At most 64 domains, eight levels including root, 512 jobs and
512 global ticks. Parent IDs must precede children.

A child's local counter advances on each parent activation opportunity,
including opportunities with no work. On such an opportunity, the child
aligns when its local counter modulo period equals phase. Initial
counters are zero. Clocks are precomputed independently of execution.
For example, a period-2 parent and a period-3 phase-zero child align
at global ticks 0,6,12,... . This is logical time, not physical orbit.

Each domain owns an independent O2 QC2 cube. Every gear consumes one
unit from its domain AND every ancestor. These are nested constraints
on the same operation, not separate units of physical work. All caps
reset each global tick; unused capacity does not carry over.

Three policies receive the same jobs and caps: flat EDF ignores
alignment; nested EDF admits only aligned domains; nested fallback
prefers aligned EDF then permits unaligned work if no aligned job fits.
Fallback does not advance clocks, grant extra fuel or bypass dependencies.
No routing hops, real concurrency, physical processor costs or dynamic
budget redistribution are modeled.

## Causality

The compiler uses O2's physical footprint. Each operation inherits
dependencies on the last writer of every touched position; frame
writes use a separate resource. Explicit dependencies may cross
domains. Unknown references, duplicates and cycles refuse. Physical
axes are fixed; frame and active writes commute in this model.
Conservative footprints include fixed slice centers. No arbitrary
read operations or view-relative writes are modeled.

Jobs are sequential within a tick, deadlines inclusive. A failed
predecessor blocks descendants, including not-yet-released jobs.
No program-wide rollback. Actual QC2 operations run in the scheduler,
with O2 receipts preserved. A reference fold over admitted jobs in
original input order checks final cube bytes. It shares O2 arithmetic;
it is an independent ordering oracle, not an independent cube algebra.
Policies that admit different sets can yield different final states.

## Study

Seven domains (root, two intermediate domains, four leaves), periods
2/3/5, phases and caps frozen in fixtureDomains. Nine job traces from
three seeds and mixed/burst/tight patterns; each receives all three
policies, yielding 27 comparisons. Work targets the leaves and includes
slice, whole and frame rotations plus explicit cross-domain dependencies.
Report completion, blocked, expired, outstanding, alignment and root
fuel consumption, final cube state hashes and a selected complete trace.

No claim that Fibonacci periods improve scheduling; O0 showed strict
alignment underperforming ordinary EDF. Nested periods can multiply
waiting times. Future O4 should compare phase/period adaptation and
ordinary scheduling at matched budgets, with fairness, overhead and
deadline controls. Existing O1, O2, E7 and storage engines unchanged.
No distributed synchronization, authenticated policy, recursively stored
3D payloads or production runtime integration.
