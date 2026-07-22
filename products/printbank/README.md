# PrintBank

True-vector printable wall art app. 144 SVG designs across 8 genres (abstract-geometric, minimalist-lines, botanical-vector, celestial, boho-arch, mid-century, wave-topo, typography). Every print is real vector — one download prints losslessly at any size from 4×6″ to A0.

## Differentiators

1. **True vector** — no rasterized "HD" JPEG bundles. SVG plus a client-side PNG exporter that renders the exact pixel count for 300 or 150 DPI at any of 24 standard sizes.
2. **Your Photos → Print Sizer** — drop your own photo, get an effective-DPI grade against every standard size (with auto-rotation for landscape/portrait mismatch) and export a correctly-cropped, correctly-sized print-ready PNG. Everything runs in-browser; no uploads.

## Structure

- `public/print-engine.js` — deterministic seeded engine (SIZES, generators, DPI/crop/grade math). UMD; works in browser and Node.
- `public/index.html` / `app.js` / `styles.css` — static SPA.
- `vercel.json` — zero-build static deploy.

## Monetization roadmap

Free tier: SVG + 150 DPI PNG.
Premium (POLAR.SH checkout gate): 300 DPI PNG bundle + commercial license + full 144-print archive as one ZIP.

## Tests

`npm test -- tests/printbank.test.js`
