# App Registry

Products + apps live in `products/`. Each app ships with its own README, static or Vercel deploy config, and tests under `tests/<appname>.test.js`.

## Registered apps

| App | Path | Deploy | Monetization | Status |
|-----|------|--------|--------------|--------|
| PrintBank | `products/printbank/` | Static (Vercel) | Polar.sh checkout gate on 300 DPI + bundle exports (roadmap) | Live |

## PrintBank

True-vector printable wall art (144 designs across 8 genres) + client-side photo print sizer that grades user photos against 24 standard sizes and exports print-ready PNGs at 300/150 DPI.

- Engine: `products/printbank/public/print-engine.js` (UMD, browser + Node)
- UI: `products/printbank/public/{index.html,app.js,styles.css}`
- Tests: `tests/printbank.test.js` (11 tests)
- Deploy: `products/printbank/vercel.json` (static, no build step)

## Adding a new app

1. `products/<name>/` with a README describing the differentiator and monetization hook.
2. Ship tests at `tests/<name>.test.js` using `node:test`.
3. Register the app in this file with path, deploy target, and monetization plan.
4. Prefer zero-build, static-first, deterministic where possible.
