# GOAP Swarm Console

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/goap-swarm-console/)**

> If the monorepo static path is not yet wired on Vercel, run locally on port **3012** (see Quick Start) or deploy this folder as its own Vercel project (`vercel.json` included).

## What It Is

**GOAP Swarm Console** is a Next.js SaaS planner that turns the WR-16500 Grok “GOAP + swarms” proposal into a **working, testable product**:

- Symbolic **Goal-Oriented Action Planning** (A* over world-state atoms)
- **Centralized allocator + decentralized executors** swarm topology
- **Awareness / precog / guilt** modules (numeric, not vibes)
- **Stigmergic trail** bias + evaporation
- **Research evaluation** of the attached PDF (bugs, better tech, SEO keywords, monetization, citations)
- Markdown / CSV export + JSON APIs for automations

**Market context:** Multi-agent orchestration interest is rising across OpenRouter, CrewAI, AutoGen, and swarm frameworks, yet most tools jump straight to LLM chat loops without a deterministic planner. This console sells the missing layer: cheap symbolic plans, then optional LLM workers.

---

## Features

- **Scenario presets** — fresh repo, failing tests, blocked recovery, preview-only ship
- **Live world-state toggles** — flip atoms and watch the plan recompute
- **Swarm assignment board** — role-aware agent picks with resource leases
- **Research tab** — validated claims, severity-tagged bugs, better-tech recommendations
- **Export tab** — Markdown run report + CSV assignments
- **API** — `GET/POST /api/plan`, `GET/POST /api/report`
- **No secrets required** for the free planner tier

---

## Quick Start

```bash
cd products/goap-swarm-console
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

### Try the API

```bash
curl -s http://localhost:3012/api/plan | jq .
curl -s -X POST http://localhost:3012/api/plan \
  -H 'content-type: application/json' \
  -d '{"goalId":"repo-green","world":{"workspaceReady":false}}' | jq .metrics
```

---

## Research outcome (WR-16500)

The attached Grok PDF mixes a memory export with a solid GOAP/swarm architecture sketch. Evaluation is embedded in the app (**Research eval** tab) and in `lib/goap-engine.js` → `RESEARCH_EVALUATION`.

| Area | Outcome |
| --- | --- |
| GOAP core | Validated — ship symbolic A* first |
| 200 agents @ 1–2ms | **Bug** — game-engine claim ≠ LLM swarm latency |
| guilt/precog/awareness | Validated only as **numeric** modules |
| Kafka/NATS default | Overkill — prefer GitHub-label stigmergy |
| Rust/WASM day-one | Defer until JS planner hits product-market fit |
| Monetization | Freemium console + Polar/Gumroad method packs |

---

## Monetization

- **Free:** interactive planner + research brief
- **Pro (Polar):** API metering, saved catalogs, multi-tenant trails — set `NEXT_PUBLIC_POLAR_CHECKOUT_URL`
- **Packs ($47–$197):** vertical method packs (repo-green swarm, research fleet, revenue scout)

---

## Deploy

```bash
cd products/goap-swarm-console
npx vercel --prod
```

Or include this product in the monorepo static docs export path used by other products.

---

## Engine API (Node)

```js
const {
  runSwarmTick,
  planGoap,
  getResearchEvaluation,
} = require("./lib/goap-engine");

const tick = runSwarmTick({ goalId: "repo-green" });
console.log(tick.metrics, getResearchEvaluation().bugsAndRisks.length);
```

---

## Related standards

- `GOAP.md` / `docs/Master_Inventory/GOAP_AGENT_STANDARD.md`
- `skills/openrouter-swarms/SKILL.md`
- `standards/GOAP_SWARM_RULES.md` (validated rule set from this WR)

---

Built for **midnghtsapphire/revvel-standards** · Closes WR-16500 scope for production-app delivery.
