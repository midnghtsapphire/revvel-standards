# GitHub Actions migration — billing lock (2026-11-06)

Refs #18268. This note records why hosted Actions jobs are red, what the four
label/audit workflows actually do, and where each one can live once Audrey
moves work onto her own runner or Docker. It does not edit, disable, or delete
anything under `.github/workflows/`. Audrey decides that in a GitHub Discussion.
Repos use her workflows on her runner, and a billing lock is not repaired by
patching Actions YAML.

## Root cause

Hosted jobs fail before the first step. The check-run annotation is:

> The job was not started because your account is locked due to a billing issue.

Sampled jobs in the window below have `steps: []`, an empty `runner_name`, and
the label `ubuntu-latest`. There is no log, because the runner never started.
That is an account billing lock. It is not a defect in the workflow YAML, the
scripts, or the pull request diff.

CircleCI is the gate that still runs. On `main`, the combined commit status was
`success` at the time of this note, including:

- `ci/circleci: lint-and-test`
- `ci/circleci: validate-registries`
- `ci/circleci: policy-check`
- `ci/circleci: veins-monitor`

`.circleci/config.yml` on `daily/2026-11-05` defines those four jobs. Later
`main` statuses also show `ci/circleci: fix-flaky-tests`, `setup`, and
`chunk-task`. Trust the CircleCI contexts that are green on the commit. Ignore
hosted Actions reds that match the billing annotation.

## Incident window

Brief: 2026-11-06 12:30–14:30 UTC, 24 failures across 8 workflows, kicked off by
`issue_comment`, `check_suite`, and `workflow_run` from bot comment storms on
draft #18276.

Actions API recount for the same window (runs whose conclusion is `failure`):

| Workflow | Failed runs | Events |
| --- | --- | --- |
| security-fleet | 21 | `issue_comment`, `pull_request` |
| Agent Approval Check | 18 | `issue_comment`, `pull_request_target` |
| PR State Orchestrator | 12 | `check_run`, `check_suite`, `pull_request` |
| PR Lifecycle | 11 | `check_suite`, `pull_request`, `pull_request_target`, `workflow_run` |
| Agent Audit Logger | 7 | `issue_comment` |
| PR Check Status Automation | 5 | `check_suite` |

The window contains more hosted-runner failures than the brief's 24/8 figure
(Agent Command Window, Create Issue Branch, and many `pull_request` workflows
on the same lock). Sampled jobs all carry the billing annotation and zero
steps. Same cause. This note does not re-slice the 24/8 tally.

`issue_comment` failures in that window, by triggering actor (54 runs read):

- `gitar-bot[bot]` — 41
- `cursor[bot]` — 7
- `midnghtsapphire` — 6

A bot comment on #18276 starts every workflow that listens to `issue_comment`.
Each of those runs completes as a failure (the job never starts, and the run
is still a completed failure). `workflow_run` and `check_suite` listeners then
start again. PR Lifecycle and PR State Orchestrator are that second wave. They
do not listen to `issue_comment` themselves.

Example runs (billing annotation, zero steps):

- Agent Approval Check, `issue_comment`: <https://github.com/midnghtsapphire/revvel-standards/actions/runs/42226511864>
- Agent Audit Logger, `issue_comment`: <https://github.com/midnghtsapphire/revvel-standards/actions/runs/42226511865>
- security-fleet, `issue_comment`: <https://github.com/midnghtsapphire/revvel-standards/actions/runs/42226511983>
- PR Lifecycle, `check_suite`: <https://github.com/midnghtsapphire/revvel-standards/actions/runs/42226512466>
- PR Check Status Automation, `check_suite`: <https://github.com/midnghtsapphire/revvel-standards/actions/runs/42226512507>
- PR State Orchestrator, `check_suite`: <https://github.com/midnghtsapphire/revvel-standards/actions/runs/42226512652>

## Why nothing was added to CircleCI

CircleCI's GitHub integration starts pipelines on push and pull request. It
does not receive `issue_comment`, `pull_request_review`, `check_suite`,
`check_run`, or `workflow_run`.

