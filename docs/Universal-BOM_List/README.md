# Universal BOM List — Revvel Standards

**Version:** 1.0.0  
**Date:** April 14, 2026  
**Status:** Living Document — Auto-Updated on Every Release  
**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## What Is This Folder

The **Universal BOM List** is the single source of truth for every tool, API, service, framework, and resource that the Revvel ecosystem uses or should evaluate. It lives here — not scattered across project BOMs — so the coding agent, Audrey, and every team member can find the complete picture at a glance.

This folder is the result of a full **self-healing evaluation** of the Revvel Standards repository: every asset, artifact, process, and gap was audited and catalogued so Revvel can continuously improve with maximum autonomy.

---

## Files in This Folder

| File | Purpose |
|---|---|
| [`README.md`](README.md) | This file — orientation and navigation |
| [`TOOLING_AND_TESTING_BOM.md`](TOOLING_AND_TESTING_BOM.md) | Exhaustive list of testing, QA, monitoring, and auto-healing tools (FOSS + paid) |
| [`UI_FIELD_TESTING_BOM.md`](UI_FIELD_TESTING_BOM.md) | Tools for UI-to-database field testing and mapping validation — the DBA process BOM |
| [`API_REGISTRY_BOM.md`](API_REGISTRY_BOM.md) | Every API Revvel needs, uses, or should evaluate — with priority and cost |
| [`SELF_HEALING_BOM_TEMPLATE.md`](SELF_HEALING_BOM_TEMPLATE.md) | Per-project self-healing BOM template — copy this into every new project |
| [`INVENTORY_TEMPLATE.md`](INVENTORY_TEMPLATE.md) | Per-project/per-business inventory template — tracks services, quotas, physical products, and upgrade triggers |
| [`LLM_RECOMMENDATIONS.md`](LLM_RECOMMENDATIONS.md) | Which LLMs to wire into Revvel for autonomous, self-improving agent operation |
| [`FOLDER_STRUCTURE_RECOMMENDATIONS.md`](FOLDER_STRUCTURE_RECOMMENDATIONS.md) | Recommended improvements to repo and docs folder structure |

---

## How the Self-Healing BOM System Works

Every Revvel project goes through 5 lifecycle phases. At each phase transition, the project's BOM is automatically evaluated — items are promoted, demoted, or removed based on what the project actually needs.

```text
Phase 0: Inception       → Seed BOM from template; prioritize P0 blockers
Phase 1: Planning        → Finalize stack choices; lock APIs; flag gaps
Phase 2: Development     → Update BOM as actual usage is confirmed
Phase 3: Testing         → Add error/monitoring tools; remove unused candidates
Phase 4: Deployment      → Add CDN, DNS, SSL, store accounts; mark purchased
Phase 5: Maintenance     → Archive unused items; plan upgrades; re-evaluate costs
```

The **Self-Healing BOM** process asks three questions at each phase:

1. **What do we need now that we don't have?** → Promote to P0 or P1
2. **What did we add that we're not using?** → Demote or remove
3. **What's new in the ecosystem that could replace or improve something we're using?** → Flag for evaluation

---

## Priority Levels

All items in every BOM file use this standard priority system:

| Priority | Label | Meaning |
|---|---|---|
| **P0** | 🔴 Critical | Blocks deployment or core functionality — do immediately |
| **P1** | 🟡 High | Required for production quality — do this sprint |
| **P2** | 🟢 Medium | Important for growth/scale — do next sprint |
| **P3** | 🔵 Low | Nice to have — evaluate when P0–P2 are complete |
| **P4** | ⚪ Research | Not yet decided — needs investigation before commitment |

---

## Recommended LLM for Autonomous Self-Healing

Based on exhaustive research (see [`LLM_RECOMMENDATIONS.md`](LLM_RECOMMENDATIONS.md)), the recommended primary LLM for wiring into Revvel Standards for autonomous BOM self-evaluation, code review, error triage, and documentation is:

> **Claude 3.7 Sonnet / Claude Opus 4** (Anthropic) — via the MCP Standard already in place

For the autonomous BOM agent loop specifically:
1. Claude reads each project's BOM + test results + error logs
2. Claude evaluates gaps, new tools, deprecations, and cost changes
3. Claude opens GitHub Issues for any P0 or P1 gaps it finds
4. Claude updates BOM files with new dates and statuses
5. The Ralph Loop (CI) ensures this runs on every deployment

---

## How to Use This Folder

### For new projects
1. Copy `SELF_HEALING_BOM_TEMPLATE.md` into `docs/<project-name>/BOM.md`
2. Copy `INVENTORY_TEMPLATE.md` into `docs/<project-name>/INVENTORY.md`
3. Fill in the stack decisions during Phase 0
4. Reference `TOOLING_AND_TESTING_BOM.md` to choose testing tools
5. Reference `API_REGISTRY_BOM.md` to identify required APIs

### For existing projects
1. Open the project's `BOM.md`
2. Run through the Self-Healing Checklist at the bottom of `SELF_HEALING_BOM_TEMPLATE.md`
3. Update status fields (`❌ Not purchased` → `✅ Active` / `🗑️ Removed`)
4. Re-run `scripts/sync-bom.sh` to update the master BOM
5. Review `INVENTORY.md` — update quota usage, flag any ⚡ UPGRADE TRIGGERs, and sync changes to `docs/_MASTER_INVENTORY.md`

### For the coding agent
- Reference `API_REGISTRY_BOM.md` to identify which APIs are available and what credentials to request
- Reference `TOOLING_AND_TESTING_BOM.md` to select the right testing tools per task
- After every major feature or deployment, run the Self-Healing Checklist
- Open a GitHub Issue for any P0 gap using label `bom-purchase` + `copilot`

---

## Regenerating the Master BOM

```bash
bash scripts/sync-bom.sh
```

This script pulls all `BOM.md` files from `docs/*/BOM.md`, extracts outstanding items, and rebuilds [`docs/_MASTER_BOM.md`](../_MASTER_BOM.md).

---

## Related Standards

| Standard | Location |
|---|---|
| Testing Standard | [`TESTING_STANDARD.md`](../Master_Inventory/TESTING_STANDARD.md) |
| Agent Factory Standard | [`AGENT_FACTORY_STANDARD.md`](../Master_Inventory/AGENT_FACTORY_STANDARD.md) |
| Deployment Standard | [`DEPLOYMENT_STANDARD.md`](../Master_Inventory/DEPLOYMENT_STANDARD.md) |
| MCP Standard | [`MCP_STANDARD.md`](../Master_Inventory/MCP_STANDARD.md) |
| Security Standard | [`SECURITY_STANDARD.md`](../Master_Inventory/SECURITY_STANDARD.md) |
| Vault Agent Standard | [`VAULT_AGENT_STANDARD.md`](../Master_Inventory/VAULT_AGENT_STANDARD.md) |
| Master Inventory | [`docs/_MASTER_INVENTORY.md`](../_MASTER_INVENTORY.md) |

---

*This document is maintained by the Revvel coding agent. Last audited: April 14, 2026.*
