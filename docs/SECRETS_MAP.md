# Secrets Map

**Names and locations only — never values.**

This map lists secret **names**, where they are expected to live, and which
workflows / products consume them. Regenerate or extend this file whenever a
WR introduces a new credential. Do not paste tokens, passwords, or PEMs here.

| Secret name | Where it lives | Consumers | Notes / fallback |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | GitHub Actions secret; local `.env` | triage, research, agent fallback | Funded OpenRouter account required even for `:free` models |
| `GITHUB_TOKEN` | GitHub Actions default | most workflows | Does **not** re-trigger workflows; use app token / PAT for that |
| `AGENT_PR_TOKEN` | GitHub Actions secret | agent-authored PRs | Fine-scoped PAT or GitHub App installation token |
| `LINEAR_API_KEY` | GitHub Actions / Vercel env / n8n Header Auth | `products/linear-api-sync`, `scripts/linear-api-sync.js`, `workflows/n8n/linear-github-commit-sync.json` | Linear personal API key sent as `Authorization` header |
| `LINEAR_DONE_STATE_ID` | Vercel env / n8n env | Linear sync product + n8n workflow | Optional workflow state UUID for Done; omit → comment-only mode |
| `GITHUB_WEBHOOK_SECRET` | Vercel env | `POST /api/github-commit-receiver` | Optional shared secret (`Authorization` or `x-linear-sync-secret`) |
| `STRIPE_API_KEY` | GitHub / Vercel | billing products | See `docs/bom/SECRETS_BOM.md` |
| `POLAR_ACCESS_TOKEN` | GitHub / Vercel | Polar.sh funding surfaces | Optional per-product checkout URLs may be public |

## Linear API Sync (WR-16444)

| Name | Required for | Minting path (UI) |
| --- | --- | --- |
| `LINEAR_API_KEY` | Live GraphQL mutations | Linear → avatar → **Settings** → **API** → **Create key** |
| `LINEAR_DONE_STATE_ID` | Moving issues to Done | Linear → **Settings** → **Workflow** → open Done state → copy state id |
| `GITHUB_WEBHOOK_SECRET` | Authenticating inbound GitHub/n8n webhooks | Generate locally (`openssl rand -hex 32`); store in Vercel + webhook config |

Related files:

- `products/linear-api-sync/.env.example`
- `products/linear-api-sync/README.md`
- `workflows/n8n/linear-github-commit-sync.json`
- `scripts/linear-api-sync.js`
- `docs/bom/SECRETS_BOM.md` (broader BOM)
- `docs/LOCAL_CREDENTIAL_AGENT.md` (already lists `LINEAR_API_KEY`)

## Rules

1. **Never commit values** — only names, locations, and rotation owners.
2. Prefer GitHub Actions secrets + Vercel project env as the write path.
3. If a secret disappears, open a `[SECRET-MISSING]` issue rather than embedding a replacement value in git.
4. When adding a secret, update this file in the same PR.
