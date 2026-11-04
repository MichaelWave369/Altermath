# Hypercube Phase Lab · Altermath Rung 3

## Why this exists

Salvador Dalí's 1954 painting *Crucifixion (Corpus Hypercubus)* depicts Christ before the **unfolded net of a four-dimensional hypercube** (tesseract). Dalí's own interests combined mathematics and religion. The painting is a **cultural inspiration**, not evidence that its underlying geometry is a mechanism of consciousness or hidden physical dimensions.

**Historical source references:**

- The Metropolitan Museum of Art, [*Crucifixion (Corpus Hypercubus)*, accession 55.5](https://www.metmuseum.org/art/collection/search/488880).
- The Met, [Salvador Dalí: interpretation of the unfolded hypercube](https://www.metmuseum.org/fr/perspectives/salvador-dali).
- Fundació Gala–Salvador Dalí, [catalogue record P 681](https://catalogues.salvador-dali.org/catalogues/en/heritageobject/89-58f5/).

## Geometry: two cubes and an additional adjacency relation

A 4D hypercube has **16 vertices and 32 edges**. Its graph Q4 connects two binary 4-tuples whenever they differ in exactly one coordinate. If we group its vertices by the value of the fourth coordinate, we get two copies of the 3D cube graph Q3: each has 8 vertices and 12 edges. Eight further edges connect the corresponding vertices between the two cubes.

**Crucial distinction:** a 2D drawing or 3D net of the tesseract is not itself 4D space. The eight cross-layer graph edges are genuine topological relationships in a mathematical 4D object. The Altermath *junction* is our **software interpretation of permission-controlled cross-boundary communication**, not an extra vertex, extra physical dimension or supernatural portal.

## Phase model

We use a discrete **Kuramoto-type oscillator model** on this graph, not a quantum field model. Each node i has a phase θᵢ and intrinsic angular frequency ωᵢ. At each step of duration Δt:

    θᵢ(t+Δt) = wrap[θᵢ(t) + Δt(ωᵢ + K/dᵢ Σⱼ Aᵢⱼ sin(θⱼ-θᵢ))]

Here K is coupling strength and dᵢ is the number of *currently permitted* neighbors. If dᵢ=0, the coupling contribution is zero. The connection matrix Aᵢⱼ is symmetric. All phase updates use the previous timestep (simultaneous Euler update).

The global order parameter is

    R = |(1/N) Σᵢ exp(iθᵢ)|

R ranges from 0 to 1: values near 1 indicate aligned phases; values near 0 indicate their complex unit vectors nearly cancel. Neither outcome implies awareness, agency, or consciousness. The transfer diagnostic sums |K Δt sin(θⱼ−θᵢ)| for active cross-bubble edges. It is not physical energy or a conserved quantity.

## The Horos / Altermath intervention

- **Horos closed:** remove edges crossing between the two eight-node groups. The two bubble groups continue to evolve internally.
- **Altermath open:** permit those cross-group edges again, allowing their phases to influence one another.

This is a computational analogy with the Valentinian idea of a limiting boundary. It does not assert that ancient sources proposed dynamic oscillator coupling.

## Controlled baselines

All three network topologies have 16 nodes, 32 undirected edges, degree 4 at baseline, identical intrinsic frequencies, initial phases and step size:

1. **Tesseract Q4:** binary-coordinate adjacency (8 cross-boundary links).
2. **Circulant:** each vertex is linked to vertices ±1 and ±4 modulo 16.
3. **Rewired 4-regular:** seeded, degree-preserving edge swaps from Q4 with connectivity validation.

The CLI benchmark starts with boundaries open; closes them at tick 40 and reopens them at tick 90; and runs through tick 240. Results depend on seed, gain, frequencies and topology. **Importantly, the number of cross-group edges varies across baselines**, so any performance difference can reflect both topology and the number of blocked/restored links; these are exploratory controls, not fully matched causal experiments.

Use:

    npm run phase:benchmark
    npm run phase:benchmark -- 123 300
    npm run check
    python -m http.server 8080

Open `http://localhost:8080/phase.html` to use the interactive controls.

## Falsifiable engineering questions

- Can permission-controlled boundary links enable measurable phase synchronization across otherwise isolated groups?
- How does the Q4 topology compare with alternative equal-degree graphs under identical initial conditions?
- Which observed differences persist when we also control cross-boundary edge counts and distributions?
- Can we adapt a nested bubble communication system to use phase-inspired scheduling without losing safety, control or performance?

The final two questions remain **future work**. Any claims about extra dimensions, sentience, spirituality, or physics require independent evidence; this numerical software experiment cannot settle them.
