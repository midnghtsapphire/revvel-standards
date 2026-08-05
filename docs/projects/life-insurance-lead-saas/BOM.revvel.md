---
project: life-insurance-lead-saas
intake_id: lils-001
# Goals preserved by reference only — DO NOT edit goal values here.
# Source of truth: GOAL.md (Phase 1 = $10k/month on the $10M/3yr path).
revenue_target_monthly_usd: 10000
goal_phase: 1
generated_by: revvel engine-spine agent (claude-code)
generated_at: 2026-06-25
status: open
relationship: >-
  Additive sidecar to BOM.md. BOM.md covers the Meta-Lead-Ads MVP path;
  this file adds the lead-vendor / compliance / data-broker procurement
  detail and source URLs. Neither file overwrites the other.
---

# Lead-Vendor & Compliance BOM (Revvel addendum) — Life Insurance Lead SaaS

> **Additive addendum** to [`BOM.md`](BOM.md), emitted under the Procurement BOM rule in
> [`docs/standards/RUNNER_TARGETS.md`](../../standards/RUNNER_TARGETS.md). It does **not**
> replace `BOM.md`; it supplies the lead-sourcing, quoting-API, anti-fraud, and compliance
> line items that the MVP BOM did not enumerate.
>
> **Mission anchor (preserved):** unblocks **Phase 1 → $10k/month** on the **$10M/3yr**
> directive (`GOAL.md`). Goal values above are references, not new goals.

## Goals (preserved references — not new goals)

- Phase 1 target: `revenue_target_monthly_usd: 10000` (see `GOAL.md`).
- This addendum changes **no** goal/stat values; it only lists procurement.

## Human Approval Required (no self-procurement / no spend)

**Explicit human approval is REQUIRED before any procurement, purchase, paid API
activation, lead buying, or live outreach.** The agent does **not** self-procure and
does **not** spend money. Everything below is a **dry-run procurement plan** only.

- No account creation, credential purchase, or contract sign-up without human sign-off.
- No activation of paid APIs (Compulife, TrustedForm, Jornaya, ScrubLock, BatchData, etc.).
- No buying, selling, or live delivery of leads.
- No live outreach (email/SMS/calls) to consumers or agents.
- A human operator must review this BOM and explicitly authorize each blocking item
  before it is acquired or enabled.

## Lead Vendor Categories

| Category | What it provides | Example vendors |
|----------|------------------|-----------------|
| Real-time quoting API | Term/whole-life quote engine to display rates | Compulife |
| Consent / TrustedForm certs | Proof-of-consent certificates for TCPA | ActiveProspect TrustedForm |
| Lead authenticity / Jornaya | LeadiD tokens, consent + tamper evidence | ActiveProspect / Jornaya (LeadiD) |
| Lead scrubbing / suppression | DNC, duplicate, litigator, and bad-actor scrub | ScrubLock / ScrubLite |
| Skip-trace / data enrichment | Phone, address, property enrichment for leads | BatchData |
| LLM routing | Lead qualification + copy generation | OpenRouter |
| Automation / MCP runner | Form → DB → CRM → email orchestration | Zapier (MCP) |

## APIs & Source URLs

| # | Name | Category | Cost (USD) | Source URL | Acquisition | Blocking |
|---|------|----------|------------|------------|-------------|----------|
| 1 | Compulife Quote API | api | quote-based (contact sales) | <https://www.compulife.com/> (API: <https://www.compulifeapi.com/>) | Request API credentials; sandbox first | true |
| 2 | TrustedForm (consent certs) | api | from ~$0.07/cert | <https://activeprospect.com/products/trustedform/> | ActiveProspect account → embed cert script → store cert URL | true |
| 3 | Jornaya / LeadiD | api | contact sales | <https://www.jornaya.com/> | Add LeadiD campaign script; capture token per lead | false |
| 4 | ScrubLock / ScrubLite (DNC + scrub) | service | from ~$0.01/lookup | <https://scrublock.com/> (ScrubLite: <https://www.scrublite.com/>) | Account + API key; scrub before delivery | true |
| 5 | BatchData skip-trace/enrichment | api | usage-based | <https://batchdata.com/> (API: <https://developer.batchdata.com/>) | API key; enrich phone/address | false |
| 6 | OpenRouter LLM routing | credential | usage-based | <https://openrouter.ai/keys> | Create key → set `OPENROUTER_API_KEY` secret | true |
| 7 | Zapier MCP automation | service | from $0 (free tier) | <https://zapier.com/mcp> | Connect Zapier MCP; build form→DB→email Zap | true |

