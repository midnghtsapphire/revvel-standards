# Deployment Guide — OpenMythos

## Prerequisites

- Node.js 20+
- npm
- Vercel account

## Local Validation

```bash
cd products/openmythos
npm install
npm run lint
npm run build
```

Run locally:

```bash
npm run dev   # http://localhost:3007
```

## Vercel Deploy

1. Import `midnghtsapphire/revvel-standards` in Vercel.
2. Set **Root Directory** to `products/openmythos`.
3. Framework: **Next.js** (auto-detected).
4. Deploy.

## Production Checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Waitlist form endpoint wired to CRM/webhook
- [ ] Offer stack pricing matches live checkout links
- [ ] Domain and analytics configured
