# WR: About Us | Dimed Laser #tool #app needed

**Issue:** #15262
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-07-06
**Research Date:** 2026-07-06
**Researcher:** Copilot + OpenRouter
**WR Status:** 🟡 In Progress

---

## Issue Context

**Source URL:** https://dimedlaser.com/about-us/

**Tags:** `#tool` `#app`

Dimed Laser (Wuhan Dimed Laser Technology Co., Ltd.) is a national high-tech manufacturer
specializing in medical and surgical diode laser systems. Their About Us page showcases
20+ years of R&D expertise, their product lines (Berylas, Cherylas, Harlas), certifications
(ISO 13485, CE/EU-MDR), and global distribution across hospitals and clinics in America,
Australia, the Middle East, Asia, and Africa.

The request is to build a **tool and/or app** inspired by or serving the Dimed Laser
product discovery and clinic engagement use-case — specifically a web-based
**Medical Laser Product Selector / Clinic Discovery App** that lets practitioners and
clinic buyers identify the right diode laser system for their treatment area, compare
specifications, and request a demo or quote.

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A — new product |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis (table includes actual prices)
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->

## WR-Ready Research Packet: Dimed Laser Product Selector / Clinic Discovery App

## 1. Executive Decision

**DECISION: BUILD — GREEN LIGHT**

