# Layered WR Search-Research Engine

The layered search-research engine powers Weekly Research (WR) automation. It
orchestrates retrieval, multi-model research agents, synthesis, and a
code-review-style fix loop before committing the final report.

## Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                     WR Search-Research Engine                        │
├──────────────────────────────────────────────────────────────────────┤
│  1. Optional Live Retrieval (Tavily / Firecrawl / Perplexity)        │
│  2. Domain Research Agents (OpenRouter multi-model consensus)        │
│  3. Synthesis (single model rolls findings into one report)          │
│  4. Reviewer Pass (code-review-style gap detection)                  │
│  5. Auto Fix Pass (rewrites report to satisfy reviewers)             │
│  6. Commit `docs/wr/issue-<number>-research.md`                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Domain Agents

The engine runs eight specialized agents. Each agent is asked the same
question through up to `RESEARCH_MAX_MODELS_PER_AGENT` OpenRouter models
and the answers are consensus-merged.

| Agent              | Focus                                              |
| ------------------ | -------------------------------------------------- |
| Source Map         | Authoritative sources, docs, repos                 |
| Competitors        | Direct/indirect competitors and positioning        |
| Marketing / SEO    | Channels, keywords, content angles                 |
| Audience           | Personas, pains, jobs-to-be-done                   |
| Chatter            | Reddit/HN/X/forums sentiment and quotes            |
| Security           | Risks, compliance, threat surface                  |
| Cost               | Build/run cost, pricing benchmarks                 |
| Implementation     | Concrete build plan and milestones                 |

## Environment Variables

Required:

- `OPENROUTER_API_KEY` — used for every model call.

Optional retrieval:

- `TAVILY_API_KEY`
- `FIRECRAWL_API_KEY`
- `PERPLEXITY_API_KEY`

Tuning:

- `RESEARCH_MAX_MODELS_PER_AGENT` (default `3`)
- `RESEARCH_CONSENSUS_MODELS` (comma-separated OpenRouter model ids)
- `RESEARCH_SYNTHESIS_MODEL`
- `RESEARCH_REVIEW_MODEL`
- `RESEARCH_FIX_MODEL`
- `RESEARCH_OUTPUT_DIR` (default `docs/wr`)

## Usage

### Local

```bash
node scripts/research-engine.js \
  --issue 123 \
  --title "OSINT pricing benchmarks" \
  --body "Research WR scope..."
```

The engine writes `docs/wr/issue-123-research.md` and prints the path on
stdout.

### GitHub Actions

Both `weekly-research.yml` and `research-module.yml` invoke
`scripts/research-engine.js`, commit the resulting markdown file, and
apply the `research:reviewed` and `research:fix-committed` labels when
the reviewer/fix passes run.

## Output Format

Each report contains:

1. **Executive Summary**
2. **Per-Agent Findings** (with cited sources where available)
3. **Synthesis** — combined narrative across agents
4. **Reviewer Notes** — gaps detected and how they were resolved
5. **Next Actions** — concrete WR follow-ups

## Labels

Canonical labels used by the engine:

- `search-research-engine`
- `research:source-map`
- `research:competitors`
- `research:marketing`
- `research:audience`
- `research:chatter`
- `research:security`
- `research:cost`
- `research:implementation`
- `research:reviewed`
- `research:fix-committed`

These are defined in `.github/labels.yml` and synced by
`.github/workflows/sync-labels.yml`.

## Compatibility

`scripts/research-module.js` is kept as a thin compatibility entrypoint
that delegates to `scripts/research-engine.js` so existing automation
and documentation references continue to work.
