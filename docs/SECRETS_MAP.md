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
Catalog of **secret names** used by automation and products in this repository.
Never commit values. Add names here when a workflow or app introduces a new
secret; rotate values only in GitHub Settings → Secrets and variables → Actions
(or the relevant host).

## Repository Actions secrets

| Secret name | Used by | Purpose | Required |
| --- | --- | --- | --- |
| `GH_PAT` | `.github/workflows/prioritize-stars.yml`, `scripts/prioritize_stars.py` | Fine-grained Personal Access Token for reading the starring user's starred repositories (5,000 req/hr budget). Fallback is the job `GITHUB_TOKEN`. | Recommended for Star Optimizer |
| `GITHUB_TOKEN` | Provided automatically by GitHub Actions | Default job token; used as fallback when `GH_PAT` is unset | Automatic |
| `OPENROUTER_API_KEY` | OpenRouter triage / research workflows | Model routing via OpenRouter | When AI lanes are enabled |
| `AGENT_PR_TOKEN` | Agent-authored PR workflows | App/PAT token that can trigger downstream checks (default `GITHUB_TOKEN` does not) | When agent PR automation is enabled |

## Product env vars (local / Vercel)

| Name | Product | Purpose | Required |
| --- | --- | --- | --- |
| `GH_PAT` | `products/star-optimizer` (optional live fetch) | Server-side GraphQL star fetch if enabled | Optional — demo mode works without it |
| `OPENROUTER_API_KEY` | Several AI products | LLM completions | Per product README |

## Adding a secret

1. GitHub → repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Name must match this map exactly (case-sensitive).
3. Document the name (not the value) in this file and the relevant product/workflow docs.
4. Prefer least privilege: Star Optimizer only needs read access to the starring user's stars / public metadata.
