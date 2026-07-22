# Content Standard — Blog, Newsletter & About Pages

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Mandatory Policy — every Revvel application  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. What This Standard Covers

Every Revvel application ships with three content systems built in from day one. These are not optional features added later — they are part of the core app scaffold:

1. **Blog** — SEO articles about the subject area of the app, how-to guides, use cases, industry news
2. **Newsletter** — Email subscription and recurring broadcast to your subscriber list
3. **About Pages** — Multi-page "About" section with personal story, team, mission, and contact

Content drives organic traffic, builds trust, and creates affiliate link placement opportunities. Every blog post is a permanent SEO asset.

---

## 2. Blog System

### 2.1. What Goes in the Blog

Every app blog must cover these content categories from launch. Content is AI-generated (OpenRouter LLM) at launch, then grown weekly:

| Category | Slug | What's In It | Min Posts at Launch |
|---|---|---|---|
| **How-To Guides** | `/blog/how-to` | Step-by-step instructions using the app's subject area | 5 |
| **Use Cases** | `/blog/use-cases` | Real-world examples of who uses it and why | 4 |
| **Industry News** | `/blog/industry-news` | Trends, updates, and news in the app's subject area | 3 |
| **Product Updates** | `/blog/updates` | New features, improvements, announcements | 2 |
| **Tips & Tricks** | `/blog/tips` | Quick wins, shortcuts, expert advice | 3 |
| **Case Studies** | `/blog/case-studies` | Before/after stories, results, outcomes | 2 |
| **About the Author** | `/blog/author` | Personal story and perspective posts | 1 |

**Minimum at launch: 20 blog posts.** Auto-generated weekly thereafter, targeting 2–4 new posts per week.

### 2.2. Blog Page Routes (Next.js App Router)

Every app must have these routes:

```text
/blog                        → Blog index (all posts, paginated)
/blog/[category]             → Category listing page
/blog/[category]/[slug]      → Individual post page
/blog/author/[authorSlug]    → Author profile page
/blog/tag/[tag]              → Tag listing page
/blog/search                 → Blog search results
/blog/rss.xml                → RSS feed (syndication)
/blog/sitemap.xml            → Blog-specific sitemap
```

### 2.3. Blog Database Schema

```sql
-- blog_posts: one row per published article
blog_posts:
  id                  UUID PK
  title               VARCHAR(255) NOT NULL        -- SEO title, 50–60 chars ideal
  slug                VARCHAR(255) UNIQUE NOT NULL -- URL-safe: /blog/how-to-file-burial-insurance
  excerpt             VARCHAR(500)                 -- 1–2 sentence preview. Meta description fallback.
  content             TEXT NOT NULL                -- Full article body in Markdown or HTML
  cover_image_url     TEXT                         -- Hero image URL
  cover_image_alt     VARCHAR(255)                 -- ALT TEXT — mandatory (see SEO_METADATA_STANDARD.md)
  author_id           UUID FK→users
  category            VARCHAR(100) NOT NULL        -- 'how-to', 'use-cases', 'industry-news', etc.
  tags                TEXT[]                       -- ['burial insurance', 'final expense', 'seniors']
  status              VARCHAR(50) DEFAULT 'draft'  -- 'draft', 'published', 'archived'
  is_featured         BOOLEAN DEFAULT false        -- Shows on homepage featured section
  seo_title           VARCHAR(255)                 -- Custom <title> tag. Defaults to title.
  seo_description     VARCHAR(300)                 -- <meta description>. Defaults to excerpt.
  seo_keywords        TEXT                         -- Comma-separated keywords
  og_image_url        TEXT                         -- Open Graph image (1200×630px). Defaults to cover_image_url.
  og_image_alt        VARCHAR(255)                 -- Open Graph image alt text
  canonical_url       TEXT                         -- Canonical URL if syndicated elsewhere
  schema_type         VARCHAR(50) DEFAULT 'Article' -- 'Article', 'HowTo', 'FAQPage', 'NewsArticle'
  read_time_minutes   INTEGER                      -- Auto-calculated from content length
  word_count          INTEGER                      -- Auto-calculated
  view_count          INTEGER DEFAULT 0
  ai_generated        BOOLEAN DEFAULT false        -- Was this AI-generated? (transparency)
  published_at        TIMESTAMP                    -- When it went live
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
  deleted_at          TIMESTAMP                    -- Soft delete

-- blog_categories: category definitions
blog_categories:
  id          UUID PK
  name        VARCHAR(100)
  slug        VARCHAR(100) UNIQUE
  description TEXT
  created_at  TIMESTAMP DEFAULT NOW()

-- blog_tags: normalized tag library
blog_tags:
  id    UUID PK
  name  VARCHAR(100) UNIQUE
  slug  VARCHAR(100) UNIQUE

-- blog_post_tags: many-to-many
blog_post_tags:
  post_id  UUID FK→blog_posts
  tag_id   UUID FK→blog_tags
  PRIMARY KEY (post_id, tag_id)
```

