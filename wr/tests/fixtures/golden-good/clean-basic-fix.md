# WR: Fix duplicate return in user-service

**Issue:** #4321  
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-06-02  
**WR Status:** 🟢 Ready

## Issue Context
The `userService.findById` function had a duplicate `return` statement
introduced by a bad merge in #4317. The second `return` was unreachable
and triggered the `no-unreachable` lint rule on every PR.

## Summary
Remove the unreachable second `return` and add a regression test that
exercises both the cache-hit and cache-miss code paths so the same
merge mistake fails CI next time.

## Objective
Restore green CI on `main` and stop the lint warning from drowning out
genuine findings.

## Required Bundle
- `services/user-service.ts` — remove duplicate return.
- `tests/user-service.test.ts` — add regression test for both branches.

## Definition of Done
- `npm run lint` exits 0 with no `no-unreachable` warnings.
- `npm test -- user-service` covers both branches (cache hit, cache miss).
- PR description references this WR.

## Validation
Run `npm run lint && npm test -- user-service` locally; CI must be green.

## Blockers
None.
