# Blog & Newsletter Field Map

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Purpose:** Maps every blog and newsletter UI field to its database column, frontend variable, API field, and validation rule.

---

## Part 1: Blog Post — Admin Editor Screen

This is what the admin sees when creating or editing a blog post.

| Field ID | Screen | Label | DB Table | DB Column | Frontend Var | Component | Required | Validation | Notes |
|---|---|---|---|---|---|---|---|---|---|
| FM-BLOG-001 | Blog Editor | Title | `blog_posts` | `title` | `title` | Text Input | ✅ | 10–255 chars. Aim for 50–60 chars for SEO. | Becomes the `<h1>` of the post |
| FM-BLOG-002 | Blog Editor | URL Slug | `blog_posts` | `slug` | `slug` | Text Input (auto-generated) | ✅ | Lowercase, hyphens only, no spaces | Auto-generated from title. Editable. e.g., `how-to-file-burial-insurance` |
| FM-BLOG-003 | Blog Editor | Excerpt / Summary | `blog_posts` | `excerpt` | `excerpt` | Textarea | ✅ | 100–500 chars | 1–2 sentence preview. Used as meta description fallback. |
| FM-BLOG-004 | Blog Editor | Full Content | `blog_posts` | `content` | `content` | Rich Text / Markdown Editor | ✅ | Min 500 words recommended | Main article body |
| FM-BLOG-005 | Blog Editor | Cover Image | `blog_posts` | `cover_image_url` | `coverImageUrl` | Image Upload | ✅ | 1200×630px, WebP, <200KB | Hero image shown on listing and top of post |
| FM-BLOG-006 | Blog Editor | Cover Image Alt Text | `blog_posts` | `cover_image_alt` | `coverImageAlt` | Text Input | ✅ | 5–125 chars. Describes the image. | **REQUIRED for accessibility + SEO** |
| FM-BLOG-007 | Blog Editor | Category | `blog_posts` | `category` | `category` | Dropdown | ✅ | Must match a valid category slug | how-to / use-cases / industry-news / product-updates / tips / case-studies / author |
| FM-BLOG-008 | Blog Editor | Tags | `blog_posts` | `tags` | `tags` | Tag Input (multi-select) | No | Max 10 tags | e.g., "burial insurance", "seniors", "Colorado" |
| FM-BLOG-009 | Blog Editor | Status | `blog_posts` | `status` | `status` | Dropdown | ✅ | draft / published / archived | Only published posts appear on public site |
| FM-BLOG-010 | Blog Editor | Featured Post? | `blog_posts` | `is_featured` | `isFeatured` | Toggle | No | boolean | Featured posts show on homepage |
| FM-BLOG-011 | Blog Editor | SEO Title | `blog_posts` | `seo_title` | `seoTitle` | Text Input | No | Max 60 chars | Custom `<title>` tag. Falls back to `title` if blank. |
| FM-BLOG-012 | Blog Editor | SEO Description | `blog_posts` | `seo_description` | `seoDescription` | Textarea | No | 150–160 chars | `<meta description>`. Falls back to `excerpt`. |
| FM-BLOG-013 | Blog Editor | SEO Keywords | `blog_posts` | `seo_keywords` | `seoKeywords` | Text Input | No | Comma-separated | "burial insurance Colorado, final expense policy" |
| FM-BLOG-014 | Blog Editor | Social Share Image | `blog_posts` | `og_image_url` | `ogImageUrl` | Image Upload | No | 1200×630px | Custom OG image. Falls back to `cover_image_url`. |
| FM-BLOG-015 | Blog Editor | Social Share Image Alt | `blog_posts` | `og_image_alt` | `ogImageAlt` | Text Input | If 014 set | 5–125 chars | **Alt text for the OG image — required if OG image is set** |
| FM-BLOG-016 | Blog Editor | Canonical URL | `blog_posts` | `canonical_url` | `canonicalUrl` | Text Input | No | Valid URL | Only needed if this post is also published elsewhere |
| FM-BLOG-017 | Blog Editor | Schema Type | `blog_posts` | `schema_type` | `schemaType` | Dropdown | No | Article / HowTo / NewsArticle / FAQPage | Affects JSON-LD structured data |
| FM-BLOG-018 | Blog Editor | AI Generated? | `blog_posts` | `ai_generated` | `aiGenerated` | Toggle | Auto | boolean | Transparency flag. Auto-set when AI creates the post. |
| FM-BLOG-019 | Blog Editor | Publish Date | `blog_posts` | `published_at` | `publishedAt` | Date+Time Picker | If publishing | Future date = scheduled publish | Set to now if status flipped to published |
| FM-BLOG-020 | Blog Editor | Read Time | `blog_posts` | `read_time_minutes` | `readTimeMinutes` | Read-only | Auto | Calculated: word count ÷ 200 | "5 min read" shown on listing card |
| FM-BLOG-021 | Blog Editor | Word Count | `blog_posts` | `word_count` | `wordCount` | Read-only | Auto | Calculated from content | |

