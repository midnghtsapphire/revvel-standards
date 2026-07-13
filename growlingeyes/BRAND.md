# Brand Identity — GrowlingEyes

> Filled from `templates/brand/BRAND_IDENTITY_TEMPLATE.md`
> Revvel Emblem derivation based on actual GrowlingEyes design decisions.

---

## Basic Identity

| Field | Value |
|---|---|
| Project Name | GrowlingEyes |
| Tagline | The more we find out, the more our eyes narrow into a digital growl |
| Domain | `growlingeyes.com` — registered at Namecheap |
| Parent Entity | Freedom Angel Corp (EIN: 86-1209156) |
| Brand Colors | Primary: `#0D9488` (Teal) · Secondary: `#DC2626` (Red) · Accent: `#F59E0B` (Gold) · Background: `#F8FAFC` (Off-White) |

---

## Revvel Emblem Derivation

| Revvel Emblem Element | GrowlingEyes Value |
|---|---|
| **Topic** | Knowledge discovery vs. information obscuration |
| **User Metaphor** | "The more we find out, the more our eyes narrow into a digital growl" |
| **Casing Material** | Frosted teal glass dome with burnished brass/gold frame |
| **Central Core** | Human iris — high-resolution organic eye texture |
| **Adversarial Detail** | Defensive fangs at the lower casing — the "growl" made physical |
| **Data Crystal Color** | Gold — `#F59E0B` |
| **Data Crystal Represents** | Uncovered truth — the knowledge the system produces |
| **Functional Icons** | megaphone, bar chart, avatar+, microchip, lock, globe |
| **Base Solution Text** | "Access Denied: Unveiling Solutions" |
| **Color: Primary Casing** | `#0D9488` — frosted teal glass |
| **Color: Adversarial Accent** | `#DC2626` — red fang outlines and intensity points |
| **Color: Data Crystal** | `#F59E0B` — gold hologram glow |
| **Color: Node/Text** | `#F8FAFC` — softly lit white on teal glass |

---

## Asset Delivery Checklist

### Favicon Set
- [ ] favicon-16x16.png
- [ ] favicon-32x32.png
- [ ] favicon-48x48.png
- [ ] favicon.ico

### PWA Icons
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
- [ ] og-image-1200x630.png
- [ ] og-image-1200x630.jpg

### Logo Variants
- [ ] logo-full.svg
- [ ] logo-mark.svg
- [ ] logo-dark.svg
- [ ] logo-light.svg

---

## Web Manifest Entry

```json
{
  "name": "GrowlingEyes",
  "short_name": "GrowlingEyes",
  "description": "The more we find out, the more our eyes narrow into a digital growl",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0D9488",
  "background_color": "#F8FAFC",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
