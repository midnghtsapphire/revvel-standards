# Fraud-Signal Verification Fleet

A multi-agent research swarm that scores the **evidentiary strength** of public
allegations — and refuses to pretend it can return a fraud verdict.

> **What this is not.** It is not a fraud detector that says "X committed fraud."
> Fraud is a legal determination (intent + materiality + adjudication). This
> system tells you what is *substantiated*, *unsubstantiated*, or *unknowable
> from public sources*, with a calibrated confidence and a full source trail.

## Why it's built this way
The original request was "detect this fraud" from a single LinkedIn post about an
87-page report. Building a detector around one unverified partisan document
launders an accusation into a verdict — the exact failure a real verification
system exists to prevent. So the architecture inverts it: decompose the claim,
hunt primary sources for AND against, cap confidence by source quality and legal
stage, and **hard-refuse** any "is-guilty" output.

## The fleet
| Agent | Job | Emits |
|---|---|---|
| `agent-primary-source` | dockets, pleas, FEC/finance filings, transcripts | tier 4-5 |
| `agent-financial` | money trails tied to filings | tier 3-5 |
| `agent-media-trace` | provenance: who published, leak vs filing | tier 1-3 |
| `agent-counter` | adversarial / null-hypothesis red team | contradictions |
| `agent-legal` | statutory elements + adjudication stage | sets the ceiling |
| **judge** | merges, resolves conflict, writes verdict language | case report |

## Confidence in one paragraph
A claim's score = (best source-tier weight × provenance discount) + corroboration
− contradiction, then **capped twice**: once by the source tier, once by the
adjudication stage. A tier-1 social post can never substantiate. An "alleged"
claim can never read as "convicted." See [docs/CONFIDENCE_FRAMEWORK.md](docs/CONFIDENCE_FRAMEWORK.md).

## How the news channel got it
`agent-media-trace` answers exactly this and turns it into a trust weight:
a document the outlet *obtained* (filing) outranks a claim it merely *repeats*
(anonymous report). Provenance is a first-class input, not a footnote.

## Run it
```bash
pip install pyyaml
python3 src/orchestrator.py        # scores seed case -> dashboard/dashboard-data.json
python3 src/judge.py               # print full report
python3 dashboard/serve.py         # live HTML at http://localhost:8088
python3 -m unittest discover -s tests   # tests (stdlib only)
```

### Standalone dashboard (no server, use anywhere)
`dashboard/standalone.html` is a single self-contained file — **double-click to
open** (works from `file://`, email it, host it anywhere). The full confidence
scorer is ported to JavaScript and runs in your browser, so you can:
- **Use the embedded seed**, **upload** a case JSON, or **paste** one,
- score it live with the identical tier/stage/refusal rules as `src/confidence.py`
  (cross-checked: same numbers),
- **export** the scored ledger as JSON.

No network, no build, no Python needed. The case JSON schema is in the file's
"Schema" button and matches `data/seed/*.json`.

## Seed case
`data/seed/newsom_case.json` — the 2026 Newsom/DOJ claims from NY Post (editorial,
tier 2), BBC (reporting, tier 3), C-SPAN (transcript, tier 4). The system scores
each discrete claim and **refuses** the "Newsom committed fraud" claim outright.
The only adjudicated item (a guilty plea) concerns a *different person* and is not
imputed to Newsom.

## Layout
```text
src/         confidence scorer, agents, judge, orchestrator
prompts/     master prompt + per-agent prompts (parallel & sequential chaining)
config/      source-tier weights, adjudication ceilings
data/seed/   curated case datasets
dashboard/   live HTML "evidence ledger" + static server
skills/      claim-decomposition, source-tiering
tools/       ingest sanitizer
docs/        framework, methodology, provenance, roadmap, agent specs
kanban/      board + cards (XP)
pitch/       slides + pitch doc + infogram spec
```

See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) and [docs/ROADMAP.md](docs/ROADMAP.md).
