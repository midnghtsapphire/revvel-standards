# LEDGER — Affiliate Hub

Play-by-play record per standards/LEDGER_STANDARD.md. Append-only.

## 2026-11-11 14:35 UTC — MarketShipper (Cursor Grok 4.7) — restack, no App Platform write from this branch

- **Actor:** MarketShipper (Cursor cloud agent, Grok 4.7)
- **Requested by:** 1-Git-Triage-Chief hold on PR #18366, then Audrey's merge-gate update
- **Role:** executed
- **Files:** `.circleci/config.yml` (image gate kept; `affiliate-hub-do-deploy` removed; `demo-kit-test` and `affiliate-hub-build` from main kept), `.circleci/scripts/do-app-update.sh` (removed from this branch; it moves to a draft PR), `.dockerignore` (re-exclude `node_modules`, `.next`, `.env*` after the un-ignore), `products/affiliate-hub/Dockerfile` (`npm ci --ignore-scripts`), `products/affiliate-hub/server/static-stripe-server.mjs` (client IP for the rate limit; `handle` split), `CHANGELOG.md`, `wr/memory/decisions.jsonl`
- **What was done:** Merged origin/main `7aceb6284` (includes `7b17a654`, PR #18364, and #18365) with a normal merge. No force-push. Checkout rate limiting now prefers `do-connecting-ip`, then the first `X-Forwarded-For` hop, then the socket. A merge of this branch cannot call `doctl`.
- **Decisions:** The deploy job does not belong on a branch that merges to main until Audrey approves it. `npm ci --ignore-scripts` is the fix for the SonarCloud Docker finding, matching the `affiliate-hub-build` job already on main.
- **Open / handoff:** Draft PR holds `do-app-update.sh` and the deploy jobs. It stays draft. Audrey must approve it and set `DIGITALOCEAN_ACCESS_TOKEN`.

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

## 2026-11-11 15:10 UTC — MarketShipper (Cursor Grok 4.7) — shared static Stripe server

- **Actor:** MarketShipper (Cursor cloud agent, Grok 4.7)
- **Requested by:** merge gate, SonarCloud new_duplicated_lines_density on #18368
- **Role:** executed
- **Files:** `packages/static-stripe-server/`, `products/affiliate-hub/server/static-stripe-server.mjs`, `products/affiliate-hub/app/pricing/stripe-checkout-button.tsx`, `products/affiliate-hub/Dockerfile`
- **What was done:** Affiliate Hub now starts `packages/static-stripe-server` with service name `affiliate-hub`. The previous server and button stay in those files as line comments. `deploy_on_push` stays false.
- **Open / handoff:** This edit is on the ai-video-toolkit branch so the two copies stop duplicating. #18330's live URL is still not done.
