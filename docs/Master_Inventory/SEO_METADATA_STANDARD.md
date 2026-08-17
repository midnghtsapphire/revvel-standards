# SEO Metadata Standard — Google Metadata, Alt Text & Structured Data

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Mandatory Policy — every page of every Revvel application  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Enforcement:** Every page that ships without required metadata fails the compliance check.

---

## 1. The One Rule You Must Never Break

**Every `<img>` tag and every `<Image>` component must have an `alt` attribute.**

- If the image is meaningful: `alt="Descriptive text about what the image shows"`
- If the image is purely decorative: `alt=""` (empty string — tells screen readers to skip it)
- If you don't write the alt text: the compliance check will fail and the PR will be blocked

There are no exceptions.

---

## 2. Why This Matters

| Benefit | Impact |
|---|---|
| **Google image search ranking** | Google cannot see images — it reads alt text to understand what the image is and ranks it in image search |
| **Screen readers / accessibility** | Blind and low-vision users hear alt text read aloud. No alt = they hear "image image image" |
| **Broken image fallback** | If an image fails to load, the alt text is shown in its place |
| **WCAG 2.1 compliance** | Missing alt text = WCAG failure = ADA lawsuit risk |
| **TTY users** | Users on text-only devices need text descriptions of all visual content |
| **SEO ranking signals** | Google uses alt text, image filenames, and surrounding text as ranking signals |

---

## 3. Alt Text Writing Rules

### ✅ Good Alt Text

| Context | What to Write | Example |
|---|---|---|
| Product image | Describe the product and key feature | `alt="Blue burial insurance brochure for seniors"` |
| Person photo | Name + role | `alt="Audrey Evans, founder of Freedom Angel Corp"` |
| Chart / graph | Describe what the data shows | `alt="Bar chart showing burial insurance rates by age, ages 50-85"` |
| Logo | Company name + "logo" | `alt="Freedom Angel Corp logo"` |
| Button icon | What the action does | `alt="Submit form button"` |
| Blog cover image | Article topic | `alt="Senior couple reviewing burial insurance options at a kitchen table"` |
| Decorative divider | Empty | `alt=""` |

### ❌ Bad Alt Text (Never Write These)

| Bad | Why It's Wrong |
|---|---|
| `alt="image"` | Says nothing |
| `alt="photo"` | Says nothing |
| `alt="IMG_4892.jpg"` | File name is not a description |
| `alt="click here"` | Not a description of the image |
| `alt="image of a person sitting at a computer using our software which is the best burial insurance quote tool in Colorado"` | Keyword stuffing — Google penalizes this |
| No alt attribute at all | Compliance failure |

### Alt Text Length Rule
- Aim for **5–15 words**
- Maximum: **125 characters** (screen readers truncate after this)
- Never keyword-stuff alt text

---

## 4. Required Metadata for Every Page

Every page must export `generateMetadata()` from the Next.js App Router. No exceptions.

### 4.1. Required Fields Per Page Type

| Field | Home | Product | Blog Post | About | Lead Form | Landing Page |
|---|---|---|---|---|---|---|
| `title` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `description` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `keywords` | ✅ | ✅ | ✅ | ✅ | Optional | ✅ |
| `openGraph.title` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `openGraph.description` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `openGraph.image` | ✅ | ✅ | ✅ | ✅ | Optional | ✅ |
| `openGraph.image.alt` | ✅ | ✅ | ✅ | ✅ | Optional | ✅ |
| `openGraph.url` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `openGraph.type` | website | product | article | website | website | website |
| `twitter.card` | summary_large | summary_large | summary_large | summary | summary | summary_large |
| `twitter.title` | ✅ | ✅ | ✅ | ✅ | Optional | ✅ |
| `twitter.description` | ✅ | ✅ | ✅ | ✅ | Optional | ✅ |
| `twitter.image` | ✅ | ✅ | ✅ | Optional | ❌ | ✅ |
| `twitter.image.alt` | ✅ | ✅ | ✅ | Optional | ❌ | ✅ |
| `canonical` URL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `robots` | index,follow | index,follow | index,follow | index,follow | noindex | index,follow |
| JSON-LD schema | Organization | Product | Article | AboutPage | — | WebPage |

