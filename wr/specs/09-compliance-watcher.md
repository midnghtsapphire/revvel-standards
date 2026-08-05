# Spec 09 — Compliance Watcher

Compliance Watcher is the only cron that pierces Quiet Mode.

## Tracked records
- CAGE 8ZRW3 (XI Website Solutions LLC) — expires 2026-05-05
- CAGE 90SN0 (Freedom Angel Corp) — expires 2026-05-14
- DUNS records linked to above entities
- Annual tax calendar dates:
  - Jan 31
  - Mar 15
  - Apr 15
  - May 15
  - Sep 15
  - Oct 15
  - Quarterly estimates
- Form 990-N auto-revocation risk (if nonprofit arm activates)
- LLC registered agent renewals (as populated)
- CA SOS renewal for Angel Reporter LLC

## Alerting rules
- Alert thresholds: 60 / 30 / 14 / 7 / 3 / 1 days before expiration.
- Alerts open GitHub issues with label `urgent-compliance`.
- Assignee: `midnghtsapphire`.
- Never silent; never deferrable.
