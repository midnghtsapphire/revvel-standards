# Soul2Bowl — Master Blueprint & Product Specification

**Organization:** Freedom Angel Corp (EIN: 86-1209156)  
**Product:** Soul2Bowl — *St. Louis Fusion Cuisine, Delivered to Your Door*  
**Website:** [www.Soul2Bowl.com](https://www.soul2bowl.com)  
**Status:** SINGLE SOURCE OF TRUTH (SSOT)  
**Version:** 1.0.0 (April 2026)  
**Repository:** `midnghtsapphire/Soul2Bowl`  
**Standards Repo:** `midnghtsapphire/revvel-standards`

---

## 1. Executive Summary

Soul2Bowl is a premium online ordering and catering platform for a St. Louis-native, culinary-school-trained chef specializing in fusion cuisine — BBQ, Asian-Hawaiian flare, and classic Southern soul food served in eco-friendly biodegradable bowls. The platform enables customers to order individual meals, weekly meal prep bundles, Sunday dinner packs, catering events, and by-the-pound items (chicken salad, sides) via a beautiful glassmorphic website with animated food visuals, a live booking calendar, and full Stripe checkout.

---

## 2. Business Overview

| Field | Value |
|---|---|
| **Business Name** | Soul2Bowl |
| **Domain** | `soul2bowl.com` |
| **Owner/Chef** | Audrey Evans (MIDNGHTSAPPHIRE ecosystem) |
| **Origin** | St. Louis, MO native |
| **Culinary Training** | Graduate of an upscale St. Louis culinary school |
| **Cuisine Style** | Fusion BBQ · Asian-Hawaiian flare · Southern Soul Food |
| **Specialties** | Homemade sweet potato pie · Banana pudding · Flourless chocolate cake |
| **Dietary Options** | Keto · Vegan · Gluten-Free · Custom requests welcome |
| **Packaging** | LIFEMADE 160 Count 16 oz Bowls — TUV OK compost HOME + BPI® Certified · Biodegradable · Compostable · BPA-Free · Eco-Friendly |
| **Philosophy** | *"I cater to you."* — Clean, good ingredients. Casual with fine culinary precision. |

---

## 3. Services

### 3.1. Individual Meals
- Single-serving bowls priced individually
- Available daily or by scheduled pickup/delivery
- Orderable through the online calendar

### 3.2. Meal Prep × 7
- 7-day meal prep packs for one person
- Pre-scheduled weekly delivery
- Configurable dietary preferences (keto, vegan, gluten-free)
- Discounted bundle pricing

### 3.3. Sunday Dinner (Saturday & Sunday)
- Full Sunday dinner package — entrée + 2 sides + dessert
- Available Sat–Sun only
- Calendar-driven ordering window (closes Friday 5 PM)
- Family pack options (serves 2, 4, 6)

### 3.4. Catering
- Full-service catering for events, corporate lunches, parties, celebrations
- Custom quote via booking calendar
- Minimum headcount: 10 guests
- Custom menu request form
- Deposit required at booking (via Stripe)

### 3.5. By the Pound
- **Chicken Salad** — sold by the pound
- **Sides** — sweet potato pie, banana pudding, coleslaw, mac & cheese, collard greens, fried rice, etc.
- Quantity selector (0.5 lb increments)
- Photo-driven menu (image of each item beside selector)

---

## 4. Menu (Short Menu — Current Pricing)

### Entrées
| Item | Description | Price |
|---|---|---|
| Soul Bowl | Smoked BBQ chicken, rice, pickled cabbage, gochujang glaze | $14 |
| Island Bowl | Teriyaki pork, coconut jasmine rice, pineapple slaw | $14 |
| Keto Bowl | Grilled chicken thigh, cauliflower rice, avocado, low-carb sauce | $13 |
| Vegan Garden Bowl | Glazed tofu, brown rice, roasted vegetables, miso dressing | $12 |
| GF Fusion Bowl | Gluten-free smoked brisket, jasmine rice, charred corn, chimichurri | $15 |

### Sides (By the Pound / Per Order)
| Item | Per Serving | By the Pound |
|---|---|---|
| Mac & Cheese | $4 | $16/lb |
| Collard Greens | $4 | $14/lb |
| Fried Rice | $4 | $14/lb |
| Coleslaw | $3 | $10/lb |
| Sweet Potato Mash | $4 | $15/lb |

### By the Pound
| Item | Price |
|---|---|
| Chicken Salad | $18/lb |

### Desserts
| Item | Price |
|---|---|
| Homemade Sweet Potato Pie (slice) | $5 |
| Banana Pudding (cup) | $5 |
| Flourless Chocolate Cake (slice) | $6 |

### Bundles
| Bundle | Description | Price |
|---|---|---|
| Meal Prep × 7 | 7 entrée bowls of your choice | $88 |
| Sunday Dinner for 2 | 2 entrées + 2 sides + 2 desserts | $42 |
| Sunday Dinner for 4 | 4 entrées + 4 sides + 4 desserts | $80 |
| Catering Package | Custom quote — starts at $18/person (min 10) | Custom |

---

## 5. Website Pages

### 5.1. Homepage (`/`)
- **Hero Section:** Full-viewport animated glassmorphic background, steaming food bowl animation, tagline, CTA button "Order Now" / "Book Catering"
- **About Snippet:** Brief chef intro with photo, St. Louis origin story, culinary school background
- **Services Section:** Cards for each service (Individual, Meal Prep, Sunday Dinner, Catering, By the Pound)
- **Featured Menu:** Glassmorphic menu cards with images and prices — 3–5 featured items
- **Eco Packaging Highlight:** LIFEMADE bowl showcase with eco certifications
- **Testimonials:** Customer reviews with star ratings
- **Instagram Feed:** Live embedded social proof
- **CTA Section:** Book a catering event / Schedule meal prep
- **Footer:** Social links, contact, eco badges, newsletter signup

### 5.2. Menu (`/menu`)
- Full menu organized by category (Entrées, Sides, By the Pound, Desserts, Bundles)
- Dietary filter tags (Keto, Vegan, GF, Spicy, Fan Fave)
- Photo-driven layout — each item has an image
- Price clearly shown
- "Add to Order" CTA on each item (links to calendar/order flow)

### 5.3. Order / Calendar (`/order`)
- Interactive calendar (FullCalendar.js or custom) showing available dates and time slots
- Service type selector: Individual Meal · Meal Prep × 7 · Sunday Dinner · By the Pound
- Item selector with quantity
- Pickup vs. delivery toggle
- Address entry (delivery)
- Dietary note / custom request text field
- Stripe checkout integration
- Order confirmation email (via Resend)

### 5.4. Catering (`/catering`)
- Service overview with hero photo
- What's included (custom menu, setup, serving, eco packaging)
- Gallery of past events (animated slide show)
- Pricing info (per-person range, minimums)
- Booking form with calendar for event date/time
- Deposit payment via Stripe
- Custom menu request form
- FAQ accordion

### 5.5. About (`/about`)
- Chef bio: St. Louis native, culinary school journey, philosophy
- Short owner video embed (YouTube/Vimeo)
- Behind-the-scenes food photos
- Philosophy: "Clean ingredients. Real food. I cater to you."
- Eco packaging section — brand values
- Timeline / story of Soul2Bowl

### 5.6. Blog (`/blog`)
- SEO-driven content: recipes, food tips, St. Louis food culture, meal prep guides
- Structured for Google Discover
- Category tags: Recipes · Meal Prep · Catering Tips · Sustainability · St. Louis

### 5.7. Contact (`/contact`)
- Contact form (name, email, phone, message)
- Link to catering inquiry form
- Social media links
- Google Maps embed (pickup location)
- Business hours

### 5.8. Account (`/account`)
- Order history
- Saved dietary preferences
- Upcoming scheduled orders
- Manage meal prep subscription
- Billing / payment methods

### 5.9. Admin Panel (`/admin`)
- See Section 12 — Admin Panel Spec

---

## 6. Technology Stack

Per [Revvel Master App Template](../Master_Inventory/MASTER_APP_TEMPLATE.md):

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14+ (App Router) |
| **Styling** | Tailwind CSS + custom glassmorphism utilities |
| **Animation** | Framer Motion (food steam, parallax, page transitions) |
| **Backend** | Node.js / tRPC or Next.js Route Handlers |
| **Database** | PostgreSQL (Drizzle ORM) |
| **Authentication** | Clerk (Google OAuth + Apple Sign-In + Email/Password) |
| **Payments** | Stripe (one-time + recurring subscriptions) |
| **Email** | Resend (order confirmations, newsletters) |
| **Calendar** | FullCalendar.js or custom React calendar |
| **Media CDN** | DigitalOcean Spaces CDN |
| **Deployment** | DigitalOcean App Platform or Droplet |
| **CI/CD** | GitHub Actions → DigitalOcean |
| **Analytics** | Plausible (privacy-respecting) |
| **Error Tracking** | Sentry |

---

## 7. Authentication

- **Google OAuth** — "Sign in with Google"
- **Apple Sign-In** — "Sign in with Apple"
- **Email + Password** — Standard registration with email verification
- **Guest Checkout** — Allow order without account (with email capture)
- Protected routes: `/account`, `/admin`
- Admin email: `angelreporters@gmail.com` — auto-authenticated as full admin

---

## 8. Stripe Integration

### Payment Types
| Type | Use Case |
|---|---|
| **One-Time Payment** | Individual meals, by-the-pound orders, Sunday dinner, catering deposits |
| **Subscription** | Weekly meal prep × 7 (recurring weekly billing) |
| **Stripe Checkout** | Hosted checkout for individual and bundle orders |
| **Stripe Customer Portal** | Manage/cancel meal prep subscription |

### Webhook Events to Handle
- `checkout.session.completed` → create order, send confirmation email
- `invoice.paid` → renew meal prep subscription
- `invoice.payment_failed` → send dunning email, retry logic
- `customer.subscription.deleted` → cancel meal prep plan

---

## 9. Calendar & Ordering System

### Calendar Features
- View available days (admin controls blackout dates)
- Select service type
- See available time slots for pickup or delivery windows
- Max orders per time slot (admin configurable)
- Color-coded by service: Individual (blue), Sunday Dinner (gold), Meal Prep (green), Catering (purple), By the Pound (teal)

### Order States
`draft` → `pending_payment` → `confirmed` → `preparing` → `ready` → `completed` | `cancelled`

---

## 10. Animation & Visual Design

### Animation Targets
- **Hero section:** Food bowl with rising steam particles (CSS/Framer Motion)
- **Menu cards:** Hover lift + shimmer glassmorphic glow
- **Page transitions:** Smooth slide-in with Framer Motion
- **Scroll-triggered reveals:** Menu items fade-in as user scrolls
- **Testimonials:** Carousel with smooth glide
- **Calendar slots:** Pulse animation on available slots
- **Loading states:** Animated SVG bowls / chopsticks spinner

### Design System
| Token | Value |
|---|---|
| **Primary** | From logo (see `BRAND.md`) |
| **Secondary** | From logo |
| **Accent** | From logo |
| **Background** | Deep dark glass: `rgba(5, 5, 15, 0.95)` |
| **Glass Surface** | `rgba(255,255,255,0.06)` + `backdrop-filter: blur(20px)` |
| **Glass Border** | `rgba(255,255,255,0.15)` |
| **Text Primary** | `#F8F8F8` |
| **Text Secondary** | `rgba(248,248,248,0.65)` |
| **Corner Radius** | `16px` (cards), `24px` (modals), `8px` (buttons) |
| **Shadow** | `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)` |

---

## 11. Eco Packaging Section

- Featured product: **LIFEMADE 160 Count 16 oz Bowls**
  - TUV OK compost HOME Certified
  - BPI® Commercially Compostable Certified
  - 8 bundles × 20 bowls per case
  - BPA-Free
  - Eco-friendly materials
- Display certification badges on:
  - Homepage (hero or about section)
  - Menu page (below food images)
  - Order confirmation page
  - Footer
- Copy: *"Every Soul2Bowl order arrives in a LIFEMADE bowl — home and commercially compostable, BPA-free, and certified biodegradable. Good food. Good conscience."*

---

## 12. Admin Panel (`/admin`)

See: [`ADMIN_PANEL_SPEC.md`](./ADMIN_PANEL_SPEC.md)

Key capabilities:
- Edit all page text and images (no code required)
- Manage menu items (add, edit, archive, price changes)
- Control calendar availability and blackout dates
- Manage orders (view, update status, refund via Stripe)
- Manage blog posts
- View analytics dashboard (orders, revenue, top items)
- Toggle features on/off per user or globally
- Manage SEO metadata per page

---

## 13. SEO Strategy

See: [`SEO_STRATEGY.md`](./SEO_STRATEGY.md)

Key targets:
- Primary: `catering St. Louis`, `meal prep St. Louis`, `Sunday dinner catering St. Louis`
- Secondary: `BBQ fusion delivery St. Louis`, `healthy meal prep St. Louis MO`, `gluten-free catering St. Louis`
- Schema.org: `Restaurant`, `FoodEstablishment`, `LocalBusiness`, `Menu`, `MenuItem`
- Google Business Profile optimization
- Target Lighthouse SEO score: 95+

---

## 14. Data Model

See: [`DATA_MODEL.md`](./DATA_MODEL.md)

Core tables: `users`, `orders`, `order_items`, `menu_items`, `calendar_slots`, `catering_bookings`, `subscriptions`, `blog_posts`, `admin_config`, `testimonials`

---

## 15. Required Compliance Checklist

Per [Revvel Compliance Rubric](../Master_Inventory/COMPLIANCE_RUBRIC.md):

- [x] Google OAuth + Apple Sign-In + Email/Password auth
- [x] Stripe integration (one-time + subscriptions + webhooks)
- [x] Admin panel with text/image CMS
- [x] Full SEO (meta tags, JSON-LD, sitemap, robots.txt)
- [x] WCAG 2.1 AA accessibility
- [x] 5 accessibility modes (WCAG AAA, ECO CODE, NEURO CODE, DYSLEXIC MODE, NO BLUE LIGHT)
- [x] Glassmorphism dark UI
- [x] `.env.example` with all secrets listed
- [x] `.mcp.json` (web profile)
- [x] Auto-generated CHANGELOG.md via GitHub Actions
- [x] `/docs` folder with BLUEPRINT, ROADMAP, BRAND, BOM, DARE, RAID
- [x] Analytics (Plausible)
- [x] Error tracking (Sentry)
- [x] Email marketing (Resend + newsletter)
- [x] `LICENSE` file (All Rights Reserved — Freedom Angel Corp)

---

## 16. Owner Video Section

The About page (`/about`) shall include a **short video feature** with the owner/chef:

### Video Content Outline
1. **Intro (0:00–0:15):** Chef introduces herself — St. Louis native, culinary school journey
2. **Kitchen Scene (0:15–0:45):** Preparing signature dishes, plating with eco bowls
3. **Philosophy (0:45–1:00):** "I cater to you" — clean ingredients, custom requests, conscious packaging
4. **Menu Showcase (1:00–1:20):** Camera sweeps over finished bowl dishes (food styling hero shots)
5. **CTA (1:20–1:30):** "Order yours at Soul2Bowl.com"

### Video Specs
- Format: MP4 (H.264), 1080p
- Max length: 90 seconds
- Hosting: YouTube (unlisted or public) / Vimeo — embedded on About page
- Thumbnail: Custom branded overlay with Soul2Bowl glassmorphic design

---

## 17. Reference Sites (Deep Research)

Top sites studied during design research:

| Site | What to Borrow |
|---|---|
| [24 Carrots Catering](https://www.24carrots.com) | Full-bleed hero photos, event gallery, catering inquiry flow |
| [Proof of the Pudding](https://proofpudding.com) | Clean typography, food photography, trust-building |
| [Chowgirls Catering](https://chowgirlscatering.com) | Service pages, sustainability messaging |
| [Graze](https://usegraze.com) | Interactive menu, subscription flow, 2026 trends |
| [Time for Dinner STL](https://www.timefordinner.com) | Local St. Louis meal prep competitor |
| DesignRush Food Awards 2026 | Glassmorphic + animation inspiration |

---

## 18. Project Lifecycle (EXRUP)

| Phase | Status | Description |
|---|---|---|
| 1. Deep Research | ✅ Complete | Competitor analysis, SEO research, design references |
| 2. Specification | ✅ Complete | This document |
| 3. Rollout Plan | ✅ Complete | See `ROADMAP.md` |
| 4. Scrum Docs | ✅ Complete | See `SPRINT_LOG.md` |
| 5. D.A.R.E. Log | ✅ Complete | See `DARE_LOG.md` |
| 6. R.A.I.D. Log | ✅ Complete | See `RAID_LOG.md` |
| 7. Implementation | 🔲 Pending | Build `midnghtsapphire/Soul2Bowl` repo |
| 8. Release | 🔲 Pending | Deploy to `soul2bowl.com` |
