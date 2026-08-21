# Learnings

This file logs lessons learned from self-healing fixes, incidents, and other operational learnings.

## [Template Entry]

**Date:** YYYY-MM-DD

**Context:** What was happening / what was being worked on.

**Root Cause of Failure (If any):** What actually broke and why.

**Self-Healing Fix / Learned Lesson:** What was done to fix it, or what was learned.
## Learnings Log

> **Usage note:** Writes must be append-only. Never rewrite or delete prior
> entries. Each new lesson goes at the bottom, using the template below.
## Learnings

> Append-only log. Writes must be append-only: never edit or delete prior entries; add new ones at the bottom using the template below.

## Template

- **Date/Time:**
- **Task Attempted:**
- **Outcome:**
- **Root Cause of Failure:**
- **Self-Healing Fix / Learned Lesson:**
- **Next Action:**

---

## Entries

**Date:** 2025-01-15

**Context:** Automating issue triage and code changes via OpenRouter → OpenHands fallback chain for the $10k/month → $10M mission pipeline.

**Root Cause of Failure (If any):** A prior `learnings.md` entry deviated from the established template by extending the `Self-Healing Fix / Learned Lesson` heading with extra clarifying text (`— tools and skills actually used, for whoever runs the next one of these`). This broke exact-string grep-ability of the log by field name.

**Self-Healing Fix / Learned Lesson:** Keep template headings verbatim. Any clarifying context belongs in the body of the entry, not appended to the heading. This preserves `grep -F '**Self-Healing Fix / Learned Lesson:**'` as a reliable way to enumerate lessons across the log. Tools and skills actually used, for whoever runs the next one of these: `markdownlint-cli2` for validation, `grep -F` for verifying heading consistency across entries, and a discipline of "template first, prose second" when appending to structured logs.

---
- **Date/Time:** 2025-01-fleet-audit-session
- **Task Attempted:** Fleet-wide audit-and-fix session covering: general bug
  sweep, orphaned follow-up reconnaissance, a new checkbox-to-work-request
  feature, a four-fleet wiring audit (security, credential-autonomy,
  self-heal-pr, reset-self-heal-issue), and closing out one orphaned work
  request.
- **Outcome:** Session completed with concrete findings and fixes landed for
  the addressable items; four high-priority wiring defects surfaced by the
  audit remain open and are documented for the next agent.
- **Root Cause of Failure:** N/A for the session itself — the audit succeeded.
  For the still-open findings: (1) `scripts/security-fleet.js` has no workflow
  trigger wired to it, so it never runs; (2) `credential-autonomy-agent.yml`
  has no failure-reporting path, so it can never surface a failed run; (3)
  `self-heal-pr.yml` and `reset-self-heal-issue.yml` are documented as
  automatic but are configured 100% manual (`workflow_dispatch` only).
- **Self-Healing Fix / Learned Lesson:** Tools/skills actually used this
  session, and how:
  - `Agent` tool with `isolation: "worktree"` to fan out parallel
    code-writing subagents against independent parts of the tree without
    them stepping on each other's working copies. This was the single
    biggest force multiplier — the audit + fixes would not have fit in one
    session serially.
  - `TaskCreate` / `TaskUpdate` to track each audit target and each
    resulting fix as a first-class item, so nothing got dropped when
    context got long.
  - `mcp__github__*` MCP family for every GitHub interaction (issues, PRs,
    comments, file reads on remote refs). The `gh` CLI is **not** available
    in this environment; do not reach for it. If a step seems to require
    `gh`, translate it to the equivalent `mcp__github__*` call instead.
  - Direct verification over trusting a read-through: when a script or
    workflow looked correct on inspection but behavior was suspect, the
    fix loop was to actually execute the broken path — e.g. extracting
    an embedded heredoc and running `python -m py_compile` on it — rather
    than declaring it fine after reading. Several defects only showed up
    under real execution.
  - Own-turn `Read` / `Edit` / `Bash` were used directly (not delegated to
    a subagent) only for small, low-risk follow-ups where spinning up an
    `Agent` worktree would have cost more than the edit itself. Rule of
    thumb applied: if the change touches >1 file or needs its own
    verification loop, delegate; otherwise do it inline.
  - No `Skill`-tool skills were invoked this session. The audit loop
    itself (enumerate fleet → check trigger wiring → check
    failure-reporting wiring → check docs-vs-reality drift → file
    findings) is a strong candidate to be packaged as a reusable Skill if
    it comes up again, since it was executed the same way four times in
    a row.
- **Next Action:** Read `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`, then
  address the highest-priority still-open findings from the four-fleet
  wiring audit, in this order:
  1. Wire a trigger to `scripts/security-fleet.js` (currently unreachable).
  2. Add a failure-reporting path to `credential-autonomy-agent.yml` so
     failed runs actually surface as issues/alerts.
  3. Reconcile `self-heal-pr.yml` and `reset-self-heal-issue.yml` with
     their docs — either add the automatic triggers the docs promise, or
     update the docs to state that they are manual-only
     (`workflow_dispatch`).
## Entry: Fleet Audit-and-Fix Session — Tools & Skills Used

