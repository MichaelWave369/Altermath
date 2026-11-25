"""Generate wire fixtures with the actual pinned CODEX implementation."""

import json
import sys

from codex.rm369_gears import execute
from codex.rm369_sparse import SparseField

results = []
for case in json.load(sys.stdin):
    field = SparseField(case["depth"])
    for path, gear in case["entries"]:
        field.set_orientation(tuple(path), gear)
    snapshot = field.encode()
    output, receipt = execute(snapshot, case["operations"], fuel=case["fuel"])
    results.append({"input": snapshot.hex(), "output": output.hex(), "receipt": receipt})
json.dump(results, sys.stdout, separators=(",", ":"))
