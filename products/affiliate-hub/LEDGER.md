# LEDGER — Affiliate Hub

Play-by-play record per standards/LEDGER_STANDARD.md. Append-only.

## 2026-11-11 14:30 UTC — MarketShipper (Cursor Grok 4.7) — container, Stripe test checkout, CircleCI health gate

- **Actor:** MarketShipper (Cursor cloud agent, Grok 4.7)
- **Requested by:** Audrey Evans, WR #18330
- **Role:** executed
- **Files:** `products/affiliate-hub/Dockerfile` (active image appended under the 2026-11-10 commented block), `products/affiliate-hub/docker-compose.yml` (active service appended), `products/affiliate-hub/server/static-stripe-server.mjs` (added), `products/affiliate-hub/app/pricing/stripe-checkout-button.tsx` (added), `products/affiliate-hub/app/pricing/page.tsx` (checkout button added beside the existing Payment Link), `products/affiliate-hub/.do/app.yaml` (added), `products/affiliate-hub/.env.example` (runtime secret names appended, values empty), `.dockerignore` (allow this product and `packages/` into the build context), `.circleci/config.yml` (jobs `affiliate-hub-image` and `affiliate-hub-do-deploy`), `.circleci/scripts/product-image-gate.sh`, `.circleci/scripts/product-diff.sh`, `.circleci/scripts/do-app-update.sh`, `.circleci/scripts/select-do-app.mjs`, `tests/affiliate-hub-image-gate.test.js`, `tests/select-do-app.test.js`
- **What was done:** The product code is in this repo at `products/affiliate-hub`, registered in `docs/APP_REGISTRY.md`. The 2026-11-10 Dockerfile was entirely comments, so `docker build` had no instructions. An active image was added under that comment. It builds the existing Next static export and serves it with a Node process that answers `/health` with 200 and creates a Stripe Checkout Session only when test-mode env vars are set. CircleCI builds that image and requests `/health` from inside the container. The DigitalOcean spec names `affiliate-hub.revvel.co`, a health check, and CPU, memory, and restart alerts. `do-app-update.sh` calls `doctl` on main only when `DIGITALOCEAN_ACCESS_TOKEN` is set.
- **Decisions:** Keep the static export and the Payment Link helper. A second server holds the secret keys because a static file cannot read them at request time, and `NEXT_PUBLIC_*` would publish a secret. Default `STRIPE_MODE=test` and refuse `sk_live_` in that mode. Do not auto-close #18330: the live URL, DNS, and a real Stripe payment were not done.
- **Sources:** DigitalOcean App Spec, retrieved 2026-11-11 — `products/affiliate-hub/Library/digitalocean-app-spec.md`
- **Commits / PRs:** this commit on `cursor/affiliate-hub-do-deploy-19c4`
- **Open / handoff:** Audrey must set the CircleCI token and the Stripe secrets, connect GitHub to DigitalOcean, and point DNS. Next owner: Audrey Evans, then 1-Git-Triage-Chief merges. MarketShipper does not merge.
- **Credit note:** MarketShipper wrote the repo-side deploy path. No production app was created from this sandbox.