---

## 5. Page-by-Page Metadata Specification

### 5.1. Home Page

**DB Source:** App settings / `app_config` table

```ts
// app/page.tsx
export const metadata: Metadata = {
  title: '[App Name] — [Primary Value Proposition]',  // Max 60 chars
  description: '[What the app does in one sentence. Include primary keyword. 150-160 chars.]',
  keywords: '[keyword1, keyword2, keyword3, location if relevant]',
  alternates: {
    canonical: 'https://[appurl].com',
  },
  openGraph: {
    title: '[App Name] — [Primary Value Proposition]',
    description: '[Same as meta description, or slightly varied]',
    url: 'https://[appurl].com',
    siteName: '[App Name]',
    images: [{
      url: 'https://[appurl].com/og-home.png',  // 1200×630px
      width: 1200,
      height: 630,
      alt: '[App Name] — [Brief visual description of the homepage OG image]',
    }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '[App Name] — [Primary Value Proposition]',
    description: '[150 chars max for Twitter]',
    images: {
      url: 'https://[appurl].com/og-home.png',
      alt: '[Same alt as OG image]',
    },
  },
};
```

### 5.2. Blog Post Page

**DB Source:** `blog_posts` table  
**Route:** `app/blog/[category]/[slug]/page.tsx`

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPost(params.category, params.slug);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: post.seo_title || `${post.title} | [App Name]`,  // Max 60 chars
    description: post.seo_description || post.excerpt,       // 150-160 chars
    keywords: post.seo_keywords || post.tags?.join(', '),
    authors: [{ name: post.author?.display_name || 'Audrey Evans' }],
    alternates: {
      canonical: post.canonical_url || `https://[appurl].com/blog/${post.category}/${post.slug}`,
    },
    openGraph: {
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt,
      url: `https://[appurl].com/blog/${post.category}/${post.slug}`,
      type: 'article',
      publishedTime: post.published_at?.toISOString(),
      modifiedTime: post.updated_at?.toISOString(),
      authors: [post.author?.display_name || 'Audrey Evans'],
      tags: post.tags,
      images: [{
        url: post.og_image_url || post.cover_image_url,
        width: 1200,
        height: 630,
        alt: post.og_image_alt || post.cover_image_alt || post.title,  // REQUIRED
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt,
      images: {
        url: post.og_image_url || post.cover_image_url,
        alt: post.og_image_alt || post.cover_image_alt || post.title,
      },
    },
  };
}
```

### 5.3. Product / Service Page

**DB Source:** `products` table  
**Route:** `app/products/[slug]/page.tsx`

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug);
  return {
    title: `${product.name} | [App Name]`,
    description: product.meta_description || product.short_description,
    alternates: { canonical: `https://[appurl].com/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.meta_description || product.short_description,
      type: 'website',
      images: [{
        url: product.images?.[0]?.url,
        alt: product.images?.[0]?.alt || product.name,  // REQUIRED
        width: 1200,
        height: 630,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.meta_description || product.short_description,
      images: {
        url: product.images?.[0]?.url,
        alt: product.images?.[0]?.alt || product.name,
      },
    },
  };
}
```

### 5.4. Landing Page

**Route:** `app/lp/[slug]/page.tsx`

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lp = await getLandingPage(params.slug);
  return {
    title: lp.seo_title,
    description: lp.seo_description,
    robots: { index: true, follow: true },
    alternates: { canonical: `https://[appurl].com/lp/${lp.slug}` },
    openGraph: {
      title: lp.seo_title,
      description: lp.seo_description,
      type: 'website',
      images: [{ url: lp.og_image_url, alt: lp.og_image_alt }],  // Both required
    },
  };
}
```

### 5.5. Lead Form / Quote Page

**Special rule:** Lead form pages must have `robots: noindex` so Google doesn't index thin pages with forms and no real content.

```ts
export const metadata: Metadata = {
  title: 'Get Your Free [Product] Quote | [App Name]',
  description: 'Get a free quote in 2 minutes. No medical exam required.',
  robots: { index: false, follow: false },  // DO NOT INDEX
};
```

---

## 6. JSON-LD Structured Data — Required on Every Page

### 6.1. Organization Schema (Every Page — in `app/layout.tsx`)

This goes in the global layout so it appears on every single page:

```tsx
// app/layout.tsx — inside <head>
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Freedom Angel Corp",
      "alternateName": ["GlowStarLabs", "Audrey Evans Official"],
      "url": "https://[appurl].com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://[appurl].com/logo.png",
        "width": 200,
        "height": 60,
        "caption": "Freedom Angel Corp logo"
      },
      "foundingDate": "2010",
      "taxID": "86-1209156",
      "founder": {
        "@type": "Person",
        "name": "Audrey Evans",
        "sameAs": [
          "https://meetaudreyevans.com",
          "https://www.linkedin.com/in/audrey-evans-96a56552",
          "https://github.com/MIDNGHTSAPPHIRE"
        ]
      },
      "contactPoint": [{
        "@type": "ContactPoint",
        "telephone": "[YOUR-PHONE]",
        "contactType": "customer service",
        "availableLanguage": ["English", "Spanish"]
      }, {
        "@type": "ContactPoint",
        "telephone": "[YOUR-TTY-NUMBER]",
        "contactType": "customer service",
        "contactOption": "TDDService",
        "availableLanguage": "English"
      }],
      "sameAs": [
        "https://www.facebook.com/[handle]",
        "https://www.instagram.com/[handle]",
        "https://www.tiktok.com/@[handle]",
        "https://twitter.com/[handle]"
      ]
    })
  }}
