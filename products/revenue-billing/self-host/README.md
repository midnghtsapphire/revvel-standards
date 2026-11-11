# Self-host Lago (free, open source)

Recipe for running [Lago](https://github.com/getlago/lago) from its official
open-source images, for WR #18333. **Nothing here is deployed.** A local trial
on any laptop costs nothing. Running it for real needs a host Audrey has
approved: see [HUMAN-STEPS.md](../HUMAN-STEPS.md).

Official guide: <https://doc.getlago.com/docs/guide/self-hosting/docker>.

## What is pinned

| Image | Tag | Source |
| --- | --- | --- |
| `getlago/api` | `v1.57.0` | Lago release v1.57.0 (2026-11-05) |
| `getlago/front` | `v1.57.0` | same release |
| `getlago/postgres-partman` | `15.0-alpine` | official compose |
| `redis` | `7-alpine` | official compose |
| `ghcr.io/getlago/lago-gotenberg` | `8.39` | official compose (invoice PDFs) |

Lago's docs say to avoid `latest`. Upgrade by bumping both Lago tags together,
reading the release notes first, and re-running the checks below.

## How this differs from the official file

- Every secret is **required** (`${VAR:?required}`). Compose refuses to start with
  a blank one. No vendor default such as an upstream sample password is used.
- `api` and `front` bind to `127.0.0.1`. `db` and `redis` publish no ports.
  Put a TLS reverse proxy that you control in front.
- The optional per-queue workers, S3/GCS, Google SSO and AI settings are left
  out. Add them from the official file if you need them.

## Run it locally (free)

```sh
cd products/revenue-billing/self-host
cp .env.example .env            # .env is git-ignored
# Fill the six blank secrets using the commands in .env.example.
docker compose config -q        # validates; fails if a secret is blank
docker compose up
```

Open <http://localhost>, create the one admin organization, then in
**Developer > API keys** copy the key into your vault. After the organization
exists, set `LAGO_DISABLE_SIGNUP=true` and restart.

## Two different `LAGO_API_URL` values

| Where | Meaning | Example |
| --- | --- | --- |
| `self-host/.env` | The server's own base URL (no path) | `http://localhost:3000` |
| Product backend and `plans/seed-plans.mjs` | The REST base **with** `/api/v1` | `http://localhost:3000/api/v1` |

The names match because Lago and the existing adapter both chose them. Keep
the two environments separate.

## Checks that need no Docker

```sh
node products/revenue-billing/scripts/check-self-host.mjs
npx --yes js-yaml@4.1.0 products/revenue-billing/self-host/docker-compose.yml > /dev/null
```

CircleCI runs both. They verify exact image pins, blank secrets, loopback-only
ports and valid YAML. They do not prove that Lago boots: that needs a real run
on an approved host.
