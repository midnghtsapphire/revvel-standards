# PrintBank

Printable wall art app with true vector (SVG) prints and photo sizing tools.

## Features

- **True Vector Prints**: Every print is SVG — download once, print losslessly at any size from 4×6″ to A0.
- **Your Photos Sizer**: Upload your photography and grade it against 24 standard print sizes by effective DPI after crop.
- **Client-side Export**: Print-ready PNGs generated in-browser at 150/300 DPI.
- **8 Genres**: 144 deterministically-generated prints across botanical, geometric, abstract, minimal, celestial, typographic, landscape, and mandala styles.

## Architecture

- `public/print-engine.js` — Core engine (UMD; runs in browser + Node). Size catalog, DPI math, crop math, quality grading, seeded SVG generator.
- `public/index.html`, `app.js`, `styles.css` — Static SPA. Zero build step.
- `vercel.json` — Static deploy config.

## Monetization Roadmap

- Free: browse + preview + 150 DPI export.
- Premium (POLAR.SH checkout gate): 300 DPI export, batch download, commercial license.

## Tests

```bash
node tests/printbank.test.js
```
