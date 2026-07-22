# App Registry

A lightweight registry of shippable apps/products in this monorepo.

| App | Path | Deploy | Status | Monetization |
|-----|------|--------|--------|--------------|
| PrintBank | `products/printbank/` | Vercel (static) | Live | POLAR.SH gate on 300 DPI + commercial license |

## PrintBank

- **What:** 144 true-vector printable wall art designs + a client-side "Your Photos" print sizer that grades user photos across 24 standard sizes by effective DPI and exports print-ready PNGs.
- **Why here:** Feeds the automated product pipeline; POLAR.SH checkout gate on premium exports is the planned funding hook (Phase 1 → $10k/month).
- **Tests:** `tests/printbank.test.js`
- **Deploy:** `products/printbank/vercel.json` — zero build, static output from `public/`.
