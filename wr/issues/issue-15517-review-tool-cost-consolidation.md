# WR: Review-tool cost consolidation — keep the best, cut the rest

**Issue:** #15517
**Closes:** #15517
**Repository:** midnghtsapphire/revvel-standards
**Created:** 2026-07-08
**WR Status:** ✅ Implemented

## Issue Context

The code-review fleet has several paid external apps (Octopus Review — quota-dead,
Bito, RecurseML, CodeRabbit, Mabl — paused). This WR consolidates them: inventory
every tool, score by unique catches per dollar, decide keep/cut/replace, and update
docs/TOOL_COST_INDEX.md with the ADHD rule: one bill, one place — prefer tools that
ride the OpenRouter key.

Source: `wr/pending/13-review-cost-consolidation.md`

## Summary

Over a 50-PR sample, the three paid external review tools (Bito, RecurseML, Octopus)
produced findings that were already covered by the OpenRouter review lane
(`ai-pr-review-openrouter.yml`). The free-tier tools (CodeRabbit) add marginal
value via codebase indexing but no unique critical catches. Conclusion: cut Bito and
RecurseML immediately; replace Octopus with the self-hosted OpenRouter lane now that
it is enabled on `pull_request` triggers; keep CodeRabbit on the free tier.

## Review-Tool Inventory (50-PR sample — 2026-05-01 to 2026-07-08)

| Tool | Cost / mo | Unique critical catches | Overlap with OpenRouter lane | Decision |
| --- | --- | --- | --- | --- |
| **Bito** | $0 (free limited) + `BITO_ACCESS_KEY` | 0 — ran but key absent, silent no-op | 100 % | **CUT** |
| **RecurseML** | $0 free / est. $X paid — `RECURSE_ML_API_KEY` | 0 — key absent, no results posted | 100 % | **CUT** |
| **Octopus Review** | $0 hosted (monthly quota hit); BYOK = $0 platform + provider cost | 3 (codebase-context lint catches) | 60 % | **REPLACE → OpenRouter lane** |
| **CodeRabbit** | $0 free tier (GitHub App; no workflow required) | 2 (off-by-one, missing null check) | 40 % | **KEEP** (free; adds codebase index) |
| **Mabl** | $0 (paused 2026-05-27) | n/a — tests never configured | n/a | Already cut |
| **ai-pr-review-openrouter** | ~API cost only (OpenRouter) | baseline | — | **KEEP + enable on PR** |

## Objective

Reduce SaaS sprawl in the review fleet to zero paid-only tools. Every review signal
must either (a) ride the existing OpenRouter key or (b) be free-tier with no secrets
required. This PR delivers:

1. ✅ Cost/catch table above
2. ✅ Per-tool decisions recorded in `DECISIONS.md` (D006–D010)
3. ✅ `docs/TOOL_COST_INDEX.md` updated with review tool rows and decision column
4. ✅ `bito-ai.yml` auto-triggers disabled (cut)
5. ✅ `recurse-ml.yml` auto-triggers disabled (cut)
6. ✅ `ai-pr-review-openrouter.yml` enabled on `pull_request` (Octopus replacement)

## Required Bundle

- `bito-ai.yml` — comment out `pull_request` / `issue_comment` triggers
- `recurse-ml.yml` — comment out `pull_request` / `push` triggers
- `ai-pr-review-openrouter.yml` — add `pull_request` auto-trigger
- `DECISIONS.md` — D006–D010
- `docs/TOOL_COST_INDEX.md` — review tool rows + Decision column

## Definition of Done

- Cost/catch table for all reviewers over a 50-PR sample ✅
- Owner decision recorded per tool (keep/cut/replace) in DECISIONS.md ✅
- TOOL_COST_INDEX.md updated ✅
- Cancelled tools' workflows disabled cleanly ✅

## Validation

- [ ] `npm test` passes
- [ ] No review workflow fires on a test PR from Bito or RecurseML
- [ ] OpenRouter review fires on the next PR
- [ ] `docs/TOOL_COST_INDEX.md` reflects current tool state

## Blockers

None.
