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

## Operating Model

| Component | Status | Details |
|---|---|---|
| Intake form | ✅ live | [`.github/ISSUE_TEMPLATE/devin-work-request.yml`](.github/ISSUE_TEMPLATE/devin-work-request.yml) |
| Viability gate template | ✅ live | [`templates/viability-gate-template.md`](templates/viability-gate-template.md) |
| Invention flow template | ✅ live | [`templates/invention-flow-template.md`](templates/invention-flow-template.md) |
| Legacy refresh checklist | ✅ live | [`templates/legacy-refresh-checklist.md`](templates/legacy-refresh-checklist.md) |
| GitHub Project schema | ✅ documented | [`docs/github-project-schema.md`](docs/github-project-schema.md) — provisioned per-org |
| Notion knowledge layer | ✅ documented | [`docs/notion-structure.md`](docs/notion-structure.md) — provisioned per-org |
| Step 0 router | ✅ live | [`promptforproject.md`](promptforproject.md) |
| Operating model doc | ✅ live | [`docs/operating-model.md`](docs/operating-model.md) |
| Project v2 default-field automation | ✅ live | [`.github/workflows/set-default-project-v2-fields.yml`](.github/workflows/set-default-project-v2-fields.yml) (+ PAT variant `default-project-v2-fields-pat.yml`) |
| Project v2 ID discovery helpers | ✅ live | [`.github/workflows/print-project-v2-ids.yml`](.github/workflows/print-project-v2-ids.yml) (+ PAT variant `print-project-v2-ids-pat.yml`) |
| Project v2 setup walkthrough | ✅ live | [`docs/github-project-v2-workflows.md`](docs/github-project-v2-workflows.md) |

`Status = ✅ documented` means the spec is in this repo and ready to be applied to the GitHub Project / Notion workspace; the runtime artifacts (the actual GitHub Project and Notion databases) are provisioned outside this repo.

### Project v2 automation requirements

Before the default-field workflows will run end-to-end, provision either path:

**GitHub App path** (recommended for org-owned boards) — `set-default-project-v2-fields.yml` + `print-project-v2-ids.yml`. Needs:

- Variable `PROJECTS_APP_ID` and secret `PROJECTS_APP_PRIVATE_KEY` for a GitHub App with org Projects = Read & write and repo Issues = Read.

**Classic PAT path** — `default-project-v2-fields-pat.yml` + `print-project-v2-ids-pat.yml`. Needs:

- Secret `PROJECTS_PAT` for a classic personal access token with `project` + `repo` scopes (or `public_repo` for public-only).

Both paths additionally need these repository or organization variables, populated from the helper workflow's output:

- `PROJECT_ID`
- `PRIORITY_FIELD_ID`, `EFFORT_FIELD_ID`, `CUSTOM_SELECT_FIELD_ID`
- `PRIORITY_HIGH_OPTION_ID`, `EFFORT_MEDIUM_OPTION_ID`, `CUSTOM_DEFAULT_OPTION_ID`

Until populated, the workflows fail loudly on every new issue (intentional — silent failure would let the project board drift). See [`docs/github-project-v2-workflows.md`](docs/github-project-v2-workflows.md) for the full setup walkthrough.

---

## Last Updated

```
Last updated: 2026-05-04 19:05 UTC
Updated by: devin
Session summary: Added the Revvel operating model layer — Devin Work Request intake form, simplified ISSUE_TEMPLATE/config.yml (blank issues disabled, single contact link), viability-gate / invention-flow / legacy-refresh templates, GitHub Project field schema, Notion knowledge-layer spec, and the operating-model.md master document. Step 0 router in promptforproject.md already matches the spec. README and SYSTEM_STATE now surface the operating model alongside the existing WR/PR control-plane MCP server.

Last updated: 2026-05-04 18:56 UTC
Updated by: devin
Session summary: (1) Merged PR #9577 to fix WR/PR automation by killing workflow_run loops, restoring [WR] intake, OpenRouter as sole orchestrator, BITO as sole reviewer, and bot-spam guards. (2) Closed ~999 bot-spam [FAILURE]/[ALERT] issues. (3) Added in-tree wr-pr-control-plane MCP server at mcp-servers/wr-control-plane/ implementing the 2026 WR-PR Automation Blueprint integration contract for Composio + Firecrawl + Obot + FastMCP. Server is disabled by default in .mcp.json until credentials are provisioned.

Last updated: 2026-05-02 04:00 UTC
Updated by: copilot
Session summary: Implemented production-ready daily WR & PR summary system with automated HTML/markdown reports, full XSS protection, and comprehensive documentation. Fixed secrets-health-check.yml duplicate keys. All 214 tests passing.
```
