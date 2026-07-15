#!/usr/bin/env python3
"""Validate JSONL files: one valid JSON object per line.

Usage:
    python scripts/validate_jsonl.py <file.jsonl> [<file.jsonl> ...]

Exit codes:
    0 - all files valid
    1 - one or more files invalid

For decisions.jsonl specifically, also validates the required schema:
    {"ts": str, "topic": str, "decision": str, "locked_by": str}
"""Validate JSONL files: one valid JSON object per non-empty line.

Usage:
    python scripts/validate_jsonl.py [path ...]

If no paths are given, validates all *.jsonl files under wr/memory/.
Exits 0 on success, 1 on any parse error.

Also enforces the decisions.jsonl schema when the filename matches:
required keys: ts, topic, decision, locked_by (all strings).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REQUIRED_DECISION_FIELDS = ("ts", "topic", "decision", "locked_by")
from typing import Iterable

DECISIONS_REQUIRED = {"ts", "topic", "decision", "locked_by"}


def iter_targets(argv: list[str]) -> Iterable[Path]:
    if len(argv) > 1:
        for a in argv[1:]:
            yield Path(a)
        return
    root = Path("wr/memory")
    if root.is_dir():
        yield from sorted(root.glob("*.jsonl"))


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
    if not path.exists():
        return [f"{path}: file not found"]
    is_decisions = path.name == "decisions.jsonl"
    with path.open("r", encoding="utf-8") as fh:
        for lineno, raw in enumerate(fh, start=1):
            line = raw.rstrip("\n")
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError as e:
                errors.append(f"{path}:{lineno}: invalid JSON: {e.msg}")
                continue
            if not isinstance(obj, dict):
                errors.append(f"{path}:{lineno}: expected JSON object, got {type(obj).__name__}")
                continue
            if is_decisions:
                missing = DECISIONS_REQUIRED - obj.keys()
                if missing:
                    errors.append(
                        f"{path}:{lineno}: missing required fields: {sorted(missing)}"
                    )
                for k in DECISIONS_REQUIRED & obj.keys():
                    if not isinstance(obj[k], str):
                        errors.append(
                            f"{path}:{lineno}: field '{k}' must be a string"
                        )
    return errors


def main() -> int:
    all_errors: list[str] = []
    targets = list(iter_targets(sys.argv))
    if not targets:
        print("no JSONL files to validate")
        return 0
    for t in targets:
        errs = validate_file(t)
        if errs:
            all_errors.extend(errs)
        else:
            print(f"OK {t}")
    if all_errors:
        print("\nValidation errors:", file=sys.stderr)
        for e in all_errors:
            print(f"  {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
    raise SystemExit(main())
