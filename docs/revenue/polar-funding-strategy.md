# Polar.sh Funding Strategy

## Prime Directive
Scale from $10k/month → $10M total in 3 years via GitHub-native monetization.

## Phase Plan

| Phase | Timeline | MRR Target | Key Levers |
|-------|----------|------------|------------|
| 1 | Month 1-6 | $10k | Polar tiers, OSINT SaaS MVP |
| 2 | Month 6-18 | $30k | Product pipeline, sponsors |
| 3 | Month 18-30 | $100k | Enterprise OSINT, API resale |
| 4 | Month 30-36 | $10M cum. | Acquisition / equity events |

## Polar.sh Tiers

- **Supporter** — $5/mo — name in README, Discord role
- **Pro** — $29/mo — private OSINT tool access, priority issues
- **Team** — $99/mo — 5 seats, private repo mirrors
- **Enterprise** — $499/mo — SLA, custom OSINT jobs, invoice billing

## OSINT Product Pipeline

1. **osint-recon** — domain + subdomain + tech stack aggregator
2. **osint-people** — public profile enrichment (email, socials)
3. **osint-monitor** — continuous change detection (webhooks)
4. **osint-brand** — brand/trademark leak scanner

Each product ships as: CLI (free) → hosted API (Polar Pro) → dashboard (Team+).

## Automation

- Issue-driven agent (OpenRouter → OpenHands → manual fallback)
- Auto-close batch issues via aggregator PRs (see this PR)
- Weekly revenue snapshot committed to `docs/revenue/snapshots/`

## KPIs

- Polar MRR
- Active Pro+ subscribers
- OSINT API calls / week
- Conversion: free CLI → Pro (target 2%)
