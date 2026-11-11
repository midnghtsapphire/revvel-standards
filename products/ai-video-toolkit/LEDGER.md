# LEDGER — AI Video Toolkit

Play-by-play record per standards/LEDGER_STANDARD.md. Append-only.

## 2026-11-11 14:45 UTC — MarketShipper (Cursor Grok 4.7) — container, Stripe test checkout, CircleCI health gate

- **Actor:** MarketShipper (Cursor cloud agent, Grok 4.7)
- **Requested by:** Audrey Evans, WR #18331
- **Role:** executed
- **Files:** `products/ai-video-toolkit/Dockerfile` (active image appended under the 2026-11-10 commented block), `products/ai-video-toolkit/docker-compose.yml` (active service appended), `products/ai-video-toolkit/server/static-stripe-server.mjs` (added), `products/ai-video-toolkit/app/pricing/stripe-checkout-button.tsx` (added), `products/ai-video-toolkit/app/pricing/page.tsx` (checkout button added beside the existing Payment Link), `products/ai-video-toolkit/.do/app.yaml` (added), `products/ai-video-toolkit/.env.example` (runtime secret names appended, values empty), `.dockerignore` (allow this product into the build context), `.circleci/config.yml` (jobs `ai-video-toolkit-image` and `ai-video-toolkit-do-deploy`), `.circleci/scripts/product-image-gate.sh`, `.circleci/scripts/product-diff.sh`, `.circleci/scripts/do-app-update.sh`, `.circleci/scripts/select-do-app.mjs`, `tests/ai-video-toolkit-image-gate.test.js`, `tests/select-do-app.test.js`
- **What was done:** The product code is in this repo at `products/ai-video-toolkit`, registered in `docs/APP_REGISTRY.md`. `npm ci` failed on the committed lockfile (`picomatch@2.3.2` did not satisfy `picomatch@4.0.7`). `npm install` with npm 10.9.9, the same npm as `node:22-alpine`, refreshed the lock entries. Dependency ranges in `package.json` were not changed. The 2026-11-10 Dockerfile was entirely comments. An active image was added under that comment. It builds the existing Next static export and serves it with a Node process that answers `/health` with 200 and creates a Stripe Checkout Session only when test-mode env vars are set. CircleCI builds that image and requests `/health` from inside the container. The DigitalOcean spec names `ai-video-toolkit.revvel.co`, a health check, and CPU, memory, and restart alerts.
- **Decisions:** Keep the static export and the Payment Link helper. Secret keys stay in runtime env vars. Default `STRIPE_MODE=test` and refuse `sk_live_` in that mode. Do not auto-close #18331: the live URL, DNS, and a real Stripe payment were not done.
- **Sources:** DigitalOcean App Spec, retrieved 2026-11-11 — `products/ai-video-toolkit/Library/digitalocean-app-spec.md`
- **Commits / PRs:** this commit on `cursor/ai-video-toolkit-do-deploy-19c4`
- **Open / handoff:** Audrey must set the CircleCI token and the Stripe secrets, connect GitHub to DigitalOcean, and point DNS. Next owner: Audrey Evans, then 1-Git-Triage-Chief merges. MarketShipper does not merge.
- **Credit note:** MarketShipper wrote the repo-side deploy path. No production app was created from this sandbox.
