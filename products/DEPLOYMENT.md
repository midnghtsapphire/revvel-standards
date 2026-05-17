# Deployment Guide for Revenue Products

## Overview

This guide covers deployment of production-ready Next.js applications to Vercel and other platforms.

## Products

1. **High-Ticket Affiliate Hub** (`affiliate-hub/`)
2. **AI Video Toolkit** (`ai-video-toolkit/`)
3. **Mac Screen Recorder Finder** (`screen-recorder-finder/`)
4. **Revvel PromptForge** (`prompt-generation-app/`)

## Quick Deploy to Vercel

### Option 1: Vercel Dashboard (Recommended)

Each product can be deployed individually:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `midnghtsapphire/revvel-standards` repository
3. Set the **Root Directory** to:
   - `products/affiliate-hub` (for Product 1)
   - `products/ai-video-toolkit` (for Product 2)
   - `products/screen-recorder-finder` (for Product 3)
   - `products/prompt-generation-app` (for Product 4)
4. Click **Deploy**

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy each product
cd products/affiliate-hub
vercel --prod

cd ../ai-video-toolkit
vercel --prod

cd ../screen-recorder-finder
vercel --prod

cd ../prompt-generation-app
vercel --prod
```

### Option 3: GitHub Integration

1. Connect your repository to Vercel
2. Create three separate projects in Vercel Dashboard
3. Configure each project with its respective root directory
4. Enable automatic deployments on push

## Custom Domains

Configure custom domains in Vercel Dashboard:

### Suggested Domains
- `affiliate-hub.revvel.co` → affiliate-hub
- `ai-video.revvel.co` → ai-video-toolkit
- `screen-recorder.revvel.co` → screen-recorder-finder
- `promptforge.revvel.co` → prompt-generation-app

### DNS Configuration
```
CNAME affiliate-hub    cname.vercel-dns.com
CNAME ai-video         cname.vercel-dns.com
CNAME screen-recorder  cname.vercel-dns.com
CNAME promptforge      cname.vercel-dns.com
```

## Environment Variables

### Analytics (Optional)
```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_VERCEL_ANALYTICS=1
```

### Affiliate Links (Update in code)
Replace placeholder `#` links with actual affiliate URLs in:
- `affiliate-hub/app/page.tsx`
- `ai-video-toolkit/app/page.tsx`
- `screen-recorder-finder/app/page.tsx`
- `prompt-generation-app/app/page.tsx`

## Manual Deployment (Static Export)

Each product exports to static HTML:

```bash
# Build product
cd products/affiliate-hub
npm run build

# Output directory: out/
# Upload to any static host:
# - Netlify (drag & drop)
# - GitHub Pages
# - AWS S3 + CloudFront
# - DigitalOcean App Platform
```

## Performance Optimization

### 1. Enable Vercel Speed Insights
Add to each product:
```bash
npm install @vercel/speed-insights
```

Update `app/layout.tsx`:
```tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### 2. Enable Vercel Analytics
```bash
npm install @vercel/analytics
```

### 3. Enable Caching
Already configured via `next.config.js` static export.

## Monitoring

### Vercel Dashboard
- Page views
- Load times
- Core Web Vitals
- Error tracking

### Google Analytics
Add GA4 tracking code to each product for:
- Conversion tracking
- Affiliate link clicks
- User behavior

### Affiliate Tracking
Use UTM parameters for affiliate links:
```
?utm_source=revvel&utm_medium=affiliate-hub&utm_campaign=launch
```

## Rollback

### Vercel
1. Go to project deployments
2. Click on previous deployment
3. Click "Promote to Production"

### Manual
Keep previous builds:
```bash
mv out out.backup
npm run build
# If issues: mv out.backup out
```

## Troubleshooting

### Build Fails
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Missing Dependencies
```bash
npm install next@latest react@latest react-dom@latest
```

### TypeScript Errors
```bash
npm run lint
# Fix errors shown
```

## Post-Deployment Checklist

- [ ] All three products deployed successfully
- [ ] Custom domains configured
- [ ] SSL certificates active
- [ ] Analytics tracking installed
- [ ] Affiliate links updated with real URLs
- [ ] Meta tags and SEO optimized
- [ ] Social sharing images added
- [ ] Performance monitoring enabled
- [ ] Error tracking configured
- [ ] Backup deployment process documented

## Support

Issues during deployment:
1. Check [Vercel Status](https://vercel-status.com)
2. Review [Next.js Docs](https://nextjs.org/docs)
3. Open issue in [revvel-standards](https://github.com/midnghtsapphire/revvel-standards/issues)

---

**Last Updated:** May 2, 2026  
**Author:** Audrey Evans (@midnghtsapphire)
