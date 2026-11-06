# PR lifecycle labels without GitHub Actions

**Preferred route — owner update, 2026-11-06:** reuse the working CircleCI
installation for the deterministic labels and badges. See
[CircleCI setup](#circleci-route-approved-on-2026-11-06) below. The earlier
operating-system scheduler instructions remain as an alternative, not an
additional service to enable.

The external label updater reconciles PR labels through the GitHub API, with an operating-system scheduler providing execution independently of GitHub Actions.

**Who / when / why:** Codex deployment agent, 2026-11-06, implementing Audrey Evans's request for a deterministic, FOSS billing workaround that preserves all existing work. These are installation instructions, not a claim of deployment. The session could read public repositories but could not authenticate a push or access a deployment host. Existing workflows remain active and unchanged in this change.

**Later access update, 2026-11-06:** GitHub connector access recovered and the
prepared work was published for review in
[draft PR #18291](https://github.com/midnghtsapphire/revvel-standards/pull/18291).
The earlier access failure above is retained as session history. CircleCI
context permissions, schedule activation, and production writes remain
unverified; publishing a PR is not deployment.

## Reuse the existing external host

[`midnghtsapphire/revvel-dark-run`](https://github.com/midnghtsapphire/revvel-dark-run) already documents running outside Actions on a laptop or DigitalOcean machine, including a fifteen-minute cron. Its `src/dark-run.mjs` processes WR text through LLM twins; it is not a generic deterministic task runner. Reuse that machine and its scheduler for this CLI. Keep label evaluation directly in code rather than sending it through the LLM inbox.

Use **one** scheduling method. If the existing host scheduler can call the CLI, add the direct invocation there. The included user-level systemd files are an alternative for a Linux host without an existing scheduling integration; enabling both would duplicate API traffic. No new machine purchase is required by this implementation, though the existing machine's operating costs remain.

## Runtime and token

- Node.js 22, 23, or 24, matching the repository's `>=22 <25` engine declaration.
- A checkout containing `scripts/pr-lifecycle-labels.mjs`. No package installation is needed for the standalone CLI.
- `GH_TOKEN` (preferred) or `GITHUB_TOKEN` supplied in the process environment. The external worker cannot read GitHub Actions secrets automatically.
- Use a fine-grained token scoped to the target repository with Pull requests read, Checks read, Commit statuses read, and Issues write. An appropriately scoped GitHub App installation token is also supported, but its renewal must be provided by the existing host credential service.
- The GraphQL readiness query needs repository access. A read failure causes a failed run, not an inferred passing result.

Store the credential using the existing host secret provider. For the optional systemd setup, the operating-system account owns `~/.config/revvel/pr-lifecycle-labels.env` with mode `0600`; put the actual `GH_TOKEN` assignment there using a local editor. Also set `REVVEL_BADGE_AUTHORS` to the comma-separated logins of the verified existing badge author and current token actor. For example, a legacy Actions badge usually belongs to `github-actions[bot]`; verify its actual author rather than assuming. Never put the token value in a repository, shell command argument, log, or chat.

## Run and inspect

From the checkout, with the token exported by the host secret provider:

```bash
node --version
node --test tests/pr-lifecycle-labels.test.js
node scripts/pr-lifecycle-labels.mjs --repo midnghtsapphire/revvel-standards
```

The default is dry-run: output describes computed labels and planned differences without writing labels. Add `--pr` followed by an actual PR number to inspect one PR. Add `--apply` to perform label changes once cutover is complete.

The updater owns the seven existing `status:` lifecycle labels. It preserves every unrelated label, computes additions/removals, and verifies writes. The API remains the source for review and check state. Required-check and review policy remain GitHub's responsibility; a label is a display of observed state, not merge authorization. The updater does not enable auto-merge.

## Preserve the status badge

The existing badge remains available as a deterministic feature. Add `--badges --badge-author` followed by the comma-separated verified logins when invoking the CLI directly. The supplied service enables this feature and reads its author list from `REVVEL_BADGE_AUTHORS`. Its initial run is still dry-run: planned comment changes appear in the output but are not posted until `--apply` is present.

The updater paginates comments and recognizes the existing `<!-- revvel-status-badge -->` prefix. It updates that same comment when the state changes, leaves an identical body alone, and creates one badge if none exists. It can repair a badge even when labels already match. Recently closed PRs receive a closed or merged badge consistent with their actual state. These are PR status comments; unrelated README/build badges remain untouched.

If several marker comments exist, or a marker belongs to an unconfigured author, the run reports the conflict rather than choosing arbitrarily or posting another badge. Inspect the comments and author configuration; preserve duplicate history while establishing which comment is the owner-managed badge. GitHub must authorize the token to edit that comment; adding a login to the configured list does not grant GitHub permissions. Issues-write permission covers the comment API, subject to repository/account restrictions.

Badges add comment-list reads and occasional writes to the request budget. Deterministic bodies prevent a new timestamp alone from forcing comment updates on every poll; execution receipts remain in the host journal. Labels and badges need no LLM. [The current Cubic, CircleCI, and OpenHands comparison](../../Library/pr-lifecycle-label-research-2026-11-06.md#follow-up-badges-cubic-circleci-and-openhands) assigns review, deterministic tests, and coding/repair to those tools separately. Their installations and credentials must be verified before claiming they run here.

The normal repository scan covers all open PRs and closed/merged PRs updated during the previous seven days. `--closed-days` accepts 0 through 365; 0 disables the closed-PR sweep. Closed results are ordered by their update time, and enumeration stops at the cutoff. To repair an older closed or merged PR, invoke the CLI with that PR's explicit `--pr` number and `--apply`. If the service has been offline longer than its closed window, widen the window for a catch-up run or supply the missed PR numbers. This bounded sweep does not claim to reconcile all historical closed PRs.

## CircleCI route approved on 2026-11-06

Audrey selected the existing working CircleCI installation after inspection of
PR [#18287](https://github.com/midnghtsapphire/revvel-standards/pull/18287).
Its policy-check, veins-monitor, and validate-registries statuses succeeded;
lint-and-test ran and failed. Devin Review succeeded and Cubic/Cursor review
summaries were present. These observations establish external integration
activity, not permission for a CircleCI script to write labels.

The additive `.circleci/config.yml` job calls the existing deterministic CLI
through `.circleci/scripts/pr-lifecycle-labels.mjs`. It uses the existing pinned
Node executor, needs no package installation, includes badges, and defaults to
dry-run. A 15-minute timeout bounds the batch. The serial group prevents two
maintenance runs from writing concurrently. Only this maintenance workflow runs
when the boolean pipeline parameter `run-pr-lifecycle` is `true`; normal pushes
retain all four existing jobs. No GitHub workflow is changed by this addition.

Before enabling the job, reuse an existing suitably restricted CircleCI context
or create `revvel-pr-lifecycle` (the name referenced in the config). Restrict it
to this project, the authorized operator group where supported, and this
server-side expression:

```text
pipeline.git.branch == "main" and not job.ssh.enabled and not (pipeline.config_source starts-with "api")
```

The context restriction must exist outside repository YAML: branch checks inside
a script do not protect a token from a PR that edits the script or job config.
Do not place the label-write credential in project-wide variables or attach its
context to PR lint/test jobs. For a GitHub App pipeline, configure both its
configuration source and checkout source to this repository's trusted `main`.
The restriction against API-supplied config still permits normal API-triggered
pipelines that load their config from the repository.

| Context variable | Meaning |
| --- | --- |
| `REVVEL_LIFECYCLE_GITHUB_TOKEN` | Dedicated repository credential; preferred over fallback `GH_TOKEN` / `GITHUB_TOKEN` from this restricted context |
| `REVVEL_BADGE_AUTHORS` | Comma-separated verified existing badge author and current token actor logins |
| `REVVEL_LIFECYCLE_APPLY` | Unset or `false`: dry-run. Exactly `true`: write labels and badges after cutover |

Reuse an existing authorized token through the restricted context if one is
already available. The wrapper checks presence without printing the value;
presence does not prove permissions. The required GitHub permissions are listed
above under **Runtime and token**. Successful CircleCI checkout/status reporting is not
evidence that a shell job has a label-write token.

After the reviewed code is on `main`, run one main-branch pipeline with
`run-pr-lifecycle=true`, leaving apply unset. Verify the full dry-run succeeds
and its badge ownership and label plan match the actual PRs. Preserve/retire
competing writers using the cutover procedure below, then set apply to `true`
and verify an apply run plus an immediate repeat with no new differences.

Create exactly one hourly **scheduled pipeline**, targeting `main`, with the
boolean parameter `run-pr-lifecycle=true`. In CircleCI's project settings this
is under **Triggers** for GitHub OAuth or **Project Setup** for GitHub App.
For OAuth's timetable choose one run per hour, all hours and all days; for a
GitHub App cron schedule use `17 * * * *` (UTC). A schedule may run later than
its nominal time. Do not also enable the optional systemd timer below.
No webhook secret or Railway dispatcher is required for this route. CircleCI
has its own usage/credit limits; this removes GitHub Actions runner dependence,
not every hosting cost.

To pause mutations, set `REVVEL_LIFECYCLE_APPLY=false`; to stop polling, disable
the CircleCI schedule. Keep the code and original workflows for rollback.
The local job/script tests do not establish a live schedule, context creation,
token authorization, or a successful production write. Those must have real run
receipts before this route is reported operational.

Sources checked 2026-11-06:
[schedule triggers](https://circleci.com/docs/guides/orchestrate/scheduled-pipelines/),
[context restrictions](https://circleci.com/docs/guides/security/contexts/),
[configuration reference](https://circleci.com/docs/reference/configuration-reference/).

## Optional user-level systemd installation

These units use `~/revvel-standards` as their explicit installation directory. If the host checkout is elsewhere, set `WorkingDirectory` through `systemctl --user edit pr-lifecycle-labels.service` rather than moving or overwriting the existing checkout. Ensure Node is visible in systemd's PATH; a shell-only nvm installation needs an explicit executable path in an `ExecStart` override.

Run from the repository checkout:

```bash
install -d -m 700 "$HOME/.config/revvel" "$HOME/.config/systemd/user"
install -m 644 config/systemd/pr-lifecycle-labels.service "$HOME/.config/systemd/user/"
install -m 644 config/systemd/pr-lifecycle-labels.timer "$HOME/.config/systemd/user/"
```

Create the credential environment file through the host secret provider or a local editor, set its mode to `0600`, then validate and run the dry-run service:

```bash
chmod 600 "$HOME/.config/revvel/pr-lifecycle-labels.env"
systemd-analyze --user verify "$HOME/.config/systemd/user/pr-lifecycle-labels.service" "$HOME/.config/systemd/user/pr-lifecycle-labels.timer"
systemctl --user daemon-reload
systemctl --user start pr-lifecycle-labels.service
journalctl --user -u pr-lifecycle-labels.service -n 100 --no-pager
```

A headless host needs the account's user service manager to persist after logout. Its administrator can enable lingering for that operating-system account. The service runs as the account, not as root. Installation does not enable the timer yet.

## Cutover: preserve originals and retire competing writers

Prepare these changes on a task branch and submit a draft PR for owner review. Execute the host apply step after the approved changes are deployed. This order prevents multiple bots repeatedly undoing each other's labels.

| Existing component | Required cutover treatment | Reason |
| --- | --- | --- |
| `.github/workflows/pr-lifecycle.yml` | Rename to `.yml.disabled` with a dated header | Currently logs state but schedules Actions jobs |
| `.github/workflows/pr-state-orchestrator.yml` | Rename to `.yml.disabled` with a dated header; enable the replacement badge option | Consolidate label/badge writers while preserving badge functionality |
| `scripts/self-heal-repo.js` | Comment only `await reprocessPRLabels();` | Preserve unrelated self-healer duties and the original function |
| `.github/workflows/stuck-label-watchdog.yml` | Preserve original synonym list as a comment; remove the managed status alias from the active list | Avoid removing labels now owned by the updater |
| Other label-triggered workflows and integrations | Audit subscriptions and retained label consumers before apply | External token writes can trigger workflows that `GITHUB_TOKEN` writes suppressed |

The following migration commands are deliberately provided here rather than executed during this session. They abort if the expected lines have drifted or archived filenames already exist. Every original byte remains in the renamed file or commented line. Run from the checkout on the task branch:

```bash
python3 - <<'PY'
from pathlib import Path
workflows = [Path('.github/workflows/pr-lifecycle.yml'),
             Path('.github/workflows/pr-state-orchestrator.yml')]
heal = Path('scripts/self-heal-repo.js')
watch = Path('.github/workflows/stuck-label-watchdog.yml')
old_heal = '    await reprocessPRLabels();'
old_watch = "              const STALE_REVIEW_SYNONYMS = ['awaiting-review', 'awaiting-approval', 'status:waiting-for-review'];"
heal_text, watch_text = heal.read_text(), watch.read_text()
assert heal_text.count(old_heal) == 1, 'Self-healer changed; inspect before editing'
assert watch_text.count(old_watch) == 1, 'Watchdog changed; inspect before editing'
for path in workflows:
    assert path.is_file() and not Path(str(path) + '.disabled').exists(), path
for path in workflows:
    archived = Path(str(path) + '.disabled')
    path.rename(archived)
    original = archived.read_bytes()
    header = (b'# 2026-11-06 Codex: retained for Audrey; external deterministic lifecycle updater replaces this workflow.\n'
              b'# Cutover/rollback: docs/automation/pr-lifecycle-labels.md; attach actual draft PR URL in the migration record.\n')
    archived.write_bytes(header + original)
heal.write_text(heal_text.replace(old_heal,
    '    // 2026-11-06 Codex: external updater owns status labels; retain original call for rollback.\n'
    '    // await reprocessPRLabels();'))
watch.write_text(watch_text.replace(old_watch,
    '              // 2026-11-06 Codex: external updater owns status:waiting-for-review.\n'
    '              // ' + old_watch.strip() + '\n'
    "              const STALE_REVIEW_SYNONYMS = ['awaiting-review', 'awaiting-approval'];"))
PY
git diff --stat
git diff --check
```

Record the actual cutover date, PR URL, deployed commit, host identity, and successful test/run receipts in the migration record. Legacy workflow tests and the lifecycle workflow allowlist reference active filenames; update those expectations additively for the retired filenames before merging. This instruction is not evidence those compatibility tests have already been migrated. Retain all original test content as comments where retiring an assertion.

Disabling `pr-state-orchestrator.yml` retires its duplicate implementation; the replacement preserves status badge updates through `--badges`. Compare the planned badge body and author before activation. Any auto-merge functionality still wanted must have its own explicitly reviewed owner, rather than being hidden inside label maintenance.

After the reviewed cutover is deployed, use `systemctl --user edit pr-lifecycle-labels.service` and add:

```ini
[Service]
ExecStart=
ExecStart=/usr/bin/env node scripts/pr-lifecycle-labels.mjs --repo midnghtsapphire/revvel-standards --badges --badge-author ${REVVEL_BADGE_AUTHORS} --apply
```

Then run:

```bash
systemctl --user daemon-reload
systemctl --user start pr-lifecycle-labels.service
journalctl --user -u pr-lifecycle-labels.service -n 100 --no-pager
systemctl --user enable --now pr-lifecycle-labels.timer
systemctl --user list-timers pr-lifecycle-labels.timer
```

## Stop, retry, and rollback

Stop the timer and any current invocation:

```bash
systemctl --user disable --now pr-lifecycle-labels.timer
systemctl --user stop pr-lifecycle-labels.service
```

Preserve an installed apply override by renaming its `.conf` file to `.conf.disabled`; reload the user service manager to restore dry-run behavior. To restore the legacy system, prepare a review branch that renames both archived `.yml.disabled` workflows back to `.yml`, restores the original self-healer call and watchdog synonym list from their retained comments, and retains the newer explanation alongside them. Enable only one writer after the rollback is deployed. The archived workflow headers can remain as history with a dated rollback note.

Inspect failed runs with `journalctl`. Authentication errors require refreshing the host token and checking repository access. Rate-limit errors require reducing polling frequency or limiting the PR scope; do not repeatedly restart a failed job. The CLI stops the batch on HTTP 401, 403, or 429 and stops before another request when a reported remaining rate budget falls below 20, tracking REST and GraphQL budgets separately. Other individual PR read/race failures are recorded while remaining PRs continue; the run ultimately exits nonzero. An apply-mode error reports `applied: null` and `mayHaveChanged: true`, because an earlier label or badge write may already have succeeded; inspect the actual PR before retrying. Dry-run errors report `applied: false`. Head/check state that changes during a write can require a later reconciliation. Systemd records failures and attempts the next timer cycle; the included service does not create GitHub issues or send messages automatically.

For large queues, estimate request load before scheduling: a non-draft PR requires multiple paginated REST reads plus a GraphQL read; applying changes rechecks state and verifies the result. An approximate REST budget before mutations and extra pages is `5 × open_PR_count × runs_per_hour`, plus listing calls; GraphQL has its own budget. With 300 open PRs, fifteen-minute polling is roughly 6,000 REST reads/hour before other bots, exceeding a typical 5,000-request installation budget. The optional timer therefore starts at one hour after each completed run; measure actual quota and latency before reducing the interval. This is not a promise to stay below every installation's shared quota. A sleeping laptop cannot maintain that interval. A webhook adapter can reduce latency later, but no webhook endpoint is deployed by these files.

## Validation record

The new CLI tests are offline validation. Live credentials, downstream event behavior, host uptime, token renewal, and a post-cutover second run with no label differences must be verified before calling the service operational. No live label mutations or old-workflow disablement occurred while writing this document.

`systemd-analyze verify` passed for both supplied units in this session. User-manager validation with `--user` could not initialize because the execution environment has no user runtime manager; the commands above must still be checked on the actual host. This validates unit syntax, not installation or a live scheduled run.

### CircleCI validation receipt — 2026-11-06

Codex CircleCI specialist: 29/29 tests passed (25 reconciler tests plus four
CircleCI isolation/configuration tests). The declared `js-yaml@5.5.0` dependency
was installed in an isolated validation directory; no dependency files changed.
Official CircleCI CLI 1.14.0, verified against its release SHA-256 checksums,
accepted `config validate` and expanded `config process` successfully.
The expanded default config retains the ordinary workflows.

The wrapper uses `CIRCLE_PROJECT_USERNAME` / `CIRCLE_PROJECT_REPONAME`, matching
the observed OAuth-shaped integration. A future GitHub App integration may use
different organization/project names: verify its runtime identifiers before
migrating this job, rather than weakening the repository guard.

No live CircleCI credential, context restriction, scheduled run, or label write
was available to this specialist. The BNAT imprint reported no obstruction and
`h1ApproxZero=true`, but the new worker was unknown and `imprinted=false`;
this change adds an opt-in job and does not activate production mutations.
