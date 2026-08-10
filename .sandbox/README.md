# .sandbox/

Per-agent isolated workspaces. See
[`standards/VISITING_AGENT_SANDBOX_STANDARD.md`](../standards/VISITING_AGENT_SANDBOX_STANDARD.md).

Each visiting agent gets a subdirectory keyed by its agent id, e.g.
`.sandbox/openrouter/`, `.sandbox/openhands/`.

Contents are considered ephemeral audit artifacts and MUST NOT contain secrets.