- **Date/Time:** 2025-01-27 (session)
- **Task Attempted:** Multi-part fleet audit-and-fix: bug sweep across workflow fleet, recon on orphaned follow-up issues, implementing a new checkbox-to-WR feature, four-fleet wiring audit (security-fleet, credential-autonomy, self-heal-pr, reset-self-heal-issue), and closing out one orphaned WR.
- **Outcome:** Session completed with concrete deliverables (fixes landed, audit findings documented, one orphaned WR closed). Several high-priority wiring bugs surfaced but remain open for follow-up: `scripts/security-fleet.js` has no trigger wired, `credential-autonomy-agent.yml` cannot report failure (missing failure branch / exit code propagation), and both `self-heal-pr.yml` and `reset-self-heal-issue.yml` are 100% manual (`workflow_dispatch`-only) despite being documented as automatic.
- **Root Cause of Failure:** N/A for the session itself (successful); the surfaced issues share a common root cause — workflows were authored and documented as "automatic" but never had their `on:` triggers or failure-propagation branches wired up, and no audit loop existed to catch the drift between docs and reality.
- **Self-Healing Fix / Learned Lesson:** Concrete tools/skills used this session, recorded so a future agent doesn't have to reconstruct the approach:
  - **`Agent` tool with `isolation: "worktree"`** — launched parallel code-writing subagents against independent worktrees for the four-fleet audit, so each fleet's investigation and fix proposal ran without stepping on the others. Use this whenever the work partitions cleanly across files/subsystems.
  - **`TaskCreate` / `TaskUpdate`** — used as the session's source of truth for progress across the five workstreams (bug sweep, orphan recon, new feature, four-fleet audit, orphan WR closeout). Prevented losing track when subagents returned out of order.
  - **`mcp__github__*` MCP family** — used for all GitHub interaction (issue read/create/comment, PR create, file writes via API). Note for future sessions: the `gh` CLI is **not** available in this environment; do not attempt to shell out to it, use the MCP tools directly.
  - **Direct-verification practices** — instead of trusting a read-through of code, actually executed the broken path: `grep`/`Read` against the live tree to confirm current state, extracted heredoc'd Python from workflow YAML and ran `python -m py_compile` on it to confirm syntactic validity, and traced `on:` triggers end-to-end rather than assuming the documented trigger existed. This is what surfaced the four-fleet wiring bugs.
  - **Own-turn `Read` / `Edit` / `Bash`** — used directly (not via subagent) for small, low-risk follow-ups: single-file appends, closing one issue, reading a workflow to confirm a trigger. Delegation overhead isn't worth it for <1-minute changes on a single file.
  - **No `Skill`-tool skills were invoked this session.** The audit-and-fix loop (enumerate fleet → verify each workflow's trigger and failure-propagation → open findings issues → fix in parallel worktrees → close orphans) is repetitive enough that if it recurs it should be packaged as a `Skill` so the enumeration and verification steps are codified rather than re-derived.
- **Next Action:** Work `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` against the still-open highest-priority findings, in this order: (1) wire a trigger onto `scripts/security-fleet.js` (currently unreachable), (2) add a failure branch / non-zero exit propagation to `credential-autonomy-agent.yml` so it can actually report failure, (3) add automatic triggers to `self-heal-pr.yml` and `reset-self-heal-issue.yml` (currently `workflow_dispatch`-only despite docs claiming automatic behavior). Consider packaging the audit loop as a reusable `Skill` if a second fleet-wide audit is requested.
## **Next Action:** See `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` for the reusable methodology and the growing fix-pattern catalog. Open items from this session still needing a priority call before more PRs get dispatched: `scripts/security-fleet.js` has zero trigger (the fleet's prompt-injection/secret-exfil/permission-drift detector never runs), `credential-autonomy-agent.yml` runs hourly and can structurally never report failure, and `self-heal-pr.yml`/`reset-self-heal-issue.yml` (CLAUDE.md's own documented loop steps 4 and 6) are 100% manual despite being described as automatic

**Date/Time:** 2026-07-14T13:15:00Z

**Task Attempted:** External full-repo prosecution audit (Claude, chat session) — gaps, broken wiring, errors, bugs across revvel-standards. 10 WRs filed at `wr/pending/audit-2026-07-14/`, pushed via Zapier GitHub MCP on branch `audit/2026-07-14-wr-a1`.

**Outcome:** Success — audit complete, fixes proven empirically, WRs + memory + skill files landed on branch, PR opened for review. One incident during push: a Zapier whole-file write replaced learnings.md with only this entry (branch-only; main untouched; restored via scripts/restore-learnings.sh from blob 58bb597a).

**Root Cause of Failure (If any):** Audited a clone snapshot; at push time live main had already gained a partial WR-A1 fix (yaml/ajv/ajv-formats/@types/node landed; semver + @octokit/rest still missing). Remaining audit findings verified still live: state.json = `{}` (issue-13555), 3 workflows calling missing scripts (call-cursor-api.sh, record.js, index.js), 13 pull_request_target workflows, gitbito@main unpinned, 5 duplicate issue files, 5 broken SSOT links, 78 cron workflows unbudgeted. Incident root cause: tools that replace whole-file content must never be pointed at append-only logs — the transfer-size ceiling forces truncation or replacement.

**Self-Healing Fix / Learned Lesson:** (1) **Audits decay — re-verify every finding against live HEAD before applying fixes**; merge into current state, never overwrite newer work with stale audit copies. This bit twice in one session (package.json, learnings.md itself). (2) Cluster failures by root cause before filing: 23 test failures were 1 bug (undeclared deps); proven fix took the suite 482 discovered → 631/631 green + clean tsc. (3) Fix + vaccine together: every corrective WR names the guard preventing recurrence (WR-A10 dependency-declaration lint is WR-A1's vaccine). (4) NEW from the incident: **whole-file-write APIs are forbidden on append-only logs** — route log appends through git-native paths (Actions workflow with checkout, or a side-file + fold-in script) where the write can be atomic and size-unbounded. Full toolchain + method in `wr/memory/audit-2026-07-14-tools.md`; procedure codified in `skills/repo-audit/SKILL.md`.

**Next Action:** Review/merge PR from `audit/2026-07-14-wr-a1`. Then agents execute WR-A1..A10 in priority order (A2 state engine and A3 dead script paths first — both P0/P1 and both currently breaking live automation). Also: archive learnings.md entries older than 90 days per its own header rule — the log is 70KB+ and growing; a WR for the archival cron is warranted.

**Date/Time:** 2026-07-24

**Task Attempted:** Run the wr-rewrite sweep pipeline (`npx markdownlint-cli2 "**/*.md" 2> lint.txt` then `python scripts/wr_rewrite.py select ...`) via `.github/workflows/wr-rewrite.yml`.

**Outcome:** Every run of the workflow died immediately with `pwsh: command not found` — no lint report, no queue, no rewrites, ever since the workflow landed.

**Root Cause of Failure (If any):** All three steps in `wr-rewrite.yml` declared `shell: powershell`, but the job targets `runs-on: self-hosted` and the fleet's self-hosted runners are Linux with no PowerShell installed. The commands themselves are plain POSIX (npx, python, `2>` redirect) and never needed PowerShell. Nothing in CI validated that a declared step shell can actually exist on the runner, so the mismatch shipped silently.

**Self-Healing Fix / Learned Lesson:** (1) Switched the steps to `shell: bash` and `python` → `python3`, adding `|| true` to the lint command because markdownlint's non-zero exit on findings is the pipeline's *input*, not a failure — bash's fail-fast would otherwise kill the step before `select` runs (PowerShell had only checked the last command's exit code, so semantics are preserved). (2) Vaccine: `scripts/check-workflow-yaml.js` now has a `windowsOnlyShell` check that fails `npm run workflows:validate` for any workflow declaring `shell: powershell|pwsh|cmd`, with regression tests in `tests/check-workflow-yaml.test.js`. Lesson: a step's `shell:` is an environment claim, not a formatting choice — validate it like one.

**Next Action:** Re-run the `wr-rewrite-sweep` workflow via `workflow_dispatch`. Separately, the bare `**/*.md` glob in the workflow's lint step queues generated transcript files (`docs/agents/**/transcripts/**`) for LLM rewrite because it lacks the ignore globs that `npm run lint` uses — worth its own WR/PR to align the two invocations.

**Date/Time:** 2026-08-05

**Task Attempted:** Owner-requested full-repo "developed but not wired in" sweep, flow by flow, re-running the repo's own 7-Gate Prosecution Audit (`skills/repo-audit/SKILL.md`) against live HEAD, with explicit web research and all sandbox tooling saved into the repo itself. Full audit output: `wr/pending/audit-2026-08-05/` (9 WRs), `wr/memory/audit-2026-08-05-tools.md`, `tools/sandbox-audit-2026-08-05/` (3 reusable scanner scripts + frozen evidence JSON).

**Outcome:** Success — two P0 fixes proven and landed on this branch with test evidence: (1) `security-fleet.js` (361 lines, built 2026-07-09) had zero workflow trigger and was missing its own charter-mandated test — added `.github/workflows/security-fleet.yml` + `tests/security-fleet.test.js` (12/12 passing); (2) `update-project-dashboard.yml`'s 4-hour cron has failed 100% of its last 100 runs for 15+ days because `git push` to `main` is rejected by the branch ruleset (`GH013`, ruleset id 17149543) — fixed via the repo's own existing `ADMIN_GITHUB_TOKEN` bypass-actor pattern plus a branch+PR fallback, and wired in `scripts/populate-state.js` (built with a CI-ready `--check` mode, never once invoked by any workflow) in the same step so `state.json` refreshes alongside its source data. Also fixed, while validating the above: `package.json` had a duplicate `"c8"` JSON key (added same-day, 2026-08-05 07:32) that silently reverted an intended version bump per JSON's last-key-wins semantics, plus a lockfile drift that was breaking `npm ci` outright.

**Root Cause of Failure (If any):** Same shape across all four fixed findings and most of the five documented-not-fixed findings (WR-05/06/07/09): code and docs were written describing a workflow/test/wiring step in the present tense, but the actual wiring step was never completed, and no CI gate exists to catch "doc/comment promises a file that doesn't exist on disk." The dashboard finding specifically supersedes `wr/pending/audit-2026-07-14/WR-A2-state-json-empty.md`'s diagnosis — the 2026-07-14 audit correctly saw the symptom (stale state) but, lacking GitHub Actions run-log access, mis-attributed it to "state engine not persisting" when the real cause was upstream: the branch ruleset silently rejecting the push every single run.

**Self-Healing Fix / Learned Lesson:** (1) **`gh run list --workflow=<file>.yml --limit 100` is the single highest-signal audit command available** — a `schedule:`-triggered workflow with a real cron and a real script can still be failing 100% of the time while looking perfectly wired from static YAML analysis alone; this class of bug is invisible without checking live run *conclusions*, not just trigger presence. (2) **A tool built with an explicit `--check`/`--strict` CI flag and zero `grep` hits in `.github/workflows/` is a strong, cheap signal of an unwired pipeline** — `populate-state.js` is exactly this shape. (3) **Duplicate JSON object keys are invisible to `JSON.parse`, to a skimming human, and to a diff review** — they parse clean and look present twice, but the last occurrence silently wins. Built `tools/sandbox-audit-2026-08-05/find-duplicate-json-keys.js` as both the detector and the proposed CI vaccine for this exact class of bug. (4) Cross-referencing a script/SKILL.md's own header-comment promises (named test files, named companion workflows) against what exists on disk mechanically finds the WR-01/06/07/09 pattern — codified as `tools/sandbox-audit-2026-08-05/find-unwired-promises.js`, which additionally surfaced 16 more not-yet-triaged hits (see WR-09) beyond what manual review alone found, including `deploy.yml` being expected by two unrelated scripts and existing in neither. (5) Re-confirmed the "audits decay" lesson from the 2026-07-14 entry above: WR-A1's undeclared-dependency finding was independently re-checked this session and confirmed to have been a false positive all along (regex over-match on comment text/scoped-package syntax), not something that got fixed since — worth distinguishing "resolved since" from "was never actually true" when re-verifying old findings.

**Next Action:** The recorded intent for that PR's fleet review was verification of the two proven fixes (WR-01, WR-02/03) and the two small dependency fixes (WR-04), rather than re-derivation. Three items need an owner/product decision before any agent writes code: WR-05 (`ship-to-market.yml`'s missing `record.js` — build it or comment out the video-deliverable step), WR-06/WR-07 (`label-inventory.js` / `validate_jsonl.py` — wire in or archive-with-attribution, never delete per standing owner preference). WR-08 flags that the WR-drafting pipeline itself — 35 fully-drafted WRs across two prior audits, never filed as GitHub issues — is the largest unwired-flow pattern in the repo by volume; needs an owner pass over `wr/pending/` to mark stale/superseded items before a bulk-filing workflow gets built. WR-09's 16 scanner hits are queued for the next audit to individually root-cause. Two proposed CI vaccines from this session (`find-duplicate-json-keys.js`-style package.json lint; "named test/workflow file must exist" check for `scripts/**` and `skills/**/SKILL.md`) are not yet wired into `scripts/automation-doctor.js` — good candidates for a fast follow-up WR once this PR lands.

