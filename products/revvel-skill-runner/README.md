# revvel-skill-runner

Production application for executing skill-based runners under the Revvel platform.

Part of the **$10M in 3 Years** mission — automated product pipeline.

## Structure

- `research/` — market & competitive research
- `decision/` — go/no-go decision artifacts
- `build/` — Next.js application source
- `certify/` — QA, accessibility, security certification
- `deploy/` — deployment manifests
- `monetize/` — pricing, Polar.sh integration, paywalls
- `market/` — marketing assets & campaigns
- `sales/` — sales collateral & funnels

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4

## Mandatory EXRUP Components

- ✅ Accessibility Controls
- ✅ Newsletter Signup
- ✅ Affiliate Marketing

## Quick Start

```bash
cd build
npm install
npm run dev
```

Create your runtime config:

```bash
cp .env.example .env.local
```

Required environment variables:

- `NEWSLETTER_WEBHOOK_URL` — endpoint that receives newsletter signups
- `NEXT_PUBLIC_POLAR_CHECKOUT_URL` — public checkout URL for paid plans

## Production Readiness

- Checkout CTA wired to Polar checkout URL (`NEXT_PUBLIC_POLAR_CHECKOUT_URL`)
- Newsletter submission wired to `/api/newsletter` server route
- Lint/build scripts validated for Next.js 16

## Deployment

See [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for Vercel deployment steps.

## Go-To-Market

See [`GO_TO_MARKET.md`](./GO_TO_MARKET.md) for launch channels, ROI model, and sourced market research.

## Monetization

Primary funding rail: **Polar.sh** (GitHub funding platform).
Secondary: affiliate links, newsletter-driven upsells.
