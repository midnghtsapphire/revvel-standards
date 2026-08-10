# Visiting Agent Sandbox Standard

All visiting agents (Jules, OpenHands, OpenRouter, Copilot, etc.) MUST
write session artifacts under `.sandbox/<agent-name>/` in the repo.

## Requirements

1. **Isolation** — one directory per agent, no cross-writes.
2. **Auditability** — every session appends a dated log:
   `.sandbox/<agent>/log-YYYYMMDD.md`.
3. **No secrets** — never commit tokens or PII.
4. **Cleanup** — sessions older than 30 days may be pruned.
5. **Bot activity** — automated commits must reference the originating
   issue and workflow run ID.

## Example

```text
.sandbox/
├── openrouter/
│   ├── log-20250101.md
│   └── notes.md
└── jules/
    └── log-20250101.md
```

## Rationale

Gives operators a consistent place to review what visiting agents did,
while keeping product code paths clean.
