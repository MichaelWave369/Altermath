# RM-369 E3-A: pinned cross-language wire interoperability

Status: SIMULATED / authority NONE. Independent JavaScript consumer of
Codex RM1 snapshots and RM2 gear programs. No live ABL or PocketMesh
routing integration. No manuscript content is distributed.

Reference: [Codex E2 exact green revision](https://github.com/MichaelWave369/Codex/tree/9907e78332c4eda24cc09e8d9933dba6e31bbdcd).
At development time this revision is a PR head, not confirmed on main.
The dedicated workflow checks out that immutable revision explicitly.
Do not silently substitute another revision.

## Run

```sh
node --test tests/rm369-interop.test.mjs
RM369_CODEX_PATH=/path/to/pinned/Codex/src node --test tests/rm369-interop.test.mjs
```

The second invocation runs the real Python producer using the declared
checkout; the ordinary JS-only suite skips that one cross-language test.
CI sets the environment and runs both. No Python packages are required
by the producer. The oracle uses Codex's actual SparseField and execute
functions, rather than a copied formula or fabricated golden receipt.

RM1 stores depth and sorted nonzero orientations at physical integer
node IDs. JS uses BigInt for keys, including depth 64. RM2 preserves
E2's active local edit semantics, step fuel, exact inverse ordering,
canonical JSON SHA-256, and explicit lack of authority. The verifier
replays the supplied input and program and compares the entire output
and receipt, rather than accepting a self-consistent checksum alone.
These are not authenticated receipts or a permission system.

Five paired cases include noncommuting root operations, descendant
preservation, depth 12, depth 64 and a zero-fuel empty program. CI
compares input bytes, output bytes and every receipt field. JS-only
checks include group laws, inverse restoration, malformed snapshots,
invalid paths, insufficient fuel and altered receipts.

This is a wire-format bridge, not a benchmark: encoding and decoding
scan the sparse snapshot and output generation sorts the records.
The next E3-B gate is a separately implemented PocketMesh observation
contract with explicit grants, bounded probes and stale input refusal;
compare it against a direct sparse-map baseline. Existing ABL, causal
belt and PocketMesh behavior is untouched. No claims about physical
holography, model compression or performance.
