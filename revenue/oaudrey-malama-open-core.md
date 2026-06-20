# oAudrey × Mālama — Open-Core Product Strategy

**Version:** 1.0.0
**Date:** 2026-06-20
**Owner:** Audrey Evans (Freedom Angel Corp)
**North star:** `AGENTS.md` — $10k/mo → $10M total

---

## 1. The Two-Layer Model

| Layer | Name | What it is | License |
|---|---|---|---|
| **Brand / product** | **oAudrey** | What customers buy — the Automation Software Hub (`<app>.oaudrey.com`) | Proprietary |
| **Engine** | **Mālama** | The open self-evolving agent loop inside oAudrey | **AGPLv3 (open core)** — `skills/malama/` |
| **Company / mission** | Freedom Angel Corp | Umbrella + giving pledge | — |

Positioning line: **"oAudrey runs on the Mālama engine."**
(Same shape as Devin→Cognition and OpenHands Cloud→OpenHands framework.)

---

## 2. Why Open-Core (OpenHands), Not Closed (Devin)

- **Devin:** closed, premium SaaS. No adoption funnel; competes on trust/price
  against a funded team. Wrong fit for a solo operator.
- **OpenHands:** open-core. A free framework is the marketing; revenue comes
  from hosted cloud + enterprise. **This is our model** — though we use copyleft
  (AGPLv3) instead of permissive (MIT) so the engine can't be quietly closed and
  resold against us.

The free Mālama engine is the top of the funnel. The repo *is* the ad.

---

## 3. Tiers

### FREE — Mālama Engine (open source, AGPLv3)
- The agent loop: `skills/malama/` (SKILL, SYSTEM_PROMPT, standard).
- Self-host, self-modify, full access. No support, no hosting.
- **Goal:** developer adoption, credibility, inbound.

### PRO — oAudrey (hosted, individual)
- Managed oAudrey, no setup. Higher run limits.
- Access to a starter set of vertical agents.
- **Goal:** convert self-hosters who don't want to run infra.

### CLOUD / TEAM — oAudrey (hosted, team)
- Team seats, connectors (Airtable, Notion, Slack, HubSpot, Gmail, Drive).
- Secrets vault / SSO, the full vertical catalog, priority support.

### ENTERPRISE / DONE-FOR-YOU
- Custom verticals, SLAs, dedicated runs, compliance.

---

## 4. The Paid Catalog Already Exists

These repo assets become the oAudrey paid verticals:

| Vertical | Source |
|---|---|
| Grant management | `skills/grant-mgmt-agent/` |
| OSINT intelligence | `osint-hub/`, OSINT skills |
| Tax & legal | `skills/tax-legal-agent/` |
| USDA / lending | `skills/usda-loan-agent/`, `products/life-insurance-lead-saas/` |
| ADA / accessibility | `skills/ada-compliance-agent/`, `skills/accessibility/` |
| Content automation | `skills/content-automation/` |
| HVAC BOM | `hvac-bom-generator*.html` |

Plus the existing Gumroad products in `revenue/REVENUE_PLAN.md` as the entry-price
funnel (AI Agent Starter Kit $97, Claude Code Setup $47, Swarm Blueprint $197).

---

## 5. The Unfair Advantage — Giving Pledge

oAudrey already pledges a percentage of every product's proceeds to
trafficking-survivor reskilling / recovery / restoration via Freedom Angel
Fighters (`oaudrey/README.md`). **Neither Devin nor OpenHands can say this.**
Lead with it on pricing and landing pages — it converts and it's true.

---

## 6. Boundary Rules (so the free core stays clean)

- Only `skills/malama/` is AGPLv3. Nothing else in the repo is relicensed.
- The free engine must contain **no secrets, no proprietary verticals, no
  customer data** — it is publishable as-is.
- Paid value lives in: hosting, connectors, seats, the vertical agents, support,
  and compliance — never in crippling the free engine.

---

## 7. Next Actions

1. Confirm `skills/malama/` is secret-free before any public push (it is today).
2. Land `oaudrey/PRICING.md` (customer-facing tiers).
3. Optionally split the Mālama engine into its own public repo later; keep it as
   the open-core directory here for now.
