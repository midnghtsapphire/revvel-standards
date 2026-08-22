# WR Manual Processes — Reference & Caveats

> **Who is this for?** Anyone who needs to intervene manually in the WR/automation
> pipeline. Each section covers: what the process does, when to use it, step-by-step
> instructions, and **caveats** (what can go wrong or backfire).

---

## Index

1. [Trigger WR-PR-Creation manually](#1-trigger-wr-pr-creation-manually)
2. [Reset a stuck issue](#2-reset-a-stuck-issue)
3. [Force-reset all stuck issues](#3-force-reset-all-stuck-issues)
4. [Invoke Jules on an issue](#4-invoke-jules-on-an-issue)
5. [Invoke Jules on a PR](#5-invoke-jules-on-a-pr)
6. [Enable auto-merge on a PR](#6-enable-auto-merge-on-a-pr)
7. [Block a PR from merging](#7-block-a-pr-from-merging)
8. [Manually apply the `wr:complete` label](#8-manually-apply-the-wrcomplete-label)
9. [Admin force-merge (override branch protection)](#9-admin-force-merge-override-branch-protection)
10. [Re-run a failed CI check](#10-re-run-a-failed-ci-check)
11. [Close a WR issue without a PR](#11-close-a-wr-issue-without-a-pr)
12. [Update a feature branch from main](#12-update-a-feature-branch-from-main)
13. [Trigger self-healing manually](#13-trigger-self-healing-manually)
14. [Trigger update-main in self-healing](#14-trigger-update-main-in-self-healing)

---

## 1. Trigger WR-PR-Creation Manually

### What it does

Forces the `wr-pr-creation.yml` workflow to run for a specific issue. This
creates (or recreates) the WR branch, generates the WR document from the
template, and opens a pull request.

### When to use

- Your WR issue completed research (Jules posted findings) but no PR appeared.
- The PR was accidentally closed and you need it reopened.
- You want to regenerate the WR document with the latest template.

### How

**Via GitHub UI:**

1. Go to **Actions** → **wr-pr-creation** → **"Run workflow"**
2. Enter the issue number in the `issue_number` field
3. Click **"Run workflow"**

**Via CLI:**

```bash
gh workflow run wr-pr-creation.yml \
  --field issue_number=<NUMBER> \
  --repo midnghtsapphire/revvel-standards
```

### Caveats

⚠️ **Duplicate PRs** — If a PR already exists for that issue, the workflow
checks for it and will skip creation (or re-use the branch) unless the
`wr:reset` label is present. If you want a fresh PR, add `wr:reset` to the
issue first, then trigger.

⚠️ **Research not complete** — If Jules never posted "Research Findings:",
the generated WR document will have placeholder content. Trigger Jules first
(see §4) and wait for findings before triggering PR creation.

⚠️ **Rate limits** — If OpenRouter is rate-limited, Jules may not have
posted complete findings. Check the issue comments for any API error messages.

⚠️ **Template changes** — If you recently changed `WR_TEMPLATE.md`, the new
run will use the new template. Old WR documents are not retroactively updated.

---

## 2. Reset a Stuck Issue

### What it does

`reset-self-heal-issue.yml` performs a full label-reset cycle on a specific
issue: removes stale labels, re-adds routing labels, posts a comment, and
triggers `openrouter-assignee.yml` so Ralph Loop picks it up again.

### When to use

- An issue has been stuck with `wr-stuck` or `triage:new` for > 1 hour.
- Automation tried and failed, you want one clean retry.
- You know the root cause was transient (API blip, rate limit) and want a fresh start.

### How

**Via GitHub UI:**

1. Go to **Actions** → **reset-self-heal-issue** → **"Run workflow"**
2. Enter the issue number
3. Click **"Run workflow"**

**Via CLI:**

```bash
gh workflow run reset-self-heal-issue.yml \
  --field issue_number=<NUMBER> \
  --repo midnghtsapphire/revvel-standards
```

### Caveats

⚠️ **Don't spam resets** — Each reset triggers OpenRouter and Jules. Running
it 5× in a row burns API budget and creates noisy issue comments. Wait 30
minutes between retries.

⚠️ **Doesn't fix root causes** — If the issue is stuck because of a missing
secret, a misconfigured workflow, or an invalid WR description, resetting will
just fail again. Diagnose first.

⚠️ **Label collisions** — If you manually added labels before resetting, the
reset may remove them. Note which labels you added and re-apply if needed after
the reset completes.

---

## 3. Force-Reset All Stuck Issues

### What it does

`auto-reset-stuck-issues.yml` scans all open issues with routing labels
(`auto-fix`, `ralph-loop`, `wr-stuck`, `auto-error`) that have been stuck in
`triage:new` for > 1 hour and resets all of them in a single pass.

It automatically triggers both `openrouter-assignee.yml` and `openrouter-triage.yml`
workflows for each issue found.

### When to use

- A batch of issues got stuck (e.g., after an API outage).
- You want a single trigger to clear a backlog of stuck WRs.
- The cron (every 30 minutes) hasn't fired yet but you need it now.

### How

**Via GitHub UI:**

1. Go to **Actions** → **auto-reset-stuck-issues** → **"Run workflow"**

**Via CLI:**

```bash
gh workflow run auto-reset-stuck-issues.yml \
  --repo midnghtsapphire/revvel-standards
```

### Caveats

⚠️ **Blast radius** — This touches every qualifying stuck issue. If some issues
are stuck intentionally (e.g., you're waiting for a review), they will also be
reset. Review what's currently stuck before firing.

⚠️ **API budget** — Each reset calls OpenRouter. A batch of 20 resets = 20
API calls. Check the OpenRouter balance at <https://openrouter.ai/credits> before
running if you're near a limit.

⚠️ **Cron conflict** — If the 30-minute cron fires at the same time as your
manual trigger, both runs will race. GitHub's concurrency groups prevent most
conflicts but you may see double comments on some issues.

---

## 4. Invoke Jules on an Issue

### What it does

Adding the `jules` label to an open issue triggers `jules-invoke.yml`, which
asks Jules to perform deep research and post its findings as an issue comment.
Jules reviews the repo, checks existing skills, and researches external tools.

### When to use

- Jules never posted research findings for your WR.
- You want Jules to re-research with updated context.
- You added more detail to the issue description and want Jules to re-read it.

### How

1. Open the issue on GitHub.
2. In the right sidebar, click **Labels** → add `jules`.

That's it. Jules picks up the label event and starts working.

### Caveats

⚠️ **Jules API key** — `JULES_API_KEY` must be set and valid. If Jules is
silent after 30 minutes, check Actions for `jules-invoke` run errors.

⚠️ **Duplicate research** — If Jules already posted findings, adding the label
again will trigger another research pass. Two sets of findings in the same issue
can confuse `wr-pr-creation.yml` into using the older one. Add a comment
clarifying which findings to use.

⚠️ **Cost** — Jules deep research is an API call. Don't trigger it repeatedly
on the same issue unless you have new context to provide.

⚠️ **Jules is not a blocking step** — The WR pipeline will proceed even if Jules
doesn't respond, using placeholder content. Jules enriches the WR; the pipeline
doesn't wait forever.

---

## 5. Invoke Jules on a PR

### What it does

Adding the `jules` label to a PR triggers Jules to review and refine the PR
content. Jules re-reads the WR document, improves clarity, fills in gaps, and
updates the branch.

### When to use

- The WR document in the PR is sparse or has placeholder content.
- You gave feedback on the PR and want Jules to incorporate it.
- You want a second refinement pass after your edits.

### How

1. Open the PR on GitHub.
2. In the right sidebar, click **Labels** → add `jules`.

### Caveats

⚠️ **Force pushes** — Jules may force-push to the PR branch. If you have local
changes on that branch, they may be overwritten. Pull after Jules finishes.

⚠️ **Triggers PR review workflows** — Adding `jules` to a PR re-triggers
`jules-pr-reviewer.yml` and possibly `ai-pr-review-openrouter.yml`. You'll
get new review comments even if the PR was already approved.

⚠️ **Not a code fix** — Jules on a PR is a **document refinement** tool, not
a code debugger. For fixing failing tests or CI errors, you need to push
code changes directly.

---

## 6. Enable Auto-Merge on a PR

### What it does

Adding the `auto-merge` label to a PR triggers `auto-merge.yml`, which calls
GitHub's GraphQL mutation `enablePullRequestAutoMerge`. The PR will squash-merge
automatically once all required checks pass and required approvals are in.

### When to use

- The PR is approved and you don't want to manually click merge.
- You trust the automation and want a hands-off close.

### How

1. Open the PR on GitHub.
2. In the right sidebar, click **Labels** → add `auto-merge`.

### Caveats

⚠️ **Branch protection must be configured** — `enablePullRequestAutoMerge` only
works when the repo has required status checks and required reviews enabled on
`main`. If auto-merge doesn't enable, go to **Settings → Branches → main** and
confirm branch protection is configured.

⚠️ **Squash only** — The auto-merge workflow uses SQUASH. Your PR commits will
be squashed into one commit on main. This is by design; don't expect to see
individual commits in `main` history.

⚠️ **`won't-merge` blocks it** — If anyone adds `won't-merge` to the PR,
auto-merge is immediately disabled. Check labels if your PR isn't merging.

⚠️ **Draft PRs** — Auto-merge cannot be enabled on draft PRs. Click
"Ready for review" first.

⚠️ **Conflicts block merge** — Auto-merge queues until checks pass, but if
the branch has conflicts with `main`, it will never merge. Resolve conflicts
first (see §12 and `docs/playbooks/branch-update-guide.md`).

---

## 7. Block a PR from Merging

### What it does

Adding the `won't-merge` label to a PR triggers `auto-merge.yml` to call
`disablePullRequestAutoMerge` and stops any pending auto-merge.

### When to use

- You discover a problem after approving.
- You want to pause a PR while re-scoping.
- A production incident makes the change risky right now.

### How

1. Open the PR on GitHub.
2. In the right sidebar, click **Labels** → add `won't-merge`.

### Caveats

⚠️ **Does not close or reject the PR** — The PR stays open. You need to
either fix the issue and remove the label, or close the PR manually.

⚠️ **Does not remove the approval** — The approval persists. When you remove
`won't-merge`, auto-merge may re-trigger if the `auto-merge` label is still present.

⚠️ **Communicates intent** — Team members (and automation) use this label to
know the PR is blocked intentionally. Leave a comment explaining why to avoid
confusion.

---

## 8. Manually Apply the `wr:complete` Label

### What it does

Applying `wr:complete` to a WR issue signals the pipeline that research is done
and `wr-pr-creation.yml` should proceed to create the PR. Normally this is set
automatically when Jules posts findings, but you can set it manually.

### When to use

- Jules isn't available but you've done the research yourself and written findings
  in the issue comments.
- You want to bypass Jules and trigger PR creation immediately.

### How

1. Open the issue on GitHub.
2. In the right sidebar, click **Labels** → add `wr:complete`.

### Caveats

⚠️ **The WR document may be sparse** — Without Jules' findings, the generated
WR document will use placeholders. You'll need to manually edit the PR document
afterward.

⚠️ **Research quality suffers** — Jules cross-references the entire skills vault,
org repos, and external tools. A manual `wr:complete` skips all of that. Use this
only when Jules is genuinely unavailable.

⚠️ **Don't apply before the issue body is complete** — `wr-pr-creation.yml` reads
the issue body to generate the PR. If the body is incomplete when you apply the
label, you'll get a low-quality WR document.

---

## 9. Admin Force-Merge (Override Branch Protection)

### What it does

Merges a PR to `main` while branch protection reports `blocked`, using the
GitHub **"Merge without waiting for requirements to be met"** button (admin-only).

### When to use

Per `docs/MERGE_AND_OVERRIDE_POLICY.md`, **all four** must be true:

1. `ci/circleci: lint-and-test` is **green**.
2. The only blocking items are cosmetic automation checks.
3. There are **no merge conflicts**.
4. The change has been reviewed by a human or trusted agent.

### How

1. Open the PR on GitHub.
2. At the bottom, find the **Merge pull request** button.
3. If blocked, an admin sees **"Merge without waiting for requirements to be met"**.
4. Confirm the merge.

### Caveats

⛔ **Never override a red `lint-and-test`** — This is the one real gate. If it's
red, fix the failure first. Override here = broken main.

⚠️ **Requires admin rights** — Regular contributors cannot do this. If you need
a force-merge, ask a repo admin.

⚠️ **Leave a comment** — Document why you overrode. "Cosmetic checks pending,
lint-and-test green, reviewed by @handle" is sufficient.

⚠️ **Drafts cannot be force-merged** — Convert to "Ready for review" first.

⚠️ **Conflicts cannot be force-merged** — Resolve first. See §12.

---

## 10. Re-Run a Failed CI Check

### What it does

Asks CircleCI (or GitHub Actions) to retry a failed job without pushing new code.

### When to use

- The failure looks transient (network timeout, flaky test, rate limit).
- You pushed a fix but the old failed run is still showing.

### How

**Via GitHub UI:**

1. Open the PR or commit.
2. Click **"Details"** next to the failing check.
3. On CircleCI, click **"Re-run failed jobs"** or **"Re-run workflow from start"**.

**For GitHub Actions jobs:**

1. Go to **Actions** → find the run.
2. Click **"Re-run failed jobs"** or **"Re-run all jobs"**.

### Caveats

⚠️ **Re-run doesn't fix root causes** — If the test is consistently failing, a
re-run wastes time. Read the logs first.

⚠️ **Pre-existing failures** — Some root-level `npm test` failures come from
intentionally malformed YAML fixtures used to validate error paths. These are
expected and are not caused by your change.

⚠️ **CircleCI is the real gate** — GitHub Actions status checks are mostly
cosmetic (see `docs/MERGE_AND_OVERRIDE_POLICY.md`). Focus on
`ci/circleci: lint-and-test`.

---

## 11. Close a WR Issue Without a PR

### What it does

Closes the issue manually, marking the WR as abandoned or resolved without a code/doc deliverable.

### When to use

- The WR was a duplicate.
- The scope was reshaped into a different WR.
- The Prime Directive evaluation rejected the request.

### How

1. Open the issue on GitHub.
2. Scroll to the bottom.
3. Click **"Close issue"** with reason **"Won't fix"** or **"Duplicate"**.
4. Remove `wr:in-progress` label to stop automation from re-triggering.

### Caveats

⚠️ **Automation may re-open it** — Some watchdog workflows re-open closed issues
if they have certain labels. Remove `wr:in-progress`, `auto-fix`, `ralph-loop`, and `needs-human`
labels before closing to prevent this.

⚠️ **Leave a reason** — Closed WRs without explanation create confusion later.
Always write a comment: "Closing as duplicate of #N" or "Out of scope for Phase 1."

⚠️ **Related PR stays open** — Closing the issue doesn't close any linked PR.
Close the PR separately.

---

## 12. Update a Feature Branch from Main

### What it does

Brings the latest changes from `main` into your feature/WR branch so they don't
conflict when the PR is reviewed. This is called "rebasing" or "merging main into
your branch."

### When to use

- Your PR has a "conflicts" badge on GitHub.
- Main has been updated with changes your PR depends on.
- You want the latest code before pushing new changes.

### How

**Option A — Merge (safer, preserves history):**

```bash
git fetch origin main
git checkout wr/issue-N-your-title
git merge origin/main
# Resolve conflicts if any, then:
git push origin wr/issue-N-your-title
```

**Option B — Rebase (cleaner history, higher risk):**

```bash
git fetch origin main
git checkout wr/issue-N-your-title
git rebase origin/main
# Resolve conflicts if any, then:
git push --force-with-lease origin wr/issue-N-your-title
```

### Caveats

See full details in `docs/playbooks/branch-update-guide.md`. Key warnings:

⚠️ **Rebase requires force push** — `--force-with-lease` is safer than `--force`
but still rewrites history. Other contributors on the same branch will need to
reset their local copy.

⚠️ **Merge creates a merge commit** — This is visible in history and some teams
prefer to avoid it. For WR branches (used only by automation), merge is fine.

⚠️ **Never rebase or force-push `main` itself** — Only rebase on feature/WR branches.

---

## 13. Trigger Self-Healing Manually

### What it does

Runs `self-healing.yml` immediately (instead of waiting for the 4-hour cron).
The workflow scans for failed GitHub Actions runs, stuck issues, and missing
workflows — then attempts automated fixes.

### When to use

- You just fixed a root cause (e.g., restored an API key) and want the system to
  verify and clean up immediately.
- You see multiple failures and want the self-healer to run before the next cron.

### How

**Via GitHub UI:**

1. Go to **Actions** → **Self-Healing Agent** → **"Run workflow"**

**Via CLI:**

```bash
gh workflow run self-healing.yml \
  --repo midnghtsapphire/revvel-standards
```

### Caveats

⚠️ **Thresholds matter** — Self-healing only fires healing actions if failures
exceed defined thresholds (> 3 failed runs, > 5 stuck issues). A single failure
won't trigger healing steps even on manual run.

⚠️ **Re-runs may fail again** — The healer re-runs failed workflows. If the root
cause hasn't been fixed (e.g., secret still missing), the re-run will fail again.

⚠️ **Creates healing journal issues** — Each healing run creates a
`[SELF-HEAL] System healing completed` issue. These pile up. They auto-close in
24 hours, but if you're triggering this repeatedly, expect issue noise.

---

## 14. Trigger Update-Main in Self-Healing

### What it does

`self-healing.yml` includes an `update-main` job that scans for PRs that are:

- Approved (at least one approving review)
- All required CI checks passing (green)
- Not in draft state
- Not labeled `won't-merge`
- Not conflicted with `main`

...and adds the `auto-merge` label to them, which triggers the standard
`auto-merge.yml` to squash-merge them into `main`.

### When to use

- You have a backlog of approved-and-green PRs that nobody has clicked merge on.
- You want to bulk-advance PRs to main in one sweep.
- After resolving an outage and want everything that was waiting to land.

### How

The `update-main` job runs automatically as part of `self-healing.yml` (every
4 hours) and whenever you trigger self-healing manually (see §13).

To run only the update-main pass (without the rest of the healer):

```bash
# Manual trigger — runs update-main as part of self-healing
gh workflow run self-healing.yml \
  --repo midnghtsapphire/revvel-standards
```

### Caveats

⚠️ **Squash-merges only** — All merges go through the standard auto-merge
squash path. Individual commits are squashed into one.

⚠️ **Only touches approved+green PRs** — Draft PRs, PRs with failing CI,
and PRs with `won't-merge` are explicitly skipped.

⚠️ **Won't fix conflicts** — If a PR has conflicts with `main`, the
`auto-merge` label is added but GitHub will not merge it until conflicts are
resolved. Update-main will log a warning for each conflicted PR.

⚠️ **Admin token required** — The `update-main` job uses
`ADMIN_GITHUB_TOKEN` to add labels. Without it, it falls back to `GITHUB_TOKEN`
which cannot trigger downstream workflows; in that case, the label is added but
`auto-merge.yml` may not cascade.

⚠️ **Review the list before trusting it** — If auto-merge was disabled on a PR
for a good reason but `won't-merge` was never added, the update-main job may
re-enable auto-merge. Always have `won't-merge` on PRs you want held.

---

_Last updated: see git log. Changes require a PR with the `docs:` prefix._
