# PHI47-JUNC-R1 · Bounded junction exchange experiment

**SIMULATED / authority NONE.** Additive, isolated experiment. No network, actual agent execution, production PocketMesh routing, or claims about physical dimensionality.

Run `node --test tests/phi47-junction-r1.test.mjs` or `npm test` (Node >= 20).

Two bubbles each hold 47 bounded scalar pockets. Internal 8-neighbor circulant edges use strides 8/9/12/16, with symmetric diffusion. Nine optional cross-bubble teeth use fixed alignment or change alignment every four ticks. All updates are simultaneous from the previous state.

Modes: **isolated** (no cross-bubble links), **fixed** (constant nine authorized links), **adaptive** (nine links that reposition with time). Both boundaries must explicitly allow synthetic scalar.v1 exchange. Fail-closed inputs remain isolated. Every transfer has equal and opposite deltas and the total scalar is checked for conservation.

**Limitations:** adaptive has the same junction count as fixed but changes the wiring schedule, so a difference in mean gap is not automatically a universal efficiency improvement. No resource cost, latency, semantic messages, quantum mechanism, or real-world permission are represented. The test has no authorization to alter the existing Altermath engine or its R24-R28 research ledgers.

Compare equal-budget mode outcomes across many state priors, gains, delays and alternative graphs before drawing any generalization. This model is a read-only research candidate for a later cross-repository versioned adapter.
