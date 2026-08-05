#!/usr/bin/env python3
"""Standalone audit-chain verifier. Exit 0 = intact, 1 = tampering detected."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from revvel_ops.audit import verify_chain, verify_dir  # noqa: E402
from revvel_ops.config import Settings  # noqa: E402


def main(argv: list[str]) -> int:
    if len(argv) > 1:
        reports = [verify_chain(Path(argv[1]))]
    else:
        reports = verify_dir(Settings.load().storage.resolved()["audit_dir"])
    if not reports:
        print("no audit files found")
        return 0
    print(json.dumps(reports, indent=2))
    return 0 if all(r["ok"] for r in reports) else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
