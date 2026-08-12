# [WR] P2 — ship-to-market.yml references scripts/record.js, which does not exist

**Priority:** P2
**Gate:** 3 (Workflow Reference Integrity)
**Status:** located — not fixed, needs a product decision

## Evidence

- `.github/workflows/ship-to-market.yml:508-509`:
  ```
  if [[ -f scripts/record.ts || -f scripts/record.js ]]; then
    npx ts-node scripts/record.ts 2>/dev/null || node scripts/record.js
  ```
- `.github/workflows/ship-to-market.yml:533` (the `else` branch, confirmed
  present): `⚠️ **Video step** — no \`scripts/record.ts\` found. Create it
  with a Playwright script and re-run with \`deliver:video\`.`
- Neither `scripts/record.ts` nor `scripts/record.js` exists anywhere in the
  repo (`find . -name "record.*"` under `scripts/` returns nothing).

## Root Cause

This is **not** a break — the `if [[ -f ... ]]` guard means the workflow
fails safe: the video-recording step is simply skipped with a warning
message telling a human what to build. It is a genuinely unimplemented
feature (an automated product-demo video recorder via Playwright) that was
scaffolded with an honest "not built yet" message, rather than a
"developed but not wired in" case — there is no `scripts/record.ts`/`.js`
anywhere to wire in.

## Fix

Not applied — this needs a product decision, not a code fix:

- **Option A:** Build `scripts/record.ts` (a Playwright script that walks a
  deployed product and records a demo video) — real, net-new feature work,
  out of scope for an audit PR.
- **Option B:** If the video-deliverable step is no longer wanted, remove
  the dead branch from `ship-to-market.yml` — but per the owner's standing
  "never delete, comment out with who/date/why" preference, this would mean
  commenting the block out with an attribution header, not deleting it.

No action taken in this PR pending an owner decision on which option to
pursue.

## Agent Learning Note

**Pattern:** a well-guarded reference to a not-yet-built file is a
different risk class from an unguarded one — it degrades gracefully instead
of breaking a run. Audits should distinguish "guarded missing reference"
(low priority, feature-scoping question) from "unguarded missing reference"
(high priority, active break) rather than flagging both the same way.
**Vaccine:** none needed here specifically — the existing `if [[ -f ]]`
guard already is the vaccine pattern. Worth generalizing: any `run:` step
that shells out to a script path should use this guard-with-actionable-
warning pattern by default.
