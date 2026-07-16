---
project: life-insurance-lead-saas
intake_id: lils-001
revenue_target_monthly_usd: 10000
goal_phase: 1
generated_by: runner-orchestrator
generated_at: 2025-01-01T00:00:00Z
status: open
---

# Bill of Materials — Life Insurance Lead SaaS

> Procurement BOM emitted under the rule in `docs/standards/RUNNER_TARGETS.md`.
> The orchestrator is **halted** until every `blocking: true` item is resolved.
>
> **Mission anchor:** This BOM unblocks the path to **$10k/month** in Phase 1 of the $10M/3yr directive by shipping a vertical SaaS that sells qualified life-insurance leads to independent agents.

## Summary

- **Blocks step:** `step-001-provision-infra`
- **Runner targets involved:** `github`, `vercel`, `supabase`, `polar`, `make`
- **Total one-time cost (USD):** $35
- **Total monthly cost (USD):** $45
- **Revenue unblocked (USD/mo):** $10,000

## Line Items

| # | Name | Category | Cost (USD) | Source | Acquisition | Blocking |
|---|------|----------|------------|--------|-------------|----------|
| 1 | GitHub org + repo | account | 0 | <https://github.com> | Create org `revvel-lils`, create private repo `lils-app` | true |
| 2 | Vercel project linked to repo | account | 0/mo (Hobby) | <https://vercel.com> | Import repo, set prod domain | true |
| 3 | Supabase project (Pro) | infra | 25/mo | <https://supabase.com> | New project `lils-prod`, region us-east, store URL+anon+service keys | true |
| 4 | Domain `lifeleads.<tld>` | infra | 15/yr | Cloudflare Registrar | Purchase + point NS to Cloudflare, A/CNAME to Vercel | true |
| 5 | Polar.sh product (lead pack) | service | 0 (5% fee) | <https://polar.sh> | Create org, connect GitHub, create $99 lead-pack product | true |
| 6 | Make.com Core plan | service | 10/mo | <https://make.com> | Scenario: form → Supabase → Polar webhook → email | true |
| 7 | SendGrid free tier | api | 0 | <https://sendgrid.com> | API key for transactional email | true |
| 8 | TLD registration (one-time) | infra | 15 | Cloudflare | One-time first-year fee | true |
| 9 | Lead source: Facebook Lead Ads pixel | api | 0 + ad budget | <https://business.facebook.com> | Business mgr, pixel install, lead form template | true |
| 10 | Initial ad spend (test) | service | 200 (one-time) | Meta Ads | Run 7-day test campaign | false |
| 11 | Stripe (via Polar) | account | 0 | <https://stripe.com> | Polar handles; verify business identity | true |
| 12 | Legal: e-sign disclaimer + privacy policy | human | 20 (one-time, template) | Termly / GetTerms | Generate, host at `/legal/*` | true |

## Acquisition Playbook

### 1. GitHub Org + Repo
- **Why:** All app code + CI lives here; runner target `github`.
- **Where:** <https://github.com/organizations/new>
- **Plan:** Free
- **Cost:** $0
- **Steps:**
  1. Create org `revvel-lils`.
  2. Create private repo `lils-app`.
  3. Add deploy keys for Vercel + Supabase CI.
- **Owner:** founder
- **ETA:** Day 0
- **Stored at:** `.env.local` (org slug, repo name)

### 2. Supabase Project
- **Why:** Postgres for leads + agents + transactions.
- **Where:** <https://supabase.com/dashboard/new>
- **Plan:** Pro ($25/mo) — required for daily backups + 8GB DB.
- **Steps:**
  1. Create project `lils-prod`, region `us-east-1`.
  2. Copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
  3. Apply `schema.sql` (leads, agents, purchases, webhooks).
- **Owner:** founder
- **ETA:** Day 0
- **Stored at:** Vercel env vars

### 3. Polar.sh Product
- **Why:** Monetization runner; sells lead packs; PRIME-DIRECTIVE revenue surface.
- **Where:** <https://polar.sh>
- **Plan:** Free + 5% fee
- **Steps:**
  1. Create org `revvel-lils`.
  2. Connect GitHub org.
  3. Create product **"50 Verified Life Insurance Leads — $99"**.
  4. Copy `POLAR_ORG_TOKEN` + product ID.
  5. Configure webhook → Make.com scenario.
- **Owner:** founder
- **ETA:** Day 1
- **Stored at:** Vercel env vars + `BOM.md` registry

### 4. Make.com Scenario
- **Why:** Orchestrates lead intake → DB → Polar fulfillment → email.
- **Where:** <https://make.com>
- **Plan:** Core $10/mo
- **Steps:**
  1. Scenario 1: Webhook (FB Lead Ads) → Supabase insert.
  2. Scenario 2: Polar purchase webhook → assign N leads → SendGrid email to agent.
- **Owner:** founder
- **ETA:** Day 2
- **Stored at:** Make workspace `revvel-lils`

### 5. Meta Lead Ads
- **Why:** Top-of-funnel for consumer lead gen.
- **Steps:**
  1. Verify business in Meta Business Manager.
  2. Create pixel + lead form ("Get a free life insurance quote").
  3. Connect to Make webhook.
- **Owner:** founder
- **ETA:** Day 3

### 6. Legal Templates
- **Why:** TCPA/CCPA compliance to legally sell leads.
- **Where:** <https://termly.io>
- **Cost:** $20 one-time template pack
- **Steps:**
  1. Generate Privacy Policy + TCPA consent.
  2. Host at `/legal/privacy`, `/legal/tcpa`.
  3. Add checkbox + timestamp to lead form.
- **Owner:** founder
- **ETA:** Day 1

## Next Engine After Resolution

Once all blocking items resolve, route to: `engine-saas-scaffold` which will:
1. Scaffold Next.js app on `github` runner.
2. Deploy on `vercel` runner.
3. Apply Supabase schema on `supabase` runner.
4. Publish Polar product on `polar` runner.
5. Activate Make scenarios on `make` runner.

First-revenue checkpoint: **first paid lead pack within 14 days** → progress toward $10k/month.
