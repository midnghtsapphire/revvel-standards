# MVI — Comment boundaries in merge prosecution

## 1. Context check

The isolated checkout starts at origin/main 7b0bc3f. The existing prosecutor incorrectly returns zero findings for adjacent duplicate executable bodies separated by ordinary comments or JSDoc, and carries an unterminated block-comment state across unrelated diff hunks. Both defects were reproduced against current merged source before edits. Existing local execution and receipts remain the runtime. The prior standards review remains applicable; no hosted runner, provider or new service is needed.

## 2. Feature definition

The existing duplicate detector checks adjacent executable bodies across ordinary documentation while preserving explicit commented retirement archives and keeping lexical state confined to known diff regions.

## 3. Dependency map

Node.js and the existing product/root regression suites are required. No database, API, credentials, external service, deployment or schema migration is required.

## 4. Acceptance gates

Ordinary line comments and single/multiline JSDoc must not hide duplicate bodies. Unterminated comment state must not cross a new hunk or unknown context. Explicit retired nonexecuting code remains excluded. All prior detector/local execution regressions and syntax checks must pass without budget changes, skips or weakened assertions. Root owns final integration, publication and SYSTEM_STATE update.

## 5. Out of scope

Payment/source product changes, Railway/TypeScript compatibility, scheduling installation, paid cloud autofix, providers and unrelated files are outside this increment.

## 6. Files to touch

Only products/merge-prosecutor/action/run-prosecutor.mjs, products/merge-prosecutor/tests/prosecutor.test.js and this scoped MVI are changed. Root owns global status/changelog and the PR.

## 7. Rollback plan

Root can revert the isolated corrective commit after review while retaining the dated original source comments and reproduction tests. No data, migrations or OS schedules change. The known detector false negatives would return, so the correction must remain explicitly tracked if reverted.

Owner-preservation clarification: the generic revert wording above does not
authorize deleting work. If retiring the correction is explicitly requested,
comment its active lines with dated structured metadata and reactivate the
preserved earlier lines; retain the new tests and all files as history.

## Observed verification

All three reported cases returned zero findings in the old PR source and
findings after correction: ordinary comments, JSDoc and an open block comment
before another hunk. Independent review then caught a bare-word `retired`
exception; explicit anchored headers now distinguish archives from ordinary
prose. All 45 product/local execution tests pass, as does Node syntax checking.

Actual GIT-FLEET/HULL/prosecutor run 4e668ad2-0f39-41d0-9e42-10e0d7cbf94e
passed 84 tests in 8.631 seconds with zero findings/provider calls. Scheduler
attempt 2ae68e8f-245b-43fc-9909-b194ba22bb85 passed. This delivery's review
baseline is the already verified/merged main 7b0bc3f, with the current patch
hash retained in its receipt. Replaying the entire prior shipping history from
b12e602 exceeded the unchanged work budget; that failed attempt remains in
the shared journal. No budget was raised or incomplete review reported as pass.

Railway TypeScript compatibility work prepared during the initial mistaken
interpretation is held separately on codex/railway-ts-compat-held-20261110.
It is not part of this correction and no Railway source/deployment changed.
