# WR-4600 Prompt Drift Report

**Status:** Low urgency. Markdown specs remain source of truth.

## Scope
Compare canonical WR-4200 prompt (Drive) vs shipped dashboard embed.

## Findings

### Dropped from condensed embed
1. **IDENTITY** section — operator persona, tone constraints, refusal patterns.
2. **MODEL ROUTING** section — provider selection matrix (Anthropic/OpenAI/local fallbacks).
3. **INVENTORY** section — asset registry and dependency graph.
4. **n8n/Gumloop principle** — automation-first orchestration guidance.

### Faithful to canonical
- All safety gates (HARM/FLICKER/OCULAR).
- WR-4200 P0 incident definition (fabricated citation).
- Snapshot immutability requirement.
- Adverse-first shard ordering.
- Delta-not-breakthrough reporting.

## Assessment
Dropped sections are **operational scaffolding**, not gate logic. The dashboard
embed is a condensed operator card, not a spec replacement. The `.md` files in
`wr/research/` and `WR-4600.3-harvest-spec.yml` remain the load-bearing source.

## Recommendation
No immediate action. If a future dashboard iteration needs the full prompt,
regenerate from the canonical `.md` files rather than editing the embed.

---
_WR-4600 follow-up. No citations, no fabrication._