**Date/Time:** 2026-08-08

**Task Attempted:** WR-16450 — add perm to revvel-standards (missing workflow `permissions:` blocks + permanent Acknowledgements for every WR type).

**Outcome:** Success — granted least-privilege `permissions:` on 8 bare workflows; fixed real write-scope gaps on `ship-to-market.yml` (`actions: write` for mobile dispatch) and `conflict-helper.yml` (`issues: write` for `gh issue edit`); made Acknowledgements permanent on heavy + OpenHands forms and BASIC/FULL markdown templates; fixed duplicate `steps:` key that made `apisec-scan.yml` invalid YAML; added regression tests + `docs/WORKFLOW_PERMISSIONS_STANDARD.md`.

**Root Cause of Failure (If any):** (1) Several workflows never declared `permissions:`, relying on the repo default token matrix — fine until a job needs a write scope and gets a silent 403. (2) OpenHands quick WR form and markdown WR templates omitted the Acknowledgements / continue-the-loop contract that the heavy form already had. (3) A REVVEL-DISABLED `apisec-scan.yml` stub accidentally kept two `steps:` keys, so `workflows:validate` reported 1 invalid.

**Self-Healing Fix / Learned Lesson:** (1) Every workflow file must declare `permissions:` — enforce with `tests/workflow-permissions.test.js`. (2) Job-level overrides that add a write scope must re-declare every other scope the job still needs (setting `permissions:` resets unlisted scopes to none). (3) Acknowledgements are permanent for every WR type — enforce with `tests/wr-acknowledgements-permanent.test.js` and keep portable copies under `templates/issue-template/` in sync. (4) Disabled stubs must still be valid single-`steps` YAML or automation-doctor fails the whole suite.

**Next Action:** Merge this PR; CI should stay green on `npm test` + `workflows:validate`. No secrets added.

---

**Date/Time:** 2026-08-08T20:30:00Z

**Task Attempted:** Take over Copilot's stranded recovery PRs #17091/#17097 (owner out of Copilot credits) and execute the owner's exit-quiet-mode decision, following RVS-AGENT-001 / RVS-PRESERVE-001.

