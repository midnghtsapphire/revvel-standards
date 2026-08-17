# MVI Contract — 2026-05-04

> See `standards/MVI_CONTRACT_STANDARD.md` for full rules.

---

## Section 1: Context Check

```text
Previous session completed: PR #9577 restructured the WR→PR pipeline, removed the workflow_run feedback loop, made WR+PR creation immediate, set OpenRouter as sole orchestrator, and kept BITO AI as sole reviewer.
Current production state: revvel-standards main now contains the fixed WR/PR automation workflows; the repo already ships MCP standards, setup scripts, templates, and several MCP server directories. Residual queued workflow-monitor / audit / ralph runs are still draining from pre-merge backlog.
Known bugs relevant to this MVI: none listed in SYSTEM_STATE.md that block MCP control-plane implementation.
SYSTEM_STATE.md last updated: 2026-05-02 04:00 UTC
```

---

## Section 2: Feature Definition

```text
Feature: Add a working WR/PR control-plane MCP server and wire revvel-standards docs/config so Composio, Firecrawl, Obot, and FastMCP have a concrete, repo-native integration path.
User story: As a Revvel agent operator, I can use a dedicated WR control-plane MCP server to inspect WR issue context, detect required credentials, and generate research/config packets so autonomous GitHub workflows can evolve into the blueprint architecture without inventing parallel conventions.
```

---

## Section 3: Dependency Map

```text
Database tables required: none
API routes required: GitHub REST API issue/comment endpoints
Environment variables required: GITHUB_TOKEN, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, JULES_API_KEY, COMPOSIO_API_KEY, FIRECRAWL_API_KEY, OBOT_BASE_URL, OBOT_IDP_CONFIG
External services required: GitHub API; optional downstream integrations for Composio, Firecrawl, Obot
Other features that must be complete first: PR #9577 workflow stabilization on main
```

---

## Section 4: Acceptance Gates

- [ ] `npm test` — root test suite passes with the new MCP control-plane coverage
- [ ] `npm run lint` — markdown docs pass repo lint rules
- [ ] `python3 -m compileall mcp-servers/wr-control-plane` — server code compiles cleanly
- [ ] FastMCP server module imports and exposes the documented tools locally
- [ ] Manual smoke test in local shell — control-plane helper returns structured readiness / issue packet output
- [ ] GitHub Actions CI passes on the follow-up PR
- [ ] Live verification: review the new `wr-pr-control-plane` entry in `.mcp.json` and run the smoke test commands from the server README
- [ ] `SYSTEM_STATE.md` updated with new MCP control-plane status

---

## Section 5: Out of Scope

```text
Out of scope:
- Standing up a live Obot deployment
- Provisioning real Composio / Firecrawl / Obot credentials
- Replacing Jules with Firecrawl
- Rewriting the entire WR pipeline a second time
```

---

## Section 6: Files to Touch

```text
New files:
- docs/MVI_CONTRACT_2026-05-04_MCP_CONTROL_PLANE.md
- mcp-servers/wr-control-plane/README.md
- mcp-servers/wr-control-plane/pyproject.toml
- mcp-servers/wr-control-plane/wr_control_plane/__init__.py
- mcp-servers/wr-control-plane/wr_control_plane/server.py
- tests/wr-control-plane.test.js

Modified files:
- .mcp.json — add disabled but fully documented wr-pr-control-plane entry
- .env.example — add Composio / Firecrawl / Obot / WR control-plane variables
- templates/mcp/.env.mcp.example — add matching MCP env vars for downstream repos
- templates/mcp/mcp.revvel-custom.json — add wr-pr-control-plane entry for repo consumers
- scripts/setup-mcp.sh — surface the new control-plane entry in setup guidance
- docs/MCP_REVVEL_CATALOG.md — document the new server in the catalog
- README.md — advertise the control-plane integration path
- SYSTEM_STATE.md — record the new control-plane capability
- package.json — include the new regression test in npm test
```

---

## Section 7: Rollback Plan

```text
Rollback steps:
1. git revert <commit-hash> on the follow-up branch / PR if the control-plane feature regresses docs or tests
2. Remove the wr-pr-control-plane entry from .mcp.json and templates if the server contract proves incorrect
3. Re-run npm test and workflow YAML validation after revert

Database migrations in this MVI: no
Rollback risk: low
```

---

## Section 8: Follow-up MVIs

- `docs/MVI_CONTRACT_2026-05-04_TAVILY_AND_TRADEOFFS.md` — adds Tavily as a
  first-class research provider alongside Firecrawl and documents every
  deliberate v0.1.0 trade-off in code, server README, MCP catalog, and a
  machine-readable `v0_1_0_trade_offs` field on
  `data://wr-control-plane/architecture`. Acts as the canonical follow-up to
  this MVI.
