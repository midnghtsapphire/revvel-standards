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

**Next Action:** Fleet review focus for this PR should be *checking the two proven fixes* (WR-01, WR-02/03) and the two small dependency fixes (WR-04), not re-deriving them. Three items need an owner/product decision before any agent writes code: WR-05 (`ship-to-market.yml`'s missing `record.js` — build it or comment out the video-deliverable step), WR-06/WR-07 (`label-inventory.js` / `validate_jsonl.py` — wire in or archive-with-attribution, never delete per standing owner preference). WR-08 flags that the WR-drafting pipeline itself — 35 fully-drafted WRs across two prior audits, never filed as GitHub issues — is the largest unwired-flow pattern in the repo by volume; needs an owner pass over `wr/pending/` to mark stale/superseded items before a bulk-filing workflow gets built. WR-09's 16 scanner hits are queued for the next audit to individually root-cause. Two proposed CI vaccines from this session (`find-duplicate-json-keys.js`-style package.json lint; "named test/workflow file must exist" check for `scripts/**` and `skills/**/SKILL.md`) are not yet wired into `scripts/automation-doctor.js` — good candidates for a fast follow-up WR once this PR lands.
