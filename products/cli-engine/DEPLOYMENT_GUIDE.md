# Deployment Guide — Revvel CLI Engine

## Prerequisites

- Node.js 20+
- npm
- Vercel account (free tier is sufficient for initial deploy)

## Local Validation

```bash
cd products/cli-engine
npm install
npm run lint
npm run build
```

Start dev server:

```bash
npm run dev   # http://localhost:3008
```

## Vercel Deployment

1. Open [vercel.com](https://vercel.com) and import the `midnghtsapphire/revvel-standards` repository.
2. Set **Root Directory** to `products/cli-engine`.
3. Framework preset: **Next.js** (auto-detected).
4. Click **Deploy**.

Vercel will assign a preview URL such as `https://cli-engine.vercel.app` on first deploy.

## Environment Variables

No environment variables are required for the static landing page. When wiring the waitlist form and Stripe checkout, add:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for checkout sessions |
| `STRIPE_SECRET_KEY` | Stripe secret key (server-side only, never expose client-side) |
| `NEXT_PUBLIC_POLAR_CHECKOUT_URL` | Polar.sh checkout URL (alternative to Stripe) |
| `WAITLIST_WEBHOOK_URL` | Webhook endpoint for CRM / email marketing on waitlist signup |

## Production Checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` passes (no TypeScript or ESLint errors)
- [ ] Vercel root directory set to `products/cli-engine`
- [ ] Vercel preview URL confirmed and accessible
- [ ] Waitlist form wired to webhook or email service
- [ ] Stripe/Polar.sh checkout links live in pricing tier CTAs
- [ ] `STRIPE_SECRET_KEY` stored as a secret in Vercel environment (never in source)
- [ ] Domain (e.g. `cli.revvel.app`) pointed to Vercel deployment
- [ ] Lighthouse performance score ≥ 90

## Rollback

To rollback to a previous version in Vercel:

1. Go to the Vercel project > Deployments tab.
2. Find the last known-good deployment.
3. Click **Promote to Production**.