The medical laser equipment market is large (~$6.1 billion globally in 2024, growing at
~14% CAGR — [ResearchAndMarkets](https://www.researchandmarkets.com/reports/5923074/medical-laser-market-analysis-and-forecast)),
and no purpose-built, open-source product-selector SaaS exists for medical laser equipment.
Dimed Laser's product breadth (10+ clinical specialties, 3 major product lines) creates a
clear gap: buyers lack a guided discovery tool. A Next.js app deployed on Vercel with a
Polar.sh subscription paywall is a fast-to-ship, revenue-capable product.

**Scope:** Guided product-selector wizard + comparison table + quote-request form,
initially seeded with Dimed Laser's public catalog as validation data. Expandable to a
multi-vendor marketplace.

## 2. Audience We Are Going After and Why

**Primary Target: Medical Clinic Procurement Managers & Specialist Clinicians**

| Segment | Pain Point | Willingness to Pay |
|---|---|---|
| Dental clinic owners (US, AU, EU) | Confusing laser specs across vendors — hard to pick right wavelength | $20–$80/month for a guided selector tool |
| Med-spa operators | No aggregated comparison tool for aesthetic diode lasers | $30–$100/month |
| Hospital biomedical buyers | Must issue RFQs without a structured feature comparison | Enterprise tier $200+/month |
| Distributors/resellers | No white-label tool to send clients | White-label SaaS license $500+/month |

**Why now:**
- Dental diode laser market ~$316M (2024), forecast CAGR 4–6.5% through 2034 —
  [Future Market Insights](https://www.futuremarketinsights.com/reports/dental-lasers-market)
- Procurement is still highly manual; most clinics email PDFs and compare on Excel
- 50%+ of Dimed Laser's team are senior technicians with 10+ years experience —
  knowledge that can be structured into a guided wizard

## 3. Marketing and SEO Plan

**Primary Keywords (estimated monthly search volume — estimates due to lack of SEMrush/Ahrefs access; verify before paid ad spend):**
- "medical laser product selector" — low volume, low competition → high conversion intent
- "diode laser comparison dental" — ~500–1K/mo (internal estimate)
- "best medical laser for clinic" — ~1K–5K/mo (internal estimate)
- "laser equipment for physiotherapy clinic" — ~500/mo (internal estimate)
- "surgical laser system buyer guide" — ~200–500/mo (internal estimate)

**Landing Page Hook:**
> "Answer 3 questions. Get the right medical laser in 60 seconds."

**Content Strategy:**
1. **Pillar Page:** "Complete Guide to Choosing a Medical Diode Laser for Your Clinic"
2. **Comparison Pages:** Dental vs. surgical vs. aesthetic lasers
3. **Buyer Guides:** 810nm vs 980nm vs 1064nm wavelength comparisons
4. **Case Studies:** Use-case walkthroughs (perio treatment, soft-tissue surgery, dermatology)

**Distribution:**
- LinkedIn (targeting dental and med-spa practitioners)
- r/Dentistry, r/medicaldevices, r/PlasticSurgery subreddits
- Dental trade press (Dental Tribune, Dentistry.co.uk)
- Affiliate partnerships with dental equipment distributors

## 4. Competitor and GitHub Star Intelligence

| Competitor | Pricing | Key Features | GitHub Stars | Moat/Weakness |
|---|---|---|---|---|
| [Pabau](https://pabau.com) | ~$90–$150/mo (by quote) | All-in-one clinic mgmt, no laser selector | N/A (closed) | General clinic mgmt, not laser-focused |
| [Carepatron](https://carepatron.com) | Free–$49/mo | Small clinic EHR | N/A | No device/equipment discovery |
| [Easy Clinic (Cura AI)](https://www.easyclinic.io) | Custom quote | AI-driven workflow | N/A | No product-selection feature |
| Manufacturer PDFs (Dimed, BIOLASE, Fotona) | Free | Static brochures | N/A | No guided filtering, no comparison |
| [BIOLASE](https://biolase.com) | Devices $3K–$50K | Waterlase, dental focus | N/A (hardware) | No cross-vendor comparison |
| [Fotona](https://fotona.com) | Devices $10K–$100K | Surgical + aesthetic | N/A (hardware) | No guided selector tool |

**Market Gap:** No OSS or affordable SaaS provides a guided, neutral medical-laser product
selector with live comparison and quote-request capability. The space is dominated by
manufacturer brochures and generic clinic management tools.

## 5. Chatter and Demand Signals

- Dental forums consistently ask "which diode laser should I buy for X treatment" —
  no structured tool answers this (internal estimate from dental Reddit/forums searches)
- r/Dentistry: repeated requests for wavelength comparison guides
- LinkedIn: Dimed Laser regularly exhibits at PhilMedical Expo 2026, indicating active
  global sales push → buyers need a faster evaluation tool
- Distributors in MEA/APAC markets operate without digital selector tools —
  high white-label opportunity

## 6. Factual Validation and Evidence Gaps

**Verified Facts:**
- Dimed Laser: ISO 13485 + CE/EU-MDR certified, Wuhan, China, 20+ years experience —
  [dimedlaser.com/about-us/](https://dimedlaser.com/about-us/)
- Global medical laser market ~$6.1B in 2024, ~14% CAGR —
  [ResearchAndMarkets](https://www.researchandmarkets.com/reports/5923074/medical-laser-market-analysis-and-forecast)
- Dental diode laser market ~$316M in 2024 —
  [Future Market Insights](https://www.futuremarketinsights.com/reports/dental-lasers-market)
- Dimed product lines: Berylas (30W compact), Cherylas (60W high-intensity), Harlas
  (portable therapy laser) — [dimedlaser.com](https://dimedlaser.com)

**Evidence Gaps:**
- Exact buyer decision-making flow (requires user interviews or distributor feedback)
- Specific keyword volume data (requires SEMrush/Ahrefs access)
- Dimed Laser device pricing (not publicly listed — contact sales required)

## 7. Build Requirements and Acceptance Gates

### MVP Features

1. **Guided Selector Wizard** — 3–5 questions (specialty, power range, portability, budget)
   mapping to recommended product categories
2. **Product Comparison Table** — side-by-side: wavelength, output power, clinical
   applications, certifications, weight/portability
3. **Product Detail Pages** — per device: specs, clinical use-cases, key differentiators,
   brochure download link
4. **Quote/Demo Request Form** — captures clinic name, contact, selected product, use-case
5. **Email Capture / Waitlist** — Polar.sh or Resend-powered
6. **Responsive UI** — mobile-first, accessible (WCAG 2.1 AA)

### Tech Stack (recommended)

- **Frontend:** Next.js 14+ (App Router), Tailwind CSS, shadcn/ui components
- **Data:** Static JSON product catalog (seeded from Dimed public spec sheets)
- **Forms:** React Hook Form + Zod validation
- **Email:** Resend (transactional) or Nodemailer
- **Payments/Subscriptions:** Polar.sh (white-label plan for distributors)
- **Deployment:** Vercel
- **Analytics:** PostHog

### Acceptance Gates

- [ ] Wizard correctly maps all 10+ Dimed clinical specialties to product recommendations
- [ ] Comparison table renders ≥ 3 products side-by-side on mobile
- [ ] Quote-request form submits and delivers confirmation email
- [ ] Lighthouse Performance ≥ 90 on mobile
- [ ] WCAG 2.1 AA accessibility pass
- [ ] Zero hardcoded API keys or secrets in committed code
- [ ] Unit/integration test coverage ≥ 80% for wizard logic and form validation

## Executive Summary

Build a **Medical Laser Product Selector & Clinic Discovery App** (Next.js, Vercel, Polar.sh)
seeded with Dimed Laser's publicly documented product catalog. The app guides practitioners
through a 3–5 question wizard to surface the best-fit laser system, provides side-by-side
spec comparisons, and captures quote/demo leads. Monetization via white-label SaaS licenses
for distributors ($500+/month) and a freemium/pro tier for individual clinics ($20–$80/month).

This is a greenfield product with no direct open-source competitor, fitting squarely in the
Phase 1 → Phase 2 revenue ramp of the PRIME DIRECTIVE.

## Step 1A — Product/Output Selections

- **Output Type:** Production web app (Next.js + Vercel)
- **Delivery Shape:** SaaS with Polar.sh subscription (freemium + white-label)
- **Lifecycle Mode:** New product — ship MVP, then iterate on catalog expansion
- **Commercial Mode:** B2B SaaS + white-label licensing

## Step 2 — Deep Web Research

### Market Sizing

| Metric | Value | Source |
|---|---|---|
| Global medical laser market (2024) | ~$6.1B | [ResearchAndMarkets](https://www.researchandmarkets.com/reports/5923074/medical-laser-market-analysis-and-forecast) |
| Diode laser share | ~44% of medical laser market | [ResearchAndMarkets](https://www.researchandmarkets.com/reports/5923074/medical-laser-market-analysis-and-forecast) (estimate) |
| CAGR (medical laser) | ~14% | [ResearchAndMarkets](https://www.researchandmarkets.com/reports/5923074/medical-laser-market-analysis-and-forecast) |
| Dental diode laser market (2024) | ~$316M | [Future Market Insights](https://www.futuremarketinsights.com/reports/dental-lasers-market) |
| Dental diode laser CAGR | 4–6.5% through 2034 | [Future Market Insights](https://www.futuremarketinsights.com/reports/dental-lasers-market) |

### Competitive Pricing Benchmark

| Tool | Monthly Price | Notes |
|---|---|---|
| Pabau | ~$90–$150/mo | General clinic mgmt; no laser selector |
| Carepatron | Free–$49/mo | Small-clinic EHR; no device discovery |
| Easy Clinic | Custom quote | AI workflow; no product-selection |
| Praxify | $1/user/mo | Lean EMR; no equipment search |
| **Proposed App** | $20–$80/mo (clinic); $500+/mo (white-label) | Laser-specific selector + comparison |

## Step 3 — Requirements

### Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| F1 | Guided wizard: ≥ 3 specialty/need filters → product recommendation | P0 |
| F2 | Side-by-side comparison table for ≥ 3 products | P0 |
| F3 | Product detail pages with downloadable spec sheet links | P0 |
| F4 | Quote/demo request form with email confirmation | P0 |
| F5 | Email capture / waitlist for Polar.sh integration | P1 |
| F6 | White-label theming (logo, color palette swap via config) | P1 |
| F7 | Admin panel: add/edit product catalog entries | P2 |
| F8 | Multi-vendor catalog expansion (beyond Dimed) | P3 |

### Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NF1 | Lighthouse Performance (mobile) | ≥ 90 |
| NF2 | WCAG 2.1 AA accessibility | Pass |
| NF3 | Time to First Byte | < 200ms (Vercel Edge) |
| NF4 | Core Web Vitals (LCP) | < 2.5s |
| NF5 | Zero secrets in source | Enforced by secret scanning |

## Recommendations

1. **Ship MVP in 1 sprint:** Focus on F1–F4 only — wizard, comparison, detail pages, form.
2. **Seed with Dimed Laser catalog:** Use their public product pages and spec sheets.
   All data is publicly available; no licensing issues.
3. **Polar.sh freemium gate:** Free = wizard + comparison (3 products max);
   Pro = unlimited comparisons + white-label + admin panel.
4. **Validate with 3 dental clinic owners** before building the admin panel (F7).
5. **SEO play:** Publish wavelength comparison guides as static MDX pages
   to capture long-tail organic traffic from clinic buyers.

## Dependencies

| Field | Value |
|---|---|
| `depends_on` (prerequisite WRs) | none |
| Blocked by | none |
| Blocks (downstream WRs) | none |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dimed Laser rebrands or changes product catalog | Low | Medium | Keep catalog in versioned JSON; update quarterly |
| Medical device regulations restrict marketing claims | Medium | High | Avoid clinical efficacy claims; use vendor-neutral spec comparisons only |
| Low SEO traction for niche keywords | Medium | Medium | Supplement with LinkedIn/forum distribution; focus on white-label B2B channel |
| White-label buyers need HIPAA compliance | Medium | High | Add BAA option in Polar.sh enterprise plan; consult legal before launch |
| Competitor (e.g., a major EMR) ships laser selector add-on | Low | High | Ship fast; establish SEO and distributor pipeline before incumbents notice |

## BOM (Bill of Materials)

| Item | Cost | Notes |
|---|---|---|
| Vercel Hobby (dev) | $0/mo | Upgrade to Pro at $20/mo when traffic > hobby limits |
| Vercel Pro (production) | $20/mo | Required for custom domain + bandwidth |
| Resend (email) | $0–$20/mo | 3K emails/mo free; $20/mo for 50K |
| Polar.sh | 5% transaction fee | No monthly fee on Hobby plan |
| PostHog Cloud | $0–$20/mo | 1M events/mo free |
| Domain (e.g., laserselect.io) | ~$15/yr | Optional; can use Vercel subdomain initially |
| **Total MVP** | **~$0–$60/mo** | Scales with revenue |

## Domain Strategy

- **Preferred:** `laserselect.io` or `medselector.io` — neutral, multi-vendor positioning
- **Alternative:** `dimedlaser-selector.com` — vendor-specific, easier initial SEO
- **White-label:** `{distributor-name}.laserselect.io` subdomains — N/A until first white-label client onboards

## Monetization Path

| Tier | Price | Features | Target |
|---|---|---|---|
| Free | $0 | Wizard + 3-product comparison | Individual practitioners |
| Pro | $29/mo | Unlimited comparisons + export PDF | Clinic buyers |
| Team | $79/mo | Multi-user + saved comparisons | Group practices |
| White-label | $499/mo | Custom branding + own catalog | Distributors/resellers |
| Enterprise | Custom | HIPAA BAA + API access + SLA | Hospital systems |

**Revenue target:** 10 white-label clients = $5K MRR; 200 Pro users = $5.8K MRR →
combined $10.8K MRR aligns with Phase 1 PRIME DIRECTIVE goal of $10K/month.
