# MVI Contract — 2026-05-04 (Tavily research path + v0.1.0 trade-off documentation)

> See `standards/MVI_CONTRACT_STANDARD.md` for full rules.

---

## Section 1: Context Check

```text
Previous session completed: PR #10191 merged. The wr-pr-control-plane MCP
server now lives at mcp-servers/wr-control-plane/ and is wired into
.mcp.json, templates/mcp/*, scripts/setup-mcp.sh, docs/MCP_REVVEL_CATALOG.md,
README.md, SYSTEM_STATE.md, and package.json.
Current production state: main contains the v0.1.0 control-plane server with
4 tools, 2 resources, 21 regression tests, and a disabled-by-default entry in
.mcp.json. Composio, Firecrawl, Obot, and FastMCP are modeled as the next
control-plane layer.
Known bugs relevant to this MVI: none. OpenHands Review BUG_0001 (duplicate
step-5 in setup-mcp.sh) and #0004 (unused asdict / parse imports) were both
fixed in PR #10191.
SYSTEM_STATE.md last updated: 2026-05-04 (PR #10191 merge).
```

---

## Section 2: Feature Definition

```text
Feature: Extend the wr-pr-control-plane MCP server to (a) treat Tavily as a
first-class research provider alongside Firecrawl and (b) document every
deliberate v0.1.0 trade-off in code, tech docs, and user docs so downstream
agents and humans can plan around them.
User story: As a Revvel agent operator, when I review the control-plane
server I see explicit research-mode selection (Jules / Firecrawl / Tavily /
combinations) and an authoritative list of v0.1.0 trade-offs in every
surface I might read (server docstring, server README, MCP catalog, and the
MVI contract), so I never have to guess whether a behaviour is a bug or an
intentional limitation.
```

---

## Section 3: Dependency Map

```text
Database tables required: none
API routes required: GitHub REST API issue/comment endpoints (unchanged); Tavily / Firecrawl APIs are referenced via env, not invoked here.
Environment variables required: existing set + TAVILY_API_KEY (optional,
recommended whenever a WR carries URLs / research signals).
External services required: GitHub API. Tavily and Firecrawl remain optional.
Other features that must be complete first: PR #10191 (wr-pr-control-plane v0.1.0).
```

---

## Section 4: Acceptance Gates

- [ ] `npm test` — root test suite passes; new Tavily + research-mode + trade-off coverage included.
- [ ] `npm run lint` — markdown docs pass repo lint rules (MD040 et al).
- [ ] `python3 -m compileall mcp-servers/wr-control-plane` — server compiles cleanly.
- [ ] `data://wr-control-plane/architecture` returns a `v0_1_0_trade_offs` field.
- [ ] `control_plane_status().providers.tavily` reflects `TAVILY_API_KEY` presence.
- [ ] `_control_plane_readiness.research_mode` returns one of: `jules-only`, `firecrawl-agent`, `tavily-search`, `jules-plus-firecrawl-and-tavily`, `jules-plus-firecrawl-pdf`.
- [ ] `mcp-servers/wr-control-plane/README.md` carries the research-provider matrix and the trade-offs table.
- [ ] `docs/MCP_REVVEL_CATALOG.md` carries the research-mode and trade-offs tables.
- [ ] GitHub Actions CI passes on the follow-up PR.

---

## Section 5: Out of Scope

```text
Out of scope:
- Live Tavily / Firecrawl / Composio API invocations (still env-only contract)
- Per-user Firebase wiring (lives in consuming app repos, brokered via Composio)
- A v0.2.0 stop-word tokenizer for requested_integrations
- A process-wide ControlPlaneConfig cache
- Composio's GitHub toolkit pagination
```

---

## Section 6: Files to Touch

```text
New files:
- docs/MVI_CONTRACT_2026-05-04_TAVILY_AND_TRADEOFFS.md (this file)

Modified files:
- mcp-servers/wr-control-plane/wr_control_plane/server.py
    * docstring: add "Known v0.1.0 trade-offs" section
    * ControlPlaneConfig: add tavily_api_key
    * _credential_matrix: add TAVILY_API_KEY row
    * _control_plane_readiness: add research_mode branches for Tavily
    * control_plane_status: include tavily provider boolean
    * env_schema: list TAVILY_API_KEY under optional
    * architecture_summary: add Tavily research entries + Composio Firebase
      toolkit entry + v0_1_0_trade_offs field
    * PROVIDER_TOOLKITS: add firebase
    * DEFAULT_ALLOWED_HOSTS: add api.tavily.com
- .env.example — add TAVILY_API_KEY block, extend OBOT_ALLOWED_HOSTS
- templates/mcp/.env.mcp.example — same
- .mcp.json — TAVILY_API_KEY in env, extend allowed-hosts default,
  update disabledReason copy
- templates/mcp/mcp.revvel-custom.json — TAVILY_API_KEY in env, extend
  allowed-hosts default, update _comment
- mcp-servers/wr-control-plane/README.md — research-provider matrix, trade-offs table
- docs/MCP_REVVEL_CATALOG.md — research-mode table, trade-offs table
- docs/MVI_CONTRACT_2026-05-04_MCP_CONTROL_PLANE.md — append cross-reference to this MVI
- README.md — Tavily mention next to Firecrawl in the control-plane callout
- SYSTEM_STATE.md — clarify status column meaning, add TAVILY_API_KEY env var
- tests/wr-control-plane.test.js — Tavily, research-mode, trade-offs assertions
```

---

## Section 7: Rollback Plan

```text
Rollback steps:
1. git revert <commit-hash> on the follow-up branch / PR if the new research-mode
   logic regresses regression tests.
2. Drop the TAVILY_API_KEY block from .env.example, .mcp.json, .env.mcp.example,
   and mcp.revvel-custom.json. Drop tavily_api_key from ControlPlaneConfig.
3. Restore the previous "firecrawl-agent" / "jules-only" branching in
   _control_plane_readiness.

Database migrations in this MVI: no
Rollback risk: low — additive changes; no consumer is forced to set TAVILY_API_KEY.
```
