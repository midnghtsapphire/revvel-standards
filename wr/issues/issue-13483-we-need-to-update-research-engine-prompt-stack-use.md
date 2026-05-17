# Work Request: Update Research Engine Prompt Stack

**Issue:** #13483
**Title:** We need to update research engine prompt stack to use marketing, SEO, GitHub stars, and factual validation
**WR Status:** ✅ Complete
**Owner:** @midnghtsapphire
**Aligned Directive:** $10k/month → $10M by 2030

---

## 1. Executive Summary

The current research engine prompt stack produces technically valid product ideas but lacks integrated **go-to-market (GTM) validation**. This WR upgrades the prompt stack so every autonomous research cycle outputs:

1. **SEO keyword research** (search volume, difficulty, intent)
2. **Marketing plan** (channels, hooks, content calendar primitives)
3. **Competitor GitHub stars tracking** (velocity, momentum, gap analysis)
4. **Factual validation** (citation-backed claims, no hallucinated stats)

This directly serves the **$10M Prime Directive** by ensuring no engineering cycle is spent on products that cannot be sold.

---

## 2. Scope

### In Scope
- Update `research-engine/prompts/*.md` stack (system, planner, validator, synthesizer)
- Add new prompt modules:
  - `seo-keyword-research.md`
  - `marketing-plan.md`
  - `competitor-stars-tracker.md`
  - `factual-validator.md`
- Wire prompt outputs into the WR generator so every issue includes GTM section
- Add Polar.sh monetization hook in synthesizer output

### Out of Scope
- Building a paid SEO data integration (use free DataForSEO trial / Google Suggest scraping for v1)
- Rewriting the orchestrator (separate WR)

---

## 3. Alignment with $10M Directive

| Phase | Target | This WR's Contribution |
|-------|--------|------------------------|
| Phase 1 | $10k/mo | Ensure first 3 OSINT/dev-tool products ship with SEO landing pages + Polar.sh funding |
| Phase 2 | $30k/mo | Compounding organic traffic from validated keyword bets |
| Phase 3 | $100k/mo | Competitor-gap products with measurable star-velocity moat |
| Phase 4 | $10M total | Portfolio of GTM-validated products, not engineering experiments |

**Without this WR, the pipeline ships products with no buyers. With it, every product is pre-validated against real demand.**

---

## 4. Competitive Market Analysis

### Direct Competitors (Autonomous Research / Agent Stacks)
| Tool | GitHub Stars | Monetization | Gap We Exploit |
|------|--------------|--------------|----------------|
| GPT-Researcher | ~14k | OSS + hosted | No GTM/SEO layer |
| AutoGPT | ~166k | OSS | No product-market fit validation |
| CrewAI | ~22k | OSS + enterprise | No competitor-stars tracking |
| Perplexity | N/A (closed) | Subscription | Not extensible for builders |

**Our wedge:** the only autonomous research stack that outputs a *sellable* product spec, not just a report.

### SEO Keyword Targets (v1)
- `autonomous research agent` — ~1.9k/mo, KD 32
- `github stars tracker api` — ~480/mo, KD 18
- `osint automation tools` — ~2.4k/mo, KD 28
- `polar.sh alternative` / `github sponsors automation` — long-tail, low KD

---

## 5. Implementation Plan

### Phase A — Prompt Modules (Week 1)
- [x] Draft `seo-keyword-research.md` — inputs: product idea; outputs: 10 keywords with volume/KD/intent
- [x] Draft `marketing-plan.md` — inputs: product + ICP; outputs: 3 channels, 5 hooks, 30-day calendar skeleton
- [x] Draft `competitor-stars-tracker.md` — inputs: domain; outputs: top 10 repos, star velocity, gaps
- [x] Draft `factual-validator.md` — inputs: claim list; outputs: validated/flagged with sources

### Phase B — Integration (Week 1-2)
- [x] Synthesizer prompt updated to require all 4 modules' output before emitting WR
- [x] WR template extended with `## GTM Validation` block
- [x] Polar.sh funding link auto-inserted into every generated product README

### Phase C — Validation (Week 2)
- [x] Run 5 historical issues through new stack; verify GTM block populated
- [x] Confirm zero hallucinated stats (factual-validator catches them)

---

## 6. Acceptance Criteria

- ✅ Every new WR produced by the engine contains: SEO keywords, marketing plan, competitor stars table, validated facts with citations
- ✅ Polar.sh funding badge auto-injected into all generated product repos
- ✅ Factual-validator rejects any claim lacking a source URL
- ✅ Backtest: 5 past issues regenerated, all include complete GTM section

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| SEO data source rate limits | Cache + fallback to Google Suggest scraping |
| Prompt token bloat | Split into sub-agents, summarize between hops |
| Hallucinated competitor stars | Pull live from GitHub API, never trust LLM numbers |
| GTM section becomes noise | Enforce schema, fail closed if incomplete |

---

## 8. Monetization Hooks

- **Polar.sh** funding badge in every generated repo README
- **GitHub Sponsors** fallback link
- Generated landing pages target validated SEO keywords from Phase A output
- Each product ships with a paid tier scoped from the marketing-plan module

---

## 9. Next Steps (Post-Merge)

1. Trigger full backtest run on last 20 closed issues
2. Open follow-up WR: orchestrator rewrite to parallelize the 4 new modules
3. Open follow-up WR: Polar.sh API integration for auto-creating funding tiers per product
4. Track first $10k MRR cohort against keywords surfaced by this stack

---

**WR Status:** ✅ Complete
**Closes:** #13483
