# Pleroma Network Model · Rung 2

**Research question:** Could the *relationships* attributed to one historical Valentinian Pleroma account provide a useful, falsifiable topology for a bounded computational network?

This repository **does not** claim that ancient Gnostic writers anticipated network engineering, or that a toy diffusion model is a physical Pleroma. All equivalences between the religious account and computer mechanisms are **deliberate analogies**.

## Source-critical historical layer

The dataset in [`src/pleroma-data.js`](../src/pleroma-data.js) follows **Irenaeus, *Against Heresies*, Book I, chapter 1**. Irenaeus was criticizing Valentinian teaching; his report is not a neutral source and does not represent every Valentinian or Gnostic system.

- [Primary text: Irenaeus, I.1](https://www.newadvent.org/fathers/0103101.htm) documents a 30-Aeon system split into Ogdoad (8), Decad (10) and Duodecad (12), arranged as 15 paired syzygies.
- [Primary text: Irenaeus, I.2](https://www.newadvent.org/fathers/0103102.htm) describes Sophia, her desire to comprehend what was beyond her, and Horos (limit/boundary) separating her disturbed intention and restoring her place.
- [Modern access to the text at CCEL](https://ccel.org/ccel/irenaeus/against_heresies_i/anf01.ix.ii.ii.html) notes variations in the underlying accounts; neither the names nor the topology should be presumed universal.

### Recorded groupings

| Group | Pairs from the reported scheme |
| --- | --- |
| Ogdoad (8) | Bythus/Sige; Nous/Aletheia; Logos/Zoe; Anthropos/Ecclesia |
| Decad (10) | Bythius/Mixis; Ageratos/Henosis; Autophyes/Hedone; Acinetos/Syncrasis; Monogenes/Macaria |
| Duodecad (12) | Paracletus/Pistis; Patricos/Elpis; Metricos/Agape; Ainos/Synesis; Ecclesiasticus/Macariotes; Theletos/Sophia |

Some terms are also used as epithets elsewhere in the narrative (for example, *Monogenes*). Within the recorded 30-name table, the Decad member is disambiguated by its source group, not counted twice.

The recorded **pair-level lineage** used for this experiment is:

- Bythus + Sige → Nous + Aletheia;
- Nous + Aletheia → Logos + Zoe;
- Logos + Zoe → Anthropos + Ecclesia and all five Decad pairs;
- Anthropos + Ecclesia → all six Duodecad pairs.

An arrow in this paragraph represents *reported emanation*, **not** a proven or explicitly specified information channel.

## The explicitly modeled layer

The software creates 30 scalar-state nodes from the historical names and 15 undirected syzygy links (one per pair). It maps each parent→child *pair relationship* to **two communication edges**, one joining the first members and one joining the second. That latter mapping is **ours**, not described in the source. It yields 15 + (14 × 2) = **43 edges**.

The peers in this simulation have state sᵢ ∈ [0,1], and each tick uses normalized symmetric diffusion:

    flow(j→i) = gain × (sⱼ − sᵢ) / max(1, degree(i), degree(j))
    sᵢ(t+1) = sᵢ(t) + Σ flow(j→i)

All flows are calculated simultaneously from the old state. In the absence of explicitly introduced shocks, the total scalar signal Σsᵢ is conserved to floating-point precision. No processing speed, biology, consciousness or physical dimension is inferred.

### Horos access rules (our invented policy)

Horos is **modeled as a rule**, not as a 31st Aeon. Requests from Sophia to Bythus/Sige are denied; the Sophia↔Theletos repair route is authorized. This is an intentionally minimal demonstration of protected boundaries, not an exhaustive mapping of the historical Horos narrative.

### Sophia disruption (our invented fault)

The scenario injects **+0.5** scalar signal into Sophia and disables the Sophia–Theletos syzygy. A denied crossing to Bythus changes no node state or network edge. Authorized repair restores the broken pair link. The historical source makes **none of these specific computational claims**.

### Conventional baselines

All three topologies have 30 nodes, the exact same 15 syzygies, **43 starting links**, identical per-node starting states, the same fault, the same access denial, and the same repair schedule.

| Topology | Remaining 28 edges |
| --- | --- |
| Valentinian-inspired | 28 parent→child pair links, as modeled above |
| Ring + shortcuts | 15 pair-anchor ring edges plus 13 skip links |
| Seeded random | 14 connected-tree links between pairs and 14 seeded extra links |

**Important confound:** Equal node and edge counts do *not* imply equal degree distributions, link lengths, latency, or processing overhead. Outcomes describe this toy topology, not a universal advantage. A future rung should compare degree-preserving random rewires and measure actual communication cost.

## What to measure

- **Pair difference:** absolute state difference |sₛₒₚₕᵢₐ − sₜₕₑₗₑₜₒₛ|.
- **Variance:** variance of all 30 scalar states.
- **Components:** number of connected components in the active undirected graph.
- **Recovery tick:** first tick after authorized pair restoration when pair difference falls below 0.05, or no recovery during the horizon.
- **Conservation:** total scalar signal absent an explicit fault injection.

Run [`pleroma.html`](../pleroma.html) through a static web server or run the exact seeded comparison with:

```sh
npm run pleroma:benchmark
npm run pleroma:benchmark -- 212 150 25
npm run check
```

## Falsification and next steps

If the historically inspired graph performs no better than a conventional graph on a stated benchmark, preserve that result. If it performs better, compare its **degree distribution** and topology before attributing an improvement to anything unique to the historical pattern. Expand to latency-weighted edges, adversarial permissions, multi-state nodes, provenance-linked variations, and phase-coupled oscillators as separate experiments.

## Our Altermath interpretation

An individual relation can be treated as an **Altermath junction**; the full graph as a metaphor for a **Pleroma-like connected whole**. A whole may be nested as a bounded subsystem within a larger graph. This is a useful design language, not the original historical meaning of Pleroma.
