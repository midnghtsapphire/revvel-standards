# ADR 0004 — Append-only JSONL audit log

- Status: Accepted
- Date: 2026-08-03

## Context

The audit trail is the foundation for every other safety claim. It must be simple enough to trust,
inspectable without tooling, and hard to alter quietly.

## Decision

One JSONL file per run under `var/audit/<run_id>.jsonl`. Writers open in append mode and `fsync` per
event. Records are sealed with `payload_hash` and `event_hash` linked by `prev_hash` from a genesis
hash of 64 zeros. Reopening a run resumes the chain from the last line. Content-bearing and
secret-like keys are redacted to `redacted:sha256:<16 hex>` before writing.

## Consequences

- Verification is a pure function (`verify_chain`) with no external dependencies.
- Tamper evidence is demonstrable (`scripts/tamper_check_demo.py`).
- Whole-file deletion is still possible; offsite append-only replication is in the backlog.
- No database, no migrations, human-greppable logs.
