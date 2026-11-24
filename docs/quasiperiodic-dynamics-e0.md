# AQD-E0: Altermath Quasiperiodic Dynamics Lab

## Question

Can changing only the order of a matched multiset of noncommuting control operations improve retention under particular synthetic disturbances? A negative result is valid. The model is inspired by [Dynamical topological phase realized in a trapped-ion quantum simulator](https://doi.org/10.1038/s41586-022-04853-4) (Nature, 2022). This is NOT a reproduction of its trapped-ion Hamiltonian, experimental times, symmetry-protected phase, or an implementation of error correction. No physical extra time dimension is implied.

## Fixed E0 design

120 dimensionless ticks, exactly 75 A and 45 B per schedule. Periodic control repeats AABAABAB; random control uniformly shuffles the same multiset using a seeded PRNG (finite PRNG bias possible). Raw Fibonacci uses concatenation A, AB, ABA, ABAAB; Thue–Morse uses binary digit parity; 369 is a deliberately constructed sequence of A/B runs of lengths 3, 6, 9; nested is a toy fivefold substitution, not the actual NBG engine. The raw sequences are retained. For exact count matching, deterministic evenly distributed excess-symbol flips are applied where necessary; edit counts are exported. Thus the matched Fibonacci word is not the pristine infinite Fibonacci sequence, and edited Thue–Morse, 369 and nested words are not their original grammars. This is a limitation, not a hidden preprocessing step. Future E1 must compare raw words and count-matched randomized controls at multiple lengths.

Each tick uses Rx(pi) for A or Rz(pi) for B, on every qubit, followed by local Rx(0.11), Rz(0.17), and nearest-neighbor exp(-i 0.21 ZZ/2), in that order. Open chain, 2–10 qubits, all initially |0> except for a second state with the first qubit flipped. Noise is a shared seeded static offset e and independent per-site pulse jitter j, both uniform in [-noise,noise]; pulse angle receives e+j, drift Rx receives e/2, Rz receives e(q+1)/n. No noise in ZZ. The ideal reference uses identical schedule with all offsets zero. This is a coherent control-error ensemble, not a dissipative bath.

The separately simulated classical 3-vector uses corresponding ordinary rotations with the first site's noise, but without interactions; it is not a quantum advantage benchmark.

## Metrics

- Quantum global fidelity: squared absolute inner product between ideal and noisy state.
- Classical alignment: (1 + ideal dot noisy)/2.
- Edge memory proxy: trace distance between reduced edge qubit states from the two different initial conditions, equal to half the Euclidean distance of their Bloch vectors. Clean edge and noisy interior-site distinguishability are separate controls (the interior is not initially encoded).
- Norm error for every state. Per-step traces, all repeats, raw/matched schedules, seed and signed periodic deltas are exported.

Primary descriptive score is mean global fidelity across all ticks and paired seeds. No significance claims, optimized schedules, calibration or topology claims. Same trial seed/noise realization for all schedules. Default 369 / 4 qubits / 0.04 noise / 3 trials is exploratory, not external preregistration. All scores and losses remain visible.

## Run

`node --test site/tests/quasiperiodic.test.js`

`node scripts/quasiperiodic-demo.mjs 369 4 .04 3 > aqd.json`

React lab: #quasiperiodic-dynamics after merge and Pages deployment. UI caps qubits at 6 for responsiveness; CLI allows 10. Each simulation is CPU-only, offline and deterministic. Existing ABL/NBG/PocketMesh schedulers are not changed.

## Next gates

E1: unedited Fibonacci and matched-count shuffled controls over multiple lengths, separate static-only/jitter-only/no-error strata, paired uncertainty and disjoint holdout seeds. E2: implement the source paper's actual operators and observables with independent numerical oracle and boundary/bulk controls. E3: test whether a schedule policy helps a real memory workload with matched cost, without inferring quantum protection from classical performance.
