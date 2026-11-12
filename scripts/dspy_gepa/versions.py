"""Append-only prompt versions in .github/agent-prompts.yml.

The writer adds list items under gepa_prompt_versions. It does not parse and
dump the file, because a dump would reorder the live prompt keys. Bytes that
were already in the file stay in front of the addition.

GOAP_AGENT_PROMPT.md and AGENT_BUILD_PROMPT.md are refused as write targets.
Optimized text is a new list item. The seed item is a copy of the source
file for versioning, marked status: seed, and is not an optimized prompt.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

PROTECTED_NAMES = frozenset({"GOAP_AGENT_PROMPT.md", "AGENT_BUILD_PROMPT.md"})
MARKER = "gepa_prompt_versions:"
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,80}$")


def guard_write_target(path: Path) -> None:
    if path.name in PROTECTED_NAMES:
        raise ValueError(
            "Refusing to write {0}. Optimized prompts are new versioned entries, "
            "not replacements of the source prompt.".format(path.name)
        )


def source_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _literal(text: str) -> str:
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n")
    if cleaned == "":
        raise ValueError("A version entry needs the instruction text")
    # Six spaces: the key `instructions` already sits at four spaces under the
    # list item, and a literal block's text has to be indented further than
    # that key or the next line is read as a new YAML key.
    indented = "\n".join("      " + line if line else "" for line in cleaned.split("\n"))
    return "    instructions: |\n" + indented + "\n"


def render_item(entry: dict) -> str:
    """One YAML list item. Field order is fixed so a diff of two versions is readable."""
    ident = entry["id"]
    if not ID_RE.match(ident):
        raise ValueError("version id must be lowercase letters, digits, and hyphens")
    status = entry["status"]
    if status not in {"seed", "optimized"}:
        raise ValueError("status must be seed or optimized")
    lines = [
        "  - id: {0}".format(ident),
        "    source: {0}".format(entry["source"]),
        "    source_sha256: {0}".format(entry["source_sha256"]),
        "    status: {0}".format(status),
        "    created: {0}".format(entry["created"]),
        "    optimizer: {0}".format(entry.get("optimizer", "none")),
        "    dspy_version: \"{0}\"".format(entry.get("dspy_version", "")),
        "    auto: {0}".format(entry.get("auto", "none")),
    ]
    if "quality_before" in entry:
        lines.append("    quality_before: {0}".format(entry["quality_before"]))
        lines.append("    quality_after: {0}".format(entry["quality_after"]))
        lines.append("    test_examples: {0}".format(entry["test_examples"]))
        lines.append("    regression: {0}".format("true" if entry["regression"] else "false"))
    if entry.get("note"):
        note = str(entry["note"]).replace("\n", " ")
        lines.append("    note: {0}".format(json.dumps(note)))
    lines.append(_literal(entry["instructions"]).rstrip("\n"))
    return "\n".join(lines) + "\n"


def append_version(path: Path, entry: dict) -> None:
    """Append one version. Raises if the existing prefix would change."""
    guard_write_target(path)
    original = path.read_text(encoding="utf-8") if path.exists() else ""
    original_nl = original if original.endswith("\n") or original == "" else original + "\n"
    item = render_item(entry)
    if MARKER not in original_nl:
        addition = (
            "\n# gepa_prompt_versions — append-only. WR #18338.\n"
            "# Source prompt files are read and never written.\n"
            "{0}\n".format(MARKER) + item
        )
    else:
        addition = item
    updated = original_nl + addition
    if original and not updated.startswith(original_nl):
        raise RuntimeError("refusing to write because the existing file prefix would change")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(updated, encoding="utf-8")


def has_version(path: Path, ident: str) -> bool:
    if not path.exists():
        return False
    return "\n  - id: {0}\n".format(ident) in path.read_text(encoding="utf-8")


def append_if_absent(path: Path, entry: dict) -> bool:
    if has_version(path, entry["id"]):
        return False
    append_version(path, entry)
    return True
