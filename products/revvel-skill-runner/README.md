# revvel-skill-runner

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/revvel-skill-runner/)**

## Structure

- `research/` — market & competitive research
- `decision/` — go/no-go decision artifacts
- `build/` — Next.js application source
- `certify/` — QA, accessibility, security certification
- `deploy/` — deployment manifests
- `monetize/` — pricing, Polar.sh integration, paywalls
- `market/` — marketing assets & campaigns
- `sales/` — sales collateral & funnels

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4

## Mandatory EXRUP Components

- ✅ Accessibility Controls
- ✅ Newsletter Signup
- ✅ Affiliate Marketing

## Quick Start

```bash
cd build
npm install
npm run dev
```

Create your runtime config:

```bash
cp .env.example .env.local
```

Required environment variables:

- `NEWSLETTER_WEBHOOK_URL` — endpoint that receives newsletter signups
- `NEXT_PUBLIC_POLAR_CHECKOUT_URL` — public checkout URL for paid plans

## Production Readiness

- Checkout CTA wired to Polar checkout URL (`NEXT_PUBLIC_POLAR_CHECKOUT_URL`)
- Newsletter submission wired to `/api/newsletter` server route
- Lint/build scripts validated for Next.js 16

## Deployment

See [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for Vercel deployment steps.

## Go-To-Market

See [`GO_TO_MARKET.md`](./GO_TO_MARKET.md) for launch channels, ROI model, and sourced market research.

## Monetization

Primary funding rail: **Polar.sh** (GitHub funding platform).
Secondary: affiliate links, newsletter-driven upsells.
## Revvel Skill Runner

**Port:** 3004  
**Stack:** Next.js 15, React 19, Tailwind CSS, OpenRouter API

Browse and run AI-powered skills from the Revvel skills registry. Ship products
faster by executing skills with a single click.

---

## Quick Start

```bash
cd products/revvel-skill-runner
npm install
cp .env.example .env.local   # add your OPENROUTER_API_KEY
npm run dev                  # http://localhost:3004
```

## Features

- **Skill browser** — search and filter all registered Revvel skills
- **One-click execution** — run any skill via OpenRouter AI
- **Live output** — see skill results inline, no page reload
- **Graceful degradation** — works without API key (shows placeholder output)

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Optional | OpenRouter API key for live skill execution |

Create `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-...
```

## Deploy to Vercel

```bash
vercel --prod
```

Set `OPENROUTER_API_KEY` in the Vercel project's environment variables.

## Development

```bash
npm run dev    # dev server on :3004
npm run build  # production build
npm run lint   # ESLint
```

## TEST

```bash
npm run build  # verifies no TypeScript / Next.js compilation errors
npm run lint   # ESLint clean
```

## Revenue Model

- **Free tier**: 5 skill runs/day (no API key required, stub output)
- **Pro tier** ($9/mo): unlimited runs, full OpenRouter integration, run history
- Upsell to skill customisation, private skill registry, team dashboards

## Market Positioning

Target: indie developers, solopreneurs, and AI power-users who already use the
Revvel standards ecosystem and want to automate without writing code.

---

Built with [revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
A production-ready application to run Revvel skills. Built with Next.js and Tailwind CSS.
Follows EXRUP methodology.

## Mandatory UI Components (EXRUP)
- Affiliate Marketing card
- Newsletter signup
- Accessibility Controls
