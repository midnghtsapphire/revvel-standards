# PrintBank

144 printable wall-art designs — every one is **true vector (SVG)**, so a single
download prints losslessly at any size from 4×6″ to A0. Plus a **Your Photos**
workbench that grades your photography against 24 standard print sizes by
effective DPI and exports print-ready PNGs entirely client-side.

## Run locally

```bash
cd products/printbank/public
python3 -m http.server 8080
# open http://localhost:8080
```

No build step, no dependencies.

## Deploy

```bash
cd products/printbank
vercel deploy --prod
```

## Monetization roadmap (POLAR.SH)

- Free: any single SVG download, 150 DPI PNG, single-photo grading
- Premium ($19 one-time, Polar.sh checkout): bulk export all 144 prints as SVG +
  300 DPI PNG at every standard size, commercial-use license
- Pro ($9/mo, Polar.sh recurring): monthly drop of 24 new designs

## Tests

```bash
node tests/printbank.test.js
```
