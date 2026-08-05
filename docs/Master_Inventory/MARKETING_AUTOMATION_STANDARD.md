# Marketing Automation Standard

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Mandatory Policy — applies to every Revvel application  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. What This Standard Covers

Every Revvel application ships with a built-in marketing automation system. This is not optional — it is part of the core platform. This standard defines:

- How to auto-post ads to Meta, TikTok, Instagram, X (Twitter), and LinkedIn
- SEO infrastructure every app must have
- Landing page and funnel structure
- Campaign management in the database
- UTM tracking for every link
- How it all connects to affiliate tracking

You do not need to understand code to use this. The Marketing Dashboard in every app handles everything through a UI.

---

## 2. The Marketing Stack

Every Revvel app uses this exact stack. Do not substitute.

| Layer | Tool | Purpose | Cost |
|---|---|---|---|
| **Campaign Generator** | OpenRouter LLM (DeepSeek/Claude) | AI writes all ad copy, headlines, hashtags | Per-token (minimal) |
| **Social Scheduling** | Make.com or n8n | Queues and auto-posts to all platforms | Make.com: free tier / $9/mo |
| **Meta/Facebook/Instagram** | Meta Graph API | Posts to Facebook Pages and Instagram | Free (API) |
| **TikTok** | TikTok Content Posting API | Posts videos/images to TikTok | Free (API) |
| **X / Twitter** | X API v2 | Posts tweets/threads | Free (1,500 posts/month) |
| **LinkedIn** | LinkedIn API | Posts to company page | Free (API) |
| **Email** | Resend.com | Transactional + campaign emails | Free (3,000/month) |
| **Analytics** | PostHog (self-hosted) or Google Analytics 4 | Tracks clicks, conversions | Free |
| **UTM Builder** | Built-in to campaign generator | Tags every link for tracking | Included |
| **SEO** | Next.js + JSON-LD + sitemap.xml | Organic search ranking | Free |
| **Landing Pages** | Next.js pages in `app/lp/` directory | Conversion-optimized pages | Included |

---

## 3. SEO Infrastructure (Mandatory for Every App)

Every app must have these SEO elements from day one. They are not added later — they are built in at bootstrap.

### 3.1. Page-Level Meta Tags

Every page must export metadata using Next.js App Router's `generateMetadata()`:

```ts
// Example: app/products/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug);
  return {
    title: `${product.name} | YourApp`,
    description: product.metaDescription || product.shortDescription,
    keywords: product.tags?.join(', '),
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: [product.images?.[0]?.url],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.shortDescription,
      images: [product.images?.[0]?.url],
    },
  };
}
```

### 3.2. Structured Data (JSON-LD)

Every product page must include Schema.org JSON-LD so Google shows rich results:

```tsx
// Paste inside product page component
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "image": product.images?.[0]?.url,
      "offers": {
        "@type": "Offer",
        "price": (product.priceCents / 100).toFixed(2),
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
      },
      "brand": {
        "@type": "Brand",
        "name": "MIDNGHTSAPPHIRE",
      },
    }),
  }}
/>
```

### 3.3. Technical SEO Files

These files must exist at the root of every deployed app:

| File | Location | What It Does |
|---|---|---|
| `sitemap.xml` | Auto-generated at `/sitemap.xml` | Tells Google every URL to index |
| `robots.txt` | `/robots.txt` | Tells crawlers which pages to index |
| `manifest.json` | `/manifest.json` | PWA support and mobile install |
| `favicon.ico` | `/favicon.ico` | Browser tab icon |

