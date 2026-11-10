# @midnght/deep-research

The missing build: a multi-model deep-research orchestrator. One core, three faces (CLI, MCP, library).
Fans a question across many OpenRouter models in parallel, cross-checks with an independent judge,
and synthesizes a tiered brief. Beats single-vendor research by using N models as independent witnesses.

## Why this shape
There is no permanent "best" model — rankings shift monthly. So models are config, not code
(`config/models.json`, role tiers not brand tiers), and the value is the operational layer:
fan-out, triangulation, iterative deepening, and a reviewable output contract.

## Setup
1. `pnpm install`
2. `export OPENROUTER_API_KEY=...`  (one key = all models: Anthropic, Google, xAI, OpenAI, DeepSeek, Qwen, Kimi, MiniMax, MiMo...)
3. CLI: `node bin/dr.mjs research "your question"`

## CLI
- `dr research "<q>"` — panel + iterative synthesis brief
- `dr panel "<q>" --models a,b,c` — explicit model panel + judge
- `dr discover "<domain>"` — SEM/SEO opportunity research, ranked by priority %
- `dr bug "<signature>"` — root-cause research
- `dr models list|refresh|set` — manage model tiers
- flags: `--models n` `--rounds auto|n` `--no-web` `--json`

## Wire into your 20-agent swarm (MCP)
Run the MCP server (`src/mcp` per BUILD_SPEC) and register `mcp/manifest.json` with your orchestrator.
Agents then call `deep_research`, `model_panel`, `discover_opportunities`, `research_bug` as tools.
Recommended: agents call the MCP face; you drive the CLI face for ad-hoc work. Same engine.

## Keeping models current
`dr models refresh` pulls OpenRouter's current rankings and PROPOSES tier updates for approval
(never auto-swaps). Refresh monthly. Default tiers seeded ~May 2026 — verify before relying.

## Output contract (every run)
Findings tiered A1/A2/B2/B3 · conflicts surfaced explicitly · per-claim confidence % · unknowns ·
deduped sources · cost/latency ledger. Reviewable; no hidden invention.
