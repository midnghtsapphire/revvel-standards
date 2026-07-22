# App Registry

Canonical list of shipped apps in this monorepo. Each app is deploy-ready and either monetized or on a monetization roadmap.

| App | Path | Status | Monetization |
|-----|------|--------|--------------|
| PrintBank | `products/printbank/` | shipped (static) | Polar.sh premium unlock ($9/mo) — PNG export gate |

## PrintBank

- **What:** Printable wall art app. 144 true-vector (SVG) prints across 8 genres; one download prints losslessly at any size from 4×6″ to A0.
- **Differentiator:** Client-side "Your Photos" print sizer — grades user photography against 24 standard print sizes by effective DPI after center-crop, exports print-ready PNGs entirely in-browser (nothing uploaded).
- **Stack:** Static SPA. Zero dependencies. Zero build step. `vercel.json` deploys `public/`.
- **Monetization:** Free tier browses gallery + grades photos. Polar.sh checkout unlocks 300 DPI PNG exports and entire-bank ZIP. Enterprise tier ($49/mo) adds commercial license.
- **Tests:** `tests/printbank.test.js` (11 tests, deterministic).
