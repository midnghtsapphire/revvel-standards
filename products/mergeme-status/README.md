# MergeMe.dev Status

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/mergeme-status/)**

## What It Is

Shippable status console for **WR #16824** — *“MERGEME.DEV IS THIS WIRED INTO REVVEL-STANDARDS?”*

It answers **yes/no** for repo-side wiring, lists every required surface, and walks the owner through the marketplace + Slack setup that cannot be completed from a PR alone.

**MergeMe** ([mergeme.dev](https://mergeme.dev)) mirrors GitHub PRs into Slack as one updating card per PR (reviews as threads, mapped @mentions).

## Features

- Direct **YES / NO** wiring answer for `midnghtsapphire/revvel-standards`
- Machine-aligned surface checklist (registry, docs, workflow, tests, product, ports)
- Owner setup checklist with deep links (GitHub Marketplace + mergeme.dev)
- CLI/CI copy-paste for `scripts/mergeme-wiring.js` and Actions dispatch
- SEO keywords targeting MergeMe / Slack PR integration / wiring status

## Local Development

```bash
cd products/mergeme-status
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

Default port: **3012**

## Validation

```bash
# product
npm test && npm run lint && npm run build

# monorepo gates (from repo root)
node scripts/mergeme-wiring.js
npm test
npm run workflows:validate
```

## Related

- Integration runbook: [`docs/MERGEME_INTEGRATION.md`](../../docs/MERGEME_INTEGRATION.md)
- Auditor: [`scripts/mergeme-wiring.js`](../../scripts/mergeme-wiring.js)
- Workflow: [`.github/workflows/mergeme-status.yml`](../../.github/workflows/mergeme-status.yml)
- Connections SSOT: `config/connections.yml` → `id: mergeme`

## Deploy

Hub static page ships via root Vercel (`scripts/build-static.sh` → `/docs/mergeme-status/`).

Optional dedicated Vercel project for the Next.js app:

```bash
cd products/mergeme-status
npx vercel --prod
```