**Outcome:** Success — quiet-mode exit executed the documented way (gate issue #17099 opened per `wr/specs/01-quiet-mode.md`; D017 recorded in DECISIONS.md + decisions.jsonl); #17091 brought into compliance: the 2026-07-25 quiet-mode owner directive comment Copilot deleted from `trusted-bot-auto-approve.yml` was restored and archived in place, the deleted agent-dispatcher case block was restored as a REVVEL-DISABLED block, the missing `wr:research-complete` routing branch (asserted by Copilot's own test but never implemented — test failed with indexOf -1) was actually added, and the zizmor template-injection error (label names interpolated via `${{ }}` inside `run:`) was fixed by routing values through `env:`.

**Root Cause of Failure (If any):** Two systemic causes behind the 2026-08-08 "repository paralysis" misdiagnosis: (1) the 2026-07-25 quiet-mode decision lived only in workflow comments and PR #16805's body — never in DECISIONS.md — so the Copilot recovery session, which diagnosed from labels and CI state, concluded "trusted-bot auto-approve broken" instead of "intentionally disabled" and deleted the directive to force it back on; (2) its "checkpoint gate unapproved (PR #15668) blocks everything" claim was false — #15668 merged 2026-07-11. Separately: `Create Neon Branch` fails with HTTP 422 on every PR (project branch quota exhausted by ~90 open PRs x 14-day preview branches), which is infrastructure, not PR content.

**Self-Healing Fix / Learned Lesson:** (1) **Operating-mode decisions must land in DECISIONS.md at decision time** — a directive that exists only as a workflow comment is invisible to agents that triage from labels/CI, and the next agent will read it as a bug. (2) **A test asserting a behavior is not the behavior** — Copilot's routing test asserted `wr:research-complete` handling that its own diff never added; always run the test file you ship against the branch you ship it on. (3) zizmor template-injection on `${{ }}`-in-`run:` is fixed by `env:` indirection, not by suppression. (4) Per-PR Neon preview branches with 14-day expiry + a stuck 90-PR backlog = quota exhaustion; preview-infra capacity must be sized against open-PR count, or stuck PRs must be closed promptly.

**Next Action:** (Historical state snapshot, recorded 2026-08-08.) PR #17091 is the ordering dependency for PR #17097, whose review findings at the time of writing were: byte-compare `cmp` of regenerated lockfiles false-fails across npm versions, and temp-dir regeneration cannot resolve `file:` dependencies. `Create Neon Branch` remains red everywhere until the Neon project's branch quota is cleared from the Neon console (or a scheduled cleanup lands). A backlog of `awaiting-approval` PRs exists that only becomes mergeable through the repo's normal review process once auto-approve triggers are active again.

---

## Training-Module Format — new entries as of 2026-08-10

Effective 2026-08-10, new lessons in this file follow the **Training Module** format below.
The older narrative entries above stay as-is per RVS-PRESERVE-001 (COMMENT-DONT-DELETE);
they are still valid learnings, just in a different shape. Future auditors: prefer the
new format for anything appended after this line so scripts can consume the file.

**Format:**

```text
### TM-<NNNN> — <One-line pattern name>

**Discovered:** YYYY-MM-DD  **Discovered-by:** <agent> during <task>  **PR/issue:** #NNNN
**Category:** [measurement | wiring-drift | scope | detector-tuning | secret-hygiene | app-vs-workflow | credit-blackout | ...]

**Symptom:** What was observed on the surface.

**Root cause:** What was actually broken underneath.

**Detection heuristic:** How to notice this pattern in the wild — a grep, a script,
a behavior. If a script already exists to detect it, link it. If not, describe what a
detector would look like.

**Autofix pattern:** The minimal correct fix, as a code/config diff sketch. Not
prose — actual before/after where possible.

**Prevention rule:** The standing rule (from a standard, workflow, or test) that
prevents recurrence. If none exists yet, propose one.

**Related:** Links to related TMs, DECISIONS.md rows, standards, PRs.
```text

---

### TM-0001 — GitHub App vs. workflow-based integration confusion

**Discovered:** 2026-08-09  **Discovered-by:** openhands during Bito/Recurse D006/D007 audit  **PR/issue:** context for PR #17150 and future revive PRs
**Category:** measurement, app-vs-workflow

**Symptom:** A review-tool "workflow" is silent for 30+ days, so an agent concludes
the tool is broken or providing no value, and files a decision to "cut" it.
Meanwhile the tool's actual output — GitHub App bot comments — is either happening
(app healthy, workflow orphan) or NOT happening (app scope wrong, unrelated to
workflow), and nobody checked.

**Root cause:** Confusing two independent integration surfaces:
1. **Workflow-based integration** — a `.yml` file in `.github/workflows/` that
   calls the tool's REST API using a `secrets.TOOL_API_KEY`
2. **GitHub App integration** — a Marketplace-installed App that authenticates
   with its own installation token and posts as `tool-name[bot]`

Bito and RecurseML are Apps, not workflow tools. The workflow attempts existed but
never worked (wrong auth model). The Apps may or may not have been active — that
had to be verified by looking at bot-comment authorship, which nobody did.

**Detection heuristic:**
```text
python3 .sandbox/openhands/scripts/count-reviewer-bot-comments.py \
  midnghtsapphire revvel-standards --prs 30
```text
If a tool listed in `data/subscriptions.yml` as `type: github_app` shows 0
bot activity in the last 30 PRs, the App is either not scoped to this repo
or its billing has lapsed. Fix in the App-installation UI, NOT the workflow.

**Autofix pattern:**
- Archive the workflow-based `.github/workflows/<tool>.yml` in place per
  RVS-PRESERVE-001 with a header saying "Integration is a GitHub App, not
  a CI job. Configure at: `https://github.com/apps/<tool>`"
- Delete the `<TOOL>_API_KEY` secret (it was orphan by definition)
- Add the tool to `data/subscriptions.yml` with `type: github_app` and its
  dashboard URL
- Verify the App has repo access; push a test commit; check for a `[bot]`
  comment; renew billing if applicable

**Prevention rule:** Before writing any code to "revive" or "cut" a review tool,
run `count-reviewer-bot-comments.py` first. If the tool is an App, workflow
output is not the ground truth. Codified in
`standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md` (rule against cost-based
cuts without ground-truth measurement).

**Related:** DECISIONS.md D006/D007 (the misdiagnosis), D020 (subscription
tracker as the fix for this class), TM-0004 below (credit-blackout false claims).

---

### TM-0002 — Header/body mismatch: comment describes behavior code does not implement

**Discovered:** 2026-08-09  **Discovered-by:** openhands during subscription-tracker audit  **PR/issue:** #17150
**Category:** wiring-drift

**Symptom:** A workflow, script, or config file has a header comment that
confidently describes cron/trigger/behavior, but the code below implements only
partial or none of it. The file looks wired from static reading of the header.
It is not.

**Root cause:** Someone wrote the header comment describing the *intended*
behavior, then never came back to wire it up. No test caught the mismatch
because there was no cron for the test suite to verify the presence of.

**Detection heuristic:** Grep workflow headers for cron-describing words and
diff against the actual `on:` block. A future workflow
(`workflow-header-body-consistency.yml`, not yet built) should run weekly and
open a Triage WR per file whose header describes a `schedule:` / `push:` /
`pull_request:` trigger that the `on:` block does not implement.

**Autofix pattern:**
```text
 on:
+  schedule:
+    - cron: '0 14 * * MON'
+  pull_request:
+    paths: [data/subscriptions.yml, scripts/subscription-tracker.js]
   workflow_dispatch:
```text
Plus a note in the file: "Restored YYYY-MM-DD (D0NN) — header always claimed cron; schedule was never wired."

**Prevention rule:** New workflow files that describe scheduled behavior in
their header must have that schedule wired in the same PR that adds the file.
The prevention detector (see Detection heuristic) files a Triage WR for any
mismatch found later.

**Related:** DECISIONS.md D020 (this specific case), D017/D018 (quiet-mode
cron drift is the same pattern at scale), `standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md`.

---

### TM-0003 — Orphaned Actions secret pattern

**Discovered:** 2026-08-09  **Discovered-by:** openhands during 99-secrets-at-100-cap audit  **PR/issue:** future secret cleanup PR
**Category:** secret-hygiene, wiring-drift

**Symptom:** GitHub Actions secrets slowly accumulate to the 100-secret cap.
When at cap, adding a new secret requires deleting another, which risks
breaking active workflows.

**Root cause:** An agent adds a secret for an integration it plans to build,
then never writes the workflow that uses it. Or two agents pick different
casings of the same integration (`GH_TOKEN` vs `ADMIN_GITHUB_TOKEN`) so
you end up with 3 secrets doing the job of 1. Nothing scans for orphans.

**Detection heuristic:**
```text
python3 .sandbox/openhands/scripts/audit-secrets.py
```text
Zero-ref secrets have not been used in any file in the repo. Delete-safe
unless they're for products not yet shipped (Stripe/RevenueCat) — those
are "kept for imminent use" and belong in a doc, not the delete pile.

**Autofix pattern:**
1. Run the audit
2. For each zero-ref secret, decide: delete OR document why it's kept
3. Delete via `gh api -X DELETE /repos/OWNER/REPO/actions/secrets/NAME`
4. Add remaining "keep for imminent use" entries to `docs/SECRETS_MAP.md`
   with the target workflow / integration date

**Prevention rule:** `.github/workflows/secret-usage-audit.yml` (not yet
built) should run monthly and file a Triage WR listing every secret with
zero references and >30 days since last workflow use. Any secret added
without a corresponding workflow in the same PR should also fail the
`anti-scaffolding-enforcer.yml` check.

**Related:** TM-0001 (orphan secrets often come from app-vs-workflow
confusion), `AGENTS.md` skills-vault entry `skills/vault-agent`.

---

### TM-0004 — Credit-blackout false "complete" claims

**Discovered:** 2026-08-10  **Discovered-by:** openhands verifying Copilot's ChaosMender fix on PR #17147
**Category:** credit-blackout, measurement

**Symptom:** An agent posts a "Completed ✅ all validation green" summary
listing specific verification results (`X tests pass, Y linter clean, Z
scanner reports 0 findings`). Some of those results are stale from an
earlier iteration; the final commit(s) were never re-verified before
the credit/timeout blackout cut the session short.

**Root cause:** Verification steps are done sequentially, and the last
one to run before the summary is the one that "counts" — but if the
agent hit a rate limit or timeout between the last commit and the
verification, the summary reflects intent, not result.

**Detection heuristic:** If the agent's session ended with a timeout /
credit-limit error, do NOT trust the "verified" section of the summary.
Re-run the specific verifications the summary claims.

**Autofix pattern:** As the reviewer:
```text
git checkout <agent's-branch>
npm test
node scripts/chaosmender.js --changed-only
```text
If findings appear that the agent claimed were fixed, either:
- Widen the detector so it recognizes the fix (this session, D021), OR
- Revert the offending commit and re-do the fix in a way that satisfies the detector

**Prevention rule:** Agent summary sections must distinguish "verified"
(actually re-ran after last commit) from "expected" (haven't re-run since
last commit). The wrap-up template (in `wr/templates/work/visiting-agent.md`
future update) will force this distinction. Additionally, session logs in
`.sandbox/<agent>/sessions/` MUST log every verification command as it
runs, so a reviewer can see which verifications happened after the last
commit and which are stale.

**Related:** DECISIONS.md D021 (the specific chaosmender-window widening),
`standards/VISITING_AGENT_SANDBOX_STANDARD.md` (sandbox usage rule that
would have surfaced this), TM-0001 (measurement errors more broadly).

---

### TM-0005 — Label allowlist blocks its own recovery labels

**Discovered:** 2026-08-09  **Discovered-by:** openhands + Copilot recovery session  **PR/issue:** #17091 (ready-to-merge), #17097 (has-conflicts), #17150 (review:stuck)
**Category:** detector-tuning, wiring-drift

**Symptom:** Governance-gates workflow fails with `UNKNOWN labels: <label>`
even though `<label>` is a valid state applied by a real workflow. Every PR
that has ever hit that workflow's state fails governance on its own state.

**Root cause:** Workflows (`recovery-engine.yml`, `pr-lifecycle.yml`,
`stuck-label-watchdog.yml`, etc.) apply state labels programmatically, but
those labels were never added to `config/labels-allowlist.yml`. When the
`label-allowlist` workflow runs on a PR carrying such a label, it fails
governance-gates on a label the fleet itself applied.

**Detection heuristic:** For every label named as `ensureLabel` /
`addLabels` target in any workflow, verify it exists in the allowlist.

**Autofix pattern:** Add every workflow-applied label to
`config/labels-allowlist.yml` with a comment naming the workflow that
applies it AND the historical PR that flushed out the omission:
```text
  # <label> applied by <workflow>.yml when <condition>. Was applied by
  # that workflow but missing here, so any PR the workflow tagged failed
  # governance on its own annotation label (PR #<historical>).
  - name: "<label>"
```text

**Prevention rule:** A workflow adding a label MUST also PR-add that
label to the allowlist. `anti-scaffolding-enforcer.yml` should be
extended to detect `ensureLabel(...)` / `addLabels(...)` calls whose
target names are not in the allowlist and fail the PR check.

**Related:** DECISIONS.md D020 (adds `review:stuck`), historical PRs
\#17091 / #17097 (same class of bug), TM-0002 (both are wiring-drift
patterns).

