# PrintBank — Printable Wall Art & Photo Print Sizer

## Live Deployment / Test

Preview (this branch, Vercel — verified Ready):
<https://revvel-standards-git-claude-printable-p-88dfed-oaudrey-projects.vercel.app/products/printbank/public/>

The app is a static single-page site (`products/printbank/public/`, no build
step). Open the preview to browse the print bank, download an SVG, export a
sized PNG, and run a photo through the "Your Photos" sizer.

A "print bank" for printable wall art, inspired by the top-selling Etsy
"entire shop / 30,000-print bundle" listings — but built around two honest
advantages those bundles don't have:

1. **True vector prints.** Every design in the bank is generated as SVG, so a
   single download prints losslessly at *any* size — 4×6″ up to A0. No blurry
   upscales, no "which JPG do I use for 18×24?" folder archaeology.
2. **Your own photography, print-ready.** Upload a photo and PrintBank grades
   it against every standard print size by *effective DPI after crop*, then
   exports a correctly-sized, correctly-cropped print file — entirely
   client-side (photos never leave the browser).

## Features

- **Print Bank** — a browsable, searchable catalog across 8 genres
  (Botanical, Bauhaus, Japandi, Line Art, Boho, Mid-Century, Kids & Nursery,
  Typography). Every print is procedurally generated from a deterministic
  seed, so the catalog is reproducible and infinitely extensible.
- **Download at exact size** — SVG (vector) or PNG rendered at the precise
  pixel dimensions for the chosen print size at 300 or 150 DPI.
- **Your Photos** — drag-and-drop a photo, see a quality grade
  (gallery / excellent / good / acceptable / low) for all 24 standard sizes,
  preview the center crop, and export a print-ready PNG. Sizes that would
  fall below 150 DPI are blocked from export.
- **Size Guide** — reference table of standard print sizes (2:3, 3:4, 4:5,
  5:7, 11×14, squares, ISO A-series) with required pixels at 300/150 DPI.

## Architecture

Static, dependency-free, deployable as-is to Vercel/Netlify/GitHub Pages:

```text
products/printbank/
├── public/
│   ├── index.html       # single-page app shell
│   ├── styles.css       # dark marketplace-style UI
│   ├── app.js           # UI wiring (tabs, grid, modal, uploads, exports)
│   └── print-engine.js  # core logic (UMD: browser + Node require)
├── vercel.json          # static deploy, outputDirectory=public
└── README.md
```

`print-engine.js` is the single source of truth for all logic and is
directly `require()`-able from Node — root tests live in
`tests/printbank.test.js`. Everything is deterministic (seeded RNG, no
`Math.random` / `Date`), so generated art and catalog contents are stable
across runs and testable.

## Local development

```bash
cd products/printbank
npx serve public   # or: python3 -m http.server -d public 8080
```

No build step, no dependencies.

## Revenue model (per repo prime directive)

- **Free tier:** browse + watermark-free small-size downloads drive traffic.
- **Bundle:** "entire bank, lifetime access" one-time purchase
  (the exact offer shape that tops the printable-art marketplaces).
- **Photo tools:** print-ready export of your own photography as the
  premium hook; POLAR.SH checkout can gate SVG/300-DPI export.
- **Pipeline:** the deterministic generator means new genre packs are a
  code-only change — the automated product pipeline can ship weekly drops.

## Roadmap

- Genre packs v2 (Art Deco, Coastal, Vintage Poster, Album-style charts).
- POLAR.SH checkout gate on vector + 300 DPI exports.
- Multi-size "instant bundle" ZIP export per design.
- Optional vectorization pass (posterize/trace) for uploaded photos.
