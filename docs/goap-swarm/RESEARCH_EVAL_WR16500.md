# Research evaluation — WR-16500 GOAP & Swarms

**WR:** [#16500](https://github.com/midnghtsapphire/revvel-standards/issues/16500)  
**Source PDF:** [goap.swarm.new.rules.pdf](https://github.com/user-attachments/files/30204695/goap.swarm.new.rules.pdf)  
**Evaluated:** 2026-08-08  
**Product:** `products/goap-swarm-console`

## What the PDF actually is

The attachment is a **Grok memory export** plus a follow-up architecture exploration covering:

- Classical GOAP (world state, goals, actions, A*)
- Swarm patterns (central allocator, decentralized, hierarchical, hybrid LLM)
- Fake-consciousness modules (`awareness.md`, `precog.md`, `guilt.md`)
- Stigmergy and Ant Colony Optimization notes
- Integration ideas for Revvel-Standards / GrowlingEyes / audit-chains

## Checklist (repo research standard)

| Required item | Result |
| --- | --- |
| Marketing / SEO keywords | Yes — see product Research tab + engine `marketingKeywords` |
| Stars / sources for tools | Cited Orkin GOAP, stigmergy, in-repo skills/standards (not inflated star counts for untracked tools) |
| Monetization path | Freemium SaaS + Polar/Gumroad method packs |
| Factual citations | Orkin GOAP notes; Grassé stigmergy; `GOAP_AGENT_STANDARD`; `openrouter-swarms` skill |

## Bugs found in the proposal

1. **Performance mistranslation (high):** “200 agents @ 1–2ms” is a game-sim figure, not LLM swarm reality.
2. **Bitmask world state (medium):** Breaks once atoms are non-boolean or numerous.
3. **Missing lock semantics (high):** Reservations mentioned without lease algorithm.
4. **Guilt as emotion (low):** Untestable unless numeric.
5. **LLM-inferred preconditions (medium):** Unsafe without schema validation.
6. **Kafka-by-default (low):** Ops heavy vs label stigmergy.
7. **Deep-web research (medium):** Policy/legal risk — rejected.

## Better tech we shipped instead

- Dictionary world state + A* GOAP in pure JS
- Lease-based swarm assignment
- Numeric awareness / precog / guilt
- Stigmergic trail bias with decay
- OpenRouter-ready monetization path without requiring keys for the free tier
- Defer Rust/WASM until PMF

## Implementation mapping

| Rule | Code |
| --- | --- |
| plan | `planGoap` |
| swarm assign | `assignSwarm` |
| awareness | `runAwareness` |
| precog | `runPrecog` |
| guilt | `runGuilt` |
| tick | `runSwarmTick` |
| research payload | `RESEARCH_EVALUATION` |
