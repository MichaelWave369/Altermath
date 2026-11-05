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

## Rung 15: frozen training selection and disjoint synthetic holdout

The [R15 Bio-Lattice Holdout](../site/src/bioLatticeHoldout.js) implements a
**selection-bias challenge**, not an experimental physics study.

**Prespecified protocol:**
1. Choose one of R14's three existing five-value sweep grids, plus frozen
   baseline parameters and the seed block sizes (3, 6 or 9 each).
2. Use training seeds `startSeed + [0..trainingCount-1]`; for each grid point
   compare the amplitude and synchronous Markov axial-spread means.
3. Freeze the grid point with the greatest **absolute** mean difference on
   training data, breaking ties by lowest grid index. The selection function
   has no access to held-out data.
4. Evaluate that **one** chosen configuration only on seeds
   `startSeed + 10003 + [0..holdoutCount-1]`. Record individual paired model
   differences, sign counts, mean and min/max. Do **not** change the setting
   after observing holdout outcomes and call the same data confirmatory.
5. Provide a 256-resample deterministic percentile range for the synthetic
   held-out mean. This is **descriptive resampling of toy-model differences**,
   not a physical uncertainty estimate, population-level confidence interval,
   independent biological replication or statistical significance.
6. Run two frozen numerical null controls over the held-out seeds:
   coupling = 0, and steps = 0. All three model axial spreads must be zero.
   Check expected surviving probability with identical per-tick loss across
   all model modes.
7. Export full input, train-only candidates and seeds, frozen selection,
   held-out per-seed outcomes, controls, and explicit scientific limitations.

The implementation strictly rejects nonfinite or out-of-range step counts
before starting any loop, after the R14 timeout regression. The existing
R13/R14 React panels and experimental models remain unchanged. The R15
panel is entirely local to the browser, runs no external network operations
and never proposes changes to the kernel, actual sensors, computers, PHB
physical authority or optical hardware.

**Meaning:** A direction reversal on an unseen synthetic seed block is
evidence against a *robust numerical claim* under this fixed model; a matching
direction does not establish a real molecular, optical, quantum or awareness
mechanism.

Reproduce:

```sh
npm run test:bio-lattice --prefix site
npm run build --prefix site
node --input-type=module -e "import {runBioLatticeHoldout} from './site/src/bioLatticeHoldout.js'; console.log(JSON.stringify(runBioLatticeHoldout(),null,2))"
```

The documented `altermath.bio-lattice.holdout.v1` JSON envelope is
synthetic data, not a sourced laboratory measurement. If independent
calibrated experiments are available later, add a separate provenance-aware
experimental dataset pathway with measured units, lifetime and error bars,
rather than silently assigning physical units to toy grid sites.

## Rung 16: source-attested measurement evidence intake (NOT calibration)

R16 is an **in-browser, local-only evidence audit**, not a source
verification service or physics fitter. A submitter can paste or import a
JSON record claiming an experimental diffusion length, fluorescence lifetime,
or fluorescence quantum yield. Inputs must include:

- Versioned schema `altermath.bio-lattice.evidence.v1`.
- `classification`: `reported_experimental_measurement` or
  `synthetic_fixture` (the included demo is permanently a fixture).
- Safe dataset id; DOI-shaped reference and figure/section locator for
  reported measurements. A syntactically valid DOI is **not** evidence that
  the cited work actually contains the reported number.
- Material identity, preparation and conditions.
- 1..20 measurement records, each with observable, value, unit,
  uncertainty category and magnitude (or explicitly `not_reported` and
  `null`), and integer or missing (`null`) sample count.

The parser enforces an input size limit and strict known fields. The audit
converts **µm to nm**, **ns to ps**, and **percent to fraction** using
explicit dimensional factors. It retains the original value, original unit,
reported uncertainty category and sample count, flags missing information,
and exports an audit JSON file without network transfer. It does not compute
population confidence intervals, pool heterogeneous methods, fetch papers,
guess experimental error, or reproduce figures.

`sourceVerified` and `calibrationGate.allowed` are **always false** in R16.
The red gate lists the independent work that must precede physical
calibration: verify the primary source and measurement, derive a physically
defensible site-spacing/tick mapping, establish a mechanism for model
couplings, and repeat on truly independent measured holdouts.

The synthetic example intentionally contains *made-up numbers*. Its role is
to demonstrate parsing and unit conversion; it must never be cited as a
laboratory result. No real primary-source measurement values have been
transcribed or independently verified in this PR.

```sh
npm run test:bio-lattice --prefix site
npm run build --prefix site
```

Only the source-attested measurements workflow is new. R13/R14/R15
dimensionless experiments remain unchanged; their `axialSpreadSites`
results are **not** convertible to physical diffusion-length units.

## Rung 17: dimensional non-identifiability workbench

R17 is a read-only demonstration of why an experimental source report cannot
be used to infer toy-model site dimensions, timing or coupling automatically.
It is embedded inside the R16 evidence audit and uses the same validated
record. Editing the JSON invalidates the audit and hides derived values.

The displayed candidate families use two **unsupported hypothetical identities**:

1. If reported migration diffusion length L (nm) equaled time-specific toy
   Markov axial spread S (sites) multiplied by an unknown site scale a,
   the required value would be a = L/S nm/site. This equality is not
   established; different couplings generate different nonzero S values
   and require different hypothetical a values for the same L.
