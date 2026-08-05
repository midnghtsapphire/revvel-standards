# SEO Strategy — Soul2Bowl

**Version:** 1.0.0  
**Date:** April 2026  
**Status:** Active  
**Standards Reference:** [`SEO_METADATA_STANDARD.md`](../Master_Inventory/SEO_METADATA_STANDARD.md)  
**Target Lighthouse SEO Score:** 95+

---

## 1. Business SEO Profile

| Field | Value |
|---|---|
| **Business Type** | Local food service — catering, meal prep, Sunday dinner |
| **Primary Geography** | St. Louis, MO (metro area) |
| **Domain** | `soul2bowl.com` |
| **Core Differentiator** | Fusion BBQ + Asian-Hawaiian + Southern soul food, eco packaging, culinary school trained, fully custom |

---

## 2. Primary Keyword Targets

### Tier 1 — Core Local Keywords (Homepage + Service Pages)

| Keyword | Monthly Search Est. | Intent | Page Target |
|---|---|---|---|
| `catering St. Louis` | 1,300/mo | Transactional | Homepage, /catering |
| `meal prep St. Louis` | 880/mo | Transactional | Homepage, /order |
| `Sunday dinner catering St. Louis` | 320/mo | Transactional | /order |
| `St. Louis meal delivery` | 590/mo | Transactional | Homepage |
| `BBQ catering St. Louis` | 480/mo | Transactional | /catering |
| `food catering St. Louis MO` | 720/mo | Transactional | /catering |

### Tier 2 — Long-Tail Keywords (Service + Blog Pages)

| Keyword | Intent | Page Target |
|---|---|---|
| `gluten-free meal prep St. Louis` | Transactional | /menu, /order |
| `vegan catering St. Louis` | Transactional | /menu, /catering |
| `keto meal prep St. Louis` | Transactional | /menu, /order |
| `healthy meal prep delivery St. Louis` | Transactional | /order |
| `catered Sunday dinner near me St. Louis` | Transactional | /order |
| `chicken salad by the pound St. Louis` | Transactional | /menu |
| `BBQ Asian fusion catering St. Louis` | Informational | /about, blog |
| `soul food catering St. Louis` | Transactional | /catering |
| `eco-friendly catering St. Louis` | Informational | /about |
| `meal prep for the week St. Louis` | Transactional | /order |
| `flourless chocolate cake St. Louis` | Informational | /menu, blog |
| `sweet potato pie catering St. Louis` | Informational | /menu |

### Tier 3 — Brand + Reputation

| Keyword | Intent | Page Target |
|---|---|---|
| `Soul2Bowl` | Navigational | Homepage |
| `Soul2Bowl St. Louis` | Navigational | Homepage |
| `Soul2Bowl menu` | Navigational | /menu |
| `Soul2Bowl catering` | Navigational | /catering |

---

## 3. Page-by-Page SEO Metadata

### Homepage (`/`)

```ts
export const metadata = {
  title: 'Soul2Bowl — St. Louis Fusion Catering & Meal Prep',
  description: 'Order individual meals, weekly meal prep, Sunday dinner, and catering from St. Louis\'s premier fusion soul food chef. BBQ, Asian-Hawaiian, keto, vegan, gluten-free. Eco-friendly bowls.',
  keywords: 'catering St. Louis, meal prep St. Louis, Sunday dinner catering, BBQ fusion St. Louis, soul food catering',
  alternates: { canonical: 'https://soul2bowl.com' },
  openGraph: {
    title: 'Soul2Bowl — St. Louis Fusion Catering & Meal Prep',
    description: 'Catering · Meal Prep · Sunday Dinner · Individual Meals. Eco-friendly. Fusion BBQ + Asian-Hawaiian + Southern Soul Food.',
    url: 'https://soul2bowl.com',
    siteName: 'Soul2Bowl',
    images: [{ url: 'https://soul2bowl.com/og-home.png', width: 1200, height: 630, alt: 'Soul2Bowl steaming fusion bowl with glassmorphic branding, St. Louis catering and meal prep' }],
    locale: 'en_US',
    type: 'website',
  },
};
```

### Menu Page (`/menu`)

