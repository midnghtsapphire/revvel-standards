# PrintBank

Printable wall art app with true vector (SVG) prints and a photo print-sizer.

## Features

- **144 vector prints** across 8 genres (abstract, botanical, geometric, celestial, minimal, typography, landscape, mandala)
- **Lossless scaling** — one SVG prints cleanly from 4×6″ to A0
- **Photo workbench** — grade your photos against 24 standard print sizes by effective DPI after crop
- **Print-ready PNG export** at 150/300 DPI (client-side, blocked below 150 DPI)
- **Zero dependencies**, static deploy

## Monetization (Roadmap)

- Free tier: browse + low-DPI preview
- Premium ($9.99): unlimited high-DPI exports, entire-bank download bundle
- Checkout via **POLAR.SH** (GitHub-native funding)
- Target: $10k/month by month 6 (see PRIME DIRECTIVE)

## Deploy

```bash
cd products/printbank
vercel deploy public/
```

Or open `public/index.html` directly — no build step.

## Test

```bash
node tests/printbank.test.js
```
