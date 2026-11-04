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

**Future:** optional adapters for NBGPocketMesh, PhiKernel, PhiServe, PhiShare and CompAware, without forcing those repos to depend on Altermath.

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
