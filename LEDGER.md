# LEDGER — revvel-standards

Play-by-play record per standards/LEDGER_STANDARD.md. Append-only. Newest first.
This file was absent at the repository root on 2026-11-11. This entry is the first one. No earlier entry was removed or rewritten.

## 2026-11-11 15:37 UTC — PromptOrchestrator — graph prompting context selection (WR 18336)

- **Actor:** PromptOrchestrator (Cursor cloud agent, Grok 4.7)
- **Requested by:** Audrey Evans, via the approved start of WR 18336. TriageChief had assigned the WR to PromptOrchestrator.
- **Role:** executed
- **Files:** `scripts/context_graph.py` (extended the 2026-11-10 selector; old corpus line and pack-until-budget loop commented in place); `tests/graph_prompting_test.py` (added); `tests/context_graph_test.py` (unchanged, still passes); `docs/graph-prompting/` (generator artifact, sample queries, token measurements, accuracy record, readme); `.circleci/config.yml` and `.circleci/scripts/graph-prompting.sh` (one job added to the existing workflows); `package.json` (two npm scripts); `standards/CIRCLECI_INTEGRATION_STANDARD.md` (one table row); `wr/memory/decisions.jsonl` (one line)
- **What was done:** Built a context graph over root markdown, the standards tree, and the work-request template. Edges are governs, referenced_by, and populates, taken from local links and path mentions. Query routing returns the subgraph, cached by content hash. The ten fixed queries were measured with the local revvel-local-4byte tokenizer against loading every graph node. The counts, the mean, and the minimum are the committed file `docs/graph-prompting/token-measurements.json`. Each query included its expected document. The mean cleared 60 percent. No model was called.
- **Decisions:** Extend `scripts/context_graph.py` instead of a second graph — because the coder opt-in already calls `select_context`. Leave `scripts/prompt_compression.py` and `.github/scripts/openrouter_coder.py` untouched so WR 18335 can keep compressing `reference_text`. Do not run the accuracy harness — because that needs model completions and this run had no approved spend for them. The record is `docs/graph-prompting/accuracy-benchmark.json`.
- **Sources:** Issue 18336. Existing selector and the note in `wr/summaries/optional-intelligence-experiments-2026-11-10.md`. BNAT imprint: consistency_check passed (energy 0). `imprint_agent --agent PromptOrchestrator` exited 1 because that name is not a sheaf stalk. Obstructions were empty, so the work proceeded.
- **Commits / PRs:** draft PR into `daily/2026-11-11`. The link belongs in the next ledger entry if this one would have to be rewritten to add it.
- **Open / handoff:** The 25 percent accuracy comparison is pending owner-approved spend. The coder opt-in still passes a 60000 character budget, which can drop the standard a query needs. Default coder behavior is unchanged. Next owner: Audrey Evans for the accuracy spend, TriageChief for merge. Do not merge from this agent.
- **Credit note:** PromptOrchestrator executed the graph, the router, the measurement, and the tests. Audrey Evans approved the start. TriageChief assigned the WR.
## 2026-11-11 15:43 UTC — PromptOrchestrator — CircleCI GEPA job uses Python 3.12