### 2.4. AI Blog Generation

Every app includes an **AI Content Generator** in the admin panel that creates blog posts automatically:

**Trigger options:**
- On app launch: Generate 20 seed posts
- Weekly cron job: Generate 2–4 new posts
- Manual: Admin clicks "Generate Post" with a topic prompt

**Generation payload sent to OpenRouter:**
```json
{
  "model": "deepseek/deepseek-chat",
  "messages": [{
    "role": "system",
    "content": "You are an expert content writer for [APP NAME], a [APP CATEGORY] application. Write SEO-optimized blog posts that rank on Google and help real users. Always include: an engaging title (50-60 chars), meta description (150-160 chars), H2 subheadings, internal links to app features, and a clear call-to-action at the end. The audience is [TARGET AUDIENCE]."
  }, {
    "role": "user",
    "content": "Write a 1200-word [CATEGORY] blog post about: [TOPIC]. Include the keyword '[PRIMARY_KEYWORD]' in the title and naturally 3-5 times throughout. Suggest 5 related tags."
  }]
}
```

**Output stored in:** `blog_posts` table with `ai_generated = true`

### 2.5. RSS Feed

Every blog must publish an RSS feed at `/blog/rss.xml`:

```ts
// app/blog/rss.xml/route.ts
export async function GET() {
  const posts = await getPublishedPosts({ limit: 20 });
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${APP_NAME} Blog</title>
    <link>${APP_URL}/blog</link>
    <description>${APP_DESCRIPTION}</description>
    <language>en-us</language>
    <atom:link href="${APP_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    ${posts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${APP_URL}/blog/${post.category}/${post.slug}</link>
      <guid>${APP_URL}/blog/${post.category}/${post.slug}</guid>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <description><![CDATA[${post.excerpt}]]></description>
    </item>`).join('')}
  </channel>
</rss>`;
  return new Response(feed, { headers: { 'Content-Type': 'application/xml' } });
}
```

---

## 3. Newsletter System

### 3.1. What the Newsletter Does

The newsletter is an email broadcast sent to everyone who has subscribed. It is the #1 way to bring people back to the app.

**Mandatory newsletter types every app sends:**

| Newsletter Type | Trigger | Frequency | Content |
|---|---|---|---|
| **Welcome** | New subscriber signs up | Immediately | Welcome message, what to expect, affiliate link |
| **Weekly Digest** | Every Monday | Weekly | Top blog posts, new app features, tips, affiliate deals |
| **New Post Alert** | New blog post published | Immediate or batched | Post excerpt, link to full article |
| **Product/Feature Update** | New feature launched | On launch | What's new, how to use it |
| **Monthly Roundup** | 1st of every month | Monthly | Best of the month, stats, deals |
| **Re-engagement** | No open in 60 days | Once | "We miss you" + best content |

### 3.2. Newsletter Database Schema

