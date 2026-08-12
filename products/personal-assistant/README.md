# Revvel Personal Assistant

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/personal-assistant/)**

> After the first Vercel deploy from `products/personal-assistant`, confirm the URL above resolves. Until then, run locally on port **3012**.

## What It Is

**Revvel Personal Assistant** is a shippable Next.js SaaS that turns fragmented personal data — Gmail, Outlook, Yahoo Mail, Google Keep, Google Drive dumps, SMS/text exports, and plain notes — into **PII-safe, structured GitHub directory plans**.

It implements the WR-16432 architecture without requiring a live OAuth mesh on day one:

1. **IngestAgent** — normalize multi-source fragments
2. **PrivacyAgent** — redact emails, phones, and @handles
3. **TriageAgent** — classify into action items, docs, research, meetings, finance, code, personal
4. **StructureAgent** — map categories to repository paths
5. **CommitPlanAgent** — emit directory tree, markdown/CSV exports, and PR steps

The core `runPipeline()` path is **fully offline** (no `OPENROUTER_API_KEY` required), so demos and CI stay green. Optional Polar checkout powers Assistant Pro upgrades.

## Features

- Multi-source fragment editor (Gmail / Outlook / Yahoo / Keep / Drive / SMS / Notes / Other)
- Live multi-agent classification as you type
- PII redaction before export (emails, phones, handles)
- GitHub owner / repo / branch targeting
- Directory tree + ordered commit/PR plan
- Markdown brief + CSV file inventory downloads
- `GET` / `POST /api/plan` for automations and n8n/CrewAI bridges
- Sample corpus that exercises every major category

## Quick Start

```bash
cd products/personal-assistant
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

## Runtime Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_POLAR_CHECKOUT_URL` | Optional | Polar checkout URL for Assistant Pro. Falls back to a contact mailto when unset. |
| `OPENROUTER_API_KEY` | Optional | Reserved for future LLM enrichment. Core pipeline does not call the network. |

```bash
cp .env.example .env.local
```

## Plan API

```bash
# Sample plan
curl -s http://localhost:3012/api/plan | head

# Custom fragments
curl -s -X POST http://localhost:3012/api/plan \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "midnghtsapphire",
    "repoName": "personal-knowledge-base",
    "defaultBranch": "main",
    "fragments": [
      {
        "source": "gmail",
        "title": "Follow up",
        "body": "Action item: please review the PR by Friday. Contact ops@example.com"
      }
    ]
  }'
```

Response includes `summary`, `fragments`, `files`, `directoryTree`, `commitPlan`, `markdownExport`, and `csvExport`.

## Repository Value

- **Revenue path:** SaaS (Free playground → Assistant Pro via Polar)
- **Target users:** founder-operators drowning in multi-inbox notes who already live in GitHub
- **Strategic fit:** productizes the automated product pipeline + personal OSINT-adjacent knowledge capture inside revvel-standards
- **Keywords:** personal assistant github, multi agent inbox to repo, gmail keep drive to markdown, pii redaction knowledge base

## Related

- Issue: [WR #16432](https://github.com/midnghtsapphire/revvel-standards/issues/16432)
- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)
- [`GO_TO_MARKET.md`](./GO_TO_MARKET.md)
- [`docs/APP_REGISTRY.md`](../../docs/APP_REGISTRY.md)
