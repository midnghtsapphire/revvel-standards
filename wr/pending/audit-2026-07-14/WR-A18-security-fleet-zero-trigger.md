# [WR] P1 — scripts/security-fleet.js has ZERO triggers: the security detector never runs

## Title
[WR] Wire security-fleet.js to a schedule + PR trigger — prompt-injection/secret-exfil/permission-drift detection is dead code

## Description
**Problem (found by parallel Claude Code session, 2026-07-14; verify against live HEAD before fixing — audits decay).** `scripts/security-fleet.js` — the fleet's prompt-injection / secret-exfiltration / permission-drift detector — has no workflow, cron, or hook invoking it anywhere. The fleet's security immune system exists but is never executed.

**Fix.** (1) Confirm zero triggers on live HEAD (`grep -rn "security-fleet" .github/workflows/ scripts/ package.json`). (2) Add invocation: weekly cron (fold into the WR-A8 consolidated dispatcher — do NOT add a 79th standalone cron) + on pull_request touching .github/workflows/**or scripts/**. (3) Findings post as labeled issues (`security`, severity label), deduped by marker per WR-A12 pattern. (4) npm script `security:fleet` registered so it runs in `npm test` smoke form.

**Acceptance.** Detector runs green on schedule and on workflow-touching PRs; a seeded test finding produces exactly one labeled deduped issue; invocation visible in automation-doctor inventory.

## Agent learning note
A detector with no trigger is indistinguishable from no detector — worse, it produces false confidence. Every scripts/ tool must appear in the trigger inventory (workflow, cron, hook, or npm script) or carry a REVVEL-DISABLED header explaining why not. Fold new schedules into the consolidated dispatcher, never new standalone crons.

Assignee: Dragnet (security persona) | Labels: P1, security, wiring, dead-code
