# WR: Fraud-Signal Verification Fleet

- **Status:** v0.1 shipped
- **Owner:** `angelreporters@gmail.com`
- **Branch:** claude/youthful-maxwell-4bdk4q
- **Labels:** research, multi-agent, verification

## Problem
A request to "detect fraud" from a single viral report. Building a detector
around one unverified partisan document confirms an accusation rather than
testing it. Need a system that measures *evidentiary strength* with calibrated,
auditable uncertainty and refuses to issue fraud verdicts on named people.

## Deliverables (this WR)
- [x] Calibrated confidence scorer: tier cap + adjudication-stage ceiling +
      corroboration/contradiction + provenance discount + refusal gate
- [x] 5-agent research fleet (incl. adversarial red team) + reasoning judge
- [x] Master prompt with parallel fan-out and sequential chaining
- [x] Live HTML evidence-ledger dashboard + server
- [x] Newsom DOJ-2026 seed dataset (NY Post/BBC/C-SPAN); fraud claim refused
- [x] Docs: framework, methodology, provenance, agent specs, roadmap
- [x] Skills (claim-decomposition, source-tiering), ingest sanitizer, CI, tests
- [x] Kanban board + cards, pitch doc, slides, infogram spec

## Acceptance criteria
- [x] `python3 -m unittest discover -s tests` green (6 tests)
- [x] Pipeline writes dashboard-data.json; integrity stays < 0.55 for alleged case
- [x] Fraud-verdict claim C5 returns REFUSED / score 0
- [x] No claim exceeds its tier or stage cap (unit-proven)
- [x] All YAML validates

## Out of scope / follow-on WRs
- FSV-09 live retrieval (CourtListener/FEC/ProPublica)
- FSV-10 human review queue · FSV-11 calibration backtest · FSV-12 entity graph

## Constraints (permanent)
- No fraud/guilt verdicts on named persons.
- No autonomous self-modifying/"self-curing" agents.
- No publish without a source trail.

## How the news channel got it → rules
Provenance is a scored input (docs/PROVENANCE.md): document-obtained > claim-
repeated; leaks weighted by leaker standing; "exclusive/bombshell" = 0 weight.