All four workflows below are inline `actions/github-script` (or inline bash
that reads a file the script just wrote from `context.payload`). There is no
standalone `scripts/*.js` or `scripts/*.sh` that implements the label machine
or the audit writer. Copying the inline script into a CircleCI job would still
lack the event payload, and a job on the existing `pr-workflow` would write
labels on every push while missing reviews and check completions that finish
later. That is a half-port. It is not in `.circleci/config.yml`.

The `circleci` CLI is not installed on the machine that wrote this note.
Config was left unchanged, so there was no edited config to validate. Existing
jobs (`lint-and-test`, `validate-registries`, `policy-check`, `veins-monitor`)
are untouched.

When a real script port exists, gate it so a normal push or PR pipeline does
not run it beside a still-enabled hosted workflow. CircleCI schedules are set
in the project UI (or by an API trigger). The config shape that stays off
until someone passes the parameter:

```yaml
parameters:
  run_github_event_poll:
    type: boolean
    default: false

workflows:
  github-event-poll:
    when: << pipeline.parameters.run_github_event_poll >>
    jobs:
      - call-the-real-script
```

Default `false` means PR and `main` pipelines keep today's jobs only. Turn the
parameter on from a schedule or an approval pipeline after the hosted workflow
is disabled, so the two writers do not both apply labels.

## Inventory

Declared `permissions:` and token inputs are what the YAML asks for. Hosted
`GITHUB_TOKEN` cannot be minted while the account is billing-locked, which is
another reason these jobs cannot be "fixed" in YAML.

### `.github/workflows/pr-lifecycle.yml`

- Name: `PR Lifecycle`
- Triggers:
  - `pull_request` and `pull_request_target`: `opened`, `synchronize`, `reopened`, `ready_for_review`, `converted_to_draft`, `closed`
  - `check_suite`: `completed`
  - `workflow_run`: `completed`, limited to the validation-workflow `name:` allowlist in the file (not a filename list). `check_suite` does not fire for suites that Actions itself created, so `workflow_run` is the Actions signal.
- Permissions: `contents: read`, `pull-requests: write`, `checks: read`, `statuses: read`
- Secrets: `secrets.GITHUB_TOKEN` passed into `actions/github-script`. No other secrets.
- What it does: two jobs, both log-only.
  - `pr-state` (pull request events) logs PR number, state, and draft. The step is named "Update PR state labels". The script does not add or remove labels.
  - `check-state` (check suite or workflow run) reads core rate-limit remaining, skips when remaining is under 100, lists open pulls, keeps those whose head SHA matches, and lists check suites for that SHA. It logs counts. It does not write labels or comments.
- Migration target: no CircleCI job. The behavior is a log line that needs the webhook payload. CircleCI already runs the test gate on pull requests. A webhook on Audrey's runner can log the same lines if she wants them. A scheduled poll cannot see `workflow_run`. Leave the file in place until she disables the hosted workflow.
- Runner secrets if she reimplements the log: a token with `checks: read` and metadata read on pulls. The current script's `pull-requests: write` and `statuses: read` are unused by the script body.

### `.github/workflows/pr-state-orchestrator.yml`

- Name: `🎛️ PR State Orchestrator`
- Triggers:
  - `pull_request`: `opened`, `reopened`, `ready_for_review`, `converted_to_draft`, `synchronize`, `closed`, `labeled`
  - `pull_request_review`: `submitted`
  - `check_suite`: `completed`
  - `check_run`: `completed`
  - `workflow_dispatch` with optional `pr_number` (blank means re-sync every open PR)
