# Skill: Project Router — Auto-Load the Right Master Docs by Project Type

**Skill Name:** `project-router`
**Version:** 1.0.0
**Date:** 2026-06-20
**Status:** Beta
**Category:** Agent Operations
**Type:** Session-start detector — runs once, decides what to load

---

## Purpose

At session start, **detect what kind of project the agent is in** and load the
matching playbook — so the agent reads the *right* standard instead of every
standard. It is the auto-detect front end for the **Solution-Shape Router**
already described in `standards/shapes/` and `AUTOMATED_PRODUCT_PIPELINE.md`.

Every project loads the **Mālama** system prompt as a base; on top of that the
router adds the one `standards/shapes/*` doc that matches the detected shape,
plus the repo rules (`AGENTS.md`).

> This is the answer to "depending on project type, trigger a different master
> readme" — different shape, different standard, same Mālama engine underneath.

---

## How It Works

```text
detect.py  ──scans cwd──▶  scores each shape from filesystem signals
                           ▶ picks the winner (highest score, priority tiebreak)
                           ▶ prints the docs to load:
                               skills/malama/SYSTEM_PROMPT.md  (base)
                               standards/shapes/<SHAPE>.md     (matched)
                               AGENTS.md                       (repo rules)
```

| Shape | Detected from | Loads |
|---|---|---|
| MCP server | `.mcp.json`, `mcp-servers/`, MCP SDK dep | `standards/shapes/MCP.md` |
| Agent skill | `*.skill.yml`, `SKILL.md` | `standards/shapes/SKILL.md` |
| CLI tool | `package.json` `bin`, console_scripts, Cargo `[[bin]]` | `standards/shapes/CLI.md` |
| API service | express/fastify/fastapi/flask/django, openapi spec | `standards/shapes/API.md` |
| Full app | next/react/vue/svelte/angular, `index.html` | `standards/shapes/APP.md` |
| Data | `*.ipynb`, `*.csv/.parquet/.xlsx`, pandas | `standards/shapes/EXCEL.md` |
| PDF / booklet | `*.tex`, `booklet/` | `standards/shapes/PDF.md` |
| Infrastructure | Dockerfile/compose, `*.tf` | `standards/DOCKER.md` |
| *(none)* | no strong signal | `standards/shapes/README.md` |

Routing table is editable in [`routes.yml`](./routes.yml) (mirrored inside
`detect.py` so the engine stays zero-dependency).

---

## Usage

```bash
# Human-readable
python3 skills/project-router/detect.py .

# Machine-readable (for a SessionStart hook)
python3 skills/project-router/detect.py . --json
```

### Wire it as a session-start hook (optional)

Add to `.claude/settings.json` so every session auto-detects and reports the
docs to load:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command",
        "command": "python3 skills/project-router/detect.py . --json" } ] }
    ]
  }
}
```

The agent then reads the three `load` paths before starting work.

---

## Trigger Keywords

```text
project router, detect project type, which standard, shape router,
what should I load, session start router
```

## Relationship

- Loads the **[`malama`](../malama/SKILL.md)** system prompt as the base for every shape.
- Routes into the existing **[`standards/shapes/`](../../standards/shapes/README.md)** docs.
- Part of the Solution-Shape Router step in `standards/AUTOMATED_PRODUCT_PIPELINE.md`.
