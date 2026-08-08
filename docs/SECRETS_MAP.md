# Secrets Map

> **Names only. Never commit values.**  
> This map is the human-readable inventory of secret *names* used by the monorepo.
> Prefer `config/connections.yml` as the machine SSOT (`npm run connections`).

## How to use

1. Add or change a secret **name** here and in `config/connections.yml`.
2. Put the real value in GitHub Actions secrets, Vercel env, or local `.env` (gitignored).
3. Reference the name in workflows/apps — never interpolate the value into docs or commits.

## Inventory

| Name | Kind | Used by | Purpose |
| --- | --- | --- | --- |
| `NEON_API_KEY` | secret | `neon-branch.yml`, `products/neon-control-console` | Neon HTTP API + Actions create/delete branch |
| `NEON_PROJECT_ID` | variable (preferred) / optional env | `neon-branch.yml` (`vars.`), `products/neon-control-console` | Target Neon project for preview branches |
| `NEON_API_HOST` | optional env | `products/neon-control-console` (tests/stubs) | Override API base URL |

## Neon click-path (no values)

1. Neon Console → profile → **Account settings** → **API keys** → create key → store as `NEON_API_KEY`.
2. Open a project → copy project id → store as GitHub Actions **variable** `NEON_PROJECT_ID` (and optional app env).
3. Success: Control Console badge shows **LIVE API**; Actions preview workflow can create `preview/pr-N-…` branches.

## Related

- `config/connections.yml` → `id: neon`
- `products/neon-control-console/.env.example`
- `.github/workflows/neon-branch.yml`
