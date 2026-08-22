# Revvel CLI Engine

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/cli-engine/)**

## What It Is

Revvel CLI Engine is a ship-to-market product providing a glassmorphic terminal UI for:

- **Pipeline execution** — queue, run, and monitor automation tasks from a CLI interface
- **PDF report export** — generate polished branded reports with one command
- **User auth + admin panel** — role-based access control and pipeline management dashboard
- **Stripe checkout** — subscription billing (Starter / Pro / Enterprise)
- **API & MCP bridge** — expose pipelines via REST API or Model Context Protocol for AI agents

## Repository Value

- **Revenue path:** SaaS subscriptions starting at $29/mo
- **Target users:** Developer teams automating data pipelines, report generation, and AI agent workflows
- **Projected MRR at 100 customers:** $5,000–$9,900/mo
- **Strategic fit:** Directly advances the $10k/month Phase 1 goal by selling developer tooling with recurring revenue

## Quick Start

```bash
cd products/cli-engine
npm install
npm run dev
```

Runs at: `http://localhost:3008`

## Included UI Surfaces

- Glassmorphic hero with live terminal simulation
- Floating PDF export card overlay
- Feature grid (6 capability cards)
- Ship-to-market execution plan
- Pricing tiers (Starter / Pro / Enterprise)
- "Run & Export" prominent CTA block
- Developer waitlist capture form with early-access incentive
- SEO metadata (title, description, OpenGraph, keywords)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server at `http://localhost:3008` |
| `npm run build` | Production build |
| `npm run start` | Serve production build on port 3008 |
| `npm run lint` | Run ESLint |

## Deployment

Deploy to **Vercel** as a standard Next.js app.

- **Root Directory:** `products/cli-engine`
- **Framework:** Next.js (auto-detected)

See [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) and [`GO_TO_MARKET.md`](./GO_TO_MARKET.md) for full details.

## Related

- [`products/LAUNCH_SUMMARY.md`](../LAUNCH_SUMMARY.md) — all product ports and launch status
- [`docs/AGENTS.md`](../../AGENTS.md) — agent and port routing table
