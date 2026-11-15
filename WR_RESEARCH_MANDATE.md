# WR Research Mandate

> **Version:** 1.0.0  
> **Status:** SINGLE SOURCE OF TRUTH (SSOT)  
> **Authority:** MASTER.md §1 Step 2  
> **Owner:** Audrey Evans (MIDNGHTSAPPHIRE)  
> **Governed by:** UPREV_METHOD.md (Deep Research First pillar)  

---

## The Rule

**No code is written until research is complete.**

Every WR — bug fix, style change, docs update, or full product — requires research before build. The depth scales with WR class, but the mandate applies to all.

| WR Class | Minimum Research Depth | Time Budget |
|----------|----------------------|-------------|
| `bug` | Root-cause analysis + fix verification | 15-30 min |
| `style` | Pattern consistency check + precedent search | 10-15 min |
| `docs` | Accuracy verification + cross-link audit | 15-30 min |
| `product` | Full domain research + competitor intel + SEM/SEO | 2-8 hours |
| `research` | Exhaustive literature review + method divergence | 4-16 hours |
| `infrastructure` | Architecture review + dependency audit + security check | 1-4 hours |

---

## Research Pipeline

```
WR Intake
    ↓
[1] TITLE_TO_WR_EXPANSION.md — Detect title-only, pick template, infer modes
    ↓
[2] RESEARCH ORCHESTRATOR — Fan-out + judge + synthesis
    │    ├─ Primary researcher (deep domain)
    │    ├─ Competitor analyst (pricing, features, gaps)
    │    ├─ Method hunter (10+ methods across domains)
    │    ├─ Contrarian (attack every method)
    │    ├─ Adjacent domain (cross-industry methods)
    │    └─ Synthesizer (merge, reject, rank)
    ↓
[3] FINDINGS TIERING — A1/A2/B2/B3 classification
    ↓
[4] RESEARCH BRIEF — Structured output populates WR fields
    ↓
[5] WR FIELD POPULATION — Research findings → form fields
    ↓
[6] BUILD AUTHORIZATION — wr-lint.mjs validates research completeness
```

---

## Research Orchestrator Specification

### Multi-Model Fan-Out

The research orchestrator distributes queries across multiple models via OpenRouter:

| Role | Model Tier | Purpose |
|------|-----------|---------|
| Primary Researcher | `opus` or `sonnet` | Deep domain analysis, primary source extraction |
| Competitor Analyst | `sonnet` or `gpt-4` | Pricing, feature matrices, gap analysis |
| Method Hunter | `deepseek` or `sonnet` | Cross-domain method discovery |
| Contrarian | `opus` or `claude-3.5` | Attack vectors, failure modes, edge cases |
| Adjacent Domain | `sonnet` | Cross-industry pattern transfer |
| Synthesizer | `opus` | Merge, rank, reject, produce final brief |
| Verifier | `gpt-4` | Fact-check citations, catch hallucinations |

### Execution Rules

1. **Parallel execution**: All researchers run simultaneously.
2. **Consensus threshold**: 0.85 agreement required for A1 classification.
3. **Dissent logging**: Contrarian findings with confidence >0.7 trigger a second research cycle.
4. **Citation requirement**: Every claim requires a URL, DOI, commit hash, or version number.
5. **Hallucination guard**: Verifier checks that cited sources exist and say what the researcher claims.

### CLI Interface

```bash
# Research a WR topic
npx dr research "payment gateway architecture" --depth=product --output=brief.md

# Research with method divergence
npx dr research "caching strategies" --diverge --methods=10 --contrarian --adjacent

# Verify existing research
npx dr verify ./research-brief.md --strict
```

---

## Findings Tiering (A1/A2/B2/B3)

Every research finding is classified before it enters the WR.

### A1 — Proven (>95% confidence)

**Evidence required:**
- Peer-reviewed publication with DOI
- Reproducible benchmark with open-source implementation
- Primary source data with methodology
- Industry standard with >5 years adoption

**Use in WR:** Build directly. No additional validation required.

**Examples:**
- "Redis is an in-memory data store" (A1 — documented, 15+ years)
- "Stripe Checkout supports 135+ currencies" (A1 — API documentation)
- "React uses a virtual DOM" (A1 — official docs, 10+ years)

### A2 — Established (80-95% confidence)

**Evidence required:**
- Widely adopted industry practice
- Documented in official docs with examples
- Multiple independent implementations
- Some edge cases known and documented

**Use in WR:** Build with validation step. Add test for edge cases.

**Examples:**
- "Next.js App Router improves TTFB over Pages Router" (A2 — Vercel benchmarks, some debate)
- "PostgreSQL outperforms MySQL for complex queries" (A2 — workload-dependent)

### B2 — Emerging (60-80% confidence)

**Evidence required:**
- Early adoption in production (1-3 years)
- Some peer review or community validation
- Known limitations and trade-offs
- May require polyfill or shim

