# Polar.sh Funding Strategy → $10M in 3 Years

## Prime Directive
Start at $10k/month → Scale to $10M total by year 3.

## Phase Roadmap

| Phase | Timeline | MRR Target | Key Levers |
|-------|----------|------------|------------|
| 1 | Month 1-6 | $10k/mo | Polar.sh setup, OSINT MVP, GitHub sponsors |
| 2 | Month 6-18 | $30k/mo | Paid tiers, API keys, first B2B contracts |
| 3 | Month 18-30 | $100k/mo | Enterprise OSINT, automated product pipeline |
| 4 | Month 30-36 | $10M total | Acquisition-ready ARR, scale + exit optionality |

## Focus Areas

### 1. Polar.sh (GitHub Funding Platform)
- Enable Polar.sh on all public repos
- Define sponsor tiers: $5, $25, $100, $500, $2500/mo
- Ship benefits: private issue access, priority PRs, Discord role, monthly office hours
- Cross-link from every README and release notes

### 2. OSINT Tools
- Package existing scripts into installable CLIs (pipx, npm, go install)
- Offer hosted SaaS tier with API + dashboard
- Publish weekly threat-intel digest → lead magnet
- Sell datasets and enrichment endpoints per-call

### 3. Automated Product Pipeline
- Issue → PR → deploy loop via OpenRouter agent (already live)
- Auto-generate landing pages per product
- Auto-publish to Polar.sh + GitHub Sponsors + Stripe
- Track MRR in a single dashboard (`/metrics`)

## Weekly Cadence
- Mon: ship one revenue-affecting change
- Wed: publish OSINT content (SEO + funnel)
- Fri: review MRR, churn, and pipeline metrics

## KPIs
- MRR growth rate ≥ 20% MoM in Phase 1
- Gross margin ≥ 80% (SaaS + sponsorship)
- CAC payback < 3 months
- Free → paid conversion ≥ 3%

## Next Actions
1. Publish Polar.sh tiers page
2. Ship OSINT CLI v0.1 to PyPI
3. Wire Stripe + Polar webhooks to `/metrics`
4. Automate weekly digest via existing agent pipeline
