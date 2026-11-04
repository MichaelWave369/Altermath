# Altermath

**Where bounded systems meet, relationships become computation.**

Altermath is a research-first, MIT-licensed framework exploring **consequential junctions between nested bounded systems**. Its first experiment is a dependency-free interactive browser simulator, where each bubble carries state, nested bubbles exchange signals through permitted interfaces, and independently bounded bubbles can establish new relationships when they meet.

> **Five define expression. The sixth defines consequential connection.**

## Quick start

No package installation needed. Requires Node.js 20+ for tests.

```sh
npm test
npm run check
```

To run the visual simulator, serve this repository with any local static HTTP server:

```sh
python -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

> ES modules need an HTTP server, not a `file://` URL. GitHub Pages can serve this root `index.html` directly, with no build step.

## What to try

1. Run **Adaptive** mode: Bubble A contains five small nested functional bubbles; Bubble B approaches from outside. Watch for a new external junction.
2. Select **Fixed** and reset: pre-existing junctions remain, but the approaching neighbor does not gain a new link.
3. Select **Isolated** and reset: no coupling.
4. Use **Inject signal** and **Step once** to observe the measurable state-transfer traces and conservation check.
5. Change the coupling gain and compare aggregate transfer, state variance, and connection counts.

## Model and boundaries

The five outer functional abstractions are **Perception**, **Memory**, **Computation**, **Expression**, and **Regulation**. The **+1 Altermath Point** is an *eventful relation*, not necessarily a physical coordinate or central controller. A bubble may participate in multiple junctions; a higher-level bubble may contain more nested systems.

The term *Pleroma* ("fullness") from Valentinian Gnostic thought is an **inspiration for visualizing a connected relational whole**, not a claim of identity between theological Aeons and computer processes. See [Pleroma analogy](docs/pleroma-analogy.md).

This is an exploratory software pattern, **not** a discovered physical law, a proof of extra spatial dimensions, or a test of machine consciousness. The underlying diffusion process and graph are established modeling techniques; the novel proposal to evaluate is whether explicit, permission-aware adaptive junctions improve real use cases.

## Repository contents

- [Principle](docs/altermath-principle.md), [bubble layers](docs/nested-bubble-model.md), [math](docs/mathematical-foundations.md), [experiment plan](docs/experiment-design.md), [Pleroma analogy](docs/pleroma-analogy.md)
- [Pure simulation core](src/core.js) and [repeatable demo world](src/demo.js)
- [Interactive browser view](web/app.js) and [automated tests](tests/core.test.js)

## Roadmap

**Rung 1 (this PR):** formalism, simulator, tests and three controlled baselines.

**Rung 2:** reproducible seeded multibubble benchmarks, event log export, throughput/overhead measurement, topology stress-testing.

**Rung 3 (this PR):** 4D tesseract graph with phase oscillators, boundary gating, fault and repair experiments, and equal-degree graph baselines.

**Rung 4 (this PR):** offline, bounded Junction Contract modeling separation of NBGPocketMesh routing, PhiKernel hard admissibility and Altermath delivery.

**Future:** authenticated optional adapters for NBGPocketMesh, PhiKernel, PhiServe, PhiShare and CompAware, without forcing other repos to depend on Altermath.

## License

MIT. See [LICENSE](LICENSE).

## Rung 2: Pleroma Network Lab

The [Pleroma Network Lab](pleroma.html) explores one source-grounded Valentinian list of **30 Aeons in 15 syzygies** through a modern graph-and-diffusion experiment. It includes three equally sized topologies, Sophia fault injection, a Horos-like boundary check, authorized pair repair, and reproducible metrics.

