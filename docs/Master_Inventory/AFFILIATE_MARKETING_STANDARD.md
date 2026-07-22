# Affiliate Marketing Standard

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Mandatory Policy — every Revvel app with a monetization model  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. What This Standard Covers

Every Revvel application that sells products, services, or subscriptions must include two affiliate systems:

1. **Outbound affiliate program** — Your own affiliates (other people) promote your app and earn commissions when they refer paying customers.
2. **Inbound affiliate auto-linker** — Your app automatically inserts your own affiliate/referral links (Amazon, DigitalOcean, Make.com, etc.) into content and newsletters.

Both systems run from the same database tables. Both are tracked in the Marketing Dashboard.

---

## 2. Outbound Affiliate Program (People Promoting Your App)

### 2.1. How It Works

```text
Affiliate signs up → Gets unique code (e.g., ?ref=sarah123)
         ↓
They share their referral link on social, email, content
         ↓
Visitor clicks link → cookie saved for 30 days
         ↓
Visitor purchases within 30 days → commission credited
         ↓
Monthly payout via Stripe Connect or PayPal
```

### 2.2. Database Tables

See `docs/field-maps/DATABASE_TO_UI_MASTER_MAP.md` for full column details.

- **`affiliates`** — One row per person in your affiliate program
- **`affiliate_referrals`** — Every click and conversion tracked through an affiliate link
- **`orders.affiliate_code`** — Which affiliate code was active during checkout
- **`orders.affiliate_commission_cents`** — Commission amount for this order
- **`users.affiliate_code`** — Every user has a code (unused unless they join the program)

### 2.3. Field Map: Affiliate Application Screen

| Field ID | Field Label | DB Column | Type | Required | Notes |
|---|---|---|---|---|---|
| FM-AFF-001 | Full Name | `users.first_name` + `users.last_name` | Text Input | Yes | Pre-filled from profile |
| FM-AFF-002 | Email | `users.email` | Email Input | Yes | Pre-filled, read-only |
| FM-AFF-003 | Website / Social Profile URL | `affiliates.website_url` | Text Input | No | Where they plan to promote |
| FM-AFF-004 | Audience Size (approx.) | `affiliates.audience_size` | Dropdown | No | Under 1K / 1K-10K / 10K-100K / 100K+ |
| FM-AFF-005 | How will you promote? | `affiliates.promotion_method` | Checkbox Group | Yes | Social Media, Email, Blog, YouTube, Podcast |
| FM-AFF-006 | Desired Payout Method | `affiliates.payout_method` | Dropdown | Yes | Stripe, PayPal |
| FM-AFF-007 | Payout Email | `affiliates.payout_email` | Email Input | Yes | PayPal email or Stripe Connect |
| FM-AFF-008 | Agree to Terms | (validation only) | Checkbox | Yes | Links to affiliate terms page |

### 2.4. Field Map: Affiliate Dashboard Screen

| Field ID | Field Label | DB Source | Display Format | Notes |
|---|---|---|---|---|
| FM-AFF-020 | Your Referral Code | `affiliates.affiliate_code` | Read-only text + copy button | e.g., `sarah123` |
| FM-AFF-021 | Your Referral Link | `affiliates.referral_link` | Read-only text + copy button | Full URL with code |
| FM-AFF-022 | Commission Rate | `affiliates.commission_rate_pct` | `20%` | Default 20% |
| FM-AFF-023 | Total Earned | `affiliates.total_earned_cents ÷ 100` | `$240.00` | Lifetime |
| FM-AFF-024 | Pending Payout | `affiliates.pending_payout_cents ÷ 100` | `$60.00` | Next payout cycle |
| FM-AFF-025 | Total Clicks | `affiliates.total_clicks` | `1,243` | All-time referral link clicks |
| FM-AFF-026 | Total Conversions | `affiliates.total_conversions` | `48` | Clicks that resulted in a purchase |
| FM-AFF-027 | Conversion Rate | `affiliates.conversion_rate_pct` | `3.86%` | conversions ÷ clicks |
| FM-AFF-028 | Status | `affiliates.status` | Badge: Active / Pending / Suspended | |
| FM-AFF-029 | Recent Referrals | `affiliate_referrals` (last 10) | Table | Shows date, order total, commission |
| FM-AFF-030 | Payout History | `affiliate_payouts` | Table | Date, amount, method, status |

