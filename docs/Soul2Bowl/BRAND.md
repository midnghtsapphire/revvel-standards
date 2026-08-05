# Brand Identity — Soul2Bowl

> Filled from `templates/brand/BRAND_IDENTITY_TEMPLATE.md`
> Revvel Emblem derivation based on Soul2Bowl design decisions.

---

## Basic Identity

| Field | Value |
|---|---|
| Project Name | Soul2Bowl |
| Tagline | *St. Louis fusion cuisine — soul in every bowl, crafted just for you* |
| Domain | `soul2bowl.com` |
| Parent Entity | Freedom Angel Corp (EIN: 86-1209156) |
| Brand Colors | Primary: `#C8933A` (Warm Gold) · Secondary: `#2A7A6F` (Deep Teal) · Accent: `#E25B3A` (Flame Orange) · Background: `#09090F` (Deep Obsidian) |
| Glass Surface | `rgba(255, 255, 255, 0.06)` with `backdrop-filter: blur(20px)` |
| Glass Border | `rgba(255, 255, 255, 0.14)` |
| Glass Glow | `rgba(200, 147, 58, 0.18)` (warm gold inner glow) |

---

## Revvel Emblem Derivation

| Revvel Emblem Element | Soul2Bowl Value |
|---|---|
| **Topic** | Fusion soul food delivered fresh |
| **User Metaphor** | "Soul in every bowl — crafted just for you" |
| **Casing Material** | Frosted amber-gold glass dome with brass accents |
| **Central Core** | Steaming bowl — rising food steam as a living signature |
| **Adversarial Detail** | None (positive brand — warmth, nourishment, hospitality) |
| **Data Crystal Color** | Warm Gold — `#C8933A` |
| **Data Crystal Represents** | The meal — nourishing, intentional, crafted with care |
| **Functional Icons** | chef hat, bowl, calendar, leaf (eco), map pin (St. Louis), fork |
| **Base Solution Text** | *"Soul in every bowl — St. Louis fusion cuisine"* |
| **Color: Primary Casing** | `#C8933A` — frosted warm gold glass |
| **Color: Adversarial Accent** | `#E25B3A` — flame orange (food energy, heat, passion) |
| **Color: Data Crystal** | `#C8933A` — warm gold hologram glow |
| **Color: Node/Text** | `#F8F0E3` — warm cream on dark glass |

---

## Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| **Display / Hero** | `Playfair Display` | 700 | Elegant, culinary, St. Louis refined feel |
| **Headings** | `Playfair Display` | 600 | Used for H1–H3 |
| **Body** | `Inter` | 400/500 | Clean, readable |
| **Price / Numbers** | `Inter` | 700 | Prominent |
| **Tag Labels** | `Inter` | 600 | Uppercase tracking |

Import: `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');`

---

## Color Palette (Full System)

```css
:root {
  /* Brand */
  --color-primary:        #C8933A;   /* Warm Gold — primary CTA, headings, accents */
  --color-secondary:      #2A7A6F;   /* Deep Teal — secondary actions, eco section */
  --color-accent:         #E25B3A;   /* Flame Orange — heat, passion, special callouts */

  /* Surfaces */
  --color-bg:             #09090F;   /* Deep Obsidian — page background */
  --color-surface:        rgba(255, 255, 255, 0.06);   /* Glass card surface */
  --color-surface-hover:  rgba(255, 255, 255, 0.10);   /* Hovered glass card */
  --color-border:         rgba(255, 255, 255, 0.14);   /* Glass border */
  --color-glow:           rgba(200, 147, 58, 0.18);    /* Warm gold inner glow */

  /* Text */
  --color-text-primary:   #F8F0E3;   /* Warm cream — main text */
  --color-text-secondary: rgba(248, 240, 227, 0.65);  /* Subdued text */
  --color-text-muted:     rgba(248, 240, 227, 0.40);  /* Very subdued */

  /* Status */
  --color-success:        #4ADE80;
  --color-warning:        #FBBF24;
  --color-error:          #F87171;
  --color-info:           #60A5FA;

  /* Glass shadow */
  --shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.10);
  --shadow-glow:  0 0 30px rgba(200, 147, 58, 0.25);

  /* Radii */
  --radius-sm:   8px;
  --radius-md:   16px;
  --radius-lg:   24px;
  --radius-xl:   32px;
  --radius-full: 9999px;
}
```

---

## Glassmorphism Component Pattern

```css
/* Standard glass card */
.glass-card {
  background: var(--color-surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-glass);
}

/* Gold-glow variant (featured items, CTAs) */
.glass-card--gold {
  background: rgba(200, 147, 58, 0.08);
  border-color: rgba(200, 147, 58, 0.30);
  box-shadow: var(--shadow-glass), var(--shadow-glow);
}

/* Teal-glow variant (eco section, sustainability) */
.glass-card--teal {
  background: rgba(42, 122, 111, 0.08);
  border-color: rgba(42, 122, 111, 0.30);
  box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 24px rgba(42,122,111,0.22);
}
```

