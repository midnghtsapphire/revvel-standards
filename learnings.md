# Goap Agent Memory & Self-Healing Log

<!-- AGENT USAGE NOTE: This is the ONE source-of-truth log for all Goap executions.
  - Before writing: check this file exists at this path. Do NOT create a duplicate.
  - Writes must be append-only and atomic (write to a temp file, then rename/move).
  - On lock or write failure: save entry to learnings.tmp as a rollback buffer; retry on next run.
  - Malformed entries (missing required fields) must be flagged with a [MALFORMED] prefix and NOT deleted.
  - Archive entries older than 90 days to DigitalOcean Spaces under goap-logs/archive/.
  - Never delete the [Template Entry] section below.
-->

**SSOT Links:** [`GOAP.md`](GOAP.md) · [`GOAL.md`](GOAL.md) · [`GOAP_AGENT_PROMPT.md`](GOAP_AGENT_PROMPT.md)  
**Rule:** Read this file at the start of every session. Append after every task or failure. Never repeat the same mistake twice.

This file tracks autonomous executions, failures, root causes, and locked-in solutions so mistakes are never repeated.

## [Template Entry - Do not delete]

**Date/Time:**

**Task Attempted:** [e.g., n8n email parse for angelreporters@gmail.com]

**Outcome:** [Success / Failed]

**Root Cause of Failure (If any):** [e.g., IMAP connection timed out after 30s]

**Self-Healing Fix / Learned Lesson:** [e.g., Added an automatic 3-minute retry node in n8n; switched Apify actor to use residential proxies]

**Next Action:** [e.g., Proceed to Video Generation step]

---

## [Auto-Generated Entries Begin Below]

---

**Date/Time:** 2026-07-13T17:15:00Z

**Task Attempted:** CodeQL workflow `Analyze (actions)` matrix job failed with GitHub API rate limit exceeded during SARIF upload and telemetry gathering (run 29263568406, job 86862858087)

**Outcome:** Success — mitigated via `max-parallel: 1` and a retry-with-backoff step in `codeql.yml`.

**Root Cause of Failure (If any):** Three CodeQL matrix jobs (`actions`, `javascript-typescript`, `python`) ran in parallel, each making API calls during SARIF fingerprinting/upload and telemetry reporting. The combined API load exceeded the GitHub App installation's rate limit (shared across all concurrent workflows in the repo). The `actions` language job hit HTTP 403 "API rate limit exceeded for installation" at the SARIF upload phase and again during telemetry — the latter is internal to `github/codeql-action` and not retryable by user code. Error: `request ID 4C50:33198C:73D136F:18A32DE5:6A5509FD, timestamp 2026-07-13 15:53:33 UTC`.

**Self-Healing Fix / Learned Lesson:** (1) Added `max-parallel: 1` to the CodeQL matrix strategy — serializes the three language scans so their API-heavy upload phases don't overlap, drastically reducing peak API demand. (2) Added a retry step: if the first SARIF upload fails, wait 60s (rate-limit reset window) then retry once. The analyze step already had `continue-on-error: true`, so PR gating is unaffected, but the retry improves the odds of findings actually reaching the Security tab. Lesson: any workflow with a fan-out matrix that touches the GitHub REST API during post-processing (upload, telemetry, status checks) should either serialize via `max-parallel` or add exponential-backoff retry — the installation rate limit is shared across ALL concurrent runs in the repo, not per-workflow.

**Tools Used:** GitHub Actions job logs (`get_job_logs`), CodeQL action v4, `github/codeql-action/upload-sarif@v4`, `max-parallel` strategy key, `wait-for-processing` input.

**Next Action:** Monitor the next CodeQL run on main to confirm all three language scans upload SARIF successfully without rate-limit errors.

---

**Date/Time:** 2026-07-10T00:30:00Z

**Task Attempted:** Stop the changed-Markdown lint gate from failing nearly every PR (recurring `MD012`/`MD025`/`MD003`/`MD004`/… findings on generated `wr/issues/*.md`)

