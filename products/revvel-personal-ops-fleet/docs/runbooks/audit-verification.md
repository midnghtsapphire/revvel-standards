# Runbook — Audit verification

## Routine verification

```bash
revvel-ops verify-audit                                  # every chain in var/audit
python scripts/verify_audit_chain.py var/audit/<run>.jsonl   # one file, JSON report
```

A report contains `path`, `ok`, `events`, `errors[]`, `head`. Record the `head` hash in your
operations notes at the end of each session: it is a cheap external checkpoint.

## What is checked

1. `sequence` is monotonic from 0 with no gaps.
2. `prev_hash` of each event equals the previous `event_hash` (first links to 64 zeros).
3. `payload_hash` equals `SHA256(canonical(payload))`.
4. `event_hash` equals the recomputed hash over the sealed field set (timestamps normalized to
   canonical UTC so re-reading a file cannot change the hash).

## Demonstrating tamper evidence

```bash
python scripts/tamper_check_demo.py
```
Copies the newest chain to a temp directory, edits one payload, and shows verification flipping from
`True` to `False` with the offending line reported. The original log is never modified.

## Interpreting failures

| Error | Likely cause | Action |
| --- | --- | --- |
| `payload_hash mismatch` | A payload was edited in place | Incident; preserve and investigate |
| `event_hash mismatch` | Header field edited, or a version skew in the sealing fields | Check code version; if unchanged, incident |
| `prev_hash break` | A line was inserted, removed, or reordered | Incident; reconstruct from last good sequence |
| `sequence mismatch` | Concurrent writers or manual edit | Ensure one writer per run id |
| `file not found` | Wrong run id or cleaned `var/` | Confirm retention policy |

## Retention

400 days, and it must exceed every provider's trash/restore window. Archive whole files by run id;
never truncate. Offsite append-only replication is in the backlog (5.2) — until then, a deleted file
is undetectable, so keep periodic copies.
