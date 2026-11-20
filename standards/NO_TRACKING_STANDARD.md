# No Tracking Standard

**Status:** Binding policy. Overrides every other page in this repo.
**Date:** 2026-11-19
**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)

## 1. The rule

No tracking, analytics, telemetry, or affiliate code in any of Audrey's apps, extensions, emails or repos, unless she explicitly asks for it in that repo.

Visiting agents (Manus, Jules, Copilot, Cursor, OpenHands, Claude, Grok, or any other) must not add:

- analytics or product analytics, web or app usage statistics
- telemetry, usage beacons, call-home or update-ping code
- tracking pixels, conversion pixels, heatmaps, session replay
- email open or click tracking, link rewriting, UTM link-tagging
- affiliate or referral links, tags, codes or IDs
- third-party error reporting or monitoring that phones home
- their own name, logo, badge, "built with" line, credit or any other branding

The reason: a visiting agent once put requirements for these into this repo. Code built from them keeps reporting on Audrey's users and on Audrey even after she has stopped using the app. That is spying.

## 2. What to do when you find it

1. Do not add more. Do not copy a template that has it.
2. Do not leave it quietly in place. Report it to Audrey: repo, file, what it does.
3. Do not delete it silently to make a check pass. Tell her first so she can decide.
4. Run `node scripts/visiting-agent-scan.js` before you push (see `VISITING_AGENTS.md` §1b).

## 3. The only exception

Audrey explicitly asks for one named item in one named repo. Write it down as a path, a pattern and a reason in the `allowlist` of `config/visiting-agent-patterns.json`. An old page in this repo is not permission.

## 4. History: what was changed on 2026-11-19

The following pages used to require or recommend tracking or affiliate code. They were rewritten or marked RETIRED. Nothing was deleted.

| File | Old text | Now |
|---|---|---|
| `README.md` and `docs/REVVEL_MASTER_STANDARDS.md` | "Affiliate Marketing Automation Engine (MANDATORY)", affiliate auto-linker, Audrey's affiliate and referral links table, analytics and affiliate tool lists, affiliate links in campaigns and newsletters, email open and click tracking, "set up analytics" | Replaced by a "No Tracking" section and opt-in wording |
| `docs/Master_Inventory/AFFILIATE_MARKETING_STANDARD.md` | Mandatory affiliate systems in every app | RETIRED banner, mandates struck |
| `docs/Master_Inventory/MARKETING_AUTOMATION_STANDARD.md` | Mandatory marketing automation, UTM tagging, GA4, Meta and TikTok pixels | RETIRED banner |
| `docs/Master_Inventory/MASTER_APP_TEMPLATE.md` | Conversion pixels, UTM, mandatory analytics, Sentry-style error tracking, mandatory affiliate MCP server | Replaced with no-tracking wording |
| `docs/Master_Inventory/MCP_STANDARD.md`, `docs/MCP_REVVEL_CATALOG.md`, `docs/AGENTS.md` | `rvvel-affiliate-links-mcp` mandatory in every project | Marked retired and not used |
| `docs/DEFAULT_APP_TEMPLATE.md` | Analytics and Affiliate Engine rows | Marked removed |
| `docs/neurooz/NEUROOZ_COMPLIANCE_CHECKLIST.md` | Affiliate Marketing (MANDATORY), SEM hooks, analytics rows | Removed |
| `docs/SPRINT_STATE.md` | Affiliate engine in every app | Struck through |
| `docs/POSTHOG_INTEGRATION.md`, `docs/MIXPANEL_INTEGRATION.md`, `templates/standards/posthog-events.md`, `templates/standards/mixpanel-events.md`, `templates/standards/README.md`, `templates/standards/posthog-init.ts`, `templates/standards/mixpanel-init.ts` | "Every Revvel app must emit" analytics events; drop-in SDK initializers | RETIRED banners; do not copy |
| `standards/AMPLITUDE_INTEGRATION_STANDARD.md`, `standards/AMPLITUDE_NOTION_AGENT_STANDARD.md` | Active Amplitude standard | RETIRED banner |

## 5. Still in the repo and flagged for Audrey to remove

These are code, workflows or config, not policy text. They were **not** changed or deleted. Audrey decides.

| Item | What it does |
|---|---|
| `.github/workflows/amplitude-events.yml` | Sends GitHub issue and PR events to Amplitude |
| `.github/workflows/amplitude-to-notion.yml`, `scripts/amplitude-to-notion.js` | Pulls Amplitude data into Notion |
| `templates/cicd/posthog-annotations.yml`, `posthog-send-event.yml`, `posthog-upload-sourcemaps.yml` | CI templates that send events or sourcemaps to PostHog |
| `skills/posthog/`, `skills/mixpanel/`, `skills/amplitude-notion-agent/` | Agent skills that teach adding analytics |
| `templates/mcp/mcp.revvel-custom.json`, `templates/mcp/mcp.full.json`, `scripts/setup-mcp.sh` | New projects get the affiliate links MCP server |
| `scripts/init-project.sh` | Scaffolds a `SENTRY_DSN` secret and env var into new projects |
| `scripts/autonomous-product-launcher.sh` | Generates checklists that say to add analytics (Plausible or PostHog) and an analytics webhook |
| `docs/affiliate_links.md`, `docs/affiliate-hub/` | Audrey's affiliate and referral links and an affiliate hub doc (the Affiliate Hub product itself is allowlisted by Audrey) |
| `docs/30Dayiteration/` (archived) | Launch guides that say to set up Plausible, PostHog or Mixpanel |
| `config/visiting-agent-patterns.json` | Not tracking, but the file currently fails to parse as JSON (missing commas around line 158), so `scripts/visiting-agent-scan.js` crashes. Needs a fix by Audrey or an agent she approves. |
| `products/`, `projects/`, `wr/` | Not scanned here. Run the visiting-agent scan per product. |
