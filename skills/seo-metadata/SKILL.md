# SEO Metadata Skill

Apply mandatory SEO metadata standards including Google metadata, Open Graph, Twitter Cards, JSON-LD schemas, and Lighthouse 90+ targets.

## The One Unbreakable Rule

**Every `<img>` and `<Image>` must have an `alt` attribute.** Missing alt = compliance failure, PR blocked.
- Meaningful image: `alt="Blue burial insurance brochure for seniors"` (5–15 words, max 125 chars)
- Decorative image: `alt=""` (empty string)
- Never: `alt="image"`, `alt="photo"`, filename as alt, keyword stuffing

## Required Metadata Per Page (`generateMetadata()`)

Every page must export `generateMetadata()`:

```ts
export const metadata: Metadata = {
  title: '[Title] — [Value Prop]',        // Max 60 chars
  description: '[One sentence. 150-160 chars.]',
  keywords: '[keyword1, keyword2]',
  alternates: { canonical: 'https://[appurl].com/[path]' },
  openGraph: {
    title: '...', description: '...', url: '...', siteName: '...',
    type: 'website', // or 'article' for blog posts
    images: [{ url: '...', width: 1200, height: 630, alt: '...' }], // alt REQUIRED
  },
  twitter: {
    card: 'summary_large_image',
    title: '...', description: '...', images: { url: '...', alt: '...' },
  },
};
```

## Page-Specific Rules

| Page Type | robots | OG type | JSON-LD |
|---|---|---|---|
| Home | index,follow | website | Organization + WebApplication |
| Blog Post | index,follow | article | Article + BreadcrumbList |
| Product | index,follow | website | Product |
| About | index,follow | website | AboutPage |
| Lead Form | **noindex,nofollow** | — | — |
| Landing Page | index,follow | website | WebPage |

## Required JSON-LD (Every Page — in `app/layout.tsx`)

Organization schema must appear on every page:
```json
{ "@context": "https://schema.org", "@type": "Organization",
  "contactPoint": [
    { "@type": "ContactPoint", "contactType": "customer service", "telephone": "[PHONE]" },
    { "@type": "ContactPoint", "contactOption": "TDDService", "telephone": "[TTY]" }
  ]
}
```

All sub-pages need BreadcrumbList schema.
Blog posts need Article schema with `image.caption` = alt text.

## Image Technical Requirements

| Type | Size | Format |
|---|---|---|
| OG / Social share | 1200×630px | PNG or JPG |
| Blog cover | 1200×630px | WebP |
| Product | 1080×1080px | WebP |
| Hero/banner | 1920×1080px | WebP |

All images: WebP format, under 200KB, served via CDN (DigitalOcean Spaces or Supabase).

## Canonical URL Rules

- Every page must have one canonical URL via `alternates.canonical`
- Product pages: no query params
- Blog posts: page 1 URL (not ?page=2)
- Always strip UTM params from canonical

## robots.txt Standard

```text
User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /lp/
Sitemap: https://[appurl].com/sitemap.xml
```

## Lighthouse SEO Gate

Lighthouse SEO score ≥ 90 before launch. Fix before shipping:
- Missing meta description → add to `generateMetadata()`
- Images missing alt → add `alt` everywhere
- Missing `<title>` → add to `generateMetadata()`
- Missing canonical → add `alternates.canonical`
