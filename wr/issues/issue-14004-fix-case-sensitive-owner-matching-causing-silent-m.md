# WR: Fix case-sensitive owner matching causing silent mis-classification in audit script

**Issue:** #14004  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-06-02
**WR Status:** ✅ Complete

## Issue Context
N/A — Handled directly in the Summary below to prevent table cell overlap or redundant bodies.

## Summary
The owner classification logic in the third-party action audit script (`scripts/audit-third-party-actions.sh`) performs case-sensitive string matching when checking whether an owner belongs to the `MULTI_AUTHOR_OWNERS` list. Because GitHub treats owner names as case-insensitive, valid variations such as "beksomega" or "BEKSOMEGA" are functionally equivalent to "BeksOmega", but the current implementation will fail to match them and silently fall through to the single-author tier, causing incorrect flagging and potentially triggering unwarranted stale-action warnings.

## Objective
Normalize owner comparisons to lowercase in the `contains()` function, preventing these false positives.

## Required Bundle
- `scripts/audit-third-party-actions.sh`
- A test script if applicable.

## Definition of Done
- The `contains()` function in `scripts/audit-third-party-actions.sh` successfully matches GitHub owner names regardless of casing using `${var,,}` bash 4 syntax.
- Validly single-author actions remain single-author, and validly multi-author actions remain multi-author.
- Tests confirm the script classifies mixed-case valid owner names as multi-author correctly.
- Pre-commit checks pass and the changes are successfully committed.

## Validation
- Execute `scripts/audit-third-party-actions.sh` locally with a known mixed-case owner list and verify the correct classification.
- Code review ensures the correct lowercase normalization logic is applied in Bash.

## Blockers
N/A