- There is no `on.schedule`. The `resync-all-prs` job's `if` still mentions `github.event_name == 'schedule'`. That clause never matches. The job runs when someone dispatches with an empty `pr_number`.
- Permissions: `pull-requests: write`, `contents: write`, `issues: write`, `checks: read`
- Secrets: `secrets.GITHUB_TOKEN` on every `github-script` step. No app token, no `ADMIN_GITHUB_TOKEN`. `contents: write` is declared; the scripts do not push commits.
- What it does (all inline `actions/github-script`, six jobs):
  - `pr-lifecycle` — on pull request events, maintains `status:*` labels and one sticky comment marked `<!-- revvel-status-badge -->`. Skips `labeled` / `unlabeled` so its own writes do not loop.
  - `review-handler` — on a submitted review, sets `status:approved` or `status:needs-action`. On approval plus already-green checks, adds `status:ready-to-merge` and calls `enablePullRequestAutoMerge` (squash). Refuses auto-merge when `changed_files` is missing or zero, or the title matches `[WIP]`, `WIP:`, or `do not merge`.
  - `check-suite-handler` / `check-run-handler` — map suite or aggregated check-run conclusions onto `status:checks-passing` / `status:checks-failing` and the ready-to-merge path above.
  - `resync-all-prs` / `manual-reevaluate` — rebuild labels from live pulls, reviews, and check runs.
- Label family this file writes: `status:draft`, `status:waiting-for-review`, `status:approved`, `status:needs-action`, `status:checks-failing`, `status:checks-passing`, `status:ready-to-merge`.
- Migration target: a scheduled poll on Audrey's runner (or Docker), or a webhook receiver. The resync job is already a full read of open PRs; it is the behavior a cron should call. It is not a separate script file, so this PR does not extract it. CircleCI has no `pull_request_review`, `check_suite`, or `check_run` trigger, so a CircleCI job on push would miss the events that move labels and could arm squash auto-merge from a stale read.
- Replacement for the missing events:
  - Webhook: a GitHub App or repository webhook delivered to her runner, subscribed to pull request, pull request review, check suite, and check run. One delivery, one pass.
  - Scheduled poll: one process on a timer (the resync loop), not one job per event. That removes the storm. It will lag by the poll interval and will not see a check complete the moment it completes.
- Runner token: pull requests write, issues write (labels and the badge comment), checks read, and permission to enable auto-merge. Keep the empty-diff and WIP guards in any port. `GITHUB_TOKEN` from a hosted workflow will not exist on her runner; use an app installation token or a fine-grained PAT stored outside the repo.
- Double-run: disable the hosted workflow before the poll starts writing labels. Both writers share one label set and one badge comment.

### `.github/workflows/pr-check-status.yml`

- Name: `PR Check Status Automation`
- Triggers: `check_suite` `completed`. The `workflow_run` trigger is commented out (2026-06-17): the event requires a `workflows:` list, and the missing list made GitHub reject the whole file. The comment stays. The `workflow-run-status` job remains in the file and its `if: github.event_name == 'workflow_run'` never matches.
- Permissions: `contents: read`, `pull-requests: write`, `issues: write`
- Secrets: `secrets.ADMIN_GITHUB_TOKEN` when that secret is non-empty, otherwise `secrets.GITHUB_TOKEN`.
- What it does:
  - `check-suite-status` aggregates every check run on the SHA (skipping its own run) and the combined commit status (`repos.getCombinedStatusForRef`). Combined status is where CircleCI and Vercel report. A single green suite is not treated as a green pull request. A failing suite short-circuits. Then it writes labels and one sticky comment marked `<!-- pr-check-status:sticky -->`.
  - `workflow-run-status` is dormant. Its body would add `checks-passing` or `checks-failing` from one workflow-run conclusion, which is the bug the active job was written to stop. Do not revive it as the port.
- Label family this file writes: `checks-passing`, `checks-failing`, `ready-to-merge`. It treats an existing `approved` label (unprefixed) as the review signal. That is a different set from the `status:*` labels in the orchestrator. A port that mixes the two names will flap both badges.
- Migration target: same as the orchestrator — webhook or scheduled poll on her runner — and the poll must keep the aggregate (all check runs plus combined commit status). CircleCI cannot subscribe to `check_suite`. Putting this writer on the CircleCI test job would race the orchestrator and would still miss suites that finish after the job exits.
- Runner token: the same `ADMIN_GITHUB_TOKEN` capability (issues write, pull requests write, checks read, commit statuses read). Store it on the runner, not in the repo.

### `.github/workflows/agent-audit-logger.yml`

