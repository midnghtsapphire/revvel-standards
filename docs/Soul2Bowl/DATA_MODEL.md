# Data Model — Soul2Bowl

**Version:** 1.0.0  
**Date:** April 2026  
**ORM:** Drizzle ORM  
**Database:** PostgreSQL (DigitalOcean Managed)  
**Standards Reference:** [`DATA_MODEL_STANDARD.md`](../Master_Inventory/DATA_MODEL_STANDARD.md)

---

## Conventions

- All tables use `snake_case`
- All primary keys are UUIDs (`id uuid PRIMARY KEY DEFAULT gen_random_uuid()`)
- All timestamps: `created_at`, `updated_at` (auto-managed by Drizzle)
- Soft delete: `deleted_at TIMESTAMPTZ` (null = active)
- Monetary amounts stored in cents (integer) to avoid float precision issues
- Enums defined as Postgres native enums

---

## Core Tables

### 1. `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `clerk_id` | VARCHAR(128) UNIQUE | Clerk user ID (external) |
| `email` | VARCHAR(255) UNIQUE NOT NULL | |
| `name` | VARCHAR(255) | Display name |
| `phone` | VARCHAR(20) | Optional |
| `role` | ENUM('customer', 'admin') | Default: 'customer' |
| `dietary_preferences` | JSONB | `{keto: bool, vegan: bool, gluten_free: bool, notes: string}` |
| `stripe_customer_id` | VARCHAR(64) | Stripe customer ID |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |
| `deleted_at` | TIMESTAMPTZ | Soft delete |

---

### 2. `menu_items`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `slug` | VARCHAR(100) UNIQUE | URL-safe identifier |
| `name` | VARCHAR(255) NOT NULL | |
| `description` | TEXT | |
| `category` | ENUM('entree', 'side', 'by_the_pound', 'dessert', 'bundle') | |
| `price_cents` | INTEGER NOT NULL | Price in cents (e.g., 1400 = $14.00) |
| `price_per_unit` | ENUM('item', 'lb', 'bundle') | How it's priced |
| `min_quantity` | DECIMAL(4,1) | Min order qty (e.g., 0.5 for by-the-pound) |
| `is_keto` | BOOLEAN | Default false |
| `is_vegan` | BOOLEAN | Default false |
| `is_gluten_free` | BOOLEAN | Default false |
| `is_spicy` | BOOLEAN | Default false |
| `is_featured` | BOOLEAN | Show on homepage featured section |
| `is_active` | BOOLEAN | Default true; set to false to archive |
| `image_url` | VARCHAR(512) | CDN URL (WebP) |
| `image_alt` | VARCHAR(200) | SEO alt text — required |
| `sort_order` | INTEGER | Display order within category |
| `stripe_product_id` | VARCHAR(64) | Stripe Product ID |
| `stripe_price_id` | VARCHAR(64) | Stripe Price ID |
| `seo_title` | VARCHAR(100) | For menu item page SEO |
| `seo_description` | VARCHAR(200) | For menu item page SEO |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |
| `deleted_at` | TIMESTAMPTZ | Soft delete |

---

### 3. `calendar_slots`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `date` | DATE NOT NULL | |
| `time_slot` | TIME | e.g., '12:00', '14:00', '16:00' |
| `service_type` | ENUM('individual', 'meal_prep_7', 'sunday_dinner', 'catering', 'by_the_pound') | |
| `max_orders` | INTEGER | Max orders for this slot |
| `current_orders` | INTEGER | Count of confirmed orders (auto-incremented) |
| `is_available` | BOOLEAN | Admin can blackout dates |
| `pickup_or_delivery` | ENUM('pickup', 'delivery', 'both') | |
| `cutoff_at` | TIMESTAMPTZ | When ordering closes for this slot |
| `notes` | TEXT | Admin notes |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

---

