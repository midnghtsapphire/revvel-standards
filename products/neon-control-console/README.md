# Neon Control Console

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/neon-control-console/)**

Local full UI (API playground + generators):

```bash
cd products/neon-control-console
npm install
npm run dev   # http://localhost:3012
```

## What It Is

**Neon Control Console** is a Next.js SaaS-style control panel for teams that already have a **Neon API key** and want first-class **neonctl (GitHub CLI)** + **GitHub Actions** wiring next to it.

It ships three surfaces in one app:

1. **Neon API playground** — list projects and branches via the official Neon HTTP API (`NEON_API_KEY` server-side). Without a key, the UI runs in **demo mode** with realistic fixtures so the playground is always click-testable.
2. **neonctl command builder** — generates copy-paste CLI commands (`neonctl projects list`, `branches create/delete`, `connection-string`, …) that authenticate via `NEON_API_KEY` in the environment (never `--api-key` on argv).
3. **GitHub Actions workflow generator** — emits a SHA-pinned PR preview-branch workflow matching this monorepo’s `neon-branch.yml` contract (`vars.NEON_PROJECT_ID` + `secrets.NEON_API_KEY`, fork/Dependabot skipped).

**Market context:** Neon is the default serverless Postgres for modern Next.js/Vercel apps. Preview branches per PR are table-stakes, but most teams either paste fragile YAML by hand or only use the console UI. This app turns the API key you already have into runnable CLI + Actions artifacts in one screen.

---

## Features

- Live / demo mode banner with secret **names** status (configured vs missing) — never values
- Project picker + branch table (click a branch to feed the CLI builder)
- neonctl actions: install, export key env, list projects/branches, create/delete branch, connection string
- PR head-ref → `preview/pr-N-slug` helper (same slug rules as `.github/workflows/neon-branch.yml`)
- GitHub Actions YAML generator with pinned `neondatabase/*` action SHAs
- Ops brief Markdown export
- REST APIs for automation: `/api/status`, `/api/projects`, `/api/branches`, `/api/cli`, `/api/workflow`

---

## Quick Start

```bash
cd products/neon-control-console
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

Copy env template:

```bash
cp .env.example .env.local
# set NEON_API_KEY=… for live mode (optional NEON_PROJECT_ID)
```

---

## Runtime Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `NEON_API_KEY` | For live API | Neon personal/org API key (server-side only) |
| `NEON_PROJECT_ID` | Optional | Default project when listing branches / filling CLI snippets |
| `NEON_API_HOST` | Optional | Override API host (tests / stubs). Default `https://console.neon.tech/api/v2` |

GitHub Actions (already used by this monorepo’s `neon-branch.yml`):

| Name | Kind | Purpose |
| --- | --- | --- |
| `NEON_API_KEY` | repository **secret** | Create/delete preview branches |
| `NEON_PROJECT_ID` | repository **variable** | Target Neon project |

---

## API

### `GET /api/status`

```json
{
  "ok": true,
  "mode": "demo",
  "hasApiKey": false,
  "secrets": { "NEON_API_KEY": "missing", "NEON_PROJECT_ID": "optional-missing" }
}
```

### `GET /api/projects`

Returns `{ mode, projects[] }` from the Neon API or demo fixtures.

### `GET /api/branches?projectId=…`

Returns `{ mode, projectId, branches[] }`.

### `POST /api/cli`

```bash
curl -s http://localhost:3012/api/cli \
  -H 'content-type: application/json' \
  -d '{"action":"create-branch","projectId":"autumn-breeze-12345678","branchName":"preview/pr-1-feat"}'
```

### `POST /api/workflow`

```bash
curl -s http://localhost:3012/api/workflow \
  -H 'content-type: application/json' \
  -d '{"expiryDays":14,"headRef":"feat/auth","prNumber":"99"}'
```

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript + shared CommonJS core (`lib/neon-core.js`) |
| Neon | HTTP API v2 + neonctl command generation |
| Deploy | Vercel (product) + docs hub live page |
| Port | **3012** |

---

## Tests

```bash
# product
npm test

# monorepo root (includes tests/neon-control-console.test.js)
cd ../.. && npm test -- --test-name-pattern='neon-control'
```

---

## Human setup (click-by-click) if live API is empty

1. Open [https://console.neon.tech](https://console.neon.tech) and sign in.
2. Click your **profile avatar** (bottom-left) → **Account settings** → **API keys**.
3. Click **Create new API key**, copy the value once.
4. In this app’s folder, put it in `.env.local` as `NEON_API_KEY=…` (no quotes needed).
5. Optional: open a project → copy the project id from the URL or **Settings** → set `NEON_PROJECT_ID=…`.
6. Restart `npm run dev`. The badge should flip from **DEMO MODE** to **LIVE API**.
7. For GitHub Actions: repo **Settings → Secrets and variables → Actions** → add secret `NEON_API_KEY` and variable `NEON_PROJECT_ID`.

Success looks like: projects table shows your real Neon project names (not `revvel-preview` demo rows).