- Name: `Agent Audit Logger`
- Triggers:
  - `issues`: `opened`, `closed`
  - `pull_request_review`: `submitted`
  - `issue_comment`: `created`
  - `workflow_dispatch` with `action` of `log_analysis`, `health_check`, or `token_report`
  - The hourly `schedule` (`0 * * * *`) is commented out (2026-06-02). Failures were opening a new `[FAILURE] Agent Audit Logger failed` issue each hour.
- Job `if` on `log-agent-action` skips `workflow_dispatch` and `schedule`, and skips issues or comments whose **issue author** is `github-actions[bot]` and whose title starts with `[FAILURE]` or `[ALERT]`. It does not look at `github.event.comment.user.login`. A bot comment on a human or draft PR still runs the job. That is the #18276 path.
- Permissions: `contents: write`, `issues: write`, `pull-requests: write`, `actions: read`
- Secrets:
  - Checkout: `secrets.ADMIN_GITHUB_TOKEN` when non-empty, else `github.token`. A fallback checkout uses `github.token` if the admin checkout fails. Checkout is `continue-on-error` because the entry is not committed.
  - `health-check` and `token-usage-report` receive `secrets.OPENROUTER_API_KEY` and run only when `vars.REVVEL_LLM_ALLOW_CLOUD == '1'` plus the matching dispatch input. The hourly schedule cannot reach them while it stays commented out.
  - The `health-check` script body does not call OpenRouter. The key is injected and unused there. `token-usage-report` does call `https://openrouter.ai/api/v1/auth/key`.
- What it does:
  - `log-agent-action` builds one JSON line (actor, event, resource, sha256 chain over `prev_hash`) and appends it to `logs/agent-audit/audit.jsonl` on the runner. It writes the last line into the job summary and uploads the file as artifact `agent-audit-<run_id>` (90 days). It does not commit to `main`.
  - `health-check` (dispatch + spend gate) scans recent commits for scaffolding words, lists open PRs idle more than two days, lists failed workflow runs in 24 hours, and may open or comment on an `agent-health-alert` issue.
  - `token-usage-report` (dispatch + spend gate) records the OpenRouter key endpoint response into `logs/agent-audit/token-usage.jsonl` on the runner.
  - `log-analysis` (dispatch only) is inline bash plus `jq` over `logs/agent-audit/audit.jsonl`.
- Migration target: a webhook on Audrey's runner for `issues`, `issue_comment`, and `pull_request_review`. The durable copy has to land on disk she keeps. An Actions artifact disappears with the retention window, and CircleCI's checkout will not contain those lines, because they were never committed.
- Read side that already runs unchanged, once a log file exists: `node scripts/agent-activity-monitor.js report [hours]`, `export`, or `verify`. That script reads `logs/agent-audit/audit.jsonl` and `logs/agent-audit/token-usage.jsonl`. It does not subscribe to GitHub events and it does not write the audit line. It is the report the dispatch `log-analysis` job approximates. Run it on her runner against the webhook's log. A CircleCI job would see an empty log and would not record the comment storm.
- `health-check` and `token-usage-report` stay manual. Both are behind the cloud spend gate. Moving the token report onto CircleCI would be a new OpenRouter call site. Leave it on a machine where `REVVEL_LLM_ALLOW_CLOUD=1` is set on purpose.
- CircleCI equivalent of `issue_comment`: none. Webhook, or a scheduled poll of comments since a stored cursor. Polling is the coarse replacement; it will miss the ordering the hash chain wants unless one writer appends.

## Related workflows in the same window

These two are outside the four-file inventory. They are here because they were
the `issue_comment` edge of the storm. Their YAML is unchanged.

### security-fleet (`.github/workflows/security-fleet.yml`)

Event lane (`issues`, `issue_comment`, `pull_request`) writes the event title
and body to a temp file and runs `node scripts/security-fleet.js sentinel` and,
on pull requests, `exfil`. Filing the finding is inline `github-script`. The
event text does not exist inside CircleCI. The weekly sweep (`exprwatch`,
`permit`, `redteam`) is plain and needs no event:

```bash
node scripts/security-fleet.js exprwatch
node scripts/security-fleet.js permit
node scripts/security-fleet.js redteam
```

