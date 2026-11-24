# AQD-E2.1 · Figure 1 field transcription correction

The published Figure 1 caption specifies field components on [0, pi/(5 sqrt(3))], not [0, pi/sqrt(3)]. See https://doi.org/10.1038/s41586-022-04853-4 and the accessible caption at https://www.researchgate.net/publication/362145286_Dynamical_topological_phase_realized_in_a_trapped-ion_quantum_simulator. E2 inadvertently omitted the factor five. The published default is corrected; legacyE2 reproduces the mistaken scale exactly, including the random draws. The preprint option is retained as an earlier-convention sensitivity control, not the experimental figure. The final supplementary file has not been fully audited in this rung. Public figure data are catalogued at https://doi.org/10.5281/zenodo.6514878; no data fitting or direct figure-data comparison has been performed.

## Executed results
Eight previously specified seeds, six qubits, J=.95pi, 55 layers; same disorder uniforms and eight sampled product states per axis:
- Corrected Fibonacci mean aligned edge .831138 vs legacy .111838; final .632719 vs -.109094.
- Exact basis (64 states per axis per seed) corrected: Fibonacci mean aligned edge .828651, bulk .076454, final edge .623329; alternating .628848/.078896/.045722; shuffled .669879/.174771/.197467; noAKLT .461439/.453767/-.265139.
- Sampled edge RMSE versus exact across both axes, all nine times, four drives, eight seeds: 8 samples .029662; 32 .013885; 128 .008616. Sampling with replacement; nested sample prefixes. No inference of monotonic convergence for arbitrary seeds.

Independent local NumPy dense unitary calculation for seed 369 at layer 55, exact basis: aligned edge X .7779098660293067, Z .6933914942357782. JS .7779098660292995 and .693391494235772; agreement within 8e-15. This verifies those two endpoints, not an exhaustive cross-engine execution. The Python audit script additionally supports full per-site comparison against exported 4/6-qubit runs; run it in CI or locally. The numeric improvement is a correction to our model, not a new discovery or proof of topological order. Controls and ideal-limit caveats from E2 apply.

## Reproduce
`node scripts/aqd-field-audit.mjs > e21.json`
`OPENBLAS_NUM_THREADS=1 python scripts/aqd_reference.py e21.json > python-audit.json` (NumPy required)
`node --test site/tests/aqdSourceCircuit.test.js site/tests/aqdFieldAudit.test.js`

E2.2: audit full supplement and source data, construct the actual distinct Floquet circuit, extend to ten qubits, add explicit noise channel and uncertainty. Keep ABL/NBG operational integration closed.
