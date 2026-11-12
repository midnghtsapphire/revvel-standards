"""Load config/dspy-gepa.yml. The file is the GEPA settings the owner runs."""

from __future__ import annotations

from pathlib import Path

import yaml

from dspy_gepa.versions import PROTECTED_NAMES  # write-target guard below


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def config_path() -> Path:
    return repo_root() / "config" / "dspy-gepa.yml"


def load_config(path: Path | None = None) -> dict:
    target = path or config_path()
    data = yaml.safe_load(target.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("GEPA config must be a mapping: {0}".format(target))
    prompts = data.get("prompts") or []
    if len(prompts) < 1:
        raise ValueError("GEPA config lists no prompts")
    output = Path(data["versions_output"]).name
    if output in PROTECTED_NAMES:
        raise ValueError("versions_output must not be a source prompt file")
    if data.get("auto") not in {"light", "medium", "heavy"}:
        raise ValueError("auto must be light, medium, or heavy")
    return data
