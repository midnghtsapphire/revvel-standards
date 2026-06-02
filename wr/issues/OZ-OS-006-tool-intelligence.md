# WR: Tool Intelligence Registry + 4 Backfilled Tools

**WR ID:** OZ-OS-006
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001

## Deliverable
Single file: `oz-os/tool-intelligence/tools.md`

## Content Requirements
A registry of tools evaluated by the team, with honest assessments. This generalizes
the pattern already established in `revvel-standards/docs/Universal-BOM_List/LLM_RECOMMENDATIONS.md`.

### Per-Tool Entry Format

```yaml
---
tool_id: TOOL-2026-001
name: <tool name>
category: [orchestration, testing, research, deployment, ...]
evaluated: 2026-06-01
evaluator: <agent or human>
confidence: 0.0–1.0
recommendation: keep | research-only | replace | archive
---
```

Followed by markdown sections:
- **Strengths** — what it does well
- **Weaknesses** — what it does poorly or dangerously
- **Use Cases** — where to deploy it
- **Anti-Patterns** — where NOT to use it
- **Vendor Risk** — lock-in, tracking, pricing changes, EOL risk

## Four Tools to Backfill

### 1. Manus
- **Strengths:** Excellent orchestration, multi-step task handling
- **Weaknesses:** Vendor lock-in, tracking insertion, indirect API routing
- **Recommendation:** Research only — not production runtime

### 2. Keploy
- **Strengths:** API regression testing, traffic capture and replay
- **Weaknesses:** Not a complete Mabl replacement, limited UI testing
- **Recommendation:** Keep — backend API testing

### 3. Perplexity
- **Strengths:** Research-first retrieval, citation-heavy output
- **Weaknesses:** API costs scale with query complexity, no local deployment
- **Recommendation:** Keep — research agent backend

### 4. OpenRouter
- **Strengths:** Multi-model gateway, cost optimization, fallback routing
- **Weaknesses:** Single point of failure for all LLM calls, rate limits
- **Recommendation:** Keep — primary LLM gateway (with direct-API fallback)

## Acceptance
- File contains 4 backfilled tool entries
- Each entry has strengths, weaknesses, and recommendation
- No raw tokens or bracket-placeholders
- Format is consistent and machine-parseable
