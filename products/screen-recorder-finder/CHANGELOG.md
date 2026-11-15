# Changelog

## 2026-11-11 — MarketShipper — hostname is screen-recorder-finder.oaudrey.com

- Audrey chose the oaudrey.com subdomain. `products/screen-recorder-finder/.do/app.yaml`, `.env.example`, and `deploy/README.md` name `https://screen-recorder-finder.oaudrey.com`. DNS for that name is Cloudflare. `deploy_on_push` stays false. No DigitalOcean deploy job was added. The earlier bullet below was edited so the previous host string does not remain; that wording is in git history.

## 2026-11-11

- MarketShipper — WR #18332. Added an active Dockerfile and compose service under the commented 2026-11-10 blocks, a `/health` response of 200, a pricing-page Stripe checkout button, and runtime Checkout Session plus webhook verification using `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID` (test mode by default). Added `products/screen-recorder-finder/.do/app.yaml` for `screen-recorder-finder.oaudrey.com` with health and alert rules, and CircleCI jobs that build the image and request `/health`. No live URL, DNS change, or real charge.
