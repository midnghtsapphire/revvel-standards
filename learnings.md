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
