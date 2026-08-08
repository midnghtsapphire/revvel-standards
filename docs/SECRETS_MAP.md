# Secrets Map

Secret **names only** — never commit values. Used by orchestration automation,
n8n bridges, and the structural auto-heal workflow.

| Secret name | Required by | Purpose | Where to set |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | triage, research, optional LLM heal lanes | OpenRouter chat completions | GitHub Actions secrets / local `.env` |
| `GITHUB_TOKEN` | all workflows (built-in) | Checkout, PR comments, default API | Provided by Actions |
| `ADMIN_GITHUB_TOKEN` | self-heal / cascade workflows | PAT that can trigger downstream workflows | GitHub Actions secrets |
| `AGENT_PR_TOKEN` | agent-authored PRs | App installation token / fine-scoped PAT so CI starts on bot PRs | GitHub Actions secrets |
| `N8N_WEBHOOK_URL` | optional n8n bridges | Callback base for external orchestration | GitHub Actions secrets / n8n env |
| `GOOGLE_OAUTH_CLIENT_ID` | n8n Google OAuth2 credential | Gmail/Drive/Docs OAuth client id | n8n credentials store |
| `GOOGLE_OAUTH_CLIENT_SECRET` | n8n Google OAuth2 credential | Gmail/Drive/Docs OAuth client secret | n8n credentials store |
| `MICROSOFT_OAUTH_CLIENT_ID` | n8n Microsoft OAuth2 credential | Outlook/OneDrive app id | n8n credentials store |
| `MICROSOFT_OAUTH_CLIENT_SECRET` | n8n Microsoft OAuth2 credential | Outlook/OneDrive app secret | n8n credentials store |
| `YAHOO_OAUTH_CLIENT_ID` | n8n Yahoo OAuth2 credential | Yahoo Mail developer app id | n8n credentials store |
| `YAHOO_OAUTH_CLIENT_SECRET` | n8n Yahoo OAuth2 credential | Yahoo Mail developer app secret | n8n credentials store |

## Rules

1. Pass secrets on **stdin** or via env — never as CLI argv (`ps` / `/proc` leak).
2. Document new names here when a workflow or product first needs them.
3. Prefer optional secrets with a keyless fallback lane (see `scripts/openrouter-triage.js`).

See also: `docs/bom/SECRETS_BOM.md` (broader product BOM), `docs/n8n/OAUTH_PROVIDERS.md`.
