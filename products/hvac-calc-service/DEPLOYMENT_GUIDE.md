# Deployment Guide — HVAC Calc Service

## Deploy to Vercel

```bash
cd products/hvac-calc-service
npm install
npm run build
vercel --prod
```

Set optional env var: `NEXT_PUBLIC_POLAR_CHECKOUT_URL`

Dev port: **3006**
