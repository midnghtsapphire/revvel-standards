# LEDGER — revvel-standards

Play-by-play record per standards/LEDGER_STANDARD.md. Append-only. Newest first.
This file was absent at the repository root on 2026-11-11. This entry is the first one. No earlier entry was removed or rewritten.

## 2026-11-19 17:25 America/Denver — Git-Master — merge daily/2026-11-14 into the toolkit branch (PR #18496)

- **Actor:** Git-Master
- **Requested by:** Audrey Evans (t133u, 19 Nov 2026): "ya fix it all and merge it".
- **Role:** executed
- **Files:** `LEDGER.md` (conflict resolved by keeping both sides' entries); `CHANGELOG.md` (merged cleanly). Everything else comes from the base: PR #18498 (copilot-instructions.md synced to AGENTS.md, so `lint-and-test` can pass).
- **What was done:** Merged the base `daily/2026-11-14` into `git-master/toolkit-ci-18494` with a normal merge. No force-push, nothing deleted.
- **Commits / PRs:** PR #18496.

## 2026-11-19 17:05 America/Denver — Git-Master — fix the PR-number guard in pr-hygiene-check (WR #18494)

- **Actor:** Git-Master
- **Requested by:** TriageChief, 19 Nov 2026 (review of the sibling PR reese-reviews#98, same guard). `RELAYED` (A6). Audrey (t133u, 19 Nov 2026): "ya fix it all and merge it".
- **Role:** executed
- **Files:** `.circleci/config.yml` (only the `pr-hygiene-check` job); `CHANGELOG.md`; `LEDGER.md`.
- **What was done:** The job skipped itself because `CIRCLE_PULL_REQUEST` is empty on GitHub App pipelines. It now resolves the PR number from that variable, then `pipeline.event.github.pull_request.number`, then the commit-to-PR API, and logs which one it used. Still advisory (`exit 0`).
- **Decisions:** No `.github/workflows` file touched. No job deleted. `toolkit-weekly-report.yml` untouched. The unrelated `CIRCLE_PULL_REQUEST` mention at the label-check job was left alone.
- **Commits / PRs:** PR #18496.
- **Open / handoff:** Confirm in the CircleCI step log that the check ran.

## 2026-11-19 16:40 America/Denver — Git-Master — github-free-toolkit in CircleCI (WR #18494)

- **Actor:** Git-Master
- **Requested by:** Audrey Evans, 19 Nov 2026, relayed by TriageChief in WR #18494. `RELAYED` (A6): this is the WR scope, not Audrey's own words.
- **Role:** executed
- **Files:** `.circleci/config.yml` (one job and one workflow appended; nothing else changed); `.circleci/toolkit-weekly-report.yml` (new); `CHANGELOG.md`; `LEDGER.md`; `Library/README.md`; `handoffs/git-master/2026-11-19.md` (new).
- **What was done:** Added `pr-hygiene-check` (advisory, always exits 0, skips when there is no PR or no GH_TOKEN) in its own `pr-hygiene-advisory` workflow in `config.yml`. Added `toolkit-weekly-report` in its own file, `.circleci/toolkit-weekly-report.yml`, following the #18489 pattern: a separate CircleCI pipeline with a schedule trigger only, and a `when:` on the pipeline parameter `toolkit_report` (default `none`), so a scheduled run cannot start `main-workflow` or the deploy jobs. The first version of this PR put the weekly job in `config.yml`; TriageChief asked for the split and a new commit reverted it. It is set to `TOOLKIT_PUBLIC_ONLY=true` because this repository is public and CircleCI logs and artifacts of a public project can be seen by anyone. Both jobs clone the toolkit at `2b7fcd8004f4a6f21703bba10dab4ef52204a276` and install gh CLI 2.63.2.
- **Decisions:** Separate jobs and workflows, and a separate config file for the weekly report, so the in-flight AI-review (#18493), Semgrep/Qlty (#18491) and generator (#18489) PRs do not collide in the same file. No `.github/workflows` file was added or changed.
- **Sources:** MEASURED: `circleci config validate` (CLI 1.18.0) reports both `.circleci/config.yml` and `.circleci/toolkit-weekly-report.yml` valid. Both job scripts were run on the box against live GitHub data (PR with an assignee passed, PR without one gave a warning and exit 0, bad PR number skipped with exit 0).
- **Commits / PRs:** branch `git-master/toolkit-ci-18494`. The PR link goes in a later entry.
- **Open / handoff:** CI-config change (B5): needs Audrey's yes. Secret must create the `github-free-toolkit` context, register `.circleci/toolkit-weekly-report.yml` as its own pipeline and add the weekly trigger. TriageChief assigns a non-author reviewer. Not marked ready.
- **Credit note:** Git-Master wrote the change. TriageChief filed the WR. Audrey Evans owns the repository.

## 2026-11-19 — TriageChief — sync copilot-instructions.md to AGENTS.md (WR #18497, draft PR)

- **Actor:** TriageChief
- **Requested by:** Audrey Evans, 19 Nov 2026. `RELAYED`: the request came through the TriageChief dispatcher; it fixes a pre-existing red check, not new scope.
- **Role:** executed
- **Files:** `.github/copilot-instructions.md` (replaced with a copy of `AGENTS.md`); `.github/Archive/copilot-instructions.md.2026-11-19` (new, the old content); `handoffs/triagechief/2026-11-19.md` (new); `CHANGELOG.md`; `LEDGER.md`
- **What was done:** `scripts/check_rules_sync.sh` needs the two files byte-identical. The copilot file was 33,452 bytes and `AGENTS.md` 57,190 bytes. The copilot file now equals `AGENTS.md`.
- **Decisions:** `AGENTS.md`, the check and the workflow were not edited. Nothing deleted; the old file is archived.
- **Sources:** MEASURED: `bash scripts/check_rules_sync.sh` failed before and prints OK after.
- **Open / handoff:** Review and merge into `daily/2026-11-14` under the gates.

## 2026-11-14 — TriageChief — fix the five red lint-and-test tests on daily/2026-11-14

- **Actor:** TriageChief
- **Requested by:** Audrey Evans, 14 Nov 2026 (t422u: "I want everything pushed coded and mergef")
- **Role:** executed
- **Files:** `scripts/mergeme-wiring.js`, `scripts/ghcr-setup.js`, `scripts/pot_research_engine.py`, `scripts/wr_dispatch.mjs`, `.github/workflows/opencode.yml`, `products/beauty-kit/**/*.py`, ten more `scripts/*.py` files that were over the flake8 baseline (a2a_bus, audit_workflows, export_wr_queue, gepa_optimize, graph_context_selector, lago_sync, langgraph_orchestrator, prompt_compressor, tier3_self_heal, zero_touch_secrets), `CHANGELOG.md` (prepended), `LEDGER.md` (this entry)
- **What was done:** (1) The port-assignment surface check in the MergeMe and GHCR wiring auditors read only `AGENTS.md`; the 14 Nov cutover moved the port table, unedited, to `legacy/AGENTS.md`. Both auditors now look in `AGENTS.md` and `legacy/AGENTS.md` and still fail closed when the entry is in neither. (2) `pot_research_engine.py` and `wr_dispatch.mjs` now consult the LLM spend gate (`REVVEL_LLM_ALLOW_CLOUD` must be exactly "1") before a paid OpenRouter call; keyless dry-run and the by-hand plan fallback stay free. (3) Each `opencode.yml` step that hands `OPENROUTER_API_KEY` to the third-party action now has `if: vars.REVVEL_LLM_ALLOW_CLOUD == '1'`, so it runs only when the gate is open. (4) The new Python in `products/beauty-kit/` (added in #18395) and the eleven `scripts/*.py` files named above, all over the committed flake8 baseline, are flake8-clean with the repo config: black at 120 columns, long string literals continued with a backslash (string values unchanged), star imports replaced by explicit names, unused imports removed, `l` renamed, and `# noqa: E402` only on sibling imports that need the `sys.path` entry.
- **Decisions:** No baseline entry, no exclusion, no test edit, and no CircleCI change. The flake8 baseline and checks are unchanged. The `opencode.yml` edit only makes the workflow stricter and is the fix the spend-gate test asks for; flagged for Audrey as a workflow change.
- **Sources:** MEASURED: `npm test` showed exactly these 5 failures on `daily/2026-11-14` (a6e8b5d7) before the change and 0 after.
- **Open / handoff:** TriageChief merges after the C3 gates. The string constants in `_shared/*.py` were compared before and after (only `art.py` gained an `__all__` list).
## 2026-11-14 — TriageChief — S7: CircleCI check for daily handoffs (draft PR #18414, added commit)

- **Actor:** TriageChief
- **Requested by:** Audrey Evans, 14 Nov 2026 (t422u "I want everything pushed coded and mergef"). Her own words, t422u, cover building and merging the check: "I want everything pushed coded and mergef". `RELAYED`: the dispatcher reported she also wanted a CI check enforcing daily handoffs; those exact words were not passed on.
- **Role:** executed
- **Files:** `scripts/check_handoff.sh` (new); `handoffs/bots.conf` (new); `tests/check-handoff.test.js` (new); `.circleci/config.yml` (one step in `lint-and-test`); `AGENTS.md` and `.github/copilot-instructions.md` (S7 text changed from PENDING to enforced; the two files stay identical); `handoffs/README.md`; `handoffs/triagechief/2026-11-14.md` (new); `docs/cutover/mishap-records-audit-2026-11-14.md` (dated update appended); `CHANGELOG.md`; `LEDGER.md`
- **What was done:** A PR from a branch with a known bot prefix fails when it changes anything outside `handoffs/` and `handoffs/<bot>/` holds no file dated today or yesterday (America/Denver). A branch with no known prefix only warns. `main` and `daily/*` are skipped. A PR that changes only `handoffs/` is exempt.
- **Decisions:** "Within the last day" is today or yesterday by file name, so a handoff written at the end of the day still covers the next morning. The prefix list is a file anyone can append to. TriageChief's own first handoff was written so its own PRs pass.
- **Open / handoff:** CI-config change (B5): her t422u words above are the quoted approval; the specific wording about the check was relayed. Bot prefixes beyond `triage/`, `proofy/`, `balls/`, `mech/` and `sensecrew/` are not known to this check yet.

## 2026-11-14 — TriageChief — daily handoff rule, restored rules, handoffs/ folder (WR #18408 follow-up, draft PR)

- **Actor:** TriageChief
- **Requested by:** Audrey Evans, 14 Nov 2026 (t419u Proofy "starting at 1", t420u "Visiting agents. Not my first rodeo or second or third", t421u "Yes but why wasnt that caught in my standards two years of agent mishaps not being used anymore")
- **Role:** executed
- **Files:** `AGENTS.md` (section 0 and section R appended, plus three core-rule bullets); `VISITING_AGENTS.md` (section 0 and three inline bullets appended); `.github/copilot-instructions.md` (exact copy of `AGENTS.md`); `legacy/README.md` (dated correction note appended); `handoffs/TEMPLATE.md`, `handoffs/README.md`, `handoffs/proofy/2026-11-14.md` (added); `docs/cutover/mishap-records-audit-2026-11-14.md` (added); `CHANGELOG.md` (entry added)
- **What was done:** Audited where agent mishaps and lessons are recorded and whether `AGENTS.md` enforces them at session start (it did not). Appended the session-start handoff rule and restored, with sources, the legacy rules the cutover left out. Seeded Proofy's handoff from its transcript, with uncertain items marked.
- **Decisions:** Append only. Audrey's own words are quoted verbatim; agent-written rules are marked RECORDED. Rules that contradict her authority or the delete rule are not restored (R15). A check or merge gate for the handoff rule is PENDING her yes (S7, B5).
- **Open / handoff:** Draft PR for Audrey's review. Conflicts for her: R1 item 7 against E3 and E5; R1 items 20 to 25 against C7; old affiliate mandates against F2 and F3. Not done: other pointer stubs, Proofy's repos, recovery of files deleted in commit `511a13be9`.

## 2026-11-14 — TriageChief — AGENTS.md rulebook cutover (WR #18408, draft PR #18409)

- **Actor:** TriageChief
- **Requested by:** Audrey Evans, 14 Nov 2026 (t395u generate new rules and cut over; t402u AGENTS.md itself is the rulebook, not a stub; whiteboard input on discussion #18238)
- **Role:** executed
- **Files:** `AGENTS.md` (new rulebook); `legacy/**` (old rule files, `git mv`, unedited); pointer stubs at `MASTER.md`, `VISITING_AGENTS.md`, `docs/*` rule paths, `agent-pack/AGENTS.md`; `CLAUDE.md` (`@AGENTS.md`); `.github/copilot-instructions.md` (exact copy of `AGENTS.md`); `scripts/check_rules_sync.sh`; `.circleci/config.yml` (`lint-and-test` sync step); `scripts/context_graph.py`, `skills/project-router/detect.py`, `tests/context_graph_test.py`, `tests/verify-the-postcondition-standard.test.js`; `docs/CUTOVER_PLAN.md`; `docs/cutover/reference-inventory.md`; `legacy/README.md`; `.github/pull_request_template.md`; `CHANGELOG.md`; `LEDGER.md` (this entry). `RULES.md` was draft-only in this PR and was removed after its content moved into `AGENTS.md`.
- **What was done:** Cut the new rulebook over to root `AGENTS.md` so auto-loading tools get the full rules. Folded in NoseyNoodle's six gaps and Fleet-Orchestrator's Linear A rules, marked Audrey to confirm where new. Resolved `legacy/docs/AGENTS.md` vs draft-first in favour of draft-first (C1). Did not change other CI config or workflows, other than the flagged sync step.
- **Decisions:** No symlinks. Stubs and the new `AGENTS.md` take effect on `main` only in the same promotion. The CircleCI sync step is a CI-config change and waits on Audrey's yes (B5).
- **Open / handoff:** Draft PR #18409. Remaining section-anchor citations are in `docs/cutover/reference-inventory.md` (Phase 1). Defaults and pending items in `AGENTS.md` wait on Audrey.

## 2026-11-13 — Triage session — OpenCode in-GitHub coding agent

- **Actor:** Kimi (triage agent)
- **Requested by:** Audrey Evans, 2026-11-13 ("i want to use it in github … yes with detailed instructions and the new triggers and agents or bots")
- **Role:** executed
- **Files:** `.github/workflows/opencode.yml` (three jobs: comment commands, label trigger, manual dispatch); `standards/OPENCODE_AGENT.md` (full operator manual); `standards/WR_DISPATCHER.md` (route diagram + opencode bullet); `config/connections.yml` (opencode entry) + regenerated `docs/CONNECTIONS_REGISTRY.md` and README block; `LEDGER.md` (this entry)
- **What was done:** Wired the OpenCode agent to run inside GitHub Actions on the fleet OPENROUTER_API_KEY (model openrouter/deepseek/deepseek-chat-v3-0324). Roo-Code itself cannot run in CI (VS Code-only, no headless mode), so OpenCode fills the "agent codes WRs without my laptop" slot. Triggers: /opencode or /oc comments restricted to OWNER/MEMBER/COLLABORATOR (repo is public — anti-abuse guard), the `opencode` issue label with fleet conventions injected, and workflow_dispatch with a free prompt. use_github_token: true so the opencode-agent GitHub App install is optional; PRs appear from github-actions[bot]. share: false.
- **Decisions:** DeepSeek as default model for cost; edit the model: line for harder tasks. Three separate jobs rather than one conditional-prompt job because the action's prompt input overrides comment parsing and empty-string behavior is undocumented. Comment trigger deliberately NOT driven by a bot-posted bridge comment — GITHUB_TOKEN comments do not start new workflow runs.
- **Open / handoff:** Copy the workflow + OPENROUTER_API_KEY secret to other repos to enable it there. If session-share links are ever wanted, flip share to true (public repo default upstream).

## 2026-11-13 — Triage session — WR dispatcher (label-routed agent execution)

- **Actor:** Kimi (triage agent)
- **Requested by:** Audrey Evans, 2026-11-13 ("can you make sure it is fully documented in detail as i won't remember this later")
- **Role:** executed
- **Files:** `.github/workflows/wr-dispatcher.yml` (label + manual triggers); `scripts/wr_dispatch.mjs` (Manus API dispatch, Roo prompt-pack generation with OpenRouter-drafted plan, idempotency guard); `standards/WR_DISPATCHER.md` (full operator manual: two-key OpenRouter split, daily usage, conventions, troubleshooting); `LEDGER.md` (this entry)
- **What was done:** Built the label-routed dispatcher. `manus` label -> Manus cloud task via MANUS_API_KEY; `roo` label -> commits wr/roo-queue/WR-<repo>-<N>.md with fleet conventions + OpenRouter-drafted plan. Manual workflow_dispatch fallback. Fleet conventions baked into both prompts (branch naming, append-only, no secrets, never self-merge).
- **Decisions:** Two OpenRouter keys documented as separate concerns (local Roo key vs fleet secret key) with a recommended low spend cap on the fleet key. OpenRouter drafting model pinned to deepseek-chat (cheap); pack still written if drafting fails. Idempotency via bot-comment check; delete comment to re-dispatch.
- **Open / handoff:** Dispatcher lives on revvel-standards only; copy workflow+script to other repos to enable labels there. If Manus changes API shape, only wr_dispatch.mjs needs edits.

## 2026-11-13 — Triage session — Register Manus API, Bitrise CI, and Notion connector

- **Actor:** Kimi (triage agent)
- **Requested by:** Audrey Evans, 2026-11-13 ("i added manus_api_key ... i added bitrise connections and some others today")
- **Role:** executed
- **Files:** `config/connections.yml` (3 entries: manus, bitrise, notion-connector); `docs/CONNECTIONS_REGISTRY.md` and `README.md` (regenerated via `npm run connections`, never hand-edited); `LEDGER.md` (this entry)
- **What was done:** Verified the owner's 2026-11-12 additions from the GitHub side — secret MANUS_API_KEY (updated 2026-11-12T21:04Z, value never read), Bitrise webhook id 711028295 (hooks.bitrise.io, active on push/pull_request/issue_comment), Notion read-only connector (manus PR #4, Docker kit + notion_cli.py). Registered all three in the connections SSOT as verified. Registry now 53 connections / 48 verified. Drift check clean.
- **Decisions:** Registered as separate entries rather than folding into existing ones — they have distinct auth and reach.
- **Open / handoff:** If Bitrise should build a mobile app repo (skill-builder-mobile, wedlock-wizard-mobile), add its webhook there too; currently wired to revvel-standards only.

## 2026-11-11 15:40 UTC — Cloudy — Codex OAuth login command

- **Actor:** Cloudy (Cursor cloud agent, Grok 4.7)
- **Requested by:** Gitar review on PR #18373
- **Role:** executed
- **Files:** `docs/MCP_REVVEL_CATALOG.md` (added the login command beside the existing add command); `docs/Master_Inventory/MCP_STANDARD.md` (same); `.codex/config.toml` (comment only); `tests/action-gateway-mcp.test.js` (asserts the login command); `config/connections.yml` (note); generated registry views; `CHANGELOG.md`; `LEDGER.md`
- **What was done:** Codex `mcp add --url` stores the endpoint and does not start OAuth. The operator command is `codex mcp login action-gateway`. The earlier 15:31 entry still describes the registration. This entry adds the login command. No token was added.
- **Decisions:** Keep the add command from WR #18290 and add the login command next to it — because the Codex MCP docs say login is a separate step for an OAuth server.
- **Sources:** [Codex MCP](https://developers.openai.com/codex/mcp) (read 2026-11-11): "Run `codex mcp login <server-name>` separately to start an MCP OAuth login." Gitar review on PR #18373.
- **Commits / PRs:** [PR #18373](https://github.com/midnghtsapphire/revvel-standards/pull/18373)
- **Open / handoff:** Audrey runs both the Claude login and `codex mcp login action-gateway` on her machine. TriageChief merges. Do not merge from this agent.
- **Credit note:** Gitar named the missing command. Cloudy added it. Audrey owns the login.

## 2026-11-11 15:31 UTC — Cloudy — DigitalOcean action-gateway for Claude and Codex

- **Actor:** Cloudy (Cursor cloud agent, Grok 4.7)
- **Requested by:** Audrey Evans, WRs #18288 and #18290, routed by TriageChief on 2026-11-11
- **Role:** executed
- **Files:** `.mcp.json` (added `action-gateway`); `.codex/config.toml` (added); `docs/MCP_REVVEL_CATALOG.md` (added the remote HTTP section); `docs/Master_Inventory/MCP_STANDARD.md` (added section 14); `config/connections.yml` (added `mcp-action-gateway`); `docs/CONNECTIONS_REGISTRY.md`, `README.md`, and `connections-dashboard.html` (regenerated from that YAML); `tests/action-gateway-mcp.test.js` (added); `CHANGELOG.md` (prepended); `LEDGER.md` (prepended); `wr/memory/decisions.jsonl` (appended)
- **What was done:** Registered the same public DigitalOcean endpoint for Claude as HTTP transport (`type: http` plus `url` in `.mcp.json`) and for Codex as `url` in `.codex/config.toml`. Documented `claude mcp add --transport http`, `claude mcp login action-gateway`, and `codex mcp add --url`. No token, key, or `.env` file.
- **Decisions:** Left `templates/mcp/mcp.*.json` unchanged — because `scripts/setup-mcp.sh` copies those stdio profiles onto other projects, and copying this URL would publish this repository's endpoint into unrelated projects. The checked-in registration is the root Claude file and the Codex project file.
- **Sources:** [WR #18288](https://github.com/midnghtsapphire/revvel-standards/issues/18288); [WR #18290](https://github.com/midnghtsapphire/revvel-standards/issues/18290); TriageChief comments on both issues (2026-11-11). No `Library/` copy; the issues are the source.
- **Commits / PRs:** PR link follows the push. Branch `cursor/do-action-gateway-mcp-5603`.
- **Open / handoff:** Audrey runs the Claude login and the Codex add on her own machine. TriageChief merges after CircleCI `lint-and-test` is green. Do not merge from this agent.
- **Credit note:** Cloudy registered the endpoint and the docs. Audrey owns the login. TriageChief routed the work requests.

## 2026-11-11 09:00 MST — QuickWinBuilder — tool history log and visiting-agent rule check

- **Actor:** QuickWinBuilder (MoneyCrew Builder, Grok Bot)
- **Requested by:** Audrey Evans, through TriageChief and WR #18374
- **Role:** executed
- **Files:** `docs/tool-history/` (added: README, `TOOLS.csv`, 44 tool files, `visiting-llms.md`); `VISITING_AGENTS.md` (added section 1b; nothing removed); `scripts/visiting-agent-scan.js`, `config/visiting-agent-patterns.json`, `tests/visiting-agent-scan.test.js` (added); `.circleci/config.yml` (added one step); `CHANGELOG.md`, `Library/README.md`, `LEDGER.md` (appended)
- **What was done:** Searched `midnghtsapphire` and `freedom-angel-corp` issues and PRs, the repo files, and commit history for each tool, and logged what the evidence shows. Recorded the verdicts Audrey stated on 2026-11-11 (Manus, visiting LLMs forgetting rules, Grok token limits, mabl local, Bito paid). Added the check for tracker, marketing, affiliate, and branding strings.
- **Decisions:** Created `docs/tool-history/` because no per-tool history existed; `DECISIONS.md`, the cost index, and the subscriptions file are linked, not edited. Kept `RECORDED` (repo decision under the shared login) separate from `AUDREY` (her words). Baselined the 145 hits in 40 files that were already in the repo instead of deleting or editing them.
- **Sources:** each tool file lists its own links.
- **Commits / PRs:** branch `task/tool-history-log-20261111`, draft PR into `main`.
- **Open / handoff:** Manus account recovery is separate (recovered content goes to `docs/agents/manus/recovered/` in a later PR). Audrey owns the `NEEDS AUDREY` list. TriageChief merges after CircleCI is green.
- **Credit note:** QuickWinBuilder wrote the log. Audrey supplied the verdicts. Earlier agents wrote the repo records it cites.

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
