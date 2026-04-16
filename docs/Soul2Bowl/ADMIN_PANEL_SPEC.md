# Admin Panel Specification — Soul2Bowl

**Version:** 1.0.0  
**Date:** April 2026  
**Route:** `/admin`  
**Auth:** Clerk — admin role only (email: `angelreporters@gmail.com` auto-elevated)  
**Standards Reference:** [`MASTER_APP_TEMPLATE.md`](../Master_Inventory/MASTER_APP_TEMPLATE.md) Section 3 — Administration and Control

---

## Overview

The Soul2Bowl admin panel allows the owner/admin to manage every aspect of the website — from live text and images on any page, to orders, menu, calendar availability, blog, and analytics — without writing a single line of code.

---

## Access Control

| Role | Access |
|---|---|
| `admin` | Full access to all admin panel sections |
| `customer` | No access to `/admin` — redirected to homepage |
| Unauthenticated | Redirected to login |

**Admin email:** `angelreporters@gmail.com` — auto-assigned `admin` role on first Clerk login.

---

## Admin Panel Sections

### 1. Dashboard (`/admin`)

**Purpose:** At-a-glance overview of business health.

| Widget | Data |
|---|---|
| Today's Revenue | Sum of completed orders today |
| Orders Today | Count of orders by status |
| Upcoming Calendar | Next 7 days of confirmed orders |
| Pending Catering Inquiries | Count + quick-view list |
| Top Menu Items This Week | By order count |
| Subscription Count | Active meal prep subscriptions |
| Quick Actions | "Add Menu Item", "Block Calendar Date", "Create Blog Post" |

---

### 2. Page Content Editor (`/admin/content`)

**Purpose:** Edit any page's text and images without code changes.

**How it works:**
- All editable content is stored in `admin_config` table (key-value pairs)
- Admin sees a visual list of fields organized by page
- Text fields: inline text editor
- HTML fields: rich text editor (TipTap or similar)
- Image fields: upload button → saves to DigitalOcean Spaces CDN → updates config key

**Editable Content by Page:**

| Page | Editable Fields |
|---|---|
| Homepage | Hero title, hero subtitle, hero CTA button text, hero background image, about snippet text, about snippet image, featured items (up to 6), eco section text + image |
| Menu | Menu page hero text, category descriptions, filter section text |
| About | Chef bio (full HTML), chef photo, chef video URL (YouTube/Vimeo embed), culinary school name + description, story timeline items |
| Catering | Hero title, hero image, service description text, pricing callout text, FAQ items (add/edit/delete), gallery images (add/reorder/delete) |
| Order | Order page intro text, pickup instructions, delivery instructions |
| Contact | Business hours text, pickup address, phone number, email address, Google Maps embed URL, contact form confirmation message |
| Footer | Footer tagline, social media links (Instagram, Facebook, TikTok, Twitter/X), newsletter signup text, eco badge section |

---

### 3. Menu Manager (`/admin/menu`)

**Purpose:** Full CRUD on menu items.

**Features:**
- List all menu items with current price, category, status (active/archived)
- Filter by category, dietary tags, active/archived
- **Add Item:** Form with all fields from `menu_items` schema; image upload
- **Edit Item:** Pre-filled form; update any field; live preview of menu card
- **Archive Item:** Sets `is_active = false`; item disappears from public menu; order history preserved
- **Reorder:** Drag-and-drop sort within categories (`sort_order` field)
- **Price Change:** Update `price_cents`; Stripe product/price updated automatically via API
- **Toggle Featured:** Mark item as `is_featured` for homepage showcase

---

### 4. Calendar Manager (`/admin/calendar`)

**Purpose:** Control which dates and time slots are available for ordering.

**Features:**
- Monthly calendar view (color-coded by service type)
- **Add Slot:** Pick date + time + service type + max orders + pickup/delivery
- **Block Date:** Mark entire date as unavailable (public holiday, chef day off, etc.)
- **Adjust Capacity:** Change `max_orders` for any slot
- **View Bookings per Slot:** See how many orders are on each slot
- **Sunday Dinner Cutoff:** Set auto-cutoff time for Sunday Dinner orders (default: Friday 5 PM CST)
- **Bulk Schedule:** Generate recurring weekly slots (e.g., "Add all Saturday/Sunday slots for next 3 months")

---

### 5. Order Manager (`/admin/orders`)

**Purpose:** View, manage, and fulfill all customer orders.

