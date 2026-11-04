# Bio-Lattice Transport Lab: epistemic and engineering protocol

**Status:** Educational, dimensionless toy models. No quantum electrodynamics (QED) solver, cellular signaling demonstration, or consciousness test.

## Why this exists

Microtubules are highly ordered tubulin lattices. Some experiments indicate that excited-state energy can move farther through their amino-acid chromophores than a simple unmodified Förster transfer estimate would predict. Separately, theory predicts collective optical behavior in large tryptophan networks, with supporting fluorescence observations. These results motivate **transport research**, not claims that optical coherence gives rise to consciousness or works as a deployable computer bus.

## Primary sources (verify independently)

- Kalra et al., *Electronic Energy Migration in Microtubules*, ACS Central Science (2023), DOI [10.1021/acscentsci.2c01114](https://doi.org/10.1021/acscentsci.2c01114). Reports ~6.6 nm energy diffusion length under the studied conditions; this is **not** fitted here.
- Babcock et al., *Ultraviolet Superradiance from Mega-Networks of Tryptophan in Biological Architectures*, J. Phys. Chem. B (2024), DOI [10.1021/acs.jpcb.3c07936](https://doi.org/10.1021/acs.jpcb.3c07936). Theoretical single-excitation collective states with fluorescence-yield observations.
- Prompting reference: [Quantum Electrodynamics of Cytoskeleton Tryptophan Lattices](https://consciousphysics.substack.com/p/quantum-electrodynamics-of-cytoskeleton). Treat as inspiration; do not assume a complete peer-reviewed derivation from its title.

## Model specification

- A cylindrical graph with **13 protofilaments** and **18 longitudinal sites**, rendered as an **unwrapped grid**; open axial ends, periodic circumferential neighbors. This is a topological illustration, not a crystallographic tubulin geometry or physical site count.
- One initially localized excitation at ring 2.
- *Hopping baseline:* each neighboring pair undergoes symmetric, population-conserving mixing with rate `sin(theta)^2`.
- *Coherent amplitude toy:* each node holds a complex amplitude; deterministic site phase rotations and pairwise unitary mixing gates move amplitude. Probabilities are squared amplitudes. This is **not** solved from a molecular Hamiltonian and does not establish long-lived quantum coherence in cells.
- `theta = 0.42 × coupling × [1 - 0.65 × disorder × |noise(a)-noise(b)|]`, per pair, per gate; site phase `1.8 × disorder × (noise(i)-0.5)`.
- After each step both models multiply probabilities by `(1-loss)` (amplitudes by its square root).
- Outputs: survival fraction, axial standard deviation **in lattice sites**, inverse-participation effective occupied sites, and a JSON snapshot. Dimensionless tick, arbitrary coupling and static disorder values. Do not compare axial site spread directly to the 6.6 nm paper result.

## Falsification and later research work

1. Freeze the deterministic seed and sweep geometry, loss and disorder; compare conservation invariants and model-to-model divergences.
2. Add an independent incoherent continuous-time Markov baseline with measured graph couplings. Do not present this as a physical validation of the coherent model.
3. If experimental spectra, lifetimes and uncertainties become available, construct a properly sourced parameterization with a separate labeled **calibrated** mode, dimensional analysis and held-out checks.
4. Measure sensitivity, replicate across independently randomized lattices, report negative results, and compare to simpler baselines.
5. Export proposal-only findings to [CompAware](https://github.com/MichaelWave369/CompAware) and [PhiOS](https://github.com/MichaelWave369/PhiOS). No runtime/driver changes, artificial consciousness verdicts, or automatic promotion from this experiment.

## Reproduction

```bash
cd site
npm install
npm test
npm run build
```

The lab lives on the existing React front door at `#bio-lattice`. Tests include deterministic replay, normalization and decay invariants, no-coupling behavior and input validation. No network calls or hardware access are performed by the simulator.

## Rung 14: independent transport baseline and paired sweep analysis

An additional pure module `site/src/bioLatticeStudy.js` implements a **synchronous
Euler-discretized symmetric Markov generator** on the same open-axial,
periodic-circumferential lattice. Unlike the sequential pair-gate hopping and
complex-amplitude models, it distributes each node's population simultaneously
through all local edges. Each edge uses the same seeded site disorder and the
same `sin(theta)^2` rate mapping. The max outgoing per-node weight is bounded by
`4*sin(0.42)^2 < 1`, so the step never creates negative mass. All three apply
the same synthetic loss per tick.

**Important:** this is NOT a calibrated continuous-time microtubule Markov
process; one Euler tick is dimensionless. Reusing the same invented edge-rate
rule is a fairness control, not independent physics confirmation.

The R14 React panel runs a predefined 5-condition sweep of coupling, disorder,
or loss and repeats all model/condition pairs on the same 3, 6, or 9 synthetic
seeds. Results show mean axial spread, signed phase-amplitude minus Markov
differences, per-seed sign counts and all underlying records in export JSON.
No parameters are trained, no holdout experiments are performed, and reused
seeds are correlated across conditions. Comparing these model differences does
not license inferential p-values, quantum-coherence claims, or consciousness
claims.

The 5 sweep grids are fixed and explicitly disclosed. **Possible falsifier:**
a purported "coherent" advantage disappearing or reversing under the
independent synchronous baseline, or changing sign over arbitrary numerical
settings, undermines any claim that the effect is a robust physical insight.
Even a persistent advantage would remain entirely a *toy-model* behavior
until empirical spectra, lifetimes, uncertainties and independent replicates
are used to calibrate the model.

```sh
npm run test --prefix site
npm run build --prefix site
```

See `site/tests/bioLatticeStudy.test.js` for deterministic, conservation, decay,
boundary, input-validation and seeded-control invariants. Both the R13 display
and R14 study remain local browser tools with no device or network permissions.
