# Inspect AI (UK AI Security Institute)

**BLUF:** Fits the agent-fleet evaluations the repo already writes up by hand (`docs/*_EVAL_*.md`, `scripts/evaluate-claude-fleets.js`). Priority **medium**, effort **medium**, loop **Agentic**.

| Field | Value |
| --- | --- |
| Category | `evals` |
| Kind | Python eval framework |
| License | MIT |
| Priority | medium |
| Effort to adopt | medium |
| Loop (llms.txt) | Agentic |
| Accessed | 2026-10-26 |

## What it is

Framework for LLM and agent evaluations (datasets, solvers, scorers, tool-use sandboxes, logged transcripts), from the UK AI Security Institute.

## Why it fits revvel-standards

Fits the agent-fleet evaluations the repo already writes up by hand (`docs/*_EVAL_*.md`, `scripts/evaluate-claude-fleets.js`). It produces structured, replayable eval logs, which supports the 'provenance is the product' rule.

## Determinism notes

Logs every sample, so results are auditable. Model calls stay nondeterministic unless you use local seeded lanes.

## How to adopt

1. Pilot one agent eval (for example WR-rewrite quality) and store the logs as artifacts.

## Sources

- <https://github.com/UKGovernmentBEIS/inspect_ai>
- <https://inspect.aisi.org.uk/>
