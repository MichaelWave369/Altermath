#!/usr/bin/env python3
"""Real PhiKernel relational-router smoke via synthetic local-only warrants.

This helper issues NO credentials for remote use. Its mock issuer exists only
inside this deterministic offline demonstration and must never be promoted
to a trusted external authority.
"""
from __future__ import annotations
import json
from pathlib import Path
import re
import sys


def main() -> int:
    if len(sys.argv) != 4:
        raise ValueError("usage: evaluate-phikernel.py PHIKERNEL_ROOT ROUTE_KEY allow|deny")
    root = Path(sys.argv[1]).expanduser().resolve(strict=True)
    route_key = sys.argv[2]
    mode = sys.argv[3]
    if not re.fullmatch(r"[a-zA-Z][a-zA-Z0-9_.:-]{0,191}", route_key):
        raise ValueError("invalid route key")
    if mode not in {"allow", "deny"}:
        raise ValueError("invalid test mode")
    if not (root / "src" / "phikernel" / "relational_router.py").is_file():
        raise ValueError("PhiKernel source checkout not found")
    sys.path.insert(0, str(root / "src"))

    from phikernel.relational_router import (
        RelationalRoutingRequest, RouteCandidate, route_relational
    )
    from phikernel.warrant import Warrant

    actor = "altermath:local_demo"
    warrant = Warrant.issue(
        issuer="altermath:synthetic_fixture",
        bearer=actor,
        scopes=("observe:junction",) if mode == "allow" else ("read:memory/*",),
        issued_at=100.0,
        lifetime_seconds=100.0,
    )
    candidate = RouteCandidate(
        route_key=route_key,
        actor_id=actor,
        operation="observe",
        target="junction",
        warrant=warrant,
        base_cost=1.0,
        capability_tags=("summarize",),
    )
    request = RelationalRoutingRequest.create(
        required_capabilities=("summarize",), requested_at=120.0
    )
    receipt = route_relational(request, [candidate], now=120.0)
    result = receipt.evaluations[0]
    print(json.dumps({
        "selected_route_key": receipt.selected_route_key,
        "authority_change": receipt.authority_change,
        "evaluation": {
            "route_key": result.route_key,
            "admissible": result.admissible,
            "hard_block_reasons": list(result.hard_block_reasons),
        },
        "fixture": "SYNTHETIC_LOCAL_ONLY",
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"PhiKernel fixture failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        raise SystemExit(2)
