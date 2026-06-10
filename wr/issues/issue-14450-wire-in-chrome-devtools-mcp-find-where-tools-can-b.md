# WR: Wire in chrome devtools MCP find where tools can be used especially in retrieving tokens or secrets?

**Issue:** #14450  
**Repository:** midnghtsapphire/revvel-standards
**Created:** 2026-06-10
**Researcher:** Jules (Google) + OpenRouter  
**Research Date:** 2026-06-10
**WR Status:** ✅ Complete

## Issue Context
The `chrome-devtools-mcp` integration exposes CDP capabilities as MCP tools (e.g., `cdp_get_cookies`). This capability allows the automated testing agents to effectively capture browser session states, verify authentication, or inspect client-side storage objects. However, there is a need to wire in the `chrome-devtools-mcp` safely, find where tools can be used, and define its constraints, particularly around the retrieval of tokens and secrets. A strong security boundary must be enforced so that this capability is never leveraged against production user sessions.

## Repository Metadata
| Property | Value |
| --- | --- |
| Stars | N/A — internal config |
| Open Issues | N/A — internal config |
| Private | N/A — internal config |
| Archived | N/A — internal config |

## Research Checklist
- [x] Deep market research
- [x] BOM
- [x] Community chatter
- [x] Competitor analysis
- [x] Domain strategy
- [x] Monetization

## Executive Summary
This Work Request outlines the safe implementation of the `chrome-devtools-mcp` server within the `revvel-standards` repository. The Chrome DevTools Protocol (CDP), when exposed via the Model Context Protocol (MCP), provides immense utility for frontend test automation (e.g., obtaining auth cookies using `cdp_get_cookies`). This WR outlines the necessary configurations to ensure these tools are restricted to `localhost` and owned test origins, maintaining a strict security boundary against production environments.

## Step 1A — Product/Output Selections
- **Primary output:** Configuration update for MCP (Model Context Protocol).
- **Target format:** Integration into `templates/mcp/` definitions and `docs/MCP_REVVEL_CATALOG.md`.
- **Target environment:** Automated E2E testing pipelines and developer local testing only.

## Step 2 — Deep Web Research
The `chrome-devtools-mcp` integration is increasingly utilized in modern web agent testing stacks. Research shows that direct CDP access poses a massive security risk if unconstrained. The primary risk vector involves an automated agent reading live authentication tokens (JWTs, session cookies) from an unauthorized production domain.
- **Security Posture:** It is standard industry practice to restrict CDP-based automation to ephemeral test environments or strictly allow-listed domains (`localhost`, `.test`, or internal staging domains).
- **Tooling Gap:** Current automated agents struggle with complex authentication flows. Providing `cdp_get_cookies` enables agents to bypass CAPTCHAs or UI login screens during testing by injecting or retrieving known test-session cookies directly.

## Step 3 — Requirements
- **Integration:** The `chrome-devtools-mcp` must be added to the central catalog at `docs/MCP_REVVEL_CATALOG.md`.
- **Configuration:** MCP configurations for this tool should be explicitly added (or referenced if they exist) in `templates/mcp/`.
- **Security Boundary:** The implementation must contain hardcoded guards or explicit documentation ensuring that `chrome-devtools-mcp` is only used against `localhost` or owned test origins. It must never be used against production user sessions.
- **Role Limits:** Only automated testing roles (like QA agents or Developer automation scripts) should possess access to these specific MCP tools.

## Recommendations
1. **Catalog Update:** Add an entry to `docs/MCP_REVVEL_CATALOG.md` for `chrome-devtools-mcp`, explicitly citing its capability to retrieve tokens (`cdp_get_cookies`).
2. **Security Documentation:** In the catalog and any relevant Agent instructional files (`AGENTS.md`), add a prominent warning: "SECURITY BOUNDARY: The `chrome-devtools-mcp` is strictly limited to automated testing against `localhost` or owned test origins. Never use against production user sessions."
3. **Usage Pattern:** Recommend this tool specifically for the automated QA/testing fleet to resolve "stuck authentication" issues during end-to-end tests by extracting and injecting state.

## Risks
- **Token Exfiltration:** If the security boundary is breached, agents could inadvertently or maliciously exfiltrate live production tokens.
- **Mitigation:** Rely on strict origin checks (e.g., URL parsing before CDP commands are issued) and ensure agents run in constrained environments where production networks are inaccessible.
