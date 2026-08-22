# GitHub Container Registry (GHCR) setup

**WR:** [#17695](https://github.com/midnghtsapphire/revvel-standards/issues/17695)  
**Product:** [`products/ghcr-console`](../products/ghcr-console)  
**Auditor:** `node scripts/ghcr-setup.js` (exit 0 = fully wired)  
**Publish workflow:** [`.github/workflows/ghcr-publish.yml`](../.github/workflows/ghcr-publish.yml)

Intro blog: [Introducing GitHub Container Registry](https://github.blog/news-insights/product-news/introducing-github-container-registry/)  
Docs: [Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

## Live test page

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/ghcr-console/)**

## What “wired” means here

Repo-side GHCR is **wired** when all of these exist and pass `scripts/ghcr-setup.js`:

| Surface | Path |
| --- | --- |
| Publish workflow with `packages: write` | `.github/workflows/ghcr-publish.yml` |
| Product Dockerfile + HEALTHCHECK | `products/ghcr-console/Dockerfile` |
| Root Dockerfile (ship-to-market docker channel) | `Dockerfile` |
| Status product UI | `products/ghcr-console` |
| This runbook | `docs/GHCR_SETUP.md` |
| Live docs page | `docs/ghcr-console/index.html` |
| Root tests | `tests/ghcr-setup.test.js` |
| Secret **names** documented | `docs/SECRETS_MAP.md` (`GHCR_READ_TOKEN`) |
| Port + registry entries | `AGENTS.md`, `docs/APP_REGISTRY.md`, `docs/app-deployments.yml` |
| Docker standard mentions GHCR | `standards/DOCKER.md` |

## Default image

```text
ghcr.io/midnghtsapphire/revvel-standards/ghcr-console:latest
ghcr.io/midnghtsapphire/revvel-standards/ghcr-console:sha-<12-char-sha>
```

GHCR requires **lowercase** names. The publish workflow lowercases owner/repo automatically.

## Auth model (no surprise secrets)

| Action | Credential | Where |
| --- | --- | --- |
| Push from Actions in this repo | Job `GITHUB_TOKEN` + `permissions.packages: write` | Workflow only — automatic |
| Pull **public** package | None | Anywhere |
| Pull **private** package on another host | `GHCR_READ_TOKEN` (name only) | Deploy host env / that host’s secret store |

Never put a token on the command line (`docker login … -p $TOKEN` leaks via `ps`). Prefer:

```bash
echo "$GHCR_READ_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## Click-by-click owner steps

### 1) Confirm Actions can write packages

1. Open [repo Settings → Actions → General](https://github.com/midnghtsapphire/revvel-standards/settings/actions).
2. Scroll to **Workflow permissions**.
3. Choose **Read and write permissions** (or leave read-only if every job that publishes sets `permissions.packages: write` — our `ghcr-publish.yml` does).
4. Click **Save**.
5. Success looks like: the setting sticks after reload; no red banner.

### 2) Publish an image

**Option A — merge this PR to `main`** (paths filter includes the product + workflow).

**Option B — manual:**

1. Open [Actions → GHCR publish](https://github.com/midnghtsapphire/revvel-standards/actions/workflows/ghcr-publish.yml).
2. Click **Run workflow**.
3. Branch: `main`.
4. Optional: set `tag_suffix` (e.g. `demo`).
5. Optional: check `dry_run` to build without push.
6. Click green **Run workflow**.
7. Success looks like: job green; summary shows `ghcr.io/…/ghcr-console:sha-…` and (on main) `:latest`.

### 3) Set package visibility

1. After the first successful push, open [Packages → ghcr-console](https://github.com/midnghtsapphire/revvel-standards/pkgs/container/ghcr-console)  
   (or GitHub profile/org → **Packages**).
2. Click **Package settings** (right sidebar).
3. **Change visibility** → Public (anonymous pull) or keep Private.
4. Confirm.
5. Success looks like: visibility badge updates; public packages pull without login.

### 4) Link package to this repository (if needed)

1. Same Package settings page.
2. **Manage Actions access** / **Repository source** → connect `midnghtsapphire/revvel-standards`.
3. Success looks like: package page shows the repo link.  
   OCI labels in the Dockerfile (`org.opencontainers.image.source`) usually auto-link on first push.

### 5) Optional private-pull token

Only if the package is private and another host must pull:

1. GitHub → your avatar → **Settings** → **Developer settings** → **Fine-grained personal access tokens** → **Generate new token**.
2. Resource owner: your user or org.
3. Repository access: this repo (or packages scope as shown).
4. Permissions → **Packages** → **Read**.
5. Generate; copy once.
6. On the **deploy host only**, store as env/secret named exactly `GHCR_READ_TOKEN`.
7. Do **not** commit the value. The name is listed in `docs/SECRETS_MAP.md`.

### 6) Verify pull + run

```bash
# public package — no login
docker pull ghcr.io/midnghtsapphire/revvel-standards/ghcr-console:latest
docker run --rm -p 3012:3012 ghcr.io/midnghtsapphire/revvel-standards/ghcr-console:latest
# open http://localhost:3012
```

Success looks like: pull completes; container healthy; UI loads the YES/NO wiring answer.

## Local development (without Docker)

```bash
cd products/ghcr-console
npm install
npm test
npm run dev    # http://localhost:3012
```

## CLI / CI

```bash
# from repo root — exit 0 only when every surface is present
node scripts/ghcr-setup.js
node scripts/ghcr-setup.js --markdown
node scripts/ghcr-setup.js --image

# Actions → "GHCR setup status" → Run workflow
# optional issue_number=17695 to comment the report
```

## Related

- Product README: [`products/ghcr-console/README.md`](../products/ghcr-console/README.md)
- Docker standard: [`standards/DOCKER.md`](../standards/DOCKER.md)
- Secrets map: [`docs/SECRETS_MAP.md`](./SECRETS_MAP.md)
- Ship-to-market docker channel: `.github/workflows/ship-to-market.yml` (`deliver-docker`) uses root `Dockerfile`