```sql
-- newsletter_subscribers: one row per subscriber
newsletter_subscribers:
  id                  UUID PK
  email               VARCHAR(255) UNIQUE NOT NULL
  first_name          VARCHAR(100)
  last_name           VARCHAR(100)
  status              VARCHAR(50) DEFAULT 'pending' -- 'pending', 'confirmed', 'unsubscribed', 'bounced', 'spam'
  source_app          VARCHAR(100)                  -- Which app they subscribed from
  source_page         TEXT                          -- Which page they were on
  interests           TEXT[]                        -- Checkbox selections at signup
  double_opt_in_token VARCHAR(255)                  -- Email verification token
  confirmed_at        TIMESTAMP                     -- When they clicked the confirm link
  unsubscribed_at     TIMESTAMP
  bounce_type         VARCHAR(50)                   -- 'hard', 'soft' (from email provider)
  last_opened_at      TIMESTAMP                     -- Last time they opened an email
  last_clicked_at     TIMESTAMP
  open_count          INTEGER DEFAULT 0
  click_count         INTEGER DEFAULT 0
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()

-- newsletter_campaigns: one campaign per send
newsletter_campaigns:
  id                  UUID PK
  name                VARCHAR(255)                  -- Internal name: "Weekly Digest Apr 7 2026"
  subject_line        VARCHAR(255) NOT NULL         -- Email subject shown in inbox
  preview_text        VARCHAR(255)                  -- Preview text after subject line
  body_html           TEXT NOT NULL                 -- Full HTML email body
  body_text           TEXT                          -- Plain text fallback
  type                VARCHAR(50)                   -- 'welcome', 'weekly', 'post_alert', 'update', 'monthly', 'reengagement'
  status              VARCHAR(50) DEFAULT 'draft'   -- 'draft', 'scheduled', 'sending', 'sent', 'canceled'
  scheduled_at        TIMESTAMP
  sent_at             TIMESTAMP
  recipient_count     INTEGER DEFAULT 0
  open_count          INTEGER DEFAULT 0
  click_count         INTEGER DEFAULT 0
  unsubscribe_count   INTEGER DEFAULT 0
  bounce_count        INTEGER DEFAULT 0
  ai_generated        BOOLEAN DEFAULT false
  created_by          UUID FK→users
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()

-- newsletter_sends: one row per email per campaign (for tracking)
newsletter_sends:
  id              UUID PK
  campaign_id     UUID FK→newsletter_campaigns
  subscriber_id   UUID FK→newsletter_subscribers
  status          VARCHAR(50)   -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'spam'
  opened_at       TIMESTAMP
  clicked_at      TIMESTAMP
  bounced_at      TIMESTAMP
  sent_at         TIMESTAMP NOT NULL DEFAULT NOW()
```

### 3.3. Subscription Form — Mandatory on Every Page

Every app must have a subscription form. Placement options (use at least 2):

| Placement | When to Use |
|---|---|
| **Site footer** (always) | Every page, every app |
| **Homepage hero** | Large call-to-action on the main landing page |
| **Blog sidebar / after post** | Below or beside every blog article |
| **Exit-intent popup** | Fires when the user moves to close the tab |
| **Dedicated `/newsletter` page** | For direct link sharing |
| **Lead form thank-you page** | After a lead submits, offer newsletter |

**Minimum subscribe form fields:**

| Field ID | Label | DB Column | Required | Notes |
|---|---|---|---|---|
| FM-NEWS-001 | Email Address | `newsletter_subscribers.email` | ✅ | Primary field |
| FM-NEWS-002 | First Name | `newsletter_subscribers.first_name` | No | Personalizes greeting |
| FM-NEWS-003 | Interests (checkboxes) | `newsletter_subscribers.interests` | No | Only show if 3+ topics available |
| FM-NEWS-004 | (hidden) Source App | `newsletter_subscribers.source_app` | Auto | Which app they're on |
| FM-NEWS-005 | (hidden) Source Page | `newsletter_subscribers.source_page` | Auto | URL they subscribed from |

**After submission:** Send double opt-in confirmation email. Subscriber stays `status: 'pending'` until they click the link. This is required for GDPR and CAN-SPAM compliance.

### 3.4. Email Delivery Service

Use **Resend** as the primary email delivery service (free: 3,000 emails/month):

