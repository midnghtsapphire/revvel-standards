# WR: Oz OS — Research Intelligence Operating System (Parent)

**WR ID:** OZ-OS-001
**Type:** parent / index
**Status:** 🟡 Active
**Owner:** @midnghtsapphire
**Tracks:** —
**Template:** custom (NOT WR_TEMPLATE_FULL.md — causes placeholder leakage, ref PR #14118, #14138, #14184)

## Core Realization
Oz OS is a Research Intelligence Operating System, not an agent framework.
The compounding asset is `intel.md`, `research-packs/`, `method-packs/` — not code.

## Optimization Target
Most agent systems optimize for **Answer Quality**.
Oz OS optimizes for **Method Discovery + Research Accumulation + Reusable Knowledge**.

## Hard Rules (apply to ALL children)

```
1. No raw tokens or bracket-placeholders reach main — enforced by wr-lint.mjs
2. Fix-class WRs MUST modify the buggy file — enforced by fix-wr-gate.mjs
3. No agent merges its own PR on oz-os repo
4. Evidence-Gated Autonomy: no research → no architecture → no code → no merge
5. Every failure writes an intel.md entry before the PR closes
6. NULL_RESULT is a valid output; fake completion is not
```

## Method Divergence Requirement
Before any solution is proposed, agents MUST produce a Method Pack with 10+ methodologies:
obvious, industry-standard, academic, open-source, enterprise, low-cost, historical,
adjacent-domain, contrarian, experimental. Scored by confidence / cost / risk / complexity / novelty / scalability.

## Children (ship independently, no big-bang)
- [ ] OZ-OS-002 — Bootstrap `oz-os` repo skeleton
- [ ] OZ-OS-003 — `intel.md` schema + 5 backfilled entries
- [ ] OZ-OS-004 — `research-packs/` structure + 3 seed packs
- [ ] OZ-OS-005a — `agents/method-hunter.md`
- [ ] OZ-OS-005b — `agents/contrarian.md`
- [ ] OZ-OS-005c — `agents/adjacent-domain.md`
- [ ] OZ-OS-005d — `agents/synthesizer.md`
- [ ] OZ-OS-005e — `agents/verifier.md`
- [ ] OZ-OS-005f — `agents/archivist.md`
- [ ] OZ-OS-006 — `tool-intelligence.md` + 4 backfilled tools
- [ ] OZ-OS-007 — `reference-systems.md` (NotebookLM, OpenHands, n8n, LangGraph, CrewAI, AutoGen, GraphRAG, Perplexity)
- [ ] OZ-OS-008 — `AUTONOMY_TIERS.md` (Tier 0–4)
- [ ] OZ-OS-009 — `NULL_RESULT_SCHEMA.md`
- [ ] OZ-OS-010 — `MISSION.md` at repo root
- [ ] OZ-OS-011 — Update `revvel-standards/MASTER.md` pipeline steps 5.5–5.8
- [ ] OZ-OS-012 — Add `docs/INTELLIGENCE_LAYER_STANDARD.md` to `revvel-standards`

## Out of Scope
- RIS-001 (electricity bar-chart-race) — separate WR
- RIS-002 (agentic infographic engine) — separate WR
- Rewriting existing products
- Replacing `revvel-standards`

## Success Criteria
- Method Hunter, Contrarian, Adjacent Domain all produce packs for one real topic
- Synthesizer merges them into a ranked decision
- Archivist writes the result to `intel.md`
- Six months later, a new WR on a related topic reuses 3+ intel entries without re-research
