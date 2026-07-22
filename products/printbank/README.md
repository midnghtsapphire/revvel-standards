# PrintBank

Printable wall art app with true-vector (SVG) prints and a client-side photo print sizer.

## Features

- **True vector prints** — every print is SVG; one download prints losslessly from 4×6″ up to A0.
- **Genres** — 8 curated genres × 18 prints = 144 seed prints, deterministically generated.
- **Your Photos workbench** — drag-and-drop your own photo, get a per-size DPI grade table, export print-ready PNGs at 300/150 DPI (blocked below 150 DPI).
- **Zero build step** — static HTML + JS, deploys to Vercel as-is.

## Monetization (roadmap)

- Free tier: SVG download + 150 DPI PNG export.
- Premium tier (POLAR.SH checkout gate): 300 DPI export, bulk shop-bundle download, commercial license.
- Target: $10k/month via Etsy + direct sales, scaling into the $10M/3yr plan.

## Layout

```
products/printbank/
  public/
    index.html
    app.js
    print-engine.js
    styles.css
  vercel.json
```

## Local dev

Open `public/index.html` in a browser, or serve the `public/` dir with any static server.

## Tests

`node tests/printbank.test.js` — 11 regression tests covering size catalog, DPI math, crop math, grading, and generator determinism.
