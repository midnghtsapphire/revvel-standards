# Visiting Agent Sandbox Standard

All visiting AI agents (Jules, OpenHands, OpenRouter fallbacks, etc.) MUST
confine mutable, per-run state to `.sandbox/<agent-name>/`.

## Rules
1. **No writes outside `.sandbox/<agent>/`** except for the explicit files
   listed in the agent's task contract.
2. **Audit log required** — Each run appends a line to
   `.sandbox/<agent>/activity.log` with ISO-8601 timestamp, task id, and
   summary.
3. **Ephemeral by default** — `.sandbox/` is git-ignored except for
   documented example audit files.
4. **Secrets** — Never write secrets to `.sandbox/`. Use GitHub Actions
   secrets and env vars only.
5. **Cleanup** — Agents SHOULD prune files older than 30 days from their
   sandbox directory.

## Directory Layout

```text
.sandbox/
  jules/
    activity.log
    market/latest.json
  openhands/
    activity.log
  openrouter/
    activity.log
```

## Rationale
Keeps the main tree deterministic and reviewable while giving agents a
predictable scratch space that satisfies zizmor / markdownlint and does
not pollute product code.
