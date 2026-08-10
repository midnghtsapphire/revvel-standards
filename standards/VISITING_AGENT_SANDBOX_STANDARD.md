# Visiting Agent Sandbox Standard

All automated agents operating in this repository MUST:

1. Write session artifacts under `.sandbox/<agent-name>/` only.
2. Append audit entries (JSONL) to `.sandbox/decisions.jsonl` when making
   provisioning, funding, or product-creation decisions.
3. Never commit secrets. Use `${{ secrets.* }}` in workflows.
4. Pin `actions/*` to full SHAs and set minimum `permissions:`.
5. Use markdown code fences with a language tag (e.g. ` ```bash `).

## Directory layout

```text
.sandbox/
├── decisions.jsonl        # append-only audit log
├── market_evaluator.jsonl # product creation log
└── <agent-name>/          # per-agent workspace
```

## Enforcement

- CI runs markdownlint and zizmor on workflows.
- PRs violating the standard are auto-labeled `sandbox-violation`.
