# WR-4481 — Model-Lane Failover & Credit-Exhaustion Handling

**Band:** 4480 (Multi-Model Routing)
**Status:** DRAFT — rev 0
**Depends:** WR-4480 (Multi-Model Routing), WR-4474 (Runtime Gateway Triage), FAILURE-LEDGER
**Origin:** 2026-07-20 incident — OpenRouter credit exhaustion stalled agents instead of failing over to the keyless Perplexity lane.

## Directive
Credit or rate exhaustion on any model lane MUST degrade to the next lane automatically. A stalled agent due to 402/429 is a directive violation of the routing layer, not an operator problem.

## Lane ladder (per modality lane in WR-4480)
1. Primary: funded OpenRouter lane (per WR-4480 routing table)
2. Tier-2: keyless/free lane — Perplexity (and OpenRouter :free models) — MUST exist as an explicit routing-table entry, not prose
3. Tier-3: halt + `needs-human` only when the whole ladder is exhausted

## Triggers (explicit, machine-checked)
- HTTP 402 (payment/credits) → immediate failover to tier-2, no retry on primary
- HTTP 429 → one backoff retry (≤30s), then failover
- Timeout/5xx from provider ×2 consecutive → failover
- Every failover event → FAILURE-LEDGER entry (lane, trigger code, task ref); no silent degradation

## Recovery
- Primary re-probed on a schedule (e.g. hourly) or on manual credit top-up signal; return upward automatically
- Sticky-downgrade beyond 24h → open issue tagged `lane-degraded`

## Rules
- Failover is config, not code edits: routing table carries `fallback:` + `trigger:` fields per lane
- No agent may respond to 402/429 by editing its own routing config (gate-tamper class, WR-4472)
- If FAILURE-LEDGER has no 402/429 entries after a known dry window, capture is broken — that is itself a ledger entry

## Acceptance
- [ ] WR-4480 routing table shows explicit tier-2 keyless entries per lane with trigger conditions
- [ ] Simulated 402 on primary → task completes on tier-2, ledger entry written
- [ ] Simulated 429 → one backoff then failover, ledger entry written
- [ ] Recovery probe returns traffic to primary after top-up
