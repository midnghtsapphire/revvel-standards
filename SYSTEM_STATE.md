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
| BUG-006 | Music Video Creator `safeParse` greedy fallback merged multiple LLM JSON blocks and dropped valid responses | medium | resolved | 2026-05-15 |
| BUG-007 | Music Video Creator kept polling provider status indefinitely after provider completion because `artifact_created` was not terminal in the client | medium | resolved | 2026-05-15 |
| BUG-008 | ColdTrace backend pinned `python-jose[cryptography]` to vulnerable 3.3.0 instead of fixed 3.4.0 | high | resolved | 2026-05-15 |

---

## MCP Servers

> **Status column meaning:** tracks repo-level *availability* of each server
> (whether the source / npm package is published and consumable). The
> `disabled` flag in each `.mcp.json` entry is a separate, per-clone
> *runtime* signal indicating whether a particular workspace has the
> credentials and dependencies installed to run the server. A server can be
> `✅ live` here while still being `"disabled": true` in a fresh clone of
> `revvel-standards` until that clone provisions its own secrets.

| Server | Status | Notes |
|---|---|---|
| `rvvel-affiliate-links` | ✅ live | Production, npm: `rvvel-affiliate-links-mcp` |
| `code-review` | ✅ live | Production, mandatory in every project |
| `wr-pr-control-plane` | ✅ live | In-tree at `mcp-servers/wr-control-plane/`. Implements the 2026 WR-PR Automation Blueprint contract for Composio + Firecrawl + Tavily + Obot + FastMCP. Ships `"disabled": true` in `.mcp.json` so downstream clones opt in after installing the local Python deps (`uv pip install -e .`) and provisioning the credentials listed in `.env.example`. |

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
| `FIRECRAWL_API_KEY` | ❌ not set | ❌ not set | WR/PR control-plane — deterministic crawl/scrape/PDF research (optional) |
| `TAVILY_API_KEY` | ❌ not set | ❌ not set | WR/PR control-plane — LLM-optimized live web search (optional, pairs with Firecrawl) |
| `OBOT_BASE_URL` | ❌ not set | ❌ not set | WR/PR control-plane — governance gateway |
| `OBOT_IDP_CONFIG` | ❌ not set | ❌ not set | WR/PR control-plane — IdP for per-user OAuth |
| `WR_DEFAULT_REPO` | `midnghtsapphire/revvel-standards` | `midnghtsapphire/revvel-standards` | Default repo target for WR/PR control-plane |

---

## Test Suite Status

| Suite | Last Run | Status | Coverage |
|---|---|---|---|
| `npm test` | 2026-05-15 | ✅ passing | — |
| ColdTrace backend dependency check | 2026-05-15 | ✅ `python3 -m pip install --dry-run --ignore-installed "python-jose[cryptography]==3.4.0"` | — |

---

## Operating Model

| Component | Status | Details |
|---|---|---|
| Intake form (primary) | ✅ live | [`.github/ISSUE_TEMPLATE/00-work-request.yml`](.github/ISSUE_TEMPLATE/00-work-request.yml) |
| Intake form (lightweight) | ✅ live | [`.github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml`](.github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml) |
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
Last updated: 2026-05-15 22:08 UTC
Updated by: Cursor
Session summary: Fixed ColdTrace backend `python-jose[cryptography]` from vulnerable 3.3.0 to 3.4.0, verified no remaining 3.3.0 pin, confirmed package dry-run resolution, parsed 16 backend Python files, and reran root `npm test` successfully after `npm ci`.

Last updated: 2026-05-05 14:55 UTC
Updated by: OpenHands
Session summary: Added the Revvel operating model layer — OpenHands Work Request intake form, simplified ISSUE_TEMPLATE/config.yml (blank issues disabled, single contact link), viability-gate / invention-flow / legacy-refresh templates, GitHub Project field schema, Notion knowledge-layer spec, the operating-model.md master document, and the Project v2 default-setter + ID-printer workflows (GitHub App and classic-PAT variants). Step 0 router in promptforproject.md already matches the spec. README and SYSTEM_STATE now surface the operating model alongside the existing WR/PR control-plane MCP server.

Last updated: 2026-05-15 21:42 UTC
Updated by: Cursor
Session summary: Fixed Music Video Creator LLM JSON parsing by delegating orchestrator `safeParse` to the balanced-brace extractor, restored parser regression coverage after branch drift, and verified root `npm test` plus product typecheck/build pass.

Last updated: 2026-05-15 21:58 UTC
Updated by: Cursor
Session summary: Fixed Music Video Creator provider polling so `artifact_created` is treated as a terminal success state, added regression coverage, and verified targeted tests, root `npm test`, product lint, and product build pass.

Last updated: 2026-05-04 (post PR #10191 merge)
Updated by: OpenHands
Session summary: (1) Promoted Tavily to a first-class research provider in the wr-pr-control-plane MCP server (alongside Firecrawl). New TAVILY_API_KEY env var, new credential-matrix row, new research_mode branches (tavily-search, jules-plus-firecrawl-and-tavily). (2) Documented every deliberate v0.1.0 trade-off in the server module docstring, mcp-servers/wr-control-plane/README.md, docs/MCP_REVVEL_CATALOG.md, and a machine-readable v0_1_0_trade_offs field on data://wr-control-plane/architecture. (3) Added Composio Firebase toolkit to the architecture summary so per-app Firestore / Functions / Auth wiring has a documented home. (4) Clarified that the MCP Servers Status column tracks repo-level availability while .mcp.json `disabled` tracks per-clone runtime state.
Last updated: 2026-05-04 18:56 UTC
Updated by: OpenHands
Session summary: (1) Merged PR #9577 to fix WR/PR automation by killing workflow_run loops, restoring [WR] intake, OpenRouter as sole orchestrator, BITO as sole reviewer, and bot-spam guards. (2) Closed ~999 bot-spam [FAILURE]/[ALERT] issues. (3) Added in-tree wr-pr-control-plane MCP server at mcp-servers/wr-control-plane/ implementing the 2026 WR-PR Automation Blueprint integration contract for Composio + Firecrawl + Obot + FastMCP. Server is disabled by default in .mcp.json until credentials are provisioned.

Last updated: 2026-05-02 04:00 UTC
Updated by: copilot
Session summary: Implemented production-ready daily WR & PR summary system with automated HTML/markdown reports, full XSS protection, and comprehensive documentation. Fixed secrets-health-check.yml duplicate keys. All 214 tests passing.
```
