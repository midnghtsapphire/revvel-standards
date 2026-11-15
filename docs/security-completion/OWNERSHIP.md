# Durable ownership and completion

Owner authorization: Audrey, 2026-11-15. Scope: existing PR Lifecycle and agent monitor/fallback call chain; draft PR only, owner merges. This document is the durable plan and handoff; chat memory is not an input.

## Implementation plan

1. Add a versioned ownership record and append-only `wr/agents/ownership.jsonl` journal. Bind owner identity/platform/GitHub login to task ID, WR/ref/PR, outcome type and product ID where applicable, tests, delivery and outcome receipts, heartbeat, lease, attempts, blocker owner and exact next action.
2. Publish an executable Node session-start/transition CLI using existing authenticated `gh`, fully paginated open PRs and PR comments, plus default-branch registry and the local journal. Return prioritized continuations of owned work, never create new tasks or execute commands from PR bodies.
3. Claim/resume consumes a bounded attempt and lease; heartbeat requires the same live lease. Completion requires nonempty passing test receipts, artifact URLs/paths, release/deployment shape and outcome receipt. Validation is not a network/live verification request.
4. Extend existing lifecycle entry points with metadata-only proof gates and deduplicated stale/empty/missing-record alerts. Trusted default-branch code only; pin checkout to a verified full SHA. Preserve retired code/commented blocks. No PR candidate execution with write credentials and no new scheduler, automatic merge or close.
5. Add pure tests with mocked GitHub/gh. Append a binding session-start requirement to AGENTS.md. Document wrapper integrations and inactive Manus review continuation proposal.

## Activation and blockers

Initial plan persisted before implementation. Implementation/test/PR receipts will be appended below. No external billing changes, purchases, new scheduled jobs or paid API calls are authorized. Manus API dispatcher remains documentation-only: the parent runtime has no usable key. Existing `agent-monitor.yml` cost-frozen schedule is not enabled by this change.

BNAT: the stale committed BIOME feed has no `Manus` stalk (imprint reports known=false), global energy 0 and no obstructions. The registered `sentinel` monitoring-role imprint succeeds, energy 0. No feed/generated files are modified or included.

## Implemented contract and commands

Runtime schema/proof validator: `scripts/ci/lib/ownership.js`; interchange schema: `schemas/ownership-record.schema.json`. The existing CUDA `schemas/agent-contract.schema.json` remains unchanged; this record is a task-continuation/receipt extension, not a new dispatcher.

A record carries `schema_version`, stable `id`, scoped `repo`, `owner.id/platform/github`, `task.id/ref/wr/pr`, `outcome_type`, nullable `product_id`, `state`, `revision/parent_revision`, `heartbeat_at`, `lease.holder/expires_at`, `attempts.used/max`, `next_action.action/owner`, nullable `blocker.kind/reason/owner/retry_after`, and `evidence.artifacts/tests/release/outcome`. Product outcomes require a product ID before claim. WR-only tasks may have `task.pr: null` and later attach an **existing** PR without replacing the task/ref/WR or resetting the budget.

`wr/agents/ownership.jsonl` is an append-only snapshot journal. Commit/push each transition by that exact path; the CLI also appends authenticated owner records to attached PR comments and adds an initial discovery index to the PR body without removing original prose. Session-start reads the trusted default-branch journal, local pending snapshots, **all pages** of open PRs and relevant PR comments. Closed/merged PRs with unfinished registered tasks are re-read for release continuation. Same-revision conflicts, identity/ref changes and budget changes fail closed; external wrappers must serialize mutations for each owner/task because GitHub comments provide no atomic distributed lease primitive.

Run from a trusted reviewed checkout, never an untrusted PR checkout with write credentials:

