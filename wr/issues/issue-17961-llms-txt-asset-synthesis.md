# WR: Adopt Asset Synthesis Pipeline as root llms.txt

**Issue:** #17961
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-08-27
**Researcher:** Grok Build (session executed here; OpenRouter lane untrusted)
**WR Status:** Implemented in the companion PR

## Issue Context

Owner asked for a WR/PR from this session because OpenRouter is not
working even with credits (possibly a rotating agent). Incoming artifact
is a new `llms.txt` Asset & Artifact Synthesis Pipeline. Instruction:
evaluate what is there, restructure without deleting, save the old one
with a different extension, put the new one in after eval.

## Background

`revvel-standards` had no root `llms.txt`. `AGENTS.md` +
`.github/agent-models.yml` already own operating rules and model IDs.
The incoming draft duplicated routing with banned IDs (`claude-3.5-sonnet:beta`).
The only other `llms.txt` in the org is the veinsloop product crawler.

## Scope

- Archive incoming → `llms.txt.incoming.bak`
- Land restructured `llms.txt`
- Eval doc
- Pending WR capture `wr/pending/15-llms-txt-asset-synthesis.md`
- Do not touch veinsloop

## Approach

Compare incoming against `AGENTS.md`, `MODEL_CONFIG.md`, and
`agent-models.yml` denylist. Keep CS formula, asset classes, BLUF, and
CoT. Replace model table with the routing tree. Add composable
generative / agentic / deterministic loops. Add OpenRouter diagnosis.
Python samples use env + Layer 0, not placeholder keys.

## Acceptance Criteria

- [x] Change delivers the described behavior end-to-end
- [x] Docs updated
- [x] No regressions in related workflows (docs-only)
- [x] No hardcoded secrets

## Risks & Mitigations

- **Clobbering the veinsloop crawler.** Mitigation: explicit out-of-scope
  note in live `llms.txt` and the eval.
- **Reintroducing Sonnet via the incoming examples.** Mitigation: denylist
  section + eval table.

## Competitor & Pricing Intelligence

N/A — internal agent-contract SSOT. Monetization path is the existing
automated product pipeline (Focus Area 3), not a new storefront.
