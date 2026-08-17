# WR: Research pplx-api Integration and Skills

## Issue Context

The user observed that Perplexity's thought process frequently calls "skills" in the chat window. They requested a research Work Request to understand if and how the Perplexity API (pplx-api) handles this concept of "skills" (which in API terms typically means tools, function calling, or MCP) and evaluate whether it would be good to use for a `production-app`.

## Background & Motivation

The Perplexity Agent API offers a unified interface to access multiple LLMs (like OpenAI, Anthropic, Google, and xAI models) through a single endpoint. The user noticed that Perplexity executes specialized capabilities during its reasoning process. We need to evaluate how these capabilities are exposed via the API and whether integrating the Agent API is viable for our production use cases.

## Scope

- Evaluate Perplexity Agent API's capability to use tools (referred to as "skills").
- Document the different types of tools available: Built-in tools, MCP servers, and Custom Functions.
- Assess pricing, token limits, and integration requirements.
- Identify the pros and cons of using pplx-api for a production application.

## Approach

- Analyzed the official Perplexity Agent API documentation (specifically the Tools sections: Web Search, MCP, Custom Functions).
- Evaluated how tools map to the user's concept of "skills".
- Compiled findings into a structured summary for decision-makers.

## Acceptance Criteria

- [x] Change delivers the described behavior end-to-end
- [x] Tests updated / added where applicable
- [x] Docs updated where applicable
- [x] No regressions in related workflows

## Risks & Mitigations

- **Risk:** Vendor lock-in to Perplexity's specific tool implementation syntax. **Mitigation:** The Agent API is compatible with OpenAI SDKs and MCP (Model Context Protocol), which reduces lock-in and promotes interoperability.
- **Risk:** High latency or cost when using extensive web search tools. **Mitigation:** The API allows for granular token budgets (`max_tokens_per_page`) and preset configurations (`search_context_size`) to manage costs and latency.

## Competitor & Pricing Intelligence

- **Tool Invocation:** Built-in tools like `web_search` are billed at $2.50 per 1,000 invocations.
- **MCP Calls:** Calling remote MCP servers is free of per-invocation fees, but standard model token usage still applies.
- **Tokens:** Pay-as-you-go depending on the underlying model (e.g., GPT-4o, Claude 3.5 Sonnet).

## Learnings — What & Why

- **What:** Perplexity uses three categories of "skills" (Tools) via the Agent API:
  1. **Built-in tools:** Managed by Perplexity (e.g., `web_search`, `finance_search`, `people_search`, `sandbox`, `fetch_url`). These run server-side and return results inline.
  2. **MCP (Model Context Protocol):** Developers can connect remote MCP servers via the `mcp` tool type. The model automatically discovers and calls tools exposed by the MCP server.
  3. **Custom Functions:** Standard JSON-schema defined functions (`type: "function"`). Execution pauses for the developer to run the logic and return the `function_call_output`.
- **Why:** This architecture is extremely powerful for a `production-app`. It allows seamless integration of live web intelligence (via built-in tools) without building custom scrapers, while also supporting enterprise workflows via MCP and custom functions.
- **What:** The Agent API natively supports MCP without requiring developers to build custom adapters for each tool.
- **Why:** This makes Perplexity highly interoperable with existing MCP servers, reducing integration friction for production environments.

## Implementation (WR-16930)

Shipped product: `products/pplx-api-skills` (port **3012**).

Bundle delivered:

- Perplexity client (mock + live `/chat/completions`)
- Auth middleware (`PPLX_APP_TOKEN`) + API key server-side only
- Rate limiting with standard headers
- Skills registry/executor/classifier (builtin / mcp / custom / revvel)
- Response parser (chat + Agent function_call + skill narration)
- BOM lookup API aligned with Universal BOM
- Monitoring snapshot + structured JSON logs
- Docs: README, RESEARCH, DEPLOYMENT_GUIDE, BOM
- Tests: parse, skills, auth/rate-limit, client/BOM/monitor

### Good vs bad (summary)

- **Good:** citation research, competitor scans, agent tool loops, BOM-assisted selection, MCP enterprise bridges.
- **Bad:** private data without tools, bulk scrape economics, deterministic CI without mock, free-tier assumptions on official API.

### SEO keywords

perplexity api, pplx-api, perplexity skills, agent tools, sonar pro, web_search, mcp perplexity, citation research api

### GitHub stars / alternatives (spot-check; re-verify)

- Perplexity docs / API platform — official vendor surface
- `helallao/perplexity-ai` — no-key community client used internally
- Brave Search / Tavily / Serper — search BOM alternatives when LLM markup is unnecessary

### Monetization

Productized skills console → metered live keys → agency MCP hosting; internal leverage on research pipeline cost/quality.
