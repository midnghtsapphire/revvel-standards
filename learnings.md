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

**Date/Time:** 2026-05-17T01:20Z

**Task Attempted:** Implement the whole WR research/search engine requested from GitHub context.

**Outcome:** Success - added `scripts/research-engine.js`, `.github/workflows/research-engine.yml`, `docs/RESEARCH_ENGINE_STANDARD.md`, canonical research-engine labels, dynamic label sync from `.github/labels.yml`, and `tests/research-engine.test.js`. Focused tests, workflow validation, and root `npm test` pass.

**Root Cause of Failure (If any):** The previous research module was a manual six-agent script and did not own the full WR lifecycle: no lane labels, no master checklist, no per-agent checklist, no OpenRouter three-model triangulation contract, no durable code-review handoff, and no automatic-fix prompt for reviewers. Validation also surfaced three existing workflow jobs without `timeout-minutes`.

**Self-Healing Fix / Learned Lesson:** For research WRs, implement the orchestrator as executable automation plus a standard, not only prompt text. Make label sync consume `.github/labels.yml` directly so new engine labels do not drift from the hard-coded sync workflow. When `npm run workflows:validate` fails on missing timeouts, add the job timeouts immediately because that is a code/config blocker, not a research blocker. If `OPENROUTER_API_KEY` is missing, the engine should write a visible infrastructure-blocker packet and label the item instead of silently failing.

**Next Action:** Monitor PR #13499 review/CI and merge after reviewer approval.

---

**Date/Time:** 2026-05-17T01:41Z

**Task Attempted:** Add the Puter.js + Perplexity keyless browser research integration requested from GitHub PR context.

**Outcome:** Success - added `standards/PUTER_PERPLEXITY_INTEGRATION_STANDARD.md`, `scripts/puter-perplexity-template.js`, `templates/puter/perplexity-research-widget.html`, `tests/puter-perplexity-template.test.js`, and the API BOM entry distinguishing keyless browser research from server-side Perplexity API usage. Focused test, full `npm test`, and workflow validation pass after installing dependencies with `npm ci`.

**Root Cause of Failure (If any):** Full validation initially failed because this clean cloud clone did not have `node_modules`, causing `Cannot find module 'yaml'` in workflow validation. This is the existing BUG-001 environment setup issue, not a Puter integration defect.

**Self-Healing Fix / Learned Lesson:** For keyless AI-provider integrations, ship a tested browser template plus a standard that defines the security boundary: no Revvel-owned API keys in frontend code, explicit user-pays disclosure, text-only output rendering, and a locked model allowlist. When root tests fail with `Cannot find module 'yaml'`, run `npm ci` from the lockfile before rerunning `npm test` and `npm run workflows:validate`.

**Next Action:** Monitor PR #13504 review/CI and merge after reviewer approval.

---

**Date/Time:** 2026-05-17T02:03Z

**Task Attempted:** Unblock PR #13504 squash merge after multiple automation checks failed with GitHub installation API rate limits.

**Outcome:** Success - PR label/comment/status-helper workflows now mark their `actions/github-script` mutation steps `continue-on-error: true`, so transient GitHub API rate limits no longer make non-product automation checks fail the PR. Added `tests/pr-automation-fail-soft.test.js` and wired it into `npm test`.

**Root Cause of Failure (If any):** Several helper workflows (`openrouter-assignee`, `ready-for-review`, `augment-check`, `priority-router`, `pr-state-orchestrator`, and `pr-lifecycle`) used GitHub API calls for labels, comments, check reads, and status badges as hard-failing steps. When the GitHub App installation rate limit was exhausted, those helper checks turned red and blocked squash merge even though ship-quality and product validation were clean.

**Self-Healing Fix / Learned Lesson:** PR helper automation that only labels, comments, or mirrors status should fail soft on external GitHub API exhaustion; product/test/security checks can remain hard gates. Add workflow contract tests for merge-blocker classes so future edits do not accidentally reintroduce hard-failing label/comment automation.

**Next Action:** Monitor PR #13504 checks after the new commit; remaining GitHub App rate-limit checks should stop blocking once the updated workflows run.
