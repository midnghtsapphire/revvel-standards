# Learnings Log

> **Usage note:** Writes must be append-only. Never rewrite or delete prior
> entries. Each new lesson goes at the bottom, using the template below.
# Learnings

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
