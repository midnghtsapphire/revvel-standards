# NotebookLM knowledge pack — Revvel prompts & resources

This pack is the **NotebookLM-oriented knowledge repository** for prompt
engineering, agent system prompts, and external vendor-prompt inventories used
on owner GitHub requests.

Related issue: [#16419](https://github.com/midnghtsapphire/revvel-standards/issues/16419).

## What to upload

Primary machine manifest:

- [`sources/SOURCES.json`](./sources/SOURCES.json) — complete source list (internal paths + external URLs). **Unfiltered.**

Human export:

- [`exports/PACK_MANIFEST.md`](./exports/PACK_MANIFEST.md)

Guides:

- [`guides/HOW_TO_LOAD.md`](./guides/HOW_TO_LOAD.md)
- [`guides/GITHUB_REQUEST_PLAYBOOK.md`](./guides/GITHUB_REQUEST_PLAYBOOK.md)

## Regenerate

```bash
node scripts/prompt-knowledge-repo.js export-notebooklm
```

## Relationship to docs/notebook/

`docs/notebook/` remains the drop-zone for raw NotebookLM *exports from other
projects*. This `docs/notebooklm/` tree is the **curated pack** generated from
`prompts/` for re-import into NotebookLM.
