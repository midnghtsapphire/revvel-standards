# Life Insurance Lead Engine

A production-ready Next.js application that generates high-value life insurance leads by querying the NPPES NPI Registry API for medical professionals, scoring them by specialty, and producing tailored pitch scripts. Also includes a CSV/Excel deduplication utility.

## Mission Alignment

This product is part of the **$10M in 3 Years** prime directive pipeline.

- **Phase 1 Target:** $10k/month — high-ticket life insurance commissions (avg. $2k-$8k per policy bound).
- **Channel:** Independent insurance agents & IMOs (Independent Marketing Organizations).
- **Pricing Model:** $97/month SaaS + $497 one-time lifetime tier, or 10% rev-share on closed policies via affiliate link.

## Features

1. **NPI Lead Generator** — Query NPPES public API by ZIP code & specialty.
2. **Priority Scoring** — Tier A/B/C based on income potential.
3. **Pitch Script Engine** — Specialty-tailored scripts (disability, IUL, estate planning).
4. **Dedupe Tool** — Exact email/phone match + fuzzy name match (Fuse.js).
5. **CSV Export** — Downloadable lead lists ready for dialer import.

## Mandatory UI Components (EXRUP)

- Affiliate Marketing card
- Newsletter signup
- Accessibility Controls (high contrast, large text)

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Fuse.js (fuzzy matching)
- PapaParse (CSV)
- SheetJS (Excel)

## Quick Start

```bash
cd build
npm install
npm run dev
```

## Monetization

- **SaaS:** $97/mo subscription via Polar.sh
- **Lifetime:** $497 one-time via Polar.sh
- **Affiliate:** 10% rev-share on partner IMO policies
- **Newsletter:** Lead nurture funnel → upsell to coaching ($1,997)

## Revenue Projection

| Month | Customers | MRR |
|-------|-----------|-----|
| 1 | 25 | $2,425 |
| 3 | 75 | $7,275 |
| 6 | 110 | $10,670 ✅ |
| 12 | 320 | $31,040 |

## Compliance

- NPPES data is public domain (HHS).
- TCPA-compliant: leads are for licensed agents only; no auto-dialing without consent.
- GDPR/CCPA: opt-out mechanism in newsletter.
