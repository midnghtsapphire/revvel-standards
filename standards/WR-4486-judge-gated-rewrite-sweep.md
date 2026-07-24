# WR-4486 — Judge-Gated WR Rewrite Sweep

**Band:** 44xx (Standards / Pipeline)
**Rev:** 0
**Status:** ACTIVE
**Depends:** WR-4480 (Multi-Model Routing), WR-4481 (Lane Failover), WR-4482 (Evidence-First Directive), WR-4483 (Ensemble Judge)
**Fixes:** single-vendor rewrite dependency (Jules queue); wr-pr-creation.yml ordering bug (PR opened before rewrite completes, guaranteeing red lint)

---

## Purpose

Bulk-rewrite every WR and PR document to standard, with the WR-4483 judge as the quality gate. No single vendor is the pipeline: Jules is demoted to one rewriter lane among several. A PR opens only AFTER the rewrite passes the judge — documents are born green, not red.

## Pipeline

```text
1. SELECT   -> lint run enumerates failing/skeleton docs (placeholders, MD025, MD040,
               empty sections); queue ordered by band importance, WIP cap 5 docs
2. REWRITE  -> lane-0: local models (zero marginal cost) via Ollama endpoint
               lane-1: OpenRouter cheap lane   lane-2: Jules (optional, if quota allows)
               failover per WR-4481 (402 -> keyless, 429 -> one backoff then next lane)
3. JUDGE    -> 2-3 scorers from DISTINCT model families (WR-4483 R1) score the rewrite
               against the rubric below, each 0..1 per criterion
4. GATE     -> pass iff mean >= 0.75 AND min >= 0.50 AND lint-clean
               report per-criterion dispersion (coefficient of variation)
5. REVISE   -> on fail: one revision loop with judge critiques injected; second fail
               -> human-flag label, stop (retry cap 2, no unbounded loops)
6. PR       -> only now open the PR; body carries judge scores + dispersion + cost line
7. LEDGER   -> JSONL entry per doc: lanes used, scores, cost, outcome
```

## Judge rubric (each criterion scored 0..1)

```yaml
rubric:
  no_placeholders: "no deferral or raw placeholder tokens anywhere"
  structure: "single H1; language-tagged fences; register header complete (Band/Rev/Status/Depends)"
  named_math: "every quantitative claim carries formula + named source, or a confidence label"
  claim_hygiene: "no fabricated precision; WR-4482 evidence hierarchy respected"
  failure_modes: "methods list their breakage conditions, not just happy path"
  actionability: "acceptance criteria are checkable; an agent could execute without asking"
```

## Constraints

- Retry cap 2 per doc — bounded spend, no self-heal loops (token-whale rule)
- Rewrites run on batch/off-peak lanes where available; local lane-0 preferred
- Judge scorers MUST be different model families than the rewriter (anti-self-grading)
- Directive/autonomy-band docs (WR-4484 class): human merge required regardless of score
- Mechanical-only rewrites (lint fixes, no semantic change) MAY auto-merge per existing 4470-band policy
- Append-only: originals stay in git history; changelog entry per rewrite

## KPIs

| KPI | Target | Red flag |
|---|---|---|
| Judge pass rate (first attempt) | 50–80% | > 95% (rubber-stamp judge) or < 20% (rewriter lane broken) |
| Post-merge lint-green rate | 100% | any red — the whole point |
| Cost per rewritten doc | tracked, trend down | unbounded retries |
| Judge dispersion (mean CV) | reported every run | hidden |

## Acceptance criteria

- [ ] Workflow staged at ops/wr-rewrite.workflow.yml (Zapier token lacks workflow scope — human moves it to .github/workflows/, per lane-canary precedent)
- [ ] First sweep targets the current markdownlint failures and skeleton wr/issues docs
- [ ] Judge scorers verifiably distinct model families (asserted in ledger)
- [ ] wr-pr-creation.yml amended: rewrite+judge BEFORE PR creation
- [ ] Ledger entries present for every processed doc

## Change log

- **rev-0** — initial: judge-gated rewrite pipeline, Jules demoted to optional lane, born-green PR ordering, retry cap 2.
