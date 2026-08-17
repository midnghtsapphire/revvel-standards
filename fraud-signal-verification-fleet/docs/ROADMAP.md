# Roadmap

## v0.1 — Seed (DONE)
- Calibrated scorer (tier + stage caps, provenance, refusal gate)
- 5 research agents + judge contracts, master prompt (parallel/sequential)
- Live HTML evidence-ledger dashboard
- Newsom seed dataset, stdlib tests, CI

## v0.2 — Live retrieval (NEXT)
- Wire agents to real APIs: CourtListener/PACER, FEC, ProPublica Nonprofit, GDELT
- Human-in-the-loop review queue before any claim is published
- Per-source corrections/retraction tracking

## v0.3 — Calibration
- Backtest against resolved cases (where adjudication is now known) to tune
  weights/ceilings; publish a calibration curve (predicted vs actual outcome)
- Inter-agent agreement metrics

## v0.4 — Multi-case ledger
- Case registry; cross-case entity graph (people, orgs, money)
- Sequential chaining across a docket of cases in one run

## v0.5 — Hardening
- Prompt-injection defenses on ingested source text (tools/ingest_sanitizer.py)
- Audit log of every score change; signed dashboard snapshots

## Non-goals (permanent)
- No fraud/guilt verdicts on named people
- No autonomous self-modifying or "self-curing" agents
- No publishing without source trail
