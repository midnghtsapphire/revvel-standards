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

## Required check (the only true gate)

- **`ci/circleci: lint-and-test`** — the real test + lint suite. This is the one
  check that protects `main`. If it is red, the change can break the repo. **Never
  force-merge over a red `lint-and-test`.**
- **`Vercel`** — deployment preview. Informational; a failure here is a deploy
  concern, not a reason to block a docs/logic merge, but investigate before override.

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
