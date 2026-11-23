# COSMO-02 / Altermath R30 · Identity, Transfer, and Explicit Child Containers

**Scope:** SIMULATED / authority NONE. **E2 is a deterministic token/graph bookkeeping experiment**, not a general-relativistic cosmology, evidence for multiverses, black-hole filaments, white holes, inflation, cosmic reproduction, new physical conservation laws, or consciousness.

## Core question

When two bounded domains interact, what distinguishes:
1. no interaction;
2. a rearrangement *within* existing domains;
3. an interdomain transfer with no new domain; and
4. the deliberate creation of a new *addressable child container* from existing resources?

The answer is defined operationally, rather than inferred from visual similarity to cosmology images.

## Deterministic finite E2 model

Eight persistent **tokens**, with unique IDs \`A0..A3\` and \`B0..B3\`, each hold one binary **signal** 0 or 1. The 256 input masks equip all initial signals with exact uniform prior weight. Initial domains \`A\` and \`B\` each own four tokens.

All actions are deterministic permutations/moves of already existing tokens. Total token count = **8** and total number of 1-valued signals remains unchanged. These are **software-defined census invariants**, not a derivation of physical energy conservation. A zero-valued token is still one token (one slot), so "birth" is available under approval for all 256 states irrespective of signal values.

| Operation | Token movement | Domain count | Permission |
|---|---|---|---|
| hold | no change | 2 | default |
| transform | rotate A right and B left, locally | 2 | local operation |
| transfer | swap A's last token with B's first token | 2 | permission + contact + compatibility |
| birth | remove A's last and B's first tokens and place both in \`C@1\` | 3 | three gates + **separate operator-approved birth** + fixture enabled |

There is no automatic birth, no recursion beyond one fixed child, no background processes, and no network or external API calls. Default \`birth\` attempt fails closed until both simulated approvals are enabled.

\`cosmo02Advance(world, steps)\` rotates the tokens in each currently existing domain in place for 0–16 ticks. This is a **permutation**, not gravity, thermodynamics or temporal evolution of a cosmological metric.

\`cosmo02Merge(world, opts)\` is a separate, approved operation: if a live child with one original A token and one original B token exists, it relocates both back to the parent domains, retires the child container, and retains the lineage record. Merging after local rotations need not restore the **original order of all parent tokens**; it restores token provenance, inventory and preserved binary-signal tally.

The child lineage record names its two parents, \`A\` and \`B\`. There is one child at most, \`C@1\`; adding a domain does not add tokens. The child does not claim an emergent physical law or its own independently sourced matter.

## Keyhole challenge and exact census

The coarse observer sees only \`M=(count1(A),count1(B))\`, while the born child's signal count is \`Y=count1(C)\`.

In the approved birth condition, the child receives exactly \`A3\` and \`B0\`. Therefore \`Y=A3+B0\` is a fully deterministic function of these two original endpoint signals.

Calculate:
- \`H(Y|M)\`, with two parent totals only;
- \`H(Y|M,A3)\`, with one additional raw bit;
- \`H(Y|M,A3,B0)=0\`, with both donor bits;
- a witness of two original states with the same two parent totals but different child signal counts.

These are **Shannon conditional entropies under the enumerated toy prior**, not thermodynamic entropy or creation of information. Observers with more signals can predict an inherited configuration better, not because a multiverse was discovered.

The other three modes have no child; "child entropy" is **not** spuriously plotted as if missing child data were a numerical signal. Instead the census reports state permutations, changed parent signals and new-child cases across all 256 masks.

## Falsification controls and refusal tests

- 256 masks × 4 operations must preserve exactly eight distinct token IDs and the initial number of 1-valued signals.
- Closed permission/contact/compatibility gates must reject transfer or birth while leaving tokens untouched.
- \`birth\` must additionally require \`operatorApproved:true\` and \`creationEnabled:true\`.
- Unique token census must reject forged new IDs, duplicated IDs, lost tokens and altered signal values.
- A successful \`merge\` must preserve provenance and retire, not erase, the child's historical ancestry.
- The result must be fully deterministic and reveal all four mode outcomes, including non-creation and refusals.
- A coarse-equivalence witness must be independently replayable.
- Null controls must retain two domains and no lineage.

## How to run

Node 20+; no third-party packages or credentials required for the core:

\`\`\`sh
node --test tests/cosmo02.test.js
node scripts/cosmo02-benchmark.mjs
npm test
\`\`\`

The command emits a JSON record of all four modes, exact conditional entropy values, a witness and a SHA-256 digest of the deterministic report. A digest is only a reproducibility receipt, not a truth guarantee.

**React research console:** \`site/src/CosmoBirthLab.jsx\`, mounted at \`/Altermath/#cosmo02\` once GitHub Pages deploys the merged site:

\`\`\`sh
npm install --prefix site
npm run test --prefix site
npm run build --prefix site
\`\`\`

The page provides source-bit toggles, an explicit mode choice, permission switches, a birth approval fixture, tick controls, merge approval, before/after domains, all-case census, integrity checks and JSON export.

## Relationship to COSMO-01 and NBG

COSMO-01's **majority-update** law is different and does **not** preserve the count of 1-valued bits. COSMO-02 deliberately uses permutation-based operations whose conservation properties can be checked exactly. Comparing these two models does **not** establish that "birth" results from COSMO-01 dynamics.

NBG is the proposed protocol and evidence home; this Altermath module is the isolated E2 implementation. No live PhiMemory9 write, neural-agent routing, PocketMesh, PhiKernel, gravity solver or external data connection occurs.

**Next scientific gates:** (1) replace convenient fixed endpoints by preregistered randomized and matching-budget alternatives; (2) test real graph-structure/lineage problems where new domain management may improve a specified capability; (3) separately reproduce a published physical cosmology from equations/units/observations. None is demonstrated here.

**Reference:** [COSMO-01 method](cosmo01.md) and its companion NBG ledger. The physics-literature links there concern *different theoretical models* and are not evidence for the COSMO-02 software metaphor.
