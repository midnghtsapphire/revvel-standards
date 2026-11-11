# /dragnet — DRAGNET (existing repo persona)

> Added 2026-11-10 by Proofy as a pointer. **Not a new bot.** This persona is already defined in revvel-standards (`scripts/openrouter-personas.js`, `PERSONA_REGISTRY.dragnet`) and summoned by `/dragnet` in an issue/PR comment via `persona-comment-trigger.yml`. Non-bot commenters only.

| Field | Value |
|---|---|
| Call name | `/dragnet` |
| Aliases | `/errorfix`, `/permfix`, `/dragnet-fix`, `/scaffold`, `/builder`, `/product-build` |
| Role | Error Hunter + Product Scaffolder — triages bugs, builds products from social signals |
| Routing profile | `repo_surgery` |

## Description (from the registry)

Autonomous error hunter and product scaffolder. In ERROR MODE: reads the issue/PR context, classifies the root cause, checks for existing WR/PR duplicates, and files a targeted permanent-fix Work Request only when no live duplicate exists. In SCAFFOLD MODE: parses social signals (Reddit threads, screenshots, user comments), extracts product requirements, runs the PLATO→JUDGE scoring pipeline, and emits a complete WR with BOM, MVP definition, solution shape, acceptance gates, and assignments.

## Full instructions

Kept in the source file so there is one copy: [`scripts/openrouter-personas.js`](../../scripts/openrouter-personas.js). See also [FLEET-REPORT.md](../FLEET-REPORT.md).

## Rules

[BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md).
