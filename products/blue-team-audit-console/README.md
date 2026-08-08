# Blue Team Audit Console

Production SaaS console for **defensive blue-team review of agent traces**, compatible with the [greenfield-ui-public / Redlogs](https://github.com/Zanger67/greenfield-ui-public) audit model (`schema_version` 2).

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/blue-team-audit-console/)**

> If the monorepo static host path is not yet wired for this product, run locally on port **3012** (see Quick Start). Health probe: `GET /api/health`.

## What It Is

Agents leave long, hard-to-review trails of bash calls, file edits, and tool use. Upstream pipelines (separate from this app) can turn those trails into **one-commit-per-event** git histories plus JSONL sidecars. This console is the **blue-team** surface for that data:

- Step through a **timeline** of events (commits)
- **Flag** suspicious steps and attach **notes**
- Organize work into **threads**, **semantic areas**, and **user groups**
- Export a greenfield-compatible audit bundle (`AI_AUDIT.md`, `manifest.json`, `items/*.jsonl`)
- Sign-in with role-based access (auditor / lead / viewer)

**Explicitly out of scope:** red-team tooling, exploit frameworks, penetration testing, vulnerability scanners, or any offensive capabilities.

## Features

| Area | Capability |
| --- | --- |
| Auth | Session cookies (HMAC-signed), demo SaaS accounts, viewer is read-only |
| Timeline | Search, kind filters, flagged-only, suspects/deterministic-flags |
| Overlay | Flags, notes, visited coverage, dismissals, user groups + tags |
| Export | Markdown digest + JSON model + full file bundle (schema v2) |
| API | `/api/health`, `/api/auth/*`, `/api/traces`, `/api/audit/export`, `/api/activity` |
| Ops | Structured JSON logs (secrets redacted), request IDs, health checks |
| UX | Responsive layout, keyboard-friendly controls, sticky top bar |

## Greenfield compatibility

Aligned with [Zanger67/greenfield-ui-public](https://github.com/Zanger67/greenfield-ui-public):

- `target_key` scheme: `commit:<event_id>`, `thread:<id>`, `area:<id>`, …
- Export artifacts: `AI_AUDIT.md`, `manifest.json`, `items/commits.jsonl`, `groups/user_groups.jsonl`, `status/coverage.json`
- Deterministic flag chips + suspicion scores are **display-only** heuristics, not verdicts

Demo traces ship in-process so the app runs without mounting an external `public/data/<trace>/` tree. Point a future adapter at real processed-trace folders without changing the UI contract.

## Quick Start

```bash
cd products/blue-team-audit-console
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

### Demo logins

| Email | Password | Role |
| --- | --- | --- |
| `auditor@revvel.local` | `auditor-demo-1` | auditor (read/write) |
| `lead@revvel.local` | `lead-demo-12` | lead (read/write) |
| `viewer@revvel.local` | `viewer-demo1` | viewer (read-only) |

Set `BT_SESSION_SECRET` (or `SESSION_SECRET`) in production.

## API sketch

- `GET /api/health` — liveness / readiness JSON
- `POST /api/auth/login` `{ email, password }` → sets `bt_session` cookie
- `GET /api/auth/session` — current user
- `POST /api/auth/logout`
- `GET /api/traces` — list demo/processed traces
- `GET /api/traces/:id` — trace + overlay + stats
- `POST /api/traces/:id` — `{ action: flag|note|visit|dismiss|create_group|tag, ... }`
- `POST /api/audit/export` — `{ trace, format: markdown|json|bundle }`
- `GET /api/activity` — recent auditor actions (lead/auditor)

## Validation

```bash
npm test       # domain + auth + validation
npm run lint   # tsc --noEmit
npm run build  # next build
```

## Deploy path

- Framework: Next.js (App Router)
- `vercel.json` included (`framework: nextjs`)
- Default port: **3012**
- Health check path: `/api/health`

## Monetization / SEO keywords

blue team audit console, agent trace review, AI audit export, greenfield UI, redlogs alternative, commit timeline auditor, defensive agent observability, SaaS audit workspace

## License

Part of the `revvel-standards` monorepo.
