# Subscription & Trial Tracker

A lightweight, self-maintaining job that tracks every paid (or trial) third-party
tool, GitHub App, and SaaS used across MIDNGHTSAPPHIRE / Revvel repositories — so
a free trial never lapses silently and an auto-renewal never charges us by surprise.

It was created in response to the **RecurseML 14-day trial** (started 2026-06-13,
expires 2026-06-27): a trial like that converts to a ~$250/year plan unless a
human decides to keep or cancel it before the clock runs out. This job makes that
clock visible and actionable.

## How it works

```text
data/subscriptions.yml            ← single source of truth (you edit this)
        │
        ▼
scripts/subscription-tracker.js   ← pure verdict engine (trial-expiry / renewal)
        │
        ▼
.github/workflows/                ← weekly sweep, upserts ONE tracking issue
  subscription-tracker.yml
```

- **`data/subscriptions.yml`** — the inventory. Each entry records the vendor,
  status (`trial` / `active` / `cancelled`), trial/renewal dates, cost, the
  repositories it applies to, and where to manage it. See the field reference at
  the top of that file.
- **`scripts/subscription-tracker.js`** — computes, per subscription, the
  *effective due date* (a trial's `trial_end` while on trial, otherwise
  `renewal_date`) and a verdict: `ok`, `due_soon`, `expired`, `unknown`, or
  `cancelled`. All logic is pure and clock-injectable, and is unit-tested in
  `tests/subscription-tracker.test.js`.
- **`.github/workflows/subscription-tracker.yml`** — runs weekly (Monday 13:00 UTC) and
  on demand. It renders the report and **upserts a single issue** titled
  `📅 Subscription & Trial Tracker` (label: `subscriptions`), editing the same
  issue in place so trackers never pile up. Anything expiring or renewing inside
  the warning window (default **7 days**) is listed under **Action needed**.

## Run it locally

```bash
# Print the current report (Markdown, same body the issue gets)
node scripts/subscription-tracker.js

# Use a custom warning window
node scripts/subscription-tracker.js --warn-within-days=14

# Exit non-zero if anything is expired or due soon (handy for gating)
node scripts/subscription-tracker.js --check
```

Run it on demand in CI from **Actions → Subscription & Trial Tracker → Run
workflow** (optionally overriding the warning window).

## Add or update a subscription

Edit `data/subscriptions.yml`. To track a new tool, add an entry with at least a
`name`, `status`, and the relevant `trial_end` **or** `renewal_date`. Use `null`
(not a guess) for any date you don't know yet — the tracker surfaces those under
**Missing dates** so a human can fill them in. Set `repositories` to `all` or a
list of `owner/repo`.

## RecurseML trial decision

The RecurseML decision gate lives in `skills/recurse-ml/SKILL.md`. Record the
keep/cancel decision in `docs/DARE_LOG.md` before `trial_end` (2026-06-27). The
RecurseML PR-review workflow itself is `.github/workflows/recurse-ml.yml`.
