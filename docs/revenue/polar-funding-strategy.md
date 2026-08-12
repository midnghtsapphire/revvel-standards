# Polar.sh Funding Strategy → $10M in 3 Years

## Prime Directive
Start at $10k/month → Scale to $10M total by year 3.

## Phase Roadmap

| Phase | Timeline | MRR Target | Cumulative |
|-------|----------|-----------|------------|
| 1 | Month 1-6 | $10k/mo | $60k |
| 2 | Month 6-18 | $30k/mo | $420k |
| 3 | Month 18-30 | $100k/mo | $1.62M |
| 4 | Month 30-36 | $1M/mo+ | $10M |

## Polar.sh Setup Checklist

- [ ] Connect GitHub org to Polar.sh
- [ ] Enable GitHub Sponsors mirror on Polar
- [ ] Create tiered subscription products:
  - **Supporter** — $10/mo (name in README)
  - **Pro** — $50/mo (priority issues, Discord role)
  - **Team** — $250/mo (private support, roadmap input)
  - **Enterprise** — $2,500/mo (SLA, custom integrations)
- [ ] Add `FUNDING.yml` with `polar:` handle
- [ ] Enable issue-level funding (bounties) on high-impact issues
- [ ] Automate thank-you posts on merge for funded issues

## Focus Product Lines

### 1. OSINT Toolkit (primary revenue driver)
- CLI + API for reconnaissance workflows
- Freemium: 100 queries/day free, unlimited on Pro
- Enterprise: on-prem deployment + custom modules

### 2. Automated Product Pipeline
- LLM-driven feature/issue → PR pipeline (this repo)
- Sell as a hosted service: `agent-as-a-service`
- Pricing: $99/mo starter, $499/mo team, $2,499/mo enterprise

### 3. GitHub Funding Infrastructure
- Templates + GitHub Actions for other maintainers
- Take 5% platform fee on referred Polar volume

## Monthly KPIs to Track

- New Polar subscribers
- MRR / ARR
- Churn rate (target < 5%)
- Bounty conversion rate
- Free → Paid conversion (target > 3%)
- Enterprise pipeline value

## Automation Hooks

- Weekly digest: post MRR delta to a `#revenue` channel
- Auto-label issues with `funded` when a bounty is placed
- Auto-close funded issues with thank-you + tier shoutout

## Immediate Next Actions (Week 1)

1. Publish `FUNDING.yml` referencing Polar handle
2. Ship OSINT MVP landing page with waitlist
3. Draft 4 pricing tiers + copy in Polar dashboard
4. Announce launch on HN, Reddit r/opensource, X/Twitter
5. Reach out to 20 potential enterprise design partners
