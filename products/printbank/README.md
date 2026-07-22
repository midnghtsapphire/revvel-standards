# PrintBank

True-vector printable wall art + client-side photo print sizer.

## Differentiators

1. **True vector (SVG)** — every print in the bank is generated as SVG. One download prints losslessly from 4×6″ to A0.
2. **Your Photos print sizer** — drop any photo, get an instant grade across 24 standard print sizes by effective DPI (after center-crop), and export a print-ready PNG at 300 DPI (or 150 DPI minimum). Runs entirely in-browser — no uploads.

## Structure

- `public/print-engine.js` — UMD engine (browser + Node): size catalog, DPI math, crop math, grading, deterministic seeded SVG generator across 8 genres.
- `public/index.html` + `app.js` + `styles.css` — static single-page app.
- `vercel.json` — static deploy, zero build step.

## Roadmap / Monetization

- Free: preview + low-DPI (150) export.
- **Polar.sh checkout gate** on premium 300 DPI exports + bundle downloads (entire-bank ZIP).
- Later: user-uploaded photo bank sync, one-click print-lab fulfillment.

## Tests

```bash
node --test tests/printbank.test.js
```

11 regression tests: size catalog, DPI math, crop math, grading + auto-rotation, generator determinism, valid SVG per genre, catalog reproducibility.
