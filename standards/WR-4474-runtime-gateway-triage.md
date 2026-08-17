# WR-4474 — Runtime Gateway 5xx Triage

**Band:** 4470 (Validation Gate)
**Status:** DRAFT — rev 0
**Depends:** WR-4380 (Self-Healer), FAILURE-LEDGER

## Directive
Production/staging gateway errors (5xx, timeouts, upstream refusals) are captured, triaged, and routed to a fix agent automatically. Alert ≠ done; a ledger entry + assigned fix is done.

## Flow
1. **Capture:** Sentry (or platform logs, e.g. DigitalOcean app logs for MindMappr-class deploys) records the error with trace.
2. **Classify:**
   - `502/504 upstream` — app crashed / port mismatch / health-check fail
   - `503` — capacity / cold start / deploy in flight
   - `429 upstream` — rate limit on external API (OpenRouter/Perplexity lanes)
   - `500 app` — unhandled exception with stack trace
3. **Route:** `500 app` w/ stack → Dragnet assigns fix agent, issue auto-opened with trace attached. Infra classes → runbook action first (restart, scale, backoff), issue only on recurrence within 24h.
4. **Ledger:** every triaged event → FAILURE-LEDGER (class, service, root cause, fix ref) so sub-fleet agents learn the pattern.
5. **Close:** fix PR passes WR-4470 gate; Sentry issue linked and resolved by the merging agent.

## Rules
- No silent auto-restarts: restart actions log to ledger too.
- 429 on model lanes triggers WR-4480 lane failover before any code change.
- Recurrence threshold: same fingerprint 3× in 7 days → escalate `needs-human`.

## Acceptance
- [ ] Sentry → issue → agent-assignment path wired
- [ ] Classification table matches observed error mix
- [ ] Ledger write on every triage verified
