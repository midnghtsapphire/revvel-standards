# Research: Perplexity pplx-api & “skills”

**WR:** #16930  
**Mode:** deepresearch  
**Last updated:** 2026-08-08  
**Citations:** official docs + internal BOM (confidence labeled)

## Executive answer

What you see Perplexity **calling as skills in the chat window** is not a separate “skills product.” It is the **Agent tools loop**:

1. **Built-in tools** (server-side): `web_search`, `fetch_url`, `finance_search`, `people_search`, `sandbox`, …
2. **MCP** — remote Model Context Protocol servers the model can discover/call
3. **Custom functions** — JSON Schema tools **you** run locally, then return `function_call_output`

Integrating **pplx-api** is a **good fit** when you need **live web grounding + citations + tool orchestration** in one vendor. It is a **bad fit** as a free unlimited automation backend or as the only store of private enterprise data without MCP/custom tools.

---

## Good uses (ship these)

| Use case | Why pplx wins | Confidence |
| --- | --- | --- |
| Citation-backed research briefs | Native search + citations on Sonar/Agent | High — product design |
| Competitor / market scans | `web_search` without building scrapers | High |
| Agent workflows with mixed tools | Built-ins + custom functions + MCP in one loop | High — Agent API docs |
| BOM-assisted tool selection | Pair API answers with local `bom_lookup` skill | Medium — Revvel pattern |
| Fallback research lane | Via OpenRouter `perplexity/sonar-*` when keyed | High — existing scripts |

## Bad / careful uses

| Use case | Why it hurts | Mitigation |
| --- | --- | --- |
| Secret/internal-only RAG with no tools | Model only sees public web + prompt | Custom function or MCP to your store |
| Bulk scraping / SEO spam at high QPS | Tool invocation fees + rate limits | Cache, queue, Brave/Serper for raw SERP |
| Deterministic CI unit tests | Live web is non-deterministic | `PPLX_FORCE_MOCK=true` (this app) |
| “Free forever” automation | Official API has **no free tier** | Keep no-key bridge for best-effort only |
| Regulated advice (finance/medical) | Grounding ≠ compliance | Human review + disclaimers |

---

## Pricing signals (operator math)

Sources: Perplexity Agent tools docs / public pricing pages (verify before budget lock).

| Meter | Signal | Confidence |
| --- | --- | --- |
| Model tokens | Pay-as-you-go per underlying Sonar/Agent model | High |
| Built-in tool calls e.g. `web_search` | On order of **$2.50 / 1k invocations** (research note) | Medium — confirm current price sheet |
| MCP bridge | No separate MCP toll; tokens still bill | Medium |
| No-key community bridge | $0 but brittle / ToS gray | High — internal docs |

**Vs alternatives (BOM):**

- **Brave / Serper / Tavily** — cheaper raw search; you bring your own LLM
- **OpenAI / Anthropic** — stronger pure reasoning; web is bolt-on
- **OpenRouter** — multi-model router; still needs funded key even for `:free`

---

## Skills ↔ Revvel systems

| Skill family | Revvel hook |
| --- | --- |
| Built-in web tools | Weekly research, WR deepresearch, OSINT briefs |
| Custom functions | `skills/*` packs executed locally (this app’s executor pattern) |
| MCP | Future bridge to mcp-servers/ in monorepo |
| BOM lookup | `docs/Universal-BOM_List/API_REGISTRY_BOM.md` |

---

## SEO / marketing keywords

perplexity api, pplx-api, perplexity agent tools, perplexity skills, sonar pro api, web_search tool calling, mcp perplexity, ai research api with citations, bill of materials api registry

## Monetization path

Ship the console as a **productized integration + education** surface → Pro metering on live keys → agency MCP hosting. Serves prime directive via automated product pipeline + research leverage.

## Decision

**Implement pplx-api (this PR)** as a first-class product with mock-first DX, keep the **no-key** lane for free research automation, and treat official API as the **SLA / citations / skills** path.
