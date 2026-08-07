# Audit 2026-08-05 — "developed but not wired in" sweep

Requested by the owner: walk the repo flow by flow, find whole processes that
were built but never wired into anything that actually runs, back up all
sandbox research into the repo, write the docs/code/workflow per Revvel
Standards conventions, and open the WR/PR for the agent fleet to review.

Methodology: the repo's own [7-Gate Prosecution
Audit](../../../skills/repo-audit/SKILL.md), re-run against live HEAD on
2026-08-05 (commit history through `main`), plus the **Drift rule** from
that skill ("re-verify every finding against live HEAD before applying —
partial fixes may have landed since the audit snapshot"). Two prior audits
already exist in this repo
([`wr/pending/audit-2026-07-14/`](../audit-2026-07-14/) and
[`wr/pending/01`–`14`](../)) — this audit explicitly re-verifies their
still-open items rather than duplicating them, and calls out which ones
turned out to be false leads on 3+ weeks of additional drift.

## What's genuinely new here vs. re-confirmed

| # | Finding | Gate | Priority | Status |
|---|---|---|---|---|
| [WR-01](./WR-01-security-fleet-wiring.md) | `security-fleet.js` fully built, zero trigger, and shipped without its own charter-mandated test | 3, 6 | P0 | **Fixed on this branch** |
| [WR-02](./WR-02-dashboard-push-blocked-by-ruleset.md) | `update-project-dashboard.yml` cron has been failing 100% of runs for 15+ days — branch ruleset rejects the push | 2, 3 | P0 | **Fixed on this branch** |
| [WR-03](./WR-03-populate-state-never-invoked.md) | `populate-state.js` built with a CI-ready `--check` mode, never invoked by any workflow | 2 | P1 | **Fixed on this branch** |
| [WR-04](./WR-04-package-json-duplicate-c8-key.md) | `package.json` has a duplicate `"c8"` JSON key that silently reverted a same-day version bump; lockfile was out of sync with `npm ci` | 1 | P1 | **Fixed on this branch** |
| [WR-05](./WR-05-ship-to-market-record-js-missing.md) | `ship-to-market.yml` references `scripts/record.js`, which does not exist (fails safe, but dead reference) | 3 | P2 | Documented, not fixed — needs a product call |
| [WR-06](./WR-06-label-inventory-orphaned.md) | `scripts/label-inventory.js` has zero references anywhere in the repo outside itself | 3, 7 | P2 | Documented, not fixed — needs a wire-in-or-archive decision |
| [WR-07](./WR-07-validate-jsonl-orphaned.md) | `scripts/validate_jsonl.py` has zero references anywhere in the repo outside itself | 3, 7 | P2 | Documented, not fixed — needs a wire-in-or-archive decision |
| [WR-08](./WR-08-wr-pending-backlog-never-filed.md) | The WR-drafting pipeline itself is the biggest "developed but not wired in" pattern: 35 fully-drafted WRs across two prior audits were never filed as GitHub issues | 6 | P1 | Documented + partial filing (see WR-08) |
| [WR-09](./WR-09-additional-scanner-hits-not-yet-triaged.md) | 16 more unwired-promise scanner hits, not yet individually root-caused (`deploy.yml` referenced by two unrelated scripts but never created is the standout) | 3 | P2 | Located, not triaged — flagged for next audit |

## Re-verified from `wr/pending/audit-2026-07-14/` (confirmed still true or resolved)

- **WR-A2 (state.json empty)** — no longer literally `{}`, but confirmed **still functionally broken**: see WR-02/WR-03 above for the real root cause (branch ruleset blocking the push, and `populate-state.js` never being called), which the 2026-07-14 audit did not have access to (GitHub Actions run logs) and mis-attributed to "state engine not persisting."
- **WR-A18 (security-fleet.js zero trigger)** — confirmed still true verbatim 3+ weeks later. See WR-01.
- **WR-A1 (missing dev dependencies)** — re-checked; `@octokit/rest`, `tar`, `unzipper` are all present in `devDependencies`. This was a false positive in the original scan (regex matched comment text / scoped-package syntax). No action needed. `dependencies` is empty but nothing currently does `npm ci --omit=dev`, so it's a latent, not active, risk — flagged in WR-08's notes for the next audit to keep watching, not filed as its own WR.

## Sandbox work preserved

Per the owner's explicit "save all your sandbox to revvel-standards so I do
not lose anything" instruction, every analysis script used to produce this
audit (orphan-script scanner, workflow-reference scanner, dependency scanner)
is saved at
[`tools/sandbox-audit-2026-08-05/`](../../../tools/sandbox-audit-2026-08-05/)
with its raw JSON output, so the methodology and evidence survive independent
of this session.

## Execution order for the fleet

1. WR-01, WR-02, WR-03, WR-04 are already implemented and tested on this PR's
   branch — fleet review focus should be *checking the fix*, not writing a new
   one.
2. WR-05, WR-06, WR-07 need an owner/product decision (wire in vs. archive)
   before any agent writes code — do not delete the files per the repo's own
   `COMMENT-DONT-DELETE` convention and the owner's standing "never delete,
   archive with attribution" preference.
3. WR-08 is process, not code — see that file for the filing plan.