---

## Part 2: Blog Post Listing Page (Public)

What site visitors see on `/blog` and `/blog/[category]`.

| Field ID | Screen | Label | DB Source | Display Format | Notes |
|---|---|---|---|---|---|
| FM-BLOG-100 | Blog Listing | Post Title | `blog_posts.title` | `<h2>` link | Clickable title |
| FM-BLOG-101 | Blog Listing | Cover Image | `blog_posts.cover_image_url` | `<img src alt="[cover_image_alt]">` | Alt text from `cover_image_alt` — **mandatory** |
| FM-BLOG-102 | Blog Listing | Excerpt | `blog_posts.excerpt` | Paragraph, truncated at 160 chars | |
| FM-BLOG-103 | Blog Listing | Category Badge | `blog_posts.category` | Colored badge | Links to `/blog/[category]` |
| FM-BLOG-104 | Blog Listing | Tags | `blog_posts.tags` | Small tag pills | Links to `/blog/tag/[tag]` |
| FM-BLOG-105 | Blog Listing | Author | `users.display_name` via `author_id` | "By [Name]" | |
| FM-BLOG-106 | Blog Listing | Publish Date | `blog_posts.published_at` | "April 6, 2026" | |
| FM-BLOG-107 | Blog Listing | Read Time | `blog_posts.read_time_minutes` | "5 min read" | |
| FM-BLOG-108 | Blog Listing | Featured Badge | `blog_posts.is_featured` | "⭐ Featured" badge | Only shown if `is_featured = true` |

---

## Part 3: Blog Post Detail Page (Public)

What a visitor sees on `/blog/[category]/[slug]`.

| Field ID | Screen | Label | DB Source | Display Format | Notes |
|---|---|---|---|---|---|
| FM-BLOG-200 | Blog Post | `<title>` tag | `seo_title` → fallback `title` | `<title>` | SEO — not visible on page |
| FM-BLOG-201 | Blog Post | `<meta description>` | `seo_description` → fallback `excerpt` | `<meta name="description">` | SEO — not visible on page |
| FM-BLOG-202 | Blog Post | Article Headline | `blog_posts.title` | `<h1>` | |
| FM-BLOG-203 | Blog Post | Cover Image | `blog_posts.cover_image_url` | `<img src alt="[cover_image_alt]">` | **Alt text mandatory** |
| FM-BLOG-204 | Blog Post | Category Breadcrumb | `blog_posts.category` | Home › Blog › [Category] | Schema.org BreadcrumbList |
| FM-BLOG-205 | Blog Post | Author + Date | `users.display_name`, `published_at` | "By Audrey Evans • April 6, 2026" | |
| FM-BLOG-206 | Blog Post | Read Time | `blog_posts.read_time_minutes` | "5 min read" | |
| FM-BLOG-207 | Blog Post | Article Body | `blog_posts.content` | Rendered Markdown / HTML | |
| FM-BLOG-208 | Blog Post | Tags | `blog_posts.tags` | Tag link pills below article | |
| FM-BLOG-209 | Blog Post | Share Buttons | (computed) | Facebook / X / LinkedIn / Copy Link | Uses `og_image_url` and `og_image_alt` |
| FM-BLOG-210 | Blog Post | Author Bio Box | `users.display_name`, `users.avatar_url`, `users.bio` | Card below article | Avatar `alt="[display_name] photo"` |
| FM-BLOG-211 | Blog Post | Related Posts | 3 posts from same category | Card grid | Same as listing card format |
| FM-BLOG-212 | Blog Post | Newsletter CTA | (static) | "Subscribe for more [category] tips" | Inline subscribe form |

