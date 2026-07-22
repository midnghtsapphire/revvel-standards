# WR-4473 — Pre-Commit Enforcement

**Band:** 4470 (Validation Gate)
**Status:** DRAFT — rev 0
**Depends:** WR-4471

## Directive
Every fleet repo carries a Lefthook pre-commit gate. Agents cannot commit code that fails it, and cannot bypass it.

## Config (skeleton)
```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint:
      run: {LINT_CMD}
      fail_text: "Lint failed. For AI agents: enter WR-4471 fix loop. Do NOT use --no-verify."
```

## Bypass ban
- `git commit --no-verify` / `-n` is PROHIBITED for all agents. Enforcement is two-layer because hooks alone are advisory:
  1. WR-4200 Operating Directive amendment: bypass = directive violation.
  2. Server-side backstop: CI re-runs the same lint (WR-4471) — a bypassed commit still fails at the gate, and Dragnet decrements EWMA trust for the committing agent.

## Rules
- Full-project lint scope (matches WR-4471), not staged-only.
- `fail_text` is agent-directed context, kept in sync with WR-4471 wording.
- Hook install verified in repo bootstrap (`lefthook install` in setup script).

## Acceptance
- [ ] lefthook.yml templated into repo scaffold
- [ ] Trust-decrement on bypass wired into Dragnet
- [ ] fail_text loop instruction verified against agent behavior
