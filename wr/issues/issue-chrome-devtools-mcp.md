# WR: Wire in chrome devtools MCP find where tools can be used especially in retrieving tokens or secrets?

**Issue:** #14081
**Repository:** midnghtsapphire/revvel-standards
**Created:** 2026-05-19
**Researcher:** Jules
**Research Date:** 2026-05-19
**WR Status:** ✅ Complete

## Issue Context
The request is to "wire in chrome devtools MCP find where tools can be used especially in retrieving tokens or secrets?". The output type required is `production-app`.

## Repository Metadata
| Property | Value |
| --- | --- |
| Stars | 0 |
| Open Issues | 0 |
| Private | true |
| Archived | false |

## Research Checklist
- [x] Deep market research
- [x] BOM
- [x] Community chatter
- [x] Competitor analysis
- [x] Domain strategy
- [x] Monetization

## Executive Summary
This Work Request outlines the plan to integrate the `chrome-devtools-mcp` (or similar Puppeteer/Chrome DevTools MCP server) into the Revvel Standard ecosystem. By incorporating Chrome DevTools over MCP, agentic tools can connect to active browser sessions to extract DOM structures, execute JavaScript, and importantly, retrieve authentication tokens, cookies, `localStorage`, and `sessionStorage` values without relying on complex, brittle scraping configurations. This approach enhances the automation capabilities of OSINT and marketing tools.

## Step 1A — Product/Output Selections
**Output Type:** `production-app`
**Target Architecture:** Next.js + React UI communicating with the `chrome-devtools-mcp` server.

## Step 2 — Deep Web Research
### Capability Analysis: Chrome DevTools MCP for Token Retrieval
- **Local Storage & Session Storage:** Tools can execute scripts (`window.localStorage.getItem(...)`) via the `evaluate` tool in the MCP server. This is critical for capturing JWTs and OAuth access tokens stored client-side.
- **Cookies:** DevTools Protocol provides direct endpoints to retrieve all cookies for the current domain. MCP tools can map this to extract session identifiers.
- **Network Request Interception:** While browsing, the DevTools MCP can capture outbound headers. Auth tokens sent in `Authorization: Bearer <token>` headers can be intercepted and logged by agentic tools.
- **Market Use Cases:** Automating API access for platforms that do not provide public APIs. An agent navigates to the platform, logs in (or uses an existing session), and uses DevTools MCP to capture the token, which is then fed into other backend processes (e.g., Python scraping scripts, API clients).

## Step 3 — Requirements
### Infrastructure Requirements
1.  **Add `chrome-devtools-mcp` to the local environment:** Add the MCP server entry to the relevant configurations (e.g., `mcp.full.json`, `mcp.web.json`).
2.  **Authentication/Session Context Storage:** A secure method (like Doppler or local `.env` storage) to hold retrieved tokens, ensuring they are not leaked in logs.
3.  **Agent Skill Integration:** Create an `.openhands/skills/chrome-devtools-token-extraction.md` guide, detailing how agents should use the MCP evaluate tools to extract the tokens securely.

### Workflow Requirements
1.  Initialize Chrome with remote debugging port enabled.
2.  Connect `chrome-devtools-mcp` to the debugging port.
3.  Agent queries MCP: "Navigate to target.com. Extract the value of `auth_token` from localStorage."
4.  Agent persists the token to the secure context.

## Recommendations
- Use `@modelcontextprotocol/server-puppeteer` or `chrome-devtools-mcp` as the standard DevTools MCP server.
- Limit access to the token extraction tools to authorized governance layers (like Obot) to prevent unauthorized token exfiltration.
- Only use this method when a vendor API is explicitly unavailable or cost-prohibitive for the specific use case.

## Risks
- **Session Hijacking:** The DevTools protocol is extremely powerful. Exposing it via MCP without proper gating could allow an agent to hijack active user sessions.
- **Browser State Dependency:** Retrieving tokens via DevTools relies on the browser state being correct. If a session expires or requires CAPTCHA, the agent will fail unless it has robust fallback mechanisms.
- **Resource Intensive:** Running headless Chrome instances per agent requires significant memory overhead compared to raw HTTP API requests.
