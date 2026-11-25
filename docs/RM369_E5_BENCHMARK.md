# RM-369 E5: matched orientation-store benchmarks

Status: SIMULATED / authority NONE. E4 is merged and its verification
workflows passed. This benchmark concerns finite D4 orientation state,
not general information compression or a live PocketMesh deployment.

## Reproduce

```sh
node --test tests/rm369-benchmark.test.mjs
node scripts/rm369-benchmark.mjs > rm369-correctness.json
node --expose-gc scripts/rm369-benchmark.mjs --timed > rm369-measurements.json
```

## Frozen comparison

Four backends: ordinary BigInt-key sparse Map serialized to RM1; a
conventional 3-bit packed Buffer; a conventional byte-per-node Buffer;
and the same BigInt-key sparse Map with adaptive RA4 snapshot encoding.
The two map backends share their mutable representation deliberately:
RA4 adapts the snapshot, not live memory. The baseline packed/byte arrays
use a simple five-byte header; RM1 and RA4 use their actual headers.
All four expose the same orientation read, write, snapshot and restore
operations. No gear receipts are timed; these are storage-layer operations.

Five scenarios, seeds 369/636/963, 12 checkpoints per trace, 512 reads
per checkpoint and 128 writes except threshold oscillation (one write).
Dormant is initially empty and writes zeros; sparse-random starts at 1%
modified, dense-random at 90%, clustered at 5% with low-ID locality,
and depth-four threshold oscillation alternates 100/101 modified nodes.
Depth six has 66,430 orientation nodes. Random draws are deterministic
xorshift fixtures, not a representative production distribution.
Each backend receives exactly the same initial state and trace.
An independent byte-array oracle checks every read and every node
after each restore; output includes state and snapshot SHA-256 digests.

## Measurements

Untimed mode is deterministic and checks correctness, snapshot size,
and representation changes. Timed mode warms up each trace once per
backend, then runs three repetitions with rotated order. Report retains
every sample and medians of total read, update, encode and decode batch
times, not per-operation tail latency. Snapshot encode/decode are
separate measured stages. Workload generation, oracle checks, hashing
and JSON reporting are outside timed intervals.

With --expose-gc, samples include process heapUsed, arrayBuffers and RSS
deltas before/after constructing the initial store, with forced GC at
both boundaries. These are noisy process-level estimates in a shared
process, not exact object sizes, peak memory or isolated measurements.
Negative deltas remain visible. Runtime/platform and CPU metadata are
reported. No timing thresholds and no automated winner declaration.
A five-byte dormant snapshot does not imply five bytes of live memory.

CI retains the full JSON measurements artifact for inspection. Shared
CI hardware is noisy; repeat on dedicated hardware before promotion.
No timings have been asserted in this document. No GPU, network,
neural inference, regional paging, physical holography or history claims.
Next gate: compare regional representations and radix-tree baselines
only after reviewing the negative controls and measured costs.
