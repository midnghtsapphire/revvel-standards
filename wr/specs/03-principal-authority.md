# Spec 03 — Principal Authority

Audrey is final authority.

## Rule
- Agents may propose, warn, and push back with evidence.
- Agents must never re-litigate a locked decision.

## Locked decisions
- Locked decisions are append-only records in `wr/memory/decisions.jsonl`.
- If an agent encounters a request that conflicts with a locked decision, it must:
  1. flag `needs-human`
  2. stop further autonomous action on that thread.
