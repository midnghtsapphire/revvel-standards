# WR: Oz OS — Research Intelligence Operating System (Parent)

**WR ID:** OZ-OS-001
**Type:** parent / index
**Status:** 🟡 Active — all 16 child deliverables shipped (see Completion audit); success criteria are longitudinal
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
- [x] OZ-OS-002 — Bootstrap `oz-os` repo skeleton
- [x] OZ-OS-003 — `intel.md` schema + 5 backfilled entries
- [x] OZ-OS-004 — `research-packs/` structure + 3 seed packs
- [x] OZ-OS-005a — `agents/method-hunter.md`
- [x] OZ-OS-005b — `agents/contrarian.md`
- [x] OZ-OS-005c — `agents/adjacent-domain.md`
- [x] OZ-OS-005d — `agents/synthesizer.md`
- [x] OZ-OS-005e — `agents/verifier.md`
- [x] OZ-OS-005f — `agents/archivist.md`
- [x] OZ-OS-006 — `tool-intelligence.md` + 4 backfilled tools
- [x] OZ-OS-007 — `reference-systems.md` (NotebookLM, OpenHands, n8n, LangGraph, CrewAI, AutoGen, GraphRAG, Perplexity)
- [x] OZ-OS-008 — `AUTONOMY_TIERS.md` (Tier 0–4)
- [x] OZ-OS-009 — `NULL_RESULT_SCHEMA.md`
- [x] OZ-OS-010 — `MISSION.md` at repo root
- [x] OZ-OS-011 — Update `revvel-standards/MASTER.md` pipeline steps 5.5–5.8
- [x] OZ-OS-012 — Add `docs/INTELLIGENCE_LAYER_STANDARD.md` to `revvel-standards`

## Completion audit (2026-11-07)

Each child box above was checked only after confirming its deliverable exists.
A checked box with no shippable artifact is a decoration, not a control
(`standards/VERIFY_THE_POSTCONDITION.md`), so the evidence is recorded here:

| WR | Deliverable | Verified at |
|----|-------------|-------------|
| OZ-OS-002 | repo skeleton | `oz-os/README.md`, `oz-os/MISSION.md` |
| OZ-OS-003 | intel schema + ≥5 entries | `oz-os/intel/SCHEMA.md` + 6× `oz-os/intel/INTEL-2026-00*.md` |
| OZ-OS-004 | research-packs + ≥3 seed packs | 4 packs under `oz-os/research-packs/` |
| OZ-OS-005a–f | 6 agent specs | `oz-os/agents/{method-hunter,contrarian,adjacent-domain,synthesizer,verifier,archivist}.md` |
| OZ-OS-006 | tool-intelligence + 4 tools | `oz-os/tool-intelligence/tools.md` |
| OZ-OS-007 | reference-systems | `oz-os/tool-intelligence/reference-systems.md` |
| OZ-OS-008 | AUTONOMY_TIERS | `oz-os/AUTONOMY_TIERS.md` |
| OZ-OS-009 | NULL_RESULT_SCHEMA | `oz-os/NULL_RESULT_SCHEMA.md` |
| OZ-OS-010 | MISSION at repo root | `oz-os/MISSION.md` |
| OZ-OS-011 | MASTER pipeline steps 5.5–5.8 | `MASTER.md` §1 (lines 44–53) |
| OZ-OS-012 | intelligence-layer standard | `docs/INTELLIGENCE_LAYER_STANDARD.md` (this repo) |

The six Success Criteria below are longitudinal (they measure reuse over
months of operation), so this parent stays Active rather than Complete.

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
