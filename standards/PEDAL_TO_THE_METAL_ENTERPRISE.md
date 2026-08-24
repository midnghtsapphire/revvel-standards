# PedalToTheMetal — Enterprise oAudrey inventory

**Status:** Inventory only. Not a ship. Not a second pipeline.  
**Home:** this repo.  
**WR:** [#17892](https://github.com/midnghtsapphire/revvel-standards/issues/17892)  
**This PR:** [#17900](https://github.com/midnghtsapphire/revvel-standards/pull/17900) (draft, review this)

These files already exist. This page points at them. It does not add a controller, engine, schema, workflow, secret, company, or architecture platform.

---

## Launch cut (what Audrey reviews)

Ship **this page + the existing paths below**. Nothing else.

| Do | Do not |
| --- | --- |
| Point at in-repo oAudrey / OpenRouter / GOAP / fleet files | Create a new repo, org, or “AI Architecture” product |
| Keep `fleet-controller.yml` as-is | Fork or replace the fleet controller |
| Leave local `Documents/AI Architecture New` on disk | Copy the vault, PDFs, `(1)` clones, or `40-scratch` here |
| Use `10-canon` thinking later, one note at a time, via a new WR | Dump the study pile into GitHub |

Closed / parked (do not revive):

- [#17895](https://github.com/midnghtsapphire/revvel-standards/pull/17895) — automated WR-essay on #17892. Parked.
- [#17902](https://github.com/midnghtsapphire/revvel-standards/pull/17902) — Jules schema + `metal-findings-engine.js`. Closed, not merged.
- [#17904](https://github.com/midnghtsapphire/revvel-standards/pull/17904) — Jules WR rewrite that re-opened the engine. Closed, not merged.
- Do not merge #17897 / #17907 / #17818 from this work.

---

## Enterprise oAudrey (already in-repo)

| Path | Already says |
| --- | --- |
| `revenue/oaudrey-malama-open-core.md` | Open-core tiers, including **ENTERPRISE / DONE-FOR-YOU** |
| `oaudrey/PRICING.md` | Free Mālama vs Pro / Team / Enterprise oAudrey |
| `config/enterprise-matrix.json` | Enterprise `id` 1, `name` oAudrey, `type` orchestrator |
| `products/ai-architecture-framework/ai_architecture_system.md` | oAudrey ecosystem architecture notes |
| `docs/REVVEL_MASTER_STANDARDS.md` | oAudrey UI live-test subdomain (`<app>.oaudrey.com`) |

---

## Call chain and engines (already in-repo)

| Path | Already says |
| --- | --- |
| `START_HERE_CALL_CHAIN.md` | WR issue → OpenRouter assignee → research → WR PR → coder (`wr:code` \| `spec-approved`) → CI → ship |
| `engines/CONTRACT.md` | Orchestrator / engine / runner contract |

The stall is still the missing `wr:code` / `spec-approved` handoff. This page does not add a kickoff workflow.

---

## OpenRouter, GOAP, fleet (already in-repo)

| Path | Already says |
| --- | --- |
| `.github/workflows/openrouter-assignee.yml` | First-line assign on the existing issue path |
| `.github/workflows/openrouter-coder.yml` | Implementation PR when `wr:code` or `spec-approved` |
| `.github/workflows/goap-assignment-router.yml` | GOAP assignment router |
| `.github/workflows/fleet-controller.yml` | Existing fleet scheduler — **do not modify or fork** |
| `docs/Master_Inventory/GOAP_AGENT_STANDARD.md` | GOAP agent standard |
| `standards/GOAP_SWARM_RULES.md` | Production-safe swarm rules |

---

Honesty: **CAN-PARTIAL** — inventory of the listed paths only. No runtime attached. No OpenRouter spend for this update.
