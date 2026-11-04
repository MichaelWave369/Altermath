# 3 · 6 · 9: Threefold architecture as an Altermath experiment

**Status:** creative interpretation and runnable graph simulation; not a historical Gnostic doctrine or a discovered physical mechanism.

## The user-supplied images

A contemporary social-media graphic proposed three sections:

1. **3: Remembrance**, labeled *Herme-Noetic*, mind/knowing, associated with Nous, Logos, Gnosis and Idea.
2. **6: Alignment**, labeled *Theo-Sophia*, body/wisdom, associated with Theos, Sophia, Soma and Temperance.
3. **9: Return**, labeled *Testi-Amenti*, soul/witness, associated with Testimony, Witness, Remembrance and At-One-Ment.

The composite terms and numeric alignment have **not been established as a single classical teaching**. They bring together vocabulary with different intellectual, religious and historical backgrounds. The images are not attributed here as historical documents; their layout inspired the present contemporary model.

## The software analogy

| Symbolic interpretation | Operational analogue | Observations |
| --- | --- | --- |
| Remembrance (3) | Maintain and interpret local signal states | Per-node phases and first-ring order parameter |
| Alignment (6) | Regulate cross-boundary connections and exchange | Allowed inter-ring edges, coupling strength and disturbances |
| Return (9) | Measure coherence and preserve an event trace | Order parameter, ticks and downloadable trace JSON |
| Sixth Point | An authorized relational junction | Cross-boundary edge, not a new spatial coordinate |
| Horos | Boundary policy gating cross-ring edges | Open/closed, with internal ring links preserved |

## Actual model

The React visualization runs an 18-node graph with three rings containing 3, 6, and 9 oscillators respectively. Each ring has cyclic internal edges. Six cross-ring links join the 3- and 6-node rings, and six join the 6- and 9-node rings. All model states are deterministic from seed **369**.

For each node i, the phase evolves by a discrete Kuramoto-like rule:

    theta_i(t + dt) = wrap(theta_i(t) + dt * [omega_i + K/d_i * sum_j A_ij sin(theta_j - theta_i)])

where `K` is adjustable coupling strength, `d_i` is active degree, `A_ij` denotes an allowed connection, and `dt=0.05` in arbitrary simulation time units. Coupling is NOT a claim about a physical new dimension.

Coherence (synchronization order parameter) is computed as:

    R = abs((1/N) * sum_i exp(i * theta_i))

and lies in [0,1]. Higher R means greater phase alignment *within this toy oscillator model*, not more wisdom, awareness, life, or truth. The exchange index is a cumulative absolute phase-coupling diagnostic, not conserved physical energy.

## Reproducing

Run `npm run test --prefix site` for the zero-dependency deterministic model tests, and `npm install --prefix site && npm run build --prefix site` for the React build. Serve `dist` locally, or deploy the artifact using the included GitHub Pages workflow.

The Pages build preserves the previous root browser experiments at `lab.html`, `pleroma.html`, `phase.html`, and `junction.html`, with their original `src/`, `web/`, and `docs/` dependencies.

## Historicity and sources

The Greek words *nous*, *logos*, *gnosis* and *sophia* appear in different contexts across Hermetic, philosophical, and several early Christian/Gnostic texts. Classical Gnostic schools do not present one homogeneous cosmological system, and there is no demonstrated origin of this specific 3–6–9 sequence in the historical Pleroma.

Suggested independent background reading:
- Internet Encyclopedia of Philosophy, Gnosticism: https://iep.utm.edu/gnostic/
- Ismo Dunderberg, “Gnosticism and the Gnostics” (2021): https://www.helsinki.fi/assets/drupal/2022-03/I.Dunderberg_Gnosticism_Secret_Gospels.pdf
- Irenaeus, *Against Heresies*, book I: use alongside [the existing Pleroma model source notes](pleroma-network-model.md).
