# PR lifecycle: remove the Actions runtime dependency

**Who:** Codex repository-audit specialist, ChatGPT Work Mode, delegated by the session orchestrator. **When:** 2026-11-06, America/Denver. **Requested by:** Audrey Evans. **Why:** lifecycle labels must continue without GitHub Actions billing/runtime availability, using deterministic code and preserving all existing work. **Baseline inspected:** `f969a2c1cc663a5a0c01382ab58f6bb4b9e5c94b`.

## Decision and scope

Use one standalone Node.js reconciler, invoked manually or by an existing machine's operating-system scheduler. Read current PR/review/check/status facts through the GitHub API, calculate the desired lifecycle labels, and write only the difference. This separates the computation from the Actions scheduler without introducing another paid labeling service. Host capacity and GitHub API rate limits still apply.

Keep the current seven `status:*` labels compatible with existing consumers during migration. Reducing the taxonomy is a separate consumer migration, not a reason to erase labels or rewrite unrelated automation. The replacement handles labels only: it does not approve, merge, close PRs, call models, or repeatedly post status comments. Existing merge policy and review workflows remain independently governed.

Replacing `actions/github-script` with another Action would still require an Actions run. Self-hosting an Actions runner also retains Actions orchestration. An external OS timer is the smallest independent execution path; a Probot webhook application is an alternative when immediate event processing is worth operating a public endpoint.

## Observed inventory

| File | Observed responsibility | Recommendation |
| --- | --- | --- |
| `.github/workflows/pr-state-orchestrator.yml` | Actual seven-label lifecycle writer; review/check handlers, badge comments, auto-merge, manual resync; roughly 1,270 lines with repeated helper blocks | Replace label ownership with external reconciler after verified cutover; preserve full original |
| `.github/workflows/pr-lifecycle.yml` | Logs PR state and counts matching PRs/check suites; no label-write endpoint in current implementation; triggers both PR and PR-target plus completion events | Retire its automatic runs after review; preserve original, since current runtime provides diagnostics only |
| `scripts/self-heal-repo.js` / `.github/workflows/repo-self-healer.yml` | `reprocessPRLabels()` independently mirrors the seven-label orchestrator; main calls it alongside unrelated cleanup jobs | Preserve helper and comment out only its invocation at cutover, with dated reason; do not disable all self-healer duties |
| `.github/workflows/stuck-label-watchdog.yml` | Repairs mostly bare lifecycle labels; also removes `status:waiting-for-review`; creates comments/repair issues | Audit mixed-taxonomy consumers before retirement; prevent this path from competing with the reconciler |
| `.github/workflows/stuck-label-automation.yml` | Age-driven issue/PR escalation, reviewer pings, retries | Keep distinct from lifecycle-state calculation; assess duplicate pings separately |
| `.github/workflows/bootstrap-pr-labels.yml` | Manually creates bare PR labels plus issue lifecycle labels | Preserve; stop treating it as the canonical status namespace |
| `.github/workflows/sync-labels.yml` | Syncs names/colors/descriptions from `.github/labels.yml` | Keep separate provisioning task; do not re-create labels on every PR poll |
| `config/labels-allowlist.yml` | 80-name budget and legacy alias mappings | Reuse existing names; no new family needed |
| `templates/cicd/pr-labels.yml`, `labels-as-parameters.yml`, `sync-labels.yml` | Reusable templates, not evidence of active external label execution | Preserve reference material; avoid copying another event-driven writer |

The repository contains an external automation registry (`config/connections.yml`) and an external runner contract (`engines/CONTRACT.md`). A standalone external label worker was not found in the inspected scripts/workflow paths. This is a bounded search finding, not a claim that every file in every user repository was read.

## Defects established from source

1. **Premature readiness on review:** `pr-state-orchestrator.yml` around lines 383–390 filters out incomplete checks before testing success. One successful check and another still running can produce `status:ready-to-merge`.
2. **One suite treated as all CI:** its check-suite handler around lines 584–590 applies passing/readiness from a single successful suite, without requiring all relevant suites/checks to agree.
3. **Stale green labels persist:** its manual resync around lines 1010–1037 logs pending/no-check states without clearing existing passing/readiness labels.
4. **Partial result sets:** several reads request only the first page of PRs, reviews, check runs, or labels. A large repository can therefore omit authoritative state.
5. **Review policy differs by event:** a single approved review can promote in one handler, while manual resync reduces the latest non-comment review per reviewer. New-head and dismissed-review handling must converge to one deterministic rule.
6. **Legacy commit statuses omitted:** current handlers primarily inspect check runs; status contexts from other CI integrations also matter.
7. **Write failures can disappear:** some `addLabel` helpers and `self-heal-repo.js` catch errors without propagating them, making success logs unreliable.
8. **Taxonomy drift:** `status:needs-action` is emitted but has no explicit alias in the inspected canonical allowlist; `status:changes-requested` does have an alias. Add a documented mapping if keeping the legacy spelling. Do not silently rename the label on all PRs.
9. **Tests can validate a different implementation:** `tests/pr-lifecycle.test.js` contains its own state-machine functions instead of importing the live implementation. It cannot prove the present diagnostic-only workflow labels anything.

These are source-level findings. They do not establish the account-level cause of an individual failed Actions run. That requires its run/job error, which must be distinguished from API throttling, permission errors, workflow defects, or a billing block.

## Deterministic contract and validation

