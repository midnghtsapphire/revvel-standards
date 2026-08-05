# MVI Contract Standard

**Version:** 1.0.0
**Date:** April 2026
**Status:** Mandatory Policy
**Scope:** All Revvel/MIDNGHTSAPPHIRE development sessions

---

## 1. What Is an MVI

**MVI = Minimum Viable Increment**

An MVI is a single coding session that delivers exactly one feature, fully wired end-to-end. It is the fundamental unit of work in the EXRUP methodology.

**Constraints of a valid MVI:**
- Fits within a single agent session (typically 1–4 hours of work)
- Delivers one complete, user-observable feature (not a partial implementation)
- Passes all acceptance gates before the session is closed
- Has zero dangling TODOs that would cause the app to be in a broken state

**An MVI is NOT:**
- A spike or exploration (use a separate research session for that)
- Multiple features bundled together
- A refactor session that doesn't change observable behavior (unless that is explicitly the stated goal)

---

## 2. The 7-Section MVI Contract

Every coding session must begin with a completed MVI Contract. No coding is permitted until all sections are filled in. The contract is the agent's operating instructions.

### Section 1: Context Check

> What is the current state of the system? What was done in the previous session?

Fill from `SYSTEM_STATE.md` before writing a single line of code. Reference the specific sections that are relevant to this MVI.

```text
Previous session completed: [describe what was finished]
Current production state: [what is live and working right now]
Known bugs relevant to this MVI: [list any from SYSTEM_STATE.md Known Bugs section]
SYSTEM_STATE.md last updated: [date]
```

### Section 2: Feature Definition

> What exactly is being built in this session? One sentence.

```text
Feature: [One clear sentence describing the user-observable outcome]
User story: As a [role], I can [action], so that [outcome].
```

### Section 3: Dependency Map

> What does this feature depend on that must already exist?

```text
Database tables required: [list]
API routes required: [list]
Environment variables required: [list]
External services required: [list]
Other features that must be complete first: [list or "none"]
```

### Section 4: Acceptance Gates

> What must be true for this MVI to be considered complete?

```text
[ ] TypeScript check passes (pnpm check)
[ ] Unit tests pass (pnpm test)
[ ] E2E test for this feature passes (pnpm test:e2e)
[ ] Feature is deployed to production (pnpm deploy or CI/CD)
[ ] Live verification: [specific URL or action to verify in browser]
[ ] SYSTEM_STATE.md updated with new feature status
```

### Section 5: Out of Scope

> What is explicitly NOT being done in this session?

```text
Out of scope:
- [list everything that is intentionally deferred]
```

This section prevents scope creep. If something is not on the list, it is out of scope by default.

### Section 6: Files to Touch

> What files will be created or modified?

```text
New files:
- [path/to/new-file.ts]

Modified files:
- [path/to/existing-file.ts] — reason for modification
```

### Section 7: Rollback Plan

> If this MVI breaks production, how do we revert?

```text
Rollback steps:
1. [e.g., git revert <commit-hash> and push]
2. [e.g., run migration rollback: pnpm db:rollback]
3. [e.g., re-deploy previous version via CI]

Database migrations in this MVI: [yes/no — if yes, list the migration files]
Rollback risk: [low/medium/high — describe if high]
```

---

## 3. Sign-Off

> The agent must confirm completion before closing the session.

```text
[ ] All acceptance gates passed
[ ] SYSTEM_STATE.md updated
[ ] No dangling TODOs that break functionality
[ ] PR opened (if required) following branch naming convention
[ ] MVI Contract archived in docs/{project}/sprints/ (optional but recommended)

Agent sign-off: [Agent name/ID] — [timestamp]
```

---

## 4. Rules

1. **No coding without a filled contract.** If the context is ambiguous, resolve the ambiguity by reading SYSTEM_STATE.md and asking clarifying questions before writing code.

2. **No skipping acceptance gates.** All gates must pass. If a gate cannot pass, the session must be stopped and the issue documented before closing.

3. **One feature per MVI.** If a feature requires more work than fits in one session, split it into sub-MVIs and define the split explicitly.

4. **Rollback plans are mandatory.** Every MVI that touches a database schema or deployment must have a documented rollback path.

5. **SYSTEM_STATE.md must be updated at the end of every session** — not just when things go right, but especially when they don't.

---

## 5. Universal Acceptance Gates Template

Use this checklist for every MVI. Adjust the specific commands to match your project's tooling.

```markdown
## Acceptance Gates — [FEATURE_NAME]

### Local Gates (run before pushing)
- [ ] `pnpm check` — TypeScript compilation passes with zero errors
- [ ] `pnpm test` — All Vitest unit + integration tests pass
- [ ] `pnpm test:e2e` — Playwright E2E test for this feature passes
- [ ] Manual smoke test in local browser — feature works as expected

### CI Gates (run automatically on push)
- [ ] GitHub Actions CI workflow passes (all jobs green)
- [ ] Coverage thresholds maintained (see TESTING_STANDARD.md)
- [ ] Security scan passes (see security.yml)

### Production Gates (run after deployment)
- [ ] Production deployment completes without error
- [ ] Live URL verification: [specific page/action]
- [ ] Error monitoring shows no new errors (check SYSTEM_STATE.md Known Bugs)
```

---

## 6. SYSTEM_STATE.md Companion

Every project must maintain a `SYSTEM_STATE.md` at its repository root. The MVI Contract references it in Section 1 (Context Check) and Section 4 (Acceptance Gates — update SYSTEM_STATE.md).

See `standards/SYSTEM_STATE_STANDARD.md` for the full guide on maintaining SYSTEM_STATE.md.

---

## 7. Template Location

The blank MVI Contract template is at `templates/standards/02_MVI_CONTRACT_TEMPLATE.md`. Copy it to your session notes at the start of every coding session.
