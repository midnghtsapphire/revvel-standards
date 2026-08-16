# Agent Manifest Validator

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/agent-manifest-validator/)**

> If that path is not yet wired on the monorepo Vercel project, deploy this folder directly:
>
> ```bash
> cd products/agent-manifest-validator
> npx vercel --prod
> ```

## What It Is

SaaS guardrail for **Revvel agent personas**. Validates manifests against
`schemas/registry_rules.json` before they enter the agent factory pipeline:

- **persona_id** must match `^[a-z0-9-]+-agent$`
- **version** must be SemVer `X.Y.Z`
- **skills** allow-list with a hard ceiling of **5**
- **target_artifact_domains** limited to `meetaudreyevans`, `oaudrey`, `openaudrey`
- **system_constraints** timeout 5–300s + boolean shell access

When validation fails, the UI and API can emit the same markdown **alert cargo**
consumed by the n8n blueprint
`workflows/n8n/defensive-validation-guardrail-alerting.json` (Slack + Discord + email).

**Commercial mode:** SaaS app — free browser/CLI tier; Team ($49/mo) for API +
webhook fan-out; Fleet ($199/mo) for multi-repo CI gates.

---

## Features

- Guided form builder (skills multi-select capped at 5)
- Raw JSON editor with live path-level diagnostics
- Valid / failing sample loaders
- Download validated JSON
- `POST /api/validate` — machine integration
- `GET /api/schema` — public rule summary
- Simulated n8n circuit-breaker alert preview

---

## Quick Start

```bash
cd products/agent-manifest-validator
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

Root monorepo companions:

```bash
# from repo root
node scripts/validate-agent-manifest.js --sample
node scripts/validate-agent-manifest.js path/to/manifest.json
node --test tests/registry-rules.test.js
```

---

## API

### `POST /api/validate`

Body: agent manifest object, or:

```json
{
  "manifest": { "persona_id": "registry-guard-agent", "...": "..." },
  "simulate_alert": true
}
```

- `200` — valid
- `422` — schema violations (errors array + optional `alert_payload`)
- `400` — body is not JSON

### `GET /api/schema`

Returns enum lists, skill ceiling, and pattern summaries.

---

## n8n import (click-by-click)

1. Open your n8n dashboard (local default: <http://localhost:5678>).
2. Click **Workflows** in the left sidebar.
3. Click the **⋯** menu (or **Add workflow**) → **Import from File…**
   (or open any blank canvas and press **Ctrl+V** / **Cmd+V** after copying the JSON).
4. Choose
   `workflows/n8n/defensive-validation-guardrail-alerting.json`
   from this repository.
5. Open **Slack Alert Hub** → set Slack credential + confirm
   `SLACK_LOG_CHANNEL_ID` env var (channel ID, not name).
6. Open **Discord Alert Hub** → set `DISCORD_INCIDENT_WEBHOOK_URL`.
7. Open **Email Provider Dispatch** → attach SMTP credential; optional
   `VALIDATION_ALERT_FROM_EMAIL` / `VALIDATION_ALERT_TO_EMAIL`.
8. Toggle the workflow **Active**.
9. Success looks like: a forced validation failure in the agent factory produces
   one CRITICAL markdown alert in Slack, Discord, and the target inbox within ~30s.

---

## Secrets (names only)

Documented in `docs/bom/SECRETS_BOM.md`:

| Name | Purpose |
|------|---------|
| `SLACK_LOG_CHANNEL_ID` | Slack channel for CRITICAL validation alerts |
| `DISCORD_INCIDENT_WEBHOOK_URL` | Discord incoming webhook URL |
| `VALIDATION_ALERT_FROM_EMAIL` | SMTP From for failure mail |
| `VALIDATION_ALERT_TO_EMAIL` | SMTP To for failure mail |

No secret values are required to run the local SaaS UI or CLI validator.

---

## Deploy path

```bash
cd products/agent-manifest-validator
npm run build
npx vercel --prod
# or monorepo helper:
# npm run deploy:vercel -- --repo=midnghtsapphire/revvel-standards
```

---

## SEO keywords

agent manifest validator, registry_rules.json, skill budget ceiling, revvel
agent factory, n8n validation alert, schema violation circuit breaker,
openaudrey agent persona, oaudrey deployment guardrail