---

## TM-0006 — Detector lookahead window too tight for well-formatted code

**Discovered:** 2026-08-10  **Discovered-by:** openhands during Copilot fix verification  **PR/issue:** #17147, D021
**Category:** detector-tuning

**Symptom:** A static-analysis detector (chaosmender `LABEL-RACE-001`)
flags code that is actually correctly guarded, because the guard is
formatted across more lines than the detector's lookahead window covers.

**Root cause:** The detector's `.catch` lookahead was 5 lines from a
`removeLabel` call. Correct code like a multi-line args object plus
`.then(log).catch(404-swallow)` puts `.catch` on line 4+ from the call
opening — outside the window. The detector was correct in principle
(catch handlers should be near the call) but wrong in practice
(well-formatted multi-line code is common and legitimate).

**Detection heuristic:** Whenever a "fix" of a scanner finding leaves
the scanner still flagging, check whether the fix is real (runtime
behavior correct) but formatted-too-spread-out for the scanner window.
This is the classic "code correct, detector wrong" pattern.

**Autofix pattern (for the detector, not the code):**
```text
- const windowEnd = Math.min(i + 6, lines.length);   // was 5 lines
+ const LABEL_RACE_LOOKAHEAD_LINES = 15;
+ const windowEnd = Math.min(i + 1 + LABEL_RACE_LOOKAHEAD_LINES, lines.length);
```text
Plus regression tests: one for the pattern that was being false-positive'd,
and one boundary test proving a truly-distant `.catch` still triggers.

**Prevention rule:** New scanner windows should be sized to accommodate
the most common well-formatted representation of the pattern being
detected, then + 3-5 lines slack. Tests for the scanner should cover
both the tight and the well-formatted cases.

