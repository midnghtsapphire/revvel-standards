# Tier 3 — Agent-Native Self-Healing Standard

Closes WR #18339.

## Tiers
- **Tier 1** (exists): retry logic inside workflows (exponential backoff).
- **Tier 2** (exists): `auto-resolve-mechanical-conflicts.js`, workflow concurrency guards.
- **Tier 3** (this): an agent watches workflow failures across the fleet, diagnoses
  root cause from logs, files a fix WR with the diagnosis attached, and — for a
  whitelist of mechanical fixes — opens the fix PR itself.

## Guardrails
1. Whitelist only: YAML syntax, deprecated action versions, missing concurrency
   blocks, stale artifact paths. Anything touching code logic = WR only, no auto-PR.
2. Max 2 auto-fix attempts per workflow per 24h (state in `artifacts/selfheal/state.json`).
3. Every Tier-3 action posts to the WR with `tier3-self-heal` label for audit.

Reference: `scripts/tier3_self_heal.py` (scan → diagnose → dispatch).
