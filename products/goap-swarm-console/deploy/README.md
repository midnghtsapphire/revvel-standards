# Deploy agent-as-fte.revvel.co

The page Audrey's buyers would open is the static site in `landing/`, packaged
by `scripts/build-agent-fte-landing.mjs` into `landing-dist/`. The DigitalOcean
spec is `deploy/app.yaml`. It follows the static-site component used in
`oaudrey/.do/app.yaml`.

Build locally, from this product directory, after the PDF exists:

```sh
python3 scripts/build_sales_deck.py
node scripts/build-agent-fte-landing.mjs
python3 -m http.server 8765 -d landing-dist
```

`/` , `/deck.html`, `/health`, and `/goap-agent-sales-deck.pdf` should return
200. `CALENDLY_URL` left unset keeps the booking embed off.

Apply the spec only with a DigitalOcean token Audrey has placed in the
environment. Do not invent one.

```sh
doctl apps spec validate deploy/app.yaml
doctl apps create --spec deploy/app.yaml
```

If an app already exists, update it with `doctl apps update APP_ID --spec
deploy/app.yaml` instead of creating a second one. Copy the DNS records
DigitalOcean shows into Cloudflare DNS for `agent-as-fte.revvel.co`. Leave
`deploy_on_push` false until that name resolves. Set `CALENDLY_URL` in the
App Platform UI to an `https://calendly.com/...` path and rebuild. Stripe is
not part of this page.

<!-- 2026-11-11 MarketShipper: the DNS sentence above previously said Namecheap. Audrey said DNS for her domains is on Cloudflare. -->

The in-app routes `/agent-as-fte` and `/agent-as-fte/deck` remain on the GOAP
Swarm Console. `templates/cicd/deploy-static.mjs` still packages that Next
export. This domain spec is the static site for the hostname in the work request.
