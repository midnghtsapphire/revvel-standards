# LEDGER — revvel-standards

Play-by-play record per standards/LEDGER_STANDARD.md. Append-only. Newest first.
This file was absent at the repository root on 2026-11-11. This entry is the first one. No earlier entry was removed or rewritten.

## 2026-11-11 16:10 UTC — PromptOrchestrator — retired --root stays visible

- **Actor:** PromptOrchestrator (Cursor cloud agent, Grok 4.7)
- **Requested by:** Gitar review on PR #18377
- **Role:** executed
- **Files:** `scripts/prompt_compression_accuracy.py` (commented the first-cut read and the old `--root` option back in); `tests/prompt_compression_test.py` (the CLI test passes `--root` and still scores); `wr/memory/decisions.jsonl` (appended); `CHANGELOG.md` (appended); `LEDGER.md` (this entry)
- **What was done:** The 16:05 commit removed the `--root` option and the first-cut read comment. Both are commented in place again, with the date, agent, and PR. `--root` is registered and ignored. The directory walk still uses `os.getcwd()`, so an old `--measurement X --root DIR` command is not argparse's unrecognized-argument exit.
- **Decisions:** Keep the flag accepted and ignored — because commenting it out alone makes that command exit 2, the same code as a path failure.
- **Sources:** [Gitar review on PR #18377](https://github.com/midnghtsapphire/revvel-standards/pull/18377#discussion_r4540214378)
- **Commits / PRs:** [PR #18377](https://github.com/midnghtsapphire/revvel-standards/pull/18377)
- **Open / handoff:** Sonar re-scan of `9729ab97f` is still pending. Same-task accuracy judge still pending owner-approved spend. Next owner: TriageChief.
- **Credit note:** Gitar flagged the deletion. PromptOrchestrator restored the lines.

## 2026-11-11 16:05 UTC — PromptOrchestrator — accuracy read walks directory entries

- **Actor:** PromptOrchestrator (Cursor cloud agent, Grok 4.7)
- **Requested by:** SonarQube Cloud re-scan of `08233bfb1` on PR #18377. pythonsecurity:S8707 stayed open.
- **Role:** executed
- **Files:** `scripts/prompt_compression_accuracy.py` (read path is a scandir entry, not a joined CLI string); `tests/prompt_compression_test.py` (added a missing-file case and a working-directory CLI call); `docs/prompt-compression.md` (one sentence); `wr/memory/decisions.jsonl` (appended); `CHANGELOG.md` (appended); `LEDGER.md` (this entry)
- **What was done:** The realpath-plus-commonpath check did not clear Sonar's taint trace into `read_text`. `measurement_json` now walks `os.scandir` from the working directory and reads `entry.path` after a name match. Absolute paths, `.`, and `..` are refused before the walk. The 15:59 join is commented in the function.
- **Decisions:** Rebuild the path from directory entries — because Sonar's S8707 rule does not treat `realpath` and `commonpath` as a sanitizer.
- **Sources:** [Sonar issue on PR #18377](https://sonarcloud.io/project/issues?id=midnghtsapphire_revvel-standards&pullRequest=18377&issueStatuses=OPEN,CONFIRMED&sinceLeakPeriod=true)
- **Commits / PRs:** [PR #18377](https://github.com/midnghtsapphire/revvel-standards/pull/18377)
- **Open / handoff:** The quality gate stays red until Sonar re-scans this commit. Same-task accuracy judge still pending owner-approved spend. Next owner: TriageChief.
- **Credit note:** SonarQube Cloud reported the remaining taint. PromptOrchestrator changed the read.

## 2026-11-11 16:00 UTC — PromptOrchestrator — CLI paths stay inside --root

- **Actor:** PromptOrchestrator (Cursor cloud agent, Grok 4.7)
- **Requested by:** SonarQube Cloud quality gate on PR #18377, rule pythonsecurity:S8707
- **Role:** executed
- **Files:** `scripts/prompt_compression_accuracy.py` (path check added; the direct `args.measurement` read is commented); `scripts/prompt_compression.py` (`contained_path` added for `compress --file` and `measure --output`); `tests/prompt_compression_test.py` (added); `docs/prompt-compression.md` (one sentence); `wr/memory/decisions.jsonl` (appended); `CHANGELOG.md` (appended); `LEDGER.md` (this entry)
- **What was done:** `--measurement`, `compress --file`, and `measure --output` must be relative paths. `os.path.realpath` plus `os.path.commonpath` rejects absolute paths and `..` escapes before any read or write. The paid-judge flag still returns 3 before opening a file.
- **Decisions:** Refuse absolute paths — because joining an absolute path onto `--root` drops the root on POSIX, and the Sonar finding is an agent-supplied path read.
- **Sources:** [Sonar quality gate on PR #18377](https://sonarcloud.io/dashboard?id=midnghtsapphire_revvel-standards&pullRequest=18377)
- **Commits / PRs:** [PR #18377](https://github.com/midnghtsapphire/revvel-standards/pull/18377)
- **Open / handoff:** Same-task accuracy judge still pending owner-approved spend. Next owner: TriageChief.
- **Credit note:** SonarQube Cloud reported the path finding. PromptOrchestrator constrained the paths.

## 2026-11-11 15:55 UTC — PromptOrchestrator — measure must not overwrite its record

- **Actor:** PromptOrchestrator (Cursor cloud agent, Grok 4.7)
- **Requested by:** Gitar review on PR #18377
- **Role:** executed
- **Files:** `scripts/prompt_compression.py` (added a destination check and a non-zero exit); `tests/prompt_compression_test.py` (added); `docs/prompt-compression.md` (appended the new command behavior); `wr/memory/decisions.jsonl` (appended); `CHANGELOG.md` (appended); `LEDGER.md` (this entry)
- **What was done:** `measure` no longer defaults `--output` to `wr/measurements/llmlingua2-governance-2026-11-11.json`. With no `--output` it prints the summary and writes nothing. An existing path raises `FileExistsError` and the command exits 2. A run with any term-loss rejection also exits 2. The old default argument line is commented in place. The committed JSON was not rewritten.
- **Decisions:** Refuse an existing file rather than writing a new dated name automatically — because the operator chooses the path, and a silent new file would still look like a second record nobody asked to commit.
- **Sources:** [Gitar review on PR #18377](https://github.com/midnghtsapphire/revvel-standards/pull/18377#issuecomment-6800319486)
- **Commits / PRs:** [PR #18377](https://github.com/midnghtsapphire/revvel-standards/pull/18377)
- **Open / handoff:** Same-task accuracy judge still pending owner-approved spend. The Azure blob failures Gitar reported on GitHub Actions are outside this change. CircleCI on the previous head was green. Next owner: TriageChief.
- **Credit note:** Gitar requested the two changes. PromptOrchestrator applied them.

## 2026-11-11 15:45 UTC — PromptOrchestrator — LLMLingua-2 governance compression (WR #18335)

- **Actor:** PromptOrchestrator (Cursor cloud agent, Grok 4.7)
- **Requested by:** Audrey Evans, 2026-11-11, approved starting the draft pull requests on already-approved spend and posting honest status. TriageChief routed #18335 to PromptOrchestrator.
- **Role:** executed
- **Files:** `scripts/prompt_compression.py` (extended); `scripts/prompt_compression_accuracy.py` (added); `scripts/requirements-llmlingua.txt` (added); `tests/prompt_compression_test.py` (extended); `docs/prompt-compression.md` (added); `wr/measurements/llmlingua2-governance-2026-11-11.json` (added); `.circleci/config.yml` (job `prompt-compression` added on both workflows); `wr/summaries/optional-intelligence-experiments-2026-11-10.md` (appended); `CHANGELOG.md` (appended); `wr/memory/decisions.jsonl` (appended); `LEDGER.md` (this entry)
- **What was done:** Extended the existing local LLMLingua-2 adapter. Default keep-rate remains 0.3. Force tokens remain UPREV, WR, and MCP, plus `REVVEL_FORCE_TOKENS` or a caller list. A whole-token match replaced the substring check after the first measurement rejected three files because WRONG, WRs, and WRAPPED contain the letters WR. The substring check is commented in place. Ran `microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank` on CPU over the context-graph index (root Markdown plus `standards/**/*.md`). Full index: 141 files, 1,179,598 characters, 299,593 tokens to 89,978 tokens, ratio 3.3296250194491988, 0 term-loss rejections. Reference subset (what the coder compresses): 137 files, 285,009 to 85,707, ratio 3.325387657950926. Counts are tiktoken gpt-3.5-turbo via LLMLingua-2. No paid LLM call. The same-task accuracy harness records that score and refuses a paid judge.
- **Decisions:** Default model is the smaller official MeetingBank checkpoint — because that is the checkpoint that was loaded and measured on this 16GB CPU host. The 2026-11-10 large checkpoint name stays selectable via `REVVEL_LLMLINGUA_MODEL` or `--model`. Mandatory governance files stay uncompressed on the coder path — because the 2026-11-10 adapter refused to let compression weaken owner instructions. The accuracy judge was not run — because it would be a new paid call and this task allows only spend that is already approved.
- **Sources:** [Microsoft LLMLingua compressor](https://github.com/microsoft/LLMLingua/blob/main/llmlingua/prompt_compressor.py); [LLMLingua-2 evaluation compress.py](https://github.com/microsoft/LLMLingua/blob/main/experiments/llmlingua2/evaluation/compress.py). No Library/ copy of those files was already in the repo, so the links are the record. Measured counts: `wr/measurements/llmlingua2-governance-2026-11-11.json`.
- **Commits / PRs:** branch `feat/wr-18335-llmlingua2`. PR link to be added in a later ledger entry after the PR exists, not by rewriting this one.
- **Open / handoff:** Same-task accuracy benchmark remains pending owner-approved spend. CircleCI job `prompt-compression` runs the deterministic tests. TriageChief merges. Next owner: TriageChief.
- **Credit note:** PromptOrchestrator executed the integration and the local measurement. Audrey Evans approved the spend limit and the draft pull request. TriageChief assigned the work request.
## 2026-11-11 16:30 UTC — QuickWinBuilder — drop folders process themselves; dashboard build prepared (WR #18379)

- **Actor:** QuickWinBuilder (MoneyCrew Builder, Grok Bot)
- **Requested by:** TriageChief, relaying Audrey ("Perfect. Figure it out.")
- **Role:** executed
- **Files:** `config/drop-folders.json` (routing table); `scripts/drop-folder-process.js`; `tests/drop-folder-process.test.js`; `.circleci/config.yml` (two jobs added, none changed); `.github/workflows/update-project-dashboard.yml` (comment header only); `docs/DROP_FOLDERS.md`; `docs/DASHBOARD_HOSTING.md`; `Library/drop-folders/README.md`; `Library/README.md`; `CHANGELOG.md`
- **What was done:** A push-triggered CircleCI job reads the changed `.md` files in the 8 drop folders and runs the handler the table names: inbox intakes go through the existing runner-orchestrator in dry-run, research-drafts topics are checked and digested, per-source buckets are routed to a research-drafts topic. Report-only, with a secret scan. A second job builds the dashboard and has a Cloudflare Pages Direct Upload deploy that skips until its token exists.
- **Decisions:** Path filtering is done in the job from the table instead of the setup-workflow and path-filtering orb, because a setup config breaks every job while the project's dynamic-config setting is off. Results are artifacts, not commits, because writing back needs a push token. The superseded Actions workflow is annotated, not removed.
- **Not done:** Pages was not enabled, no Cloudflare or Vercel project was created, no secret was set, nothing was merged. NotebookLM auto-pull is only scoped (#18380).
- **Sources:** [WR #18379](https://github.com/midnghtsapphire/revvel-standards/issues/18379), [WR #18380](https://github.com/midnghtsapphire/revvel-standards/issues/18380), `Library/drop-folders/README.md`
- **Commits / PRs:** see the draft PR linked from WR #18379
- **Open / handoff:** Audrey's yes on the items listed in the PR body. TriageChief merges.
- **Credit note:** Conventions are from PR #14871 and PR #13637. The orchestrator and the dashboard generator already existed and are reused unchanged.
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
