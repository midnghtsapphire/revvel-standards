# Spec 07 — Consistency Exemption

Cross-system drift is normal and visible.

## Rule
- Drift between IRS/SOS/SAM/Play Store records is expected.
- WR tracks drift in `inventory/federal-and-state-records.md`.
- WR does not auto-correct drift.
- Sync only when required by downstream action (grant app, audit, bank change, etc.).
