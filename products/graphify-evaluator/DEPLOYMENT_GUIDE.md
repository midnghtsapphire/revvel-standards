# Deployment Guide — Graphify Evaluator

## Prerequisites

- Node.js 20+
- npm
- Vercel account (recommended)

## Local Validation

```bash
cd products/graphify-evaluator
npm install
npm run lint
npm run build
```

## Run Locally

```bash
cd products/graphify-evaluator
npm run dev -- -p 3007
```

## Deploy to Vercel

1. Import `midnghtsapphire/revvel-standards` in Vercel.
2. Set **Root Directory** to `products/graphify-evaluator`.
3. Keep framework preset as **Next.js**.
4. Deploy.

No environment variables are required for the current implementation.
