# App Registry

Central registry of apps and products in this monorepo.

| App | Path | Purpose | Monetization |
|---|---|---|---|
| PrintBank | `products/printbank/` | True-vector printable wall art (144 SVG prints across 8 genres) + client-side photo print sizer against 24 standard sizes | POLAR.SH checkout gate on premium 300 DPI / batch exports (planned) |

## Adding an app

1. Create `products/<name>/` with a `README.md` describing purpose and monetization.
2. Add row to the table above.
3. If deployable, include `vercel.json` (or equivalent) at the product root.
4. Add regression tests under `tests/<name>.test.js`.
