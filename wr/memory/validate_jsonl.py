#!/usr/bin/env python3
"""Validate JSONL files: one valid JSON object per line.

Usage:
    python wr/memory/validate_jsonl.py [path ...]

Exits non-zero on the first invalid line, printing file:line and the parse error.
Intended for use as a pre-commit hook to prevent malformed entries in
wr/memory/decisions.jsonl and similar append-only memory stores.
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
                errors.append(f"{path}:{lineno}: invalid JSON ({exc.msg} at col {exc.colno})")
                continue
            if not isinstance(obj, dict):
                errors.append(f"{path}:{lineno}: expected JSON object, got {type(obj).__name__}")
                continue
            missing = REQUIRED_FIELDS - obj.keys()
            if missing:
                errors.append(f"{path}:{lineno}: missing fields {sorted(missing)}")
    return errors


def main(argv: list[str]) -> int:
    targets = argv[1:] or ["wr/memory/decisions.jsonl"]
    all_errors: list[str] = []
    for t in targets:
        all_errors.extend(validate_file(Path(t)))
    if all_errors:
        for e in all_errors:
            print(e, file=sys.stderr)
        return 1
    print(f"OK: {len(targets)} file(s) valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
