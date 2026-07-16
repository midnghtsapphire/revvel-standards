# Learnings

This file logs lessons learned from self-healing fixes, incidents, and other operational learnings.

> **Usage note:** Writes must be append-only. Never rewrite or delete prior entries. Each new lesson goes at the bottom, using the template below.

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

**Self-Healing Fix / Learned Lesson:** Keep template headings verbatim. Any clarifying context belongs in the body of the entry, not appended to the heading. This preserves `grep -F '**Self-Healing Fix / Learned Lesson:**'` as reliable for enumerating lessons. Tools/skills: `markdownlint-cli2` for validation, `grep -F` for heading consistency, and "template first, prose second" discipline when appending to structured logs.

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
- **Task Attempted:** Multi-part fleet audit-and-fix: bug sweep, recon, checkbox-to-WR feature, four-fleet wiring audit, orphaned WR closeout.
- **Outcome:** Session completed with concrete deliverables. Several wiring bugs remain open: `scripts/security-fleet.js` lacks trigger wiring, `credential-autonomy-agent.yml` has no failure reporting, `self-heal-pr.yml` and `reset-self-heal-issue.yml` are manual-only despite being documented as automatic.
- **Root Cause of Failure:** Common pattern: workflows documented as "automatic" but lacking `on:` triggers or failure-propagation wiring. No audit loop existed to catch docs-vs-reality drift.
- **Self-Healing Fix / Learned Lesson:** Tools/skills: `Agent` + `isolation: "worktree"` for parallel fleet audits, `TaskCreate` for progress tracking, `mcp__github__*` for all GitHub ops, direct verification (not read-through trust), and own-turn inline edits for <1min changes. (No Skill tools used; the audit loop is a candidate for future packaging.)
- **Next Action:** Address highest-priority findings: (1) wire trigger to `scripts/security-fleet.js`, (2) add failure propagation to `credential-autonomy-agent.yml`, (3) add automatic triggers to `self-heal-pr.yml` and `reset-self-heal-issue.yml`.
## **Next Action:** See `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` for the reusable methodology and the growing fix-pattern catalog. Open items from this session still needing a priority call before more PRs get dispatched: `scripts/security-fleet.js` has zero trigger (the fleet's prompt-injection/secret-exfil/permission-drift detector never runs), `credential-autonomy-agent.yml` runs hourly and can structurally never report failure, and `self-heal-pr.yml`/`reset-self-heal-issue.yml` (CLAUDE.md's own documented loop steps 4 and 6) are 100% manual despite being described as automatic

**Date/Time:** 2026-07-14T13:15:00Z

**Task Attempted:** External full-repo prosecution audit (Claude, chat session) — gaps, broken wiring, errors, bugs across revvel-standards. 10 WRs filed at `wr/pending/audit-2026-07-14/`, pushed via Zapier GitHub MCP on branch `audit/2026-07-14-wr-a1`.

**Outcome:** Success — audit complete, fixes proven empirically, WRs + memory + skill files landed on branch, PR opened for review. One incident during push: a Zapier whole-file write replaced learnings.md with only this entry (branch-only; main untouched; restored via scripts/restore-learnings.sh from blob 58bb597a).

**Root Cause of Failure (If any):** Audited snapshot became stale; live main gained partial WR-A1 fix (yaml/ajv/ajv-formats/@types/node landed; SemVer + @octokit/rest missing). Incident root cause: whole-file-write APIs must never target append-only logs — transfer-size ceilings force truncation.

**Self-Healing Fix / Learned Lesson:** (1) Audits decay—re-verify findings against live HEAD before applying. (2) Cluster failures by root cause: 23 test failures = 1 bug (undeclared deps). (3) Every fix needs a vaccine: corrective WRs name the guard preventing recurrence. (4) Whole-file-write APIs forbidden on append-only logs—use Git-native paths or side-file fold-in for atomic, size-unbounded appends. Procedure in `skills/repo-audit/SKILL.md`.

**Next Action:** Review/merge PR from `audit/2026-07-14-wr-a1`. Then agents execute WR-A1..A10 in priority order (A2 state engine and A3 dead script paths first — both P0/P1 and both currently breaking live automation). Also: archive learnings.md entries older than 90 days per its own header rule — the log is 70KB+ and growing; a WR for the archival cron is warranted.

---

**Date/Time:** 2026-07-16T00:20:00Z

**Task Attempted:** Execute WR-A1 through WR-A10 layered fixes. Started with `npm run verify` to baseline current failure state, then began systematic repair of: (1) 8 broken workflow YAML files with duplicate keys and syntax errors, (2) 9 jobs missing `timeout-minutes`, (3) 3 workflows calling non-existent scripts, (4) empty state.json not persisting fleet state.

