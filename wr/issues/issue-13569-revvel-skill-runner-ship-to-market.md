# WR: revvel-skill-runner ship to market

**Issue:** #13569  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-05-19  
**Researcher:** Copilot (GitHub)  
**WR Status:** ✅ Complete

---

## Executive Summary

The `revvel-skill-runner` work request has two distinct deliverables:

1. **Pipeline fix** — `wr-pr-creation.yml` never applied `deliver:*` labels to
   WR PRs, so `ship-to-market.yml` skipped all delivery jobs on merge. Fixed by
   auto-mapping the issue's **Output Type** field to the correct `deliver:*`
   label at PR-creation time.

2. **Product** — `products/revvel-skill-runner/` — a Next.js 15 web app
   (port 3004) that lets users browse and execute Revvel skills in one click,
   powered by OpenRouter.

---

## Step 1: Automation Fix — Auto-deliver Labels

### Root Cause

`wr-pr-creation.yml` `Apply labels to PR` step never read the issue's
**Output Type** field. Without a `deliver:*` label on the PR, `ship-to-market.yml`
ran on merge but its `gate` job skipped every delivery channel.

### Fix

Added an **Output Type → deliver label** mapping in `Apply labels to PR`:

| Output Type | Deliver label |
|---|---|
| `production-app` | `deliver:app` |
| `sellable-pdf` | `deliver:pdf` |
| `technical-documentation` | `deliver:docs` |
| `project-management-doc` | `deliver:docs` |
| `api` | `deliver:api` |
| `cli-tool` | `deliver:cli` |
| `docker` | `deliver:docker` |
| `mcp-server` | `deliver:mcp` |
| `video` | `deliver:video` |

The label is parsed from the issue body using:
```
###\s*Output Type[^\n]*\n+([^\n#]+)
```
and looked up in `OUTPUT_TYPE_DELIVER_MAP`. Unrecognised types log a notice and
are skipped gracefully.

---

## Step 2: Product — revvel-skill-runner

### What It Does

A Next.js 15 web app that:

- Displays all Revvel skills from a curated registry
- Allows users to search/filter skills by name, category, or description
- Executes skills via OpenRouter (`anthropic/claude-3.7-sonnet`) with a single
  click
- Shows live output inline; degrades gracefully when `OPENROUTER_API_KEY` is
  absent

### Technical Stack

- **Framework:** Next.js 15 (App Router), React 19
- **Styling:** Tailwind CSS (dark theme, purple/pink gradient)
- **API:** `/api/run-skill` — POST endpoint proxying OpenRouter
- **Port:** 3004 (revvel-standards convention)
- **Deploy:** Vercel (`vercel.json` included)

### File Structure

```
products/revvel-skill-runner/
├── app/
│   ├── api/run-skill/route.ts   # OpenRouter proxy
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                 # Skill browser + runner UI
├── .env.example
├── .eslintrc.json
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

### Revenue Model

- Free tier: stub output (no API key required)
- Pro $9/mo: unlimited live runs + history
- Upsell: private skill registry, team dashboards

---

## Step 3: Requirements from revvel-standards

### Prime Directive Alignment

- ✅ Ships revenue-generating product (skill runner with paid tier path)
- ✅ Reduces friction in automated product pipeline (fixes deliver-label gap)
- ✅ Strengthens OSINT/automation tooling

### Ship to Market Status

**Status:** ✅ Ready

- [x] Product scaffolded and builds cleanly
- [x] README with TEST section
- [x] `.env.example` documented
- [x] `vercel.json` for one-command deploy
- [x] Automation pipeline fix merged in same PR

### BOM (Bill of Materials)

| Item | Cost | Notes |
|---|---|---|
| Next.js 15 | Free | OSS |
| Tailwind CSS | Free | OSS |
| OpenRouter API | ~$0.003/run | Claude 3.7 Sonnet |
| Vercel hosting | Free tier | Hobby plan sufficient |
| **Total monthly (0 users)** | **$0** | |
| **Break-even** | **~3 Pro subscribers** | At $9/mo |

---

## Definition of Done

- [x] `wr-pr-creation.yml` applies `deliver:*` label based on Output Type
- [x] `products/revvel-skill-runner/` created, all required files present
- [x] WR document created
- [x] PR targets `main`, closes issue #13569
