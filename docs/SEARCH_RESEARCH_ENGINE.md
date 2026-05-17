# Revvel Search-Research Engine

**Status:** Implemented  
**Primary script:** `scripts/research-engine.js`  
**Compatibility entrypoint:** `scripts/research-module.js`  
**Workflows:** `.github/workflows/research-module.yml`, `.github/workflows/weekly-research.yml`

## What It Does

The search-research engine turns every WR-grade research request into a layered, reviewed research artifact:

1. Checks retrieval readiness for Tavily, Firecrawl, and Perplexity.
2. Runs named research agents for source mapping, competitors, marketing/SEO, audience, chatter, security, cost/revenue, and implementation.
3. Uses OpenRouter model consensus for each research agent.
4. Synthesizes the agent reports into one WR-ready Markdown document.
5. Runs code-review-style research reviewers.
6. Applies reviewer feedback through an automatic fix rewrite before committing the report.

## Agent Areas

| Agent | Label | Area |
| --- | --- | --- |
| Iris | `research:source-map` | Official sources, docs, repos, APIs, standards, citations |
| Atlas | `research:competitors` | Competitors, alternatives, gaps, market positioning |
| Echo | `research:marketing-seo` | Keywords, offer framing, ad hooks, domain signals |
| Lumen | `research:audience` | Target users, buyer intent, objections, why this audience matters |
| Scout | `research:chatter` | Community chatter, reviews, complaints, repeated pain language |
| Shield | `research:review` | Security, privacy, compliance, abuse risks |
| Ledger | `research:review` | Cost, operating burden, lead economics, revenue path |
| Forge | `research:review` | Implementation actions, workflows, labels, tests |

## Review Agents

| Reviewer | Focus |
| --- | --- |
| Mirror | Evidence quality, contradictions, and confidence |
| Aria | Code-review readiness and auto-fix usability |
| Cipher | Security and credential risks |
| Quill | Growth completeness across SEO, competitors, audience, and chatter |

## Required Environment

`OPENROUTER_API_KEY` is required. These optional keys add live retrieval:

- `TAVILY_API_KEY`
- `FIRECRAWL_API_KEY`
- `PERPLEXITY_API_KEY`

Cost and model controls:

- `RESEARCH_MAX_MODELS_PER_AGENT` defaults to `3`
- `RESEARCH_CONSENSUS_MODELS` defaults to `anthropic/claude-sonnet-4,openai/gpt-4.1,google/gemini-2.5-pro`
- `RESEARCH_SYNTHESIS_MODEL` defaults to `anthropic/claude-opus-4`
- `RESEARCH_REVIEW_MODEL` defaults to `anthropic/claude-sonnet-4`
- `RESEARCH_FIX_MODEL` defaults to `anthropic/claude-opus-4`

## Manual Run

```bash
OPENROUTER_API_KEY=... \
QUESTION="Research the best engine for WR competitor and audience discovery" \
OUTPUT_FILE="docs/wr/manual-research.md" \
node scripts/research-engine.js
```

## WR Automation

When an issue is opened with `[WR]` in the title or the `weekly-research` label, `.github/workflows/weekly-research.yml` now:

- applies the research engine labels,
- runs `scripts/research-engine.js`,
- commits `docs/wr/issue-<number>-research.md`,
- comments the output link on the issue,
- applies `wr:research-complete`, `research:reviewed`, `research:fix-committed`, and `wr:complete`.

If `OPENROUTER_API_KEY` is missing, the workflow comments once and applies `credentials-missing` and `openrouter:needs-key`.