## MVP Stack

- **Frontend/app:** Next.js on **Vercel** (runner target `vercel`).
- **DB/auth/storage:** **Supabase** Postgres (runner target `supabase`).
- **Payments/monetization:** **Polar.sh** lead-pack product (runner target `polar`).
- **Automation:** **Zapier MCP** / Make scenario (form → Supabase → Polar webhook → email).
- **Repo/CI:** **GitHub** (runner target `github`).

## Compliance Gates (MANDATORY before live lead sale)

- **TCPA** — express written consent + TrustedForm/Jornaya cert per lead. Ref: <https://www.fcc.gov/tcpa>
- **DNC scrub** — scrub against national/state DNC before contact (ScrubLock/ScrubLite). Ref: <https://www.donotcall.gov/>
- **State insurance licensing** — verify buyer agents are licensed in the lead's state.
- **GDPR/CCPA** — privacy policy + data-subject rights for applicable jurisdictions.
- **E-SIGN** — disclosure + consent capture for electronic signatures.

> Live paid APIs are **not wired** here. This is a **dry-run procurement BOM** only.

## Data Model (lead record — illustrative)

| Field | Type | Notes |
|-------|------|-------|
| lead_id | uuid | primary key |
| consent_cert_url | text | TrustedForm cert URL |
| leadid_token | text | Jornaya LeadiD token |
| state | text | drives licensing/DNC rules |
| product_interest | text | term / whole / final-expense |
| scrub_status | enum | clean / dnc / duplicate / litigator |
| enrichment | jsonb | BatchData payload |
| sold_to_agent_id | uuid | nullable until sold |

## CLI BOM (operator tooling)

- `npm run engine -- --slug life-insurance-lead-saas --revenue 10000 --output-type api-product` — build state + route.
- Scrub/enrich CLI wrappers (procurement): keys for ScrubLock + BatchData (items 4–5 above).

## Automation Blueprint

```text
Lead form (TrustedForm + LeadiD scripts)
      │
      ▼
Zapier MCP / Make ──► Supabase (insert lead, status=new)
      │
      ▼
Scrub (ScrubLock) ──► clean? ──no──► suppress + log
      │ yes
      ▼
Enrich (BatchData) ──► Quote (Compulife) ──► qualify (OpenRouter)
      │
      ▼
Polar.sh checkout (lead pack) ──► deliver to licensed agent ──► email receipt
```

## Procurement List (blocking items first)

1. Compulife API credentials (item 1) — blocking.
2. TrustedForm account + cert script (item 2) — blocking.
3. ScrubLock/ScrubLite API key (item 4) — blocking.
4. OpenRouter `OPENROUTER_API_KEY` (item 6) — blocking.
5. Zapier MCP connection (item 7) — blocking.
6. Jornaya/LeadiD (item 3), BatchData (item 5) — non-blocking enrichment.

## Build Decision

**Buy-vs-build:** **Buy** lead authenticity (TrustedForm/Jornaya), quoting (Compulife),
and scrubbing (ScrubLock) — regulated/commodity capabilities not worth rebuilding.
**Build** the thin SaaS shell (Next.js + Supabase + Polar) and the orchestration
(Zapier MCP / Make). Halt and resolve blocking procurement items before any live run.