**Outcome:** Success — auto-heal loop shipped (PR #15623): `scripts/heal-markdown.js` + `markdown-lint-auto-heal.yml` + a heal step at WR generation time in `wr-pr-creation.yml`. Verified on the 5 worst backlog files: 362 findings → 2.

**Root Cause of Failure (If any):** Two structural generation artifacts plus mechanical noise. (1) `wr-pr-creation.yml` prepends its own `# WR: <title>` H1 above template/findings bodies that already carry H1s → `MD025` on essentially every generated WR (362 instances across the 259-file backlog). (2) Issue bodies pasted verbatim bring setext `===`/`---` headings (`MD003`), asterisk bullets, stacked blank lines. ~85% of all findings are auto-fixable by `markdownlint-cli2 --fix`; the two biggest non-fixable rules (`MD025`, `MD003`) are exactly the structural ones.

**Self-Healing Fix / Learned Lesson:** Don't hand-fix lint and don't weaken the gate — heal the file before the gate judges it. `npm run markdown:heal -- <files>` converts setext→ATX, demotes extra H1s to H2 (both code-fence-aware and idempotent), then runs `--fix`. The PR-time workflow pushes a `[md-auto-heal]` commit back to the branch (loop-safe: idempotent healer + push-only-on-diff + skip own commits); WR PRs are additionally healed at generation so they are born lint-clean. Lesson: when a lint failure recurs on every PR, measure the rule distribution across the accumulated corpus first — it splits cleanly into "machine fixes this" vs "generator bug" and both are automatable.

**Next Action:** None for lint. Remaining non-fixable findings (e.g. `MD055` malformed tables) surface in the healer's output and still fail the real gate for a human.

---

**Date/Time:** 2026-07-10T00:30:00Z

**Task Attempted:** Fix GitHub Copilot cloud-agent runs dying with `fatal: ambiguous argument 'main'` (cca-engine "Failed to compute changed paths", run cancelled)

**Outcome:** Success — fixed in `copilot-setup-steps.yml` (PR #15623).

**Root Cause of Failure (If any):** The Copilot coding agent's engine runs `git diff --name-only <sha> main`-style commands to compute changed paths, but its checkout is a single-ref shallow clone with **no local `main` ref**, so every such diff exits 128 and the run is cancelled.

**Self-Healing Fix / Learned Lesson:** `copilot-setup-steps.yml` (the sanctioned hook for the Copilot agent's environment) now materializes the ref up front: `git fetch origin main --depth=200` + `git branch main origin/main` (idempotent, no-op when already on main). Lesson: "ambiguous argument '<branch>'" in any agent runtime means the ref is missing from the checkout, not that the repo is broken — fix the environment setup, not the code.

**Next Action:** None — validate by watching the next Copilot-assigned issue run past the changed-paths step.

---

**Date/Time:** 2026-07-10T00:30:00Z

**Task Attempted:** Diagnose "the fleet controller doesn't work" — the CUDA-style grid scheduler (`scripts/controller/`) thrashed instead of converging

**Outcome:** Success — two convergence bugs found via the committed feed history and fixed (PR #15623).

**Root Cause of Failure (If any):** (1) **Amnesia loop:** reassignment lineage was persisted only inside the previous feed's `preemptions` array; any quiet tick (fresh relaunches are young → nothing to preempt) emptied it, so the model chain restarted at step 1 every cycle — the feed history showed `reassign_count: 1, next_model: claude-3.5-sonnet` for hours, `maxReassigns` was never reached, and escalation to self-healing never fired. (2) **False stalls:** health was judged by the run's `updated_at`, which does not tick during one long step, so legitimately slow research runs (e.g. Perplexity Research Agent) were classified "stalled" at ~16m and cut every 15 minutes while healthy.

**Self-Healing Fix / Learned Lesson:** (1) Durable scoreboard `docs/controller/controller-state.json` (`fleet-controller-state/v1`), keyed by workflow path, carried forward across ticks and expired 6h after the last cut — quiet ticks can no longer wipe history, so the chain advances and escalation actually happens. (2) Before evicting a *stalled* run, verify against the jobs API (`lastJobActivityMs`): recent step activity spares the run (`spared(step-progress)`), and spared runs never reach the stop/ingestion feeds; runaways are still cut on wall-clock. Lessons: a stateless controller whose memory lives in its *output* feed forgets whenever the output is empty — give schedulers a dedicated, carried-forward state file; and `updated_at` is not a heartbeat — verify liveness from job/step timestamps before killing anything.

**Next Action:** Watch `docs/controller/controller-state.json` commits after merge: `tried_models` should advance (sonnet → fusion → deepseek) on a repeatedly-stalling workflow and then hand it to `controller-ingestion.json` for self-healing.

---

**Date/Time:** 2026-07-09T03:03:00Z

**Task Attempted:** Fix fleet maintenance duplicate Work Request risk when open-issue lookup fails

**Outcome:** Success - `hasOpenWorkRequest` now fails closed on `gh issue list` errors, auth/rate-limit failures, malformed JSON, and non-array payloads; regression tests verify `fileWorkRequest` does not create a new `[WR]` after lookup failure.

**Root Cause of Failure (If any):** The open-WR preflight caught every `gh` or JSON parsing error and returned `false`, making an untrusted lookup indistinguishable from a confirmed empty result.

**Self-Healing Fix / Learned Lesson:** Deduplication preflights must fail closed. If the script cannot prove the target repo has no open marker issue, it must throw a contextual error and skip creation instead of opening another automation issue.

**Next Action:** None - Work complete.

---

**Date/Time:** 2026-05-01T19:37:00Z

**Task Attempted:** Fix recurring `oAudrey retro` issues reporting HTTP 000 for `oaudrey.com` and `fieldwork.oaudrey.com`

**Outcome:** Infrastructure blocker identified and documented; workflow deduplication implemented; AGENTS.md improved

**Root Cause of Failure (If any):** The oAudrey deployment requires two human-only one-time actions that were never performed: (1) setting the `DIGITALOCEAN_API_TOKEN` GitHub Actions secret, and (2) pointing `oaudrey.com` nameservers to DigitalOcean in the Namecheap registrar (`uprisinghope` account). Without these, `curl` returns `HTTP 000` (DNS does not resolve; no app was ever deployed). The retro workflow was also creating a brand-new issue every week with no deduplication check, generating compounding noise.

**Self-Healing Fix / Learned Lesson:**
1. **Infrastructure blockers ≠ code blockers.** When `curl` returns `HTTP 000` for a domain and the deploy workflow has never run with a valid credential, this is an infrastructure blocker that no amount of code changes can fix. Classify it immediately and escalate with exact human steps.
2. **Deduplication is required for recurring automated issues.** Any workflow that opens an issue on a schedule MUST check for existing open issues first and comment on them instead of cloning.
3. **SYSTEM_STATE.md `⏳` state.** Use `⏳ Pending human action` (not `❌`) to distinguish "this is intentionally not deployed yet" from "this needs a human to take a specific action." Agents reading `❌` with a comment like "(standards repo)" assume the component is not meant to be deployed; `⏳` with exact steps is unambiguous.
4. **New section in AGENTS.md: Infrastructure Blocker Protocol.** Added clear classification table and handling steps so future agents stop the retry loop immediately.

**Next Action:** Human (Audrey) must set `DIGITALOCEAN_API_TOKEN` secret and update Namecheap DNS. See `docs/AGENTS_RETRO_REVIEW.md` for full analysis and `standards/OAUDREY_DEPLOYMENT_STANDARD.md` for step-by-step instructions.

---

---

**Date/Time:** 2026-05-02T01:00Z

**Task Attempted:** Fix YAML parsing errors in GitHub Actions workflow files revvel-standards

**Outcome:** Success - All 334 tests now passing

**Root Cause of Failure (If any):** 
- `credential-label-router.yml` and `weekly-research.yml` had YAML parsing errors due to multiline JavaScript template literal strings
- Lines in template literal strings starting with text (like "This issue has been routed..." or "**What happens next:**") without proper indentation were being interpreted as new YAML keys
- Lines containing only "---" were being interpreted as YAML document separators
- The YAML parser requires ALL text within script blocks to have consistent indentation (12 spaces)

**Self-Healing Fix / Learned Lesson:**
1. **Identify all script blocks with backtick template literals** - Find lines with "= \`" that start script blocks in YAML
2. **Fix ALL lines within the block, not just some** - The opening line has indentation, but subsequent lines need it too
3. **Remove standalone "---" lines** - These are YAML document separators and break flow scalar parsing
4. **Include the closing line in fixes** - Even the line ending with `_`; needs proper indentation

**Next Action:** None - Work complete

---

## 2026-05-02: Repository Revvel-Standards Audit

### What Was Done
- Ran all 7 repositories through revvel-standards audit
- Fixed TypeScript error in thealttext-frontend (`context` parameter)
- Added TEST sections to all READMEs per revvel-standards requirements
- Created comprehensive REPO_AUDIT.md in revvel-standards

### Repositories Audited
| Repo | Tests | Status |
|------|-------|--------|
| reese-reviews | 245 ✅ | Complete |
| neurooz | 27 ✅ | Complete |
| revvel-standards | 334 ✅ | Fixed (was) |
| thealttext-frontend | N/A | Fixed |
| Soup2Bowl | N/A | Complete |
| mindmappr | 3 ✅ | Complete |
| revvel-music-studio | N/A | Complete |
| thealttext-backend | N/A | **Blocked** |

### Key Fixes
- **thealttext-frontend:** Added `context?: string` to analyzeFile options type in api.ts to fix TypeScript error

### Infrastructure Blockers
- **thealttext-backend:** Requires PostgreSQL database - documented in README

### Lessons Learned
1. Always check build first - catches TypeScript errors early
2. TEST section template helps standardize all repos
3. Some repos need infrastructure (PostgreSQL) - document as blockers
4. All repos now have proper TEST sections with Vercel placeholder URLs

### Next Steps (Human Action Needed)
1. Deploy each repo to Vercel Dashboard or CLI
2. Replace placeholder URLs with real Vercel URLs
3. Set up PostgreSQL for thealttext-backend

---

**Date/Time:** 2026-05-18T21:55:00Z

**Task Attempted:** Make Stuck Label Watchdog findings assign agents automatically instead of only removing conflicting labels

**Outcome:** Success — watchdog conflicts/stale PR states now create deduped `agent-fallback` repair issues, and `agent-fallback.yml` now listens to routed issue labels.

**Root Cause of Failure (If any):** The watchdog was doing the immediate label cleanup but stopped there. It commented on the PR without creating an assignable work item, and the fallback workflow documentation said issue labels could trigger it even though the live workflow did not listen for `issues` events.

**Self-Healing Fix / Learned Lesson:** When a watchdog fixes a symptom, also create a deduped repair issue with a hidden marker, concrete target PR context, routing labels, and acceptance criteria. Keep the routing workflow and documentation in sync; label-based agent assignment must have an actual `issues:labeled` trigger.

**Next Action:** Monitor future watchdog comments for linked repair issue numbers. Separately fix the pre-existing workflow YAML validation failures in `api-rate-limit-handler.yml` and `jules-coding-agent.yml` (BUG-006).
**Date/Time:** 2026-05-15T21:42Z

**Task Attempted:** Verify and fix Music Video Creator `safeParse` greedy JSON fallback.

**Outcome:** Success - `safeParse` now delegates to the balanced-brace `extractJsonFromContent` helper, regression coverage was restored, root tests pass, and the product typecheck/build passes.

**Root Cause of Failure (If any):** `safeParse` used the greedy fallback regex `(\{[\s\S]*\})`, which merged separate JSON blocks and prose into one invalid parse target. During validation, the remote branch also advanced with a commit that deleted the product tree/test, so the affected files had to be restored from the last good parser-fix commit before final validation.

**Self-Healing Fix / Learned Lesson:** Prefer the shared balanced JSON extractor over ad hoc regex parsing for LLM output. When a push is rejected because the branch advanced, inspect the remote delta before rebasing; if the rebase removes the task surface, restore only the needed affected files and avoid force-push. Root `npm test` can expose unrelated standards regressions; fix contained syntax/parser blockers when they prevent the requested regression from running.

**Next Action:** None for this parser issue; continue monitoring PR validation.

---

**Date/Time:** 2026-05-15T21:58Z

**Task Attempted:** Verify and fix Music Video Creator polling after provider completion.

**Outcome:** Success - `artifact_created` is now a terminal success state in the frontend, the UI no longer shows a spinner for provider-completed videos, and regression coverage verifies the status contract.

**Root Cause of Failure (If any):** `normalizeProviderStatus` maps successful provider completions to `artifact_created`, but the client terminal status set only contained later pipeline states (`verified`, `indexed`) that the current GET endpoint cannot produce. The same status was also categorized as processing, keeping the spinner active after the video was ready.

**Self-Healing Fix / Learned Lesson:** When a provider-facing API normalizes third-party state into an internal status machine, verify the frontend terminal/success/processing buckets against the statuses the current endpoint can actually return. Add source-level regression coverage for status-machine contracts when the status sets are local to a client component.

**Next Action:** None for this polling issue; continue monitoring PR validation.

---

**Date/Time:** 2026-05-15T22:08Z

**Task Attempted:** Verify and fix ColdTrace backend `python-jose[cryptography]` downgrade.

**Outcome:** Success - `coldtrace/backend/requirements.txt` now pins `python-jose[cryptography]==3.4.0`; no 3.3.0 pin remains in the workspace.

**Root Cause of Failure (If any):** The requirements file carried the vulnerable 3.3.0 pin, exposing the backend to CVE-2024-29370/CVE-2024-33664 JWT bomb denial-of-service risk and CVE-2024-33663 ECDSA algorithm-confusion signature-bypass risk. During validation, the container also exposed Python as `python3` only, so the initial `python` command failed.

**Self-Healing Fix / Learned Lesson:** For narrow Python dependency security fixes, verify both the absence of the vulnerable pin with search and package availability with `python3 -m pip install --dry-run --ignore-installed "<package>==<fixed-version>"`. Use `python3` in this cloud image unless `python` is known to exist. Root `npm test` may require `npm ci` first when `yaml` is missing from `node_modules`.

**Next Action:** None for this dependency issue; continue monitoring PR validation.

---

**Date/Time:** 2026-05-17T01:40Z

**Task Attempted:** Build and validate Revvel PromptForge prompt-generation app.

**Outcome:** Success - Added a static Next.js prompt-generation product with source-backed packet generation, market research docs, root tests, dashboard refresh, and passing product lint/build, root `npm test`, and workflow validation.

**Root Cause of Failure (If any):** Two validation mistakes recurred during the session: a root test was launched from the product directory, causing `MODULE_NOT_FOUND`, and root `npm test` initially failed because root `node_modules` was not installed (`Cannot find module 'yaml'`). Product lint also caught a React 19 compiler rule violation from setting state in an effect and a JSX apostrophe escaping issue.

**Self-Healing Fix / Learned Lesson:** Run root tests from `/workspace` and product checks from the product root as separate commands. If root tests fail on `yaml`, run `npm ci` at `/workspace` before retrying. For accessibility preferences in client components, initialize state lazily from `localStorage` with a `typeof window` guard instead of setting state synchronously inside `useEffect`. Set `outputFileTracingRoot` in product-level Next apps with their own lockfile to avoid workspace-root inference warnings.

**Next Action:** None for PromptForge; continue monitoring PR #13503 validation.

---

**Date/Time:** 2026-05-16T23:23Z

**Task Attempted:** Verify and fix Affiliate Hub dependency regression below the patched Next.js/PostCSS security floor.

**Outcome:** Success - `products/affiliate-hub` now resolves `next@15.5.18`, `eslint-config-next@16.2.6`, `eslint@9.39.4`, and PostCSS deduped/overridden to `8.5.14`; affiliate audit/lint/build and root `npm test` pass.

**Root Cause of Failure (If any):** The affiliate-hub manifest and lockfile had been downgraded to `next@^15.5.15`, `eslint-config-next@14.2.3`, and `postcss@^8.4.38`, reintroducing the dependency floor that BUG-010 had already resolved elsewhere. Restoring `eslint-config-next@16.2.6` also revealed its `eslint >=9` peer requirement, and the old `.eslintrc.json` triggered a circular-config serialization error under the restored tooling.

**Self-Healing Fix / Learned Lesson:** When restoring Next/PostCSS security patches across products, verify the installed dependency tree with `npm ls postcss` in addition to lockfile strings because framework package metadata can still mention its original dependency range while npm overrides dedupe to the patched version. Pair `eslint-config-next@16.x` with ESLint 9 and migrate from `.eslintrc` to `eslint.config.mjs` using `eslint-config-next/core-web-vitals` directly.

**Next Action:** None for this affiliate-hub regression; continue monitoring PR validation.

---

**Date/Time:** 2026-05-15T22:33Z

**Task Attempted:** Verify and fix unrelated ColdTrace dependency downgrades in the Music Video Creator PR.

**Outcome:** Success - `coldtrace/backend/requirements.txt` now matches `origin/main` for the reported unrelated pins: `geopandas==1.1.2`, `python-multipart==0.0.27`, and `python-dotenv==1.2.2`.

**Root Cause of Failure (If any):** The feature branch contained a merge-conflict or stale-dependency artifact that lowered ColdTrace backend pins while the PR scope was Music Video Creator work. These downgrades were unrelated to the feature and could have changed backend geospatial and request-parsing behavior.

**Self-Healing Fix / Learned Lesson:** For PRs that touch independent product areas, compare affected dependency files against `origin/main...HEAD` before accepting lock/requirements churn. For narrow requirements restores, validate both that the file no longer differs from base and that the restored pins resolve with `python3 -m pip install --dry-run --ignore-installed`. If root `npm test` fails with `Cannot find module 'yaml'`, run `npm ci` and rerun the suite.

**Next Action:** None for this dependency downgrade issue; continue monitoring PR validation.

---

**Date/Time:** 2026-05-15T22:15Z

**Task Attempted:** Verify and fix duplicated Music Video Creator API helper definitions.

**Outcome:** Success - `requireApiKey`, `OR_MODELS`, and `OPENROUTER_API_URL` are centralized under `products/music-video-creator/src/lib/`, both affected API routes import the shared definitions, and the lower-level orchestrator reuses the shared OpenRouter URL.

**Root Cause of Failure (If any):** Route-local copies of the same auth guard and OpenRouter defaults were added independently in `/api/video` and `/api/orchestrate`, creating a drift risk whenever auth or model routing changes.

**Self-Healing Fix / Learned Lesson:** Keep cross-route API primitives in a shared server-side library module. For mixed route/library consumers, split pure transport config from Next.js response helpers so non-route code can reuse constants without taking a Next dependency. When push is rejected because the branch advanced, fetch and inspect the remote-only commit before rebasing; if the remote only touches docs/state logs, rebase cleanly and push normally.

**Next Action:** None for this duplication issue; continue monitoring PR validation.

---

**Date/Time:** 2026-05-15T22:21Z

**Task Attempted:** Remediate npm audit findings discovered while validating Music Video Creator.

**Outcome:** Success - Next.js and `eslint-config-next` are upgraded to 15.5.18, PostCSS is pinned/overridden to 8.5.14, `npm audit --audit-level=moderate` reports zero vulnerabilities, and product lint/typecheck/build plus root `npm test` pass.

**Root Cause of Failure (If any):** The product still used Next.js 14.2.35 and its transitive PostCSS/lint tooling, which npm audit flagged for multiple Next.js advisories and a PostCSS stringify XSS advisory. Next 15 removed the high-severity findings, but npm still resolved Next's nested PostCSS below the patched version until an override forced 8.5.14.

**Self-Healing Fix / Learned Lesson:** For Next.js audit remediation, prefer the smallest patched major that satisfies advisories before jumping to the latest major. If npm audit still reports a vulnerable nested package under a framework dependency, use an npm `overrides` entry aligned with a direct devDependency pin and rerun audit/build. Next 15 in monorepos may infer the workspace root from the top-level lockfile; set `outputFileTracingRoot` in the product config to make builds deterministic.

**Next Action:** None for this dependency issue; continue monitoring PR validation.

---

**Date/Time:** 2026-05-15T21:43:00Z

**Task Attempted:** Fix current revvel-standards automation/test failures after false stuck-WR escalation for WR #13460.

**Outcome:** Success — stuck-WR detector now recognizes existing WR PRs by issue branch, issue references, and workflow-created PR comments; workflow YAML validation is clean; BITO verifier and dashboard parser failures are repaired; `npm test` passes.

**Root Cause of Failure (If any):** The detector relied on title-only GitHub search, which missed already-created PRs and opened false P0 stuck issues. Full validation also exposed stale workflow/test contracts: malformed YAML in two workflows, BITO verifier drift from the live workflow action/secret names, and a dashboard parser that found markdown links without assigning them.

**Self-Healing Fix / Learned Lesson:** Use deterministic workflow signals for dedupe/association instead of fuzzy title searches. When `npm test` fails past the original issue, keep walking the chain: syntax failures and stale contract tests are actionable code/config blockers, while missing repository secrets are warnings/infrastructure signals when the script cannot inspect them. Generated dashboards must exclude dependency folders and avoid checkout-path-derived names.

**Next Action:** Merge PR #13469 after review/CI; the branch already includes unit coverage and passing full local validation.

---

**Date/Time:** 2026-05-17T02:45:00Z

**Task Attempted:** Fix PR #13482 merge readiness for the Life Insurance Lead Engine after cubic identified the newsletter opt-out compliance mismatch.

**Outcome:** Success — added a real local newsletter opt-out path, corrected the product README compliance claim, removed incomplete-work language, upgraded the product dependency/tooling stack, and verified `npm run typecheck`, `npm run lint`, `npm run build`, and `npm audit` all pass in `products/life-insurance-lead-engine/build`.

**Root Cause of Failure (If any):** The original newsletter component only set a submitted flag and contained an unwired integration TODO while product docs claimed GDPR/CCPA opt-out support. Validation also exposed stale package choices: an old vulnerable Next.js version, vulnerable `xlsx`, no lockfile for auditability, and a lint script tied to the removed `next lint` command.

**Self-Healing Fix / Learned Lesson:** PR review fixes should validate the changed app, not only the reviewed line. For Next 16 apps, use `eslint .` with the flat `eslint-config-next` exports, run `next typegen` before direct `tsc --noEmit`, set `turbopack.root` for nested product apps, and replace abandoned vulnerable packages (`xlsx`) with maintained patched forks (`@e965/xlsx`) when API-compatible.

**Next Action:** Merge PR #13482 after CI confirms the pushed branch.

---

**Date/Time:** 2026-05-17T01:20Z

**Task Attempted:** Implement the whole WR research/search engine requested from GitHub context.

**Outcome:** Success - added `scripts/research-engine.js`, `.github/workflows/research-engine.yml`, `docs/RESEARCH_ENGINE_STANDARD.md`, canonical research-engine labels, dynamic label sync from `.github/labels.yml`, and `tests/research-engine.test.js`. Focused tests, workflow validation, and root `npm test` pass.

**Root Cause of Failure (If any):** The previous research module was a manual six-agent script and did not own the full WR lifecycle: no lane labels, no master checklist, no per-agent checklist, no OpenRouter three-model triangulation contract, no durable code-review handoff, and no automatic-fix prompt for reviewers. Validation also surfaced three existing workflow jobs without `timeout-minutes`.

**Self-Healing Fix / Learned Lesson:** For research WRs, implement the orchestrator as executable automation plus a standard, not only prompt text. Make label sync consume `.github/labels.yml` directly so new engine labels do not drift from the hard-coded sync workflow. When `npm run workflows:validate` fails on missing timeouts, add the job timeouts immediately because that is a code/config blocker, not a research blocker. If `OPENROUTER_API_KEY` is missing, the engine should write a visible infrastructure-blocker packet and label the item instead of silently failing.

**Next Action:** Monitor PR #13499 review/CI and merge after reviewer approval.

---

**Date/Time:** 2026-05-17T01:37Z

**Task Attempted:** Fix BASIC WR intake labels after WR PR Creation skipped issues selected from GitHub.

**Outcome:** Success - BASIC WR/work-request intake is now label-resilient: active and portable templates apply `work-request` + `weekly-research`, canonical labels include the template labels, WR workflows accept BASIC WR issue types and normalize missing labels, and tests/workflow validation pass.

**Root Cause of Failure (If any):** The issue templates referenced labels (`work-request`, `quick`, `OpenHands`) that were missing from the canonical label sync file, and `wr-pr-creation.yml` only treated `[WR]`/`weekly-research` as WR signals. If GitHub issue-type/template selection arrived without the expected label set, the workflow could post a skip notice instead of creating the WR PR. The workflow also had a stray closing brace in a github-script block that YAML validation did not catch.

**Self-Healing Fix / Learned Lesson:** For GitHub issue-form automation, define every template label in `.github/labels.yml`, include the downstream trigger label directly on the template when possible, and make workflows accept multiple stable WR signals (`[WR]`, `work-request`, `weekly-research`, BASIC WR issue type). Add github-script compile guards for critical workflow blocks because YAML parsing alone cannot detect JavaScript syntax errors embedded in actions/github-script steps.

**Next Action:** Monitor PR #13501 CI/review and merge after approval.
**Date/Time:** 2026-05-17T02:04Z

**Task Attempted:** Complete Perplexity integration without requiring `PERPLEXITY_API_KEY`.

**Outcome:** Success - The Perplexity research workflow now installs `helallao/perplexity-ai` from GitHub, calls the fork through a no-key Python bridge, registers a disabled no-key MCP entry, removes the Credential Gatekeeper Perplexity secret blocker, and passes focused integration tests, workflow validation, and the root test suite.

**Root Cause of Failure (If any):** The first validation attempt failed before workflow parsing because root dependencies were not installed (`Cannot find module 'yaml'` from `scripts/automation-doctor.js`). Due diligence also found the fork contains Emailnator/account-generation paths and an upstream issue reporting empty anonymous `Client.search()` responses, so a direct unfiltered integration would have been unreliable and unsafe.

**Self-Healing Fix / Learned Lesson:** For no-key Perplexity work, use only the anonymous Labs/Web query paths from `helallao/perplexity-ai`; do not wire Emailnator or generated-account logic into Revvel automation. Prefer `LabsClient(..., model="sonar")` first and fall back to `Client.search(..., mode="auto")` because upstream issue #70 documents `Client.search()` instability. If workflow/root tests fail on missing `yaml`, run `npm ci` at `/workspace` and rerun validation.

**Next Action:** None for the no-key Perplexity integration; monitor PR #13507 validation.

---

**Date/Time:** 2026-05-17T21:15:00Z

**Task Attempted:** Resolve PR #13482 merge-state conflicts and categorize the user's status/score/database architecture concerns from the review thread.

**Outcome:** Success — merged current `main` into the branch, resolved add/add conflicts by keeping the hardened lead-engine implementation, added a Decision Scoring Engine standard, updated the WR template to require explicit scoring models, corrected the lead-generation WR with async-safe eligibility pseudocode, and made the advanced CodeQL workflow manual-only because default code scanning is already enabled.

**Root Cause of Failure (If any):** GitHub reported `mergeStateStatus: DIRTY` because `main` had gained overlapping product/doc files after the branch was created. The WR also lacked a reusable decision-scoring contract, making it easy to discuss booleans, status, score, contactability, manual review, and tenant separation as separate concerns.

**Self-Healing Fix / Learned Lesson:** When a PR is green but not squash-mergeable, check `mergeStateStatus` and merge `origin/main` before assuming reviews are the blocker. If CodeQL fails with "advanced configurations cannot be processed when the default setup is enabled," keep the advanced workflow manual-only or disable default setup; do not run both automatically. For regulated or revenue-facing filtering, document status and score together, require threshold bands and explanation trails, and evaluate async eligibility decisions before filtering exported records.

**Next Action:** Confirm PR #13482 checks pass after the merge-resolution push.

---

**Date/Time:** 2026-05-18T22:30:00Z

**Task Attempted:** Fix blank/BASIC WR label parity, make agent/GOAP errors self-heal, and remove Doppler as a hard dependency for credential readiness.

**Outcome:** Success — both WR templates now carry the full canonical WR routing label set; WR PR creation normalizes those labels; WR auto-classify accepts `[WR]`/`weekly-research` signals when labels lag; Credential Gatekeeper now runs a backup harness even without Doppler; weekly research OpenRouter failures create a self-heal packet and route `auto-fix`, `ralph-loop`, and `agent-fallback`; workflow validation, label checks, focused tests, and root `npm test` pass.

**Root Cause of Failure (If any):** The previous BASIC WR fix only guaranteed the minimum `work-request`/`weekly-research` path, while downstream WR automation expects a richer routing set (`wr:in-progress`, `deep-research`, `openrouter`, `role:orchestrator`). Credential Gatekeeper also exited early when no Doppler token existed, which turned a missing paid vendor account into a workflow blocker even when GitHub Actions secrets or FOSS/local backups could satisfy the same need. Full validation also exposed a missing CodeQL job timeout and a malformed workflow validation test block.

**Self-Healing Fix / Learned Lesson:** Treat labels as a contract shared by templates, workflow detection, and PR mirroring. Secret readiness must check GitHub-native and FOSS backup paths before declaring a blocker: direct GitHub Actions secrets, env, JSON, SOPS/age, pass, Bitwarden CLI, 1Password CLI, Infisical/Vault handoff, and only then Doppler. Agent failures should emit a deterministic recovery packet with routing labels instead of a manual-only comment. If `automation-doctor` cannot run because root deps are missing, run `npm ci`; if it finds a missing timeout, patch the workflow immediately.

**Next Action:** Monitor PR #13560 CI/review; no remaining code blocker from this session.

---

**Date/Time:** 2026-05-19T05:34Z

**Task Attempted:** Unstick WR #13595 / PR context requesting `filiptronicek/green-action@v1.0.2` green website reporting for all Revvel apps.

**Outcome:** Success - added the active Revvel green website workflow, portable app template, reporting standard, README carbon marker, and regression coverage. Focused green tests, workflow YAML validation, Automation Doctor, and full root `npm test` pass after `npm ci`.

**Root Cause of Failure (If any):** The prior work stopped after triage/research comments and never created the workflow/template/docs. During validation, the new workflow initially had an unquoted `if:` expression containing `docs:`, which YAML parsed as a nested mapping. Full workflow validation also exposed two pre-existing blockers: an unindented multiline JavaScript template literal in `ship-status-audit.yml` and duplicate `script` keys in `ship-to-market.yml`.

**Self-Healing Fix / Learned Lesson:** Quote GitHub Actions expressions when they contain commit-message strings with colons, and keep README-mutating workflows guarded against their own generated commits. When root workflow validation fails beyond the target workflow, continue fixing small YAML syntax blockers so the repo-wide validation gate returns to green.

**Next Action:** Monitor PR #13600 CI/review; apply the `templates/cicd/green-website.yml` template to public app repos that need green website reporting.

---

**Date/Time:** 2026-05-20T23:56Z

**Task Attempted:** Verify and fix state schema drift between `schemas/state.schema.json` and the product-state tooling.

**Outcome:** Success - the schema now requires `product_slug`, matches the agent-generated product state template and `init-product.sh` emitted shape, includes Ajv-backed regression coverage, and passes both `node tests/state-schema.test.js` and root `npm test`.

**Root Cause of Failure (If any):** The schema had diverged from the producers/consumers: it required legacy `slug` plus unrelated `status`/`project_class`/`requires`/`steps` fields while the template and scaffolder emit `product_slug`, `step`, `step_name`, readiness booleans, timestamps, and `notes`. The first regression run also surfaced that Ajv uses the canonical Draft 7 meta-schema URI, so the schema's `https://` meta URI prevented compilation.

**Self-Healing Fix / Learned Lesson:** Contract schemas must be tested against the exact templates and generated examples they are meant to govern. Use a real JSON Schema validator in CI and include both positive fixtures (template/example/generated shape) and a negative fixture for the deprecated field name. Prefer the canonical `http://json-schema.org/draft-07/schema#` URI for Ajv Draft 7 compatibility.

**Next Action:** Monitor PR #13637 CI/review; keep future product-state field changes synchronized across schema, template, scaffolder, and tests.

---

**Date/Time:** 2026-06-28T17:00:00Z

**Task Attempted:** Review PR #14772 (`codex/fix-blocking-again`) — deep-search workflow cleanup, mislabeled as an image-upload fix for #14771.

**Outcome:** Diff verified valid at head `d624038`. No introduced code blocker found. Multiple verification gaps and process risks identified instead.

**Root Cause of Failure (If any):** Conflicting reviewer verdicts were caused by *staleness*, not by genuine disagreement: (1) `octopus-review` posted a "DO NOT MERGE — three critical syntax errors" verdict against an *earlier* commit whose broken triplicated code was already removed by the head commit, so its findings were stale-by-commit; (2) a DeepWiki search-index snapshot of `scripts/openrouter-routing.js` lacked the `deep_search` profile that actually exists at `scripts/openrouter-routing.js:40-51` (built from `config/model-lookup.json`) and `scripts/openrouter-routing.js:54-87` (hardcoded fallback), causing an initial false "missing profile / dead JSON" conclusion that was stale-by-index. `devin-ai-integration`, Copilot, and Bito were correct against the head commit. Separately, the PR title/scope mismatch (image upload vs. workflow cleanup) was real — there is no image-upload code in the repository to fix; #14771 reads as an external GitHub UI/infra error.

**Self-Healing Fix / Learned Lesson:**
1. **Re-validate every reviewer/tool verdict against the current head SHA before acting.** A bot verdict outlives the commit it was made against; tag findings with the SHA they target. This repo has no SHA-pinned re-validation gate today (`.github/workflows/ralph-loop.yml:62-90` escalates but does not re-check against head).
2. **Search-index/tool snapshots can be stale.** Confirm code-structure claims with a direct file read at the head SHA, not from a cached index.
3. **No supervising "Controller" over orchestrators exists.** oAudrey and OpenRouter are peer personas (`scripts/openrouter-personas.js:60-101`); GOAP is unimplemented (`docs/AUTOMATION_AUDIT.md:168`); the Controller-over-orchestrators model is only a proposal (`wr/issues/issue-13741-review-google-ax-as-a-controller.md:67-75`). Do not assume a fleet controller is watching.
4. **Single self-approving reviewer + auto-merge is an identified hazard.** Require a non-author approval (second human or CODEOWNERS gate) and branch protection on `main` so a tired/distracted human or a stale bot approval cannot cause "merge havoc." This protects the human, it does not replace them.
5. **`openrouter/fusion` slug is unverified** against the live OpenRouter catalog — do not assume valid. Confirm before any deep-search routing edit.

**Next Action:** Rebase PR #14772 to clear `has-conflicts`; retitle to match real scope (workflow cleanup, not image upload) or split; confirm `openrouter/fusion` before any model-routing change. Recommend building the SHA-pinned verdict-validation gate and the non-author-approval merge guard before scaling automation to additional repos.

---

**Date/Time:** 2026-06-30T00:00:00Z

**Task Attempted:** Code-review the agent-routing/self-heal workflow fleet for the documented `gh`-CLI failure modes (no auth, no repo target, too-narrow permissions) and fix the real ones via PR.

**Outcome:** Success — scanned all 174 workflows with a verifier script, hand-confirmed 5 genuinely broken workflows, and fixed them. `npm test` (278 pass) and YAML validation are green; `workflows:validate` shows `Invalid workflows: 0` (the pre-existing 19 missing-`timeout-minutes` jobs are in untouched files and are deferred to a follow-up PR).

**Root Cause of Failure (If any):** Five workflows invoked the `gh` CLI without satisfying its runtime requirements: `budget-aware-agent.yml` (`fallback-handler`) ran `gh issue create` with no `GH_TOKEN`, no `GH_REPO`/checkout, and workflow `permissions: contents: read` (missing `issues: write`) — and had two `echo` statements collapsed onto one line, corrupting the `critical` budget output; `credential-label-router.yml` and `weekly-research.yml` each had one step calling `gh api`/`gh issue` with only a vendor token in `env:` (no `GH_TOKEN`); `agent-dispatcher.yml` and `api-rate-limit-handler.yml` ran `gh workflow run`/`gh issue create` with no `GH_REPO` and no checkout (and used the default token, which cannot cascade-trigger downstream workflows).

**Self-Healing Fix / Learned Lesson:** A line-by-line `gh` scanner produces false positives on multiline commands where `--repo` sits on a continuation line (`reset-self-heal-issue.yml`, `secret-persistence-guard.yml` ×4) and on `echo "...gh issue create..."` strings (`eeat-trust-cron.yml`) — always hand-verify each hit against the full step before claiming a bug. Apply the repo-standard PAT-with-fallback `GH_TOKEN: ${{ secrets.ADMIN_GITHUB_TOKEN != '' && secrets.ADMIN_GITHUB_TOKEN || secrets.GITHUB_TOKEN }}` (required for any step that uses `gh workflow run` to cascade) and `GH_REPO: ${{ github.repository }}` for checkout-less jobs; grant `issues: write` at the narrowest (job) scope.

**Next Action:** Open the PR for these 5 fixes. Follow-up batch: add `timeout-minutes` to the 19 jobs flagged by `workflows:validate` across the untouched files.

---

**Date/Time:** 2026-06-30T00:00:00Z

**Task Attempted:** Follow-up batch from the gh-CLI audit — add `timeout-minutes` to every job flagged by `npm run workflows:validate` so the fleet-wide validator returns green.

**Outcome:** Success — added `timeout-minutes: 30` to 29 jobs across 19 workflow files. `workflows:validate` now reports `Jobs missing timeout: 0` and exits 0; `npm test` passes (291); all 19 files parse as valid YAML. The diff is purely the 29 timeout additions (verified no other lines changed).

**Root Cause of Failure (If any):** 29 jobs across 19 workflows omitted `timeout-minutes`, so they inherited the GitHub Actions default of 360 minutes — a runaway job could burn 6h of runner time, and the repo's own `automation-doctor --validate` gate counts these as failures (this baseline had been carried for a while; see prior learnings entries citing "jobs without timeout-minutes").

**Self-Healing Fix / Learned Lesson:** When bulk-editing many workflow files, insert via a raw line-based patch (anchor on each target job's `runs-on:` line) rather than a YAML round-trip, which would reflow formatting and strip comments. A column-0 line inside a job's block-scalar `run:` body can fool a naive "am I still inside `jobs:`" tracker into stopping early (it skipped `secrets-guardian.yml`'s `alert-on-failure` job) — always reconcile the patched set against the target set and hand-fix the remainder. `30` is a safe uniform cap for these automation/label/lint/heal jobs (all finish in 1-3 min; well under the 360-min default) and `automation-doctor` only checks for the field's presence.

**Next Action:** Open the PR for these 29 timeout additions. The fleet-wide `workflows:validate` gate is now green end-to-end.

---

**Date/Time:** 2026-07-07T01:00:00Z

**Task Attempted:** Fix the pre-existing #15215 fallout: 3 failing tests in `tests/generate-wr-comment-stripping.test.js` and every FULL-template WR generation refusing with "GENERATOR REFUSED: output failed wr-lint".

**Outcome:** Success — root test suite is fully green (393/393, was 389/392) and a real end-to-end FULL-template generation passes wr-lint again. Also stopped test runs from mutating tracked fixture files.

**Root Cause of Failure (If any):** Two stacked defects. (1) `wr-lint.mjs` rule 11's opener regex `/REVVEL-DISABLED(?!-END)\b/` matched a bare PROSE mention of the token — and `WR_TEMPLATE_FULL.md`'s new "Superseded Content" guidance comments mention "a REVVEL-DISABLED header" — so every generated FULL WR opened a phantom archival block that never closed, and the generator's hard lint gate refused all output. (2) The regression tests tried to sandbox via `HERE=<tmpdir>` env, but `generate-wr.sh` unconditionally reassigned `HERE`, silently ignoring the override — tests ran against the real template AND wrote/mutated tracked `wr/issues/issue-99999-*.md` fixtures on every `npm test`.

**Self-Healing Fix / Learned Lesson:** Anchor lint-rule regexes on the canonical machine-greppable shape, not the bare token: rule 11 now requires `REVVEL-DISABLED |` (the pipe-separated field header per COMMENT-DONT-DELETE.md §3), which all existing rule-11 fixtures already use. When a template documents a lint-enforced convention in prose, the linter must distinguish mention from use. And when a test sets an env override, verify the script actually honors it — `VAR="${VAR:-default}"` in the script, plus a pollution check (`git status` after `npm test`) catches silent sandbox escapes. Added a rule-11 regression test for the prose-mention case.

**Next Action:** None for this regression — monitor the PR.
**Date/Time:** 2026-07-07T00:00:00Z

**Task Attempted:** Stop the external V.E.I.N.S. engine from flooding the repo with near-duplicate `[VEINS]` alert issues (11 opened in one burst on 2026-07-06, incl. three copies of "Stuck workflow: PR Lifecycle" differing only by minute counter).

**Outcome:** Success — closed all 11 stale `[VEINS]` issues (verified 0 remain open) and added `.github/workflows/veins-intake-dedup.yml`: on `issues: opened` with a `[VEINS]` title, normalize the title (strip volatile numbers) and close the newcomer as duplicate when an older open twin exists.

**Root Cause of Failure (If any):** The `[VEINS]` issue creator is NOT in this repo — no workflow here creates them; the V.E.I.N.S. engine runs externally and posts with the owner's token, so the learnings.md dedup rule could not be applied at the source. The burst itself traced to the installation API rate-limit saturation making workflows look hung (~3,700m) to the engine's stuck-check.

**Self-Healing Fix / Learned Lesson:** When an issue-creating automation lives outside the repo, dedup at intake instead: an `issues: opened` gate that title-matches after stripping volatile numbers is enough to collapse alert storms, and closing a VEINS issue is its documented ack path ("Closing it marks the heal as accepted upstream"). GitHub REST cannot truly delete issues — close with `not_planned`/`completed` is the deletion equivalent.

**Next Action:** Merge the dedup gate. Separately: 3 pre-existing test failures on main in `tests/generate-wr-comment-stripping.test.js` (WR generator refuses output, regression #15215) — needs its own fix, unrelated to this change.

---

**Date/Time:** 2026-07-08 ~05:30 UTC

**Task Attempted:** Restore the `main` test gate: 6 test files red (390 pass / 6 fail) — generate-wr ×2, work-request-form-sync, wr-pr-creation, workflow-yaml-validation, openrouter-personas.

**Outcome:** Success — suite now 403 pass / 0 fail (branch `claude/agent-creation-dashboard-nu90lb`, PR #15497; WRs #15499–#15502).

**Root Cause of Failure (If any):** One disease behind all six: OVERLAPPING PARALLEL-AGENT MERGES on a red base. Multiple agents fixed the same bug simultaneously; each merge interleaved one variant into another mid-expression. Because the gates were already red, nothing blocked and nobody looked. Hidden damage found once repaired: `wr/scripts/generate-wr.sh` did not run at all (6 stacked awk variants, 5 unterminated `$(`); `wr-auto-classify.yml`'s `if:` carried 7 orphaned condition fragments (errored on every issue event); `wr-pr-creation.yml` had 2 github-script blocks that no longer compiled (9 interleaved route-tag variants; 6 Output-Type fallback variants); plus one stale hardcoded persona count (8 vs 9). A prior learnings entry had even flagged the generate-wr failures and deferred them — deferral is how red became ambient.

**Self-Healing Fix / Learned Lesson:** LOCKED-IN — see `standards/GREEN_MAIN_STANDARD.md`. (1) A red gate on main outranks all WR work; never build on red. (2) Before fixing anything, check whether a fix already landed — reconcile, don't append; one implementation per behavior, delete the losers. (3) Make assertions drift-proof: derive counts/lists from the source of truth (`Object.keys(REGISTRY).length`, never `8`). (4) Never weaken a gate to get green — reconstruct intent and verify against the current implementation. (5) The interleave signature to grep for in review: redeclared `const`, repeated `return`, stacked comment headers citing different issue numbers. Every repaired site carries an inline `RECONSTRUCTED 2026-07-08` comment so the lesson lives where it applies.

**Next Action:** Keep `main` at 0 fail. Reviewers treat "CI was already failing" as a blocker, not an excuse.

**Date/Time:** 2026-07-10T22:30:00Z

**Task Attempted:** Block 1 of the CUDA execution-model Grid - Host + Device Tree + Agent Contract Schema. First real dogfood of the checkpoint-gated rule shipped in PR-A #15668.

**Outcome:** Shipping. schemas/agent-contract.schema.json (Draft 2020-12), config/device-tree.yml (11 Thread kinds across 7 roles), scripts/host.js (pure decomposer with public decompose/validate API), .github/workflows/host.yml (triggers on WR labels, decomposes, comments contract back to issue), tests/host.test.js (15 assertions covering fallback, multi-block parse, classifier, gating, schema validation). 520/520 green (was 505 pre-block, added 15 host tests). 188/188 workflows valid.

**Root Cause of Failure (If any):** Two drift bugs on main since PR-A branched: (1) openrouter-personas.test.js again hardcoded a fixed persona LIST (not just count) - the security fleet added five more personas (exfil, exprwatch, permit, redteam, sentinel); (2) docs/SECRETS_MAP.md drifted from generator output. Both are the same disease that hit us twice this week - hardcoded expectations vs source-of-truth drift.

**Self-Healing Fix / Learned Lesson:** (1) When a test asserts membership of a growable registry, assert SUPERSET (missing elements empty), NOT equality. The mandatory core+fleet personas are the SLA; extras beyond that are fine. Applied to openrouter-personas.test.js line 87. (2) The Host is deterministic on purpose. No LLM call is required to decompose a WR - a small explicit rule set applied to labels + a ## Blocks section reads the intent unambiguously. This makes the Grid pause/resume flow honest and the tests trustable. Only refinement (not decomposition) would benefit from an LLM, and that is opt-in via HOST_LLM_REFINE env var not implemented yet. (3) Classifier keyword ordering matters: 'Watchdog + Code Verifier' hits verify before review - fixed by putting more specific review nouns (watchdog, verifier) BEFORE the generic testing verbs and using word boundaries.

**Next Action:** Ship PR-B for Block 1, wait for #15668 approval AND #NEW approval before launching Block 2 (Watchdog + Code Verifier). Update HANDOFF.md Block 1 row to shipped+awaiting.
**Date/Time:** 2026-07-10T21:20:00Z

**Task Attempted:** Introduce checkpoint-gated Grids so the owner can review complex work between complete Blocks without weakening the anti-scaffolding rule. Seed the CUDA execution-model rollout (Host + Watchdog + Memory) as a series of checkpoint-gated Blocks.

**Outcome:** PR-A shipped as draft #15668 - the rule itself + baseline restore. Suite 505/505 green, 187 workflows valid. Session paused per the new rule; PR-B (CUDA Block 1) deferred until owner marks #15668 checkpoint-approved or comments next.

**Root Cause of Failure (If any):** Two pre-existing baseline failures blocked new work per GREEN_MAIN_STANDARD: tests/openrouter-personas.test.js hardcoded 18 personas (catalog now has 23 after security fleet added), and docs/SECRETS_MAP.md had drifted from generator output. Same disease - hardcoded expectations vs source-of-truth drift - noted in the 2026-07-08 entry.

**Self-Healing Fix / Learned Lesson:** (1) The right way to run a checkpoint-gated rollout is to make the rule itself the FIRST checkpoint-gated PR - dogfood the mechanic before layering the systems that depend on it. (2) Baseline restoration MUST happen before layering new work; splitting the fix into its own commit inside the same branch keeps history clean and makes the rule PR reviewable. (3) When .github/labels.yml adds new labels but sync-labels.yml has not yet run, gh pr edit --add-label fails with not found - the labels only become usable after the sync workflow runs post-merge. Do not treat this as a blocker; it self-heals on merge.

**Next Action:** Wait for owner review on #15668. On checkpoint-approved label or next comment, launch PR-B: feat(cuda) Host + device-tree + agent-contract schema as Block 1 of 4. Do not launch PR-B until #15668 is approved (dogfooding the rule this session shipped).
**Date/Time:** 2026-07-10T23:15:00Z

**Task Attempted:** Owner reported three open WRs stuck with 9 blank *No response* fields and 7 unfilled None dropdowns each (#15665, #15661, #15660). Owner rule: agents must run a search loop until every field is filled - never leave a blank. Building a WR Field Filler as a new parallel lane (does NOT touch the CUDA Grid or the controller).

**Outcome:** Shipping. config/wr-field-defaults.yml (declarative per-field defaults keyed off Output Type; every field has a guaranteed non-empty fallback: string), scripts/wr-fill-fields.js (pure library + CLI with cascading fill: rule-based -> LLM refinement via OpenRouter cascade -> declared fallback), .github/workflows/wr-field-filler.yml (fires on issue events; only runs when blank markers are detected, so manually filled WRs are not overwritten), tests/wr-fill-fields.test.js (12 assertions including source-of-truth alignment vs the issue form YAML). 517/517 tests green (505 baseline + 12 filler). 188/188 workflows valid. Smoke tested against real stuck WR #15665: filled 21 field(s), zero blank markers remaining, passes wr-lint rule 12 (forbidden placeholders).

**Root Cause of Failure (If any):** Two false positives on wr-lint during smoke test - the initial defaults used  in bracket notation which wr-lint rule 3 catches as a raw placeholder. Fixed by rewording to wr-blocker which is unambiguous but does not trip the bracket-token heuristic.

**Self-Healing Fix / Learned Lesson:** (1) Test the filler output against the actual gate (wr-lint) as part of the unit tests - not just against the human eye. Added a test that greps the filled body for every forbidden pattern from wr/lint-rules/no-pending-placeholders.md. (2) Cascade the LLM call: primary paid model -> free-tier models -> declared fallback string. Each field is filled INDEPENDENTLY so one LLM failure does not block the others. This matches the fleet rule 'every failure is where our agent fleet rises above the best because we planned for it.' (3) The workflow is idempotent: it checks for blank markers first and only runs when there is something to fill. A human-completed WR is safe. (4) LLM refinement is ONLY used for text fields whose default_by is explicitly 'llm' in the defaults YAML - dropdowns and checkboxes are always rule-based so an untrusted issue body cannot escape the allowed-option enum via prompt injection.

**Next Action:** Ship PR-C for the WR Field Filler. Once merged, run the manual dispatch on the three stuck WRs (#15665, #15661, #15660) to auto-fill them so wr-pr-creation.yml can process them. Do not touch the controller lane.

**Date/Time:** 2026-07-11T00:15:00Z

**Task Attempted:** Owner ran `wr-pr-creation.yml` on a stuck WR with `_No response_` fields; it failed. Owner asked: "does the LLM pick up requests that for some reason didn't get those fields put in? and reset the labels?" — original workflow only fired on issue events, not downstream failures or a sweep. Extending the WR Field Filler with a self-heal loop.

**Outcome:** Extended `.github/workflows/wr-field-filler.yml` with THREE new triggers on top of the original issue-event triggers: (1) `workflow_run` listening for failed runs of `WR PR Creation` and `WR Lint` — the exact self-heal loop the owner asked for; (2) a 15-minute `schedule` sweep to catch stragglers, dropped events, and WRs that predate the filler; (3) after a successful fill, cycle the `wr:reset` label (remove-then-add) which per `wr-pr-creation.yml`'s own header comment is "the self-heal system to force a fresh PR creation pass." Ships with 14 new tests: 6 for the sweep helper (`scripts/wr-fill-sweep.js`) + 8 workflow-shape tests that assert every new trigger + the label-cycle + the `ADMIN_GITHUB_TOKEN` fallback pattern. `wr:reset` is a pre-existing label (not invented). Full suite green: 531/531. Workflows valid: 188/188. WR #15666 confirmed as another stuck WR that will be picked up by the sweep automatically once merged.

**Root Cause of Failure (If any):** The v1 filler was intake-only. It could not self-heal a WR that had already been created blank because the issue-event triggers had already fired (and been filtered out) before the WR reached wr-pr-creation. Any WR that failed downstream stayed failed until a human edited it — exactly the manual-loop problem this whole system is meant to eliminate.

**Self-Healing Fix / Learned Lesson:** (1) `workflow_run: types: [completed]` fires on BOTH success and failure — must guard the discover job with a step-level `if: conclusion != 'failure'` so successful downstream runs are no-ops. Without that guard, the sweep runs on every green PR-creation, hammering the API for zero value. (2) `matrix.issue` from `fromJson()` needs `if: fromJson(needs.discover.outputs.issues || '[]')[0] != null` to short-circuit when the sweep found nothing — otherwise GitHub Actions errors on empty matrices. (3) The label toggle must be REMOVE-then-ADD, not just ADD — if the label is already present, an add-only op emits no `labeled` event and the downstream workflow never wakes up. Documented this in the step comment so a future refactor does not "optimise" the remove step away.

**Next Action:** Push to `feat/wr-field-filler` — the amend arrives on PR #15670 automatically. After #15670 merges, the sweep will discover #15665, #15661, #15660, #15666 on its next scheduled tick (within 15 min) and fill them without a manual dispatch.

**Date/Time:** 2026-07-13T11:45:00Z

**Task Attempted:** Stop `stuck-check-watchdog.yml` from crashing mid-run with `HttpError: Label does not exist` (404) when it tried to remove `wr:checking` during a `move-code` transition (GitHub Actions job 86803890088).

**Outcome:** Success — fixed on branch `copilot/fix-commit-checks` (commit 5e7a96c): the `issues.removeLabel({ name: 'wr:checking' })` call now has a `.catch` that swallows ONLY 404 and rethrows everything else.

**Root Cause of Failure (If any):** Label-mutation race. Between the watchdog's issue fetch and its `removeLabel` call, another workflow (e.g. `wr-auto-classify`, the field-filler's `wr:reset` cycle, or a manual relabel) had already removed `wr:checking`. The REST API returns 404 for a remove of an absent label, github-script treats any thrown HttpError as fatal, and the whole watchdog job dies — leaving every remaining stuck issue in the sweep unprocessed. One racing relabel silently disabled the entire recovery pass.

**Self-Healing Fix / Learned Lesson:** `removeLabel` is not idempotent on the API side, so make it idempotent at the call site: wrap every `github.rest.issues.removeLabel` in a catch that swallows only `err.status === 404` (the desired end state — label gone — is already true) and rethrows anything else, because a 401/403 is a real auth/permission failure that must still surface. This is a fleet-wide pattern, not a one-off: any workflow that removes labels in a multi-workflow label ecosystem WILL race eventually. When auditing or writing new label-touching workflows, grep for bare `removeLabel` calls and apply the same guard. (Companion rule already learned: label toggles that need to re-fire downstream `labeled` events must be REMOVE-then-ADD.)

**Next Action:** Merge the branch. Opportunistic follow-up for a future sweep: audit the other 180+ workflows for unguarded `removeLabel` calls and file a `[SELF-HEAL]` issue if any are found.

**Date/Time:** 2026-07-13T15:45:00Z

**Task Attempted:** Full-repo audit-and-fix session spanning the whole automation fleet: (1) a scoped bug sweep of `.github/workflows/*.yml` and `scripts/*` against the recurring-gotcha categories in this file's own header + `CLAUDE.md`; (2) recon of past WR/PR "follow-up" commitments that were made and never completed; (3) a new checkbox-triggered WR-generation feature plus a shared audit/self-healing playbook; (4) a four-fleet "is it actually wired in" audit (WR pipeline, self-healing/monitoring, review/persona roster, secrets+deployment) that surfaced components built but never connected to a live trigger; (5) closing out one of those orphaned WRs (#15797/#15800) end to end.

**Outcome:** Success — 16 tracked tasks completed, 15 draft PRs opened (all with real verification: `npm test`, YAML/`py_compile` validation, or an honest "cannot be verified live from this sandbox" caveat where genuinely untestable), 2 new WR issues filed for still-open security gaps, 1 PR merged (the fleet-wide broken SAML check), 1 orphaned WR/PR pair closed with a documented reason. No auto-merges, no unreviewed code shipped — every fix went through the same draft-PR path the fleet already uses for human/agent review.

**Root Cause of Failure (If any):** N/A — this entry documents a successful session's method and tooling, not a failure. (Individual findings within the session each got their own root-cause writeup in their PR body per this file's/`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`'s methodology, rather than being duplicated here.)

**Self-Healing Fix / Learned Lesson:** Tools and skills actually used, for whoever runs the next one of these:
- **Orchestration:** the `Agent` tool, spawned in parallel batches (single message, multiple calls) — read-only research agents (`Explore`/`general-purpose` type, no `isolation`) for investigation-only passes, and `general-purpose` agents with `isolation: "worktree"` for anything that writes code, so N agents editing different files never race on the same working tree. Each agent got a self-contained prompt with full context (file paths, line numbers, exact repo conventions to follow) rather than a vague instruction — agents have no memory of this conversation.
- **Progress tracking:** `TaskCreate`/`TaskUpdate` for every distinct fix/feature, kept in sync with actual PR state (`in_progress` on dispatch, `completed` only once a real PR/issue existed) — not a formality; this is what let a long session with 20+ background agents stay coherent.
- **GitHub interaction:** exclusively the `mcp__github__*` MCP tool family, never the `gh` CLI (unavailable in this environment) — `search_issues`/`list_issues` for recon, `pull_request_read` (`get`/`get_status`/`get_reviews`/`get_comments`/`get_check_runs`) and `get_check_run`/`get_job_logs`/`actions_list` for diagnosing CI failures from raw logs instead of guessing, `create_pull_request`/`update_pull_request`/`merge_pull_request` for the actual PR lifecycle, `issue_write`/`add_issue_comment` for closing out the orphaned WR.
- **Direct verification over trust:** every "is this actually wired in" claim was grep/read-verified against the live tree, not inferred from docs or comments — docs and code comments in this repo have already drifted from reality more than once (stale `AUTOMATION_AUDIT.md`, stale `OAUDREY_DEPLOYMENT_STANDARD.md`, a reviewer-roster comment advertising bots that silently no-op). Several bugs were confirmed by literally executing the broken code path (`python3 -m py_compile` on an extracted heredoc payload; reproducing a merge conflict in a temp git repo to trigger a false-success exit code) rather than reading it and assuming.
- **Own-turn tools used sparingly and only for small, low-risk edits:** `Read`/`Edit`/`Bash`/`Grep` directly (not via a subagent) for things a subagent had already finished and only needed a one-line follow-up fix (a misplaced `nosemgrep` suppression comment) or a PR-metadata change (adding a `docs-freshness: <reason>` silencing line to a PR body) — reserved for cases confident and small enough not to warrant spinning up a whole agent.
- **User-facing tools:** `AskUserQuestion` for the few genuinely ambiguous forks (fix-ownership model, audit scope) — note it failed twice with a transport error mid-session and a third call later succeeded; when a tool fails, state the assumption being made instead of blocking indefinitely on a broken tool. `mcp__Claude_Code_Remote__send_later` for scheduled PR check-ins so CI/mergeability got re-checked without polling.
- **No `Skill`-tool skills were invoked this session** — everything above was direct tool orchestration, not a packaged skill/slash-command. If a recurring version of this audit becomes common, it may be worth packaging the "diagnose → scope a fix → isolated-worktree agent → verify → draft PR" loop as an actual Skill so it's invocable in one step instead of hand-assembled each time.

**Next Action:** See `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` for the reusable methodology and the growing fix-pattern catalog. Open items from this session still needing a priority call before more PRs get dispatched: `scripts/security-fleet.js` has zero trigger (the fleet's prompt-injection/secret-exfil/permission-drift detector never runs), `credential-autonomy-agent.yml` runs hourly and can structurally never report failure, and `self-heal-pr.yml`/`reset-self-heal-issue.yml` (CLAUDE.md's own documented loop steps 4 and 6) are 100% manual despite being described as automatic.

---

**Date/Time:** 2026-07-14T13:15:00Z

**Task Attempted:** External full-repo prosecution audit (Claude, chat session) — gaps, broken wiring, errors, bugs across revvel-standards. 10 WRs filed at `wr/pending/audit-2026-07-14/`, pushed via Zapier GitHub MCP on branch `audit/2026-07-14-wr-a1`.

**Outcome:** Success — audit complete, fixes proven empirically, WRs + memory + skill files landed on branch, PR opened for review. One incident during push: a Zapier whole-file write replaced learnings.md with only this entry (branch-only; main untouched; restored via scripts/restore-learnings.sh from blob 58bb597a).

**Root Cause of Failure (If any):** Audited a clone snapshot; at push time live main had already gained a partial WR-A1 fix (yaml/ajv/ajv-formats/@types/node landed; semver + @octokit/rest still missing). Remaining audit findings verified still live: state.json = `{}` (issue-13555), 3 workflows calling missing scripts (call-cursor-api.sh, record.js, index.js), 13 pull_request_target workflows, gitbito@main unpinned, 5 duplicate issue files, 5 broken SSOT links, 78 cron workflows unbudgeted. Incident root cause: tools that replace whole-file content must never be pointed at append-only logs — the transfer-size ceiling forces truncation or replacement.

**Self-Healing Fix / Learned Lesson:** (1) **Audits decay — re-verify every finding against live HEAD before applying fixes**; merge into current state, never overwrite newer work with stale audit copies. This bit twice in one session (package.json, learnings.md itself). (2) Cluster failures by root cause before filing: 23 test failures were 1 bug (undeclared deps); proven fix took the suite 482 discovered → 631/631 green + clean tsc. (3) Fix + vaccine together: every corrective WR names the guard preventing recurrence (WR-A10 dependency-declaration lint is WR-A1's vaccine). (4) NEW from the incident: **whole-file-write APIs are forbidden on append-only logs** — route log appends through git-native paths (Actions workflow with checkout, or a side-file + fold-in script) where the write can be atomic and size-unbounded. Full toolchain + method in `wr/memory/audit-2026-07-14-tools.md`; procedure codified in `skills/repo-audit/SKILL.md`.

**Next Action:** Review/merge PR from `audit/2026-07-14-wr-a1`. Then agents execute WR-A1..A10 in priority order (A2 state engine and A3 dead script paths first — both P0/P1 and both currently breaking live automation). Also: archive learnings.md entries older than 90 days per its own header rule — the log is 70KB+ and growing; a WR for the archival cron is warranted.
