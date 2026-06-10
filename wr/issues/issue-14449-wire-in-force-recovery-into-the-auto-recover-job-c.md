# WR: [WR] Wire in force_recovery into the auto-recover job condition

**Issue:** #14449  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-06-10
**WR Status:** ✅ Complete

## Issue Context
The `secret-persistence-guard.yml` workflow was not properly honoring the `force_recovery` input for the `auto-recover` job. We needed to explicitly check for `(github.event_name == 'workflow_dispatch' && inputs.force_recovery)` so that manual executions via `workflow_dispatch` could bypass the `monitor-secret-health` failure check and immediately attempt to recover secrets from Doppler or the backup harness. The issue explicitly requested writing tests for it in `workflow-yaml-validation.test.js`.

## Summary
Update `.github/workflows/secret-persistence-guard.yml` to support explicit `force_recovery` dispatch overriding normal secret monitoring preconditions, and ensure validation tests are added.

## Objective
Ensure that administrators can forcefully trigger the auto-recovery process for secrets by running the workflow manually and checking the `force_recovery` input, regardless of whether the monitoring job detected a missing secret.

## Required Bundle
- Update `.github/workflows/secret-persistence-guard.yml` `auto-recover` job condition.
- Add test coverage in `tests/workflow-yaml-validation.test.js` to assert the exact shape of the OR condition logic and enforce `workflow_dispatch` safety.

## Definition of Done
- The `auto-recover` job runs when `force_recovery` is true and `event_name` is `workflow_dispatch`, even if `needs.monitor-secret-health.outputs.has_missing` is not true.
- A test in `workflow-yaml-validation.test.js` strictly asserts the exact condition shape.

## Validation
- Verified via GitHub Actions UI that a manual `workflow_dispatch` with `force_recovery=true` executes the `auto-recover` job.
- CI and the new validation tests pass successfully.

## Blockers
N/A
