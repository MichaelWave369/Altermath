# RM-369 E6: live regional orientation storage

Status: SIMULATED / authority NONE. This is a bounded nine-subtree
orientation store, not general data compression or a production runtime.

## Motivation

E5's green matched benchmark (run 45542051646) recorded dense-random
RA4 median seed-summary encode/decode totals of 364.60/606.21 ms
versus packed-buffer totals of 0.0774/0.0720 ms. RA4 matched the
packed snapshot size (24917 bytes) but maintained a sparse map
at runtime. This is shared CI hardware evidence, not a universal
performance ratio. E6 addresses the full-field conversion cost.

## Run

```sh
node --test tests/rm369-regional.test.mjs
node scripts/rm369-regional-study.mjs > rm369-e6-correctness.json
node scripts/rm369-regional-study.mjs --timed > rm369-e6-measurements.json
```

## Live representation

Depth 2..7. Root orientation stored separately; nine independent
root-child subtrees each have (9^(d-1)-1)/8 orientation nodes.
Global BFS ID mapping is a bijection: at level l>=1 the slot is
floor((id-N(l))/9^(l-1)), with N(l)=(9^l-1)/8; local index is
N(l-1) plus the remainder. Local reads/writes only touch one region.
Physical addresses and E2 gear semantics are unchanged.

A region has no payload when dormant, uses a Number-key Map when
sparse, and a genuine mutable 3-bit Buffer when packed. Promote at
ceil(20% nonzero) and demote at floor(10%); zero clears payload.
These thresholds are design defaults, not learned optimal values.
Hysteresis prevents repeated transitions around one threshold.
Transitions may scan or allocate an entire region; depth and
per-region storage are bounded. Only one level of regional partition
is implemented, not arbitrary recursive regional paging.

## RR6 wire representation

Header: ASCII RR6, depth byte, root orientation byte. Omit empty
regions. In strictly increasing physical slot order, each nonempty
region contains one slot byte, one mode byte (1 sparse, 2 packed),
four-byte unsigned big-endian length, and payload. Sparse entries
are strictly sorted fixed-width local IDs and nonzero orientation
bytes; packed uses E4's bit ordering. Select the smaller payload,
tie to sparse. All six-byte per-region headers count toward sizes.
Canonical decoder reconstructs state and requires byte-identical
re-encoding, rejecting noncanonical modes and nonzero padding.

Wire representation and live representation are distinct. Restoring
a snapshot reconstructs live mode from density, not from history.
Hysteresis state is not serialized, so only the logical orientation
state and canonical bytes, not live mode history, round-trip exactly.
RM1 export/import preserves the exact previous contract. Snapshot
format is experimental and not accepted directly by existing RM2/RM3
consumers; use RM1 export at that boundary.

Packed regions are written directly to packed snapshot payloads when
the canonical wire mode is packed. Restore still reconstructs records
and verifies canonical encoding, so costs remain measurable and may
be slower than direct conventional packed buffers.

## Experimental design

Tests cover exhaustive address mapping at bounded depths, mixed
regional modes, independent mode transitions and hysteresis, RR6/RM1
round trips, RM2 gear equivalence, malformed and noncanonical input.
A mixed fixture fills one depth-six region and changes one node in a
second, yielding 2788 RR6 bytes (including headers), versus 24917
RA4 bytes. This is a fixture expectation verified by the new test,
not a measured general advantage.

The study reruns all five E5 workload definitions with the same three
seeds and four E5 baselines, adding the regional field as a fifth
backend. Every read and every restored node is checked against an
independent byte-array oracle; state hashes compared at every
checkpoint. Warm-up and three rotated timed repetitions; all raw
measurements and summaries retained in CI artifacts. No timing
thresholds or automated winner declarations. E6 does not measure
peak heap or report a new memory delta for its regional backend.
No comparison with a tuned radix tree yet; next experiments should
include it and regional indexing overhead under deeper branching.

No existing RM1, RA4, ABL, Codex or PocketMesh code modified.
No physical holography, neural weight compression, historical proof,
authenticated authorization or measured production performance.
