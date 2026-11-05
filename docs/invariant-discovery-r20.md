# Rung 20 — Representation-Invariant Discovery Lab

**Status:** implemented, deterministic synthetic mathematical benchmark; independent code review and browser validation pending.

**Question:** When a bounded structure is described with different symbols and data representations, which measurable properties remain unchanged, and when do incomplete descriptions create false equivalences?

**Not a finding of new mathematics.** R20 applies known graph invariants and an exact small-graph isomorphism reference. The "discovery" is controlled selection among four explicitly authored descriptors, not an autonomous AI generating hypotheses.

## Contract and hypothesis

- Objects: finite, undirected, loop-free, simple graphs of 6 or 8 vertices.
- Representations: an edge list, a symmetric 0/1 adjacency matrix, and an undirected neighbor list.
- Allowed invariances: arbitrary bijective vertex relabeling; changing between these encodings.
- Reference question: do two graph views encode isomorphic graphs?
- Oracle: exact backtracking bijection checking all pairwise adjacency relationships, bounded to at most 8 vertices.
- Hypothesis: a coarse invariant can create false equivalences between nonisomorphic graphs.
- First falsifier for a signature's sufficiency: any nonisomorphic pair with an equal signature.
- First falsifier for representation invariance: an isomorphic pair whose signature changes after relabeling or re-encoding.
- This does NOT measure a model's mathematical understanding, establish a new theorem, or make a physical claim.

## Frozen fixture families

Every seed produces eight paired challenges (four positive, four negative):

| Same-structure positive | Different-structure negative | Why useful |
|---|---|---|
| Six-cycle vs relabeled six-cycle | Six-cycle vs two disjoint triangles | Same vertex/edge counts and degree multiset; different components and triangles |
| K3,3 vs relabeled K3,3 | K3,3 vs triangular prism | Both connected, six vertices, nine edges, cubic degree; triangles differ |
| Six-vertex path vs relabeled path | Six-vertex path vs six-vertex star | Same edge count but different degree patterns |
| Cube graph Q3 vs relabeled cube | Cube Q3 vs eight-vertex Möbius ladder | Both connected, cubic, eight vertices, twelve edges, triangle-free; four-cycle counts differ |

Graphs are relabeled using a seeded Fisher–Yates permutation. The left and right encodings always differ, rotating through lists, matrices, and neighbors. The generator checks intended labels against the exact isomorphism oracle and throws on disagreement.

Candidate methods receive only representations, not family names or intended answers. Descriptive labels and oracle results remain in the benchmark for later review. This is representation-blind testing, not a double-blind study.

## Predeclared candidates

Each method outputs a vertex-label-invariant signature. A candidate predicts equivalence whenever the signatures match:

1. **edge-count**: vertex and edge count.
2. **degree**: above plus sorted degrees.
3. **triangles**: above plus component and triangle counts.
4. **four-cycles**: above plus distinct undirected four-cycles, computed from common-neighbor pairs.

A signature collision does not prove graph isomorphism. The exact bounded reference instead searches for a bijection preserving adjacency.

## Split and selection

- Training seeds are consecutive starting at a base seed (default 369).
- Holdout seeds start exactly 10,000 higher and cannot overlap training.
- Methods, fixtures, and tie rules are fixed before evaluation.
- Select the highest **training** accuracy, then fewest training false matches, then declared method order.
- Only after locking the training choice does the study score the separate holdout.
- All methods' holdout confusion counts are retained, including unfavorable outcomes.
- The API accepts one to nine seeds per split. The browser exposes 3, 6, and 9.

**Major limitation:** holdout seeds change relabeling and serialization, not the underlying graph families. Good holdout scores do not establish generalization to unseen graph structures, new mathematics, or AI understanding.

## Run locally

Node.js 22+ is recommended for the existing React build.

    node --test site/tests/invariantDiscovery.test.js
    node scripts/r20-discovery.mjs 369 3 6 > r20-synthetic-receipt.json
    npm install --prefix site --no-audit --no-fund
    npm run test --prefix site
    npm run build --prefix site
    npm run check

Browser: open the Altermath React page and navigate to the **Invariants** section. Choose seed/split sizes, run the explicit experiment, and export full JSON containing all serialized graph pairs, oracle answers, predictions, and aggregate confusion counts. No remote API is called.

R20 adds a pure graph core, a React panel and stylesheet, deterministic tests, a command-line runner, and this protocol. Earlier labs remain present.

## Proposed interoperability, not yet connected

- **Langarian Math:** package hypotheses with exact operator contracts and declared falsifiers.
- **NestedBubbleGear:** use Keyhole as an analogy for incomplete observables, not physical evidence.
- **PhiRSI:** test genuinely generative discovery methods against conventional algorithms with unseen families.
- **PhiTriBrain369:** preserve attributed evidence and append-only review.
- **PhiMathAtelier / ProofArcade:** visualize or teach validated mathematical relationships.

No live cross-repository interfaces, physical sensors, AI theorem generators, or proof assistants are shipped by R20.

## Next research gate

R21 could include entirely unseen graph families, adversarial serialization mutations, and one explicitly bounded proposal-generating system with audited input access. Compare it against exact isomorphism and established graph algorithms. Any novelty claim requires literature review and independent mathematical proof.

**Never interpret a passing synthetic fixture as evidence of new physical laws or a universal solver.**
