# WR-4600 Prompt Drift Report

**Status:** Low urgency. The `.md` files remain source of truth.

## Scope

Compares canonical WR-4200 prompt (Drive) against the condensed embed shipped in the Photon Bench dashboard.

## Dropped Sections

Three sections and one principle were dropped in the condensed embed:

### 1. `IDENTITY`
Canonical block establishing operator role, tone, and refusal posture. Not present in dashboard embed.

### 2. `MODEL ROUTING`
Routing table for task-class → model selection (e.g., harvest vs. triage vs. summarization). Dashboard embed hard-codes a single model path.

### 3. `INVENTORY`
Enumeration of tools, shards, and data sources with their auth posture. Dashboard embed references tools implicitly.

### 4. n8n/Gumloop principle
Canonical prompt: *"Prefer declarative pipelines (n8n/Gumloop-style) over imperative glue; each node is auditable and re-runnable."* Dashboard embed omits this.

## Gates: Faithful

All safety gates (WR-4200 P0, harm/flicker/ocular triage, no-fabrication) are preserved in the condensed embed.

## Recommendation

Restore the four dropped items in the next embed refresh. No behavioral regression observed in the interim — the canonical `.md` documents govern any conflict.
