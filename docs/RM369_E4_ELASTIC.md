# RM-369 E4: adaptive pocket-state representation (RA4)

Status: SIMULATED / authority NONE. This is a lossless codec for the
existing finite D4 orientation family, not arbitrary-data compression,
a physical hologram or a demonstrated runtime improvement.

E3-A's merged RM1/RM2 implementation is reused without modification.
E3-B's two workflows passed on its pinned PR head
a317d7a0a3e212d09f4cdb2f4f5092f4e2856435; this stage does not modify
PocketMesh or Codex.

## Run

```sh
node --test tests/rm369-elastic.test.mjs
node --input-type=module -e "import {report} from './src/rm369-elastic.mjs'; console.log(JSON.stringify(report(), null, 2))"
```

## Format and canonical selection

All RA4 envelopes start with ASCII RA4, one depth byte (1..64), one
mode byte. Payloads:
- Mode 0: dormant; no records or payload, all orientations zero.
- Mode 1: sparse; an entire canonical RM1 snapshot including its header.
- Mode 2: packed; three bits per breadth-first orientation node,
  node zero first, bits least significant first within bytes.
  Unused final bits must be zero.

An empty state always uses mode 0. Otherwise, compare exact candidate
payload lengths, including the inner RM1 header. Choose packed only
when strictly smaller and at most one million orientation nodes.
Tie goes to sparse. Large packed allocations are deliberately refused.
RA4 decoding reconstructs canonical RM1 and requires byte-identical
RA4 re-encoding, rejecting noncanonical modes and nonzero padding.
RM1's existing bounds still apply.

## Examples (whole-field envelope, not per-subtree selection)

| Depth | Changed nodes | RM1 bytes | RA4 bytes | Mode |
|---:|---:|---:|---:|---|
| 2 | 0 | 8 | 5 | Dormant |
| 2 | 2 | 12 | 9 | Packed |
| 2 | 10 | 28 | 9 | Packed |
| 4 | 2 | 14 | 19 | Sparse |
| 4 | 100 | 308 | 313 | Sparse (tie) |
| 4 | 101 | 311 | 313 | Packed |
| 4 | 820 | 2468 | 313 | Packed |
| 12 | 2 | 20 | 25 | Sparse |

The adaptive envelope can be larger than the original RM1; do not hide
that negative result. At depth four there are 820 internal nodes;
a packed payload occupies ceil(820*3/8)=308 bytes. The sparse RM1
candidate is 8+3*k bytes. The crossover occurs at 101 changed nodes.

## Gear execution

executeAdaptive decodes RA4 to RM1, calls existing executeRM2, then
selects and encodes the output representation. The original RM2 receipt
remains bound to canonical RM1 bytes; separate input/output adaptive
digests bind the RA4 envelopes. Inverse operations reconstruct the
original canonical envelope exactly if applied to the exact output.
No change to the E2 state or physical address semantics.

## Boundaries and next gate

Codec selection is whole-field, not an in-memory regional or lazy
paging algorithm. Conversion scans records, allocates intermediate
buffers/maps and sorts sparse keys. No RAM, latency or I/O improvement
is established. Report records actual encoded byte lengths and exact
round trips; tests cover all bit alignments, depth 64 sparse addressing,
tie behavior, malformed payloads, and reversible mode changes.

E5 should benchmark identical update/read/snapshot workloads against
ordinary sparse maps and packed arrays, with measured latency and
heap cost, high-density and adversarial workloads. A later regional
codec can be evaluated separately with metadata and access overhead
included. No existing ABL, PocketMesh, manuscript or Codex behavior
is changed.
