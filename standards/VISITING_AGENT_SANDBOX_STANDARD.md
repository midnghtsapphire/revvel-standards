# Visiting Agent Sandbox Standard

All automated agents (OpenRouter, OpenHands, Jules, Claude, etc.) MUST write
their session artifacts under `.sandbox/<agent-id>/` in the repo root.

## Rules

1. **No secrets.** Never persist API keys, tokens, or cookies.
2. **Auditable.** Every write includes a UTC timestamp and agent id.
3. **Ephemeral.** Files older than 30 days may be pruned by cron.
4. **Read-only outside sandbox.** Agents must not mutate paths outside their
   subdirectory except via explicit PRs.
5. **Workflow permissions.** Any workflow that runs an agent MUST declare
   `permissions:` at the minimum required scope (default `contents: read`).
6. **Pinned actions.** GitHub Actions used by agent workflows MUST be pinned
   to a commit SHA with a version comment.

## Layout

```text
.sandbox/
  README.md
  openrouter/
    <run-id>.json
  openhands/
    <run-id>.json
  jules/
    <run-id>.json
```

## Example audit entry

```json
{
  "agent": "openrouter",
  "run_id": "2025-01-01T00-00-00Z-abc123",
  "actions": ["read:products/ai-architecture-framework/", "write:.sandbox/openrouter/2025-01-01T00-00-00Z-abc123.json"],
  "exit": "ok"
}
```
