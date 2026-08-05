#!/usr/bin/env python3
"""Demonstrate tamper detection: copy an audit file, edit a payload, re-verify.

Operates on a temporary copy only; the original audit log is never modified.
"""

from __future__ import annotations

import json
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from revvel_ops.audit import verify_chain  # noqa: E402
from revvel_ops.config import Settings  # noqa: E402


def main() -> int:
    audit_dir = Settings.load().storage.resolved()["audit_dir"]
    files = sorted(audit_dir.glob("*.jsonl"))
    if not files:
        print("no audit files; run scripts/run_demo.sh first")
        return 1
    src = files[-1]
    with tempfile.TemporaryDirectory() as tmp:
        copy = Path(tmp) / src.name
        shutil.copy2(src, copy)
        print("original:", verify_chain(copy)["ok"])
        lines = copy.read_text(encoding="utf-8").splitlines()
        record = json.loads(lines[-1])
        record["payload"]["tampered"] = True
        lines[-1] = json.dumps(record)
        copy.write_text("\n".join(lines) + "\n", encoding="utf-8")
        report = verify_chain(copy)
        print("after tamper:", report["ok"], report["errors"][:2])
        return 0 if not report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
