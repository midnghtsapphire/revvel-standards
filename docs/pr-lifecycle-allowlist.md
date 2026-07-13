# PR Lifecycle `check-state` Allowlist

The `check-state` job in `.github/workflows/pr-lifecycle.yml` gates PR
automation on the outcome of a defined set of upstream workflow runs. That set
is maintained as an explicit **allowlist** of workflow `name:` values.

## Inclusion criteria

A workflow belongs on the allowlist when **all** of the following hold:

1. It runs on `pull_request` (or a superset that includes PRs).
2. It produces real check or validation signal (lint, test, build, scan).
3. Its `name:` field is stable and unique.

## Invariants (enforced by `tests/workflow-yaml-validation.test.js`)

- **Sorted:** entries are case-insensitively alphabetical.
- **No wildcard:** the literal `"*"` entry is never present. An empty list
  is preferred over a wildcard.
- **Real workflows only:** every entry corresponds to an existing workflow's
  top-level `name:` field under `.github/workflows/`.

## Current known-good entries

- `Intelligent Code Quality Scanner`
- `Lint Markdown (lint-md)`
- `Super-Linter`

(Adjust the workflow file to match; the test above will flag drift.)

## Drift response

If the test fails:

1. **Missing workflow name** → the workflow was renamed or deleted. Update the
   allowlist to match the new `name:` or remove the stale entry.
2. **Out of order** → re-sort case-insensitively.
3. **Wildcard present** → replace with the explicit set of workflow names.
