#!/usr/bin/env python3
"""Validate wr/memory/decisions.jsonl.

Ensures every non-empty line is a valid JSON object matching the decision
schema: {ts, topic, decision, locked_by}. Intended for use as a pre-commit
hook or CI check to prevent malformed entries from being merged.

Exit code 0 on success, 1 on validation failure.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REQUIRED_FIELDS = ("ts", "topic", "decision", "locked_by")
DEFAULT_PATH = Path(__file__).resolve().parent / "decisions.jsonl"


def validate(path: Path) -> list[str]:
    errors: list[str] = []
    if not path.exists():
        return [f"{path}: file does not exist"]
    with path.open("r", encoding="utf-8") as fh:
        for lineno, raw in enumerate(fh, start=1):
            line = raw.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError as exc:
                errors.append(f"{path}:{lineno}: invalid JSON ({exc.msg})")
                continue
            if not isinstance(obj, dict):
                errors.append(f"{path}:{lineno}: expected JSON object")
                continue
            missing = [f for f in REQUIRED_FIELDS if f not in obj]
            if missing:
                errors.append(
                    f"{path}:{lineno}: missing required fields: {', '.join(missing)}"
                )
    return errors


def main(argv: list[str]) -> int:
    paths = [Path(p) for p in argv[1:]] or [DEFAULT_PATH]
    all_errors: list[str] = []
    for p in paths:
        all_errors.extend(validate(p))
    if all_errors:
        for e in all_errors:
            print(e, file=sys.stderr)
        return 1
    print(f"OK: validated {len(paths)} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