### 2.5. Commission Rules

| Scenario | Commission |
|---|---|
| Default purchase | 20% of order total |
| Subscription first month | 20% of first payment |
| Subscription recurring | 10% of every recurring charge |
| Product with override | `products.affiliate_commission_pct` overrides default |
| Refunded order | Commission reversed |

### 2.6. Cookie / Attribution Window

- **Cookie duration:** 30 days from click
- **Attribution model:** Last-click wins (the most recent affiliate code seen gets credit)
- **How stored:** Affiliate code stored in `localStorage` and read at checkout:

```ts
// When visitor lands with ?ref=sarah123:
localStorage.setItem('affiliate_code', 'sarah123');
localStorage.setItem('affiliate_code_ts', Date.now().toString());

// At checkout, read it:
const code = localStorage.getItem('affiliate_code');
const ts = parseInt(localStorage.getItem('affiliate_code_ts') || '0');
const thirtyDays = 30 * 24 * 60 * 60 * 1000;
const activeCode = Date.now() - ts < thirtyDays ? code : null;
// Include activeCode in POST /api/checkout body
```

---

## 3. Inbound Affiliate Auto-Linker (Your Own Affiliate Links)

### 3.1. How It Works

Every Revvel app automatically embeds your own referral/affiliate links (Amazon, DigitalOcean, Make.com, etc.) into:
- Blog posts and content pages
- Newsletters
- Product recommendation sections
- Resource/tools pages

The auto-linker reads the `affiliate_links` table and replaces keyword mentions with tracked URLs.

### 3.2. Active Affiliate Links

These are Audrey's personal affiliate links and must be embedded in every app:

| Platform | Affiliate URL | Tracking Code | Commission |
|---|---|---|---|
| **Amazon** | Auto-generated per product | `meetaudreyeva-20` | Up to 10% |
| **DigitalOcean** | `https://m.do.co/c/fe8240d60588` | `fe8240d60588` | $25 per sign-up |
| **Make.com** | `https://www.make.com/en/register?pc=risingaloha` | `risingaloha` | 20% recurring |
| **GoHighLevel** | `https://www.gohighlevel.com/?fp_ref=audrey51` | `audrey51` | 40% recurring |
| **VideoGen** | `https://videogen.io/?fpr=audrey21` | `audrey21` | 25% |
| **Chime** | `https://www.chime.com/r/audreyevans44/?c=s` | `audreyevans44` | $100 per funded account |
| **Monday.com** | `https://try.monday.com/9828lfh0uct0` | `9828lfh0uct0` | Per referral |

### 3.3. Auto-Linker Rules

- Every mention of "DigitalOcean" in blog content → wrapped in `href=https://m.do.co/c/fe8240d60588`
- Every mention of "Make.com" or "Make automation" → wrapped with Make.com affiliate link
- Amazon product mentions → auto-tagged with `meetaudreyeva-20` using Amazon PA API
- Affiliate links are clearly disclosed per FTC rules ("This post contains affiliate links")
- Links open in new tab (`target="_blank"`)

### 3.4. Newsletter Auto-Embedding

Every newsletter generated by the system must include:
1. One featured affiliate product/tool with the affiliate link
2. The deal/promo section at the bottom with 2–3 affiliate links
3. The disclosure statement: *"Some links in this newsletter are affiliate links. If you purchase through them, I may earn a commission at no extra cost to you."*

---

## 4. Payout System

### 4.1. Payout Schedule