---

## Asset Delivery Checklist

### Favicon Set
- [ ] favicon-16x16.png
- [ ] favicon-32x32.png
- [ ] favicon-48x48.png
- [ ] favicon.ico (multi-size ICO bundle)

### PWA Icons (Required for "Add to Home Screen")
- [ ] icon-192x192.png
- [ ] icon-512x512.png
- [ ] maskable-icon-192x192.png
- [ ] maskable-icon-512x512.png

### Apple
- [ ] apple-touch-icon-180x180.png
- [ ] apple-touch-icon-167x167.png
- [ ] apple-touch-icon-152x152.png

### Android
- [ ] android-chrome-192x192.png
- [ ] android-chrome-512x512.png

### Social / OG
- [ ] og-image-1200x630.png (glassmorphic bowl hero + Soul2Bowl wordmark)
- [ ] og-image-1200x630.jpg

### Logo Variants
- [ ] logo-full.svg (bowl icon + "Soul2Bowl" wordmark, horizontal)
- [ ] <logo-full@2x.png>
- [ ] <logo-full@3x.png>
- [ ] logo-mark.svg (steaming bowl icon only)
- [ ] logo-mark-192x192.png
- [ ] logo-mark-512x512.png
- [ ] logo-dark.svg (for light backgrounds)
- [ ] logo-light.svg (for dark backgrounds / default)

### Photography Requirements
- [ ] Hero: Steaming bowl overhead shot — 1920×1080px WebP
- [ ] Menu items: each dish — 1080×1080px WebP (square)
- [ ] About hero: chef portrait — 1200×800px WebP
- [ ] Catering gallery: 8–12 event photos — 1200×800px WebP
- [ ] Eco packaging: LIFEMADE bowl product shot — 1080×1080px WebP
- [ ] OG image: branded glassmorphic — 1200×630px PNG

---

## Web Manifest Entry

```json
{
  "name": "Soul2Bowl",
  "short_name": "Soul2Bowl",
  "description": "St. Louis fusion cuisine — soul in every bowl, crafted just for you",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#C8933A",
  "background_color": "#09090F",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## HTML Head Tags (Required in every page)

```html
<!-- Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
<link rel="shortcut icon" href="/icons/favicon.ico">

<!-- Apple -->
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png">
<link rel="apple-touch-icon" sizes="167x167" href="/icons/apple-touch-icon-167x167.png">
<link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Soul2Bowl">

<!-- PWA -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#C8933A">

<!-- Open Graph -->
<meta property="og:title" content="Soul2Bowl — St. Louis Fusion Cuisine, Delivered to Your Door">
<meta property="og:description" content="Order individual meals, weekly meal prep, Sunday dinner, and catering from St. Louis&apos;s premier fusion soul food chef. Eco-friendly bowls. Custom requests welcome.">
<meta property="og:image" content="https://soul2bowl.com/icons/og-image-1200x630.png">
<meta property="og:url" content="https://soul2bowl.com">
<meta property="og:type" content="website">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Soul2Bowl — St. Louis Fusion Cuisine">
<meta name="twitter:description" content="Catering · Meal Prep · Sunday Dinner · St. Louis Native. BBQ fusion, Asian-Hawaiian flare, keto, vegan, gluten-free.">
<meta name="twitter:image" content="https://soul2bowl.com/icons/og-image-1200x630.png">
```

---

## Schema.org JSON-LD (Required in every page `<head>`)

```json
{
  "@context": "https://schema.org",
  "@type": "FoodEstablishment",
  "name": "Soul2Bowl",
  "description": "St. Louis-native fusion cuisine — BBQ, Asian-Hawaiian, Southern soul food. Catering, meal prep, Sunday dinner, and by-the-pound ordering. Eco-friendly LIFEMADE compostable bowls.",
  "url": "https://soul2bowl.com",
  "logo": "https://soul2bowl.com/icons/logo-mark-512x512.png",
  "image": "https://soul2bowl.com/icons/og-image-1200x630.png",
  "servesCuisine": ["Soul Food", "BBQ", "Fusion", "Asian-Hawaiian", "Southern"],
  "hasMenu": "https://soul2bowl.com/menu",
  "priceRange": "$$",
  "areaServed": {
    "@type": "City",
    "name": "St. Louis",
    "addressRegion": "MO"
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "St. Louis",
    "addressRegion": "MO",
    "addressCountry": "US"
  },
  "openingHours": ["Sa 10:00-18:00", "Su 10:00-18:00"],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "url": "https://soul2bowl.com/contact"
  },
  "founder": {
    "@type": "Person",
    "name": "Audrey Evans",
    "sameAs": "https://meetaudreyevans.com"
  },
  "parentOrganization": {
    "@type": "Organization",
    "name": "Freedom Angel Corp",
    "legalName": "Freedom Angel Corp",
    "taxID": "86-1209156"
  }
}
```