**Features:**
- Order list with filters: status, service type, date range, search by order number or customer email
- **Order Detail View:**
  - Customer info, items ordered, dietary notes, fulfillment type + address
  - Order timeline (status history with timestamps)
  - Payment details (Stripe payment intent link)
- **Status Updates:** Move order through: `confirmed → preparing → ready → completed`
- **Refund:** Trigger Stripe refund (full or partial); adds `refunded` status
- **Export:** Download orders CSV for a date range (for kitchen prep sheet)
- **Kitchen View:** Simplified printer-friendly view of today's orders grouped by time slot

---

### 6. Catering Inquiry Manager (`/admin/catering`)

**Purpose:** Manage incoming catering requests from inquiry to booking.

**Features:**
- List all inquiries with status (inquiry, quoted, deposit paid, confirmed, completed)
- **Inquiry Detail View:** All submitted details, event info, dietary requirements, custom menu request
- **Add Quote:** Enter total quoted price; system emails quote to customer
- **Request Deposit:** Generate Stripe payment link for deposit amount
- **Status Management:** Advance inquiry through stages
- **Internal Notes:** Admin-only notes field on each inquiry
- **Calendar Link:** Once confirmed, link catering booking to calendar slot

---

### 7. Subscription Manager (`/admin/subscriptions`)

**Purpose:** View and manage Meal Prep × 7 subscribers.

**Features:**
- List all active/cancelled subscriptions
- Customer info, plan details, dietary preferences, current period
- **Cancel Subscription:** Admin-initiated cancel (with reason)
- **Pause Subscription:** Set `cancel_at_period_end` for grace period
- Link to Stripe subscription dashboard
- **Revenue Summary:** Total MRR from subscriptions

---

### 8. Blog Manager (`/admin/blog`)

**Purpose:** Full CMS for blog posts.

**Features:**
- Post list with publish status, category, date
- **Rich Text Editor:** TipTap with heading styles, images, links, bold/italic/lists
- **SEO Fields:** Per-post SEO title, meta description, keywords, canonical URL
- **OG Image Upload:** For social sharing
- **Category + Tags:** Manage categories and tag selection
- **Publish/Draft:** Toggle published status; set publish date
- **Duplicate Post:** Clone a post as a draft (useful for similar content)

---

### 9. Analytics Dashboard (`/admin/analytics`)

**Purpose:** Business intelligence at a glance.

**Metrics:**
- Revenue by day/week/month (chart)
- Orders by service type (pie chart)
- Top 10 menu items by order count
- New customers vs. returning customers
- Average order value
- Meal prep subscription growth
- Traffic sources (embedded Plausible widget or API data)
- Conversion funnel: calendar views → orders started → orders completed

---

### 10. Feature Toggles (`/admin/settings/features`)

**Purpose:** Turn features on/off without a code deploy.

| Feature | Default | Notes |
|---|---|---|
| Delivery ordering | OFF | Enable when logistics partner is ready |
| Guest checkout | ON | |
| Sunday Dinner ordering | ON | Disable during off-season |
| Catering inquiry form | ON | |
| Newsletter signup | ON | |
| Blog section | ON | |
| Meal prep subscriptions | ON | |
| Instagram feed | OFF | Enable once account is connected |

---

### 11. SEO Manager (`/admin/seo`)

**Purpose:** Override SEO metadata per page without touching code.

| Field | Editable |
|---|---|
| Meta title | Per page |
| Meta description | Per page |
| Meta keywords | Per page |
| OG image URL | Per page |
| OG image alt text | Per page |
| Canonical URL | Per page |
| robots (index/noindex) | Per page |

---

### 12. Testimonial Manager (`/admin/testimonials`)

**Purpose:** Moderate and display customer reviews.

**Features:**
- View all submitted testimonials (published/unpublished)
- Approve/reject testimonials for display
- Edit text (minor corrections only)
- Reorder displayed testimonials
- Add testimonials manually (from Google, Yelp, in-person reviews)

---

## Admin UI Design

- Same glassmorphic dark theme as the public site
- Sidebar navigation with all sections listed
- Top bar: breadcrumb + user avatar + logout
- Mobile-responsive (for on-the-go order management)
- Keyboard shortcuts for power users (e.g., `N` = new order filter, `R` = refresh dashboard)
- Success/error toast notifications on every action
- Confirmation dialogs for destructive actions (refund, archive, delete)
