# WR: [WR] Land Llama-Research-70B-v2 SCALE run-spec code via OpenHands

**Issue:** #17908  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-22  
**Research Date:** 2026-08-22  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

- **In Scope:** OpenHands will create a single PR that lands a lint-clean SCALE run-spec module for the Llama-Research-70B-v2 model (70B, 15T multilingual text and code, 2048 H100 / 60 day / 6.3e24 FLOP brief) plus tests.
- **In Scope:** The new files must be placed under the `products/` or `core/` directories, following the PR title conventional-commit format and addressing the issue in the body (`Closes #17908`). No placeholders, To Be Determined, or unfinished items.
- **Out of Scope:** Running the 2048-GPU training job. Waking OptStability, ArchExplorer, or ScaleBench is strictly prohibited. Dropping `bootstrap_repository_v14.py` or other throwaway scripts at the repository root.

## Approach

- Use the provided SCALE blueprint and `bootstrap_repository_v14.py` as source material/reference to write the run-spec module (do not commit the bootstrap file as a root file).
- The solution will be routed to OpenHands (since Roo is a review mention, not a collaborator).
- If an LLM is needed for assistance, use the repository keyless Perplexity path only (`docs/PERPLEXITY_NO_KEY_INTEGRATION.md`, `scripts/llm.js`, `scripts/perplexity-no-key-bridge.js`, `helallao/perplexity-ai`). Do not require `PERPLEXITY_API_KEY`.
- Follow `MASTER.md`, `START_HERE_CALL_CHAIN.md`, `VISITING_AGENTS.md`, and `wr-lint` constraints.
- Maintain data mix as “multilingual text and code” until the owner names specific sources.
- Operate in quiet mode: do not expect `wr-pr-creation.yml` to fire autonomously.

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows
- [ ] Files are placed under `products/` or `core/` (no root junk)
- [ ] No placeholders, unfinished items, or secrets in the PR
- [ ] After implementation, open a PR and trigger downstream workflows

## Risks & Mitigations

- **Risk:** Unintentional start of the expensive 2048-GPU training job.
  - **Mitigation:** Ensure the code is strictly a *run-spec module* and does not invoke execution commands during automated tests or setup.
- **Risk:** Waking OptStability, ArchExplorer, or ScaleBench.
  - **Mitigation:** Explicitly avoid triggers or calls that activate these related systems.
- **Risk:** Cluttering the repository root.
  - **Mitigation:** Adhere strictly to the `no-root-junk` rule, placing all module code in `products/` or `core/`.

## Competitor & Pricing Intelligence

N/A — This is an internal technical fix.

## Learnings — What & Why

When writing WR documents for internal CI/CD processes or technical workflows (like landing a run-spec), it is crucial to explicitly bound the operational scope (e.g., *do not start the training job*) to prevent automated agents from inadvertently executing expensive or disruptive downstream actions. We also observed that the `N/A — This is an internal technical fix` template matches internal infrastructure requests to avoid hallucinating market data for competitor intelligence.
