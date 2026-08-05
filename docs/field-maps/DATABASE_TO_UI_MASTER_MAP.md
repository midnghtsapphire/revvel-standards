# Database-to-UI Master Field Map

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Purpose:** Complete index connecting every database table and column to every UI screen, component, API endpoint, and frontend variable that uses it.

---

## How to Use This Document

This is the **master cross-reference**. When you see a field on screen and want to know where it lives in the database — or when you see a database column and want to know every place it appears in the app — this document is your answer.

**Reading direction:**
- **Database → UI**: "I see `users.first_name` in the DB — where does it show up on screen?" → Find the table section → see all UI locations listed
- **UI → Database**: "The Profile page name field is wrong — what DB column is it?" → Check `docs/field-maps/PROFILE_FIELD_MAP.md` for the Field ID, then cross-reference here

---

## Table of Contents

1. [users table](#1-users-table)
2. [products table](#2-products-table)
3. [orders table](#3-orders-table)
4. [order_items table](#4-order_items-table)
5. [subscriptions table](#5-subscriptions-table)
6. [affiliates table](#6-affiliates-table)
7. [affiliate_referrals table](#7-affiliate_referrals-table)
8. [ad_campaigns table](#8-ad_campaigns-table)
9. [ad_posts table](#9-ad_posts-table)
10. [affiliate_links table](#10-affiliate_links-table)
11. [feature_flags table](#11-feature_flags-table)
12. [audit_logs table](#12-audit_logs-table)

---

## 1. `users` Table

**Purpose:** Every registered user. One row per account.

| DB Column | DB Type | UI Screens | UI Field Label | Frontend Variable | API Field | Notes |
|---|---|---|---|---|---|---|
| `id` | UUID PK | All authenticated screens | (hidden) | `userId` | `id` | Never shown to users. Used in every API call. |
| `email` | VARCHAR(255) UNIQUE | Sign Up, Sign In, Profile, Admin Users | Email Address | `email` | `email` | Lowercased before save. Used for login. |
| `clerk_id` | VARCHAR(255) | (internal only) | (hidden) | `clerkId` | `clerkId` | Clerk's external user ID. Links Clerk session to DB row. |
| `first_name` | VARCHAR(100) | Profile, Dashboard greeting, Admin Users | First Name | `firstName` | `firstName` | "Hi, [first_name]!" on dashboard. |
| `last_name` | VARCHAR(100) | Profile, Admin Users, Checkout | Last Name | `lastName` | `lastName` | Combined with first_name for display name. |
| `display_name` | VARCHAR(200) | Profile, Comments, Reviews | Display Name | `displayName` | `displayName` | Falls back to `first_name` if null. |
| `avatar_url` | TEXT | Profile, Nav header, Comments | Profile Photo | `avatarUrl` | `avatarUrl` | URL to uploaded image (Supabase Storage or S3). |
| `role` | VARCHAR(50) | Admin Panel (role badge), Profile | Role | `role` | `role` | Values: `'user'`, `'admin'`, `'affiliate'`. Controls nav items shown. |
| `is_active` | BOOLEAN | Admin Users (status badge) | Status | `isActive` | `isActive` | `false` = account suspended. Login blocked. |
| `stripe_customer_id` | VARCHAR(255) | Billing / Subscription page | (hidden) | `stripeCustomerId` | `stripeCustomerId` | Links user to Stripe customer for billing. |
| `subscription_tier` | VARCHAR(50) | Pricing page, Dashboard tier badge | Plan | `subscriptionTier` | `subscriptionTier` | `'free'`, `'starter'`, `'pro'`, `'business'`, `'enterprise'` |
| `token_balance` | INTEGER | Dashboard token counter | Tokens Remaining | `tokenBalance` | `tokenBalance` | Decremented per AI action. |
| `affiliate_code` | VARCHAR(50) | Affiliate dashboard, Referral link | Your Referral Code | `affiliateCode` | `affiliateCode` | Unique code. Auto-generated on signup if role = affiliate. |
| `referral_source` | VARCHAR(255) | (hidden) | (hidden) | `referralSource` | `referralSource` | UTM source or affiliate code that brought this user. |
| `email_verified` | BOOLEAN | Sign Up confirmation banner | (status) | `emailVerified` | `emailVerified` | If false, show "Please verify your email" banner. |
| `notification_prefs` | JSONB | Notification Settings page | (multiple toggles) | `notificationPrefs` | `notificationPrefs` | JSON object with keys: `email`, `sms`, `push`, `marketing`. |
| `created_at` | TIMESTAMP | Admin Users (joined date), Profile | Member Since | `createdAt` | `createdAt` | Auto-set on insert. |
| `updated_at` | TIMESTAMP | (internal) | (hidden) | `updatedAt` | `updatedAt` | Auto-updated on any change. |
| `deleted_at` | TIMESTAMP | Admin Users (soft-deleted badge) | (status) | `deletedAt` | `deletedAt` | NULL = active. Set = soft-deleted. |

---

## 2. `products` Table

**Purpose:** Products or services available for purchase.

| DB Column | DB Type | UI Screens | UI Field Label | Frontend Variable | API Field | Notes |
|---|---|---|---|---|---|---|
| `id` | UUID PK | Product Detail URL, Cart, Order | (hidden) | `productId` | `id` | In URL: `/products/[id]` |
| `name` | VARCHAR(255) | Product Listing, Product Detail, Cart, Orders | Product Name | `name` | `name` | |
| `slug` | VARCHAR(255) UNIQUE | Product Detail URL | (in URL) | `slug` | `slug` | URL-safe version of name. `/products/[slug]` |
| `description` | TEXT | Product Detail page | Description | `description` | `description` | |
| `short_description` | VARCHAR(500) | Product Listing card | Short Description | `shortDescription` | `shortDescription` | Shown on listing card, 1–2 sentences. |
| `price_cents` | INTEGER | Product Listing, Product Detail, Cart, Checkout | Price | `priceCents` | `priceCents` | Stored as cents: 1999 = $19.99 |
| `compare_at_price_cents` | INTEGER | Product Detail (strikethrough price) | Compare At Price | `compareAtPriceCents` | `compareAtPriceCents` | Original price. Shown struck-through if higher than `price_cents`. |
| `images` | JSONB | Product Listing, Product Detail | Product Images | `images` | `images` | Array of image URLs: `[{url, alt, position}]` |
| `category` | VARCHAR(100) | Product Listing filter, Product Detail breadcrumb | Category | `category` | `category` | |
| `tags` | TEXT[] | Product Listing filter, SEO meta | Tags | `tags` | `tags` | PostgreSQL array. |
| `stripe_price_id` | VARCHAR(255) | (hidden — used in checkout) | (hidden) | `stripePriceId` | `stripePriceId` | Stripe price object ID. Required for checkout. |
| `stripe_product_id` | VARCHAR(255) | (hidden) | (hidden) | `stripeProductId` | `stripeProductId` | Stripe product ID. |
| `is_published` | BOOLEAN | Admin Products (toggle), Product Listing | Published | `isPublished` | `isPublished` | `false` = hidden from public listing. |
| `is_featured` | BOOLEAN | Homepage featured section | Featured | `isFeatured` | `isFeatured` | Shows on homepage hero/featured row. |
| `inventory_count` | INTEGER | Product Detail (in-stock badge), Admin | Stock | `inventoryCount` | `inventoryCount` | NULL = unlimited. 0 = out of stock. |
| `affiliate_commission_pct` | DECIMAL(5,2) | Affiliate dashboard (per product commission) | Commission % | `affiliateCommissionPct` | `affiliateCommissionPct` | Override for product-specific commission rate. |
| `meta_title` | VARCHAR(255) | (SEO — not visible to user) | SEO Title | `metaTitle` | `metaTitle` | `<title>` tag. Falls back to `name`. |
| `meta_description` | VARCHAR(500) | (SEO — not visible to user) | SEO Description | `metaDescription` | `metaDescription` | `<meta description>`. |
| `created_at` | TIMESTAMP | Admin Products (date added) | Date Added | `createdAt` | `createdAt` | |
| `updated_at` | TIMESTAMP | Admin Products | Last Updated | `updatedAt` | `updatedAt` | |
| `deleted_at` | TIMESTAMP | Admin Products (archived status) | Status | `deletedAt` | `deletedAt` | Soft delete. |

---

## 3. `orders` Table

**Purpose:** Confirmed purchases. One row per completed checkout.

| DB Column | DB Type | UI Screens | UI Field Label | Frontend Variable | API Field | Notes |
|---|---|---|---|---|---|---|
| `id` | UUID PK | Order Confirmation, Order History, Admin Orders | Order ID | `orderId` | `id` | Shown as short version: first 8 chars. |
| `user_id` | UUID FK→users | Order History, Admin Orders | Customer | `userId` | `userId` | FK to `users.id` |
| `status` | VARCHAR(50) | Order History (status badge), Admin Orders | Status | `status` | `status` | `'pending'`, `'paid'`, `'shipped'`, `'delivered'`, `'refunded'`, `'failed'` |
| `total_cents` | INTEGER | Order Confirmation, Order History, Admin | Order Total | `totalCents` | `totalCents` | Sum of all items + tax + shipping in cents. |
| `subtotal_cents` | INTEGER | Order Confirmation | Subtotal | `subtotalCents` | `subtotalCents` | Before tax/shipping. |
| `tax_cents` | INTEGER | Order Confirmation | Tax | `taxCents` | `taxCents` | |
| `shipping_cents` | INTEGER | Order Confirmation | Shipping | `shippingCents` | `shippingCents` | 0 for digital products. |
| `stripe_payment_intent_id` | VARCHAR(255) | Admin Orders (for Stripe lookup) | Stripe Payment ID | `stripePaymentIntentId` | `stripePaymentIntentId` | Use to look up payment in Stripe Dashboard. |
| `stripe_charge_id` | VARCHAR(255) | Admin Orders | Stripe Charge ID | `stripeChargeId` | `stripeChargeId` | |
| `currency` | VARCHAR(3) | Order Confirmation | Currency | `currency` | `currency` | ISO 4217: `'USD'`, `'EUR'`, etc. |
| `shipping_address` | JSONB | Checkout, Order Confirmation, Admin | Shipping Address | `shippingAddress` | `shippingAddress` | `{line1, line2, city, state, zip, country}` |
| `billing_address` | JSONB | Checkout, Order Confirmation | Billing Address | `billingAddress` | `billingAddress` | Same structure as shipping. |
| `affiliate_code` | VARCHAR(50) | Admin Orders (referral column) | Referred By | `affiliateCode` | `affiliateCode` | Affiliate code that was active during checkout. |
| `affiliate_commission_cents` | INTEGER | Admin Orders, Affiliate Dashboard | Commission Earned | `affiliateCommissionCents` | `affiliateCommissionCents` | Calculated at checkout. |
| `notes` | TEXT | Admin Orders (internal notes) | Notes | `notes` | `notes` | Internal only. Not shown to customer. |
| `created_at` | TIMESTAMP | Order History (date), Admin Orders | Order Date | `createdAt` | `createdAt` | When order was placed. |
| `updated_at` | TIMESTAMP | Admin Orders | Last Updated | `updatedAt` | `updatedAt` | |

---

## 4. `order_items` Table

**Purpose:** Individual line items within an order. One row per product per order.

| DB Column | DB Type | UI Screens | UI Field Label | Frontend Variable | API Field | Notes |
|---|---|---|---|---|---|---|
| `id` | UUID PK | (internal) | (hidden) | `orderItemId` | `id` | |
| `order_id` | UUID FK→orders | Order Confirmation, Order History | (groups items) | `orderId` | `orderId` | |
| `product_id` | UUID FK→products | Order Confirmation, Order History | (links to product) | `productId` | `productId` | |
| `product_name` | VARCHAR(255) | Order Confirmation, Order History | Product | `productName` | `productName` | Snapshot at time of purchase (product name may change later). |
| `product_image_url` | TEXT | Order Confirmation, Order History | (product thumbnail) | `productImageUrl` | `productImageUrl` | Snapshot of image at time of purchase. |
| `quantity` | INTEGER | Cart, Order Confirmation | Qty | `quantity` | `quantity` | |
| `unit_price_cents` | INTEGER | Cart, Order Confirmation, Order History | Price | `unitPriceCents` | `unitPriceCents` | Price per unit at time of purchase. |
| `total_price_cents` | INTEGER | Cart, Order Confirmation | Item Total | `totalPriceCents` | `totalPriceCents` | `quantity × unit_price_cents` |
| `created_at` | TIMESTAMP | (internal) | (hidden) | `createdAt` | `createdAt` | |

---

## 5. `subscriptions` Table

**Purpose:** Recurring billing subscriptions managed via Stripe.

| DB Column | DB Type | UI Screens | UI Field Label | Frontend Variable | API Field | Notes |
|---|---|---|---|---|---|---|
| `id` | UUID PK | Billing page | (hidden) | `subscriptionId` | `id` | |
| `user_id` | UUID FK→users | Billing page, Admin | Customer | `userId` | `userId` | |
| `stripe_subscription_id` | VARCHAR(255) | Billing page (for Stripe portal link) | Subscription ID | `stripeSubscriptionId` | `stripeSubscriptionId` | |
| `stripe_price_id` | VARCHAR(255) | Billing page | (hidden — determines plan) | `stripePriceId` | `stripePriceId` | |
| `plan_name` | VARCHAR(100) | Billing page, Dashboard badge | Current Plan | `planName` | `planName` | `'Free'`, `'Starter'`, `'Pro'`, `'Business'`, `'Enterprise'` |
| `status` | VARCHAR(50) | Billing page (status badge) | Status | `status` | `status` | `'active'`, `'past_due'`, `'canceled'`, `'trialing'` |
| `current_period_start` | TIMESTAMP | Billing page | Billing Period Start | `currentPeriodStart` | `currentPeriodStart` | |
| `current_period_end` | TIMESTAMP | Billing page | Next Billing Date | `currentPeriodEnd` | `currentPeriodEnd` | "Your plan renews on [date]" |
| `cancel_at_period_end` | BOOLEAN | Billing page (cancellation notice) | Canceling? | `cancelAtPeriodEnd` | `cancelAtPeriodEnd` | If true: "Your plan will cancel on [date]" |
| `tokens_per_period` | INTEGER | Billing page, Dashboard | Tokens Per Month | `tokensPerPeriod` | `tokensPerPeriod` | Replenished at `current_period_end`. |
| `created_at` | TIMESTAMP | Admin Subscriptions | Start Date | `createdAt` | `createdAt` | |
| `updated_at` | TIMESTAMP | (internal) | (hidden) | `updatedAt` | `updatedAt` | |

---

## 6. `affiliates` Table

**Purpose:** Users who have joined the affiliate program. Tracks their program details.

| DB Column | DB Type | UI Screens | UI Field Label | Frontend Variable | API Field | Notes |
|---|---|---|---|---|---|---|
| `id` | UUID PK | (internal) | (hidden) | `affiliateId` | `id` | |
| `user_id` | UUID FK→users | Affiliate Dashboard | (links to user) | `userId` | `userId` | One-to-one with users. |
| `affiliate_code` | VARCHAR(50) UNIQUE | Affiliate Dashboard | Your Referral Code | `affiliateCode` | `affiliateCode` | Appended to links: `?ref=CODE` |
| `referral_link` | TEXT | Affiliate Dashboard | Your Referral Link | `referralLink` | `referralLink` | Full URL with code embedded. |
| `commission_rate_pct` | DECIMAL(5,2) | Affiliate Dashboard | Commission Rate | `commissionRatePct` | `commissionRatePct` | Default: 20%. Can be overridden per product. |
| `total_earned_cents` | INTEGER | Affiliate Dashboard | Total Earned | `totalEarnedCents` | `totalEarnedCents` | Lifetime earnings. |
| `pending_payout_cents` | INTEGER | Affiliate Dashboard | Pending Payout | `pendingPayoutCents` | `pendingPayoutCents` | Earned but not yet paid. |
| `total_clicks` | INTEGER | Affiliate Dashboard | Link Clicks | `totalClicks` | `totalClicks` | Total referral link clicks. |
| `total_conversions` | INTEGER | Affiliate Dashboard | Conversions | `totalConversions` | `totalConversions` | Clicks that became purchases. |
| `conversion_rate_pct` | DECIMAL(5,2) | Affiliate Dashboard | Conversion Rate | `conversionRatePct` | `conversionRatePct` | Computed: `(conversions/clicks) × 100` |
| `payout_method` | VARCHAR(50) | Affiliate Settings | Payout Method | `payoutMethod` | `payoutMethod` | `'stripe'`, `'paypal'`, `'check'` |
| `payout_email` | VARCHAR(255) | Affiliate Settings | Payout Email | `payoutEmail` | `payoutEmail` | PayPal email or Stripe Connect. |
| `status` | VARCHAR(50) | Admin Affiliates | Status | `status` | `status` | `'pending'`, `'active'`, `'suspended'` |
| `approved_at` | TIMESTAMP | Admin Affiliates | Approved On | `approvedAt` | `approvedAt` | When admin approved the affiliate application. |
| `created_at` | TIMESTAMP | Admin Affiliates | Joined | `createdAt` | `createdAt` | |

---

## 7. `affiliate_referrals` Table

**Purpose:** Every click and conversion tracked through an affiliate link.

| DB Column | DB Type | UI Screens | UI Field Label | Frontend Variable | API Field | Notes |
|---|---|---|---|---|---|---|
| `id` | UUID PK | (internal) | (hidden) | `referralId` | `id` | |
| `affiliate_id` | UUID FK→affiliates | Affiliate Dashboard (referral list) | (groups by affiliate) | `affiliateId` | `affiliateId` | |
| `referred_user_id` | UUID FK→users | Admin Referrals | Referred User | `referredUserId` | `referredUserId` | Null until the visitor creates an account. |
| `order_id` | UUID FK→orders | Affiliate Dashboard (conversions) | Order | `orderId` | `orderId` | Null for clicks that didn't convert. |
| `affiliate_code` | VARCHAR(50) | Affiliate Dashboard | Code Used | `affiliateCode` | `affiliateCode` | Snapshot of code used at time of click. |
| `referral_url` | TEXT | Admin Referrals | Referral URL | `referralUrl` | `referralUrl` | Full URL the visitor landed on. |
| `utm_source` | VARCHAR(255) | Admin Referrals | UTM Source | `utmSource` | `utmSource` | e.g., `'instagram'`, `'tiktok'`, `'email'` |
| `utm_medium` | VARCHAR(255) | Admin Referrals | UTM Medium | `utmMedium` | `utmMedium` | e.g., `'social'`, `'cpc'`, `'email'` |
| `utm_campaign` | VARCHAR(255) | Admin Referrals | UTM Campaign | `utmCampaign` | `utmCampaign` | Campaign name, e.g., `'spring_launch_2026'` |
| `commission_cents` | INTEGER | Affiliate Dashboard (earnings row) | Commission | `commissionCents` | `commissionCents` | 0 for click-only (no conversion). |
| `is_paid` | BOOLEAN | Admin Payouts | Paid? | `isPaid` | `isPaid` | `true` after payout is processed. |
| `clicked_at` | TIMESTAMP | Affiliate Dashboard | Click Date | `clickedAt` | `clickedAt` | When the referral link was clicked. |
| `converted_at` | TIMESTAMP | Affiliate Dashboard | Conversion Date | `convertedAt` | `convertedAt` | When the order was completed. Null if no conversion. |

---

## 8. `ad_campaigns` Table

**Purpose:** Marketing campaigns sent to Meta, TikTok, Instagram, X, LinkedIn.

| DB Column | DB Type | UI Screens | UI Field Label | Frontend Variable | API Field | Notes |
|---|---|---|---|---|---|---|
| `id` | UUID PK | Marketing Dashboard, Campaign Detail | Campaign ID | `campaignId` | `id` | |
| `name` | VARCHAR(255) | Marketing Dashboard | Campaign Name | `name` | `name` | Internal name. Not shown on ad. |
| `status` | VARCHAR(50) | Marketing Dashboard (status badge) | Status | `status` | `status` | `'draft'`, `'scheduled'`, `'active'`, `'paused'`, `'completed'`, `'failed'` |
| `platforms` | TEXT[] | Marketing Dashboard, Campaign Detail | Platforms | `platforms` | `platforms` | Array: `['meta', 'tiktok', 'instagram', 'x', 'linkedin']` |
| `ad_copy` | TEXT | Campaign Detail / AI Generator | Ad Copy | `adCopy` | `adCopy` | The text content of the ad. AI-generated. |
| `headline` | VARCHAR(255) | Campaign Detail | Headline | `headline` | `headline` | Bold text at top of ad. |
| `media_url` | TEXT | Campaign Detail | Media | `mediaUrl` | `mediaUrl` | Image or video URL for the ad. |
| `cta_text` | VARCHAR(100) | Campaign Detail | Call to Action | `ctaText` | `ctaText` | Button text: "Shop Now", "Learn More", "Sign Up" |
| `cta_url` | TEXT | Campaign Detail | Destination URL | `ctaUrl` | `ctaUrl` | URL the ad points to. Should include UTM params. |
| `hashtags` | TEXT[] | Campaign Detail | Hashtags | `hashtags` | `hashtags` | Auto-generated for each platform's norms. |
| `target_audience` | JSONB | Campaign Detail | Target Audience | `targetAudience` | `targetAudience` | `{age_min, age_max, interests, locations, genders}` |
| `budget_cents` | INTEGER | Campaign Detail | Daily Budget | `budgetCents` | `budgetCents` | Per-day ad spend limit in cents. |
| `total_spend_cents` | INTEGER | Marketing Dashboard | Total Spent | `totalSpendCents` | `totalSpendCents` | Running total of actual spend. |
| `impressions` | INTEGER | Campaign Analytics | Impressions | `impressions` | `impressions` | Number of times ad was shown. |
| `clicks` | INTEGER | Campaign Analytics | Clicks | `clicks` | `clicks` | |
| `conversions` | INTEGER | Campaign Analytics | Conversions | `conversions` | `conversions` | |
| `scheduled_at` | TIMESTAMP | Campaign Detail | Schedule Date | `scheduledAt` | `scheduledAt` | When to auto-post. |
| `published_at` | TIMESTAMP | Marketing Dashboard | Published At | `publishedAt` | `publishedAt` | When it actually went live. |
| `created_by` | UUID FK→users | Admin Marketing | Created By | `createdBy` | `createdBy` | Which user or AI agent created this campaign. |
| `created_at` | TIMESTAMP | Marketing Dashboard | Created | `createdAt` | `createdAt` | |

---

## 9. `ad_posts` Table

**Purpose:** Individual platform posts within a campaign. One row per platform per campaign.

| DB Column | DB Type | UI Screens | UI Field Label | Frontend Variable | API Field | Notes |
|---|---|---|---|---|---|---|
| `id` | UUID PK | Campaign Detail (post breakdown) | Post ID | `postId` | `id` | |
| `campaign_id` | UUID FK→ad_campaigns | Campaign Detail | (groups by campaign) | `campaignId` | `campaignId` | |
| `platform` | VARCHAR(50) | Campaign Detail (platform tab) | Platform | `platform` | `platform` | `'meta'`, `'instagram'`, `'tiktok'`, `'x'`, `'linkedin'` |
| `platform_post_id` | VARCHAR(255) | Campaign Detail | Platform Post ID | `platformPostId` | `platformPostId` | ID returned by platform API after posting. |
| `status` | VARCHAR(50) | Campaign Detail (platform status) | Status | `status` | `status` | `'pending'`, `'posted'`, `'failed'`, `'rejected'` |
| `post_content` | TEXT | Campaign Detail | Post Content | `postContent` | `postContent` | Platform-adapted version of ad copy. |
| `media_url` | TEXT | Campaign Detail | Media | `mediaUrl` | `mediaUrl` | Platform-formatted media URL. |
| `platform_url` | TEXT | Campaign Detail | View Post | `platformUrl` | `platformUrl` | Live URL of the post on the platform. |
| `error_message` | TEXT | Campaign Detail (error state) | Error | `errorMessage` | `errorMessage` | If posting failed, why. |
| `posted_at` | TIMESTAMP | Campaign Detail | Posted At | `postedAt` | `postedAt` | When the post went live. |
| `created_at` | TIMESTAMP | (internal) | (hidden) | `createdAt` | `createdAt` | |

---

## 10. `affiliate_links` Table

**Purpose:** Library of pre-built affiliate links (Amazon, Make.com, DigitalOcean, etc.) auto-inserted into content.

| DB Column | DB Type | UI Screens | UI Field Label | Frontend Variable | API Field | Notes |
|---|---|---|---|---|---|---|
| `id` | UUID PK | Admin Affiliate Links | (hidden) | `linkId` | `id` | |
| `name` | VARCHAR(255) | Admin Affiliate Links, Content Editor | Name | `name` | `name` | e.g., "DigitalOcean Referral" |
| `platform` | VARCHAR(100) | Admin Affiliate Links | Platform | `platform` | `platform` | e.g., "Amazon", "DigitalOcean", "Make.com" |
| `url` | TEXT | Admin Affiliate Links | Affiliate URL | `url` | `url` | Full URL with tracking code. |
| `tracking_code` | VARCHAR(100) | Admin Affiliate Links | Tracking Code | `trackingCode` | `trackingCode` | e.g., `meetaudreyeva-20`, `fe8240d60588` |
| `commission_description` | TEXT | Admin Affiliate Links | Commission | `commissionDescription` | `commissionDescription` | e.g., "5% of first purchase" |
| `keywords` | TEXT[] | (used by auto-linker) | Keywords | `keywords` | `keywords` | Words that trigger auto-link insertion. |
| `is_active` | BOOLEAN | Admin Affiliate Links | Active | `isActive` | `isActive` | Inactive = don't auto-insert. |
| `total_clicks` | INTEGER | Admin Affiliate Links | Clicks | `totalClicks` | `totalClicks` | Total tracked clicks. |
| `created_at` | TIMESTAMP | Admin Affiliate Links | Created | `createdAt` | `createdAt` | |

---

## 11. `feature_flags` Table

**Purpose:** Admin-controlled on/off switches for features, used for gradual rollouts and A/B testing.

| DB Column | DB Type | UI Screens | UI Field Label | Frontend Variable | API Field | Notes |
|---|---|---|---|---|---|---|
| `id` | UUID PK | Admin Feature Flags | (hidden) | `flagId` | `id` | |
| `key` | VARCHAR(100) UNIQUE | Admin Feature Flags | Flag Key | `key` | `key` | Code identifier, e.g., `'new_checkout'` |
| `name` | VARCHAR(255) | Admin Feature Flags | Feature Name | `name` | `name` | Human name: "New Checkout Flow" |
| `description` | TEXT | Admin Feature Flags | Description | `description` | `description` | What this flag controls. |
| `is_enabled` | BOOLEAN | Admin Feature Flags (toggle) | Enabled | `isEnabled` | `isEnabled` | Master on/off switch. |
| `enabled_for_roles` | TEXT[] | Admin Feature Flags | Enabled For | `enabledForRoles` | `enabledForRoles` | `['admin']` = only admins see this feature. |
| `updated_by` | UUID FK→users | Admin Feature Flags | Last Changed By | `updatedBy` | `updatedBy` | Which admin toggled it. |
| `updated_at` | TIMESTAMP | Admin Feature Flags | Last Changed | `updatedAt` | `updatedAt` | |

---

## 12. `audit_logs` Table

**Purpose:** Immutable record of every significant action in the system. Required for compliance.

| DB Column | DB Type | UI Screens | UI Field Label | Frontend Variable | API Field | Notes |
|---|---|---|---|---|---|---|
| `id` | UUID PK | Admin Audit Log | Log ID | `logId` | `id` | |
| `user_id` | UUID FK→users | Admin Audit Log | User | `userId` | `userId` | Who performed the action. Null = system action. |
| `action` | VARCHAR(100) | Admin Audit Log | Action | `action` | `action` | e.g., `'user.login'`, `'order.created'`, `'admin.role_changed'` |
| `resource_type` | VARCHAR(50) | Admin Audit Log | Resource Type | `resourceType` | `resourceType` | e.g., `'user'`, `'order'`, `'product'` |
| `resource_id` | UUID | Admin Audit Log | Resource ID | `resourceId` | `resourceId` | The ID of the thing that was changed. |
| `old_value` | JSONB | Admin Audit Log (expand row) | Before | `oldValue` | `oldValue` | Snapshot before change. |
| `new_value` | JSONB | Admin Audit Log (expand row) | After | `newValue` | `newValue` | Snapshot after change. |
| `ip_address` | VARCHAR(45) | Admin Audit Log | IP Address | `ipAddress` | `ipAddress` | Client IP. |
| `user_agent` | TEXT | Admin Audit Log (expand row) | User Agent | `userAgent` | `userAgent` | Browser/device string. |
| `created_at` | TIMESTAMP | Admin Audit Log | Timestamp | `createdAt` | `createdAt` | When the action occurred. Never has `updated_at`. Audit logs are append-only. |
