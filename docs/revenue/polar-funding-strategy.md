# Polar.sh Funding Strategy — Path to $10M

> Prime directive: $10k/month → $10M in 3 years via Polar.sh, OSINT tooling, and an automated product pipeline.

## Phase Map

| Phase | Window | MRR / Total Target | Primary Lever |
|-------|--------|--------------------|---------------|
| 1 | Month 1–6 | $10k MRR | Polar.sh sponsors + first OSINT SaaS tier |
| 2 | Month 6–18 | $30k MRR | Tiered subscriptions, agency licenses |
| 3 | Month 18–30 | $100k MRR | Enterprise OSINT + white-label API |
| 4 | Month 30–36 | $10M cumulative | Acquisition-ready ARR + lifetime deals |

## Polar.sh Setup Checklist

1. Connect the GitHub org to https://polar.sh and enable **Funding**.
2. Publish tiers:
   - **Supporter** — $10/mo — name in `SPONSORS.md`.
   - **Pro** — $49/mo — private issue triage + roadmap vote.
   - **Team** — $299/mo — Slack channel + priority PR review.
   - **Enterprise** — $2,000/mo — SLA + custom OSINT modules.
3. Add `FUNDING.yml` (see `.github/FUNDING.yml`) pointing to Polar.
4. Cross-post launch to Hacker News, Reddit r/OSINT, r/selfhosted, and LinkedIn.
5. Ship weekly changelog to convert stargazers → sponsors.

## OSINT Product Pipeline

- **osint-cli**: free tier, drives top-of-funnel.
- **osint-api**: metered via Polar checkout, $0.001/request.
- **osint-dashboard**: hosted SaaS, $49–$299/mo.
- **osint-enterprise**: on-prem, $24k/yr floor.

## KPI Tracking

Maintain a `metrics/mrr.csv` file with columns: `month,polar_mrr,saas_mrr,enterprise_arr,total_mrr,cumulative_revenue`.
An automated weekly job should append rows and open a PR when we fall behind trajectory.

## Trajectory Formula

To hit $10M cumulative by month 36 starting at $10k MRR, target ~22% MoM growth
for months 1–24, then convert 3+ enterprise contracts ($250k+ ACV) in months 24–36.