/>
```

### 6.2. WebApplication Schema (Home Page / Layout)

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "[App Name]",
  "url": "https://[appurl].com",
  "description": "[App description]",
  "applicationCategory": "[Category e.g., FinanceApplication, HealthApplication]",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free to start"
  },
  "provider": {
    "@type": "Organization",
    "name": "Freedom Angel Corp",
    "foundingDate": "2010",
    "taxID": "86-1209156"
  }
})}} />
```

### 6.3. Article Schema (Blog Posts)

```tsx
// app/blog/[category]/[slug]/page.tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org",
  "@type": post.schema_type || "Article",  // or "HowTo", "NewsArticle", "FAQPage"
  "headline": post.title,
  "description": post.excerpt,
  "image": {
    "@type": "ImageObject",
    "url": post.cover_image_url,
    "width": 1200,
    "height": 630,
    "caption": post.cover_image_alt  // ALT TEXT used here too
  },
  "datePublished": post.published_at,
  "dateModified": post.updated_at,
  "author": {
    "@type": "Person",
    "name": post.author?.display_name || "Audrey Evans",
    "url": "https://meetaudreyevans.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Freedom Angel Corp",
    "logo": {
      "@type": "ImageObject",
      "url": "https://[appurl].com/logo.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": `https://[appurl].com/blog/${post.category}/${post.slug}`
  }
})}} />
```

### 6.4. BreadcrumbList Schema (All Sub-Pages)

Every page that is not the home page must include breadcrumbs:

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://[appurl].com" },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://[appurl].com/blog" },
    { "@type": "ListItem", "position": 3, "name": post.title }
  ]
})}} />
```

---

## 7. SEO Field Map — Database to Metadata

Every page type stores its SEO fields in the database. Here is where each metadata field comes from:

