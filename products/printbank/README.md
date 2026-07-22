# PrintBank

True-vector printable wall art app + photo print sizer.

## What it is

- **The Bank** — 144 deterministic SVG prints across 8 genres (abstract-geo, botanical, minimalist-line, boho-sun, topographic, celestial, typography, mid-century). One SVG download prints losslessly at any size, 4×6″ to A0.
- **Your Photos** — drag-and-drop workbench that grades your photograph against 24 standard print sizes by effective DPI after center-crop (with auto-rotation), and exports print-ready PNGs at 300 DPI entirely client-side. Blocks export below 150 DPI.
- **Size Guide** — pixel dimensions for every supported size at 300 and 150 DPI.

## Why it exists

Modeled on top-selling Etsy "entire shop bundle" wall-art listings, differentiated by:

1. **True vector.** Every print in the bank is SVG. Buyers get one file that scales from a greeting card to A0 without pixelation.
2. **A photo sizer that actually helps.** Most Etsy shops sell 20+ size variants of the same JPEG — buyers frequently print at a size the source pixels can't support. The Your-Photos tool tells you what you *can* print and hands you the file.

## Deploy

Static site — `vercel deploy` from this directory. No build step, no dependencies.

## Monetization roadmap

- **Free tier:** browse the bank, download any single SVG, use the photo sizer (grading + 150 DPI drafts).
- **Premium tier ($):** unlock full-catalog ZIP + 300 DPI photo exports via **POLAR.SH** checkout gate.
- Roadmap: recurring catalog drops (deterministic seeds → reproducible), print-on-demand fulfilment via Printful/Gelato API, affiliate frames.

All rendering runs in the browser. No photos are uploaded.

## Tests

```bash
node --test tests/printbank.test.js
```
