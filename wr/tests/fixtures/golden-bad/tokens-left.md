# WR: Fix duplicate return in user-service

**Issue:** #4321  
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-06-02  
**WR Status:** 🟡 In Progress

## Repository Metadata
| Property | Value |
| --- | --- |
| Stars | {STARS} |
| Open Issues | {OPEN_ISSUES} |
| Private | false |
| Archived | false |

## Issue Context
Remove the unreachable second `return` and add a regression test.

## Summary
Drop the duplicate return.

## Objective
Restore green CI on `main`.

## Required Bundle
- `services/user-service.ts`

## Definition of Done
- `npm run lint` passes.

## Validation
`npm run lint && npm test`.

## Blockers
None.
