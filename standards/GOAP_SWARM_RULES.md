# GOAP Swarm Rules — Validated (WR-16500)

**Version:** 1.0.0  
**Date:** 2026-08-08  
**Status:** Active  
**Source WR:** [#16500](https://github.com/midnghtsapphire/revvel-standards/issues/16500)  
**Implementation:** `products/goap-swarm-console`

---

## Purpose

Codify the **production-safe** subset of the Grok “goap swarm new rules” document after evaluation. Agents and products must follow these rules when planning or coordinating multi-agent work.

---

## Hard rules

1. **Symbolic planner first.** World state, goals, actions (preconditions / effects / cost), A* (or equivalent) search. LLMs may propose actions or parse goals; they must not silently mutate the planner catalog without schema validation.
2. **Dictionary world state, not bare bitmasks.** Boolean-only bitmasks are optional optimizations after atom sets are frozen. Default is an ordered key-value state.
3. **Central allocator + decentralized executors** is the default topology for repo automation swarms. Fully decentralized mode is optional and requires stigmergic conflict rules.
4. **Reservations / leases are mandatory** before two agents may touch the same resource (file, PR, issue, deploy target). Leases carry `agentId` + TTL.
5. **Awareness, precog, guilt are numeric modules:**
   - **awareness** — anomaly list + score vs healthy baseline
   - **precog** — forward simulate plan; success probability + recommendation
   - **guilt** — weighted penalty on open high-priority goals; threshold triggers escalation (`spawn-recovery-swarm`)
6. **Self-heal loop:** Sense → Plan → Execute → Reflect (`learnings.md`) → Escalate. Never leave a sacred goal in limbo without a documented attempt.
7. **Stigmergy default transport = GitHub labels / shared world fields.** Do not require Kafka/NATS for single-repo fleets.
8. **Separate latency budgets.** Symbolic plan time ≠ LLM call time. Never cite game-engine “1–2ms / 200 agents” as SaaS multi-agent latency.
9. **Research scope stays public.** No “deep web” collection. Use GitHub, docs, academic, and allowed APIs.
10. **Cost governance.** Every swarm tick records plan cost, agents used, and guilt score. OpenRouter lanes must include a keyless fallback (see `scripts/openrouter-triage.js`).

---

## Recommended topologies

| Topology | When |
| --- | --- |
| Single GOAP agent | One deterministic path (write test, fix lint) |
| Central allocator + executors | Default multi-role WR execution |
| Hierarchical GOAP | Portfolio goals → project goals → actions |
| Stigmergic bias | Parallel agents sharing label/trail field |
| HTN methods + GOAP recovery | Happy-path methods; GOAP when methods break |

---

## Action schema

```json
{
  "id": "run-tests",
  "name": "Run test suite",
  "role": "tester",
  "preconditions": { "depsInstalled": true, "testsPassing": false },
  "effects": { "testsPassing": true, "testsObserved": true },
  "cost": 4
}
```

---

## Escalation

When `guiltScore >= threshold` (default 40):

1. Set `guiltHigh=true` in planning world
2. Prefer recovery actions (`deep-research`, `spawn-swarm`)
3. Deposit stigmergic trail on recovery actions
4. Surface status `watch` or `blocked` if precog success probability is low

---

## Product surface

Ship user-visible consoles for planners (Definition of Done: testable-live). Reference implementation:

- App: `products/goap-swarm-console`
- Engine: `products/goap-swarm-console/lib/goap-engine.js`
- Tests: product + `tests/goap-swarm-console.test.js`

---

## Monetization (prime directive)

Freemium planner → Pro API → vertical method packs on Polar/Gumroad. Every extension should either reduce Audrey’s daily input or open a paid surface.
