#!/usr/bin/env python3
"""Detect L1 / third-party source files in a changed-path list.

Reads standards/l1-source-registry.json if present, otherwise uses built-in
defaults. Writes GitHub Actions outputs. Always exits 0; the workflow decides
whether to warn or fail.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

BUILTIN = {
    "ignore_paths": [
        "standards/l1-source-registry.json",
        "standards/SEARCH_AND_SOURCING.md",
        "docs/governance/SEARCH_AND_SOURCING.md",
        "docs/DATA_SOURCES.md",
        "DECISIONS.md",
        "PRIVATE_DATA_NOTICE.md",
        "AGENTS.md",
        ".github/workflows/l1-material-warning.yml",
        "scripts/detect-l1-material.py",
    ],
    "path_substrings": [
        "GORILA",
        "RILA-S1",
        "RILA_S1",
        "RILA S1",
        "lineara.xyz",
        "lineara_xyz",
        "lineara-xyz",
        "LinearAInscriptions",
        "linearb.xyz",
        "LinearBInscriptions",
        "mnamon",
        "SigLA",
        "sigla_crops",
        "sigla-private",
    ],
    "filename_regexes": [
        r"(?i)GORILA-Vol.*\.pdf$",
        r"(?i)EtCret.*\.pdf$",
        r"(?i)RILA.*\.pdf$",
    ],
}


def load_registry() -> dict:
    path = Path("standards/l1-source-registry.json")
    if not path.is_file():
        return BUILTIN
    data = json.loads(path.read_text(encoding="utf-8"))
    for key in ("ignore_paths", "path_substrings", "filename_regexes"):
        data.setdefault(key, BUILTIN[key])
    return data


def is_ignored(path: str, ignore_paths: list[str]) -> bool:
    norm = path.replace("\\", "/")
    for item in ignore_paths:
        item = item.replace("\\", "/")
        if norm == item or norm.endswith("/" + item):
            return True
    return False


def matches(path: str, registry: dict) -> bool:
    norm = path.replace("\\", "/")
    name = norm.rsplit("/", 1)[-1]
    lowered = norm.lower()
    for token in registry["path_substrings"]:
        if token.lower() in lowered:
            return True
    for pattern in registry["filename_regexes"]:
        if re.search(pattern, name):
            return True
    return False


def changed_paths() -> list[str]:
    raw = os.environ.get("CHANGED_FILES", "").strip()
    if raw:
        return [line.strip() for line in raw.splitlines() if line.strip()]
    if len(sys.argv) > 1:
        return sys.argv[1:]
    return []


def write_output(key: str, value: str) -> None:
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as fh:
            if "\n" in value:
                fh.write(f"{key}<<EOF\n{value}\nEOF\n")
            else:
                fh.write(f"{key}={value}\n")
    else:
        print(f"{key}={value}")


def main() -> int:
    registry = load_registry()
    paths = changed_paths()
    hits = [
        p
        for p in paths
        if not is_ignored(p, registry["ignore_paths"]) and matches(p, registry)
    ]
    is_private = os.environ.get("REPO_PRIVATE", "false").lower() == "true"
    write_output("count", str(len(hits)))
    write_output("private", "true" if is_private else "false")
    write_output("matches", json.dumps(hits, ensure_ascii=True))
    if hits:
        print("L1 / third-party path matches:")
        for p in hits:
            print(f"  - {p}")
    else:
        print("No L1 / third-party source files in the changed paths.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