- Closed PRs clear only managed lifecycle labels; other labels survive.
- Draft state takes precedence over review/check readiness.
- A non-draft PR's review result comes from current authoritative review evidence; comment-only reviews do not invalidate decisions. Dismissed reviews and new head commits cannot silently reuse stale approval.
- Check runs and legacy commit statuses are fetched completely and evaluated together. Pending, failing, cancelled, unknown, and absent evidence never manufacture readiness.
- Re-running against the same facts produces an empty write set. Add/remove only managed labels; never replace the entire label list.
- A failed read is an error, not an empty successful collection. No writes follow incomplete evidence.
- A write failure exits nonzero and leaves an actionable log; the next reconciliation repairs partial progress.
- Re-read the PR head before applying a computed plan; abandon and recompute when it changes.
- Prove dry-run performs no mutations, unrelated labels survive, pagination works, repeated runs converge, approval changes are handled, and mixed CI results cannot appear green.

Readiness labels are summaries, not a substitute for GitHub branch protection, required-review rules, or merge checks. The labeler must never invoke merge APIs.

## Preserve-first cutover and rollback

1. Keep existing workflows active while reviewing and validating the replacement in dry-run. Record repository, PR number, head SHA, observed labels, desired labels, and exact delta; do not capture token values.
2. Verify a real external machine can read the repository and apply a controlled label change with the intended credential. An isolated local test is not production deployment evidence.
3. In the reviewable migration commit, rename the complete original lifecycle workflow to `pr-state-orchestrator.yml.disabled` and the diagnostic-only workflow to `pr-lifecycle.yml.disabled`, or comment their complete automatic triggers with dated replacement notes. Do not delete or overwrite the original script bodies.
4. Comment out only `await reprocessPRLabels();` in `scripts/self-heal-repo.js`, with date, actor, PR reference and the replacement command. Keep its full function and unrelated main calls visible. Address the watchdog's overlapping alias repair before making the new worker authoritative.
5. Adjust source-path tests additively to inspect preserved legacy files where useful, and add assertions that retired files cannot trigger Actions. Existing direct references include `tests/pr-state-orchestrator.test.js`, `tests/auto-merge-empty-diff.test.js`, `tests/workflow-yaml-validation.test.js`, and `tests/lint-md-workflow.test.js`.
6. Activate the OS scheduler and verify two runs: first applies the expected delta; second makes no writes. Check logs and GitHub labels directly. Document interval, runtime, repository scope, token owner/expiry, and last successful run.
7. Rollback stops the external scheduler first, then restores the original filenames or uncommented invocation through the reviewed rollback commit. Never run two competing authorities deliberately. Keep all migration notes and replacement code for history.

No workflow was disabled as part of this audit document. Actual deployment/cutover status belongs in the session's execution receipt and runbook.

## Credentials, deployment and cost boundary

The external process needs GitHub API access outside an Actions job. The short-lived workflow `GITHUB_TOKEN` cannot simply be copied out as a permanent credential. Use an owner-authorized fine-grained token or GitHub App installation credential with repository read access to PR/review/check/status information and permission to write issue/PR labels. A GitHub App token also needs renewal; document who owns that renewal.

Use the existing secrets names and credential setup sources (`.env.example`, `docs/agent-stack/AGENT_STACK_SETUP.md`, `docs/SECRETS_MAP.md`) rather than searching for secret values. A public clone proves read access, not permission to push a branch, open a draft PR, write labels, or install a scheduler. Do not claim the worker is live until both host execution and GitHub writes have been verified.

The external code needs no model/API subscription. An already-owned always-on machine avoids a new host purchase; a new cloud machine would have its own cost. Independence from Actions does not mean independence from GitHub's API, repository access controls, or service availability.

## Governing instructions and audit bounds

Read: root `AGENTS.md`, `VISITING_AGENTS.md`, `MASTER.md`, `START_HERE_CALL_CHAIN.md`; `docs/AGENTS.md`; the label allowlist, connection registry, package scripts, system state and relevant history. Applied standards: preservation/comment-don't-delete, code commenting, automation-first, proactive preflight, testing, verification postconditions, CircleCI separation, error reporting, BNAT, ledger and write-as-you-go. Reviewed session/documentation skills and indexed the broader standards directory for relevant rules. This does **not** assert a full content audit of the thousands of project files or all unrelated standards.

The owner's current request takes precedence over older statements that Actions must own labels. The root owner rule requires draft PR review and forbids deleting/wholesale rewriting existing work; older generic cleanup language does not override it. All additions should carry an accompanying changelog/ledger record in the parent integration commit.

The `repo-audit` BNAT imprint returned `known: false`, `imprinted: false`, `globalEnergy: 0`, and no obstructions. This audit did not alter the feed or relax its invariant; it performed source inspection and added this document only. Registering the agent, if desired, is distinct from pretending an imprint succeeded.

## Handoff

The implementation specialist owns executable code and its tests; the orchestrator owns live-access probes, source research synthesis, final integration records, and draft PR delivery. This document records source observations and the migration procedure. It does not assert a deployed scheduler, successful live label mutation, or a remotely published PR.

### Existing external runtime lead

The orchestrator discovered the public `midnghtsapphire/revvel-dark-run` repository during this session and assigned its inspection to the deployment specialist. Prefer integrating with that existing runtime if its verified capabilities fit; do not create a second fleet scheduler merely because this audit began with the standards repository. Its deployment status, event coverage, credentials, and exact integration point require that specialist's evidence. Repository existence alone does not establish that its service is running.

**2026-11-06 inspection update:** the deployment specialist read its README and `src/dark-run.mjs`. The repository explicitly describes an off-Actions fallback for billing-blocked Actions and documents laptop/DigitalOcean cron. Its code routes inbox work requests through LLM twins; it is not a general deterministic scheduler. Reuse the same host/scheduler to invoke the label CLI directly, bypassing those LLM routes. The deployment runbook provides systemd only as an alternative where no existing scheduler is available. This establishes a compatible deployment pattern, not a verified live host.