---

## Part 4: Newsletter Subscriber Form (Public)

| Field ID | Screen | Label | DB Table | DB Column | Frontend Var | Component | Required | Notes |
|---|---|---|---|---|---|---|---|---|
| FM-NEWS-001 | Subscribe Form | Email Address | `newsletter_subscribers` | `email` | `email` | Email Input | ✅ | Primary field. Validated format. |
| FM-NEWS-002 | Subscribe Form | First Name | `newsletter_subscribers` | `first_name` | `firstName` | Text Input | No | Personalizes greeting in emails |
| FM-NEWS-003 | Subscribe Form | I'm interested in... | `newsletter_subscribers` | `interests` | `interests` | Checkbox Group | No | Only show if app has 3+ topics |
| FM-NEWS-004 | Subscribe Form | (hidden) Source App | `newsletter_subscribers` | `source_app` | `sourceApp` | Hidden | Auto | Name of the app they're subscribing on |
| FM-NEWS-005 | Subscribe Form | (hidden) Source Page | `newsletter_subscribers` | `source_page` | `sourcePage` | Hidden | Auto | Full URL of the page they're on |

---

## Part 5: Newsletter Admin — Campaign Editor

| Field ID | Screen | Label | DB Table | DB Column | Frontend Var | Component | Required | Notes |
|---|---|---|---|---|---|---|---|---|
| FM-NEWS-100 | Campaign Editor | Campaign Name | `newsletter_campaigns` | `name` | `name` | Text Input | ✅ | Internal only. Not seen by subscribers. e.g., "Weekly Digest Apr 7" |
| FM-NEWS-101 | Campaign Editor | Subject Line | `newsletter_campaigns` | `subject_line` | `subjectLine` | Text Input | ✅ | Max 60 chars. Shown in inbox. |
| FM-NEWS-102 | Campaign Editor | Preview Text | `newsletter_campaigns` | `preview_text` | `previewText` | Text Input | ✅ | Max 100 chars. Shown after subject. |
| FM-NEWS-103 | Campaign Editor | Email Body (HTML) | `newsletter_campaigns` | `body_html` | `bodyHtml` | HTML Editor | ✅ | Full HTML. Must include unsubscribe link. |
| FM-NEWS-104 | Campaign Editor | Email Body (Plain Text) | `newsletter_campaigns` | `body_text` | `bodyText` | Textarea | ✅ | Fallback for email clients that block HTML |
| FM-NEWS-105 | Campaign Editor | Campaign Type | `newsletter_campaigns` | `type` | `type` | Dropdown | ✅ | welcome / weekly / post_alert / update / monthly / reengagement |
| FM-NEWS-106 | Campaign Editor | Schedule Date | `newsletter_campaigns` | `scheduled_at` | `scheduledAt` | Date+Time Picker | No | Leave blank to send immediately |
| FM-NEWS-107 | Campaign Editor | Status | `newsletter_campaigns` | `status` | `status` | Status Badge | Read-only | draft / scheduled / sending / sent / canceled |
| FM-NEWS-108 | Campaign Editor | AI Generated? | `newsletter_campaigns` | `ai_generated` | `aiGenerated` | Toggle | Auto | Set when AI drafts the email |

---

## Part 6: Newsletter Analytics Dashboard (Admin)

