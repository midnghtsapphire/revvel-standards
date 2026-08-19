# WR-4474 — Runtime Gateway 5xx Triage

**Band:** 4470 (Validation Gate)
**Status:** ACTIVE — rev 1 (wired)
**Depends:** WR-4380 (Self-Healer), WR-4481 (Lane Failover), FAILURE-LEDGER

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

## Wiring (rev 1)

| Piece | Path |
| --- | --- |
| Classifier + router | `scripts/runtime-gateway-triage.js` |
| FAILURE-LEDGER I/O | `scripts/failure-ledger.js` → `logs/failure-ledger/FAILURE-LEDGER.jsonl` |
| 402/429 lane failover | `scripts/lane-failover.js` + `config/routing-failover.yml` |
| Workflow entry | `.github/workflows/runtime-gateway-triage.yml` (`repository_dispatch`: `sentry`, `runtime-5xx`) |
| Schema | `agent-pack/failure-ledger.schema.json` |
| Tests | `tests/runtime-gateway-triage.test.js` |

### How to fire a Sentry event into the path

1. In Sentry → Settings → Integrations → **GitHub** (or a generic webhook) → send issue alerts to a small relay that calls:

   ```bash
   gh api repos/midnghtsapphire/revvel-standards/dispatches \
     -f event_type=sentry \
     -f client_payload="$(jq -c . event.json)"
   ```

2. Or run manually:

   ```bash
   gh workflow run runtime-gateway-triage.yml \
     -f event_json="$(jq -c . event.json)" \
     -f dry_run=true
   ```

3. Success looks like: workflow green, a new line in `logs/failure-ledger/FAILURE-LEDGER.jsonl`, and (for 500-with-stack) a GitHub issue labeled `auto-fix` + `openrouter` so agent-dispatcher routes a fix agent.

### 402/429 note (WR-4481)

Model-lane credit/rate exhaustion is **not** a code-change path. `config/routing-failover.yml` carries explicit `triggers: {402: failover, 429: backoff_then_failover}` pointing at the keyless Perplexity tier-2 lane. `scripts/openrouter-triage.js` honors the same trigger and jumps straight to keyless on 402/429.

## Rules
- No silent auto-restarts: restart actions log to ledger too.
- 429/402 on model lanes triggers WR-4481 lane failover before any code change.
- Recurrence threshold: same fingerprint 3× in 7 days → escalate `needs-human`.
- Enforcement machinery (this wiring) requires **human merge** — no auto-merge (4470-band).

## Acceptance
- [x] Sentry → issue → agent-assignment path wired
- [x] Classification table matches observed error mix
- [x] Ledger write on every triage verified
- [x] 402/429 failover to keyless lane tested (`tests/runtime-gateway-triage.test.js`)
