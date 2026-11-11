# LEDGER — revvel-standards

Play-by-play record per standards/LEDGER_STANDARD.md. Append-only. Newest first.
This file was absent at the repository root on 2026-11-11. This entry is the first one. No earlier entry was removed or rewritten.

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
