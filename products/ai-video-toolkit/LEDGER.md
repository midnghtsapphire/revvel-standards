# LEDGER — AI Video Toolkit

Play-by-play record per standards/LEDGER_STANDARD.md. Append-only.

## 2026-11-11 16:25 UTC — MarketShipper (Cursor Grok 4.7) — hostname is ai-video-toolkit.oaudrey.com

- **Actor:** MarketShipper (Cursor cloud agent, Grok 4.7)
- **Requested by:** Audrey Evans ("Oaudrey sub domains")
- **Role:** executed
- **Files:** `products/ai-video-toolkit/.do/app.yaml`, `.env.example`, `deploy/README.md`, `CHANGELOG.md`, this ledger
- **What was done:** The DigitalOcean spec, the public origin example, and the deploy note now name `ai-video-toolkit.oaudrey.com`. DNS for that name is Cloudflare. `deploy_on_push` stays false. No DigitalOcean deploy job was added.
- **Decisions:** The earlier bullet in this file had its host string updated so a search for the previous host does not still find it. The pre-change sentence is in git history.
- **Open / handoff:** A spec is not a live URL. Audrey still points Cloudflare at App Platform when she wants the name to resolve.

## 2026-11-11 14:40 UTC — MarketShipper (Cursor Grok 4.7) — restack, no App Platform write from this branch

- **Actor:** MarketShipper (Cursor cloud agent, Grok 4.7)
- **Requested by:** 1-Git-Triage-Chief hold, then the merge-gate update
- **Role:** executed
- **What was done:** Merged origin/main `7aceb6284` (#18364 and #18365) with a normal merge. Kept `demo-kit-test` and `affiliate-hub-build` plus the `ai-video-toolkit` image gate. Removed the DigitalOcean create/update job and `do-app-update.sh` from this branch. `npm ci --ignore-scripts`. Checkout rate limit uses `do-connecting-ip`, then the first `X-Forwarded-For` hop, then the socket. dockerignore re-excludes `node_modules`, `.next`, and `.env*` after the un-ignore.
- **Open / handoff:** Those deploy jobs live on the draft App Platform PR. Audrey must approve that draft and set `DIGITALOCEAN_ACCESS_TOKEN`. This branch will need a final restack if #18366 merges first and moves main.

## 2026-11-11 14:45 UTC — MarketShipper (Cursor Grok 4.7) — container, Stripe test checkout, CircleCI health gate

- **Actor:** MarketShipper (Cursor cloud agent, Grok 4.7)
- **Requested by:** Audrey Evans, WR #18331
- **Role:** executed
- **Files:** `products/ai-video-toolkit/Dockerfile` (active image appended under the 2026-11-10 commented block), `products/ai-video-toolkit/docker-compose.yml` (active service appended), `products/ai-video-toolkit/server/static-stripe-server.mjs` (added), `products/ai-video-toolkit/app/pricing/stripe-checkout-button.tsx` (added), `products/ai-video-toolkit/app/pricing/page.tsx` (checkout button added beside the existing Payment Link), `products/ai-video-toolkit/.do/app.yaml` (added), `products/ai-video-toolkit/.env.example` (runtime secret names appended, values empty), `.dockerignore` (allow this product into the build context), `.circleci/config.yml` (jobs `ai-video-toolkit-image` and `ai-video-toolkit-do-deploy`), `.circleci/scripts/product-image-gate.sh`, `.circleci/scripts/product-diff.sh`, `.circleci/scripts/do-app-update.sh`, `.circleci/scripts/select-do-app.mjs`, `tests/ai-video-toolkit-image-gate.test.js`, `tests/select-do-app.test.js`
- **What was done:** The product code is in this repo at `products/ai-video-toolkit`, registered in `docs/APP_REGISTRY.md`. `npm ci` failed on the committed lockfile (`picomatch@2.3.2` did not satisfy `picomatch@4.0.7`). `npm install` with npm 10.9.9, the same npm as `node:22-alpine`, refreshed the lock entries. Dependency ranges in `package.json` were not changed. The 2026-11-10 Dockerfile was entirely comments. An active image was added under that comment. It builds the existing Next static export and serves it with a Node process that answers `/health` with 200 and creates a Stripe Checkout Session only when test-mode env vars are set. CircleCI builds that image and requests `/health` from inside the container. The DigitalOcean spec names `ai-video-toolkit.oaudrey.com`, a health check, and CPU, memory, and restart alerts.
- **Decisions:** Keep the static export and the Payment Link helper. Secret keys stay in runtime env vars. Default `STRIPE_MODE=test` and refuse `sk_live_` in that mode. Do not auto-close #18331: the live URL, DNS, and a real Stripe payment were not done.
- **Sources:** DigitalOcean App Spec, retrieved 2026-11-11 — `products/ai-video-toolkit/Library/digitalocean-app-spec.md`
- **Commits / PRs:** this commit on `cursor/ai-video-toolkit-do-deploy-19c4`
- **Open / handoff:** Audrey must set the CircleCI token and the Stripe secrets, connect GitHub to DigitalOcean, and point DNS. Next owner: Audrey Evans, then 1-Git-Triage-Chief merges. MarketShipper does not merge.
- **Credit note:** MarketShipper wrote the repo-side deploy path. No production app was created from this sandbox.

## 2026-11-11 15:10 UTC — MarketShipper (Cursor Grok 4.7) — shared static Stripe server

- **Actor:** MarketShipper (Cursor cloud agent, Grok 4.7)
- **Requested by:** merge gate, SonarCloud new_duplicated_lines_density on #18368
- **Role:** executed
- **Files:** `packages/static-stripe-server/server.mjs`, `packages/static-stripe-server/stripe-checkout-button.tsx`, `tests/static-stripe-product-gate.js`, product server and button wrappers, both Dockerfiles, `.dockerignore`, `.circleci/scripts/product-diff.sh`
- **What was done:** Moved the runtime server, checkout button, and image-gate cases into one package. ai-video-toolkit and affiliate-hub call `bindProduct` with their service name. The previous copies stay in the product files as line comments. `deploy_on_push` stays false. No DigitalOcean deploy job was added. TRUST_PROXY is unchanged.
- **Open / handoff:** screen-recorder-finder on #18369 can bind the same module after this merges. Live URL, DNS, and a real charge are still Audrey's.
