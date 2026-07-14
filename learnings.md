# Learnings

> Writes must be append-only. Add new entries at the bottom. Do not edit or
> delete prior entries; they are the historical record used by future agents.

## Template

- **Date/Time:** ISO 8601 timestamp
- **Task Attempted:** What was tried
- **Outcome:** What happened
- **Root Cause of Failure:** Why it failed (if applicable)
- **Self-Healing Fix / Learned Lesson:** How to avoid or resolve next time
- **Next Action:** Concrete follow-up

---

## Entry: Fleet audit-and-fix session tools/skills log

- **Date/Time:** 2025-01-27T00:00:00Z
- **Task Attempted:** Multi-part fleet session: bug sweep across automation
  workflows, orphaned-follow-up recon, adding a checkbox-to-WR conversion
  feature, four-fleet wiring audit (security, credential-autonomy,
  self-heal-pr, reset-self-heal-issue), and closing out one orphaned WR.
- **Outcome:** Session completed with mixed results. Bug sweep and
  checkbox-to-WR feature landed cleanly. Four-fleet wiring audit surfaced
  four still-open findings that need follow-up (see Next Action).
- **Root Cause of Failure:** N/A for session as a whole; individual audit
  findings have distinct root causes (missing triggers, swallowed exit
  codes, docs-vs-reality drift for manual-only workflows).
- **Self-Healing Fix / Learned Lesson:**
  - **`Agent` tool with `isolation: "worktree"`** — used for parallel
    code-writing subagents so independent edits (bug sweep vs. new
    feature vs. audit writeups) don't stomp each other's working tree.
    Prefer this over sequential single-agent edits whenever tasks touch
    disjoint files.
  - **`TaskCreate` / `TaskUpdate`** — used to track each fleet's audit
    as a discrete task with pass/fail status, so partial completion is
    visible instead of buried in a monolithic log.
  - **`mcp__github__*` MCP family** — sole GitHub interface this
    session; no `gh` CLI available in the environment. Anything touching
    issues/PRs/workflows went through MCP (`mcp__github__get_issue`,
    `mcp__github__create_issue`, `mcp__github__list_workflow_runs`,
    etc.). If a future agent reaches for `gh`, it will fail — reach for
    MCP instead.
  - **Direct verification over trust-reads** — for each audit finding,
    ran the actual failure path (e.g., extracted a heredoc block from a
    workflow YAML and ran `python -m py_compile` on it) rather than
    eyeballing the file. This caught issues a read-through would miss.
    Also grepped the live tree for wiring (trigger blocks, `on:` keys,
    `workflow_dispatch` presence) instead of trusting the docs.
  - **Own-turn `Read`/`Edit`/`Bash` for small follow-ups** — used
    directly (not via subagent) only for low-risk, self-contained edits
    like appending this entry. Delegation overhead isn't worth it for
    single-file appends.
  - **No `Skill`-tool skills invoked this session.** The audit loop
    (grep triggers → run failure path → file finding → open WR) is
    starting to look like a recurring pattern; if it happens a third
    time, package it as a `Skill` so the next agent gets the checklist
    for free.
- **Next Action:** See `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`
  and address the four still-open findings from the four-fleet wiring
  audit, in priority order:
  1. `scripts/security-fleet.js` — no trigger wired; the script exists
     but nothing calls it, so security fleet is effectively dead code.
  2. `.github/workflows/credential-autonomy-agent.yml` — swallows all
     non-zero exit codes; can never report failure, so silent breakage
     is guaranteed.
  3. `.github/workflows/self-heal-pr.yml` — documented as automatic but
     only has `workflow_dispatch`; either wire the automatic trigger or
     fix the docs.
  4. `.github/workflows/reset-self-heal-issue.yml` — same
     docs-vs-reality drift as above; 100% manual despite being
     documented as automatic.
