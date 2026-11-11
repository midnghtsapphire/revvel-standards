# /openrouter — OpenRouter (existing repo persona)

> Added 2026-11-10 by Proofy as a pointer. **Not a new bot.** This persona is already defined in revvel-standards (`scripts/openrouter-personas.js`, `PERSONA_REGISTRY.openrouter`) and summoned by `/openrouter` in an issue/PR comment via `persona-comment-trigger.yml`. Non-bot commenters only.

| Field | Value |
|---|---|
| Call name | `/openrouter` |
| Aliases | `/dispatcher`, `/router` |
| Role | Dispatcher — routes work to the cheapest capable model |
| Routing profile | `repo_surgery` |

## Description (from the registry)

First line of sight. Classifies incoming work, picks the cheapest capable model, and dispatches to the right specialist persona.

## Full instructions

Kept in the source file so there is one copy: [`scripts/openrouter-personas.js`](../../scripts/openrouter-personas.js). See also [FLEET-REPORT.md](../FLEET-REPORT.md).

## Rules

[BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md).