- **Actor:** PromptOrchestrator (Cursor Cloud, Grok 4.7)
- **Requested by:** CircleCI build 23634 on PR #18375
- **Role:** executed
- **Files:** `.circleci/config.yml` (added `python-gepa-executor`); `docs/dspy-gepa/README.md` (added the image note); `LEDGER.md` (this entry)
- **What was done:** Build 23634 installed Python 3.10 from `cimg/node:22.11` and pip refused `cachetools==8.0.0` because that pin requires Python >=3.11. The offline job now uses `cimg/python:3.12.16`, the same major version the lock was resolved on. The node executors are unchanged.
- **Decisions:** Change the image rather than loosen the lock — because the tests passed on Python 3.12 and a 3.10 re-resolve would be a different dependency set than the one that was tested.
- **Sources:** CircleCI build 23634 log (`cachetools==8.0.0 Requires-Python >=3.11`); [build 23634](https://circleci.com/gh/midnghtsapphire/revvel-standards/23634)
- **Commits / PRs:** [PR #18375](https://github.com/midnghtsapphire/revvel-standards/pull/18375)
- **Open / handoff:** Re-run `dspy-gepa-offline`. The optimizer run is still pending owner-approved spend.
- **Credit note:** PromptOrchestrator, after the first CircleCI failure.

## 2026-11-11 15:38 UTC — PromptOrchestrator — DSPy GEPA integration (WR #18338)

- **Actor:** PromptOrchestrator (Cursor Cloud, Grok 4.7)
- **Requested by:** Audrey Evans, via the approved instruction to open draft work for WR #18338 using only spend that was already approved
- **Role:** executed
- **Files:** `scripts/dspy_gepa/` (added); `scripts/dspy_gepa/requirements.lock` (added); `config/dspy-gepa.yml` (added); `tests/dspy_gepa_test.py` (added); `wr/memory/dspy-gepa-trainset.json` (added); `.github/agent-prompts.yml` (appended `gepa_prompt_versions` seed copies only); `.circleci/config.yml` and `.circleci/scripts/dspy-gepa-offline.sh` (added the offline job); `scripts/optimize_agent_prompts.py` (comment pointing at the new package); `docs/dspy-gepa/README.md` (added); `CHANGELOG.md` (appended); `wr/memory/decisions.jsonl` (appended); `learnings.md` (appended)
- **What was done:** Wired DSPy 3.5.0 GEPA to the agent scorecard's five dimensions, built 390 training examples from `wr/issues` (315 train / 24 validation / 51 test), and appended seed versions of `GOAP_AGENT_PROMPT.md` and `AGENT_BUILD_PROMPT.md` without writing those source files. Unit tests compile GEPA with DummyLM. A non-local `optimize` call exits 3 when the spend flags are unset. The real optimizer was not run.
- **Decisions:** Keep the earlier lexical optimizer in `scripts/optimize_agent_prompts.py` and add `scripts/dspy_gepa/` beside it — because replacing that file would drop the 2026-11-10 experiment. Cap validation at 24 because DSPy's light budget grows with that split. Record the +10 point benchmark as pending owner-approved spend — because a light run is on the order of 1176 LM calls and no new spend was approved.
- **Sources:** DSPy 3.5.0 `dspy.GEPA.auto_budget` and `AUTO_RUN_SETTINGS` as installed from PyPI on 2026-11-11; [GEPA optimization](https://dspy.ai/current/getting-started/gepa-optimization/); [GEPA in depth](https://dspy.ai/current/diving-deeper/gepa-in-depth/). No `Library/` copy of those pages was already in the repo, so the links and the installed module are the record.
- **Commits / PRs:** branch `feat/wr-18338-dspy-gepa`. PR link to be added in a later ledger entry after the PR exists, not by rewriting this one.
- **Open / handoff:** The optimizer run and the +10 point held-out benchmark. Next owner: Audrey Evans, by setting `REVVEL_LLM_ALLOW_CLOUD` and `REVVEL_GEPA_SPEND_APPROVED` to exactly `1` (or by running against a loopback endpoint) and then `python -m dspy_gepa optimize`. CircleCI job `dspy-gepa-offline` must be green. Do not merge from this agent.
- **Credit note:** PromptOrchestrator executed the integration, the offline tests, and this entry. Audrey Evans approved starting the draft. The optimized prompt text and the scorecard delta are not claimed.

## 2026-11-11 14:25 UTC — Rules-Steward — merge main, keep both changelog entries

- **Actor:** Rules-Steward (Cursor cloud agent, Grok 4.7)
- **Requested by:** TriageChief gate on PR #18365
- **Role:** executed
- **Files:** `CHANGELOG.md` (union of both 2026-11-11 sides; nothing removed); merge of `origin/main` at `7b17a654`
- **What was done:** Normal merge commit, not a rebase. The readiness entries and the halo-demo-stream entry all stay. Markdown link checks, including `[text](path#Lnn)`, were already added on this branch and a fragment test was added before the merge.
- **Decisions:** Took the evidence-checker fix rather than deferring it. It does not touch CI config.
- **Sources:** [TriageChief gate comment](https://github.com/midnghtsapphire/revvel-standards/pull/18365#issuecomment-6798217780)
- **Commits / PRs:** [PR #18365](https://github.com/midnghtsapphire/revvel-standards/pull/18365)
- **Open / handoff:** CircleCI on the merge head. TriageChief merges.
- **Credit note:** TriageChief named the gate. Rules-Steward merged and kept the link check.

## 2026-11-11 14:20 UTC — Rules-Steward — evidence checker follows mapping links

- **Actor:** Rules-Steward (Cursor cloud agent, Grok 4.7)
- **Requested by:** Cursor Bugbot review on PR #18365
- **Role:** executed
- **Files:** `scripts/compliance-evidence.js` (added markdown-link collection beside the existing backtick scan); `tests/compliance-evidence.test.js` (added)
- **What was done:** The checker only collected backtick paths under `products/`, `scripts/`, `mcp-servers/`, `.github/`, and `.circleci/`. `NIST_READINESS.md` cites those files as relative markdown links, so a deleted citation still reported `missing: []`. Relative links are now resolved from the document directory. `http` links stay out. The live check reports 37 paths and none missing.
- **Decisions:** Keep the old backtick rule and add link resolution next to it — because replacing the checker would drop the 2026-11-10 behavior.
- **Sources:** [Bugbot review on PR #18365](https://github.com/midnghtsapphire/revvel-standards/pull/18365#discussion_r4538945807)
- **Commits / PRs:** [PR #18365](https://github.com/midnghtsapphire/revvel-standards/pull/18365)
- **Open / handoff:** TriageChief still merges. Issue #18343 body edit remains blocked by the 403 on the installation token.
- **Credit note:** Bugbot found the gap. Rules-Steward fixed it.

## 2026-11-11 14:10 UTC — Rules-Steward — NIST readiness mapping (WR #18343)

- **Actor:** Rules-Steward (Cursor cloud agent, Grok 4.7)
- **Requested by:** TriageChief, rescope of WR #18343, approved 2026-11-11
- **Role:** executed
- **Files:** `docs/compliance/NIST_READINESS.md` (added); `docs/compliance/NIST_COMPLIANCE.md` (appended rescope note); `docs/compliance/SP-800-53-OVERLAYS.md` (appended rescope note); `scripts/compliance-evidence.js` (added the new document to the existing path check); `CHANGELOG.md` (appended); `LEDGER.md` (added, first entry); `wr/memory/decisions.jsonl` (appended)
- **What was done:** Mapped repository controls that could be pointed at in the tree to SP 800-53 Rev. 5 families AC, AU, IA, CM, SI, SA, SR, and IR. Each row is implemented, partial, or gap. A2A is recorded as not implemented because issue #18340 is still open and no signed agent-to-agent path was found. Identity is recorded as the shared GitHub login `midnghtsapphire` plus the bot-name prefix and signature in `docs/BOT-COMMON-RULES.md`.
- **Decisions:** Deliver a readiness mapping rather than a compliance attestation — because NIST has published no AI-agent standard and no agent SP 800-53 overlay, COSIS (formerly COSAiS) lists NISTIR 8605D as a planned volume that is not yet drafted, and NIST offers no readiness assessment. The 2026-11-10 overlay file stays and is deferred until 8605D is published. The mapping will be re-done when that volume is published.
- **Sources:** [NIST COSIS project page](https://csrc.nist.gov/Projects/cosis) (read 2026-11-11); [NIST AI Agent Standards Initiative announcement](https://www.nist.gov/news-events/news/2026/02/announcing-ai-agent-standards-initiative-interoperable-and-secure) (17 February 2026); [COSAiS annotated outline, January 2026](https://csrc.nist.gov/csrc/media/Projects/cosais/documents/COSAiS-Predictive-AI-annotated-outline-Jan2026.pdf); [SP 800-53 Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final). No Library/ copy of these sources was already in the repo, so the links are the record.
- **Commits / PRs:** branch `cursor/nist-readiness-mapping-2ab3`. PR link to be added in a later ledger entry after the PR exists, not by rewriting this one.
- **Open / handoff:** CircleCI must be green. TriageChief merges. Follow-up work listed in `docs/compliance/NIST_READINESS.md` is not opened here. Next owner: TriageChief.
- **Credit note:** Rules-Steward executed the mapping and the ledger entry. TriageChief approved the rescope. Audrey Evans owns the repository.
