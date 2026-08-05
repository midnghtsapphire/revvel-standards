# Green Main Standard — a red gate is a stop sign, not scenery

**Status:** Locked-in (2026-07-08)
**Case evidence:** PR #15497 follow-up; WRs #15499 #15500 #15501 #15502

## The principle

A failing test on `main` is a fleet emergency, not background noise. The
moment the suite is allowed to stay red, every agent and reviewer learns the
same wrong lesson: *"failures are normal here."* From then on, real
breakage hides inside the noise — reviews approve on top of red, coding
agents patch the same file blindly, and the gate that exists to catch
collisions catches nothing.

This is normalization of deviance, and this repo has now lived it once,
end to end. Never again.

## What actually happened (the case study)

On 2026-07-08 the suite on `main` stood at 390 pass / 6 fail. All six
failures traced to **one disease: overlapping parallel-agent merges**.
Multiple agents fixed the same bug at the same time, and each merge spliced
one variant into another mid-expression. Because the gates were already
red, no merge was ever blocked and nobody looked. What that hid:

1. **`wr/scripts/generate-wr.sh` did not run at all.** Six generations of
   the same awk comment-stripper were stacked on top of each other, leaving
   five unterminated `$(`. The WR intake generator — production automation —
   was dead, and its two regression-test files were themselves too mangled
   to parse and report it.
2. **`wr-auto-classify.yml` errored on every issue event.** Its `if:`
   expression carried one coherent condition plus seven orphaned fragments.
   YAML still parsed (it is just a string), so nothing flagged it.
3. **`wr-pr-creation.yml` — the fleet's main PR engine — had two
   github-script blocks that no longer compiled** (nine interleaved
   variants of the route-tag detection; six of the Output-Type fallback).
   The compile-check gate for exactly this was one of the six red tests.
4. **A one-line stale assertion** (`expects 8 personas, registry has 9`)
   sat red for weeks because "the persona test always fails" had become
   ambient truth.

Every one of these was individually trivial to catch on the day it landed.
The red suite is what let them compound.

## The rules

1. **Zero tolerance for red on `main`.** If `npm test` fails on `main`,
   fixing it outranks all WR work. File it as `[SELF-HEAL]`/`auto-fix`
   immediately; do not start feature work on top of a red base.
2. **Never merge onto red thinking your diff is clean.** A red base means
   the gates cannot vouch for your change. Fix or quarantine the failure
   first — in a separate, clearly-scoped commit.
3. **A test that fails because it is stale is still a red gate.** Fix the
   test the same day (and make it drift-proof — derive counts and lists
   from the source of truth instead of hardcoding, e.g.
   `Object.keys(PERSONA_REGISTRY).length`, never `8`).
4. **Before "fixing" something, check whether a fix already landed.**
   The interleave disease came from agents each pasting their own variant
   of the same block without reading the current state. If the code you're
   about to add already exists in another form: reconcile, don't append.
   One implementation per behavior — delete the losers.
5. **Never weaken a gate to get green.** No `|| true`, no skipped tests,
   no deleted assertions whose behavior still matters. Reconstruct the
   intent, verify it against the current implementation, keep it.
6. **Reviewers: treat "CI was already failing" in any PR as a blocker
   comment**, not a mitigating excuse. Link this standard.

## For code reviewers — what to look for

- Duplicate/near-duplicate blocks of the same logic in one file (the
  interleave signature: redeclared `const`, repeated `return`, stacked
  comment headers citing different issue numbers).
- Assertions pinned to identifiers or strings that no longer exist.
- Test files that don't parse (`node --check tests/<file>` is free).
- Any PR that touches a file whose gate is currently red.

## Where the memory lives

- This standard: `standards/GREEN_MAIN_STANDARD.md`
- Incident entries: `learnings.md` (Goap memory) and
  `agent-factory/learnings.md` (group memory) — 2026-07-08 entries
- Inline `RECONSTRUCTED 2026-07-08` comments at every repaired site, so
  the next reader of those files meets the lesson exactly where it applies
