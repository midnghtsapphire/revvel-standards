# Master Affiliate Engine

A production-grade, glassmorphic **multi-agent affiliate link engine** that automates link rotation, CRM sync, and revenue reporting across every platform.

## What This Repository Does

Master Affiliate Engine provides a complete, automated affiliate marketing pipeline:

- **Automated Workflows** — Zero-touch UTM tagging, link rotation, and commission tracking triggered by events.
- **Smart CRM Integration** — Real-time sync of click data and leads to HubSpot, Airtable, or any webhook-ready CRM.
- **Instant Report Generator** — Daily revenue snapshots, top-converting links, and click-to-commission ratios delivered to Slack or email.

## How It Can Be Used Now

1. Deploy to Vercel with one click (see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)).
2. Configure affiliate link programs in the admin panel (`/admin`).
3. Embed the "Deploy This Snapshot Instantly" CTA on your TikTok/social landing page.
4. Connect a CRM webhook to receive qualified buyer events.
5. Enable the automated report workflow to track daily commissions.

## Revenue Projections

| Tier | Monthly Users | MRR Target |
|---|---|---|
| Launch ($29/mo) | 100 | $2,900 |
| Scale ($79/mo) | 50 | $3,950 |
| Agency ($299/mo) | 10 | $2,990 |
| **Month 6 target** | **160 users** | **$9,840** |

Projected Year 1 ARR: **~$118k** at 40% Month-over-Month growth.

## Quick Start

```bash
cd products/master-affiliate-engine
npm install
npm run dev
```

Runs at: `http://localhost:3006`

## Key Routes

| Path | Description |
|---|---|
| `/` | Glassmorphic hero + pipeline map + pricing |
| `/dashboard` | Live affiliate stats and activity feed |
| `/admin` | Admin panel — link management, workflow controls |
| `/login` | User authentication |
| `/checkout` | Stripe-integrated plan checkout |

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.vercel.app
```

## Scripts

- `npm run dev` — start dev server on port 3006
- `npm run build` — production build
- `npm run start` — serve production build on port 3006
- `npm run lint` — run ESLint

## Deployment

Deploy to Vercel as a standard Next.js app:

- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)
- [`GO_TO_MARKET.md`](./GO_TO_MARKET.md)
- [`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md)
- [`SECURITY.md`](./SECURITY.md)

## Website in Test (Vercel)

- **Vercel URL:** `https://master-affiliate-engine.vercel.app`
- Deployment is automated on every push to `main` via GitHub Actions.

## Revvel Standards

This product was built to [revvel-standards](../../revvel-standards). It includes:

- ✅ Cart and Stripe checkout integration
- ✅ Admin panel (`/admin`)
- ✅ User login (`/login`)
- ✅ Glassmorphic UI with pipeline visualization
- ✅ README, CHANGELOG, DEPLOYMENT_GUIDE, GO_TO_MARKET, BRAND_GUIDELINES, SECURITY.md
- ✅ Vercel deployment target
