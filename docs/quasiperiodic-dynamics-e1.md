# AQD-E1 · Raw grammar and error-stratified controls

E0 equalized symbol counts across different families by editing their words. E1 instead preserves each grammar exactly and compares it with three seeded Fisher–Yates shuffles of its own symbols. It asks whether order matters beyond the multiset, not which grammar is universally best. The periodic family also receives its own shuffles. Family-to-family counts need not match, so differences across families are descriptive, not direct head-to-head treatment effects.

## Fixed default design

- Families: periodic AABAABAB repeat, Fibonacci concatenation A/AB, Thue–Morse parity, alternating runs 3/6/9, nested fivefold toy substitution.
- Prefix lengths: 34, 55, 89. No edits, no wraparound assumption for the recursive words.
- Noise: none, static only, pulse jitter only, combined; E0 Hamiltonian unchanged. Draws are consumed identically in all modes, with inactive components zeroed. Same noise seed across each raw/control pair and across modes. Shuffles are held fixed across noise modes, with explicit seeds and words.
- Exploratory seeds 369, 636, 963; separate holdout seeds 1369, 1636, 1963, 2369, 2636, 2963. No tuning or winner selection within the study. All cells are reported. This is a fixed internal evaluation design, not externally preregistered research.
- 3 qubits, dimensionless noise amplitude .04 by default; configurable 2–6 qubits. At defaults: 60 conditions, 120 split rows, 540 seed-condition pairs, 2160 trajectories. Control draws per seed are not independent seed replicates.
- Primary descriptive endpoint: time-mean global quantum fidelity difference raw minus mean of the three shuffled controls. Secondary: classical alignment, noisy and clean edge distinguishability, edge penalty (noisy minus clean), interior distinguishability. The interior is not independently encoded.
- 512 deterministic bootstrap resamples of paired seed-level differences; empirical 2.5/97.5 percentile range (indices 12/499), wins/losses/ties with 1e-10 tolerance. Small sample, correlated cells, no multiplicity correction, no statistical significance or generalization claim. No seconds, no hardware calibration, no demonstrated topological protection.

## Default exploratory execution: held-out Fibonacci

| Ticks | Static mean delta | Jitter mean delta | Combined mean delta |
|---|---:|---:|---:|
|34|+2.157 pp|-0.095 pp|+1.655 pp|
|55|+5.369 pp|-0.229 pp|+4.941 pp|
|89|+7.273 pp|-0.245 pp|+6.350 pp|

All six held-out seeds have positive static-only deltas at each length, versus their own shuffle ensemble. Jitter-only means are negative at all three lengths. This is model-specific and not a comparison with E0's fixed periodic schedule. No external verification or theoretical prediction is claimed. Zero-error fidelity differences are numerical roundoff. These numbers are a computational smoke run of the implementation; rerun the CLI to reconstruct them.

## Reproduce

`node --test site/tests/quasiperiodic.test.js site/tests/quasiperiodicStudy.test.js`

`node scripts/quasiperiodic-study.mjs 3 .04 > aqd-e1.json`

React: #quasiperiodic-dynamics-e1 after merge/deployment. The browser permits one length and 2–4 qubits per run; CLI performs full matrix. Exports include raw words, control words, seeds, per-seed averages and bootstrap summaries. No full time traces in E1; E0 trial engine can regenerate them.

## Next

E2 must implement source-paper operators, observables and error model, verify against an independent reference and distinguish edge protection from generic decoupling. E1 does not modify ABL/NBG operational systems. Source: https://doi.org/10.1038/s41586-022-04853-4.
