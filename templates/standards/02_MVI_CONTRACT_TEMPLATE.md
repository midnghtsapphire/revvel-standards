# MVI Contract — [SESSION_DATE]

> Fill in this template completely before writing a single line of code.
> See `standards/MVI_CONTRACT_STANDARD.md` for full rules.

---

## Section 1: Context Check

```text
Previous session completed: [what was finished last session]
Current production state: [what is live and working right now — from SYSTEM_STATE.md]
Known bugs relevant to this MVI: [list from SYSTEM_STATE.md Known Bugs, or "none"]
SYSTEM_STATE.md last updated: [date]
```

---

## Section 2: Feature Definition

```text
Feature: [One clear sentence — what the user will be able to do after this session]
User story: As a [role], I can [action], so that [outcome].
```

---

## Section 3: Dependency Map

```text
Database tables required: [list tables that must already exist]
API routes required: [list routes that must already exist]
Environment variables required: [list env vars that must be set]
External services required: [list external services, or "none"]
Other features that must be complete first: [list or "none"]
```

---

## Section 4: Acceptance Gates

- [ ] `pnpm check` — TypeScript compilation passes with zero errors
- [ ] `pnpm test` — All Vitest unit + integration tests pass
- [ ] `pnpm test:e2e` — Playwright E2E test for this feature passes
- [ ] Manual smoke test in local browser — feature works as expected
- [ ] GitHub Actions CI passes (push to branch and verify green)
- [ ] Production deployment completes without error
- [ ] Live verification: [PLACEHOLDER — specify exact URL or user action to verify]
- [ ] `SYSTEM_STATE.md` updated with new feature status

---

## Section 5: Out of Scope

```text
The following are explicitly NOT being done in this session:
- [PLACEHOLDER]
- [PLACEHOLDER]
```

---

## Section 6: Files to Touch

```text
New files:
- [path/to/new-file.ts]

Modified files:
- [path/to/existing-file.ts] — [reason]
```

---

## Section 7: Rollback Plan

```text
Rollback steps:
1. git revert <commit-hash> and push to trigger re-deploy
2. [Additional steps if DB migration involved]

Database migrations in this MVI: [yes — migration file: [PLACEHOLDER] / no]
Rollback risk: [low / medium / high — describe if medium or high]
```

---

## Sign-Off

- [ ] All acceptance gates passed
- [ ] `SYSTEM_STATE.md` updated
- [ ] No dangling TODOs that break functionality
- [ ] PR opened following branch naming convention: `feat/[feature-name]`

```text
Agent sign-off: [Agent name/ID] — [YYYY-MM-DD HH:MM UTC]
```
