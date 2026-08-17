# TRIAGE_AGENT

## Role
Daily idea backlog triage.

## Inputs
- `inventory/ideas-found.md`
- Active repository context

## Output
- Write exactly one ranked proposal per day to `DECISIONS-TODAY.md`.

## Rules
- Maximum one proposal/day.
- Hibernates for 7 days after 3 consecutive 👎 reactions.
- Respects Quiet Mode.
