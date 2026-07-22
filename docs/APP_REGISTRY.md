# App Registry

Authoritative list of apps in this monorepo. New apps must be appended here.

| App | Path | Type | Status | Monetization | Notes |
|-----|------|------|--------|--------------|-------|
| PrintBank | `products/printbank/` | Static SPA (no build) | Live | Polar.sh (planned) — free single downloads, premium bulk export | 144 true-vector prints + client-side photo print sizer |

## Adding an app

1. Create `products/<slug>/` with a `README.md` and a `public/` (or build output) directory.
2. Add tests under `tests/<slug>.test.js` runnable with `node`.
3. Add a Vercel/Netlify config if it is a deployable web app.
4. Append a row to the table above.