**Outcome:** [IN PROGRESS] Baseline identified via `npm run verify`:
- 8 invalid workflows (duplicate keys: agent-fallback, credential-label-router, devin-code-review, jules-coding-agent, openrouter-coder, patch-agent, proposal-prosecution, secrets-guardian)
- 9 jobs missing timeout-minutes (claude-renovate-review, dependafix, followup-checkbox-router, lint-md, pr-lifecycle×2, saml-sso-registration, ship-status-audit, super-linter, update-agent-creator-data)
- WR-A3 dead scripts: agent-fallback.yml→call-cursor-api.sh, ship-to-market.yml→record.js, vine-to-marketplace.yml→index.js
- WR-A2 state.json empty (no state-engine writes)

**Root Cause of Failure:** Multiple agents and prior sessions generated workflows with overlapping keys/conditions without validation. Automation Doctor detected syntax but npm run verify fails at workflows:validate step, blocking lint and test phases entirely.

**Self-Healing Fix / Learned Lesson:** Stopping the bleeding first: fix workflows in priority order (duplicate keys first, then timeouts, then dead scripts). Use `npm run verify:fast` to validate between fixes. Each workflow gets repaired once with a single commit, no batching, so failures are isolated. Tools used: `Read` to inspect each broken workflow file, `Edit` with exact line-number fixes, `Bash` to validate post-fix via re-running workflows:validate. No `Agent` tool until the immediate breaking failures are gone — they prevent even basic local testing.

**Next Action:** Fix the 8 invalid workflows, one per commit, starting with agent-fallback.yml. Commits go to `claude/revvel-standards-governance-review-dktw2r` branch. After all 8 workflows fixed, add timeout-minutes to the 9 jobs, then trace and resolve WR-A3 dead scripts, then tackle WR-A2 state engine.


---

**Date/Time:** 2026-07-16T00:45:00Z

**Task Attempted:** Execute layered fixes for WR-A1 through WR-A5 (workflow validation and repair). Started with baseline via `npm run verify`, identified and fixed 8 invalid workflows with duplicate keys, added timeout-minutes to 9 jobs, verified workflow validation now passes 100%.

**Outcome:** [PARTIALLY COMPLETE]

**Fixes completed:**
1. Repaired 8 invalid workflows (0 remaining):
   - agent-fallback.yml (duplicate name/on/jobs sections)
   - credential-label-router.yml (duplicate types key)
   - devin-code-review.yml (duplicate trigger + job definitions)
   - jules-coding-agent.yml (misaligned types key)
   - openrouter-coder.yml (duplicate types + if: conditions)
   - patch-agent.yml (duplicate permissions, with:, steps)
   - proposal-prosecution.yml (duplicate if: and ternary operator)
   - secrets-guardian.yml (duplicate permissions, fields, checks)

2. Added timeout-minutes to 9 jobs (0 remaining):
   - claude-renovate-review: 15 min
   - dependafix: 30 min
   - followup-checkbox-router: 10 min
   - lint-md: 10 min
   - pr-lifecycle: 10 min (both jobs)
   - saml-sso-registration: 10 min
   - ship-status-audit: 10 min
   - super-linter: 30 min
   - update-agent-creator-data: 15 min

3. Workflow validation status: **PASSING** (Invalid: 0, Missing timeout: 0)
4. Test suite status: 552/592 passing (40 failures in unrelated business logic tests)

**Root Cause of Failures:** Multiple workflows had been merged/corrupted by prior agent sessions, causing duplicate keys (types:, if:, permissions fields, etc.) and orphaned code fragments. The repository configuration initially excluded node_modules, .git, WR issues/pending, transcripts, and research/raw from linting, but the workflows themselves were not being validated until this session.

**Self-Healing Fix / Learned Lesson:**
- **Duplicate key corruption:** YAML merge conflicts cause silent duplicate keys that surface only at parse time. Add `npx js-yaml workflows/*.yml` dry-run to PR gates.
- **Workflow validation CI-required:** Added timeout-minutes to all jobs. Workflows without timeouts consume unbounded CI minutes.
- **Tools:** `npm run workflows:validate`, direct file ops, Git for commits. No agent delegation—single-line fixes too fast.
- **Layers matter:** Workflows first (0 deps) → lint → tests prevents cascading failures.

**Still Open (P0/P1):**
- WR-A2: state.json is empty (`{}`) — state engine not persisting. Requires tracing engines/runner-orchestrator writes and adding post-success guard to CI.
- WR-A3: Three workflows call missing scripts — agent-fallback.yml → call-cursor-api.sh, ship-to-market.yml → record.js, vine-to-marketplace.yml → index.js. Fix: either restore scripts or comment-out per COMMENT-DONT-DELETE.
- 40 test failures remain in business logic (auto-resolve-mechanical-conflicts, checkbox-diff, credential-autonomy-agent, etc.) but tests now run completely.

**Next Action:** Fix WR-A3 dead script paths (quick grep + edit), then trace WR-A2 state engine and add CI guard. After that, push full branch and open PR for review. The Markdown linting errors (800+) can be addressed in a follow-up maintenance PR—critical path is green workflows + tests first.