Payouts are processed on the **1st of every month** for the previous month's earnings.

| Condition | Payout |
|---|---|
| Minimum payout | $50 earned before payout triggers |
| Payout method | Stripe Connect (preferred) or PayPal |
| Order must be | 14 days old and not refunded |
| Currency | USD |

### 4.2. Payout Database Fields

The `affiliate_payouts` table (not yet in master map — add when implementing):

| Column | Type | Meaning |
|---|---|---|
| `affiliate_id` | UUID FK | Which affiliate |
| `amount_cents` | INTEGER | Amount paid |
| `method` | VARCHAR(50) | `'stripe'` or `'paypal'` |
| `status` | VARCHAR(50) | `'pending'`, `'processing'`, `'paid'`, `'failed'` |
| `paid_at` | TIMESTAMP | When transfer was sent |
| `stripe_transfer_id` | VARCHAR(255) | Stripe transfer ID for reconciliation |
| `period_start` | TIMESTAMP | Start of the period this covers |
| `period_end` | TIMESTAMP | End of the period this covers |

### 4.3. Admin Payout Flow

1. Admin navigates to Admin Panel → Payouts
2. System shows all affiliates with `pending_payout_cents >= 5000` (≥$50)
3. Admin clicks "Process All Payouts" or selects individual affiliates
4. System creates Stripe transfers via Stripe Connect API
5. `affiliate_payouts` rows created with `status: 'processing'`
6. Stripe webhook confirms success → `status: 'paid'`, `paid_at` set
7. Affiliate receives email notification with payout details

---

## 5. Affiliate Program Field Map: Admin Panel

| Field ID | Screen | Field Label | DB Source | Type | Notes |
|---|---|---|---|---|---|
| FM-ADMINAFF-001 | Admin Affiliates List | Name | `users.first_name + last_name` | Read-only | |
| FM-ADMINAFF-002 | Admin Affiliates List | Email | `users.email` | Read-only | |
| FM-ADMINAFF-003 | Admin Affiliates List | Code | `affiliates.affiliate_code` | Read-only | |
| FM-ADMINAFF-004 | Admin Affiliates List | Total Earned | `affiliates.total_earned_cents` | Read-only | Formatted as $X.XX |
| FM-ADMINAFF-005 | Admin Affiliates List | Pending Payout | `affiliates.pending_payout_cents` | Read-only | |
| FM-ADMINAFF-006 | Admin Affiliates List | Status | `affiliates.status` | Editable Dropdown | active / suspended |
| FM-ADMINAFF-007 | Admin Affiliates List | Conversions | `affiliates.total_conversions` | Read-only | |
| FM-ADMINAFF-008 | Admin Affiliates Detail | Commission Rate | `affiliates.commission_rate_pct` | Editable Number Input | Override default rate |
| FM-ADMINAFF-009 | Admin Affiliates Detail | Approved On | `affiliates.approved_at` | Read-only | |
| FM-ADMINAFF-010 | Admin Payouts | Amount | `affiliate_payouts.amount_cents` | Read-only | |
| FM-ADMINAFF-011 | Admin Payouts | Status | `affiliate_payouts.status` | Status badge | |
| FM-ADMINAFF-012 | Admin Payouts | Paid At | `affiliate_payouts.paid_at` | Read-only | |

---

## 6. IRS / Tax Compliance for Affiliates

Affiliates who earn **$600 or more in a calendar year** must have a W-9 on file and receive a 1099-NEC.

| Requirement | When | Action |
|---|---|---|
| Collect W-9 | Before first payout | Require W-9 upload in affiliate settings |
| Issue 1099-NEC | By January 31 of following year | Use Track1099 or similar service |
| Record keeping | All years | Store in `affiliate_tax_forms` table |
| Threshold | $600/year | System auto-flags when approaching |

**See `docs/edi-maps/IRS_1099_AND_W9_FIELD_MAP.md` for the exact field mapping between your database and IRS form fields.**
