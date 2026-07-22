# PrintBank

Printable wall art app with true-vector (SVG) prints and a client-side photo print sizer.

## Features

- **144 vector prints** across 8 genres (abstract, geometric, botanical, minimal, typographic, celestial, coastal, cottagecore)
- **Any-size printing** — one SVG download prints losslessly from 4×6" to A0
- **Your Photos sizer** — grades user photos against 24 standard print sizes by effective DPI after crop; exports print-ready PNGs entirely client-side
- **Zero dependencies** — static single-page app, no build step

## Print Size Catalog

Standard aspect ratios: 2:3, 3:4, 4:5, 5:7, 11×14, 1:1 (square), ISO A-series (A0–A6).

## DPI Grading

| Grade | Effective DPI | Use |
|-------|---------------|-----|
| gallery | ≥ 300 | fine-art / close viewing |
| excellent | 240–299 | premium prints |
| good | 180–239 | standard wall art |
| acceptable | 150–179 | large prints, arm's length+ |
| low | < 150 | **blocked from export** |

## Monetization Roadmap (POLAR.SH)

- Free: browse gallery, download watermarked SVG previews, grade own photos
- Premium ($9/mo via Polar checkout): unlimited SVG downloads, 300 DPI PNG exports, entire-bank ZIP
- Enterprise ($49/mo): commercial license, bulk export API

Checkout gate hooks into `app.js` `exportPNG()` — Polar webhook flips localStorage entitlement flag.

## Deploy

```bash
vercel --prod products/printbank
```

No build step. `vercel.json` serves `public/` as static.

## Tests

```bash
node tests/printbank.test.js
```
