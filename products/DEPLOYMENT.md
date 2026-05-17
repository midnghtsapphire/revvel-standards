# Products Deployment Guide

All products deploy to Vercel free tier as static exports unless otherwise noted.

## prompt-generation-app (Revvel PromptForge)

- **Domain:** `promptforge.revvel.co`
- **Vercel root:** `products/prompt-generation-app`
- **Build:** `npm run build`
- **Output:** `out`
- **Framework:** Next.js (static export)

### DNS

```
CNAME promptforge.revvel.co → cname.vercel-dns.com
```

### Steps

1. Import repo in Vercel, set root directory to `products/prompt-generation-app`.
2. Build command: `npm run build`. Output directory: `out`.
3. Add custom domain `promptforge.revvel.co`.
4. Verify static export at `https://promptforge.revvel.co`.
