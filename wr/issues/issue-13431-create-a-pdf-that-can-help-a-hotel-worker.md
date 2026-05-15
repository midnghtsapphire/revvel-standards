---
title: "Hotel Worker OSINT & Security Field Guide (PDF)"
issue_id: 13431
phase: 1
revenue_lever: osint_reports
batch_id: 2025-q1-osint
status: ✅ Complete
owner: midnghtsapphire
created: 2025-01-15
updated: 2025-01-15
priority: high
target_price_usd: 19
upsell_price_usd: 199
platform_primary: Gumroad
platform_secondary: LemonSqueezy
---

# 📘 Hotel Worker OSINT & Security Field Guide

> **Prime Directive Alignment:** This PDF is a Phase 1 revenue product targeting the `$10k/month` goal via the `osint_reports` revenue lever. It is part of the `2025-q1-osint` batch in the PDF playbook.

---

## 1. Executive Summary

A concise, actionable field guide for front-desk staff, night auditors, housekeepers, and hotel security teams. It teaches practical open-source intelligence (OSINT) and situational-awareness techniques to:

- **Spot fake IDs and fraudulent bookings** at check-in.
- **Vet suspicious phone numbers** (burner detection, carrier lookup, reverse lookup).
- **Identify human-trafficking indicators** per DHS Blue Campaign and Polaris Project standards.
- **Respond safely and lawfully** without escalating risk to staff or guests.

**Format:** ~40-page PDF, printable pocket-reference card, and a companion checklist.

---

## 2. Target Audience

| Segment | Pain Point | Purchase Trigger |
|---|---|---|
| Independent hotel owners | Liability exposure, no training budget | Regulatory pressure, insurance discounts |
| Front-desk staff | Untrained, afraid of confrontation | Personal safety, career advancement |
| Hotel security teams | Need SOPs and reference material | Compliance audits |
| Hospitality trainers | Need ready-made curriculum | Resale via training programs |
| Franchise compliance officers | AHLA / No Room for Trafficking mandates | Corporate policy rollouts |

---

## 3. Content Outline

### Part I — Check-In Threat Assessment
1. Anatomy of a real vs. fake ID (holograms, UV, microprint, barcode parity)
2. State-by-state ID quick-reference cards
3. Behavioral red flags at the desk
4. Third-party bookings and prepaid card anomalies

### Part II — Phone & Identity OSINT
5. Free reverse-lookup workflow (Truecaller, NumVerify, carrier CNAM)
6. Burner/VoIP detection heuristics
7. Email and booking-name cross-checks (Have I Been Pwned, Epieos)
8. Social-media corroboration within legal bounds

### Part III — Trafficking Indicators (Polaris / DHS Blue Campaign)
9. Guest-behavior indicators
10. Room-service and housekeeping indicators
11. Minor-specific red flags
12. Safe reporting: National Human Trafficking Hotline (1-888-373-7888), Text 233733

### Part IV — Response Playbooks
13. Non-confrontational de-escalation scripts
14. Evidence preservation (CCTV, folio, ID scan retention laws)
15. Law-enforcement handoff checklist
16. Staff aftercare and legal protections

### Appendices
- Printable pocket card (fake-ID quick check)
- Trafficking indicator one-pager
- Incident-report template
- State reporting statutes quick-reference

---

## 4. Monetization Strategy

### Pricing Tiers
| Tier | Price | Contents |
|---|---|---|
| **Individual** | $19 | PDF + pocket card |
| **Team (up to 10)** | $79 | PDF + editable checklist + printable posters |
| **Property License** | $199 | Unlimited staff, SOP template, onboarding slides |
| **Enterprise / Franchise** | $999+ | White-label, multi-property, quarterly updates |

### Distribution
- **Primary:** Gumroad (instant payouts, affiliates, discount codes).
- **Secondary:** LemonSqueezy (EU VAT compliance, merchant-of-record).
- **Tertiary:** Direct B2B sales to franchise compliance officers via cold email.

### Promotion Channels
- LinkedIn posts targeting `#HospitalitySecurity`, `#HumanTraffickingAwareness`.
- Partnerships with AHLA, No Room for Trafficking, Polaris Project (free community tier).
- SEO blog posts: "How to spot a fake ID at the hotel front desk".
- Paid: Google Ads on high-intent keywords (`hotel staff trafficking training`).

### Revenue Projection (Phase 1 contribution)
- 200 individual sales/mo × $19 = **$3,800**
- 15 team licenses/mo × $79 = **$1,185**
- 10 property licenses/mo × $199 = **$1,990**
- 2 enterprise/mo × $999 = **$1,998**
- **Target: ~$9k/mo from this SKU alone**, contributing meaningfully to the $10k/mo Phase 1 goal.

---

## 5. Technical Implementation

### Source & Build Pipeline
- **Source:** Markdown in `products/osint-reports/hotel-worker-guide/`.
- **Build:** `remark-cli` → `markdown-pdf` (or Pandoc + LaTeX for print-quality).
- **CI:** GitHub Actions workflow on push to `main` → artifact upload → auto-publish to Gumroad via API.
- **Versioning:** Semantic (`v1.0.0`), changelog in `CHANGELOG.md`.

### Assets Required
- [ ] Cover art (Canva / Midjourney, licensed)
- [ ] State ID reference images (public-domain / DMV sources only)
- [ ] Icons (Heroicons MIT)
- [ ] Legal disclaimer (reviewed; no legal advice)

### Legal & Ethics Guardrails
- Cite all OSINT sources; no paid-database scraping.
- Explicit disclaimer: "Not legal advice. Not a substitute for law enforcement."
- Emphasize **reporting, not intervention**.
- No PII examples; all sample cases synthetic.

---

## 6. Readiness Checklist

- [x] WR scoped and frontmatter populated
- [x] Target audience validated
- [x] Pricing model set
- [x] Distribution platforms selected
- [ ] Draft content (Parts I–IV)
- [ ] Legal review
- [ ] Cover + layout
- [ ] Gumroad product page live
- [ ] Launch email sequence written
- [ ] Affiliate program activated

---

## 7. Next Actions

1. Spin off draft issue `issue-13432-draft-hotel-guide-parts-I-II.md`.
2. Commission cover art.
3. Set up Gumroad product (`hotel-osint-guide`) with $19 launch price.
4. Pre-launch waitlist landing page on Polar.sh-adjacent marketing site.
5. Outreach to 25 hospitality trainers for pre-orders + testimonials.

---

## 8. References

- DHS Blue Campaign — Hospitality Toolkit
- Polaris Project — Human Trafficking Indicators
- AHLA "No Room for Trafficking" initiative
- `docs/pdf-playbook.md` (internal)
- `docs/revenue-levers.md` (internal)

---

**Status:** ✅ Complete — ready to move into drafting phase.
