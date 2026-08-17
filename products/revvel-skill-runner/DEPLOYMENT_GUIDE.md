# DEPLOYMENT_GUIDE — revvel-skill-runner

## 1) Prerequisites

- Node.js 20+
- Vercel account
- Polar checkout URL
- Newsletter webhook endpoint (Buttondown, Resend webhook worker, or equivalent)

## 2) Local validation

```bash
cd build
npm install
npm run lint
npm run build
```

## 3) Configure environment variables

In Vercel Project Settings → Environment Variables:

- `NEWSLETTER_WEBHOOK_URL` (Server)
- `NEXT_PUBLIC_POLAR_CHECKOUT_URL` (Public)

## 4) Deploy to Vercel

```bash
cd build
npx vercel --prod
```

## 5) Post-deploy checks

1. Confirm homepage loads and pricing cards render.
2. Submit newsletter form and verify webhook receives payload.
3. Click Polar checkout CTA and confirm redirect to valid checkout page.
