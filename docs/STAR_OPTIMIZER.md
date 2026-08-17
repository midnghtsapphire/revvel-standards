# Star Optimizer

Automated prioritization of starred GitHub repositories, plus a SaaS UI for
interactive ranking and Markdown export.

Closes the production path for WR **#16903**.

## What it does

1. Pulls starred repositories in bulk via the GitHub **GraphQL** API.
2. Scores each repo with a weighted formula (push recency, release recency,
   logarithmic star popularity, and how recently you starred it).
3. Checkpoints progress in `stars_state.json` so partial runs resume cleanly.
4. Writes `PRIORITIZED_STARS.md` and `prioritized_stars.json`.
5. Commits refreshed artifacts from a manual GitHub Action run after resuming from its saved checkpoint.

## Components

| Path | Role |
| --- | --- |
| `scripts/prioritize_stars.py` | Production prioritization script |
| `.github/workflows/prioritize-stars.yml` | Manual workflow runner for the checkpointed script |
| `products/star-optimizer/` | Next.js SaaS app (interactive scoring) |
| `standards/AGENTS_STAR_OPTIMIZER.md` | Agent execution rules |

## Local usage (script)

```bash
# Offline fixture check (no token, no network)
python scripts/prioritize_stars.py --self-test

# Score built-in fixtures and write reports in the cwd
python scripts/prioritize_stars.py --fixture

# Live run (needs GH_PAT or your own personal token in GITHUB_TOKEN)
export GH_PAT=ghp_your_token_here
pip install httpx==0.28.1
python scripts/prioritize_stars.py --limit 250
```

## SaaS app

```bash
cd products/star-optimizer
npm install
npm run dev          # http://localhost:3012
npm test
npm run build
```

Deploy path: Vercel project pointed at `products/star-optimizer`
(see `products/star-optimizer/vercel.json` and README).

## Secrets

| Name | Required | Purpose |
| --- | --- | --- |
| `GH_PAT` | Required in `.github/workflows/prioritize-stars.yml`; recommended locally | Fine-grained PAT for the account whose stars you want to rank |
| `GITHUB_TOKEN` | Optional for local runs only | Personal token env var name accepted by the script outside GitHub Actions |

Names only — see [`docs/SECRETS_MAP.md`](./SECRETS_MAP.md).

## Reliability checklist

1. GraphQL bulk pages (50 repos + nested fields) instead of REST fan-out.
2. Workflow `concurrency` group cancels overlapping runs.
3. HTTP 403/429 → `Retry-After` or exponential backoff; state is saved on stop.
4. Auto-commit message includes `[skip ci]` to prevent recursive workflow loops.
5. `--self-test` keeps the scoring formula regression-safe without secrets.
