#!/usr/bin/env python3
"""
project-router / detect.py — Mālama project-type router.

Inspects a working directory, decides which "shape" it is (per
standards/shapes/), and prints which master docs an agent should load into
context at session start: always the Mālama system prompt, plus the matching
shape standard, plus the repo rules.

Zero dependencies (stdlib only) so the open-core engine stays portable.
The routing table below mirrors routes.yml (kept in sync for human editing).

Usage:
    python3 detect.py [path]           # human-readable
    python3 detect.py [path] --json    # machine-readable for hooks
"""

from __future__ import annotations
import json
import os
import sys
import glob

# --- Routing table (mirrors routes.yml) -----------------------------------
# Each shape: signals that score points, and the docs to load when it wins.
# Higher score wins; ties broken by PRIORITY order (earlier = stronger).

MALAMA_PROMPT = "skills/malama/SYSTEM_PROMPT.md"
REPO_RULES = "AGENTS.md"

PRIORITY = ["mcp", "skill", "cli", "api", "app", "data", "pdf", "infra"]

SHAPES = {
    "mcp":   {"standard": "standards/shapes/MCP.md",   "label": "MCP server"},
    "skill": {"standard": "standards/shapes/SKILL.md", "label": "Agent skill"},
    "cli":   {"standard": "standards/shapes/CLI.md",   "label": "CLI tool"},
    "api":   {"standard": "standards/shapes/API.md",   "label": "API service"},
    "app":   {"standard": "standards/shapes/APP.md",   "label": "Full app"},
    "data":  {"standard": "standards/shapes/EXCEL.md", "label": "Data / spreadsheet"},
    "pdf":   {"standard": "standards/shapes/PDF.md",   "label": "PDF / booklet"},
    "infra": {"standard": "standards/DOCKER.md",       "label": "Infrastructure"},
}

FALLBACK = {"standard": "standards/shapes/README.md", "label": "Generic (no clear shape)"}


def _exists(root: str, *names: str) -> bool:
    return any(os.path.exists(os.path.join(root, n)) for n in names)


def _glob(root: str, pattern: str) -> list[str]:
    # recursive=True so the "**" segment actually expands into nested dirs
    # (root/**/<pattern> also matches root-level files, so this covers both).
    return glob.glob(os.path.join(root, "**", pattern), recursive=True)


def _read(root: str, name: str) -> str:
    try:
        with open(os.path.join(root, name), encoding="utf-8") as fh:
            return fh.read()
    except OSError:
        return ""


def _pkg_json(root: str) -> dict:
    raw = _read(root, "package.json")
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def detect(root: str) -> dict:
    """Return {shape, score, matched[], load[]} for the directory at root."""
    root = os.path.abspath(root)
    scores: dict[str, int] = {k: 0 for k in SHAPES}
    matched: dict[str, list[str]] = {k: [] for k in SHAPES}

    pkg = _pkg_json(root)
    deps = {}
    if pkg:
        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    pyproject = _read(root, "pyproject.toml") + _read(root, "setup.py") + _read(root, "requirements.txt")

    def hit(shape: str, points: int, why: str) -> None:
        scores[shape] += points
        matched[shape].append(why)

    # MCP
    if _exists(root, ".mcp.json") or os.path.isdir(os.path.join(root, "mcp-servers")):
        hit("mcp", 3, ".mcp.json / mcp-servers present")
    if "@modelcontextprotocol/sdk" in deps or "mcp" in pyproject.lower().split():
        hit("mcp", 3, "MCP SDK dependency")

    # SKILL
    if _glob(root, "*.skill.yml") or _exists(root, "SKILL.md"):
        hit("skill", 3, "*.skill.yml / SKILL.md present")

    # CLI
    if isinstance(pkg.get("bin"), (str, dict)):
        hit("cli", 3, "package.json 'bin' entry")
    if "[project.scripts]" in pyproject or "console_scripts" in pyproject:
        hit("cli", 3, "python console_scripts")
    if _exists(root, "Cargo.toml") and "[[bin]]" in _read(root, "Cargo.toml"):
        hit("cli", 2, "Cargo [[bin]]")

    # API
    api_deps = {"express", "fastify", "koa", "@nestjs/core", "fastapi", "flask", "django", "starlette"}
    if api_deps & set(deps):
        hit("api", 3, f"web-server dep ({', '.join(sorted(api_deps & set(deps)))})")
    if any(d in pyproject.lower() for d in ("fastapi", "flask", "django", "starlette")):
        hit("api", 3, "python web framework")
    if _glob(root, "openapi*.y*ml") or _glob(root, "swagger*.*"):
        hit("api", 2, "openapi/swagger spec")

    # APP
    app_deps = {"next", "react", "react-dom", "vue", "svelte", "@angular/core", "nuxt", "@remix-run/react"}
    if app_deps & set(deps):
        hit("app", 3, f"frontend framework ({', '.join(sorted(app_deps & set(deps)))})")
    if _exists(root, "index.html") and not (app_deps & set(deps)):
        hit("app", 1, "index.html")

    # DATA
    if _glob(root, "*.ipynb"):
        hit("data", 2, "jupyter notebook")
    if _glob(root, "*.csv") or _glob(root, "*.parquet") or _glob(root, "*.xlsx"):
        hit("data", 2, "tabular data files")
    if {"pandas", "numpy", "polars"} & set(k.lower() for k in deps):
        hit("data", 1, "data dependency")

    # PDF
    if _glob(root, "*.tex") or os.path.isdir(os.path.join(root, "booklet")):
        hit("pdf", 3, "LaTeX / booklet source")

    # INFRA
    if _exists(root, "Dockerfile", "docker-compose.yml", "compose.yaml"):
        hit("infra", 2, "Dockerfile / compose")
    if _glob(root, "*.tf"):
        hit("infra", 2, "terraform files")

    # Pick winner
    best = max(PRIORITY, key=lambda s: (scores[s], -PRIORITY.index(s)))
    if scores[best] == 0:
        shape, info, why = "generic", FALLBACK, ["no strong signals"]
    else:
        shape, info, why = best, SHAPES[best], matched[best]

    load = [MALAMA_PROMPT, info["standard"], REPO_RULES]
    return {
        "shape": shape,
        "label": info["label"],
        "score": scores.get(best, 0),
        "matched": why,
        "load": load,
        "all_scores": {k: v for k, v in scores.items() if v},
    }


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--json"]
    as_json = "--json" in sys.argv
    root = args[0] if args else "."
    result = detect(root)

    if as_json:
        print(json.dumps(result, indent=2))
        return 0

    print(f"Detected shape: {result['label']} ({result['shape']}, score {result['score']})")
    print("Matched signals:")
    for w in result["matched"]:
        print(f"  - {w}")
    print("\nLoad these into context at session start:")
    for path in result["load"]:
        tag = ("base agent prompt" if path == MALAMA_PROMPT
               else "repo rules" if path == REPO_RULES else "shape standard")
        print(f"  - {path:<34} ({tag})")
    if result["all_scores"]:
        print(f"\n(other candidates: {result['all_scores']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
