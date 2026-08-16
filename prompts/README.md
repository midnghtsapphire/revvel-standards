# prompts/ — Prompt Knowledge Repository

Living knowledge store for **system prompts**, **external source indexes**,
**concepts**, **LLM combos**, and **metadata** used on owner GitHub requests
in `midnghtsapphire/revvel-standards` (and sibling repos when named).

Closes the need from issue
[#16419](https://github.com/midnghtsapphire/revvel-standards/issues/16419):
store detailed thought-process / memory / learning / api / cli / mcp / skills /
tools / sub-agent prompts, keep an unfiltered external inventory of
[system_prompts_leaks](https://github.com/asgeirtj/system_prompts_leaks), and
grow the set via a documented process + CLI.

## Layout

```text
prompts/
  catalog.json                 # root catalog (schema-validated)
  README.md                    # this file
  internal/                    # revvel-owned system prompts (bodies in-repo)
    thought-process/
    memory/
    learning/
    api/
    cli/
    mcp/
    skills/
    tools/
    sub-agents/
    github-requests/
  external/                    # indexes + optional local caches of third-party sources
    system_prompts_leaks/
      INDEX.json               # full unfiltered file inventory + source URLs
      INVENTORY.md             # human-readable path list
      cache/                   # gitignored optional body cache (CLI fetch)
  concepts/                    # named concepts (extensible)
  llm-combos/                  # model ladders + which system prompts to load
  metadata/                    # free-form sidecar metadata JSON
  processes/                   # how to add things as we go
```

Companion NotebookLM pack: [`docs/notebooklm/`](../docs/notebooklm/README.md).

## Policy

| Rule | Meaning |
| --- | --- |
| **No inventory censor** | `catalog.json` and external indexes list every path/vendor discovered. Do not drop entries because content is sensitive, edgy, or vendor-proprietary. |
| **External bodies by URL** | Third-party prompt *bodies* stay at the upstream URL (or optional local `cache/`, gitignored). The monorepo keeps the complete index + metadata. |
| **Internal bodies in git** | Revvel-authored system prompts live under `internal/**` and are committed. |
| **GitHub-request default** | Unless the operator names another repo, target `midnghtsapphire/revvel-standards`. |
| **Extensible** | New concepts, LLM combos, metadata keys, and internal/external folders are added through the process + CLI — never by inventing a second tree. |

## Quick start

```bash
# Validate catalog + required system-prompt files
node scripts/prompt-knowledge-repo.js validate

# List entries
node scripts/prompt-knowledge-repo.js list

# Add a concept / LLM combo / folder / metadata key
node scripts/prompt-knowledge-repo.js add-concept --id my-idea --name "My idea" --summary "..."
node scripts/prompt-knowledge-repo.js add-llm-combo --id combo.x --name "X" --models "a,b,c"
node scripts/prompt-knowledge-repo.js add-folder --scope internal --name new-lane
node scripts/prompt-knowledge-repo.js add-metadata --key owner --value midnghtsapphire

# Refresh external system_prompts_leaks index (unfiltered)
node scripts/prompt-knowledge-repo.js refresh-external --source system_prompts_leaks

# Optionally cache specific upstream bodies locally (gitignored)
node scripts/prompt-knowledge-repo.js fetch-external --source system_prompts_leaks --path "OpenAI/chatgpt.md"

# Build / refresh NotebookLM source pack
node scripts/prompt-knowledge-repo.js export-notebooklm
```

## Required internal system prompts

| ID | Path | Use |
| --- | --- | --- |
| `sp.thought-process` | `internal/thought-process/SYSTEM_PROMPT.md` | Structured reasoning on every GitHub request |
| `sp.memory` | `internal/memory/SYSTEM_PROMPT.md` | decisions.jsonl / provenance memory discipline |
| `sp.learning` | `internal/learning/SYSTEM_PROMPT.md` | learnings.md append + load protocol |
| `sp.api` | `internal/api/SYSTEM_PROMPT.md` | OpenRouter / GitHub / third-party API work |
| `sp.cli` | `internal/cli/SYSTEM_PROMPT.md` | scripts/, gh, shell automation |
| `sp.mcp` | `internal/mcp/SYSTEM_PROMPT.md` | MCP server + tool surface work |
| `sp.skills` | `internal/skills/SYSTEM_PROMPT.md` | skills/ registry + SKILL.md authoring |
| `sp.tools` | `internal/tools/SYSTEM_PROMPT.md` | tools/ and scripted capabilities |
| `sp.sub-agents` | `internal/sub-agents/SYSTEM_PROMPT.md` | orchestrator → specialist handoff |
| `sp.github-requests` | `internal/github-requests/SYSTEM_PROMPT.md` | default prompt for owner GitHub issues/PRs |

## External: system_prompts_leaks

Full unfiltered inventory:

- [`external/system_prompts_leaks/INDEX.json`](./external/system_prompts_leaks/INDEX.json)
- [`external/system_prompts_leaks/INVENTORY.md`](./external/system_prompts_leaks/INVENTORY.md)

Upstream: <https://github.com/asgeirtj/system_prompts_leaks>

Use the index when drafting or comparing internal prompts. Prefer **patterns**
and **structure** observed upstream; author revvel-owned bodies under
`internal/`. Fetch individual bodies into `cache/` only when needed for offline
NotebookLM import.

## Process

See [`processes/ADD_CONCEPT_LLM_COMBO.md`](./processes/ADD_CONCEPT_LLM_COMBO.md)
and [`process/prompt-knowledge-repo.md`](../process/prompt-knowledge-repo.md).

## Schema

[`schemas/prompt-knowledge-catalog.schema.json`](../schemas/prompt-knowledge-catalog.schema.json)

## Tests

```bash
node --test tests/prompt-knowledge-repo.test.js
```
