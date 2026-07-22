# Brand Identity — [PROJECT_NAME]

> Fill in every field marked [PLACEHOLDER] before your first design session.
> Derive all Revvel Emblem values from `REVVEL_EMBLEM_STANDARD.md`.
> Commit the filled version to `docs/[project-name]/BRAND.md` in revvel-standards.

---

## Basic Identity

| Field | Value |
|---|---|
| Project Name | [PROJECT_NAME] |
| Tagline | [ONE SENTENCE — derived from Revvel Emblem formula topic + metaphor] |
| Domain | [domain.com] — registered at Namecheap |
| Parent Entity | Freedom Angel Corp (EIN: 86-1209156) |
| Brand Colors | Primary: `[HEX]` · Secondary: `[HEX]` · Accent: `[HEX]` · Background: `[HEX]` |

---

## Revvel Emblem Derivation

| Revvel Emblem Element | This Project's Value |
|---|---|
| **Topic** | [What the app does in 5 words] |
| **User Metaphor** | [The feeling or action the user described] |
| **Casing Material** | [e.g., frosted teal glass with gold frame] |
| **Central Core** | [e.g., human iris / water droplet / DNA strand] |
| **Adversarial Detail** | [e.g., fangs / vault bolts / thorns / root system] |
| **Data Crystal Color** | [e.g., gold / electric blue / emerald green] |
| **Data Crystal Represents** | [What the system produces — in one phrase] |
| **Functional Icons** | [List 4–6: e.g., megaphone, bar chart, lock, globe] |
| **Base Solution Text** | [e.g., "Access Denied: Unveiling Solutions"] |
| **Color: Primary Casing** | `[HEX]` — [material: e.g., frosted teal glass] |
| **Color: Adversarial Accent** | `[HEX]` — [material: e.g., red fang outlines] |
| **Color: Data Crystal** | `[HEX]` — [gold hologram glow] |
| **Color: Node/Text** | `[HEX]` — [softly lit on casing glass] |

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
- [ ] maskable-icon-192x192.png (safe-zone padding — 80% of canvas)
- [ ] maskable-icon-512x512.png

### Apple
- [ ] apple-touch-icon-180x180.png
- [ ] apple-touch-icon-167x167.png (iPad Pro)
- [ ] apple-touch-icon-152x152.png (iPad older)

### Android
- [ ] android-chrome-192x192.png
- [ ] android-chrome-512x512.png
- [ ] splash-screen-1024x1024.png (source for all splash sizes)

### Desktop App / Menubar
- [ ] tray-icon-16x16.png (macOS menubar)
- [ ] tray-icon-22x22.png (macOS retina menubar)
- [ ] tray-icon-32x32.png (Windows system tray)
- [ ] tray-icon-256x256.png (Windows high DPI)
- [ ] app-icon-1024x1024.png (macOS .icns source)

### Social / OG
- [ ] og-image-1200x630.png (Open Graph / Twitter Card)
- [ ] og-image-1200x630.jpg (fallback JPEG)

### Logo Variants
- [ ] logo-full.svg (icon + wordmark, horizontal)
- [ ] <logo-full@2x.png>
- [ ] <logo-full@3x.png>
- [ ] logo-mark.svg (icon only)
- [ ] logo-mark-192x192.png
- [ ] logo-mark-512x512.png
- [ ] logo-dark.svg (for light backgrounds)
- [ ] logo-light.svg (for dark backgrounds)

---

## Web Manifest Entry

```json
{
  "name": "[PROJECT_NAME]",
  "short_name": "[SHORT_NAME]",
  "description": "[TAGLINE]",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "[PRIMARY_HEX]",
  "background_color": "[BACKGROUND_HEX]",
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
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="[SHORT_NAME]">

<!-- PWA -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="[PRIMARY_HEX]">

<!-- Open Graph -->
<meta property="og:title" content="[PROJECT_NAME]">
<meta property="og:description" content="[TAGLINE]">
<meta property="og:image" content="https://[domain.com]/icons/og-image-1200x630.png">
<meta property="og:url" content="https://[domain.com]">
<meta property="og:type" content="website">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="[PROJECT_NAME]">
<meta name="twitter:description" content="[TAGLINE]">
<meta name="twitter:image" content="https://[domain.com]/icons/og-image-1200x630.png">
```

---

## Freedom Angel Corp Schema.org (Required in every page `<head>`)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Freedom Angel Corp",
  "legalName": "Freedom Angel Corp",
  "taxID": "86-1209156",
  "url": "https://[domain.com]",
  "logo": "https://[domain.com]/icons/logo-mark-512x512.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "email": "support@[domain.com]"
  }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "[PROJECT_NAME]",
  "description": "[TAGLINE]",
  "url": "https://[domain.com]",
  "applicationCategory": "[PLACEHOLDER — e.g., UtilitiesApplication, BusinessApplication]",
  "operatingSystem": "Web, Android, iOS",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
</script>
```
