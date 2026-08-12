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
├── README.md
└── <agent-name>/                 ← lowercase, hyphenated, stable
    ├── AGENT.md                  ← identity + resume instructions
    ├── sessions/                 ← YYYY-MM-DD-HHMM-<slug>.md
    ├── memory/                   ← persistent-facts.md + topic files
    ├── thoughts/                 ← reasoning / brainstorm logs
    ├── scripts/                  ← any script the agent wrote
    ├── api-calls/                ← saved API request/response pairs
    ├── cli/                      ← saved shell commands + outputs
    ├── mcp/                      ← MCP tool calls + payloads
    ├── tools/                    ← external tool binaries / configs
    ├── skills/                   ← draft skills before promotion
    └── artifacts/                ← generated PDFs, images, docs
```text

## Rationale

Gives operators a consistent place to review what visiting agents did,
while keeping product code paths clean.
