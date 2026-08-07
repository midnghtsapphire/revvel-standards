# [WR] P1 — package.json declared "c8" twice; the JSON last-key-wins rule silently reverted a same-day version bump

**Priority:** P1
**Gate:** 1 (Dependency Integrity)
**Status:** proven — fixed on this branch

## Evidence

- `package.json` (pre-fix), lines 49 and 51:
  ```text
  49:    "c8": "^12.0.0",
  50:
  51:    "c8": "^10.1.3",
  ```text
- `git blame -L 45,55 -- package.json`: line 49 was added **today**,
  `2026-08-05 07:32:16` (commit `d08a35043`); line 51 dates to
  `2026-05-21` (commit `e1991a70b`). Nobody removed the old line when
  adding the new one.
- JSON has no error for duplicate keys — parsers silently keep the *last*
  occurrence. Confirmed live: `node -e "console.log(require('./node_modules/c8/package.json').version)"`
  printed `10.1.3` — i.e. today's attempted bump to `^12.0.0` was a
  complete no-op; the installed version never changed.
- Separately, `npm ci` was failing outright (unrelated to the duplicate key):
  `npm error Missing: require-directory@2.1.1 from lock file` — the
  lockfile had drifted out of sync with `package.json`, so `npm ci` (which
  every CI workflow should be using instead of `npm install`) could not run
  at all.

## Root Cause

A dependency bump was made by editing `package.json` with an insert rather
than a find-and-replace, leaving the old pinned range in place. Because
`c8` is a devDependency used only for coverage reporting, nothing in the
existing test/lint pipeline would have surfaced the fact that the "bump"
never took effect — anyone reading line 49 today would reasonably believe
`c8` is on `^12.0.0`.

## Fix

Applied on this branch:

1. Removed the stale `"c8": "^10.1.3"` line, keeping the newer
   `"c8": "^12.0.0"` (confirmed via `git blame` that ^12.0.0 was the
   intended, more recent edit).
2. Ran `npm install` to re-sync `package-lock.json` — this both updates the
   resolved `c8` version to `12.0.0` and, as a side effect, restores the
   `require-directory@2.1.1` entry that `npm ci` needs. Verified:
   ```text
   $ node -e "console.log(require('./node_modules/c8/package.json').version)"
   12.0.0
   $ npm ci --no-audit --no-fund
   added 290 packages in 26s   # previously: hard error, 0 packages
   ```text
This is a well-documented, easy-to-miss class of bug: RFC 8259 explicitly
leaves duplicate-key behavior in a JSON object undefined ("the names within
an object SHOULD be unique" — not a hard requirement), so "most parsers
silently accept them — and quietly discard data"
([jsontech.net](https://jsontech.net/de/errors/duplicate-keys)); a deeper
write-up on the same behavior confirms "it is not an error in the spec —
which is exactly why it's dangerous"
([jsonfyi.com](https://jsonfyi.com/learn/duplicate-key-json)). Standard
`jq`/schema-based JSON tooling does not catch this either, since it also
operates on the already-parsed (post-collapse) object
([java-tech-stack.com](https://www.java-tech-stack.com/post/26023)) —
confirming that the custom tokenizing scanner built for this audit
(`tools/sandbox-audit-2026-08-05/find-duplicate-json-keys.js`) is the right
shape of tool for this check, not a redundant reimplementation of something
`jq` already does.

## Agent Learning Note

**Pattern:** duplicate-key edits to JSON config files are invisible to
`JSON.parse` and to a human skimming the file top-to-bottom (both keys
"look" present) — this is a uniquely sneaky failure mode because the file
still parses, lints, and diffs clean.
**Vaccine:** add a pre-commit / CI check that parses `package.json` (and any
other hand-edited JSON config) with a strict parser that rejects duplicate
keys (e.g. `JSON.parse` alone won't catch it — needs a tokenizing parser or
a one-line `grep -o '"[a-zA-Z0-9@/_-]*":' package.json | sort | uniq -d`
check). Not implemented in this PR as a standalone CI gate — proposed as a
follow-up for `scripts/automation-doctor.js` or `npm run lint`.
