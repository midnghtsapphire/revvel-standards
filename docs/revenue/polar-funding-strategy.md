# Polar.sh Funding Strategy → $10M in 3 Years

## Prime Directive
Start at **$10k/month** → Scale to **$10M total by year 3**.

## Phase Roadmap
| Phase | Months | Target MRR | Cumulative |
|-------|--------|-----------:|-----------:|
| 1     | 1-6    | $10k       | $60k       |
| 2     | 6-18   | $30k       | $420k      |
| 3     | 18-30  | $100k      | $1.62M     |
| 4     | 30-36  | $250k+     | $10M       |

## Focus Areas

### 1. Polar.sh — GitHub-native monetization
- Enable Polar on all public repos with real users.
- Tiered sponsorship: $19 / $99 / $499 / $2,499 per month.
- Ship a `FUNDING.yml` pointing to Polar for every product repo.
- Auto-post release notes with a sponsor CTA.

### 2. OSINT tools
- Package the existing scrapers/enrichers as paid Polar products.
- Free tier (rate-limited) + Pro ($49/mo) + Team ($299/mo).
- Distribute via CLI + hosted API; both gated on a Polar license key.

### 3. Automated product pipeline
- Each merged issue → candidate micro-product.
- Weekly review: promote top-performing scripts to Polar SKUs.
- Track CAC / LTV in `docs/revenue/metrics.md` (see below).

## Weekly Operating Cadence
1. **Mon** — Review Polar dashboard, tag winners.
2. **Wed** — Ship one paid feature or new SKU.
3. **Fri** — Publish changelog + sponsor CTA on socials.

## KPIs
- New Polar subscribers / week
- MRR growth rate (target: 20% MoM in Phase 1)
- Churn (< 5% monthly)
- Free → Paid conversion (target: 3%+)

## Immediate Next Actions
- [ ] Add `.github/FUNDING.yml` with Polar link.
- [ ] Publish first three OSINT SKUs on Polar.
- [ ] Wire release workflow to post sponsor CTA.