That sweep's `schedule` is already commented out (cost freeze 2026-08-21). This
PR does not add it to CircleCI. The storm was the event lane, and enabling the
sweep would turn a frozen job back on. Her runner can run the three commands
on demand. They exit 0 unless `--strict` (report-only).

### Agent Approval Check (`.github/workflows/agent-approval-check.yml`)

Pinned third-party action, not a repo script. Triggers include
`pull_request_target`, `pull_request_review`, and `issue_comment` (only when
the comment is on a pull request). It posts commit status `agent-approval-check`
and one sticky comment. Manual path that already exists:

```bash
scripts/agent-approval-check-manual.sh <pr_number> --local
```

`--local` uses `gh auth token` on the machine that runs it and posts the real
status. The default (no `--local`) dispatches the hosted workflow, which the
billing lock will refuse. CircleCI does not receive `issue_comment`, and a
CircleCI job that posted the same status would double-write once hosted
Actions run again.

## Interim gate rule

Until Audrey disables hosted workflows and a runner replacement is actually
writing labels:

- A red GitHub Actions check whose jobs have zero steps and the annotation "The job was not started because your account is locked due to a billing issue" is billing noise.
- CircleCI is the merge gate: `lint-and-test`, `validate-registries`, and `policy-check` on this branch's config. `veins-monitor` is an observer (its script failure is swallowed in config) and is not the pass/fail gate.
- A hosted job that started steps and failed inside a step is a real failure. This rule does not cover it.
- Do not edit workflow files to skip, `if: false`, or retarget `runs-on` in order to make the billing red turn green.

## issue_comment filter (recommendation only)

Apply this only if Audrey keeps a hosted workflow. This PR does not change the
YAML.

`agent-audit-logger.yml` filters `github.event.issue.user.login` (the issue or
PR author). The commenter is `github.event.comment.user.login`. `gitar-bot[bot]`
and `cursor[bot]` commenting on draft #18276 still started the job. Owner
comments (`midnghtsapphire`, 6 runs in the window) should still run if she
keeps the workflow.

When a hosted `issue_comment` job stays, ignore bot authors:

```yaml
if: >-
  github.event_name != 'issue_comment' ||
  !endsWith(github.event.comment.user.login, '[bot]')
```

Use `github.event.sender.type != 'Bot'` if a bot login does not end in
`[bot]`. Apply the same author check on security-fleet's event lane and on
Agent Approval Check if those stay hosted. Approval Check must still see a
human `/approve <sha>` comment, so its filter has to allow human authors and
drop bots, which matches the expression above.

Tightening the filter reduces the storm. It does not remove the billing lock.
`check_suite` and `workflow_run` will keep re-firing for as long as any hosted
workflow still completes.

## Cutover checklist

1. Confirm a red Actions job is the billing annotation and has zero steps before calling it noise.
2. Read CircleCI on the commit (`ci/circleci: lint-and-test`, `validate-registries`, `policy-check`). That is the gate.
3. Decide in a GitHub Discussion. Do not patch `.github/workflows/` to chase a green Actions tab.
4. For any hosted workflow she keeps, add the bot-author `issue_comment` filter before the account can start runners again, or the comment storm returns on the first bot note.
5. Pick one writer per behavior. Webhook on her runner for event-shaped work (`issue_comment`, reviews, check suite, check run). Scheduled poll for the orchestrator resync. CircleCI stays the test gate.
6. Put the runner token (app installation or `ADMIN_GITHUB_TOKEN`-class PAT) in the runner environment. Pull requests write, issues write, checks read, statuses read. No token in the git tree.
7. Keep the two label families apart (`status:*` from the orchestrator, unprefixed `checks-*` / `approved` / `ready-to-merge` from PR Check Status) unless a later change updates both writers together.
8. Keep the auto-merge guards: refuse when `changed_files` is not a number or is zero, and when the title marks the PR unfinished.
9. Point the audit webhook's JSONL at a disk path she keeps, then run `node scripts/agent-activity-monitor.js verify` against that file.
10. Disable the hosted workflow only after the runner path has written one real label update or one real audit line.
11. Audrey decides: disable hosted workflows (not delete).
