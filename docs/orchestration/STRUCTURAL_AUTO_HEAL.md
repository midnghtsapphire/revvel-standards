# Structural Auto-Heal

Operator guide for deterministic Markdown structural repair (MD003, MD025, MD056)
used by the multi-persona orchestration loop.

## What it fixes

| Rule | Symptom | Healer |
| --- | --- | --- |
| MD003 | Setext `===` / `---` headings | `convertSetextToAtx` in `scripts/heal-markdown.js` |
| MD025 | Multiple top-level `#` titles | `demoteExtraH1s` |
| MD056 | Table rows with wrong cell counts | `balanceTableColumns` |

Mechanical rules still go through `markdownlint-cli2 --fix` after the custom pass.

## Commands

```bash
# Heal specific files
npm run markdown:heal -- path/to/file.md

# Walk docs/ and heal (dry-run)
npm run orchestration:heal -- --dry-run

# Validate the orchestration file registry
npm run orchestration:registry
```

## Workflow

`.github/workflows/structural-auto-heal.yml`:

1. Runs on `workflow_dispatch` and daily schedule.
2. Executes the deterministic healer under `docs/`.
3. Opens a **self-heal PR** via `peter-evans/create-pull-request` when there is a diff.
4. Does **not** force-push onto contributor PR branches (repo policy).

Optional OpenRouter LLM heal is intentionally **not** required for MD025/MD056 —
those are local and free. Keep `OPENROUTER_API_KEY` for triage/research lanes.

## File registry

`config/orchestration/file-registry.yml` lists the scripts, workflow, docs, and
product files that must exist for the orchestration loop. CI and local agents
run `scripts/orchestration/file-registry.js` so missing pieces fail loudly.
