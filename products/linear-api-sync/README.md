# Linear API Sync

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/linear-api-sync/)**

> After the first Vercel deploy of this product path, the URL above is the
> canonical playground. Locally use port **3012**.

## What It Is

**Linear API Sync** is a Next.js SaaS app + webhook receiver that implements the
Agent Factory automation blueprint from WR-16444:

1. Accept a GitHub **push** webhook (or a playground commit message)
2. Extract Linear issue keys (`ENG-105`, `OPS-12`, …)
3. Plan / execute a Linear GraphQL mutation that:
   - moves the issue to a configured **Done** state (optional)
   - posts an “Automated Synchronization Success via Agent Factory Platform” comment
     with the commit URL

It ships three surfaces so you can run the same logic anywhere:

| Surface | Path |
| --- | --- |
| Web playground + APIs | `products/linear-api-sync` (this app) |
| CLI | `scripts/linear-api-sync.js` |
| n8n workflow | `workflows/n8n/linear-github-commit-sync.json` |

**Market context:** engineering teams already pay for Linear + GitHub; the gap is
a drop-in, testable sync lane for agent-healed commits that does not require a
full n8n fleet on day one. Keywords: *Linear GitHub sync*, *commit issue closer*,
*Agent Factory automation*, *n8n Linear GraphQL*, *SaaS eng-ops webhook*.

---

## Features

- **Playground UI** — paste a commit message, preview parsed issue IDs, dry-run the GraphQL plan
- **Webhook receiver** — `POST /api/github-commit-receiver` (path matches the n8n blueprint)
- **Sync API** — `POST /api/sync` for automations and the UI
- **Health API** — `GET /api/health` reports config presence (never secret values)
- **Dry-run by default** — live Linear calls require explicit `live=1` / `dryRun:false` **and** `LINEAR_API_KEY`
- **Optional webhook shared secret** — `GITHUB_WEBHOOK_SECRET` via `Authorization` or `x-linear-sync-secret`
- **CLI parity** — same pure helpers as the app (`lib/sync.js`)
- **Importable n8n JSON** — fixed GraphQL endpoint (`api.linear.app/graphql`), valid node positions

---

## Quick Start

```bash
cd products/linear-api-sync
cp .env.example .env.local
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

CLI (from repo root):

```bash
node scripts/linear-api-sync.js --message "fix: ENG-105 heal CI" --dry-run
```

---

## Runtime Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `LINEAR_API_KEY` | For live mode | Linear personal API key (Authorization header) |
| `LINEAR_DONE_STATE_ID` | Optional | Workflow state UUID for Done; omit → comment-only |
| `GITHUB_WEBHOOK_SECRET` | Optional | Shared secret for the webhook receiver |

Secret **names** are also listed in [`docs/SECRETS_MAP.md`](../../docs/SECRETS_MAP.md).
Never commit values.

### How to mint keys (click-by-click)

1. **Linear API key**
   - Open [https://linear.app](https://linear.app) → your workspace
   - Click your avatar (bottom-left) → **Settings**
   - Under **Account**, open **API**
   - Click **Create key**, copy it once
   - Paste into Vercel/GitHub secret named `LINEAR_API_KEY`
2. **Done state id**
   - Linear → **Settings** → **Workflow**
   - Click the **Done** (or equivalent) state
   - Copy the state id from the URL / API explorer, store as `LINEAR_DONE_STATE_ID`
3. **Webhook secret** (optional)
   - Generate any random string (`openssl rand -hex 32`)
   - Store as `GITHUB_WEBHOOK_SECRET` in the app env
   - In GitHub → repo → **Settings** → **Webhooks** → **Add webhook**, put the same value in your custom header or Authorization

---

## API

### `GET /api/health`

Returns service identity + which secrets are **present** (booleans only).

### `POST /api/sync`

```bash
curl -s -X POST http://localhost:3012/api/sync \
  -H 'Content-Type: application/json' \
  -d '{"message":"fix: ENG-105","author":"bot","dryRun":true}'
```

### `POST /api/github-commit-receiver`

Accepts a GitHub push JSON body. Append `?live=1` to execute Linear mutations when
`LINEAR_API_KEY` is set.

```bash
curl -s -X POST 'http://localhost:3012/api/github-commit-receiver' \
  -H 'Content-Type: application/json' \
  -d '{"head_commit":{"message":"fix: ENG-105","id":"abc","url":"https://example.com/abc","author":{"name":"Ada"}}}'
```

---

## n8n import

1. Open n8n → **Workflows** → **Import from File**
2. Choose `workflows/n8n/linear-github-commit-sync.json`
3. Create **Header Auth** credential: name `Authorization`, value = your Linear API key
4. Set env `LINEAR_DONE_STATE_ID` (or replace the placeholder in the HTTP node)
5. Activate → copy the webhook URL → add it as a GitHub push webhook

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript + shared CommonJS helpers |
| Deploy | Vercel |
| Port | 3012 |
| External API | Linear GraphQL (`https://api.linear.app/graphql`) |

---

## Tests

```bash
# product
cd products/linear-api-sync && npm test

# monorepo regression (from root)
node --test tests/linear-api-sync.test.js
```

---

## Monetization path

Ship as a free ops utility that funnels teams into paid Agent Factory / Polar.sh
automation packs (webhook hosting, multi-workspace Linear tokens, audit log). The
playground is the top-of-funnel demo; live webhook + n8n template are the paid
activation hooks.
