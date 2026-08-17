# Deployment Guide — Creator Payout Tracker

## Prerequisites

- Node.js 20+
- A [Vercel](https://vercel.com) account (free tier is sufficient for the current static-data product)
- Git

---

## Local Development

```bash
cd products/creator-payout-tracker
npm install
npm run dev    # http://localhost:3005
```

Lint check:

```bash
npm run lint
```

Production build check:

```bash
npm run build
```

---

## Vercel Deployment (Recommended)

### Option A — Vercel CLI

```bash
npm install -g vercel
cd products/creator-payout-tracker
vercel --prod
```

### Option B — GitHub Integration (Zero-Config)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `midnghtsapphire/revvel-standards`
3. Set **Root Directory** to `products/creator-payout-tracker`
4. Framework preset: **Next.js** (auto-detected)
5. Click **Deploy**

### Environment Variables

The product runs without secrets because the payout dataset is static. Configure the checkout URL to activate the paid Creator Pro CTA:

| Variable | Purpose | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_POLAR_CHECKOUT_URL` | Public Polar checkout URL for Creator Pro | Optional |

---

## Recommended Domain

Point `creatorpayouts.com` (or chosen domain) to the Vercel deployment:

1. In Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Update DNS: add a CNAME record pointing to `cname.vercel-dns.com`

---

## Data Updates (Quarterly)

Platform payout rates change. Update `app/data/platforms.ts` each quarter:

1. Edit `rpmMin`, `rpmMax`, `subPayoutPer5`, `platformCutPct` values
2. Update `lastUpdated` field to new quarter (e.g., `"2025-Q3"`)
3. Commit and push — Vercel auto-deploys on merge to main

---

## Production Checklist

- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes
- [ ] Vercel deployment URL is live and accessible
- [ ] Custom domain DNS is propagated
- [ ] Affiliate link disclosure is visible on the page
- [ ] Data disclaimer "last updated" dates are current
