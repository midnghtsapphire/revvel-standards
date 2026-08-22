# PedalToTheMetal — Enterprise oAudrey inventory

**Status:** Inventory only. Not a ship. Not a second pipeline.  
**Home:** this repo.  
**WR:** [#17892](https://github.com/midnghtsapphire/revvel-standards/issues/17892)

These files already exist. This page points at them. It does not add a controller,
engine, schema, workflow, or secret. Local `Documents/AI Architecture New` notes
are not in this VM and are not cited.

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

---

## OpenRouter, GOAP, fleet (already in-repo)

| Path | Already says |
| --- | --- |
| `.github/workflows/openrouter-assignee.yml` | First-line assign on the existing issue path |
| `.github/workflows/openrouter-coder.yml` | Implementation PR when `wr:code` or `spec-approved` |
| `.github/workflows/goap-assignment-router.yml` | GOAP assignment router |
| `.github/workflows/fleet-controller.yml` | Existing fleet scheduler — **do not modify or fork** |
| `docs/Master_Inventory/GOAP_AGENT_STANDARD.md` | Goap agent standard |
| `standards/GOAP_SWARM_RULES.md` | Production-safe swarm rules |

---

Honesty: **CAN-PARTIAL** — inventory of the listed paths only. No runtime attached.
