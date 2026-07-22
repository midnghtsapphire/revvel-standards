# PrintBank

Printable wall art app with true-vector (SVG) prints and a client-side photo sizer.

## Features

- **True vector prints** — every print is SVG, prints losslessly at any size (4×6″ to A0)
- **Photo sizer** — grades your photos against 24 standard print sizes by effective DPI after crop
- **Client-side export** — PNG export at 300/150 DPI, no server round-trip
- **Deterministic generator** — 144 prints across 8 genres, fully reproducible

## Print sizes

2:3, 3:4, 4:5, 5:7, 11×14, squares, ISO A-series (A0–A6).

## Quality grades

| Grade | Effective DPI |
|-------|---------------|
| Gallery | ≥ 300 |
| Excellent | ≥ 240 |
| Good | ≥ 180 |
| Acceptable | ≥ 150 |
| Low | < 150 (blocked for print export) |

## Deploy

Static site, no build step. `vercel deploy` from this directory.

## Roadmap

- POLAR.SH checkout gate on premium exports (monetization hook)
- Expanded genre catalog
- Multi-print bundles

## Monetization ($10k/month target)

- Free: single-print SVG download, 150 DPI PNG
- Premium ($9 one-time via POLAR.SH): entire bundle (144 prints), 300 DPI exports, photo sizer print-ready export
- Target: 1,100 premium unlocks/month = $10k MRR-equivalent