```ts
export const metadata = {
  title: 'Menu — Soul2Bowl | Fusion BBQ, Keto, Vegan, GF Options | St. Louis',
  description: 'Browse the Soul2Bowl menu — fusion bowls, sides by the pound, chicken salad, desserts. Keto, vegan, and gluten-free options available. Order online.',
  keywords: 'Soul2Bowl menu, fusion bowl menu St. Louis, gluten-free meal prep, vegan catering menu, chicken salad by the pound',
  alternates: { canonical: 'https://soul2bowl.com/menu' },
};
```

### Order / Calendar (`/order`)

```ts
export const metadata = {
  title: 'Order — Soul2Bowl | Schedule Your Meal or Catering | St. Louis',
  description: 'Pick your date, choose your service — individual meals, meal prep × 7, Sunday dinner, or catering. Order online with Stripe. Pickup or delivery in St. Louis.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://soul2bowl.com/order' },
};
```

### Catering (`/catering`)

```ts
export const metadata = {
  title: 'Catering Services — Soul2Bowl | St. Louis Event Catering',
  description: 'Full-service catering for events, corporate lunches, and celebrations in St. Louis. Custom menus, eco-friendly bowls, culinary school trained chef. Minimum 10 guests.',
  keywords: 'catering St. Louis, BBQ catering St. Louis, soul food catering, event catering St. Louis MO, eco-friendly catering',
  alternates: { canonical: 'https://soul2bowl.com/catering' },
};
```

### About (`/about`)

```ts
export const metadata = {
  title: 'About — Soul2Bowl | St. Louis Native Fusion Chef',
  description: 'Meet the chef behind Soul2Bowl — a St. Louis native and culinary school graduate bringing fusion BBQ, Asian-Hawaiian, and Southern soul food to your table.',
  keywords: 'Soul2Bowl chef, St. Louis culinary school, BBQ fusion chef St. Louis, soul food chef',
  alternates: { canonical: 'https://soul2bowl.com/about' },
};
```

---

## 4. Schema.org Structured Data

### FoodEstablishment (All Pages — in `app/layout.tsx`)

```json
{
  "@context": "https://schema.org",
  "@type": "FoodEstablishment",
  "name": "Soul2Bowl",
  "description": "St. Louis-native fusion cuisine — BBQ, Asian-Hawaiian, Southern soul food. Catering, meal prep, Sunday dinner, by-the-pound ordering. Eco-friendly compostable bowls.",
  "url": "https://soul2bowl.com",
  "servesCuisine": ["Soul Food", "BBQ", "Fusion", "Asian-Hawaiian", "Southern American"],
  "hasMenu": "https://soul2bowl.com/menu",
  "priceRange": "$$",
  "areaServed": { "@type": "City", "name": "St. Louis", "addressRegion": "MO" },
  "address": { "@type": "PostalAddress", "addressLocality": "St. Louis", "addressRegion": "MO", "addressCountry": "US" },
  "openingHours": ["Sa 10:00-18:00", "Su 10:00-18:00"]
}
```

### Menu + MenuItem (Menu Page)

```json
{
  "@context": "https://schema.org",
  "@type": "Menu",
  "name": "Soul2Bowl Menu",
  "url": "https://soul2bowl.com/menu",
  "hasMenuSection": [
    {
      "@type": "MenuSection",
      "name": "Entrées",
      "hasMenuItem": [
        {
          "@type": "MenuItem",
          "name": "Soul Bowl",
          "description": "Smoked BBQ chicken, rice, pickled cabbage, gochujang glaze",
          "offers": { "@type": "Offer", "price": "14.00", "priceCurrency": "USD" },
          "suitableForDiet": "https://schema.org/GlutenFreeDiet"
        }
      ]
    }
  ]
}
```

