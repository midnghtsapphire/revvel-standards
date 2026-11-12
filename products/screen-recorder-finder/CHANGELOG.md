# Changelog

## 2026-11-11

- MarketShipper — WR #18332. Added an active Dockerfile and compose service under the commented 2026-11-10 blocks, a `/health` response of 200, a pricing-page Stripe checkout button, and runtime Checkout Session plus webhook verification using `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID` (test mode by default). Added `products/screen-recorder-finder/.do/app.yaml` for `screen-recorder-finder.revvel.co` with health and alert rules, and CircleCI jobs that build the image and request `/health`. No live URL, DNS change, or real charge.
