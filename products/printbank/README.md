# PrintBank

Printable wall art app with true vector (SVG) prints and a photo print sizer.

## Features

- **144 vector prints** across 8 genres — one download prints losslessly at any size (4×6″ to A0)
- **Your Photos print sizer** — grades your photography against 24 standard print sizes by effective DPI after crop
- **Client-side export** — print-ready PNGs generated in-browser at 300 or 150 DPI
- **Zero build step** — static HTML/JS/CSS, deploys to Vercel/Netlify/GitHub Pages

## Monetization (Roadmap)

Premium exports (300 DPI, commercial license, bundle downloads) gated behind [Polar.sh](https://polar.sh) checkout.

Target: **$10k/month** via Etsy-style bundle listings + Polar subscription tier.

## Structure

```text
products/printbank/
├── public/
│   ├── index.html       # SPA entry
│   ├── app.js           # UI controller
│   ├── print-engine.js  # size catalog, DPI math, SVG generator (UMD)
│   └── styles.css
└── vercel.json          # static deploy
```

## Local Development

```bash
cd products/printbank/public
python3 -m http.server 8080
# open http://localhost:8080
```

## Testing

```bash
node tests/printbank.test.js
```

## Print Size Catalog

24 standard sizes across five aspect ratios:

- **2:3** — 4×6, 8×12, 12×18, 16×24, 20×30, 24×36
- **3:4** — 6×8, 9×12, 12×16, 18×24
- **4:5** — 8×10, 11×14, 16×20, 20×25
- **5:7** — 5×7, 10×14
- **Square** — 8×8, 10×10, 12×12, 20×20
- **ISO A-series** — A4, A3, A2, A1, A0

## Quality Grades

| Grade      | Effective DPI |
|------------|---------------|
| Gallery    | ≥ 300         |
| Excellent  | 240–299       |
| Good       | 180–239       |
| Acceptable | 150–179       |
| Low        | < 150 (export blocked) |
