# LEDGER — Policy-of-Thoughts engine

Play-by-play for `scripts/pot-research/`, per `standards/LEDGER_STANDARD.md`. Newest first. Do not rewrite an entry; add a later one that points at it.

## 2026-11-11 15:10 UTC — ResearchRodneyAIArchitect — CPU engine beside the linear fan-out

- **Actor:** ResearchRodneyAIArchitect (Cursor cloud agent, Grok 4.7)
- **Requested by:** Audrey Evans, via work request #18341, routed by TriageChief on 2026-11-11 to ResearchRodneyAIArchitect with OptStability, ScaleBench, and ArchExplorer in support
- **Role:** executed
- **Files:**
  - `scripts/pot-research/` (added: engine, tests via `tests/pot-research.test.js`, this ledger)
  - `scripts/research-engine.js` (changed: strategy field and dispatch; the direct `runRalphLoop` call is commented in place)
  - `docs/research/pot-research-engine.md` (added)
  - `wr/issues/issue-18341-implement-pot-research-engine-with-mcts-grpo.md` (added)
  - `Library/pot-research-sources-2026-11-11.md` (added)
  - `CHANGELOG.md`, `package.json`, `wr/memory/decisions.jsonl`, `Library/README.md` (changed)
- **What was done:** Added UCT MCTS, a GRPO step on a per-problem adapter, a frozen base-weight vector, and a deterministic stub policy. The research orchestrator's linear fan-out remains the default. `RESEARCH_STRATEGY=pot` orders lanes with the CPU search and then calls the existing `runLane`. The benchmark harness reads the committed 6-prompt search rubric and reports the +20-30% criterion as not measured.
- **Decisions:** Keep the engine in `scripts/pot-research/` beside `scripts/research-engine.js`, because that file is the linear fan-out. Do not score the search rubric. Do not add a GitHub-hosted workflow. CircleCI already runs `tests/**/*.test.js` through `npm test`, so no new CircleCI job was added. GPU dollars in the doc are an estimate from public pages fetched 2026-11-11, not a rental.
- **Sources:** Jiao et al., arXiv:2601.20379; Meta Llama 4 blog, 2025-04-05; Qwen3-8B `config.json` fetched 2026-11-11; Spheron pricing page fetched 2026-11-11; Vast.ai marketplace snapshots dated 2026-11-10 and 2026-11-11. Copies of the citations are in `Library/pot-research-sources-2026-11-11.md`.
- **Commits / PRs:** branch `cursor/pot-mcts-grpo-engine-a685`, pull request opened from that branch. Refs #18341.
- **Open / handoff:** GPU spend needs Audrey's approval. A labeled set of 100 or more research examples is still required before the acceptance criterion can be measured. Later pull requests: a real LoRA policy on open weights, orchestrator integration at scale, and the measured comparison. Next owner: ResearchRodneyAIArchitect for the engine follow-ups, Audrey for the spend decision.
- **Credit note:** ResearchRodneyAIArchitect wrote the engine, tests, doc, and ledger. TriageChief assigned the work request. The paper authors defined the method being implemented. No GPU time was used.
- **Imprint note:** `node scripts/bnatsheaf/cli.js consistency_check --epsilon 1e-9` exited 0 with energy 0. `imprint_agent --agent ResearchRodneyAIArchitect` exited 1 because that name is not a stalk in the BIOME feed (`known: false`), not because an H¹ obstruction was present (`h1ApproxZero: true`, `obstructions: []`). The feed was not edited.
