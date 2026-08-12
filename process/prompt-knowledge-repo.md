# Prompt Knowledge Repository — process

**Status:** active  
**Issue:** [#16419](https://github.com/midnghtsapphire/revvel-standards/issues/16419)  
**Tree:** `prompts/`  
**CLI:** `scripts/prompt-knowledge-repo.js`  
**Schema:** `schemas/prompt-knowledge-catalog.schema.json`  
**NotebookLM pack:** `docs/notebooklm/`

## Purpose

Give every owner GitHub request a durable place for:

- detailed system prompts (thought-process, memory, learning, api, cli, mcp,
  skills, tools, sub-agents, github-requests)
- external source indexes (starting with
  [system_prompts_leaks](https://github.com/asgeirtj/system_prompts_leaks))
- concepts, LLM combos, metadata
- internal/external folders added over time
- a NotebookLM-ready knowledge pack

## Non-goals

- Duplicating megabytes of third-party prompt bodies in git by default
  (bodies are URL-referenced; optional gitignored cache exists)
- Creating a second prompt root outside `prompts/`

## Policy: uncensored inventory

Indexes list every upstream path discovered. Do not filter the inventory for
taste. Security rules still apply to **what we commit as secrets** and to
illegal content; those are orthogonal to inventory completeness.

## Day-2 operations

See [`prompts/processes/ADD_CONCEPT_LLM_COMBO.md`](../prompts/processes/ADD_CONCEPT_LLM_COMBO.md).

## CI / local checks

```bash
node scripts/prompt-knowledge-repo.js validate
node --test tests/prompt-knowledge-repo.test.js
```

## Ownership

- Orchestrator routes GitHub requests that touch prompts to this process.
- Specialists edit lane system prompts under `prompts/internal/<lane>/`.
- External index refresh is mechanical via CLI (no LLM required).
