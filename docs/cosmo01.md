# COSMO-01 · Bounded Junctions and Hidden Futures (E0)

**Status: SIMULATED / authority NONE.** This is an original, exact finite graph automaton, **not** a cosmological simulation, black-hole calculation, GR solution, demonstration of physical extra dimensions, or test of universe formation.

## Purpose

Separate two questions too often blended in online cosmology illustrations:

1. **Formal:** Can two bounded domains have the same coarse readings but different futures, and can an admissible interface alter those futures?
2. **Physical (unanswered):** Can any real gravitational mechanism join or create spacetime domains, under field equations and observational constraints?

E0 addresses **only (1)**. There is no coupling from this module into agents, routing, network access, PhiKernel, PocketMesh or PhiMemory9. The word "birth" is reserved for a later explicitly defined graph operation; E0 does not generate universes.

## Exact finite model

Two domains have four binary pockets each. Each domain's internal wiring is an undirected path or cycle. At most one interdomain candidate edge joins pocket A3 to B0. The exact prior is uniform over all 2^8=256 full states.

**Coarse Keyhole:** M=(sum of four bits in A, sum of four bits in B).

**Refined Keyhole:** (M, A3); this costs exactly one extra observed pocket bit.

**Future output:** Y=(next A sum, next B sum) after one synchronous transition.

**Rule:** Each pocket votes with its graph neighbors and itself; strict majority wins, ties retain the old state. The separate identity rule is a null control. This binary majority law does not conserve mass, energy or charge; the scalar exchange law in Altermath's original src/core.js is a different mathematical model, not silently reused here.

**Interdomain policy:** The bridge opens only when the permission, contact and compatibility gates all pass:
- isolated: never;
- fixed: always when gated;
- adaptive: only if current A sum is **strictly greater** than current B sum, when gated.

This particular adaptive rule is an explicitly chosen control policy, not a proposed physical cosmological law. Contact and permissions are declared boolean fixtures, not inferred from physical distance or relativity.

Report H(Y|M) and H(Y|M,A3), their nonnegative information difference, bridge activation counts, and a complete-state witness of different futures under the same Keyhole reading. The entropy here is Shannon entropy over exact enumerated toy states, not thermodynamic entropy or entropy of a universe. The observer sees the *same budget* for each topology/mode.

## Run

Requires Node 20+, no third-party dependencies, internet access, data, model weights or credentials.

    node --test tests/cosmo01.test.js
    node scripts/cosmo01-benchmark.mjs
    npm test

The benchmark reports all nine topology/mode comparisons and a SHA-256 digest of the canonical JSON matrix. No seeds are needed because enumeration is exhaustive. The digest is a reproducibility check, **not** proof of experiment execution, truth or authenticated custody.

## Mandatory failure and interpretation gates

- Gate=false in any dimension must match isolation on every state.
- Under identity dynamics, coarse prediction must have exactly zero entropy.
- Refined observation must not increase conditional entropy.
- Publish zero or negative apparent advantages, ties, and all nine comparisons.
- A hidden-state witness must show equal M but unequal Y.
- Do not infer that higher entropy, more edges, or an extra observation is beneficial for intelligence or physics.
- No validation against CMB, gravitational waves or cosmological observations. No cosmic metric, Einstein field equations, stress-energy, action, junction conditions, dimensional consistency, perturbations or observable predictions are implemented.
- No public physical claims and no authority to route applications or write memory.

## Competing physical hypotheses, kept separate

| Research family | What actual physical work needs | COSMO-01 status |
|---|---|---|
| Lambda-CDM / inflation | GR/FLRW baseline, expansion parameters, primordial spectra and observational likelihood | Not implemented |
| Ekpyrotic / brane collision | Specific metric, fields/potentials, junction conditions and perturbations through bounce | Not implemented |
| Einstein-Cartan black-hole bounce | Torsion/spin matter theory, interior metric, causal continuation, physical observables | Not implemented |
| Eternal-inflation bubble collisions | Vacuum potential, bubble wall dynamics, collision spacetime, CMB signals | Not implemented |
| Social-media "black-hole filaments" | A defined geometry, equations, physical mechanism and nontrivial falsifiable predictions | Unsupported |

Useful starting literature:
- Khoury et al., *Ekpyrotic Universe*, Phys. Rev. D 64, 123522 (2001), https://doi.org/10.1103/PhysRevD.64.123522
- Poplawski, *Universe in a black hole in Einstein-Cartan gravity*, ApJ 832, 96 (2016), https://doi.org/10.3847/0004-637X/832/2/96
- Poplawski, *Gravitational collapse with torsion and universe in a black hole* (2025 preprint), https://arxiv.org/abs/2509.11468
- Feeney et al., *First observational tests of eternal inflation*, Phys. Rev. D 84, 043507 (2011), https://doi.org/10.1103/PhysRevD.84.043507
- *Phase-resolved field-space distance criteria in ekpyrotic, bouncing and cyclic cosmologies*, Phys. Rev. D 114, 044016 (2026), https://doi.org/10.1103/qjfz-drq6

Research correspondence: NestedBubbleGear is the canonical place for protocols, Keyhole interpretation and falsification ledgers. Altermath hosts this **isolated** E0 executable. PhiMemory9 may later hold source-linked claims, but E0 never mutates memory. No existing frozen experiment is changed.

## Next rungs (prospective, not shipped)

- E1: reverse the adaptive policy, matched-degree rewires, pocket label permutations, multiple step horizons, equal-cost observers, and exact held-out transfer.
- E2: separate graph birth/split events with explicit budget accounting and ancestry IDs; compare against ordinary dynamic-graph baselines.
- P0: independently reproduce a published, dimensionally checked physical cosmology in a distinct solver, then compare computed observables to real data. Never label E0 output as cosmological evidence.
