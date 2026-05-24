# Blueprint: Life Insurance Lead Engine

## Problem

Independent life insurance agents waste 60-80% of their time prospecting low-quality leads. Existing lead vendors charge $30-$80 per lead with 5-10% close rates. High-net-worth medical professionals (surgeons, specialists, dentists) are the highest-value insurance prospects but are notoriously hard to reach.

## Solution

Automated tool that:
1. Pulls verified medical professional contact data from the public NPPES NPI Registry.
2. Scores leads by specialty income tier (A/B/C).
3. Generates context-aware pitch scripts addressing the specific financial pain points of each specialty.
4. Dedupes existing lead lists to maximize ROI.

## Target Customer

- **Primary:** Independent life insurance agents ($50k-$300k annual income)
- **Secondary:** IMOs and FMOs distributing to downline agents
- **Tertiary:** Financial advisors selling annuities & IUL

## Unit Economics

- CAC (Customer Acquisition Cost): $45 (paid ads + content)
- LTV (Lifetime Value): $1,164 (avg 12 months × $97)
- Gross Margin: 92%
- Payback Period: 0.5 months

## Distribution Channels

1. **Polar.sh** — Primary checkout & subscription mgmt
2. **GitHub** — Open-core dedupe utility as lead magnet
3. **YouTube** — "How I 10x'd my insurance leads with NPI data"
4. **LinkedIn** — Agent group outreach
5. **Reddit** — r/InsuranceAgent, r/financialadvisors

## Moat

- Specialty-specific pitch scripts (not just data).
- Continuous data refresh (NPPES updates weekly).
- Network effect: agent-shared best-performing scripts.

## 90-Day Roadmap

- Day 1-7: Ship MVP, deploy to Vercel.
- Day 8-30: Onboard 25 beta agents at $47/mo.
- Day 31-60: Raise to $97/mo, add CRM integrations.
- Day 61-90: Add SMS/email outreach automation. Target $10k MRR.
