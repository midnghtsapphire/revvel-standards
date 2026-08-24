# GrowlingEyes — MANUS build handoff

**Owner:** Audrey Walter-Evans / MIDNGHTSAPPHIRE  
**Priority:** Ship working software. Extend the live app. Do not rebuild.

## Prime directive

You are extending an existing production application. Do not break what works. XP rules: CI, small releases (one domain at a time, end-to-end), tests ship with code, refactor as you go.

## Existing stack (do not change architecture)

- Frontend: React + Vite + TypeScript → `dist/public/`, served by Express
- Backend: Node.js + Express + tRPC (`server/_core/index.ts`)
- DB: MySQL 8 via Drizzle (`pnpm db:push`)
- Auth: Google OAuth (Passport)
- Payments: Stripe
- Process: PM2 `growlingeyes` behind Nginx + Let's Encrypt
- UI: Radix + Tailwind + shadcn

## Mission

Add all 18 domains / 95 data sources. Each domain needs a fetcher, tRPC router, Drizzle table(s), frontend card, and a consumer-impact line.

## Unified event fields

id, timestamp, ingestedAt, domain, subDomain, severity (1–5), title, summary, lat/lon, country, region, impactTags, supplyChainImpact, consumerImpact, sourceName, sourceUrl, sourceReliability, sourceHash.

## Build order

1. Foundation: `events` table, `gdelt.ts`, cron, wire tRPC, deploy
2. Free APIs: USGS, GDACS, CISA, FRA, NOAA SWPC, drought, openFDA, UNHCR, NWS, ReliefWeb
3. Keyed APIs: AIS stream, Space-Track, ACLED, remaining GDELT queries, Telegram RSS
4. Knowledge bases + UI: chokepoints, GPS jamming, mineral/pharma dependency, map overlays
5. Polish: `deploy.sh`, tests, verify 18 domains, rate-limit polling

## What not to do

Do not switch off tRPC, MySQL/Drizzle, or PM2. Do not add Docker or GitHub Actions yet. Keys stay in `.env`. Stagger polls.

Full source list, GDELT query map, fetcher templates, and consumer-impact table: Promhoeador `collected/user/MANUS_INSTRUCTIONS.md` and `docs/growlingeyes/` in this repo.
