# App Registry

Canonical list of apps/products shipped from this repo.

| App | Path | Status | Deploy | Purpose |
|-----|------|--------|--------|---------|
| PrintBank | `products/printbank/` | live | Vercel (static) | True-vector printable wall-art app + photo print sizer. Monetization: POLAR.SH checkout gate on premium exports. |

## Adding an app

1. Create `products/<slug>/` with a self-contained deploy (static or serverless).
2. Add tests under `tests/<slug>.test.js`.
3. Register the app in the table above with path, status (live/wip/archived), deploy target, and one-line purpose.

## Conventions

- No hardcoded secrets — use `.env` or platform env vars.
- Client-side rendering preferred where possible (no server cost).
- Deterministic generators must not use `Math.random` or `Date.now` — seed everything.
- Every app README documents monetization path aligned to the prime directive ($10k/mo → $10M).