```ts
// lib/email/send-newsletter.ts
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendNewsletter(campaign: NewsletterCampaign, subscribers: Subscriber[]) {
  // Batch in groups of 100 (Resend batch limit)
  const batches = chunk(subscribers, 100);
  for (const batch of batches) {
    await resend.batch.send(
      batch.map(sub => ({
        from: `${APP_NAME} <newsletter@${APP_DOMAIN}>`,
        to: sub.email,
        subject: campaign.subject_line,
        html: injectPersonalization(campaign.body_html, sub),
        text: injectPersonalization(campaign.body_text, sub),
        headers: {
          'List-Unsubscribe': `<https://${APP_DOMAIN}/unsubscribe?token=${sub.id}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }))
    );
  }
}
```

### 3.5. Mandatory Email Content Elements

Every newsletter email must include:

| Element | Purpose | Required? |
|---|---|---|
| From name | `[App Name] by Audrey Evans` | ✅ |
| Subject line | Clear, benefit-focused, 40–60 chars | ✅ |
| Preview text | 80–100 chars, extends subject | ✅ |
| Greeting | `Hi [first_name],` or `Hi there,` | ✅ |
| Logo / header image | Branded header with alt text | ✅ |
| Main content | Article, tip, or update | ✅ |
| Affiliate link | At least 1 relevant affiliate link | ✅ |
| CTA button | Link back to app or blog post | ✅ |
| Social links | Icons for all active social profiles | ✅ |
| Unsubscribe link | `Unsubscribe` or `Manage Preferences` | ✅ LEGAL |
| Physical address | Your business mailing address | ✅ LEGAL (CAN-SPAM) |
| Disclosure | "Some links are affiliate links." | ✅ FTC |

---

## 4. About Pages

### 4.1. Required About Pages

Every app must have a full About section with dedicated sub-pages. This is not just an "About Us" paragraph — it is a multi-page hub that builds trust and SEO.

| Route | Page Title | Content |
|---|---|---|
| `/about` | About [App Name] | Overview: what it is, who it's for, the origin story |
| `/about/our-story` | Our Story | Audrey's personal story — founding, challenges, mission |
| `/about/mission` | Our Mission | Why this app exists. Who it serves. Social impact. |
| `/about/team` | Meet the Team | Founder bio (Audrey), any team members, AI agents credited |
| `/about/technology` | How It Works | Non-technical explanation of the tech. No jargon. |
| `/about/partners` | Our Partners | Affiliate partners, integrations, collaborators |
| `/about/accessibility` | Accessibility | WCAG AAA commitment, TTY line, 7 UI modes, ADA |
| `/about/press` | Press & Media | Press releases, media mentions, downloadable press kit |
| `/about/contact` | Contact Us | Form, email, phone, TTY number, social links, hours |
| `/about/testimonials` | Success Stories | User reviews, quotes, before/after stories |

### 4.2. About Page Database Schema

```sql
-- about_pages: CMS for all About section content
about_pages:
  id              UUID PK
  route_slug      VARCHAR(100) UNIQUE  -- 'our-story', 'mission', 'team', etc.
  page_title      VARCHAR(255)         -- <h1> of the page
  seo_title       VARCHAR(255)         -- <title> tag
  seo_description VARCHAR(300)         -- <meta description>
  content         TEXT                 -- Markdown/HTML body
  hero_image_url  TEXT
  hero_image_alt  VARCHAR(255)         -- ALT TEXT — mandatory
  is_published    BOOLEAN DEFAULT true
  updated_at      TIMESTAMP
  updated_by      UUID FK→users

-- team_members: for the /about/team page
team_members:
  id              UUID PK
  name            VARCHAR(255)
  role            VARCHAR(255)         -- "Founder & CEO", "AI Research Lead", etc.
  bio             TEXT
  photo_url       TEXT
  photo_alt       VARCHAR(255)         -- ALT TEXT: "[Name], [Role] at [App Name]"
  linkedin_url    TEXT
  twitter_url     TEXT
  display_order   INTEGER
  is_active       BOOLEAN DEFAULT true

