# WR: Implement PoT research engine with MCTS and GRPO

**Issue:** #18341
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards/issues/18341)
**WR Class:** research
**Priority:** P1
**Output Type:** internal-script-automation
**Domain:** intelligence-layer
**Owner:** ResearchRodneyAIArchitect
**Support:** OptStability, ScaleBench, ArchExplorer
**Tracking pull request:** the branch `cursor/pot-mcts-grpo-engine-a685` (Refs #18341, does not close it)

## Issue Context

The research orchestrator in `scripts/research-engine.js` fans lanes out in one pass (`runRalphLoop`). It does not search alternative reasoning orders, and it does not adapt a per-problem policy. Work request #18341 asks for a Policy-of-Thoughts engine: Monte Carlo tree search plus a group-relative update on a transient adapter, with the base model left untouched.

## Scope delivered in this tracking record

This record covers the first pull request of the series. Later pull requests are named in the handoff. They are not left as blank fields.

1. UCT Monte Carlo tree search over candidate steps, with a pluggable terminal reward, in `scripts/pot-research/mcts.js`. PUCT is selectable. UCT stays the default.
2. A GRPO step that centers advantages on the group and writes them only to a transient adapter, in `scripts/pot-research/grpo.js`.
3. A frozen base-weight vector and a deterministic stub policy, in `scripts/pot-research/policy.js`. A later LoRA module subclasses `Policy`. This pull request does not download Llama or Qwen weights.
4. A strategy switch. Unset or `linear` still calls `runRalphLoop`. `pot` searches a lane order and then calls the existing `runLane`. The direct `runRalphLoop` call remains in `scripts/research-engine.js` as a commented line with a disabled-block header.
5. Seeded unit tests in `tests/pot-research.test.js`. CircleCI already runs that file through `npm test` in `.circleci/config.yml`. No new CircleCI job and no GitHub-hosted workflow were added.
6. `scripts/pot-research/benchmark.js` reads the committed fixture at `products/rnd-research-fleet/eval/fixtures/queries.json` and reports the quality criterion as not measured.
7. `docs/research/pot-research-engine.md` documents the engine and a labelled GPU budget estimate. `scripts/pot-research/LEDGER.md` records the work.

## Acceptance status

- [x] Base model untouched on the CPU stand-in: tests hash the frozen vector before and after a run
- [x] Each opted-in problem can take its own lane order: the orchestrator test rewards one first lane and checks that PoT selects it while linear keeps definition order
- [x] GPU compute budget documented as an estimate, with the pages and the date
- [x] LEDGER.md updated at `scripts/pot-research/LEDGER.md`
- [ ] +20-30% research quality versus the linear fan-out. The harness reports `NOT_MEASURED`. The committed fixture has 6 search prompts and no acceptance labels. Inventing a delta is out of bounds for this record.
- [ ] Run on open-weight Llama 4 and Qwen3. No checkpoint is downloaded here. The policy class is the seam.

## Out of scope for this pull request

- Native reasoning APIs for GPT-4 or Claude.
- Training a new base model.
- Renting Spheron or Vast.ai. The doc estimates the cost. Spend waits on Audrey.

## Handoff

1. Audrey approves or declines GPU spend. The estimate is in `docs/research/pot-research-engine.md`.
2. A labeled set of at least 100 research examples has to be committed before ScaleBench can measure the criterion.
3. The next engine pull request wires a real LoRA policy on an open-weight model, still without writing the base weights.
4. A later pull request runs the orchestrator at scale and publishes the measured comparison. That comparison is the only place a quality delta may appear.

## Learnings — What and Why

- **What:** The linear fan-out was left callable and the new search was added beside it, behind an explicit strategy name.
- **Why:** Replacing `runRalphLoop` would make every current research packet depend on an unmeasured search. Opt-in keeps today's packets on the path their tests already cover.
- **Source:** `scripts/research-engine.js` function `runRalphLoop`, and Jiao et al., arXiv:2601.20379, for the search-plus-transient-adapter split.
