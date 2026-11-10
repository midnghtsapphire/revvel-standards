# BUILD SPEC — Deep Research Orchestrator (CLI + MCP + Core)

> EXECUTION MODE: XP. ONE ITERATION (extra PRs allowed). MAX BUILD.
> Package name: @midnght/deep-research  (CLI binary: `dr`)
> Purpose: the missing "build" in the workflow — a runner that fans a research question across many
> OpenRouter models in parallel, cross-checks them, and synthesizes a reviewed brief. Beats a single
> vendor's internal research by using N models as independent witnesses and triangulating.
> Time and cost are NOT constraints (per WR_RESEARCH_MANDATE). Depth over speed.

## RECOMMENDED SHAPE (the "best fit" answer)
Build ONE core library with THREE faces over it, so every surface shares the same engine:
1. **Core** (`/src/core`) — routing, fan-out, synthesis, scoring. No I/O assumptions.
2. **CLI** (`dr`) — you run it directly or your runners shell out to it.
3. **MCP server** — your existing 20-agent swarm calls it as a tool (`deep_research`, `model_panel`).
This gives you both: a standalone tool AND a swarm-callable tool, from one codebase. Recommended
because your agents can call the MCP face while you drive the CLI face for ad-hoc work — no duplication.

## STACK
TypeScript, Node 20+. One provider: OpenRouter (single API key → all models: Anthropic, Google,
xAI, OpenAI, DeepSeek, Qwen, Kimi, MiniMax, Xiaomi MiMo, etc.). pnpm. zod for schemas. p-queue for
concurrency. Vitest + Playwright (for any UI). Sentry optional. Config in `~/.dr/config.json` + env.

## MODEL ROUTING (tiers, not brands — refreshable)
Models are configured in `/config/models.json`, NOT hardcoded, because rankings change monthly.
Define ROLE TIERS; map each to an ordered list of OpenRouter model IDs with fallbacks:
- `reasoning` — deep analysis, synthesis, root-cause (e.g. top reasoning models of the moment)
- `coding` — code/bug research
- `long_context` — whole-repo / whole-corpus (1M-context models)
- `fast_cheap` — breadth sweeps, first-pass triage
- `creative` — naming, marketing angles
- `judge` — the cross-check/referee role (must differ from the panel it judges)
Each tier: { primary[], fallback[], max_cost_per_call, reasoning_effort }. A `dr models refresh`
command pulls OpenRouter's current rankings and PROPOSES tier updates for operator approval
(does not auto-swap). Include a documented default mapping seeded from current top models, with a
note that it must be refreshed.

## CORE CAPABILITIES
1. **Fan-out panel:** send one question to N models in parallel (configurable, default 5; supports 20+).
   Each model answers independently with required output contract: claims, sources, confidence %,
   explicit assumptions, explicit uncertainty.
2. **Cross-check / triangulation:** a `judge`-tier model (different from the panel) compares answers,
   flags agreements, conflicts, and unsupported claims. Claims surviving ≥3 independent models tier up.
3. **Synthesis:** merge into one brief: findings (tiered A1/A2/B2/B3 per the evidence-scoring skill),
   conflicts surfaced (never papered over), confidence %s, and what's still unknown.
4. **Web + deep research:** integrate web search/fetch tools (OpenRouter tool-calling or a pluggable
   search provider) so models cite live sources, not memory. Listen-to-chatter mode = forum/social
   query expansion, treated as input-to-verify.
5. **Iterative deepening:** if confidence < threshold, auto-spawn another round with refined queries
   targeting the weakest/most-conflicted claims. No time cap; keeps going until threshold or operator stop.
6. **SEM/SEO product discovery mode:** given a domain, run keyword/intent + competition + monetization
   research, return candidates ranked by PRIORITY % (value × winnability × fit) with a how-to % each,
   using the 70/20/10 effort split (operator domain / adjacent / wildcard).
7. **Bug research mode:** error signature → multi-source root-cause (docs, issues, CVEs, changelogs)
   → cause, evidence, fix, regression test, related risks.
8. **Cost/latency ledger:** record tokens, cost, latency per model per run; report but never gate.

## CLI SURFACE (`dr`)
```
dr research "<question>"            # full panel + synthesis brief
  --models <n>        panel size (default 5)
  --tier <name>       force a role tier
  --rounds <n|auto>   iterative deepening (default auto)
  --depth <0-3>       0 quick … 3 exhaustive (default 3 — max)
  --web / --no-web    live sources (default on)
  --chatter           include forum/social signal (verify-only)
  --judge <model>     referee override
  --json / --human    output format
dr discover "<domain>"              # SEM/SEO product-opportunity mode → ranked table
dr bug "<error or signature>"       # root-cause research mode
dr panel "<q>" --models a,b,c,...   # ad-hoc explicit model panel
dr models list|refresh|set          # manage role-tier → OpenRouter model mappings
dr config                           # set API key, defaults, thresholds
```
Config: `~/.dr/config.json`. Secrets via env (OPENROUTER_API_KEY). Exit 0/1/2. Streams progress.

## MCP SERVER (swarm-callable)
Tools:
- `deep_research(question, depth?, models?, web?, chatter?)` → synthesized brief (findings tiered,
  conflicts, confidence %s, unknowns, sources).
- `model_panel(question, model_ids[])` → raw per-model answers + judge cross-check.
- `discover_opportunities(domain)` → ranked candidates (priority %, how-to %).
- `research_bug(signature)` → root-cause report.
Resources: current model-tier config; last-run ledgers.
Prompts: "deep research this", "find high-value products in <domain>".
Manifest emitted to `/mcp/manifest.json`. Wiring guide for the existing 20-agent setup.

## OUTPUT CONTRACT (every run)
RESEARCH BRIEF: question · method (models used, rounds, web/chatter) · findings (tiered, with
confidence %) · conflicts (explicit) · unknowns · sources (deduped, tiered) · cost/latency ledger.
For discover: the ranked opportunity table. For bug: the root-cause report. Reviewable by a
human or a review agent; clear assumptions, cited sources, explicit uncertainty, no hidden invention.

## DELIVERABLES
- /src/core (router, fanout, judge, synthesizer, deepening, modes)
- /bin/dr (CLI)
- /src/mcp (server) + /mcp/manifest.json
- /config/models.json (seeded role tiers + refresh logic)
- tests (vitest), README (bootstrap + swarm wiring), .env.example, Dockerfile
- BUILD_LOG.md
