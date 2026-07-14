#!/usr/bin/env python3
"""Validate JSONL files under wr/memory/.

Usage:
    python wr/memory/validate_jsonl.py [path ...]

Exits non-zero if any line is not a valid JSON object. Intended to be wired
into a pre-commit hook so malformed decisions.jsonl entries cannot land on
main and corrupt the in-memory decision store that drives the $10M plan.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REQUIRED_FIELDS = {"ts", "topic", "decision", "locked_by"}


def validate_file(path: Path) -> list[str]:
    errors: list[str] = []
    if not path.exists():
        return [f"{path}: file not found"]
    with path.open("r", encoding="utf-8") as fh:
        for lineno, raw in enumerate(fh, start=1):
            line = raw.rstrip("\n")
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError as exc:
                errors.append(f"{path}:{lineno}: invalid JSON ({exc.msg})")
                continue
            if not isinstance(obj, dict):
                errors.append(f"{path}:{lineno}: expected JSON object, got {type(obj).__name__}")
                continue
            missing = REQUIRED_FIELDS - obj.keys()
            if missing:
                errors.append(f"{path}:{lineno}: missing required fields: {sorted(missing)}")
    return errors


def main(argv: list[str]) -> int:
    if len(argv) > 1:
        targets = [Path(p) for p in argv[1:]]
    else:
        targets = [Path("wr/memory/decisions.jsonl")]

    all_errors: list[str] = []
    for target in targets:
        all_errors.extend(validate_file(target))

    if all_errors:
        for err in all_errors:
            print(err, file=sys.stderr)
        return 1
    print(f"OK: validated {len(targets)} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