| Page Type | `<title>` Source | `<meta description>` Source | OG Image Source | OG Image Alt Source |
|---|---|---|---|---|
| Home | `app_config.seo_title` | `app_config.seo_description` | `app_config.og_image_url` | `app_config.og_image_alt` |
| Blog Post | `blog_posts.seo_title` → fallback: `blog_posts.title` | `blog_posts.seo_description` → fallback: `blog_posts.excerpt` | `blog_posts.og_image_url` → fallback: `blog_posts.cover_image_url` | `blog_posts.og_image_alt` → fallback: `blog_posts.cover_image_alt` → fallback: `blog_posts.title` |
| Product | `products.meta_title` → fallback: `products.name` | `products.meta_description` → fallback: `products.short_description` | `products.images[0].url` | `products.images[0].alt` → fallback: `products.name` |
| Landing Page | `landing_pages.seo_title` | `landing_pages.seo_description` | `landing_pages.og_image_url` | `landing_pages.og_image_alt` |
| About Page | `about_pages.seo_title` | `about_pages.seo_description` | `about_pages.hero_image_url` | `about_pages.hero_image_alt` |
| Category | Auto: `[Category Name] Articles \| [App Name]` | Auto: `Browse [count] articles about [category]` | Default OG image | Default OG alt |
| Lead Form | Static in code | Static in code | None (noindex) | N/A |

---

## 8. Image Requirements by Type

| Image Type | Recommended Size | Minimum Size | Format | Alt Text Required? |
|---|---|---|---|---|
| OG / Social share image | 1200×630px | 600×315px | PNG or JPG | ✅ |
| Blog cover image | 1200×630px | 800×400px | WebP (convert at upload) | ✅ |
| Product image | 1080×1080px | 600×600px | WebP | ✅ |
| Team member photo | 400×400px | 200×200px | WebP | ✅ |
| App logo | 200×60px (SVG preferred) | 100×30px | SVG or PNG | ✅ ("App Name logo") |
| Favicon | 32×32px, 180×180px (Apple) | 16×16px | ICO + PNG | N/A |
| Hero/banner image | 1920×1080px | 1280×720px | WebP | ✅ |
| Thumbnail | 400×300px | 200×150px | WebP | ✅ |

**All uploaded images must be:**
- Converted to WebP format for performance (use `sharp` npm package)
- Under 200KB after compression
- Served via CDN (DigitalOcean Spaces CDN or Supabase Storage CDN)

---

## 9. Canonical URL Rules

**Canonical URLs** tell Google which version of a page is the "real" one when the same content is accessible at multiple URLs (e.g., after filtering, pagination, UTM params).

| Scenario | Canonical Should Point To |
|---|---|
| Product page with query params | `/products/[slug]` (no params) |
| Blog post paginated (?page=2) | `/blog/[category]/[slug]` (page 1) |
| UTM-tagged URLs | Original URL without UTM params |
| Syndicated content (posted elsewhere too) | Your original URL |
| HTTP and HTTPS versions | HTTPS version |
| www and non-www | Pick one, stick to it across all pages |

**Every page must have one canonical URL.** Use Next.js `alternates.canonical` in every `generateMetadata()` call.

---

## 10. The Robots.txt Standard

```text
# /public/robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /lp/  # Lead form pages — no SEO value, keep private
Disallow: /_next/

Sitemap: https://[appurl].com/sitemap.xml
Sitemap: https://[appurl].com/blog/sitemap.xml
```

---

## 11. Lighthouse SEO Score Requirement

Every deployed app must achieve a **Lighthouse SEO score of 90 or above** before launch. Run:

```bash
npx lighthouse https://[appurl].com --only-categories=seo --output=json
```

Failing checks that must be fixed before launch:
- Missing meta description → add to `generateMetadata()`
- Images missing alt attributes → add `alt` to every `<img>` and `<Image>`
- Links without descriptive text → replace "click here" with descriptive text
- Missing `<title>` → add to `generateMetadata()`
- Page blocked by robots.txt → check `/public/robots.txt`
- Canonical URL missing → add `alternates.canonical`
