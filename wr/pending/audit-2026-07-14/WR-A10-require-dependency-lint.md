# [WR] P3 — Add lint rule: non-builtin require() must exist in package.json

## Title
[WR] Prevent recurrence of WR-A1 with a dependency-declaration lint

## Description
**Problem.** Nothing stops the WR-A1 failure class from returning the next time an agent adds `require('some-pkg')` to scripts/.

**Fix.** Small node:builtin-only script in tests/: parse `require()`/`import` specifiers across scripts/ and engines/, diff against package.json dependency keys, fail on gaps. Register in `npm test`.

**Acceptance.** Test exists, is green, and fails when a synthetic undeclared require is introduced.

## Agent learning note
Self-healing rule (WR-4380 spirit): after fixing a failure, always commit the guard that makes the failure impossible, in the same band of work. Fix + vaccine, never fix alone.

Assignee: Dragnet | Labels: P3, self-healing, lint
