# Revvel Skill Runner

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
