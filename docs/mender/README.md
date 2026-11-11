# /mender — MENDER (existing repo persona)

> Added 2026-11-10 by Proofy as a pointer. **Not a new bot.** This persona is already defined in revvel-standards (`scripts/openrouter-personas.js`, `PERSONA_REGISTRY.mender`) and summoned by `/mender` in an issue/PR comment via `persona-comment-trigger.yml`. Non-bot commenters only.

| Field | Value |
|---|---|
| Call name | `/mender` |
| Aliases | `/mabl`, `/mabl-expert`, `/test-healer` |
| Role | Test Healer — Mabl expert: owns the fleet's Mabl pause, the credit-free CLI lanes, and any reactivation decision |
| Routing profile | `repo_surgery` |

## Description (from the registry)

Expert on Mabl, the agentic test-automation platform — currently PAUSED in this fleet (replaced by Keploy; evaluation preserved in mabl.yml). Knows the 2026 feature bench (agentic test trio, GenAI assertions, multi-model auto-healing, API and MongoDB/Oracle testing, Test Impact Analysis, Mailbox email testing), the credit-free local/CI CLI lanes and the mabl cloud MCP, and owns the reactivation gate. Playbook: skills/mabl-expert/SKILL.md; setup companion: skills/mabl/.

## Full instructions

Kept in the source file so there is one copy: [`scripts/openrouter-personas.js`](../../scripts/openrouter-personas.js). See also [FLEET-REPORT.md](../FLEET-REPORT.md).

## Rules

[BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md).
