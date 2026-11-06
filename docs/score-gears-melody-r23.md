# R23 — Score, Gears, Bubbles, Melody

## Philosophical companion: the full score

[**The Unbroken Symphony — A Full Score in Nine Movements**](Altermath_The_Unbroken_Symphony_Full_Score.md) preserves the complete user-provided November 6, 2026 conceptual composition, including the overture, three acts, all nine movements, performance cues, refrains, the human orchestra, the canon table, and the proposed learner-transfer experiment. The work is **not** a literal playable music score and does not establish any physical or spiritual mechanism. The present R23 software station operationalizes only the narrow musical motif/transfer analogy from Movement IV and the gear alignment metaphor from Movement VI.

## Scope

This rung turns the musical metaphor into a **bounded, falsifiable software experiment**:

> AlterMath is the proposed score; gears represent timing and phase relationships; bubbles are independent encodings/instruments; the Spark is a name for the relational melody produced when the score is performed.

The above is a *philosophical interpretation*, not an empirical claim about souls, reincarnation, postmortem consciousness, quantum information or the universe being software. The actual R23 model has no brain, biology, physical bubble, awareness or life/death transition. It tests **musical information invariants** and an explicit synthetic interface rule.

The source is an original eight-event motif (relative semitone pitches and positive beat durations). Two performances are compared:
- A: reference pitches and timings, rendered with a sine tone.
- B: the same score re-rendered after global chromatic transposition, global duration scaling, and an optional controlled pitch mutation; its optional Web Audio timbre is triangle.

Instrument/timbre changes do not enter the identity metric. Web Audio synthesis is user-gesture-triggered, local, optional and plays only the authored motif. No samples, recordings, external services or listening data are used.

## Equations and definitions

For score S = ((p_0,d_0), ... , (p_7,d_7)) with semitone offsets p and beat durations d>0:

- Interval vector: I(S) = (p_1 - p_0, p_2 - p_1, ... , p_7 - p_6)
- Normalized rhythm: D(S) = (d_0/d_0, d_1/d_0, ... , d_7/d_0)
- Transfer-invariant candidate error:
  E(A,B) = sum_k |I(A)_k - I(B)_k| + sum_k |D(A)_k - D(B)_k|
- Declared signature pass: E < 1e-7

Transposition and global tempo rescaling preserve these two vectors; replacing an internal note's pitch generally breaks them. The signature is *intentionally coarse*: two different melodies could collide on this declared representation. It is not a universal identity detector.

Six synthetic gear teeth are compared with an implicit source timing phase of zero. For candidate offsets theta_k = offset + seeded_jitter_k, in radians:

- Alignment A = (1 + mean_k cos(theta_k))/2
- Relative phase coherence C = |mean_k exp(i theta_k)|

Important: C=1 for six perfectly equal offsets even when their common offset is 180 degrees and A=0. **Coherence is not alignment.** R23 uses A rather than C as the timing gate.

The "keyhole" is a deterministic AND policy:

    passed = boundary_open AND (E < 1e-7) AND (A >= threshold)

Default threshold is 0.85; this is a declared arbitrary interface policy, not a discovered physical constant. The alignment check operates on a toy one-time phase comparison, not a dynamical Kuramoto integration, and does not reproduce hardware synchronization.

## Interventions and negative controls

The React panel exposes transposition, duration scale, phase offset, phase jitter, one-note mutation, permission gate, and a selectable deterministic seed (369/963). The export carries all inputs, score events, signatures, phase offsets, metrics and failure reasons. The UI has no hidden classifier or remote input.

Predeclared controls:

1. **Same pattern**: transpose by +7 semitones, scale duration by 1.25, no mutation, aligned and permitted. E≈0, should pass.
2. **Altered score**: add one semitone to note 4. E>0; refusal despite aligned gears and open permission.
3. **Wrong phase**: shift six otherwise coherent timing teeth by 180 degrees. C≈1 but A≈0; refusal.
4. **Closed boundary**: exact score and aligned timing with permission closed; refusal.

Tests are in site/tests/scoreMelody.test.js; run:

    npm run test --prefix site
    npm run build --prefix site

The tests include fixed-seed repeatability, invariance across multiple key/tempo changes, independent negative controls, distinct coherence and alignment, strict parameter validation, and fail-closed policy.

## Interpretation and nonclaims

R23 makes a narrow, legitimate statement: *certain defined musical relationships are invariant under certain transformations*, and a toy interface can test them.

The following remain **untested** here:

- Transfer of conscious identity or subjective experience.
- Biological death, reincarnation, or continuity between bodies.
- A physical "code of life", literal bubble realities, divine language or a cosmic composition.
- Any claim that synchronized oscillators create experience or preserve personhood.
- A faithful mapping from music's melodic equivalence to psychological identity.

Related work: [Resonance, Skip & Runtime](resonance-skip-runtime.md), [Threefold architecture](threefold-architecture.md), [Nested bubbles](nested-bubble-model.md), [Hypercube Phase Lab](hypercube-phase-lab.md), and [Invariant Discovery R20](invariant-discovery-r20.md).

## Next experimental questions (not implemented)

Consider independent instrument and noise models, empirically sampled timing signals, imperfect score encoders/decoders, and information-theoretic transfer fidelity under predeclared controls. Keep spiritual interpretation separate from empirical evidence, and do not equate a matching fingerprint with continuation of subjective experience.
