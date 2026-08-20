# Merge & Override Policy

Single source of truth for **which checks must pass before merge**, which are
cosmetic automation, and **when an admin force-merge (override) is acceptable**.

The repository runs ~150 workflows. Most of them are orchestration/labeling
automation, not quality gates. Treating every yellow check as a blocker is what
let real work stall behind noise. This policy draws the line.

## TL;DR

| Situation | Can you merge? | How |
| --- | --- | --- |
| `ci/circleci: lint-and-test` is **green** | ✅ Yes | Normal merge |
| PR state is `blocked` (required review/check pending, cosmetic jobs running) | ✅ Yes | Admin override is acceptable |
| PR is a **draft** | ❌ No | Mark "Ready for review" first — no override exists |
| PR has **conflicts** (`dirty`) | ❌ No | Resolve the conflict — no override exists |
| `ci/circleci: lint-and-test` is **red** | ⛔ No | Fix the failure. Do **not** override |

## Required checks (ruleset `main`, id 17149543)

Codified in [`config/required-checks.yml`](../config/required-checks.yml) and
enforced by the active GitHub ruleset. These three protect `main`:

- **`ci/circleci: lint-and-test`** — the real test + lint suite. If it is red,
  the change can break the repo. **Never force-merge over a red `lint-and-test`.**
- **`check-for-scaffolding`** — anti-scaffolding gate (incomplete agent drafts).
- **`GitGuardian Security Checks`** — secret scan. A real finding is a stop sign.

### Informational only (never required)

See `config/required-checks.yml` → `informational` and
`config/known-red-checks.yml`. Includes:

- **Vercel ×3** (`standards`, `revvel-standards`, `marketplace-relister`) —
  account-blocked as of 2026-08-17. D022: disconnect until a deploy succeeds
  (`docs/PR_SIGNAL_HYGIENE.md`). Not a merge gate.
- **Octopus Review** — free-tier end-of-quota is expected (D023). Mute when
  exhausted; do not add as required.
- **RecurseML / Devin / AI PR review** — vendor/credit lanes; informational.

Do **not** add always-red vendor checks to the ruleset to "be safer," and do
**not** remove a real required check to make the list look green
(`GREEN_MAIN_STANDARD.md` rule 5 / WR #17738).

## Cosmetic automation (safe to bypass)

These appear as checks but are orchestration, not quality gates. A pending or
`skipped` result here is **not** a reason to hold a merge:

- `Route priority`, `PR Lifecycle Labels`, `CI Check Suite/Run Labels`,
  `Review State Labels`
- `Enable Auto-Merge`, `Disable Auto-Merge`, `Re-sync All Open PRs`,
  `Manual Re-evaluate Single PR`
- `Orchestrate Review Decision`, `Handle Changes Requested`,
  `Update Review Fix Status Badge`, `Annotate conflicts with originating-PR notes`
- `Auto-approve trusted-author PR`, `Sync to project board`, `guard`

## When admin override (force-merge) is acceptable

Force-merge means merging while branch protection reports `blocked` — via the
GitHub *"Merge without waiting for requirements to be met"* button or the merge
API. It is acceptable when **all** of these hold:

1. `ci/circleci: lint-and-test` is **green** (or genuinely not relevant to the change).
2. The only outstanding items are cosmetic automation checks or a missing
   auto-review that the change does not need.
3. There are **no merge conflicts**.
4. The change has been read by a human or a trusted reviewer agent.

If any of those fail, fix the cause instead of overriding.

## What override does NOT cover

- **Drafts** cannot be merged at all until marked ready — this is a hard GitHub
  gate, not a bypassable check.
- **Conflicts** must be resolved; there is no force path.

## Rationale

This policy exists because automation churn (auto-labels, re-sync jobs,
auto-merge toggles) was indistinguishable from real gates, so genuine work
queued behind cosmetic yellow checks. Keeping the required surface small — one
test job — keeps `main` safe while letting reviewed work land without ceremony.
