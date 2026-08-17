# Secrets Map

Catalog of **secret names** used by automation and products in this repository.
Never commit values. Add names here when a workflow or app introduces a new
secret; rotate values only in GitHub Settings → Secrets and variables → Actions
(or the relevant host).

## Repository Actions secrets

| Secret name | Used by | Purpose | Required |
| --- | --- | --- | --- |
| `GH_PAT` | `.github/workflows/prioritize-stars.yml`, `scripts/prioritize_stars.py` | Fine-grained Personal Access Token for reading the target user's starred repositories (5,000 req/hr budget). The prioritize-stars workflow now fails fast when this secret is missing instead of falling back to the workflow bot token. | Required for prioritize-stars workflow |
| `GITHUB_TOKEN` | Provided automatically by GitHub Actions | Default job token for repository operations; not suitable for reading the repository owner's starred repositories in prioritize-stars | Automatic |
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
