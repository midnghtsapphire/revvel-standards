# ASSUMPTIONS.md — revvel-standards

> Assumptions made by agents during autonomous work. Each entry includes rationale and risk level.
> Humans: review and confirm/override. Agents: check before making conflicting assumptions.

## How This Differs from DECISIONS.md

- **DECISIONS.md** = deliberate choices made by humans or confirmed by humans
- **ASSUMPTIONS.md** = educated guesses made by agents to keep working without blocking on humans

When an assumption is confirmed by a human, move it to DECISIONS.md and remove it from here.

## Active Assumptions

| ID | Assumption | Risk | Agent | Date | Context |
|---|---|---|---|---|---|
| A-001 | OpenRouter model slugs: `anthropic/claude-sonnet-4` for prosecution, `x-ai/grok-4-fast` as cheap fallback | Low (easily changed) | Devin | 2026-04-25 | Used in prosecution workflow; slugs may change on OpenRouter |
| A-002 | Proposal label name is `proposal` (lowercase) | Low | Devin | 2026-04-25 | Used as trigger for prosecution workflow |
| A-003 | OPENROUTER_API_KEY is available as a GitHub Actions secret | Medium | Devin | 2026-04-25 | Required for prosecution workflow to call OpenRouter |

## Risk Levels

- **Low** — Easy to change later, no data loss, no cost if wrong
- **Medium** — Requires some rework if wrong, but recoverable
- **High** — Could cause data loss, security issues, or significant rework. Should have been escalated.