### 4. `orders`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `order_number` | VARCHAR(20) UNIQUE | Human-readable: `SB-2026-001` |
| `user_id` | UUID FK → users | Null for guest orders |
| `guest_email` | VARCHAR(255) | For guest checkout |
| `guest_name` | VARCHAR(255) | |
| `guest_phone` | VARCHAR(20) | |
| `calendar_slot_id` | UUID FK → calendar_slots | |
| `service_type` | ENUM('individual', 'meal_prep_7', 'sunday_dinner', 'catering', 'by_the_pound') | |
| `status` | ENUM('draft', 'pending_payment', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'refunded') | |
| `subtotal_cents` | INTEGER | |
| `tax_cents` | INTEGER | |
| `delivery_fee_cents` | INTEGER | 0 for pickup |
| `total_cents` | INTEGER | |
| `fulfillment_type` | ENUM('pickup', 'delivery') | |
| `delivery_address` | JSONB | `{line1, line2, city, state, zip}` |
| `custom_notes` | TEXT | Customer dietary notes / special requests |
| `stripe_payment_intent_id` | VARCHAR(64) | |
| `stripe_checkout_session_id` | VARCHAR(64) | |
| `confirmed_at` | TIMESTAMPTZ | |
| `completed_at` | TIMESTAMPTZ | |
| `cancelled_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

---

### 5. `order_items`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `order_id` | UUID FK → orders | |
| `menu_item_id` | UUID FK → menu_items | |
| `quantity` | DECIMAL(6,2) | Supports fractional lbs (1.5 lb chicken salad) |
| `unit_price_cents` | INTEGER | Price at time of order (snapshot) |
| `total_cents` | INTEGER | `quantity * unit_price_cents` |
| `notes` | TEXT | Per-item notes |
| `created_at` | TIMESTAMPTZ | Auto |

---

### 6. `subscriptions` (Meal Prep × 7)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `stripe_subscription_id` | VARCHAR(64) UNIQUE | |
| `stripe_customer_id` | VARCHAR(64) | |
| `plan_type` | ENUM('meal_prep_7') | Extensible for future plans |
| `status` | ENUM('active', 'past_due', 'cancelled', 'paused') | |
| `current_period_start` | TIMESTAMPTZ | |
| `current_period_end` | TIMESTAMPTZ | |
| `dietary_preferences` | JSONB | Weekly meal preference override |
| `custom_notes` | TEXT | Recurring custom request |
| `cancel_at_period_end` | BOOLEAN | |
| `cancelled_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

---

### 7. `catering_bookings`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | Null if submitted without account |
| `contact_name` | VARCHAR(255) NOT NULL | |
| `contact_email` | VARCHAR(255) NOT NULL | |
| `contact_phone` | VARCHAR(20) | |
| `event_date` | DATE NOT NULL | |
| `event_time` | TIME | |
| `guest_count` | INTEGER | |
| `event_type` | VARCHAR(100) | e.g., "corporate lunch", "birthday party" |
| `venue_address` | JSONB | |
| `dietary_requirements` | TEXT | |
| `custom_menu_request` | TEXT | |
| `estimated_budget_cents` | INTEGER | |
| `status` | ENUM('inquiry', 'quoted', 'deposit_paid', 'confirmed', 'completed', 'cancelled') | |
| `deposit_amount_cents` | INTEGER | |
| `stripe_deposit_payment_intent_id` | VARCHAR(64) | |
| `admin_notes` | TEXT | Internal |
| `quoted_price_cents` | INTEGER | Admin enters after inquiry |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

---

### 8. `blog_posts`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `slug` | VARCHAR(200) UNIQUE NOT NULL | URL slug |
| `title` | VARCHAR(255) NOT NULL | |
| `excerpt` | TEXT | Short description (150 chars) |
| `content` | TEXT | Rich HTML or MDX |
| `category` | VARCHAR(100) | e.g., 'recipes', 'meal-prep', 'catering-tips' |
| `tags` | TEXT[] | |
| `author_name` | VARCHAR(255) | Default: chef name |
| `cover_image_url` | VARCHAR(512) | |
| `cover_image_alt` | VARCHAR(200) | Required |
| `og_image_url` | VARCHAR(512) | |
| `og_image_alt` | VARCHAR(200) | |
| `seo_title` | VARCHAR(100) | |
| `seo_description` | VARCHAR(200) | |
| `seo_keywords` | TEXT | |
| `canonical_url` | VARCHAR(512) | |
| `is_published` | BOOLEAN | |
| `published_at` | TIMESTAMPTZ | |
| `schema_type` | VARCHAR(50) | Default: 'Article'; can be 'HowTo', 'FAQPage' |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |
| `deleted_at` | TIMESTAMPTZ | Soft delete |

---

### 9. `admin_config`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `key` | VARCHAR(100) UNIQUE NOT NULL | e.g., `homepage.hero_title` |
| `value` | TEXT | The editable value |
| `type` | ENUM('text', 'html', 'image_url', 'boolean', 'json') | |
| `page` | VARCHAR(100) | Which page this config belongs to |
| `label` | VARCHAR(255) | Human-readable label for admin panel |
| `updated_by` | UUID FK → users | |
| `updated_at` | TIMESTAMPTZ | Auto |

---

### 10. `testimonials`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `customer_name` | VARCHAR(255) | |
| `customer_title` | VARCHAR(255) | Optional (e.g., "Regular Sunday Dinner Customer") |
| `content` | TEXT | Review text |
| `rating` | INTEGER | 1–5 |
| `image_url` | VARCHAR(512) | Optional customer photo |
| `is_published` | BOOLEAN | Default false; admin approves |
| `source` | ENUM('manual', 'google', 'yelp') | |
| `sort_order` | INTEGER | |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

---

## Entity Relationship Diagram (Text)

```text
users ──────────────────────────────────────────────────┐
  │                                                      │
  ├── orders ──────────────── order_items ── menu_items  │
  │     │                                               │
  │     └── calendar_slots                              │
  │                                                      │
  ├── subscriptions                                      │
  │                                                      │
  └── catering_bookings                                  │
                                                         │
admin_config (no FK — flat key-value store)              │
blog_posts (no FK — standalone)                          │
testimonials (no FK — standalone)                        │
```
