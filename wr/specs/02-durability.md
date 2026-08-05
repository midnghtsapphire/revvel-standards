# Spec 02 — Durability

Durability keeps WR readable and recoverable across tool failures.

## Storage promise
- All critical operations data is plain markdown.
- Weekly mirror job pushes repository snapshots to a second GitHub location (gist).
- Optional secondary upload targets (S3/B2-compatible) may be used when secrets are configured.

## Recovery promise
- Cold-start instructions in `README.md` are part of the durability contract.
- Any human or agent should be able to rebuild context from markdown + decisions log.

## Monthly export
- Export key docs as a release artifact PDF bundle each month:
  - `wr/NORTH_STAR.md`
  - `projects/_self/GRANTS_AND_COMPLIANCE.md`
  - `wr/memory/decisions.jsonl`
- Goal: preserve access even if platform tooling changes.
