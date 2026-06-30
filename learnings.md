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
