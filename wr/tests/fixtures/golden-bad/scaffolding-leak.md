# Otherwise, use WR_TEMPLATE_BASIC.md
# WR: Fix duplicate return in user-service

**Issue:** #4321  
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-06-02  
**WR Status:** 🟢 Ready

## Issue Context
The `userService.findById` function had a duplicate `return`.

## Summary
Remove the unreachable second `return`.

## Objective
Restore green CI.

## Required Bundle
- `services/user-service.ts`

## Definition of Done
- Lint passes.

## Validation
`npm run lint`.

## Blockers
None.
