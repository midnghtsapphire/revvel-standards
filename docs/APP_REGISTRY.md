# App Registry

Live index of products / apps under `products/`. Each entry links to its README and states its status against the $10k→$10M plan.

| App        | Path                     | Status  | Monetization                              | Phase target |
|------------|--------------------------|---------|-------------------------------------------|--------------|
| PrintBank  | `products/printbank/`    | v0 live | Etsy + direct sales; POLAR.SH premium PNG | Phase 1 ($10k/mo) |

## PrintBank

- 144 true-vector (SVG) printable wall art prints, deterministically generated across 8 genres.
- Client-side "Your Photos" workbench: grades user photos against 24 standard print sizes by effective DPI after center-crop; exports print-ready PNGs at 300/150 DPI; blocks exports below 150 DPI.
- Zero build step; deploys as a static Vercel site.
- Monetization roadmap: free tier (SVG + 150 DPI PNG); POLAR.SH-gated premium (300 DPI, bulk bundle, commercial license).
- Tests: `tests/printbank.test.js` (11 assertions on catalog, DPI math, crop math, grading, and generator determinism).
