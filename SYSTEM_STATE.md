# SYSTEM STATE — revvel-standards

> **Read this first at the start of every agent session.**
> **Update this last at the end of every agent session.**
> See `standards/SYSTEM_STATE_STANDARD.md` for full rules.

---

## Infrastructure

| Component | Status | Details |
|---|---|---|
| CI/CD | ✅ | GitHub Actions workflows in `.github/workflows/` |
| oAudrey App Platform app | ⏳ | **Pending human action:** Set `DIGITALOCEAN_API_TOKEN` GitHub secret → trigger `deploy-oaudrey.yml` |
| oAudrey DNS (`oaudrey.com`) | ⏳ | **Pending human action:** Log into Namecheap (`uprisinghope`) → oaudrey.com → Nameservers → Custom DNS → `ns1.digitalocean.com`, `ns2.digitalocean.com`, `ns3.digitalocean.com` |
| oAudrey DNS (`fieldwork.oaudrey.com`) | ⏳ | **Pending human action:** Same NS change as above + add CNAME in DigitalOcean Networking → Domains |
| Database | ❌ | Not applicable (standards repo — no DB) |
| SSL | ⏳ | Auto-provisioned by DigitalOcean Let's Encrypt once DNS resolves and app is deployed |

**Status key:** ✅ Working | ⚠️ Working but degraded | ❌ Not applicable / not needed | ⏳ Pending human action (infrastructure blocker — see `docs/AGENTS.md` Infrastructure Blocker Protocol)

---

## Domain Pages

| Page / Route | Status | Last Verified | Notes |
|---|---|---|---|
| `/` | ⚠️ | 2026-04-29 | Static site files exist; not verified deployed |

---

## Known Bugs

| ID | Description | Severity | Status | Reported |
|---|---|---|---|---|
| BUG-001 | `npm test` fails if dependencies are not installed (`npm ci` required) | low | resolved | 2026-04-29 |
| BUG-002 | YAML parsing errors in credential-label-router.yml and weekly-research.yml causing workflow validation failures | medium | resolved | 2026-05-02 |
| BUG-003 | Duplicate keys in secrets-health-check.yml causing YAML validation failure | low | resolved | 2026-05-02 |
| BUG-004 | `[WR]` issue automation broken — workflow_run loops saturated runner queue, killing every WR run with `startup_failure` | high | resolved | 2026-05-04 |
| BUG-005 | Bot-spam `[FAILURE]` / `[ALERT]` issues opened by failing workflows (~999) | medium | resolved | 2026-05-04 |

---

## MCP Servers

| Server | Status | Notes |
|---|---|---|
| `rvvel-affiliate-links` | ✅ live | Production, npm: `rvvel-affiliate-links-mcp` |
| `code-review` | ✅ live | Production, mandatory in every project |
| `wr-pr-control-plane` | ⏳ disabled | In-tree at `mcp-servers/wr-control-plane/`. Implements 2026 WR-PR Automation Blueprint contract for Composio + Firecrawl + Obot + FastMCP. Enable by removing `disabled: true` in `.mcp.json` and provisioning the credentials listed in `.env.example`. |

---

## Database Schema Status

| Table | Exists | Last Migration | Notes |
|---|---|---|---|
| N/A | ❌ | N/A | Standards repo (no DB) |

---

## Environment Variables

| Variable | Production | Staging | Notes |
|---|---|---|---|
| `OPENROUTER_API_KEY` | ❌ not set | ❌ not set | Used by OpenRouter-routed workflows |
| `JULES_API_KEY` | ❌ not set | ❌ not set | Used by `.github/workflows/jules-invoke.yml` |
| `COMPOSIO_API_KEY` | ❌ not set | ❌ not set | WR/PR control-plane — tool router |
| `FIRECRAWL_API_KEY` | ❌ not set | ❌ not set | WR/PR control-plane — research engine (optional) |
| `OBOT_BASE_URL` | ❌ not set | ❌ not set | WR/PR control-plane — governance gateway |
| `OBOT_IDP_CONFIG` | ❌ not set | ❌ not set | WR/PR control-plane — IdP for per-user OAuth |
| `WR_DEFAULT_REPO` | `midnghtsapphire/revvel-standards` | `midnghtsapphire/revvel-standards` | Default repo target for WR/PR control-plane |

---

## Test Suite Status

| Suite | Last Run | Status | Coverage |
|---|---|---|---|
| `npm test` | 2026-05-02 | ✅ passing (214 tests) | — |

---

## Last Updated

```
Last updated: 2026-05-04 18:56 UTC
Updated by: devin
Session summary: (1) Merged PR #9577 to fix WR/PR automation by killing workflow_run loops, restoring [WR] intake, OpenRouter as sole orchestrator, BITO as sole reviewer, and bot-spam guards. (2) Closed ~999 bot-spam [FAILURE]/[ALERT] issues. (3) Added in-tree wr-pr-control-plane MCP server at mcp-servers/wr-control-plane/ implementing the 2026 WR-PR Automation Blueprint integration contract for Composio + Firecrawl + Obot + FastMCP. Server is disabled by default in .mcp.json until credentials are provisioned.

Last updated: 2026-05-02 04:00 UTC
Updated by: copilot
Session summary: Implemented production-ready daily WR & PR summary system with automated HTML/markdown reports, full XSS protection, and comprehensive documentation. Fixed secrets-health-check.yml duplicate keys. All 214 tests passing.
```
