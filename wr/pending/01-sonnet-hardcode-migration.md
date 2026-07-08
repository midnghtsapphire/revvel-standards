# [WR] Migrate 16 hardcoded claude-sonnet references to agent-models.yml profiles

## Output Type

internal-script-automation

## Objective

House rule (see `.github/agent-models.yml` denylist + `MODEL_CONFIG.md`):
Sonnet models are banned; the Opus twins are the pinned default. The SSOT
registry and `wr-auto-classify.yml` are done, but 16 hardcoded
`claude-sonnet` strings remain across ~15 workflows
(`grep -rn "claude-sonnet" .github/workflows/`). Migrate each to the
matching profile from the `routing_tree` (coding → `code_patch`, review →
`review`, triage → `triage`, reasoning → `reasoning`, vision → `vision`).
Do NOT blind-sed — read each usage, verify YAML parses and github-script
blocks compile after each edit (per `standards/GREEN_MAIN_STANDARD.md`).

## Definition of Done

- `grep -rn "claude-sonnet" .github/workflows/` returns zero matches
- Each migrated workflow names its profile in a comment
- `npm test` stays at 0 fail
