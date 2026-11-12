# Deploy the oAudrey front page

The page is `products/oaudrey-home/public/`. The image serves it with the shared
static server on port 8080. `/health` returns JSON `{ "status": "ok", "service": "oaudrey-home" }`.

From the repository root:

```sh
docker build -f products/oaudrey-home/Dockerfile -t oaudrey-home .
docker run --rm -d --name oaudrey-home -p 8080:8080 oaudrey-home
curl --fail http://127.0.0.1:8080/health
curl --fail http://127.0.0.1:8080/
curl --fail http://127.0.0.1:8080/pricing
docker rm -f oaudrey-home
```

App Platform spec: `products/oaudrey-home/.do/app.yaml`. It names `oaudrey.com`
and `www.oaudrey.com`, with `deploy_on_push: false`. Creating the app needs a
DigitalOcean token. This branch does not add a DigitalOcean deploy job.

DNS for those names is Cloudflare. Copy the records App Platform prints into
the Cloudflare zone. Do not move the zone to DigitalOcean nameservers.

`oaudrey/.do/app.yaml` also names the same apex. Applying both specs would
register the names on two apps. Audrey chooses which spec to apply.

A green image build is not a live URL.
