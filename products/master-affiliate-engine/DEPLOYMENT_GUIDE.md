# Deployment Guide — Master Affiliate Engine

## Prerequisites

- Node.js 18+
- Vercel CLI (`npm i -g vercel`) or GitHub Actions deployment
- Stripe account (for checkout)
- Optional: NextAuth provider or Supabase project (for auth)

## Environment Variables

Create `.env.local` in the product root:

```bash
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Auth (NextAuth)
NEXTAUTH_SECRET=your-generated-secret
NEXTAUTH_URL=https://master-affiliate-engine.vercel.app

# CRM Webhook (optional)
CRM_WEBHOOK_URL=https://hooks.zapier.com/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

Generate `NEXTAUTH_SECRET` with:
```bash
openssl rand -base64 32
```

## Local Development

```bash
cd products/master-affiliate-engine
npm install
cp .env.example .env.local  # fill in values
npm run dev
# → http://localhost:3006
```

## Production Build

```bash
npm run build
npm run start
```

## Deploy to Vercel

### Option A — Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import `midnghtsapphire/revvel-standards`.
3. Set **Root Directory** to `products/master-affiliate-engine`.
4. Add all environment variables from the section above.
5. Deploy — Vercel auto-detects Next.js.

### Option B — Vercel CLI

```bash
cd products/master-affiliate-engine
vercel --prod
```

### Option C — GitHub Actions (recommended)

Add a workflow at `.github/workflows/deploy-master-affiliate-engine.yml`:

```yaml
name: Deploy — Master Affiliate Engine
on:
  push:
    branches: [main]
    paths: ['products/master-affiliate-engine/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: products/master-affiliate-engine
      - run: npm run build
        working-directory: products/master-affiliate-engine
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: products/master-affiliate-engine
          vercel-args: '--prod'
```

## Stripe Checkout Wiring

After deployment, create `/app/api/checkout-session/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { priceId } = await req.json();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/checkout?cancelled=1`,
  });
  return NextResponse.json({ url: session.url });
}
```

## Post-Deploy Checklist

- [ ] Verify `/` loads with glassmorphic UI
- [ ] Verify `/checkout` loads Stripe plan selector
- [ ] Verify `/login` form submits correctly
- [ ] Verify `/admin` displays link management table
- [ ] Verify `/dashboard` shows stats
- [ ] Configure Stripe webhook endpoint: `https://your-domain.vercel.app/api/webhooks/stripe`
- [ ] Test affiliate link click tracking
- [ ] Enable automated CRM sync workflow