| Field ID | Screen | Metric | DB Source | Display |
|---|---|---|---|---|
| FM-NEWS-200 | Newsletter Dashboard | Total Subscribers | `COUNT(*) WHERE status = 'confirmed'` | Number |
| FM-NEWS-201 | Newsletter Dashboard | New This Week | `COUNT(*) WHERE confirmed_at >= 7 days ago` | Number + trend |
| FM-NEWS-202 | Newsletter Dashboard | Avg Open Rate | `AVG(open_count / recipient_count * 100)` across campaigns | `%` |
| FM-NEWS-203 | Newsletter Dashboard | Avg Click Rate | `AVG(click_count / recipient_count * 100)` | `%` |
| FM-NEWS-204 | Newsletter Dashboard | Unsubscribed | `COUNT(*) WHERE status = 'unsubscribed'` | Number |
| FM-NEWS-205 | Newsletter Dashboard | Bounced | `COUNT(*) WHERE status = 'bounced'` | Number |
| FM-NEWS-206 | Newsletter Dashboard | Subscribers by App Source | Grouped by `source_app` | Bar chart |
| FM-NEWS-207 | Newsletter Dashboard | Growth Chart | Daily `confirmed_at` counts | Line chart |
| FM-NEWS-208 | Newsletter Dashboard | Last Campaign Stats | Most recent `newsletter_campaigns` row | Open rate, click rate, sent count |

---

## Part 7: App Config Table — App-Level SEO Settings

Every app has a single-row `app_config` table that stores the default SEO fields used across all pages.

| Field ID | Screen | Label | DB Table | DB Column | Frontend Var | Notes |
|---|---|---|---|---|---|---|
| FM-SEO-001 | Admin Settings → SEO | Site Name | `app_config` | `site_name` | `siteName` | Used in `<title>` as suffix: "Page Title \| [Site Name]" |
| FM-SEO-002 | Admin Settings → SEO | Default SEO Title | `app_config` | `seo_title` | `seoTitle` | Home page title |
| FM-SEO-003 | Admin Settings → SEO | Default SEO Description | `app_config` | `seo_description` | `seoDescription` | Home page meta description. 150–160 chars. |
| FM-SEO-004 | Admin Settings → SEO | Default OG Image | `app_config` | `og_image_url` | `ogImageUrl` | 1200×630px. Used when page has no specific image. |
| FM-SEO-005 | Admin Settings → SEO | Default OG Image Alt | `app_config` | `og_image_alt` | `ogImageAlt` | Alt text for default OG image. **Required if og_image_url is set.** |
| FM-SEO-006 | Admin Settings → SEO | Twitter Handle | `app_config` | `twitter_handle` | `twitterHandle` | `@handle` — used in Twitter Card meta |
| FM-SEO-007 | Admin Settings → SEO | Google Analytics ID | `app_config` | `ga4_id` | `ga4Id` | `G-XXXXXXXXXX` |
| FM-SEO-008 | Admin Settings → SEO | Meta Pixel ID | `app_config` | `meta_pixel_id` | `metaPixelId` | From Meta Business Manager |
| FM-SEO-009 | Admin Settings → SEO | TikTok Pixel ID | `app_config` | `tiktok_pixel_id` | `tiktokPixelId` | From TikTok Ads Manager |
| FM-SEO-010 | Admin Settings → SEO | Google Search Console Verification | `app_config` | `gsc_verification` | `gscVerification` | Meta tag value from Google Search Console |
| FM-SEO-011 | Admin Settings → Contact | TTY Phone Number | `app_config` | `tty_phone` | `ttyPhone` | Displayed in footer, contact page, and Organization JSON-LD |
| FM-SEO-012 | Admin Settings → Contact | Main Phone Number | `app_config` | `main_phone` | `mainPhone` | Displayed in footer, contact page, and Organization JSON-LD |
| FM-SEO-013 | Admin Settings → Contact | Business Address | `app_config` | `business_address` | `businessAddress` | Required in email footer (CAN-SPAM) and LocalBusiness JSON-LD |
