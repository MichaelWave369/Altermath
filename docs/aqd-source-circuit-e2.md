# AQD-E2 · Source circuit reconstruction / replication gate

**Historical E2 record:** E2.1 corrected a factor-five field transcription error. The results below describe the original, now selectable `legacyE2` model. See [the correction and exact-basis audit](aqd-field-audit-e21.md) for current results.

Source: Dumitrescu et al., Nature 607, 463–467 (2022), DOI 10.1038/s41586-022-04853-4, Eq. 1 and Fig. 1; published manuscript https://www.osti.gov/servlets/purl/1974337 and preprint schematic https://arxiv.org/pdf/2107.09676 (p. 3). E2 incorrectly transcribed the final manuscript's field components as uniform on [0, pi/sqrt(3)] (correct: [0, pi/(5 sqrt(3))]), whereas the 2021 preprint describes magnitudes uniform on [0,4pi] with uniform directions. These are different ensembles. The corrected final-manuscript convention is now the default; the earlier law remains a sensitivity option. The preprint's F9=54 caption is inconsistent with the recursion; the final manuscript gives 55, used here.

## Circuit
Even L=4,6,8,10, open boundaries. Chronological word X, XZ, XZX, XZXXZ, concatenating current then previous (operator products act right to left). Each layer applies exp(-i J Pauli_a tensor Pauli_a /2) on zero-based bonds 0,2,...; same-axis disordered gates on bonds 1,3,... with K independently uniform [0,4pi]; then exp(-i B dot sigma /2) on each site. Disorder fixed for repeated X and Z layers, independently drawn for each axis and site/bond. J is specified as a fraction of pi. Field scale zero is an ideal-limit control, not the experimental protocol.

At Fibonacci layer counts 1,2,3,5,8,13,21,34,55, estimate infinite-temperature local autocorrelation C_a(t)=Tr(U† sigma_a U sigma_a)/2^L by evolving product eigenstates of sigma_a and averaging initial sign times final expectation. L=4 enumerates all 16 basis states; larger L samples uniform bit strings with replacement using explicit seed. This is a Monte Carlo estimator, not exact for larger L. Export every site, both signed edge averages and bulk averages, and parity-aligned values using the actual prefix's opposite-axis count. Controls: alternating XZ (unmatched symbol counts), seeded exact-count shuffle, and noAKLT (removed interactions, unmatched gate count). Alternating is NOT the paper's distinct Floquet circuit.

## Executed smoke results / non-replication
Eight synthetic disorder seeds (369,636,963,1369,1636,1963,2369,2636), L=6, eight product states per axis, J=.95pi, published field law. Mean parity-aligned correlations over both axes, seeds and nine times:

| Drive | Edge | Bulk | Last edge |
|---|---:|---:|---:|
| Fibonacci | .111838 | .008590 | -.109094 |
| Alternating | .072674 | .016588 | -.131102 |
| Shuffled | .155953 | .070918 | .110735 |
| No AKLT | .101712 | .061933 | -.075373 |

State norm error <= 1.94e-14 in this numerical run. Ideal J=pi/field=0 exact L=4 edge parity holds to numerical precision. **The reported persistent oscillations under disordered conditions are not reproduced in this small ensemble.** Do not infer topological protection from the ideal limit or from edge/bulk contrast. This is a source-inspired closed-system implementation and an unresolved replication attempt, not the published data, calibrated H1 noise, a topological invariant, or evidence of a physical second time dimension. The gate convention, field scale, sampling, disorder realizations and finite-size effects warrant further audit. No tuning to force agreement.

## Verify and reproduce
`node --test site/tests/aqdSourceCircuit.test.js`
`node scripts/aqd-source-circuit.mjs 6 .95 1 8 legacyE2 > aqd-e2.json`
The independent test oracle builds full complex Pauli matrices by Kronecker products for L=4, and checks the optimized gate action. Browser shows a single seed, 4/6 qubits, 8 product samples (exact basis at L=4), configurable field law and pulse strength. CLI supports 10 qubits. E0/E1 remain distinct.

## Next gate E2.1
Compare exact traces at small sizes against an independent scientific Python implementation; review final supplementary data and disorder conventions, increase samples and disorder ensemble; add the actual Floquet comparator and depolarizing channels separately. No operational scheduler changes.
