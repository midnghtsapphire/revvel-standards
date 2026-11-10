<!-- 2026-11-10 Codex: previous container/GitHub deployment instructions retained as history.
# ai-video-toolkit container deployment

Build context is the repository root. The image builds the existing Next.js
static export and serves it using unprivileged nginx on port 8080.

From this product directory:

```sh
docker compose up --build -d
curl --fail http://localhost:8080/
curl --fail http://localhost:8080/health
docker compose down
```

Health returns a JSON artifact shipped in the export. Missing health artifacts
return 503; unknown application routes return 404 instead of a misleading 200.

## DigitalOcean

After authenticating doctl against the intended account:

```sh
doctl apps create --spec deploy/app.yaml
```

For an existing app, update its spec with `doctl apps update APP_ID --spec
deploy/app.yaml`; do not create a duplicate. This provisions a paid service.
The spec requests deployment/domain failure alerts; select and verify alert
recipients in the App Platform dashboard. A spec alone is not evidence an alert
was delivered.

Verify the generated ondigitalocean.app URL first. Add
`ai-video-toolkit.revvel.co` as a custom domain in App Platform, then copy the DNS
records DigitalOcean provides to the existing authoritative DNS provider.
Changing the entire domain's nameservers is unnecessary and could interrupt
other services. Wait for TLS issuance and verify both the home page and
`https://ai-video-toolkit.revvel.co/health` with curl before claiming deployment.

The image has no billing secrets and adds no payment entitlement. Stripe/Lago
checkout, webhook processing, pricing, production DNS and live account access
remain separate acceptance checks. Do not mark WR deployment complete from a
successful container build alone.

Reference: [DigitalOcean app spec](https://docs.digitalocean.com/products/app-platform/reference/app-spec/).

-->

# Independent static product deployment

Run `npm run build` inside the product, then from the repository root:

```sh
node templates/cicd/deploy-static.mjs ai-video-toolkit ../ai-video-toolkit-release.mjs
node ../ai-video-toolkit-release.mjs
```

The generated single-file public artifact runs on Node 22+ or Bun with `PORT`
(default 8080). It contains only this product's `out/` export, including home,
pricing, health and immutable JavaScript/CSS assets. No private repository files,
GitHub dependency, Docker base image, workflow runner or model calls are needed.
Use a new filename for each release; packaging refuses to overwrite an artifact.

This extends the local build/upload pattern in `templates/cicd/deploy.sh`. Copy
the generated artifact using its existing SCP/SSH method and start it with Node
or PM2 on an authenticated host. For Railway, deploy the same source as a Bun
function using the connected API; no source repository linkage is needed.

Configure `NEXT_PUBLIC_STRIPE_CHECKOUT_URL` **before building**, using a Stripe
Payment Link with the agreed $99 monthly price and fulfilled subscription. Only
HTTPS buy.stripe.com / checkout.stripe.com URLs are accepted. A missing/invalid
link disables paid checkout; it does not enable free paid access. Never put a
Stripe secret key in this public variable. Changing a link requires a rebuild.

Smoke-test `/`, `/pricing`, `/health`, one `_next/static/` JS asset and an unknown
route (must return 404) against the actual deployed URL. Confirm the subscription
and test payment in Stripe before marking WR #18333 complete. DigitalOcean
credentials may be configured in GitHub secrets but are not readable locally;
local SSH authentication to the documented droplet currently fails. No live
deployment, payment fulfillment or billing webhook is established by this build.
