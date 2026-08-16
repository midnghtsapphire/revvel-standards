# Fleet maintenance — midnghtsapphire/nomad-navigator

**WR:** [revvel-standards#16882](https://github.com/midnghtsapphire/revvel-standards/issues/16882)  
**Target PR:** [nomad-navigator#1](https://github.com/midnghtsapphire/nomad-navigator/pull/1)  
**Date:** 2026-08-08  
**Status:** Implemented (PR opened on target)

## Target snapshot

| Property | Value |
| --- | --- |
| Repo | `midnghtsapphire/nomad-navigator` |
| Stack | Vite + React 18 + TypeScript + Tailwind + shadcn/ui + Supabase |
| Language | TypeScript |
| Default branch | `main` |
| Live URL | <https://nomad-navigator.vercel.app> |
| Prior workflows | none |
| Package name (before) | `vite_react_shadcn_ts` (Lovable scaffold) |

## Research checklist

- [x] Deep market research (lightweight — product already positioned)
- [x] Competitor analysis
- [x] Community chatter signals
- [x] Monetization path
- [x] Marketing / SEO keywords
- [x] Technical / security findings
- [x] Factual citations / confidence labels

## Executive summary

Nomad Navigator is a **digital-nomad tax clarity SPA** (marketing brand: NomadTax): multi-currency income, residency day tracking, and simplified regime comparisons. The repo was still on Lovable boilerplate docs, had **no CI/review jury**, shipped **zero unit tests**, and tracked a **committed `.env`** with Supabase anon credentials. Fleet maintenance delivered docs refresh, security hygiene, pure-logic tests, and the standard OpenRouter / Jules / Semgrep / CodeQL / CI workflows on target PR #1.

## Market & SEO

**Keywords (primary):** digital nomad tax, 183 day rule tracker, expat tax residency, multi currency income tracker, NHR Portugal calculator, Beckham Law tax, remote work tax planner.

**Competitor set (illustrative, not exhaustive):**

| Tool | GitHub stars | Notes | Confidence |
| --- | --- | --- | --- |
| Taxbird / similar SaaS | n/a (closed) | Paid nomad tax filing assistants | medium |
| TravelMap / Days Reckoner style trackers | varies | Day-count niche apps | medium |
| Spreadsheet templates (r/digitalnomad) | n/a | Free but high friction | high — ongoing subreddit demand |

**Community chatter:** r/digitalnomad and r/expats repeatedly ask about the **183-day rule**, US FEIE, and Portugal NHR sunset — demand is durable (confidence: medium; qualitative forum scan, 2024–2026).

## Monetization path

| Path | Mechanism | Confidence |
| --- | --- | --- |
| Freemium SaaS | Free tracker; paid multi-year export + CPA handoff pack | medium |
| Affiliate | Nomad insurance, multi-currency accounts (disclosure required) | medium |
| B2B / EOR embed | White-label day-count for remote employers | low |

Serves prime directive via **productized OSINT-adjacent personal finance tooling** and Polar/GitHub funding surface once billing is wired.

## Technical findings & actions

| Finding | Severity | Action in PR #1 |
| --- | --- | --- |
| `.env` committed with Supabase URL + anon key | high (hygiene) | Deleted; `.env.example` + gitignore |
| No CI / no review jury | high (process) | Added OpenRouter, Jules, Semgrep, CodeQL, CI, Dependabot |
| Lovable README / index.html TODOs | medium (docs) | Product README, CONTRIBUTING, OVERVIEW, meta/CSP |
| Tax math embedded in React component | medium (testability) | Extracted `src/lib/tax.ts` + 10 Vitest tests |
| ESLint fails on stock shadcn empty interfaces | low (DX) | Rules downgraded to warn (same pattern as neighborly-services) |
| No Dependabot | low | Weekly npm + actions |

## Review jury status (target)

Workflows added under `.github/workflows/`:

- `ai-pr-review-openrouter.yml`
- `jules-pr-reviewer.yml`
- `semgrep.yml`
- `codeql.yml`
- `ci.yml`

**Secrets required on target (or org-shared):** `OPENROUTER_API_KEY`, optional `JULES_API_KEY`.

## Artifacts

- Redacted patch: `wr/fleet-maintenance/nomad-navigator.patch`
- Target PR: <https://github.com/midnghtsapphire/nomad-navigator/pull/1>

## Acceptance mapping (host contract)

| Gate | Result |
| --- | --- |
| Target improvements implemented | yes (PR #1) |
| Docs refreshed | yes |
| Review workflows present | yes |
| Unit tests | `npm test` 10/10 locally |
| Conventional commit title | `chore(fleet): …` |
