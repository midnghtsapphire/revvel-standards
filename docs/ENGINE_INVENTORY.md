# Engine Inventory Map

> Status: **Living inventory** · Author: revvel engine-spine agent (claude-code) · Added: 2026-06-25
> Purpose: map the suggested Revvel engine categories to what **already exists** in this
> repo, so we wire/extend rather than duplicate. This document is **additive** and
> descriptive only — it preserves the existing orchestrator, goals, and stats.

This is an **inventory**, not a re-architecture. The Revvel Execution OS already has a
three-layer spine (Orchestrator → Engines → Runners) defined in
[`engines/CONTRACT.md`](../engines/CONTRACT.md) and implemented in
[`engines/runner-orchestrator/orchestrate.js`](../engines/runner-orchestrator/orchestrate.js).
The orchestrator **owns goals/stats**; engines/runners do last-mile work and emit
artifacts, receipts, and state patches for the orchestrator to aggregate.

## Legend

- **existing** — a working file/workflow/script already covers this.
- **partial** — exists but only covers part of the suggested scope; extend additively.
- **missing** — no current coverage; safe to add additively.

## Category → Repo Mapping

| Category | Status | Existing file(s) / where it lives | Gap / additive action |
|----------|--------|-----------------------------------|------------------------|
| intake | existing | `docs/inbox/TEMPLATE.md`; `parseIntake`/`normalizeIntake` in `engines/runner-orchestrator/orchestrate.js`; `scripts/email_error_intake.py` | Extended frontmatter added in `docs/inbox/TEMPLATE.revvel.md` (additive). |
| evaluator | existing | `standards/DECISION_SCORING_ENGINE_STANDARD.md`; `docs/HIGH_VALUE_OPPORTUNITY_SELECTION_STANDARD.md`; research engine `scripts/research-engine.js` | None — reuse. |
| shape-router | existing | `deliverChannelFor` / `SHAPE_TO_CHANNEL` / `OUTPUT_TYPE_TO_CHANNEL` in `orchestrate.js`; `standards/shapes/*.md` | None — routing already classifies output_type/shape. |
| BOM | existing | `writeBom` in `orchestrate.js`; `docs/Universal-BOM_List/*`; `docs/projects/life-insurance-lead-saas/BOM*.md` (incl. `docs/projects/life-insurance-lead-saas/BOM_TEMPLATE.md`) | Lead-vendor specifics added in `BOM.revvel.md` (additive). |
| orchestrator | existing | `orchestrate()` + `runEngineLoop()` in `orchestrate.js`; `docs/orchestration/project-orchestration-standard.md` | None — owns `state.json`, preserves revenue goal. |
| runner-orchestrator | existing | `engines/runner-orchestrator/README.md` + `orchestrate.js` | None. |
| build-app | existing | `products/cli-engine/*` (Next.js); `docs/DEFAULT_APP_TEMPLATE.md`; `standards/shapes/APP.md` | None. |
| build-api | existing | `standards/shapes/API.md`; `standards/API_GATEWAY.md`; deliver channel `api` | None. |
| build-cli | existing | `standards/shapes/CLI.md`; `products/cli-engine/*`; `standards/CLI_MCP_AUTOMATION.md` | None. |
| build-mcp | existing | `standards/shapes/MCP.md`; `.mcp.json`; `standards/CLI_MCP_AUTOMATION.md` | None. |
| build-pdf/doc | existing | `standards/shapes/PDF.md`; `standards/shapes/EXCEL.md`; deliver channel `pdf`/`docs` | None. |
| build-automation | existing | `standards/CONTENT_AUTOMATION_STANDARD.md`; `standards/AUTOMATED_PRODUCT_PIPELINE.md` | None. |
| deploy-vercel | existing | `scripts/deploy-vercel.js` (`npm run deploy:vercel`); `vercel.json`; runner target `vercel` | None. |
| deploy-supabase | existing | runner target `supabase` (schema + RUNNER_TARGETS); `skills/grant-mgmt-agent/templates/database-schemas/supabase-schema.sql` | None. |
| deploy-github | existing | runner target `github`; 166+ `.github/workflows/*.yml` | None. |
| compliance | existing | `scripts/check-compliance.js` (`tests/check-compliance.test.js`); `docs/COMPLIANCE_TRACKER.md` | None. |
| security | existing | `standards/SECURITY.md`; `.secrets.baseline`; `standards/GATEKEEPER.md` | None. |
| cost | existing | BOM cost columns; `docs/API_LIMIT_AUTO_UPGRADE.md`; `standards/PRICING.md` | None. |
| goal-score | existing | `GOAL.md` / `GOAP.md` (orchestrator-owned goals); `scripts/agent-scorecard/index.js`; `docs/AGENT_SCORECARD_STANDARD.md` | **Do not modify goal values** — see PRESERVE standard. |
| launch-announcement | existing | `README_SOCIAL_MEDIA_AUTOMATION.md`; `scripts` social post formatter; `docs/ECO_MARKETPLACE_ACTIONS.md` | None. |
| publish-artifact | existing | `ship-to-market.yml` (`tests/ship-to-market.test.js`); deliver channels | None. |
| market | existing | `standards/Master_Inventory/AFFILIATE_MARKETING_STANDARD.md`; `docs/ECO_MARKETPLACE_ACTIONS.md` | None. |
| measure | existing | `templates/standards/mixpanel-*`, `posthog-*`; `standards/AMPLITUDE_INTEGRATION_STANDARD.md` | None. |
| lead-metrics | existing | `docs/field-maps/INSURANCE_LEADS_FIELD_MAP.md`; `docs/Master_Inventory/LEADS_STANDARD.md`; `.github/workflows/cypress-lead-engine.yml` | None. |
| api-usage | existing | `docs/API_LIMIT_AUTO_UPGRADE.md`; `docs/Universal-BOM_List/API_REGISTRY_BOM.md` | None. |
| learning/archive | existing | `learnings.md`; `docs/archive/*` (archive, not delete); `standards/COMMENT-DONT-DELETE.md` | None. |

## Spine wiring (no duplication)

The suggested per-engine entrypoints (`intake`, `shape-router`, `bom`, `orchestrator`)
are **already fulfilled by a single combined CLI**,
`engines/runner-orchestrator/orchestrate.js` (`npm run engine`):

- intake → `parseIntake` / `normalizeIntake`
- shape-router → `deliverChannelFor`
- bom → `writeBom` + the `needs_procurement` halt path
- orchestrator → `orchestrate()` + `runEngineLoop()`

New separate `run.js` stub files were **intentionally not created** to respect
`standards/AGENT_SCAFFOLDING_BAN.md` and avoid duplicating working logic. The
GitHub workflow `.github/workflows/revvel-engine-spine.yml` invokes the existing
CLI (dry-run by default).

## Related standards & summaries

- [`engines/CONTRACT.md`](../engines/CONTRACT.md) — engine/runner interface + hard rules.
- [`docs/standards/RUNNER_TARGETS.md`](standards/RUNNER_TARGETS.md) — approved runners + Procurement BOM rule.
- [`standards/PRESERVE_GOALS_AND_HISTORY.md`](../standards/PRESERVE_GOALS_AND_HISTORY.md) — no-delete + goals-are-sacred.
- [`standards/COMMENT-DONT-DELETE.md`](../standards/COMMENT-DONT-DELETE.md) — RVS-AGENT-001 audit-trail.
- [`docs/archive/REVVEL_RUNNER_SUMMARY.md`](archive/REVVEL_RUNNER_SUMMARY.md) — runner-spine summary (archived, preserved).
