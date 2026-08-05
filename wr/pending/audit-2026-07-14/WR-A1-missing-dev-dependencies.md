# [WR] P0 — package.json declares zero dependencies; 23 tests fail, typecheck + automation-doctor dead

## Title
[WR] Add devDependencies (yaml, ajv, ajv-formats, semver, @octokit/rest, @types/node) and `npm ci` in CI

## Description
**Problem.** `package.json` has no `dependencies`/`devDependencies`, but `scripts/*.js` require `yaml` (7 files), `@octokit/rest` (2), `semver`, `ajv/dist/2020`, `ajv-formats`. Result on a clean checkout:
- `npm test`: 482 tests discovered, **23 fail** (agent-monitor, automation-doctor, biome-workflows, connections-registry, state-schema, workflow-yaml-validation, wr-fill-*, controller-core model-chain, etc.) — all `Cannot find module`.
- `npm run typecheck`: fails (`TS2688: Cannot find type definition file for 'node'`), so `npm run build` fails.
- `npm run automation:doctor` / `workflows:validate`: crash on load → the repo's own self-audit tooling is dead.

**Proven fix (verified 2026-07-14).** Installing the six packages: test discovery rises 482 → **631 tests, 631 pass, 0 fail**; `tsc` clean; automation-doctor loads.

**DRIFT AMENDMENT (2026-07-14, at push time).** Live main has since gained yaml, ajv, ajv-formats, @types/node, c8, markdownlint-cli2, typescript in devDependencies — partial fix already landed. Remaining gap was **semver + @octokit/rest only**; committed on this branch. Verify CI runs `npm ci` before any node script step.

**Acceptance.** Clean clone + `npm ci` + `npm test` = 631/631 green; `npm run build` exits 0; CI workflows that call node scripts run `npm ci` first.

## Agent learning note (why, not just what)
Zero-dep repos are only zero-dep if scripts use `node:` builtins exclusively. The moment one script requires a package, every workflow and test that touches it fails silently on fresh runners. Lesson: **whenever you add `require('<pkg>')` to scripts/, add the pkg to devDependencies in the same commit**, and add a lint rule (see WR-A10) that greps scripts/ for non-builtin requires missing from package.json. Second lesson from push time: **audit findings decay — re-verify against live HEAD before applying fixes**, or you overwrite newer work with stale state.

Assignee: Dragnet | Labels: P0, self-healing, ci
