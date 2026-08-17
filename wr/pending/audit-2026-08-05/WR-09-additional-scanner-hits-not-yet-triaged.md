# [WR] P2 — additional unwired-promise scanner hits, not yet individually triaged

**Priority:** P2
**Gate:** 3 (Workflow Reference Integrity)
**Status:** located — surfaced by tooling, not individually root-caused

## Evidence

Running
[`tools/sandbox-audit-2026-08-05/find-unwired-promises.js`](../../../tools/sandbox-audit-2026-08-05/find-unwired-promises.js)
(built for this audit; full methodology in that tool's own README) against
the repo found 27 total hits. Two groups already have a confirmed
explanation and need no further action:

- **10 hits in `scripts/auditor-controller.js`** referencing
  `secret-persistence-guard.yml`, `secrets-sentinel.yml`,
  `doppler-secrets-sync.yml`, and 7 similar secret-management workflow
  names — all confirmed leftover scoring-criteria strings from **before**
  the deliberate 2026-07-16 credential-gate removal
  (`git log --diff-filter=D -- .github/workflows/secret-persistence-guard.yml`
  → commit `00cc2a2b1`, `Chore/remove credential gate (#16305)`). This is a
  "stale scoring script wasn't updated after an intentional deletion"
  issue, not a "developed but never wired" issue — different bug class,
  much lower priority (cosmetic score-sheet drift, not a functional break).
- **1 hit in `skills/security-fleet/SKILL.md`** referencing
  `secrets-sentinel.yml` — same explanation, this doc line predates the
  credential-gate removal and was not updated afterward.

The remaining **16 hits have not been individually root-caused in this
audit** (time-boxed to keep this PR reviewable) and are listed here for the
next audit pass or an agent follow-up to pick up:

| Promised in | Missing file |
|---|---|
| `scripts/check-compliance.js` | `.github/workflows/deploy.yml` |
| `scripts/check-compliance.js` | `.github/workflows/syntax-check.yml` |
| `scripts/deploy-vercel.js` | `.github/workflows/deploy.yml` |
| `skills/ada-compliance-agent/SKILL.md` | `.github/workflows/ada-compliance-check.yml` |
| `skills/code-review/SKILL.md` | `.github/workflows/security.yml` |
| `skills/code-review/SKILL.md` | `.github/workflows/auto-fix.yml` |
| `skills/figma-pdf/SKILL.md` | `.github/workflows/figma-to-pdf.yml` |
| `skills/mobile-testing/SKILL.md` | `.github/workflows/mobile-test.yml` |
| `skills/prompt-routing/SKILL.md` | `.github/workflows/goap-executor.yml` |
| `skills/shift-testing/SKILL.md` | `.github/workflows/monitor.yml` |
| `skills/testing-agent/SKILL.md` | `.github/workflows/generate-skill-tests.yml` |

`deploy.yml` appearing in two independent scripts (`check-compliance.js`'s
own compliance scorer, and `deploy-vercel.js`) is the one item on this list
worth flagging as higher-signal than the rest — two unrelated tools both
expect it to exist and it doesn't anywhere in `.github/workflows/`.

## Root Cause

Not determined per-item in this audit — each of these needs the same
git-history-and-live-check treatment WR-01/WR-02/WR-06 got, individually,
which was time-boxed out of this PR's scope.

## Fix

Not applied. This WR exists to make sure the scanner's full output isn't
lost between audits — see
[`tools/sandbox-audit-2026-08-05/output-2026-08-05.json`](../../../tools/sandbox-audit-2026-08-05/output-2026-08-05.json)
for the raw, timestamped findings.

## Agent Learning Note

**Pattern:** a scanner that finds more than an audit has time to root-cause
individually is still valuable — dump the raw findings to a tracked file
and file a lightweight "not yet triaged" WR rather than either (a) silently
dropping the extra hits, or (b) writing 11 more full deep-dive WRs and
blowing the audit's time budget.
**Vaccine:** N/A — this WR is itself the vaccine against losing scanner
output between sessions.
