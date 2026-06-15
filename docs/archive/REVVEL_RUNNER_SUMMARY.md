# Revvel Runner — Execution OS Summary

> **PRIME DIRECTIVE:** $10k/month → $10M in 3 years.
> This document explains the paradigm shift from "standards engine" to **execution OS**.

## The Shift

| Before | After |
|--------|-------|
| Revvel produced **standards, plans, goals** | Revvel produces **shipped artifacts** |
| Failures were vague ("configure X") | Failures emit a **Procurement BOM** |
| Engines wrote prose | Engines write **code, deploys, API calls** |
| State was implicit | State is `state.json`, schema-enforced |
| One layer (engine) | Three layers: **Orchestrator → Engine → Runner** |

## The Three Layers

### 1. Orchestrator
- Owns `state.json`.
- Routes intake from `docs/inbox/` to engines.
- Refuses intake without `revenue_target_monthly_usd` + `goal_phase`.
- Halts on `needs_procurement`.

### 2. Engines
- Stateless; called by the orchestrator.
- Either produce artifacts or invoke runners.
- Forbidden from descriptive-only output.

### 3. Runners
- Execute on a closed set of targets: `github`, `vercel`, `supabase`, `zapier`, `make`, `n8n`, `gumloop`, `polar`, `cli`, `browser`.
- On missing access → emit **Procurement BOM**.

## The Procurement BOM Rule

The single most important mechanism. When a runner can't execute:

1. It MUST emit `docs/projects/<project>/BOM.md` listing every missing credential, account, API, infra item with **cost, source, and acquisition steps**.
2. The orchestrator halts.
3. Humans procure.
4. The orchestrator resumes.

No more "set your env vars." No more vague failures. Every gap becomes a **shopping list**.

## Files Introduced

- `docs/inbox/TEMPLATE.md` — intake frontmatter.
- `engines/CONTRACT.md` — Orchestrator/Engine/Runner contract.
- `schemas/state.schema.json` — state validation.
- `engines/runner-orchestrator/README.md` — top-level dispatcher.
- `docs/standards/RUNNER_TARGETS.md` — approved targets + BOM rule.
- `docs/projects/life-insurance-lead-saas/BOM_TEMPLATE.md` — reusable BOM skeleton.
- `docs/projects/life-insurance-lead-saas/BOM.md` — first concrete BOM (Phase-1 revenue).

## Why This Maps to $10M

- **Phase 1 ($10k/mo):** First BOM (life-insurance-lead-saas) ships a Polar-monetized lead SaaS in <14 days. Procurement is bounded (<$100 total).
- **Phase 2 ($30k/mo):** Same orchestrator forks into 3 vertical lead SaaS (HVAC, solar, dental); BOMs reused; runners parallelized.
- **Phase 3 ($100k/mo):** OSINT product line shipped via the same runner set; Polar storefront scales horizontally.
- **Phase 4 ($10M total):** Every new product is an intake → BOM → engine chain → runner deploy. The OS itself is the moat.

The orchestrator preserves the revenue goal across every step. **No step exists that doesn't move us toward $10M.**