**Generate sitemap dynamically in Next.js:**
```ts
// app/sitemap.ts
import { MetadataRoute } from 'next';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getPublishedProducts();
  return [
    { url: 'https://yourapp.com', changeFrequency: 'daily', priority: 1 },
    { url: 'https://yourapp.com/products', changeFrequency: 'daily', priority: 0.9 },
    ...products.map((p) => ({
      url: `https://yourapp.com/products/${p.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      lastModified: p.updatedAt,
    })),
  ];
}
```

### 3.4. SEO Landing Pages

Every app must have at minimum 5 SEO landing pages targeting high-value keywords:

| Page Path | Target | Content |
|---|---|---|
| `/lp/[niche]-for-[city]` | Local + niche keywords | City/industry-specific copy |
| `/lp/best-[category]-tools` | Comparison keywords | Top tools in your niche |
| `/lp/how-to-[action]` | How-to keywords | Tutorial / guide content |
| `/lp/[competitor]-alternative` | Competitor keywords | Why you're better |
| `/lp/[keyword]-pricing` | Commercial intent | Pricing comparison |

---

## 4. UTM Tracking Standard

Every outbound link from a campaign, email, or social post must include UTM parameters. This is how you know which platform, campaign, and audience drove a purchase.

### UTM Parameter Definitions

| Parameter | Key | What to Put | Example |
|---|---|---|---|
| Source | `utm_source` | The platform where the link appears | `instagram`, `tiktok`, `email`, `x` |
| Medium | `utm_medium` | The marketing medium | `social`, `cpc`, `email`, `affiliate` |
| Campaign | `utm_campaign` | The campaign name | `spring_launch_2026`, `product_drop_april` |
| Content | `utm_content` | The specific ad variant | `video_15s`, `carousel_post`, `story` |
| Term | `utm_term` | Keyword for paid ads | `neuro_planner`, `adhd_tools` |

### UTM Builder Function

```ts
// lib/utm.ts
export function buildUTMUrl(
  baseUrl: string,
  params: {
    source: string;
    medium: string;
    campaign: string;
    content?: string;
    term?: string;
  }
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', params.source);
  url.searchParams.set('utm_medium', params.medium);
  url.searchParams.set('utm_campaign', params.campaign);
  if (params.content) url.searchParams.set('utm_content', params.content);
  if (params.term) url.searchParams.set('utm_term', params.term);
  return url.toString();
}
```

**Example UTM links:**
```text
Instagram post → yourapp.com/products/planner?utm_source=instagram&utm_medium=social&utm_campaign=spring_2026&utm_content=carousel
TikTok bio link → yourapp.com?utm_source=tiktok&utm_medium=social&utm_campaign=tiktok_bio
Email newsletter → yourapp.com/products?utm_source=email&utm_medium=email&utm_campaign=april_newsletter
```

---

## 5. Social Media Auto-Posting

### 5.1. Platform API Requirements

Before auto-posting works, these API credentials must be added to the app's environment variables:

| Platform | Required Credentials | Where to Get |
|---|---|---|
| **Meta (Facebook Pages)** | `META_ACCESS_TOKEN`, `META_PAGE_ID` | developers.facebook.com → My Apps |
| **Instagram** | `INSTAGRAM_ACCOUNT_ID`, `META_ACCESS_TOKEN` | Same as Meta (linked account) |
| **TikTok** | `TIKTOK_ACCESS_TOKEN`, `TIKTOK_OPEN_ID` | developers.tiktok.com |
| **X (Twitter)** | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | developer.x.com |
| **LinkedIn** | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORGANIZATION_ID` | linkedin.com/developers |

### 5.2. Platform Character Limits and Rules

| Platform | Text Limit | Image | Video | Hashtag Style |
|---|---|---|---|---|
| **Instagram** | 2,200 chars | 1080×1080px | 15–60s Reels | Up to 30 hashtags |
| **TikTok** | 2,200 chars | 1080×1920px | 15s–3min | Up to 100 hashtags |
| **X / Twitter** | 280 chars | 1200×675px | Up to 2:20min | 1–2 hashtags max |
| **Facebook** | 63,206 chars | 1200×630px | Up to 240min | 3–5 hashtags |
| **LinkedIn** | 3,000 chars | 1200×628px | Up to 10min | 3–5 hashtags |

### 5.3. Campaign Generation Flow

The Marketing Dashboard's "Generate Campaign" button triggers this flow:

```text
1. User selects: platforms, product/offer, audience, budget, schedule date
          ↓
2. AI (OpenRouter) generates:
   - Headline (platform-length-aware)
   - Ad copy (platform-adapted)
   - Hashtags (platform-specific volume)
   - CTA text
   - UTM-tagged destination URL
          ↓
3. Campaign saved to `ad_campaigns` table (status: 'draft')
          ↓
4. User reviews and approves (or AI auto-approves if configured)
          ↓
5. Scheduler (Make.com or n8n cron) picks up at `scheduled_at` time
          ↓
6. Posts to each platform API
          ↓
7. `ad_posts` row updated with platform_post_id and status: 'posted'
          ↓
8. UTM data flows back through analytics as users click and convert
```

### 5.4. Make.com Automation Workflow

The campaign auto-posting Make.com scenario must:

1. **Trigger:** Watch `ad_campaigns` table for rows with `status = 'scheduled'` and `scheduled_at <= NOW()` (via Supabase webhook or polling)
2. **Filter:** Only process campaigns where all approvals are complete
3. **For each platform** in `platforms` array:
   - Call the platform API with the adapted content
   - Create a row in `ad_posts` with the result
4. **Update** `ad_campaigns.status` to `'active'` and `published_at` to NOW()
5. **On error:** Set `ad_posts.status` to `'failed'` with `error_message`, send Slack/Discord alert

---

## 6. Landing Page / Funnel Structure

### 6.1. What Is a Funnel

A funnel is the path a stranger takes to become a paying customer. Every Revvel app has at minimum a 3-stage funnel:

```text
AWARENESS       CONSIDERATION         CONVERSION
(They find you) (They learn more)     (They buy)
     │                │                    │
Social Post  →  Landing Page  →  Checkout Page
     or               or                   │
  Google        Product Detail      Order Confirmed
     or               or                   │
  Email          Free Trial         Upsell/Email
```

