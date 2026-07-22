# App Registry

Canonical list of apps and tools in this monorepo. Update on every new app.

| App | Path | Purpose | Monetization | Deploy |
|-----|------|---------|--------------|--------|
| PrintBank | `products/printbank/` | Vector printable wall art (144 SVGs) + photo print sizer with 24-size DPI grading | POLAR.SH checkout on premium bundle + high-DPI photo export | Vercel static (see `products/printbank/vercel.json`) |

## Registration Checklist

When adding a new app:

1. Directory under `products/<name>/`.
2. `README.md` with purpose, features, monetization roadmap, deploy command.
3. Regression tests under `tests/<name>.test.js` (or `tests/<name>/`).
4. Deploy config (`vercel.json` / `netlify.toml` / etc.) — no build step preferred.
5. Row added to the table above.