-- testimonials: for the /about/testimonials page
testimonials:
  id              UUID PK
  author_name     VARCHAR(255)
  author_title    VARCHAR(255)         -- "Small Business Owner, Denver CO"
  author_photo    TEXT
  author_photo_alt VARCHAR(255)        -- ALT TEXT: "[Name] testimonial photo"
  quote           TEXT NOT NULL
  rating          INTEGER              -- 1–5 stars
  app_name        VARCHAR(100)         -- Which app this is for
  is_featured     BOOLEAN DEFAULT false
  is_published    BOOLEAN DEFAULT true
  created_at      TIMESTAMP DEFAULT NOW()
```

### 4.3. "About Me" Personal Story Standard

The `/about/our-story` page is the most important trust-builder. It must include:

1. **Opening hook** — One sentence about who Audrey is and what drives her
2. **The problem she saw** — What injustice or gap she noticed that this app addresses
3. **Her background** — Veteran connection, minority-owned business, disability advocacy
4. **Why she built this** — Personal connection to the subject matter
5. **Who she's building for** — Disabled veterans, seniors, underserved communities, neurodiverse users
6. **The vision** — Where she's taking this
7. **Call to action** — Subscribe, try the app, follow on social

This story is **reused and customized** for every app — the core is the same Audrey Evans story, adapted for the specific app's subject area.

---

## 5. Use Cases Section

Every app must have a **Use Cases** section at `/use-cases` with individual pages for each audience segment.

### 5.1. Use Case Page Structure

| Route | Example Content |
|---|---|
| `/use-cases` | Index of all use cases |
| `/use-cases/[audience-slug]` | Detailed page for one audience type |

**Example audience slugs for a burial insurance app:**
- `/use-cases/seniors-planning-ahead`
- `/use-cases/adult-children-helping-parents`
- `/use-cases/veterans-final-expense`
- `/use-cases/families-on-a-budget`
- `/use-cases/small-business-owners`

### 5.2. Use Case Page Template

Each use case page must follow this structure:
1. **Headline** — "How [Audience] Uses [App Name] to [Achieve Outcome]"
2. **The challenge** — What problem this audience faces
3. **The solution** — How the app solves it step by step
4. **The result** — Outcome with numbers if possible ("Saves $X per month", "Takes 10 minutes")
5. **Testimonial** — Real or representative quote from this audience type
6. **CTA** — "Start your free quote" / "Join free"

---

## 6. Content Calendar

Every app follows this content production schedule after launch:

| Week | Content |
|---|---|
| Launch | 20 AI-generated seed blog posts + all About pages |
| Week 1 | 3 blog posts: 1 how-to, 1 use case, 1 industry news |
| Week 2 | 3 blog posts: 1 tips & tricks, 1 case study, 1 author post |
| Week 3+ | Repeat cycle. Add newsletter content from blog. |
| Monthly | 1 long-form pillar post (2,500+ words) targeting a high-value keyword |

---

## 7. Internal Linking Rules

Every piece of content must follow these internal linking rules (critical for SEO):

| Rule | Requirement |
|---|---|
| Every blog post → 2–3 links to app feature pages | Drives traffic to conversion pages |
| Every blog post → 2–3 links to other relevant blog posts | Reduces bounce rate |
| Every app feature page → 1–2 links to supporting blog posts | Adds context and SEO depth |
| Every About page → 1 link to a relevant blog post | Connects the story to content |
| Every use case page → 1 link to the pricing/signup page | Conversion path |
| Homepage → links to top 5 blog posts | Shows content freshness |
| No orphan pages | Every page must be linked from at least one other page |

---

## 8. Legal Requirements for Content

| Requirement | Where |
|---|---|
| **Copyright notice** | Footer of every page: "© 2026 Freedom Angel Corp / [App Name]" |
| **Privacy Policy** | `/privacy` route — required by Google, Meta, Apple |
| **Terms of Service** | `/terms` route |
| **Affiliate disclosure** | On every page and post with affiliate links: "This page contains affiliate links." |
| **Newsletter CAN-SPAM** | Physical mailing address in every email footer |
| **GDPR cookie notice** | Cookie consent banner on first visit (EU users) |
| **Accessibility statement** | `/about/accessibility` page |
| **TTY contact info** | On contact page and footer: "TTY: [number]" |
