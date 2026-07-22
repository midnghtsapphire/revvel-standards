# PrintBank

Printable wall art app with true vector (SVG) prints and a photo print sizer.

## Features

- **Vector Print Bank**: 144 procedurally-generated SVG prints across 8 genres. One download prints losslessly at any size (4×6″ to A0).
- **Your Photos Sizer**: Drop in your photo, get a grade table showing effective DPI at 24 standard print sizes. Export correctly-sized print-ready PNGs client-side.
- **Zero dependencies**: Static single-page app, no build step.
- **Deterministic**: Seeded generator — no `Math.random`, no `Date`. Same catalog every deploy.

## Monetization Roadmap

- Free tier: browse, single-print SVG download, low-DPI preview export.
- Premium (POLAR.SH checkout gate): full 144-print bundle ZIP, 300 DPI photo exports, commercial license.
- Target: $10k/month via Phase 1 of the $10M roadmap.

## Print Size Catalog

2:3 (4×6, 8×12, 16×24, 24×36), 3:4 (6×8, 12×16, 18×24), 4:5 (8×10, 16×20), 5:7 (5×7, 10×14), 11×14, squares (5×5, 8×8, 12×12, 20×20), ISO A-series (A6–A0).

## Quality Grades (effective DPI after center-crop)

- **gallery**: ≥ 300 DPI
- **excellent**: 240–299
- **good**: 180–239
- **acceptable**: 150–179
- **low**: < 150 (export blocked)

## Deploy

```bash
cd products/printbank
vercel --prod
```

Static files only — see `vercel.json`.

## Test

```bash
node tests/printbank.test.js
```