- Browser: serve the repository root with `python -m http.server 8080` and open [http://localhost:8080/pleroma.html](http://localhost:8080/pleroma.html).
- CLI: `npm run pleroma:benchmark` (optional arguments: seed, steps, repair tick).
- Tests: `npm run check`.
- Source-aware explanation and caveats: [Pleroma Network Model](docs/pleroma-network-model.md).

*Historical names and pair-level parentage are sourced to Irenaeus; synthetic communication edges, shocks and access rules are explicit modeling choices.*

## Rung 3: Hypercube Phase Lab

[Open the Hypercube Phase Lab](phase.html) to explore an actual mathematical 4D hypercube **graph** (16 vertices, 32 edges) as two eight-vertex cube layers with eight cross-boundary links. Rotate its 2D projection, close/reopen a Horos-inspired boundary and observe a Kuramoto-type phase synchronization model.

- Browser: serve the repo root using `python -m http.server 8080` and open [phase.html](http://localhost:8080/phase.html).
- Tests: `npm run check`; repeatable comparison: `npm run phase:benchmark`.
- Compare tesseract Q4, a circulant ring-plus-chord graph and a seeded 4-regular rewired network, all with 16 nodes, 32 edges and matched starting state.
- [Math and limitations](docs/hypercube-phase-lab.md) document exactly what the simulation does and does **not** establish.

*Inspired by Salvador Dalí's 1954* Corpus Hypercubus. *No reproduction of the copyrighted painting appears in the simulator; mathematical connections and physics claims are kept distinct.*

## Rung 4: Junction Bridge Lab

[Open Junction Bridge Lab](junction.html) to simulate proposed cross-system contact under explicit routing, hard admissibility and boundary policy. Route advice cannot grant authority, and admission is rechecked at delivery.

- Browser: serve the repository with \`python -m http.server 8080\` then open [junction.html](http://localhost:8080/junction.html).
- Verify: \`npm run check\`; repeatable toy benchmark: \`npm run junction:benchmark\`.
- [Junction contract and integration limits](docs/junction-contract.md).

This is a **local deterministic test**, not a connected production bridge, authorization token, or cryptographically verified network protocol.

## Rung 5: Verified Local Interoperability

[Read the local integration guide](docs/verified-local-interop.md). This rung imports the **real NBGPocketMesh E0** routing and receipt-verification functions and runs **real PhiKernel** relational admissibility checks from local source checkouts. The signal remains synthetic and scalar-only; no live system authority, remote authentication or production bridging is implied.

- With neighboring checkouts and PhiKernel's local Python dependencies installed: \`npm run interop:smoke\`
- Core tests (without external checkouts): \`npm run check\`
- A separate GitHub Actions job tests pinned NBGPocketMesh and PhiKernel source revisions, including mesh receipt tampering, warrant refusal, and delivery-time revocation.

## Rung 6: Altermath Live · React research interface

**Threefold architecture:** Remembrance (3), Alignment (6), Return (9).
A modern symbolic interpretation inspired by the user-supplied social-media graphics, not a historical Gnostic doctrine.

The React front door hosts a deterministic 18-node Kuramoto-type oscillator model across three nested 3/6/9 rings. The Horos boundary switch enables/disables 12 cross-layer connections, with live coherence and event traces, controllable coupling, seeded fault injection and JSON export.

- Source code: [site/](site/), with pure model tests in [site/tests/](site/tests/).
- Research and source boundaries: [docs/threefold-architecture.md](docs/threefold-architecture.md).
- Local testing: `npm run test --prefix site`; build: `npm install --prefix site && npm run build --prefix site`.
- Deployment: [Publish Altermath Live](.github/workflows/pages.yml) builds the React site on `main` and retains earlier root labs at `lab.html`, `pleroma.html`, `phase.html` and `junction.html`.
- Expected Pages URL **after configuration and successful deployment**: https://michaelwave369.github.io/Altermath/

If GitHub Pages is not yet configured, set **Settings → Pages → Build and deployment → GitHub Actions** before running the workflow. Do not claim the site is live until the deployment succeeds.


## Aero-Alter Physics Department · Physics 01

[Explore Aero-Alter Physics](https://michaelwave369.github.io/Altermath/#aero-alter) in the React site after deployment. A separate physics track offers four SI-unit interactive stations: **Shakuna** (aerodynamic lift), **Rukma** (driven resonance), **Sundara** (rocket momentum) and **Tripura** (buoyancy). Each has slider controls, conceptual schematic diagrams, calculated outputs and a provenance-aware JSON export.

- [Methods and historical-source boundaries](docs/aero-alter-physics.md).
- [React station](site/src/AeroAlterLab.jsx), [physics calculations](site/src/aeroPhysics.js), [model tests](site/tests/aeroPhysics.test.js).
- Verify with `npm run test --prefix site` and `npm run build --prefix site`.

The names are documented in twentieth-century *Vymanika Shastra* literature. The shared "Victorist Collective" nineteenth-century aether blueprints are modern fictional artwork, not authenticated historical aircraft plans. No levitation or craft feasibility is claimed.

## Rung 7: Reproducible Threefold Experiments

[Open the controlled comparison methods](docs/threefold-benchmark.md).
The live React lab now compares the original 3/6/9 junction wiring with two
degree-preserving rewired networks and a separately labeled isolated control.
Replicated seeded trials, a deterministic disturbance/repair schedule, phase
traces and a full JSON export make results reproducible. No universal benefit
is assumed.

- CLI: \`npm run threefold:benchmark -- 369 9\`
- Pure model tests: \`npm run test --prefix site\`
- React build: \`npm run build --prefix site\` (after installing site dependencies)


## Rung 8: Junction Counterfactual Lab

After an identical 60-tick preparation and the same six-ring disturbance, the Rung 8
research core forks the oscillator state into one intact control, twelve separate
single-junction removals, and an all-off reference. It scores the **signed,
paired difference** in average phase coherence instead of treating every
junction as beneficial.

- **React interface:** a ranked but signed list of all 12 junction effects,
  selected-branch traces, 3/6/9-seed sweeps, and a complete JSON export.
- **CLI:** \`npm run junction:ablation -- 369 9\`.
- **Methods and caveats:** [Junction Counterfactuals](docs/junction-counterfactuals.md).
- **Tests:** \`npm run test --prefix site\` and the existing GitHub Actions React build.

These are reproducible simulations, not extra dimensions or consciousness tests.


## Rung 9: Budget-constrained junction selection

The new [selection methods and limitations](docs/junction-selection.md) test whether
Rung 8's signed removal effects can guide a k-link subset that generalizes to
**disjoint holdout seeds**. Learned, fixed, and shuffled methods all use the same
connection budget. Full and disconnected controls are explicitly unmatched.

- **CLI**: \`npm run junction:selection -- 369 6 9 9\`.
- **Tests**: \`npm run test --prefix site\`.
- **Live React**: A selectable budget, 3/6/9 train-and-holdout experiments,
  comparison traces, and complete evidence export.

The method is an offline fixed-subset heuristic, not online agent control.


## Rung 10 — adaptive junction controller (offline research)

[Controller methods and caveats](docs/adaptive-junction-controller.md) describe
a bounded, synthetic **online** controller. It compares present-state phase
scoring against a frozen trained subset, rotating-priority control, shuffled
static subset, and explicitly unmatched full/off references. All methods
respect a hard-coded synthetic permission revocation from tick 60 to 110.

- Run \`npm run junction:controller -- 369 6 9 9\`.
- Run \`npm run test --prefix site\`.
- The React dashboard displays signed holdout differences, switching costs,
  active-link budgets, policy windows and full JSON evidence.

This is not a connection to real network services or a grant of authority.


## Rung 11 — Locked-selection robustness matrix

The [Rung 11 study](docs/junction-robustness.md) fixes one Rung 8 trained
junction subset and tests the Rung 10 controller across weaker/stronger coupling,
early/late permission denial and three switching fees. It uses unseen holdout
seeds, all-sign comparisons, synthetic permission gates and a complete JSON
evidence export. The Aero-Alter Physics department remains independent.

- CLI: \`npm run junction:robustness -- 369 6 9 9\`
- Tests: \`npm run test --prefix site\`
- React: Five-profile × three-fee robustness matrix, to be published via GitHub Pages.

**Important:** This is a deterministic oscillator simulation, not an empirical
network performance test or a claim of new physics.
