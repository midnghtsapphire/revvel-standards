# Spec 08 — Migration Cron

Migration cron proposes portfolio migrations under strict controls.

## Priority model
- Uses tiers 1-9 from `wr/cron/MIGRATION_CRON.md`.
- Prioritizes earning protection, then revenue-ready work, then orphaned candidates.
- Never migrates junk/parked archive items.

## Safety and rate limits
- Respects Quiet Mode (`exit-quiet-mode` gate).
- One proposal per day maximum.
- Three consecutive 👎 reactions trigger 7-day hibernation.
- Skips repositories without `MONETIZATION.md` unless tagged `creative` or `nonprofit`.

## Companion doc
- Operational details live in `wr/cron/MIGRATION_CRON.md`.
