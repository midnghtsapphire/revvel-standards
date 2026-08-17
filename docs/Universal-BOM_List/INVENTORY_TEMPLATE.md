# Inventory Template — [BUSINESS / PROJECT NAME]

**Version:** 1.0.0  
**Template For:** Every MIDNGHTSAPPHIRE business, product, or project  
**Usage:** Copy this file to `docs/<project-name>/INVENTORY.md` and fill in all sections. For a cross-business view, entries are rolled up into [`docs/_MASTER_INVENTORY.md`](../_MASTER_INVENTORY.md).

> **Important:** Do **not** store API keys, secret tokens, passwords, or any credentials in this file. Describe *what the service does*, not the secret that accesses it. All credentials live in HashiCorp Vault.

---

## [BUSINESS / PROJECT NAME] Inventory

**Last Updated:** [DATE]  
**Business Type:** [Tech Project / E-Commerce / Rental / Mobile App / Other]  
**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ Active | Provisioned and in use |
| 🔵 Configured | Set up but not yet in active production use |
| 🟡 Research Topic | Worth evaluating — not yet adopted |
| ⚠️ Expiring Soon | Renewal or upgrade decision needed within 30 days |
| ❌ Expired / Lapsed | Subscription ended or trial over — action required |
| 🗑️ Removed | Evaluated and rejected — kept for reference |
| 🧪 Trial Active | Free trial in progress — decision pending |

---

## 1. APIs & External Services

> Every external API or service this project calls. Do **not** paste keys — describe what the service does.

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| [e.g. Anthropic Claude API] | Primary LLM for autonomous agent tasks: reasoning, planning, code generation | Anthropic | No free tier | $20–100/mo | First production call (no free tier) | ❌ Expired / Lapsed | Provision in Vault at `/revvel/[project]/llm/anthropic` |
| [e.g. Resend] | Transactional email delivery for account confirmations and alerts | Resend | 3,000 emails/mo | $0 free / $20+/mo | Exceeds 3,000 emails/month | ✅ Active | Vault: `/revvel/[project]/email/resend` |
| [Add others...] | | | | | | | |

---

## 2. Subscriptions & Software Licenses

> Tools, SaaS subscriptions, and software licenses used by this business. Includes both free and paid.

| Item | What It Does | Provider | Plan / Tier | Cost | Renewal Date | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| [e.g. Shopify Basic] | E-commerce storefront, inventory, and order management | Shopify | Basic | $39/mo | Rolling monthly | Exceeds 2 staff accounts or needs reporting features | ✅ Active | — |
| [e.g. Apple Developer Program] | iOS App Store publishing and TestFlight distribution | Apple | Standard | $99/yr | [DATE] | App Store submission ready | ❌ Expired / Lapsed | Purchase before first TestFlight build |
| [Add others...] | | | | | | | | |

---

## 3. Domain Names & DNS

| Domain | What It's Used For | Registrar | Renewal Date | Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| [e.g. example.com] | Primary domain for this product | Namecheap | [DATE] | ~$15/yr | Domain expiry date (set auto-renew) | ✅ Active | DNS managed via Cloudflare |
| [Add others...] | | | | | | | |

---

## 4. Physical Inventory (if applicable)

> For product-based businesses (Vine House, coffee store, specialty stores). Skip this section for pure software projects.

| Product / SKU | Description | Category | Unit Cost | Sale Price | Stock Quantity | Reorder Point | Storage Location | Status |
|---|---|---|---|---|---|---|---|---|
| [e.g. VH-001] | [Product name and brief description] | [Category] | $[X] | $[X] | [#] | [#] | [Location] | ✅ In Stock |
| [Add others...] | | | | | | | | |

---

## 5. Monthly Cost Summary

| Category | Service | Monthly Cost | Notes |
|---|---|---|---|
| Hosting | DigitalOcean (shared) | ~$5/mo | Pro-rated share of shared droplet |
| Database | DigitalOcean MySQL (shared) | ~$2/mo | Pro-rated share |
| Email | Resend | $0 | Free tier (3k/mo) |
| [API 1] | [Provider] | ~$X/mo | |
| [API 2] | [Provider] | ~$X/mo | |
| **Total Fixed Monthly** | | **~$X/mo** | |
| **Variable** | [Payment processor] | [Transaction %] | |

---

## 6. Annual / One-Time Costs

| Item | Cost | Purchase Date | Renewal Date | Status |
|---|---|---|---|---|
| Domain registration | ~$15/yr | [DATE] | [DATE] | [✅ Active / ❌ Expired] |
| Apple Developer Program | $99/yr | [DATE] | [DATE] | [✅ Active / ❌ Not purchased] |
| Google Play Developer | $25 (one-time) | [DATE] | N/A | [✅ Active / ❌ Not purchased] |
| [Other one-time item] | $[X] | [DATE] | [DATE] | |

---

## 7. Research Topics — Items to Evaluate

> Tools or services identified as potentially valuable but not yet adopted. Include a rationale and a suggested next step.

| Item | Category | What It Does | Why Consider It | Est. Cost | ⚡ UPGRADE TRIGGER | Suggested Next Step | Priority |
|---|---|---|---|---|---|---|---|
| [e.g. Klaviyo] | Email Marketing | E-commerce email automation; abandoned cart, order follow-ups | Better ROI than generic email for e-commerce | Free (500 contacts) / $20+/mo | Exceeds 500 contacts | Evaluate once store has first 100 customers | P2 |
| [Add others...] | | | | | | | |

---

## 8. Expired / Lapsed — Action Required

> Items that have expired or lapsed and require an immediate decision.

| Item | What It Does | Last Active | ⚡ Action Required | Priority |
|---|---|---|---|---|
| [e.g. Stripe (live mode)] | Payment processing for subscriptions | — | Activate Stripe live mode before launch | P0 |
| [Add others...] | | | | |

---

## 9. Removed / Decided Against

> Document every service or tool evaluated and rejected to prevent re-evaluating the same options.

| Item | What It Was | Reason Removed | Date | Alternative Used |
|---|---|---|---|---|
| [e.g. PlanetScale] | Serverless MySQL database | Removed free tier; too expensive at scale | April 2026 | DigitalOcean MySQL |
| [Add others...] | | | | |

---

## Inventory Checklist

Run this checklist monthly or after any significant change:

- [ ] All active services listed with correct status?
- [ ] No API keys or tokens stored in this file?
- [ ] ⚡ UPGRADE TRIGGER column filled in for every service?
- [ ] Any services approaching quota limits flagged as ⚠️ Expiring Soon?
- [ ] Any lapsed subscriptions or expired domains flagged as ❌ Expired?
- [ ] Physical inventory counts updated (if applicable)?
- [ ] Monthly cost summary reflects current actual spend?
- [ ] Research Topics section reviewed — any items to promote or discard?
- [ ] Master Inventory [`docs/_MASTER_INVENTORY.md`](../_MASTER_INVENTORY.md) updated with any changes?

---

*Inventory Template v1.0.0 — Revvel Standards. Copy to every project and business. Last updated: April 2026.*  
*Do not store credentials in this file. All secrets belong in HashiCorp Vault.*
