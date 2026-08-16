# Deployment Guide — Revvel Personal Assistant

## Prerequisites

- Node.js 20+ (repo engines prefer `>=22 <25`)
- A [Vercel](https://vercel.com) account
- Git

---

## Local Development

```bash
cd products/personal-assistant
npm install
npm run dev    # http://localhost:3012
```

Validation:

```bash
npm test
npm run lint
npm run build
```

---

## Vercel Deployment

### Option A — Vercel CLI

```bash
npm install -g vercel
cd products/personal-assistant
vercel --prod
```

### Option B — GitHub Integration

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `midnghtsapphire/revvel-standards`
3. Set **Root Directory** to `products/personal-assistant`
4. Framework preset: **Next.js** (auto-detected)
5. Click **Deploy**
6. Paste the production URL into `README.md` under **Live Deployment** if it differs from the monorepo docs path

### Environment Variables

| Variable | Purpose | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_POLAR_CHECKOUT_URL` | Public Polar checkout for Assistant Pro | Optional |

The multi-agent planner runs without secrets. Do **not** put OAuth tokens for Gmail/Drive/Outlook into this app until a dedicated connector worker exists.

---

## Smoke Test After Deploy

1. Open the live URL
2. Click **Load sample corpus**
3. Confirm categories, directory tree, and commit plan render
4. Download Markdown + CSV
5. `curl https://<host>/api/plan` returns JSON with `summary.fragmentCount >= 1`
