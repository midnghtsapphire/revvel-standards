# LEDGER — oAudrey front page

Play-by-play record per standards/LEDGER_STANDARD.md. Append-only.

## 2026-11-11 16:40 UTC — MarketShipper (Cursor Grok 4.7) — front page and product hosts

- **Actor:** MarketShipper (Cursor cloud agent, Grok 4.7)
- **Requested by:** Audrey Evans ("Oaudrey sub domains" and "Make sure first page rocks with some autonomous agents.")
- **Role:** executed
- **Files:** `products/oaudrey-home/`, `.circleci/config.yml`, `.dockerignore`, `packages/static-stripe-server/server.mjs`, the three product specs
- **What was done:** Added a static front page with a visible agent loop, a METAL versus agentic section, three product cards, and the GOAP console and deck. The container answers `/health` through the shared server. The spec names `oaudrey.com` and `www.oaudrey.com` with `deploy_on_push: false`. The three product hostnames are the oaudrey.com subdomains. DNS notes say Cloudflare.
- **Decisions:** Reuse `packages/static-stripe-server` so the new process is not a second copy of the server. The page does not set Stripe secrets and does not show a buy button. The `/pricing` path exists because the shared image gate requests it, and the page says it is the image check.
- **Open / handoff:** `oaudrey/.do/app.yaml` still names the same apex with `deploy_on_push: true`. Audrey chooses which spec to apply and which Cloudflare records to publish. A spec is not a live URL.

## 2026-11-11 16:50 UTC — MarketShipper (Cursor Grok 4.7) — GitCandyland feed

- **Actor:** MarketShipper (Cursor cloud agent, Grok 4.7)
- **Requested by:** Audrey Evans
- **Role:** executed
- **What was done:** `GET /api/team` and `GET /api/hub` read GitHub with `GITHUB_READ_TOKEN`. Quotes are copied from check output, review text, or a commit subject. GitHub Actions is `skipped (billing)` and is not a failure. The world defaults to the GitCandyland skin. GitAloha is the other skin. The theme song links out. A local mp3 plays only after a click, and only if Audrey adds the file. Missing token shows the closed state. No live numbers were invented.
- **Decisions:** Discussion threads use the GraphQL endpoint because REST does not list them. `showBodies` ships false.
