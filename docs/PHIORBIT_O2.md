# PhiOrbit O2: exact 3D cube gears

Status: SIMULATED / authority NONE. Independent exact permutation
experiment, not an integrated scheduler or physical cube simulation.

## Run

```sh
node --test tests/phiorbit-cube.test.mjs
node --input-type=module -e "import {studyCube} from './src/phiorbit-cube.mjs'; console.log(JSON.stringify(studyCube(), null, 2))"
```

## State and frames

Coordinates x,y,z are integers 0..2, ID x+3y+9z. A rotation maps a
source position to a destination using right-handed quarter turns
about the centered axis. Frame IDs enumerate the 24 proper rotations
by BFS starting with identity and generators x,y,z in that order.
A frame maps physical coordinates into view coordinates. The observer
uses its inverse to read physical labels. Frame rotation changes
the view, whole rotation actively permutes all 27 labels, and a
layer rotation permutes one nine-position slice. Active edits are
always specified in physical axes, not view-relative axes.

QC2 is 31 bytes: ASCII QC2, one frame ID, 27 distinct labels 0..26
in physical position order. This is a labeled position permutation,
not the full Rubik's cube group with per-cubie sticker orientations.
The center of a selected layer stays fixed during a quarter turn;
the remaining eight positions move. Whole quarter turns move 24
positions. Every operation preserves the permutation of labels, not
arbitrary 3D magic sums.

A program of at most 4096 operations consumes one abstract fuel unit
per operation. All operations validate before execution; input bytes
are immutable. Exact inverse program reverses operation order and
replaces each turn count t with 4-t. Restore applies to the exact
output, not arbitrary intervening states. Receipts contain snapshot
hashes, ordered steps, inverse program and SHA-256 checksum of the
deterministically ordered JSON fields. Replay compares the full
output and receipt. This is not authenticated authority.

## Nested addresses and causality

Nested paths of at most 64 slots use BigInt IDs with child =
27*parent+1+slot. transformPath maps each digit through the same
observer frame, without allocating or moving nested payloads.
Actual recursive 3D storage and child-specific frames are future work.
The existing RM1 and RR6 nine-way field formats are unchanged.

footprint supplies the physical positions a layer or whole operation
may access, or a separate frame flag. Disjoint slices commute;
intersecting slices can be noncommutative. A future O1 compiler must
track overlapping footprints, not just identical target IDs, and
frame reads/writes separately. O2 does not change O1 itself.
All active edits use physical coordinates, so active edits commute
with observer-only frame updates in this model.

## Tests and controls

24 frames, 576 compositions, 13824 associativity triples, positive
handedness, all axis/slice inverses, disjoint and intersecting slices,
observer/active-state ambiguity, exact mixed inverse, nested address
round trips and malformed inputs. A separate arithmetic check found
24 frames, closed all 576 pairs, and found seven differing positions
when swapping two perpendicular slice quarter turns.
No claims about neural inference, faster computing, physical
holography or arbitrary-information compression.
