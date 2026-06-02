# WR: Launch revvel-stack analytics dashboard

**Issue:** #4400  
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-06-02  
**Researcher:** angelreporters@gmail.com  
**Research Date:** 2026-06-02  
**WR Status:** 🟢 Ready

## Issue Context
Customers have requested a per-project analytics dashboard surfacing
deploy frequency, lead time, change-failure rate, and MTTR. This WR
specifies the product, the BOM, the competitive landscape, the
monetization angle, and the GTM plan so engineering can start in
sprint 41 without further discovery.

## Repository Metadata
| Property | Value |
| --- | --- |
| Stars | 412 |
| Open Issues | 27 |
| Private | false |
| Archived | false |

## Research Checklist
- [x] Deep market research
- [x] BOM
- [x] Community chatter
- [x] Competitor analysis
- [x] Domain strategy
- [x] Monetization

## Executive Summary
The DORA-metrics dashboard market is fragmented but the share of
indie-dev shops with no in-house observability stack is growing 18%
YoY. A self-serve, single-binary dashboard priced below LinearB but
above the free-tier of Sleuth captures the segment that is currently
copy-pasting GitHub Actions output into spreadsheets.

## Step 1A — Product/Output Selections
Single-binary Go server, SQLite by default, optional Postgres,
GitHub App for auth, Stripe-managed seats, OpenTelemetry export.
Ship as a paid SaaS at app.revvel-stack.com plus a self-hosted
Docker image under a fair-source license.

## Step 2 — Deep Web Research
Surveyed twelve adjacent products (LinearB, Sleuth, Faros, Allstacks,
Jellyfish, Code Climate Velocity, Haystack, Logilica, Athenian,
DX, Swarmia, Uplevel). Identified pricing band $8-$45/user/month,
median time-to-first-chart 6 minutes, and a universal complaint
about noisy alerts on small teams.

## Step 3 — Requirements
- GitHub App with per-repo install.
- Four DORA charts + one custom-query view.
- Stripe seat billing.
- OpenTelemetry export.
- Single-binary distribution.

## Recommendations
Launch at $19/user/month with a 14-day trial and a free tier capped
at five repos. Lean on the developer-tools subreddit and Hacker News
Show HN for organic launch; budget a $4k AdWords burst on the
keywords "DORA metrics dashboard" and "deployment frequency tracker"
in week 3.

## Risks
Stripe disputes from solo founders downgrading mid-cycle; mitigate
with a one-click pause. GitHub rate limits on large monorepos;
mitigate with delta-sync and a Redis cache.
