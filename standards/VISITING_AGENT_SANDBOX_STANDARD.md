# Visiting Agent Sandbox Standard

All autonomous or visiting agents (OpenRouter, OpenHands, Jules, Codex, etc.)
operating in this repository MUST persist ephemeral working state under
`.sandbox/<agent-name>/`.

## Rules
1. **Namespace** — one directory per agent (`.sandbox/openrouter/`, `.sandbox/ai-arch/`).
2. **Audit log** — append JSONL to `<sandbox>/audit.jsonl` for every action.
3. **No secrets** — never write API keys or PII into `.sandbox/`.
4. **TEST VERSION** — any generated commercial artifact must be marked TEST VERSION.
5. **Retention** — sandbox contents may be cleared by CI at any time.

## Directory Shape

```text
.sandbox/
  <agent>/
    audit.jsonl         # append-only actions log
    scratch/            # transient work
    outputs/            # promoted artifacts (still TEST VERSION)
```

## Alignment
Supports PRIME DIRECTIVE ($10k/mo → $10M/3yr) by ensuring every agent action is
auditable and revenue-traceable.