### 6.2. Mandatory Landing Page Elements

Every landing page at `/lp/[slug]` must have:

| Element | Field Map ID | Description |
|---|---|---|
| Hero Headline | FM-LP-001 | Bold, benefit-focused. Max 8 words. |
| Hero Subheadline | FM-LP-002 | Expands on headline. 1–2 sentences. |
| Hero CTA Button | FM-LP-003 | "Get Started Free", "Shop Now", "Try It". |
| Hero Image/Video | FM-LP-004 | Product screenshot, demo video, or lifestyle image. |
| Social Proof | FM-LP-005 | "Join 10,000+ users" or 3–5 star reviews. |
| Benefits Section | FM-LP-006 | 3–6 bullet points. Lead with the outcome, not the feature. |
| How It Works | FM-LP-007 | 3 steps. Simple. Use icons. |
| Pricing Section | FM-LP-008 | Shows all tiers. Highlights recommended plan. |
| FAQ Section | FM-LP-009 | 5–8 questions. Addresses objections. |
| Final CTA | FM-LP-010 | Repeat the main CTA at the bottom. |
| Footer | FM-LP-011 | Privacy Policy, Terms, contact. Required by Meta/Google for ads. |

### 6.3. Conversion Tracking

When a visitor converts (signs up, purchases), fire these events:

```ts
// lib/analytics.ts
export function trackConversion(event: {
  type: 'signup' | 'purchase' | 'lead';
  value?: number; // revenue in dollars
  orderId?: string;
  source?: string;
}) {
  // Google Analytics 4
  gtag('event', 'conversion', {
    send_to: process.env.NEXT_PUBLIC_GA_CONVERSION_ID,
    value: event.value,
    currency: 'USD',
    transaction_id: event.orderId,
  });

  // Meta Pixel
  fbq('track', event.type === 'purchase' ? 'Purchase' : 'Lead', {
    value: event.value,
    currency: 'USD',
    order_id: event.orderId,
  });

  // TikTok Pixel
  ttq.track(event.type === 'purchase' ? 'CompletePayment' : 'SubmitForm', {
    value: event.value,
    currency: 'USD',
  });
}
```

---

## 7. Email Marketing

### 7.1. Mandatory Emails

Every app must send these transactional emails automatically:

| Trigger | Email | Tool |
|---|---|---|
| User signs up | Welcome email + email verification | Resend |
| Order placed | Order confirmation with receipt | Resend |
| Order shipped | Shipping notification | Resend |
| Password reset | Password reset link | Resend (via Clerk) |
| Subscription renewed | Renewal receipt | Resend (via Stripe webhook) |
| Subscription canceled | Cancellation confirmation + win-back offer | Resend |
| Weekly | Newsletter with affiliate links embedded | Resend or Brevo |

### 7.2. Email Field Map

| Email Field | DB Source | Notes |
|---|---|---|
| To address | `users.email` | |
| Greeting name | `users.first_name` | Falls back to "there" if null |
| Order number | `orders.id` (first 8 chars) | |
| Order total | `orders.total_cents ÷ 100` | Formatted as `$19.99` |
| Order items | `order_items` JOIN `products` | List of product names + prices |
| Affiliate link | `affiliate_links.url` | Auto-inserted in newsletters |
| Unsubscribe link | `users.id` + token | GDPR required |

---

## 8. Ads Compliance Requirements

Before running paid ads on any platform, these elements must be in place:

| Requirement | Platform | Where to Configure |
|---|---|---|
| Privacy Policy page | Meta, TikTok, Google | `/privacy` route in app |
| Terms of Service page | Meta, TikTok, Google | `/terms` route in app |
| Business verification | Meta | Meta Business Manager |
| Pixel installed | Meta | `<MetaPixel />` component in `app/layout.tsx` |
| TikTok Pixel installed | TikTok | `<TikTokPixel />` component |
| Ad account linked | X | developer.x.com |
| Payment method on file | All paid platforms | Each platform's billing settings |
| Disclaimer text (financial/health claims) | All | Add to ad copy: "Results may vary" |

---

## 9. Campaign Tier Reference

The Marketing Dashboard supports generating batches of campaigns at these sizes:

| Button | Campaigns Generated | Platforms × Variants | Best For |
|---|---|---|---|
| Quick Burst | 20 | 4 platforms × 5 variants | Testing a new product |
| Standard Push | 50 | 5 platforms × 10 variants | Regular monthly push |
| Growth Mode | 100 | 5 platforms × 20 variants | Launch week |
| Aggressive | 200 | 5 platforms × 40 variants | Scaling a proven offer |
| Full Blast | 500 | 5 platforms × 100 variants | Max growth mode |

Each generated campaign is a unique combination of headline, copy, visual, CTA, and audience — AI-varied so platforms don't penalize repeated content.
