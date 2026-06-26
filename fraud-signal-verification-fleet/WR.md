# WR: Fraud-Signal Verification Fleet

- **Status:** v0.1 shipped
- **Owner:** @midnghtsapphire
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

## Artifact Engine Map

| Artifact Shape | Existing engine / standard | Status | Required action |
| --- | --- | --- | --- |
| Website / UI | `dashboard/index.html` + `serve.py` (live), `dashboard/standalone.html` (offline) | exists | none |
| API | `src/orchestrator.py` offline runner (live LLM dispatch stubbed) | gap | FSV-09 live retrieval |
| CLI | `src/judge.py`, `scripts/run_all.sh`, `tools/ingest_sanitizer.py` | exists | none |
| MCP | n/a for v0.1 | gap | defer |
| Skill | `skills/claim-decomposition`, `skills/source-tiering` | exists | none |
| PDF | n/a | gap | defer |
| PowerPoint / deck | `pitch/SLIDES.md` (Marp), `pitch/PITCH.md` | exists | render to deck if needed |
| Video | n/a | gap | defer |
| Docs | `docs/` (framework, methodology, provenance, specs, roadmap), `README.md` | exists | none |
| Agent automation | `.github/workflows/ci.yml`, `prompts/MASTER_PROMPT.md` + agent prompts | exists | none |

## Agent Self-Healing Journal

- **Issue detected:** CircleCI `lint-and-test` failed on 6 markdownlint errors; Copilot
  flagged 11 robustness/security items (KeyError on unknown source ids, `band_for(0)`
  mislabeling non-refused claims as REFUSED, unescaped dashboard `innerHTML`, silent
  `serve.py`/orchestrator failures, misleading `mode` passthrough, mutable manifest leak,
  unfriendly missing-PyYAML error, PII email, missing WR sections).
- **Research / correction:** Reproduced the markdownlint gate locally; fixed all 6. Added
  source-id guard and friendly yaml error to the scorer, made `band_for` flag-driven,
  HTML-escaped dashboard output, switched to fail-fast, validated `mode`, returned fresh
  manifest dicts, and aligned the band-range docs.
- **Revvel-standards change:** Added the required Artifact Engine Map + Agent Self-Healing
  Journal sections to this WR per `docs/WEEKLY_RESEARCH_PROCESS.md`.
- **Outcome to preserve:** Run `npx markdownlint-cli2` on changed `*.md` before pushing;
  treat any externally-ingested JSON as untrusted at both the scorer and the dashboard.