**Related:** DECISIONS.md D021, `scripts/chaosmender.js` (the widened
detector), `tests/chaosmender.test.js` (the regression tests).

---
**Next Action:** Fleet review focus for this PR should be *checking the two proven fixes* (WR-01, WR-02/03) and the two small dependency fixes (WR-04), not re-deriving them. Three items need an owner/product decision before any agent writes code: WR-05 (`ship-to-market.yml`'s missing `record.js` — build it or comment out the video-deliverable step), WR-06/WR-07 (`label-inventory.js` / `validate_jsonl.py` — wire in or archive-with-attribution, never delete per standing owner preference). WR-08 flags that the WR-drafting pipeline itself — 35 fully-drafted WRs across two prior audits, never filed as GitHub issues — is the largest unwired-flow pattern in the repo by volume; needs an owner pass over `wr/pending/` to mark stale/superseded items before a bulk-filing workflow gets built. WR-09's 16 scanner hits are queued for the next audit to individually root-cause. Two proposed CI vaccines from this session (`find-duplicate-json-keys.js`-style package.json lint; "named test/workflow file must exist" check for `scripts/**` and `skills/**/SKILL.md`) are not yet wired into `scripts/automation-doctor.js` — good candidates for a fast follow-up WR once this PR lands.

**Date/Time:** 2026-08-08

**Task Attempted:** /dragnet fix for CircleCI job 11069 (pipeline 6527, pr-workflow / lint-and-test) on branch `caspian-sdk-research-13465726706883090787` — issue #16904.

**Outcome:** Root-caused and vaccinated. Live `package.json`/`package-lock.json` on main were already re-synced (c8@12.0.0); shipped a permanent pre-install gate so the failure mode cannot recur silently.

**Root Cause of Failure (If any):** `npm ci` EUSAGE at CircleCI step "Installing NPM packages": lock file's c8@12.0.0 did not satisfy package.json's c8@10.1.3. Upstream shape (WR-04): `package.json` had **duplicate** `"c8"` keys (`^12.0.0` then stale `^10.1.3`). JSON last-key-wins silently kept 10.1.3 while the lockfile resolved 12.0.0. `JSON.parse` and human skim both miss this.

**Self-Healing Fix / Learned Lesson:** (1) Added `scripts/check-package-integrity.js` — zero-dep duplicate-key scanner + `npm ci --dry-run` lock sync check; exits non-zero on either failure. (2) Wired it as the first run step in `.circleci/config.yml` `lint-and-test` **before** `node/install-packages`, so the next desync fails with a readable message instead of the orb's opaque install failure. (3) Regression tests in `tests/package-integrity.test.js` pin the exact c8 duplicate-key fixture from job 11069 and a lockfile-desync fixture. (4) `npm run package:check` for local/agent use. Vaccine pattern: when CI dies inside a third-party install step, add a pre-flight check that names the postcondition (`package.json` unique keys + lock in sync) rather than only re-running the install.

**Next Action:** None for 11069 specifically (PR #16899 already merged; main lock is green). Keep `npm run package:check` / the CircleCI pre-step green on every PR that touches `package.json` or the lockfile.
**Date/Time:** 2026-08-08T03:59:00Z

**Task Attempted:** Resolve formal `structural_conflict` on Dependabot PR #16791 / issue #16950 (npm_and_yarn group bump across 10 directories).

**Outcome:** Success on fix branch — path A `split-deps-per-directory` codified in `.github/dependabot.yml`, vaccine `scripts/check-dependabot-split-deps.js` + `tests/dependabot-split-deps.test.js`, formal re-run `pass` artifact, scorecard JSONL event. PR #16791 stays closed/unmerged. Human merge gate still required.

**Root Cause of Failure (If any):** Path B used a shared multi-directory Dependabot group (`npm_and_yarn`) so one PR mutated 10 package roots at once. Formal XOR flagged structural disagreement vs per-directory isolation (winner path A score 10000 vs B 8800).

**Self-Healing Fix / Learned Lesson:** (1) Never use `directories:` (plural) or reuse group names across npm roots — group only *inside* one `directory:`. (2) Forbidden group names: `npm_and_yarn` / `npm-and-yarn`. (3) Ship the checker + test with the policy so the anti-pattern cannot return silently. (4) Acceptance for formal auto-WRs needs both a re-run report artifact *and* a scorecard event line, not just a config tweak.

**Next Action:** Human (`midnghtsapphire`) reviews/merges the fix PR; do not reopen #16791. Optionally wire `node scripts/check-dependabot-split-deps.js` into `automation-doctor` / CI later.
**Next Action:** Fleet review focus for this PR should be *checking the two proven fixes* (WR-01, WR-02/03) and the two small dependency fixes (WR-04), not re-deriving them. Three items need an owner/product decision before any agent writes code: WR-05 (`ship-to-market.yml`'s missing `record.js` — build it or comment out the video-deliverable step), WR-06/WR-07 (`label-inventory.js` / `validate_jsonl.py` — wire in or archive-with-attribution, never delete per standing owner preference). WR-08 flags that the WR-drafting pipeline itself — 35 fully-drafted WRs across two prior audits, never filed as GitHub issues — is the largest unwired-flow pattern in the repo by volume; needs an owner pass over `wr/pending/` to mark stale/superseded items before a bulk-filing workflow gets built. WR-09's 16 scanner hits are queued for the next audit to individually root-cause. Two proposed CI vaccines from this session (`find-duplicate-json-keys.js`-style package.json lint; "named test/workflow file must exist" check for `scripts/**` and `skills/**/SKILL.md`) are not yet wired into `scripts/automation-doctor.js` — good candidates for a fast follow-up WR once this PR lands.

**Date/Time:** 2026-08-21

**Task Attempted:** Stop the GitHub Actions spend. Owner reported a $600 GitHub
bill and unexplained OpenRouter burn on a repository with no product traffic,
and asked to kill the cron jobs.

**Outcome:** All 46 scheduled workflows de-scheduled — 496 runs/day (~14,900/month)
to 0. Schedules are commented out in place, not deleted (RVS-AGENT-001); every
affected workflow keeps `workflow_dispatch`, so nothing lost the ability to run,
only the ability to run itself. 1291/1291 tests pass, 227 workflows valid.

**Root Cause of Failure (If any):** No single workflow looked expensive. The cost
was the sum, and nothing in the repo ever computed that sum. Four schedules alone
were 336 runs/day (`agent-monitor` and `wr-field-filler` at `*/15`, `fleet-controller`
at `7,22,37,52`, `api-monitor` at `*/30`), and each was individually defensible in
its own PR. Worse, four existing tests asserted that a schedule *must exist* —
`daily-diagnostic-audit`, `octopus-review-fallback`, `wr-field-filler-workflow`,
`green-website-standard` — so the ratchet only ever turned one way: adding a cron
was routine, removing one broke the build. The repo had a guard for the wrong
direction.

**Self-Healing Fix / Learned Lesson:** (1) `tests/no-scheduled-workflows.test.js`
parses every live workflow, expands each cron expression to a runs/day figure,
and fails on any active schedule not in a name-pinned `ALLOWED_SCHEDULED` list
(currently empty) or over a `MAX_SCHEDULED_RUNS_PER_DAY` ceiling of 0. A third
test asserts every de-scheduled workflow still exposes `workflow_dispatch`, so
the freeze cannot strand a workflow with no way to run at all. Mutation-tested:
re-adding one `*/15` cron fails two of the three tests with the run rate named in
the message; stripping a `workflow_dispatch` fails the third. (2) The four tests
that pinned "schedule must exist" were inverted to pin the freeze instead, each
with the reason inline — a decision that changed needs its guard changed, not
deleted. (3) `templates/cicd/` is explicitly exempt: those files are copied into
other repos and are not billed here. **Lesson: a recurring cost needs a control
that sums it.** Per-workflow review can approve 46 individually reasonable
schedules into a four-figure bill, because no reviewer is holding the total. The
guard has to assert the aggregate, in the unit that gets billed.

**Next Action:** Scheduled runs are the fixed cost and are now zero, but the
variable cost is untouched: 72 workflows fire on `pull_request`, 40 on `push`,
42 on `issues`, 10 on `issue_comment`. A single PR still fans out to ~70 runs,
and bot comment storms multiply it. That needs the same treatment — an aggregate
budget with a guard — and is the next lever, not a follow-up note. Separately,
`scripts/wr_rewrite.py` already implements the LM Studio -> Ollama -> OpenRouter
cascade from `wr/agents/HIERARCHY.md`, but only `wr-rewrite.yml` uses it, and
that workflow is `runs-on: self-hosted` pointing at `127.0.0.1:1234`; its four
runs all failed. GitHub-hosted runners cannot reach a laptop, so Layer 0 only
pays off for work run locally, not in CI.

**Date/Time:** 2026-08-21

**Task Attempted:** Finish the LM Studio (Layer 0) work. `wr/agents/HIERARCHY.md`
targets 60–70% of work on local LLMs and says the router should "default to
Layer 0"; the owner runs LM Studio on a Windows Lenovo laptop and wanted the
existing implementation completed rather than rebuilt.

**Outcome:** The cascade is now shared rather than trapped. `scripts/local_llm.py`
holds the LM Studio → Ollama → OpenRouter chain, `scripts/wr_rewrite.py`
delegates to it instead of carrying a private copy, and `docs/LOCAL_LLM_SETUP.md`
covers the Windows-specific setup. 1300/1300 tests, 227 workflows valid,
chaosmender exit 0.

**Root Cause of Failure (If any):** Three separate things, only one of which was
the code. (1) The cascade existed but lived *inside* `wr_rewrite.py`, so it was
reachable from exactly one workflow and every other caller in the repo went
straight to OpenRouter — the code was written, it just was not shared. (2) That
one workflow is `runs-on: self-hosted` pointing at `127.0.0.1:1234`, and all four
of its recorded runs failed in ~23s because no self-hosted runner existed; a
GitHub-hosted runner cannot reach a laptop, so Layer 0 had never completed a
single run. (3) A real bug found while testing: `urllib` honours
`http_proxy`/`https_proxy` for *every* request including ones to `127.0.0.1`, so
on any machine behind a corporate proxy or VPN — which a work laptop usually is —
the call to LM Studio gets routed to the proxy, fails, and Layer 0 looks broken
for a reason unrelated to LM Studio.

**Self-Healing Fix / Learned Lesson:** (1) The cloud lane is now **opt-in, not
fallback**: `call_openrouter` refuses unless `REVVEL_LLM_ALLOW_CLOUD` is exactly
`"1"`, so "the laptop was asleep" produces a loud error naming the gate instead
of a silent charge. The two workflows that genuinely need cloud judging opt in
explicitly, in the workflow file, with a comment saying why. (2) Local lanes get
an opener with `ProxyHandler({})` so loopback never goes through a proxy.
(3) `tests/local-llm-cascade.test.js` exercises the cascade against stub HTTP
servers rather than mocking it, and asserts a workflow that sets a loopback
`LMSTUDIO_ENDPOINT` stays on a self-hosted runner — because the tempting fix for
that red workflow is `ubuntu-latest`, which makes it green *and* 100% billed.
Five mutations were applied and reverted: gate forced open, cascade reordered to
try cloud first, proxy bypass removed, refusal made to print output anyway, and
the runner switched to `ubuntu-latest`. Each was caught. **Lesson: shared code is
not shared until something other than its original caller uses it.** The cascade
had been "done" for weeks by the only measure anyone checked — it existed and it
was correct — while delivering none of its value, because it had one consumer and
no seam.

**Second lesson, procedural:** while mutation-testing, a `cp` from a scratch
backup failed silently and left the workflow mutated to `ubuntu-latest`. This is
the same class of mistake as the earlier reverted-timeouts incident: **a file
copy silently wins where a merge would conflict.** The catch was `git diff
origin/main -- <file>` before committing, which showed the intended change only.
Verify a restore by diffing against the base, never by trusting the copy.

**Next Action:** Layer 0 pays off only for work that runs on the owner's machine.
CI cannot reach it, so the remaining OpenRouter spend is the per-PR reviewer
fleet (#17850) — ~13 bots, several routed through `scripts/openrouter-personas.js`,
currently failing free only because the account sits at 402. Topping up credits
re-arms that burn. The gate implemented here is the mechanism that fix should
reuse: refuse the paid call unless a budget signal is explicitly set.

**Date/Time:** 2026-08-21

**Task Attempted:** Close the three open cost/correctness issues in one sitting —
#17854 (workflows advertising cadences they never had), #17855 (cost index drift),
#17850 (the per-PR reviewer fan-out that re-arms the moment credits are topped up).

**Outcome:** Three PRs, one fix each. #17856 and #17857 merged. The spend gate is
the third. 1310/1310 tests, 227 workflows valid, chaosmender exit 0.

**Root Cause of Failure (If any):** All three are the same shape — a claim with
no consumer — but the *mechanisms* differed, and getting each one right required
checking rather than pattern-matching:

1. **Never true.** `openrouter-assignee.yml` advertised an "hourly cron sweep" and
   has never had a `schedule:`. `fork-audit-bot.yml` told users a failed
   assignment would be retried by that same sweep.
2. **Falsified by an edit elsewhere.** The cron freeze made `security-fleet`'s
   "weekly sweep" and `watchtower`'s cadence false without touching those files.
3. **Falsified by a reversal that never propagated.** D007 cut RecurseML; D014
   reversed D007 on 2026-08-19; `TOOL_COST_INDEX.md` still cited D007. The
   decision log was *right the whole time* — the failure was one-way propagation.
4. **Masked, not absent.** The reviewer fan-out costs nothing today only because
   OpenRouter returns 402. The 402 is an outage that looks like a control.

**Self-Healing Fix / Learned Lesson:** (1) `scripts/llm-spend-gate.js` mirrors
`local_llm.py`'s gate on the JS side, same `REVVEL_LLM_ALLOW_CLOUD` variable, and
is wired into all eleven JS and both Python scripts that POST to a provider.
(2) `tests/llm-spend-gate-coverage.test.js` **discovers** call sites by scanning
for the POST rather than trusting a list, so a new ungated script fails the build.
The fifteen workflows that still `curl` inline are named individually in a
shrink-only ratchet — naming the gap beats implying coverage I do not have.
(3) `tests/no-false-cadence-claims.test.js` and
`tests/tool-cost-index-matches-decisions.test.js` cover mechanisms 1–3.

**Two lessons worth keeping:**

- **Check the claim before writing the guard.** I filed #17855 saying the index
  drifted because "nothing reconciles the table against the workflows." Reading
  `DECISIONS.md` showed that was wrong: D014 records the reversal in plain terms
  and `recurse-ml.yml`'s header explains it in detail. The real failure was
  narrower — a reversal recorded in one place and never propagated — and it
  produced a *better* guard (parse `REVERSE D0NN`, fail on a stale citation) than
  the vague one my issue implied. Same for Bito, which I had listed as drift in
  the issue and which turned out to be correctly cut. **An issue is a hypothesis;
  verify it before the fix hardens the wrong thing into a test.**
- **Guard the guard.** Rewording `REVERSE D007` to `UNDO D007` in DECISIONS.md
  would leave the reversal check parsing nothing and passing forever — a check
  that always passes is indistinguishable from one that works. Asserting the
  parser still finds the specific reversal it was written for is what keeps it
  honest. The same applies to the cadence scanner (a JS `//` comment must not
  trip it) and the coverage ratchet (an entry that no longer needs the exception
  must be flagged for removal).

**Next Action:** The fifteen inline workflow curls are the remaining gap and are
named in `UNGATED_WORKFLOW_CURLS`. Owner-only and still open: the GitHub billing
breakdown (this repo is public with standard runners, so its Actions are free and
the reported charge is not from here), the Actions spending limit, and the Vercel
account block (#17831). **Do not top up OpenRouter credits until the fifteen are
gated** — that is precisely the burn the 402 is currently hiding.

**Date/Time:** 2026-08-21

**Task Attempted:** Verify my own claim. After merging #17859 I told the owner
"nothing can spend without you saying so." A merge-tail notification showed
`ai-pr-reviewer` still calling OpenRouter, so I checked instead of assuming the
comment was stale.

**Outcome:** The claim was wrong. **Seven** workflows hand a paid LLM credential
to a *third-party action* that makes the call inside its own code —
`maxlim0/AI-PR-Reviewer`, `maxlim0/actions-progci-fail`,
`fridzema/ai-weekly-changelog-action`, `sipyourdrink-ltd/bernstein`,
`koki-develop/claude-renovate-review`, `omnedia/panda-ops`, and
`tarmojussila/xai-code-review`. All now gated; the guard extended to see them.
1312/1312, 227 workflows valid, chaosmender exit 0.

**Root Cause of Failure (If any):** `tests/llm-spend-gate-coverage.test.js`
scanned for `openrouter.ai/api`. **No provider URL appears in any of those seven
files.** The URL lives inside the action's own source, which this repo does not
contain — so the scan reported full coverage over a set it could not observe,
and I repeated that number to the owner as if it were a measurement.

**Self-Healing Fix / Learned Lesson:** The new detector asserts on the thing that
actually predicts spend — **a paid credential crossing into code we do not
control** — rather than on a symptom of it. First draft over-fired on four
workflows; checking each showed one true positive (`xai-code-review`, job-level
`XAI_API_KEY` consumed by the action) and three false ones: `agent-fallback` and
`openrouter-coder` shell out to scripts already gated in #17858, and
`ship-to-market`'s third-party actions are Docker and gh-pages, which do not
consume the key. Rather than loosen the check, it now recognises invocation of a
gated script as coverage and carries a small `NON_LLM_ACTIONS` allowlist where
each entry is there because it was checked.

**The lesson, and it generalises well past this repo: a guard that greps for a
symptom misses every path that reaches the same outcome another way.** The URL
was a proxy for "this bills." It was a good proxy for thirteen call sites and a
useless one for seven, and nothing distinguished the two cases from inside the
check. When a guard's predicate is a proxy, name what it cannot see — the earlier
version implied completeness it never had.

**Second lesson: a claim to the user is a postcondition too (RVS-VERIFY-001).**
"Nothing can spend" was a marker with no producer. What made it checkable was one
contradicting observation — a bot still calling out — and taking it seriously
instead of explaining it away as a pre-merge artifact.

**Next Action:** Five of the seven third-party actions are pinned to floating
tags (`@v0.3`, `@v1`, `@v1.3.1`, `@v2.7.0`, `@0.1.3`) rather than a commit SHA,
against CLAUDE.md gotcha #8. Not fixed here — separate change, and pinning an
action whose upstream may have moved needs the owner's call on which revision to
freeze.

**Date/Time:** 2026-08-21

**Task Attempted:** Wire LM Studio 0.4.0's native `/api/v1` surface — token auth
and model loading — into `scripts/local_llm.py`, and document Layer 0 properly
for visiting agents.

**Outcome:** `LMSTUDIO_API_KEY` support, a `load` subcommand, `doctor --load`,
and a Layer 0 section in `AGENTS.md` where a visiting agent actually looks.
1320/1320 tests, 227 workflows valid, chaosmender exit 0.

**Root Cause of Failure (If any):** No outage — this closed two latent traps.
The client sent no auth header at all, so a secured LM Studio would have
answered 401 and the client would have reported it as *unreachable*. And the
most common Layer 0 failure in practice is not "the server is down" but "the
wrong model is loaded", which previously required the UI to fix.

**Self-Healing Fix / Learned Lesson:** Two things worth carrying forward, both
found by a test rather than by reading the code:

1. **A test that asserts on the *message* caught a hole the behaviour tests
   could not.** The 401 case failed on the first run — not because the handler
   was wrong, but because `lmstudio_models()` swallowed every exception and
   returned `[]`, so the 401 never reached the handler at all. The probe could
   not distinguish "unreachable" from "unauthorized", which is exactly the
   confusion the work existed to prevent. Asserting *"the error must name
   `LMSTUDIO_API_KEY`"* found that; asserting "it fails" would not have.

2. **Then the fix broke failover, and that was also caught.** Adding
   `strict=True` re-raised the raw `URLError`, which escaped the caller's
   `except LaneUnavailable` and took the whole cascade down instead of moving
   to Ollama. Strict has to mean *explain it*, not *crash*. Three previously
   passing tests went red and named the regression immediately.

**Also recorded for visiting agents (AGENTS.md, new Layer 0 section):** the two
API surfaces (`/v1` for inference, `/api/v1` for management, derived from each
other so they cannot drift); embedding models are not chat models; `urllib`
routes `127.0.0.1` through `http_proxy`; a GitHub-hosted runner cannot reach a
laptop, so every CI LLM call is a billed call.

**Next Action:** None outstanding for Layer 0. Owner-only and still open: the
GitHub billing breakdown (this repo is public with standard runners — its
Actions are free, so the reported charge is not from here), the Actions spending
limit, and the Vercel account block (#17831). Five third-party review actions
remain pinned to floating tags rather than SHAs, against gotcha #8 — filed, not
fixed, because choosing a revision to freeze is an owner call.
