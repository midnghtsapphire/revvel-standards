# HANDOFF — CUDA Execution-Model Rollout (Grid in progress)

## Status: 🟡 BLOCK 0 OF 5 SHIPPED — awaiting owner review

Grid decomposed into 5 Blocks. Block 0 (the rule change that governs the rest) is shipped as draft PR #15668. The rule now says: do not launch Block 1 until Block 0 is approved. I am dogfooding the rule.

---

## The Grid — CUDA Execution-Model for Agent Fleets

**Metaphor:** Host directs → Grid contains Blocks → Blocks contain Threads (agents). On top: Watchdog LLM scores semantics; Code Verifier deterministically checks contracts. All fleet memory retrieved on boot via the memory system.

Rename map (embedded / CUDA vocabulary throughout code):

| Role | Name |
|---|---|
| LLM boss (routing + SLA watch) | **Host** |
| Business problem / WR | **Grid** |
| Fleet (Research / Build / Review / Testing) | **Block** |
| Individual agent instance | **Thread** |
| Audit + scorecard stream | **Bus** |
| Live semantic reviewer LLM | **Watchdog** |
| Deterministic contract checker | **Code Verifier** |
| Rubric / config | **Firmware** |
| Memory index | **Flash** |
| Session-start context injection | **Boot ROM** |
| Fleet manifest | **Device Tree** |
| Coda dashboard | **Dashboard** |

---

## Blocks

| # | Block | Status | PR | Files |
|---|---|---|---|---|
| 0 | **Checkpoint rule** — the mechanic that gates every other Block | ✅ shipped as draft | #15668 | docs/AGENTS.md, docs/DEFINITION_OF_DONE.md, .github/labels.yml, DECISIONS.md D011, wr/memory/decisions.jsonl |
| 1 | **Host + Device Tree + Agent Contract Schema** — reads WR, decomposes into Grid, generates agent-contract.yml, launches Kernels via existing agent-fallback.yml | ⏳ blocked on #15668 approval | — | config/device-tree.yml, scripts/host.mjs, schemas/agent-contract.schema.json, .github/workflows/host.yml, tests/host.test.js |
| 2 | **Watchdog + Code Verifier** — semantic LLM check on every bus event + deterministic contract check on every Kernel completion. Writes to wr/memory/watchdog.jsonl. Uses cheap-model tier via OpenRouter (Octopus lane); contrarian family default | ⏳ blocked on Block 1 | — | scripts/watchdog.mjs, scripts/code-verifier.mjs, config/watchdog-firmware.yml, tests |
| 3 | **Memory Retrieval + Boot ROM Injection** — minisearch (BM25, ~15KB MIT, no binary deps) over all memory files → wr/memory/index.jsonl. agent-factory/hooks/on-start-inject-memory.sh writes MEMORY_CONTEXT.md before every Thread starts. Rebuild workflow on push + nightly | ⏳ blocked on Block 2 | — | scripts/memory/{index,retrieve,distill}.mjs, agent-factory/hooks/on-start-inject-memory.sh, .github/workflows/memory-index.yml, tests |
| 4 | **Docs: CUDA_AGENT_MODEL + AGENT_APP_LINEUP** — the diagram + naming reference for coders; the plain-English lineup guide for the owner. Seeded from 90-day WR scan. Log D012–D014 | ⏳ blocked on Block 3 | — | docs/CUDA_AGENT_MODEL.md, docs/AGENT_APP_LINEUP.md, DECISIONS.md |

**Deferred (post-Grid):**
- **Coda Dashboard** — owner needs to add `CODA_API_TOKEN` + `CODA_CONTROL_TOWER_DOC_ID` secret. Fallback available: GitHub Pages dashboard driven by same data. Not needed to ship the Grid.
- **Local GPU / Ollama lane** — real future PR; requires actual GPU host. Watchdog can route through it via OpenRouter-compatible endpoint without code change.
- **OpenRouter root-cause fix** — no specific failure signature was shared. If a specific run URL surfaces, add as a targeted PR.
- **90-day WR scan for lineup doc** — do this at start of Block 4, not before.

---

## Resume Command

When owner marks #15668 `checkpoint-approved` (or comments `next`, or merges), the next agent picks up here:

```bash
cd /workspace/project/revvel-standards
git checkout main && git pull
git checkout -b feat/cuda-block-1-host
# 1. Create config/device-tree.yml — declarative Block roster
# 2. Create schemas/agent-contract.schema.json — Draft-7, tested per state.schema.json precedent (see learnings.md 2026-05-20)
# 3. Create scripts/host.mjs — reads WR, decomposes into Grid, writes agent-contract.yml, dispatches to agent-fallback.yml
# 4. Create .github/workflows/host.yml — triggers on WR-labeled issues, timeout-minutes: 30
# 5. Create tests/host.test.js — round-trip a fixture WR, assert generated agent-contract validates against schema
# 6. Log D012 in DECISIONS.md; add JSONL entry in wr/memory/decisions.jsonl
# 7. Commit as feat(cuda): Block 1 - Host + device-tree + agent-contract schema
# 8. Open PR titled: "feat(cuda) Host + Device Tree + Agent Contract [checkpoint: block-1 of 4]"
# 9. Label the PR: checkpoint-gated
# 10. Stop. Do not start Block 2. Update this HANDOFF.md to move Block 1 to "shipped, awaiting review".
```

---

## Session-1 Summary (2026-07-10)

- ✅ Ingested repo (AGENTS.md, VISITING_AGENTS.md, GOAP.md, GOAL.md, learnings.md tail, SYSTEM_STATE.md, HANDOFF.md prior, ASSUMPTIONS.md, DECISIONS.md, wr/memory/decisions.jsonl)
- ✅ Verified Mabl "local free" claim (real but requires paid SaaS workspace; kept D010 archived)
- ✅ Verified Keploy has both a GitHub App (free unit-test AI) and a GitHub Action (`keploy/testGPT`, FOSS)
- ✅ Named the meta-orchestrator using embedded/CUDA vocabulary (Host, Grid, Block, Thread, Bus, Watchdog, Code Verifier, Firmware, Flash, Boot ROM, Device Tree)
- ✅ Restored baseline green (503/505 → 505/505; two pre-existing drift issues)
- ✅ Shipped PR-A (draft #15668) — checkpoint-gated Grid rule + D011
- ✅ Updated `learnings.md`, `DECISIONS.md`, `wr/memory/decisions.jsonl`, `HANDOFF.md`
- ⏸️ Stopped per the new rule; PR-B awaits owner approval on #15668

## Decisions Locked This Session

- **D011** — Checkpoint-gated Grids (see DECISIONS.md and wr/memory/decisions.jsonl)

## Assumptions Locked This Session (none new; carried forward)

- A001–A004 unchanged
- Implicit: Owner will approve the rule with normal review turnaround. If it stalls, other work in the repo continues unaffected — this rule is opt-in via label.

---

## For the Next Agent

1. Read `docs/AGENTS.md` § Checkpoint-Gated Grids first.
2. Do not launch Block 1 until #15668 is approved (`checkpoint-approved` label, `next` comment, or merged).
3. When you do launch Block 1, follow the Resume Command above verbatim.
4. Every Block PR must be complete — no scaffolding, no TODO, no phased language.
5. Update this HANDOFF.md every Block. Move rows from `⏳` to `✅ shipped, awaiting review` to `✅ approved`.
6. SYSTEM_STATE.md updates only after ALL Blocks are approved (per D011).