```bash
node scripts/ci/agent-session-start.js help
node scripts/ci/agent-session-start.js session-start --owner-id lifecycle-specialist --repo midnghtsapphire/revvel-standards
node scripts/ci/agent-session-start.js claim --owner-id lifecycle-specialist --id agent-completion-20261115 --input docs/security-completion/claim.json
node scripts/ci/agent-session-start.js resume --owner-id lifecycle-specialist --id agent-completion-20261115 --input docs/security-completion/transition.json
node scripts/ci/agent-session-start.js heartbeat --owner-id lifecycle-specialist --id agent-completion-20261115 --input docs/security-completion/transition.json
node scripts/ci/agent-session-start.js attach-pr --owner-id lifecycle-specialist --id agent-completion-20261115 --input docs/security-completion/attach-pr.json
node scripts/ci/agent-session-start.js block --owner-id lifecycle-specialist --id agent-completion-20261115 --input docs/security-completion/block.json
node scripts/ci/agent-session-start.js awaiting-release --owner-id lifecycle-specialist --id agent-completion-20261115 --input docs/security-completion/transition.json
node scripts/ci/agent-session-start.js validate --input docs/security-completion/completion.json
node scripts/ci/agent-session-start.js done --owner-id lifecycle-specialist --id agent-completion-20261115 --input docs/security-completion/completion.json
```

The input files above are operator-authored record/transition inputs, not commands from a PR body. Do not run `claim` again for an already claimed record; use `resume` after its lease expires or after a recorded blocker resolution. A transition input contains the current `session` string and `next_action` object. Claim additionally supplies the full record fields/owner identity, `lease_minutes` (default 30, maximum 120), and `attempts.max` (default 3, maximum 5). `attach-pr` additionally supplies a positive `pr` number. `block` supplies a concrete blocker object. `done` supplies complete `evidence`. The task's real input files and journal are persisted with this draft as implementation receipts; generic filenames in the command list are a documented operator interface, not a promise that every future transition has already happened.

Claim/resume consumes one attempt. Heartbeat records progress but does not extend the lease forever. Other transitions require the same live session lease. Awaiting-release/block/done releases the lease. Done is terminal. Exhausted attempts require owner escalation, not a fresh identity, recreated WR, reset counter or fallback loop. Auth/billing/schema blockers require an explicit repository-path/HTTP `blocker_resolution` receipt before a manual resume; `retry_after` is respected for all blocker kinds. API errors stop the current invocation and never produce a success/empty queue. The executable supports the existing `gh` auth and an operator-selected `REVVEL_GH_PATH` connector wrapper, with narrow ANSI-SGR removal for this environment's colored JSON output.

## Completion proof gate

Completion requires **nonempty artifacts**, **nonempty passing tests**, a release/live receipt and an outcome receipt. Each test contains `name`, `result: passed`, a URL/repository `receipt` and full 40-character `commit`. Release contains `kind` (`deployment`, `release`, `publication`, or `owner-reviewed`), `ref` URL/repository path, `version`, `recorded_at`, full `commit`, and explicit `verification`. Every test commit matches the release commit and the current attached PR head. Product/API/MCP live outcomes require an HTTP URL; product outcomes require a deployment receipt. Outcome has nonempty `summary` and `receipt`.

`verification: recorded` means a supplied receipt was **structurally checked only**. No endpoint was fetched and no live availability, test execution, artifact existence, publication, revenue or owner review was independently verified by this validator. `requested-and-verified` requires a separate verification receipt from an explicitly requested verification action; the CLI never performs that action on its own. A fake-shaped receipt is not legitimate completion evidence and remains subject to owner review. Governance has an owner-reviewed release receipt only after actual owner review/merge; draft PR/local test success does not satisfy that release.

The existing lifecycle `pr-state` / `check-state` modes re-read fresh PR metadata, validate records, detect stale heartbeat (24 hours), expired lease, exhausted retry budgets, inherited blockers, empty PRs and proof/head mismatch, and upsert the existing lifecycle's ownership sticky metadata plus `status:needs-action` where needed. Identical alerts are deduplicated. Invalid completion proof/schema blocks the check; missing ownership/empty diff also blocks non-draft PRs. Draft work is alerted rather than automatically destroyed. A valid active/testing record is not forced to provide a post-merge release prematurely. Completion is not inferred from a check conclusion, a merge event or a closed PR.

On-demand scan for the existing monitor/operator, using its **already available** write credential and trusted default checkout:

```bash
node scripts/ci/pr-lifecycle.js ownership-scan --owner midnghtsapphire --repo revvel-standards
```

No new scheduler or polling process is installed. Session-start is read-only; lifecycle scans/events produce metadata alerts. The existing monitor's cost-frozen schedule remains off, so stale work with no further events is found at session start or an operator's on-demand scan, not by a claimed always-on timer. Never run PR bodies as scripts. Alerts do not merge, close, enable auto-merge, create replacement tasks or call a paid fallback.

## Trust boundary and activation

