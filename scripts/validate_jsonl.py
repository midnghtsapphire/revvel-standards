#!/usr/bin/env python3
"""Validate JSONL files: one valid JSON object per line.

Usage:
    python scripts/validate_jsonl.py <file.jsonl> [<file.jsonl> ...]

Exit codes:
    0 - all files valid
    1 - one or more files invalid

For decisions.jsonl specifically, also validates the required schema:
    {"ts": str, "topic": str, "decision": str, "locked_by": str}
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REQUIRED_DECISION_FIELDS = ("ts", "topic", "decision", "locked_by")


def validate_file(path: Path) -> list[str]:
    errors: list[str] = []
    is_decisions = path.name == "decisions.jsonl"
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"{path}: cannot read file: {exc}"]

    for lineno, line in enumerate(raw.splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            obj = json.loads(stripped)
        except json.JSONDecodeError as exc:
            errors.append(f"{path}:{lineno}: invalid JSON: {exc.msg}")
            continue
        if not isinstance(obj, dict):
            errors.append(f"{path}:{lineno}: expected JSON object, got {type(obj).__name__}")
            continue
        if is_decisions:
            missing = [f for f in REQUIRED_DECISION_FIELDS if f not in obj]
            if missing:
                errors.append(
                    f"{path}:{lineno}: missing required fields: {', '.join(missing)}"
                )
    return errors


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: validate_jsonl.py <file.jsonl> [...]", file=sys.stderr)
        return 2
    all_errors: list[str] = []
    for arg in argv[1:]:
        all_errors.extend(validate_file(Path(arg)))
    if all_errors:
        for err in all_errors:
            print(err, file=sys.stderr)
        return 1
    print(f"OK: validated {len(argv) - 1} file(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
