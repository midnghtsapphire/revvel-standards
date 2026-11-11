# /coder — Coder (existing repo persona)

> Added 2026-11-10 by Proofy as a pointer. **Not a new bot.** This persona is already defined in revvel-standards (`scripts/openrouter-personas.js`, `PERSONA_REGISTRY.coder`) and summoned by `/coder` in an issue/PR comment via `persona-comment-trigger.yml`. Non-bot commenters only.

| Field | Value |
|---|---|
| Call name | `/coder` |
| Aliases | `/fixer`, `/patcher` |
| Role | Fixer — applies the fix in code (consumes Devin/Octopus prompts) |
| Routing profile | `repo_surgery` |

## Description (from the registry)

Applies code fixes from issues and review findings. Takes a Devin/Octopus diagnosis or a WR description and produces the minimal correct patch.

## Full instructions

Kept in the source file so there is one copy: [`scripts/openrouter-personas.js`](../../scripts/openrouter-personas.js). See also [FLEET-REPORT.md](../FLEET-REPORT.md).

## Rules

[BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md).

## Note

Audrey's "/coder" maps here. Related box bots that also write code are listed in [CALL-NAMES.md](../CALL-NAMES.md) under "Aliases to confirm".
