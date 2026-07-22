# App Registry

Central index of apps and products in this repo.

| App | Path | Status | Monetization | Notes |
|-----|------|--------|--------------|-------|
| PrintBank | `products/printbank/` | live | Polar.sh (premium exports, planned) | 144 vector prints + photo print sizer, client-side only |

## Adding an app

1. Create `products/<name>/` with `README.md` + `public/` (if static) or appropriate entry.
2. Add a regression test in `tests/<name>.test.js`.
3. Append a row to this table.
4. If deploying to Vercel, include `products/<name>/vercel.json`.

## Monetization hooks

- **Polar.sh** — GitHub-native funding + product checkout. See [polar.sh](https://polar.sh).
- **Etsy** — bundle listings link back to the product page for upsell.
- **Direct** — Stripe Payment Links for one-off exports.
