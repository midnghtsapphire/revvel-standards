# Security gates plan

**Parent tracker:** [#18433](https://github.com/midnghtsapphire/revvel-standards/issues/18433). Status for every item lives there, so this file does not change when a PR merges.
**Written:** 2026-11-15 by Proofy for Audrey Evans.
**PRs (all draft, additive):**
[#18435](https://github.com/midnghtsapphire/revvel-standards/pull/18435) fixes why `lint-and-test` was red on `main`,
[#18436](https://github.com/midnghtsapphire/revvel-standards/pull/18436) huge-delete gate,
[#18438](https://github.com/midnghtsapphire/revvel-standards/pull/18438) Trivy and ClamAV gate,
[#18437](https://github.com/midnghtsapphire/revvel-standards/pull/18437) prompt-injection gate,
[#18439](https://github.com/midnghtsapphire/revvel-standards/pull/18439) API code-review gate,
[#18440](https://github.com/midnghtsapphire/revvel-standards/pull/18440) reuse and adoption.
Related issue: [#18434](https://github.com/midnghtsapphire/revvel-standards/issues/18434) beauty-kit flake8 debt.
**Why this file exists:** Audrey should never have to remember a chat in Claude, ChatGPT, Perplexity, Kimi or Venice. If every token runs out tomorrow, this plan and the PRs it names are the whole job.

> Audrey's ask, in her words: "i need checks in for that alerts for huge deletes, malware, prompt injections, i love trivy and my codereview was top notch i had before ... develop each of these tasks out in pr and sub prs ... so if i run out of tokens or whatever i have the full plan."

## 1. Ground rules these gates follow

1. **They run on CircleCI.** GitHub Actions on this account fails with `startup_failure` (account level). CircleCI is free, already gates this repo (`.circleci/config.yml`), and needs no self-hosted runner for these jobs. Nothing runs off the bot box except CircleCI itself.
2. **Owner rule (AGENTS.md rules 1-6):** read this repo first, never delete, never rewrite wholesale, add next to existing work, draft PRs, agents never merge their own PRs. Every gate PR is purely additive. A human merges.
3. **Spend gate (`scripts/llm-spend-gate.js`):** any paid LLM call needs `REVVEL_LLM_ALLOW_CLOUD` to be exactly `"1"`, set on purpose. The two LLM features below are built, tested, and **off** until Audrey flips that one variable.
4. **No secret is printed or committed.** Keys come from the job environment only. Gates print rule, file and line, never matched text.
5. **A gate that cannot measure fails closed.** A scan that produced no result never reads as "clean". The one deliberate exception is the code-review gate (item 4), which is advice and never blocks.
6. **Finish what you start.** Every PR here must end merged, or clearly ready with checks passing and the reason it waits written in its description.

## 2. The four gates

### Item 1. Huge-delete alert (PR: gate 1)
- **What:** fail a PR that deletes more than 500 lines, or more than 10 files, or removes a whole directory of 3+ files.
- **Why:** mass deletion is how work gets lost (the owner has lost thousands of hours that way) and how a bad agent or a compromised token hurts most. It complements `policy-check` (RVS-AGENT-001), which only catches silent single-file deletions.
- **How:** `git diff` between the PR base and HEAD, with rename detection so a move is not a delete. Lockfile and minified-file churn is ignored for the line count only. Override is a human decision: label `allow-huge-delete` on the PR, or `ALLOW_HUGE_DELETE=true` in the job. Limits are env vars: `HUGE_DELETE_MAX_LINES`, `HUGE_DELETE_MAX_FILES`, `HUGE_DELETE_MIN_DIR_FILES`.
- **Files:** `scripts/security-gates/huge-delete-guard.js`, `tests/huge-delete-guard.test.js`, CircleCI job `huge-delete-guard`.
- **Done when:** a PR deleting 700 lines is red and names the label; adding the label and re-running makes it green; tests pass.
- **Known gaps:** PR branches only (a mass delete pushed straight to `main` is not caught afterward). For a **private** repo the label can only be read if the CircleCI project has `GITHUB_TOKEN` (read) set. Without it the guard stays strict and says why. Public repos need no token.

### Item 2. Malware and secret scanning (PR: gate 2)
- **What:** Trivy (secrets, misconfig, vulnerabilities) plus ClamAV, on only the files a PR adds or changes.
- **Why:** a committed token or a dropped malicious file is the most expensive mistake and the hardest to undo. Trivy is Audrey's chosen scanner.
- **How:**
  - Trivy 0.76.2 from the GitHub release, SHA-256 pinned in the script. **Secrets at HIGH or CRITICAL block.** Vulnerabilities and misconfig are reported only, because the repo has an old backlog and the earlier GitHub Actions Trivy ran with `exit-code: 0`. Rotate any secret that is found; deleting it from the PR is not enough. False positives go in `.trivyignore.yaml` with a reason.
  - ClamAV (distro package, `freshclam` signatures) blocks on any detection. It cannot pass quietly: signature download is retried three times and then the job fails, and an EICAR self-test must be detected before the real scan runs. A red job from a signature-mirror outage is cleared by re-running it.
  - Only changed files are staged and scanned (the checkout is about 860 MB). Files over 50 MB are named and skipped.
- **Files:** `scripts/security-gates/trivy-scan.sh`, `trivy-report.js`, `clamav-scan.sh`, `stage-changed-files.sh`, `tests/malware-gates.test.js`, CircleCI jobs `trivy-scan` and `clamav-scan`.
- **Done when:** a PR adding a token-shaped secret is red with rule, file and line; a PR with a detected file is red; clean PRs are green; both ran for real on CircleCI.
- **Known gaps:** history and untouched files are not rescanned. A scheduled full-repo scan needs a CircleCI scheduled trigger created in the project settings (listed in section 5).

### Item 3. Prompt-injection scan (PR: gate 3)
- **What:** block added text that is aimed at an AI agent: override-previous-instructions phrases, "your new instructions are", reveal-system-prompt, hide-it-from-the-user, chat-template tokens, HTML comments addressed to an AI, curl/wget aimed at `.ssh` or `.env`, **hidden unicode** (zero-width, bidi, soft hyphen, tag characters), and **base64 that decodes to an instruction**. Medium findings (pipe-to-shell, tool-call markup, "send the token to a URL", image-URL exfil, long base64 blobs) are reported and do not block.
- **Why:** agents read AGENTS.md, skills, prompts and JSON configs in this repo. Text smuggled into those files steers every agent that reads them next.
- **How:** deterministic script first, over **added lines only** of text-like files and agent folders. Override with the `allow-injection-pattern` label, `ALLOW_INJECTION_PATTERN=true`, or the visible marker `prompt-injection-scan: ignore` on a line that quotes an attack on purpose. Optional second pass (`--llm`) sends only the added lines to OpenRouter, marked as untrusted data; it needs the spend gate open and `OPENROUTER_API_KEY`, and it never blocks unless `INJECTION_LLM_BLOCK=1`.
- **Files:** `scripts/security-gates/prompt-injection-scan.js`, `tests/prompt-injection-scan.test.js`, CircleCI job `prompt-injection-scan`.
- **Done when:** a PR adding an override phrase, a zero-width character or an encoded instruction to a doc is red with file and line; clean docs are green.
- **Measured:** run over all 2,852 md/yml/json files as if newly added, it finds 58 HIGH lines (50 zero-width spaces pasted at line starts in four `wr/issues/` transcripts, 6 docs that quote an attack on purpose, 1 chat-token mention) and no HIGH in code. Existing files are not re-scanned; only new added lines are.

### Item 4. API code review (PR: gate 4)
- **What:** a second reader's notes on every PR diff, through an API. Never blocks.
- **Why:** Audrey's earlier review tool was "top notch". Her reviewers today are Bito, gitar-bot, Devin and cubic, which are GitHub Apps and do not depend on this job. This item is the API-key version that runs on CircleCI while GitHub Actions is down.
- **How:** `scripts/security-gates/api-code-review.js` builds the diff (lockfiles and images left out, 60k chars max) and sends it as untrusted data. Providers via `REVIEW_PROVIDERS`:
  - `openrouter` (default): `OPENROUTER_API_KEY`, model `google/gemini-2.5-flash`.
  - `manus`: Manus API **v2** (`task.create`, then `task.listMessages`), opt-in, forbidden from browsing or opening PRs. Written from the v2 docs and tested only against a fake server.
  - Output is the job log, an artifact `code-review-<provider>.md`, and optionally a PR comment (`REVIEW_POST_COMMENT=1` plus `GITHUB_TOKEN`) that starts "Proofy:" and ends "— Proofy".
  - No key, spend gate closed, or any provider error prints a notice and exits 0.
- **Item 4b (not built, needs keys):** Bito's reviewer is the `bitoai/cra` docker agent (`mode = cli`, `pr_url`, `bito_cli.bito.access_key`, and a **classic** GitHub PAT with repo scope). To run it on CircleCI: add `BITO_ACCESS_KEY` and a classic PAT as CircleCI project env vars, then a job with `setup_remote_docker` that runs the agent against `$CIRCLE_PULL_REQUEST`. `BITO_ACCESS_KEY` currently exists only as a GitHub repo secret (not readable, only usable by Actions), and `.github/workflows/bito-ai.yml` records that Bito was cut from the fleet on 2026-07-08 after it ran as a silent no-op for lack of the key. Decision for Audrey: put the key into CircleCI to turn it on.
- **Done when:** with the gate closed the job is green and says it skipped; with the gate open and a key the review shows in the log and artifact; the reviewer failing never turns a PR red.

### Item 5. Reuse (PR: gate 5)
- **What:** one line in another repo's CircleCI job runs all four gates.
- **How:** `scripts/security-gates/bootstrap.sh` does a sparse partial fetch of only `scripts/security-gates/` and `scripts/llm-spend-gate.js` at a **pinned 40-character SHA** of this repo, then `run-all.sh` runs every gate, does not stop at the first red one, prints a summary, and exits 1 if any failed. A missing gate script is a failure, never a silent pass. `SECURITY_GATES_SKIP="clamav,trivy"` skips named gates and says so. `print-adopt-snippet.sh` prints the job pinned to the current main SHA.
- **Files:** `scripts/security-gates/run-all.sh`, `bootstrap.sh`, `print-adopt-snippet.sh`, `tests/security-gates-adopt.test.js`, CircleCI job `security-gates-adopt-test`.
- **Long term:** a published CircleCI orb is cleaner than a pinned `curl`. It needs a CircleCI org admin and a working API token, which this box does not have.

## 3. Adoption steps for another repo

Do this only after the gate PRs are merged into `main` here (the pin must be a commit that contains them).

1. In a checkout of revvel-standards, run `bash scripts/security-gates/print-adopt-snippet.sh`. It prints a job and a workflow entry pinned to the current main SHA.
2. Paste the job under `jobs:` and the entry under the PR workflow in the other repo's `.circleci/config.yml`. If the repo has no `.circleci/config.yml`, create one with `version: 2.1`, that job, and a workflow that lists it.
3. In the CircleCI project, follow the repo if it is not followed yet. No secret is required for the deterministic gates.
4. **Private repos** (`linear-a`, `hunger-gallows` are private): add a read-only `GITHUB_TOKEN` to the CircleCI project so the override labels can be read. Without it the huge-delete and injection gates stay strict and say so.
5. To turn on the LLM features for that repo: add `OPENROUTER_API_KEY` and `REVVEL_LLM_ALLOW_CLOUD=1` to the CircleCI project env. Nothing else changes.
6. To bump the gates later, re-run step 1 and replace the SHA. Never use a branch name; `bootstrap.sh` refuses it.

Per repo as of 2026-11-15:

| Repo | Visibility | `.circleci/config.yml` today | Extra step |
|---|---|---|---|
| amazon-books | public | yes (CodeQL, linter jobs) | add the job; no token needed |
| linear-a | private | none found | create the config; add `GITHUB_TOKEN` |
| hunger-gallows | private | none found | create the config; add `GITHUB_TOKEN` |

Adoption PRs for those three repos are separate work and were not opened here.

## 4. Keys and access found (yes/no only, no values)

| Item | Present on the bot box | Elsewhere |
|---|---|---|
| OpenRouter key | yes | also a GitHub repo secret here |
| Manus key | no | exists as a GitHub repo secret here (added 2026-11-12); not readable by anyone, only by Actions, which is down |
| Bito access key | no | exists as a GitHub repo secret here; same limit |
| CircleCI project env vars | unknown | the box's CircleCI token returned 401, so project env could not be listed |

Manus has a real use here: opt-in second-opinion review (item 4). It is also the dispatch target of `scripts/wr_dispatch.mjs`, which still calls Manus **API v1** (`api.manus.ai/v1/tasks`, header `API_KEY`). Manus has deprecated v1 in favour of `POST /v2/task.create` with header `x-manus-api-key`. That is a real bug waiting to fail; it is recorded in the tracker, not changed in these PRs.

## 5. Open items for a human (each needs a click or a key, not more code)

1. Merge decisions: the PRs are drafts and agents do not merge their own PRs. Suggested order: the `lint-and-test` fix, then gates 1 to 5.
2. `lint-and-test` has been red on `main` for 25+ commits. Two causes are fixed in a PR; the third (beauty-kit flake8 debt, #18434) needs a decision: clean the code or exclude the folder.
3. CircleCI project env: `REVVEL_LLM_ALLOW_CLOUD=1`, `OPENROUTER_API_KEY` (and `MANUS_API_KEY` plus `REVIEW_PROVIDERS=openrouter,manus`) to switch on the LLM passes.
4. Make the new jobs required checks in branch protection once Audrey is happy (`main` currently has no branch protection).
5. Scheduled full-repo Trivy and ClamAV: create a CircleCI scheduled trigger that runs the two scripts with `BASE_SHA` set to the empty tree.
6. Bito (item 4b): key and PAT into CircleCI, then one job.

## 6. If you are picking this up cold

Read the tracker #18433, then each PR it lists. Everything is in this repo and in those PRs. Run `node --test tests/huge-delete-guard.test.js tests/prompt-injection-scan.test.js tests/malware-gates.test.js tests/api-code-review.test.js tests/security-gates-adopt.test.js` to see the whole thing work locally in a few seconds.
