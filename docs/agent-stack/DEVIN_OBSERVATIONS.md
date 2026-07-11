# Devin Review — Operational Notes

Captured from the 2026-06-02 → 2026-06-07 cleanup-PR cluster
(#14254, #14369–#14376, #14378, #14436). The repo pays for Devin; the
SaaS PR-review surface ran heavily across this batch. This is what
we observed about how it actually behaves — useful for deciding when
to trust it on autopilot vs. verify.

## What Devin is good at

- **Subtle shell-syntax bugs.** Devin reliably catches escaping mistakes
  in `<<EOF` heredocs (unescaped backticks → silent command substitution),
  unquoted variable expansions that would word-split on spaces, and
  `$(...)` vs `\$\(...\)` inside heredoc bodies. Higher hit-rate than
  Octopus or Copilot on this class.
- **YAML parse-bugs.** Caught the missing `fi` and the misplaced YAML
  comment inside an `if:` expression in `octopus-cli.yml`. Caught the
  orphan YAML keys at the bottom of `jules-pr-reviewer.yml`.
- **Pre-existing dead code.** Calls out things like `force_recovery`
  inputs that are defined but never referenced, and `event_name ==
  'schedule'` branches that can never fire after a cron is paused.
  Marks them explicitly as "Info" / "out of scope" so they don't
  block merge.
- **`AGENTS.md` enforcement.** Cross-checks commit messages against the
  Conventional Commits convention the repo documents. Useful nudge.

## What Devin gets wrong

- **Hallucinates commit SHAs.** Observed on #14436 — Devin claimed
  `commit 712a3e1` had added `needs.auto-recover.result != 'skipped'`
  to fix an escalate-job condition. That commit did not exist on the
  branch; the actual top commit was `4b01163`. Devin then posted a
  follow-up "✅ Resolved" comment confirming the hallucinated fix.
  **Verify the diff before trusting "Resolved" comments.**
- **Sometimes over-confident on inferred file-line refs.** When a finding
  references a "line 303" that doesn't match anything in the file at
  that commit, recheck — Devin may be reasoning from a stale snapshot
  or an inferred line number.

## How findings are graded

Devin uses three severities visible on PR threads:

| Marker | Behavior |
|---|---|
| 🚩 / 🟡 / High / Bug | Real defect or near-defect. Apply or rebut. |
| 📝 Info | Worth knowing, not blocking. Often pre-existing or "becomes relevant when X is re-enabled." Safe to acknowledge and skip. |
| ✅ Resolved | Devin's self-reconciliation when a follow-up commit lands. **Verify** — Devin has hallucinated this confirmation at least once. |

## Cost / availability

- **Paid surface.** Subscription was $80/mo as of the cleanup window.
- **In-repo activation lane** — wired via
  `.github/workflows/devin-code-review.yml` (WR #15672), which calls the
  reusable `aaronsteers/devin-action` (SHA-pinned). Opt-in only: `/devin`
  slash command, the `devin-review` PR label, or manual dispatch. Requires
  the `DEVIN_API_KEY` repo secret (per cubic review) and the `DEVIN_ORG_ID`
  repo variable; the workflow soft-skips when either is missing. The earlier
  `scripts/call-devin-api.sh` + `.github/workflows/devin.yml` lane from
  PR #14375 never landed on `main`.
- **GitHub App review surface** — `devin-ai-integration[bot]` —
  always-on, posts review comments on PRs without any in-repo wiring.
  This is the lane that produced every "Devin Review found N issues"
  comment cited above.

## When to send work to Devin

- **Architectural diagnoses on hard bugs** — the kind where you want a
  cited explanation of why something fails, not just a patch. Worth
  the spend.
- **Cross-file refactors that touch the gate scripts or workflow YAML**
  — Devin is sharp on bash and YAML edge cases there.
- **PRs that touch `secret-persistence-guard.yml`,
  `agent-fallback.yml`, or any workflow with `pull_request_target`** —
  Devin's shell-syntax reflex makes it a good second pair of eyes on
  these specifically.

## When NOT to use Devin

- **One-off doc edits.** Overkill; Octopus + cubic are free and
  sufficient.
- **Anything where you need to be *certain* the fix landed** — verify
  the diff yourself; don't take Devin's "✅ Resolved" comment as proof.
- **Bulk WR generation / template scaffolding.** Use the Coder/Fixer
  persona (`scripts/openrouter-personas.js`) instead — cheaper per call
  and tuned to the WR template gate.