**Use in WR:** Flag as emerging. Require proof-of-concept test. Document limitations.

**Examples:**
- "AI code review catches 30% of bugs pre-merge" (B2 — early studies, vendor claims)
- "WebAssembly for server-side rendering" (B2 — emerging pattern)

### B3 — Speculative (<60% confidence)

**Evidence required:**
- Theoretical or anecdotal
- No reproducible evidence
- Thought experiment or novel hypothesis
- May contradict established knowledge

**Use in WR:** Flag as speculative. Require formal proof or mark as R&D. Never build production systems on B3 without explicit owner approval.

**Examples:**
- "Vacuum disruption therapy for cancer remediation" (B3 — no peer-reviewed basis)
- "Quantum computing will replace classical encryption by 2028" (B3 — timeline speculative)

---

## SEM/SEO Discovery Rules

For product-class WRs, research includes discoverability analysis:

### Keyword Research

1. **Primary keywords**: What users search for when they need this product
2. **Long-tail variants**: Specific use-case queries
3. **Competitor keywords**: What ranks for competing products
4. **Gap keywords**: High-volume, low-competition terms

### Content Gap Analysis

1. Search top 10 results for primary keywords
2. Document what each result covers
3. Identify what's missing (depth, accuracy, freshness, format)
4. Plan content that fills the gap

### Technical SEO

1. Page speed requirements (Core Web Vitals)
2. Structured data opportunities
3. Internal linking strategy
4. Mobile experience requirements

---

## Competitor & Pricing Intelligence

### Required for Product-Class WRs

Every product WR must include:

| Competitor | Price | Key Features | Gap | Our Advantage |
|------------|-------|-------------|-----|---------------|
| Example Co | $99/mo | Feature A, B | Missing C | We have C + D |

**Rules:**
- Prices must be actual numbers, not "Paid tiers" or "Contact sales"
- If price is unknown: "Pricing data pending — competitive benchmark research required"
- Features must be specific, not vague
- Gaps must be actionable (something we can build)

---

## Research Brief Output Format

The research orchestrator produces a structured brief that populates WR fields:

```yaml
research_brief:
  wr_id: "WR-NNNNN"
  topic: "<research topic>"
  depth: "bug|style|docs|product|research|infrastructure"

  findings:
    - claim: "<specific claim>"
      tier: "A1|A2|B2|B3"
      confidence: 0.0-1.0
      evidence:
        - type: "doi|url|commit|doc"
          source: "<citation>"
          quote: "<relevant excerpt>"

  competitor_intelligence:
    - name: "<competitor>"
      price: "<actual price or pending>"
      features: ["<specific feature>"]
      gaps: ["<specific gap>"]

  sem_seo:
    primary_keywords: ["<keyword>"]
    long_tail: ["<query>"]
    content_gaps: ["<missing coverage>"]

  method_divergence:
    methods_found: 10
    contrarian_findings:
      - issue: "<why method X might fail>"
        confidence: 0.0-1.0
    adjacent_domains:
      - domain: "<other industry>"
        method: "<transferable approach>"

  synthesis:
    recommended_approach: "<method with highest confidence>"
    rejected_approaches: ["<method + reason>"]
    open_questions: ["<what still needs validation>"]

  build_authorization: true|false
  build_blockers: ["<why build should not proceed>"]
```

---

## Integration with WR Pipeline

### Step 1: WR Intake

User submits `[WR] <title>`. The system detects title-only and triggers expansion.

### Step 2: Template Selection

`TITLE_TO_WR_EXPANSION.md` selects template:
- Bug/style/docs → `WR_TEMPLATE_BASIC.md`
- Product/research/infrastructure → `WR_TEMPLATE_FULL.md`

### Step 3: Research Execution

Research orchestrator runs based on WR class depth requirements.

### Step 4: Field Population

Research brief populates WR form fields:
- `## Background & Motivation` ← research context
- `## Approach` ← recommended approach from synthesis
- `## Risks & Mitigations` ← contrarian findings
- `## Competitor & Pricing Intelligence` ← competitor table
- `## Research Findings` ← tiered findings summary

### Step 5: Build Authorization

`wr-lint.mjs` validates:
- [ ] Research brief is attached
- [ ] All findings are tiered
- [ ] A1/A2 findings justify the approach
- [ ] B3 findings are flagged and approved
- [ ] Competitor table is complete (product WRs)
- [ ] SEM/SEO analysis is present (product WRs)

If any check fails, build is blocked until research is complete.

---

## Invariants

1. No code without research. No exceptions.
2. Shallow research is rejected. Depth is not optional.
3. Every claim is cited. Every citation is verifiable.
4. B3 findings never drive production decisions without owner approval.
5. Contrarian findings with confidence >0.7 trigger a second cycle.
6. Research brief is attached to every WR. It is not a separate document.

---

*Last updated: 2026-11-09*  
*Next review: When research orchestrator models or tier thresholds change*
