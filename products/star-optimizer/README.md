# Star Optimizer

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/star-optimizer/)**

Interactive SaaS for prioritizing starred GitHub repositories using the same
weighted scoring model as the monorepo automation script.

## Local preview

Deploy this package on Vercel (project root = `products/star-optimizer`).

Local preview:

```bash
cd products/star-optimizer
npm install
npm run dev
```

Open [http://localhost:3012](http://localhost:3012).

## Features

- Weighted priority score: push recency, release recency, log stars, starred age
- Paste GraphQL/export JSON or load built-in demo fixtures
- Ranked table + Markdown export
- Numerically aligned with `scripts/prioritize_stars.py`

## Validation

```bash
npm test
npm run lint
npm run build
```

## Related automation

- Script: `scripts/prioritize_stars.py`
- Workflow: `.github/workflows/prioritize-stars.yml`
- Agent rules: `standards/AGENTS_STAR_OPTIMIZER.md`
- Docs: `docs/STAR_OPTIMIZER.md`
- Secret name (required for `.github/workflows/prioritize-stars.yml`; optional for demo mode): `GH_PAT` — see `docs/SECRETS_MAP.md`

## Monetization path

Freemium SaaS for developers who star heavily:

1. Free: fixture/demo scoring + Markdown export for pasted JSON
2. Pro: scheduled private ranking, multi-account PAT support, Slack/email digests
3. Team: shared triage boards for eng managers reviewing OSS adoption

## Deploy path

1. Import the monorepo into Vercel (or create a project).
2. Set **Root Directory** to `products/star-optimizer`.
3. Build command `npm run build`, output `.next` (see `vercel.json`).
4. No secrets required for demo mode.