2. If a reported fluorescence lifetime T (ps) represented the same decay
   process as toy per-tick loss p, the required tick time would be
   dt = -T ln(1-p) ps/tick. Several positive loss values imply
   different hypothetical tick times. This equality is not established.

Zero coupling and zero loss produce *undefined* mappings, rather than
division by zero. If the R16 audit has no supported length or lifetime
observable, no matching scale is proposed. Users may select the exact
record when multiple observations of one type are present. A versioned
R17 JSON export records source classification, selected record IDs, all
toy parameters, the candidate families, and seven missing scientific
dependencies.

Neither unsupported identity is a calibration equation. The actual
diffusion-length observable may have a different definition from toy
axial spread. Fluorescence lifetime need not be related to toy loss.
No source is independently verified, no physical parameters are inferred,
no runtime controls are changed and the calibration gate stays closed.

To test: npm run test:bio-lattice --prefix site
To build: npm run build --prefix site

## Rung 18: paired multi-timepoint numerical model-discrimination challenge

The React Bio-Lattice Lab now includes an opt-in R18 experiment designed to
differentiate **three existing toy update rules**, not physical theories.

**Predeclared numerical protocol:**

1. Freeze the lattice geometry, coupling, disorder and loss, a chosen
   metric (`axialSpreadSites` or `effectiveSites`), and the reference
   model (synchronous Markov or sequential hopping). The phase-amplitude
   toy is the alternative model.
2. Use training seeds `startSeed + [0...N-1]` where N is 3, 6, or 9.
   At times **[0, 4, 8, 16, 32, 48, 64]** dimensionless ticks,
   calculate three-model trajectories across exactly the same training seeds.
3. Freeze the *nonzero* observation time with the greatest absolute mean
   paired training gap (phase-amplitude minus chosen reference).
   Break equal-score ties by the earliest eligible time.
4. Evaluate only that **one selected observation time** on 3, 6, or 9
   disjoint holdout seeds, offset by **20,011** from the training block.
   The holdout results cannot influence timepoint selection.
5. Record each paired signed gap, held-out mean, sign retention/reversal,
   and whether the held-out absolute mean crosses the **predeclared 0.2
   synthetic-unit descriptive magnitude**. The threshold is **not** a
   laboratory limit of detection, p-value, effect size estimate, or
   evidence of physical model discrimination.
6. Run two null checks on the held-out block: zero coupling and zero elapsed
   ticks. Every model must then yield the same observable. Check probability
   survival against the explicit per-step loss accounting.
7. Export the entire training time series, single held-out timepoint outcomes,
   seed provenance, assumptions, chosen metric/reference and controls as
   `altermath.bio-lattice.time-challenge.v1`.

**Critical scientific boundaries:** The R18 protocol is hard-coded and
reproducible but **not independently preregistered or time-stamped**.
The simulator's time ticks do **not** map to measured lifetimes, and the
illustrative lattice metrics do **not** map to real experimental observables.
A surviving numerical difference is not a quantum-biology result, nor a
device-design claim, nor an awareness verdict. R16 source verification and
R17 physical mapping gates remain closed.

Reproduction:

```sh
npm run test:bio-lattice --prefix site
npm run build --prefix site
node --input-type=module -e "import {runTimeChallenge} from './site/src/bioLatticeTimeChallenge.js'; console.log(JSON.stringify(runTimeChallenge(),null,2))"
```

The focused suite includes explicit regressions for infinite step counts,
zero coupling, zero time, disjoint train/holdout sets, frozen selection,
model trace fidelity and multiple metrics and baselines.

## Rung 19: laboratory assay handoff packet (draft, not an experiment)

R19 supplies a local, reproducible **protocol drafting and blinded-label
data-intake workflow**, not real measurements or independently preregistered
experimental evidence. It is not a secure randomization or blinding tool.

- Define a study identifier, one R16 physical observable and compatible unit,
  a draft number of replicates per group (3–12), and a deterministic
  illustration seed. These counts are **not** a statistical power analysis.
- Propose three control/preparation arms for *expert review* only:
  prepared microtubule sample; matched perturbed preparation; and matched
  reagent/buffer blank. Scientific appropriateness and preparation methods
  must be independently established before any physical experiment.
- Produce three *separate* JSON downloads: an **operator manifest** with
  anonymized sample IDs and station order, a **private assignment key**
  mapping IDs to proposed arms, and an **empty results template**.
  Do **not** give the private key to blinded operators or evaluators.
- Assignments use deterministic xorshift shuffling for illustration.
  An integer seed and an unencrypted key are **not secure or independent
  randomization**. An actual study requires independently operated
  assignment custody and an approved concealment mechanism.
- Results intake checks exact IDs, duplicates, collection states, valid
  observable/unit matching, finite values, uncertainty type and
  magnitudes, instrument trace references, and reasons for exclusion
  or absent signal. Uncollected and no-signal readings are preserved
  explicitly, **never silently treated as physical zero**.
- Results audit exports stay **blinded**: no condition labels or private
  assignment seed are included. No arm-level statistical comparison is
  attempted; a domain expert must predefine and externally register the
  appropriate analysis before collecting data.

Both `sourceVerified` and the `calibrationGate.allowed` flag remain false.
Passing the schema does not verify instrument output, optical methods,
scientific validity or the hypotheses in R13–R18. If the model is later
compared with real experiments, a separate independently reviewed
measurement mapping and blinded analysis protocol will be required.

Run `npm run test:bio-lattice --prefix site` and
`npm run build --prefix site` to reproduce the software checks.
