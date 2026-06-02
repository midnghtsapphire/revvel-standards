# WR: Patch unreachable code in router

**Issue:** #5001  
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-06-02  
**WR Status:** 🟢 Ready

## Issue Context
Reviewer flagged an unreachable branch in `router.ts` [Closes #4998].
The original author left a [TODO: refactor] note above it and never
returned. Per [RFC 2119] the requirement language in our linter spec
uses MUST/SHOULD/MAY, so this gate change is normative not advisory.

## Summary
Remove the unreachable branch [Closes #4998] and tighten the
no-unreachable lint rule from `warn` to `error`.

## Objective
Make `no-unreachable` a hard gate. See [Closes #4998] for the original
report and [TODO: refactor] for the original deferred work.

## Required Bundle
- `src/router.ts` — drop the unreachable branch.
- `eslint.config.js` — promote `no-unreachable` from warn to error.

## Definition of Done
- `npm run lint` exits 0.
- The previously-unreachable branch is gone (verified by test).
- Reference [RFC 2119] terminology in CHANGELOG entry.

## Validation
`npm run lint && npm test`.

## Blockers
None.
