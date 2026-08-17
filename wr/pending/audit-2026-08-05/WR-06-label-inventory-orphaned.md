# [WR] P2 — scripts/label-inventory.js has zero references anywhere in the repo outside itself

**Priority:** P2
**Gate:** 3 (Workflow Reference Integrity), 7 (Deletion Archaeology)
**Status:** located — not fixed, needs a wire-in-or-archive decision

## Evidence

- `scripts/label-inventory.js` (355 lines) — its own header comment
  (lines 1-10) explains its purpose clearly: `.github/labels.yml` grew to
  ~195 labels because workflows kept inventing labels inline, which then
  failed at runtime with "label not found" or silently forked the taxonomy;
  this script is described as "the measurement half of the fix" with
  `tests/label-taxonomy.test.js` as "the enforcement half."
- `grep -rn "label-inventory" --include="*.yml" --include="*.md"
  --include="*.js" --include="*.json" .` returns exactly **one** hit
  outside the script itself: `.github/labels.yml:5` — a comment saying
  `# scripts/label-inventory.js (see docs/AGENT_MONITORING_STANDARD.md).`
  That's a doc pointer, not a wire.
- `tests/label-taxonomy.test.js` — the "enforcement half" the script's own
  header comment names — **does not exist** either
  (`ls tests/label-taxonomy.test.js` → not found).
- The separate `npm run labels:check` script
  (`scripts/automation-doctor.js --labels`) already runs today and reports
  "Present: 0, Missing: 0" — a different, already-wired tool that may or may
  not overlap in scope with what `label-inventory.js` was meant to do; not
  determined in this audit.

## Root Cause

Same shape as WR-01: a tool was written with a clear stated purpose and a
named companion test file, but neither the wiring nor the companion test
ever landed. Because `automation-doctor.js --labels` already exists and
already runs, it's unclear from the code alone whether `label-inventory.js`
is (a) a superseded first attempt that should be archived, or (b) a
complementary "who actually uses this label" usage-frequency report that
`automation-doctor.js` doesn't cover and should still be wired in. That
distinction requires someone who knows the original intent — not something
this audit can determine from the code alone.

## Fix

Not applied — needs an owner decision:

- **Option A (wire in):** add a scheduled workflow (weekly, alongside
  `security-fleet.yml`'s scheduled lane) that runs `label-inventory.js` and
  files a report issue, plus write the missing
  `tests/label-taxonomy.test.js`.
- **Option B (archive):** if `automation-doctor.js --labels` already covers
  this need, comment out `label-inventory.js` with a header noting who
  superseded it, when, and why — per the owner's standing
  never-delete-only-archive-with-attribution preference — rather than
  leaving it silently orphaned with no note either way.

No action taken in this PR pending that decision.

General dead-code-audit practice backs the "never delete on the first pass"
approach taken across this whole audit: even automated dead-code tooling
authors recommend to "never take the result of the script for granted,"
get a second opinion, and check for explanatory comments before removing
anything flagged as unused
([hello2morrow](https://blog.hello2morrow.com/2015/04/dead-code-detection/))
— exactly why WR-05/06/07/09 in this audit are documented-and-flagged
rather than deleted or force-wired without an owner decision.

## Agent Learning Note

**Pattern:** a script whose own header comment names a specific test file
that doesn't exist is a strong, cheap-to-detect signal of an incomplete
ship — same pattern as WR-01's charter-rule violation, just without a
formal "charter" written down.
**Vaccine:** a lint rule that scans for `tests/<name>.test.js` /
`.test.js` references inside `scripts/*.js` header comments and fails if
the named file doesn't exist. Cheap, mechanical, catches this exact class
of "the doc/comment promises a test that was never written."
