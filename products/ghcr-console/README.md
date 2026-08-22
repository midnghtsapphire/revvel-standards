# GHCR Console

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/ghcr-console/)**

## What It Is

Shippable setup console for **WR #17695** — *setup GitHub Container Registry*.

It answers **yes/no** for repo-side GHCR wiring, builds `ghcr.io/…` image references, and walks the owner through package visibility + optional private-pull token steps that cannot be completed from a PR alone.

**GHCR** ([GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)) hosts OCI images at `ghcr.io` with GitHub identity.

## Features

- Direct **YES / NO** wiring answer for `midnghtsapphire/revvel-standards`
- Machine-aligned surface checklist (workflow, Dockerfiles, docs, tests, registries)
- Image reference builder (`pull` / `run` / login-via-stdin)
- Owner setup checklist with deep links (Actions, Packages UI, token settings)
- CLI/CI copy-paste for `scripts/ghcr-setup.js` and Actions dispatch
- SEO keywords targeting GHCR / ghcr.io / Docker publish / packages write

## Default image

```text
ghcr.io/midnghtsapphire/revvel-standards/ghcr-console:latest
```

## Local Development

```bash
cd products/ghcr-console
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

Default port: **3012**

## Docker (local)

```bash
# from product directory
docker build -t ghcr-console:local .
docker run --rm -p 3012:3012 ghcr-console:local

# from monorepo root (ship-to-market context)
docker build -t ghcr-console:root -f Dockerfile .
```

## Validation

```bash
# product
npm test && npm run lint && npm run build

# monorepo gates (from repo root)
node scripts/ghcr-setup.js
npm test
npm run workflows:validate
```

## Related

- Setup runbook: [`docs/GHCR_SETUP.md`](../../docs/GHCR_SETUP.md)
- Auditor: [`scripts/ghcr-setup.js`](../../scripts/ghcr-setup.js)
- Publish workflow: [`.github/workflows/ghcr-publish.yml`](../../.github/workflows/ghcr-publish.yml)
- Status workflow: [`.github/workflows/ghcr-setup-status.yml`](../../.github/workflows/ghcr-setup-status.yml)
- Secrets map names: `docs/SECRETS_MAP.md` → `GHCR_READ_TOKEN` (optional)

## Deploy

Hub static page ships via root Vercel (`scripts/build-static.sh` → `/docs/ghcr-console/`).

Container deploy path: Actions **GHCR publish** → `ghcr.io/midnghtsapphire/revvel-standards/ghcr-console`.

Optional dedicated Vercel project for the Next.js app:

```bash
cd products/ghcr-console
npx vercel --prod
```