`.github/workflows/pr-lifecycle.yml` keeps its old/commented blocks. Active checkout pins `actions/checkout` to `3d3c42e5aac5ba805825da76410c181273ba90b1` (v7 commit resolved through the GitHub API on 2026-11-15), sets `persist-credentials: false`, and selects `github.event.repository.default_branch`. The candidate `pull_request` execution path is retired in place; the Windows PR state job only runs for trusted `pull_request_target`, and check aggregation runs from trusted default on existing completed-check events. Event payloads are data only. No candidate test/build/install code is invoked on the persistent runner.

**Implemented/tested locally:** authenticated-gh wrapper interface, paginated discovery, append journal/PR records, transitions, receipt validation, existing lifecycle alert/gate wiring, binding AGENTS.md requirement and machine-readable blueprint under `workflows/security-completion/`.

**Not deployed yet:** default-branch workflow changes await Audrey's draft review/merge; there is no claimed green live Actions run, no installed universal external-agent hook and no paid reviewer. Existing account-wide GitHub Actions trouble is not fixed by a local YAML edit. CircleCI configuration is deliberately unchanged. All external service operators must integrate their own session/auth-start wrapper and save one receipt before marking that hook active.

## Bounded independent review continuation — proposal, inactive

A useful future Manus integration is **not a generic new-task/paid-review scheduler**. Extend the existing failed-check lifecycle path only: route one independent review turn into the existing stored `task.id`, using API v2 `POST /v2/task.sendMessage`, rather than `task.create`. The review analyzes the failing check and produces an actionable diagnosis/proof review for the owning task; the original owner resumes implementation/release. No check-success event, PR-open event, heartbeat or login should trigger a paid reviewer.

Persist an idempotency key `(repo, PR, head SHA, failing check-run ID, independent reviewer route)` and the existing task ID, dispatch receipt, state, deadline and budget in the ownership record before attempting continuation. Maximum one dispatch per distinct failed-check key, no overlapping run, bounded deadline, and never reset a failed key to spawn replacements. Independently confirm stopped task/background-job state and receipt before declaring review finished. Auth, billing, rate-limit or schema failures attach blocker owner + exact next action, release the lease and stop; do not move automatically to another paid provider. Unknown outcomes/timeouts require owner reconciliation rather than blind resend (which could bill twice).

**Inactive blocker:** no usable Manus API key is available in the parent runtime. Connected read-only task discovery does not grant API dispatch access. Audrey/integration owner must provision explicitly authorized access and approve any paid continuation. No stub call, auto-paid/new task, API key search/disclosure, secret modification, billing change or task creation is included here. Bito remains the separately documented primary reviewer; current remote review/deployment receipts are unverified.

## Current verification and blockers

Focused local test invocation:

```bash
node --test tests/ownership-completion.test.js tests/pr-lifecycle.test.js tests/workflow-yaml-validation.test.js tests/agent-monitor.test.js tests/agent-fallback-no-empty-issues.test.js
node scripts/visiting-agent-scan.js
node node_modules/markdownlint-cli2/markdownlint-cli2-bin.mjs AGENTS.md docs/security-completion/OWNERSHIP.md workflows/security-completion/README.md
```

2026-11-15: focused suite **45 tests passed, zero failed**, including the existing lifecycle's additional internal 34 assertion cases. Scoped Markdown lint has zero issues; lifecycle YAML parses, full-SHA/trusted checkout regression assertions pass; `git diff --check` is clean. Dependencies were installed with locked `npm ci --ignore-scripts --no-audit --no-fund`; no dependency files changed.

Repository-wide visiting-agent scanner has **four inherited findings** in untouched `products/oaudrey-home/public/index.html` (affiliate text/link, lines 220–222 and 265), outside this specialist scope. Blocker owner: guard specialist / Audrey. Exact next action: adjudicate/fix those existing findings under the separately assigned guard PR without deleting existing work; this PR does not alter that product or scanner baseline. New lifecycle paths are not app-scanner scope and introduce no product telemetry/branding.

Release/activation blocker owner: Audrey. Exact next action: review the draft, merge only as owner, then have the existing runner operator capture a trusted metadata-only run URL and each service operator capture a session wrapper receipt. Retry budget: one manually authorized activation attempt, no automatic retries. This work is implemented/tested and durable, **not falsely marked deployed/done**.