### LocalBusiness (Contact Page)

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Soul2Bowl",
  "url": "https://soul2bowl.com",
  "telephone": "[PHONE]",
  "address": { "@type": "PostalAddress", "addressLocality": "St. Louis", "addressRegion": "MO", "addressCountry": "US" },
  "geo": { "@type": "GeoCoordinates", "latitude": 38.6270, "longitude": -90.1994 },
  "hasMap": "https://maps.google.com/?q=soul2bowl+st+louis"
}
```

---

## 5. Content Strategy — Blog (20 Posts at Launch)

SEO-targeted blog posts to publish at launch per [Content Standard](../Master_Inventory/CONTENT_STANDARD.md):

| # | Title | Primary Keyword | Schema Type |
|---|---|---|---|
| 1 | The Best Meal Prep Services in St. Louis (2026 Guide) | meal prep St. Louis | Article |
| 2 | Sunday Dinner Catering in St. Louis — What to Expect | Sunday dinner catering St. Louis | Article |
| 3 | BBQ Fusion vs. Traditional BBQ: Why St. Louis Is Changing the Game | BBQ fusion St. Louis | Article |
| 4 | 5 Reasons to Choose Eco-Friendly Catering for Your Next Event | eco-friendly catering | Article |
| 5 | Keto Meal Prep in St. Louis: What to Look For | keto meal prep St. Louis | HowTo |
| 6 | Vegan Catering Options in St. Louis for 2026 | vegan catering St. Louis | Article |
| 7 | Gluten-Free Meal Prep: How Soul2Bowl Handles Every Dietary Need | gluten-free meal prep | Article |
| 8 | The Story Behind Soul2Bowl: From Culinary School to Your Door | Soul2Bowl story | Article |
| 9 | What Is Asian-Hawaiian Fusion Food? (And Why You Need It) | Asian Hawaiian fusion | Article |
| 10 | How to Order Catering in St. Louis for a Corporate Lunch | corporate catering St. Louis | HowTo |
| 11 | Banana Pudding vs. Sweet Potato Pie: The Great St. Louis Debate | soul food desserts | Article |
| 12 | How LIFEMADE Compostable Bowls Are Changing Food Service | compostable food containers | Article |
| 13 | Best Catering Services in St. Louis (2026 Ranked) | catering St. Louis | Article |
| 14 | How to Plan a Week of Healthy Meals (Without Cooking) | meal prep tips | HowTo |
| 15 | Chicken Salad by the Pound: The Smartest Bulk Food Buy in St. Louis | chicken salad St. Louis | Article |
| 16 | Behind the Bowl: A Day in the Life of a Fusion Chef | chef lifestyle | Article |
| 17 | Why St. Louis Is a Hidden Gem for Food Culture | St. Louis food scene | Article |
| 18 | How to Host the Perfect Sunday Dinner Without Cooking | Sunday dinner tips | HowTo |
| 19 | Flourless Chocolate Cake: The Dessert Your Guests Will Never Forget | flourless chocolate cake | Article |
| 20 | Soul2Bowl's Guide to Eco-Friendly Packaging for Food Businesses | biodegradable food packaging | HowTo |

---

## 6. Google Business Profile

- **Name:** Soul2Bowl
- **Category:** Caterer / Meal Preparation Service
- **Description:** St. Louis-native fusion chef — BBQ, Asian-Hawaiian, soul food. Catering, meal prep, Sunday dinner, by-the-pound. Eco-friendly compostable bowls. Custom requests welcome.
- **Website:** `soul2bowl.com`
- **Photos:** Minimum 10 food photos + exterior/pickup location + logo
- **Posts:** Weekly updates (new menu items, Sunday Dinner specials, events)
- **Keywords in description:** catering, meal prep, Sunday dinner, BBQ, soul food, St. Louis

---

## 7. Technical SEO Checklist

- [ ] `sitemap.xml` generated via Next.js (`app/sitemap.ts`)
- [ ] `robots.txt` in `/public/robots.txt` — allows all pages; blocks `/admin`, `/api`
- [ ] All images converted to WebP, under 200KB
- [ ] All `<img>` and `<Image>` tags have `alt` attributes
- [ ] `generateMetadata()` on every page
- [ ] Canonical URLs on every page
- [ ] JSON-LD on every page type (FoodEstablishment, Menu, Article, LocalBusiness)
- [ ] Google Search Console verified + sitemap submitted
- [ ] Google Business Profile claimed and optimized
- [ ] Lighthouse SEO score ≥ 90 before launch
- [ ] Core Web Vitals passing (LCP < 2.5s, FID < 100ms, CLS < 0.1)

---

## 8. robots.txt

```text
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /account/

Sitemap: https://soul2bowl.com/sitemap.xml
Sitemap: https://soul2bowl.com/blog/sitemap.xml
```
