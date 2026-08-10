# Visiting Agent Sandbox Standard

All visiting/automated agents MUST:

1. Write scratch and audit data under `.sandbox/<agent-or-module>/`.
2. Never commit secrets. Use `${{ secrets.* }}` in workflows only.
3. Emit a machine-readable audit file per run (JSON preferred).
4. Publish only free TEST VERSION artifacts by default. Paid variants require
   an explicit `LIVE=1` env flag AND a human-reviewed PR.
5. Respect a `budget_usd_hr` ceiling when provisioning compute.

## Directory layout

```text
.sandbox/
  market-evaluator/
    run-YYYYMMDDTHHMMSSZ.json
  <other-agent>/
    ...
```

## Audit example

```json
[
  {
    "title": "OSINT Recon Pack (TEST VERSION)",
    "slug": "osint-recon-pack",
    "platform": "gumroad",
    "price_usd": 0.0,
    "tag": "test-version",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```
