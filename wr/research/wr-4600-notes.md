# WR-4600 Watchtower Notes

Follow-up notes for the WR-4600 Photon Bench harvest pipeline.

## Principles

- **WR-4200:** A fabricated citation is a P0 incident. Every URL must come from an API response, never constructed.
- **DELTA not breakthrough:** A quiet day is a success. Snapshots happen regardless.
- **Immutable snapshots:** Content-hashed, append-only.
- **Degrade honestly:** Shards needing a key return 0 rows with a procurement note. Never pad.
- **Adverse first:** The `adverse` shard runs before anything else.

## Pipeline

1. Self-test grounding gate (offline, deterministic, 17 checks).
2. Harvest across keyless APIs: NCBI E-utilities, ClinicalTrials.gov v2, Crossref.
3. Commit snapshot (quiet days included).
4. Summon ONE triage issue only on HARM/FLICKER/OCULAR rows.

## Schedule

- Cron: `17 6 * * *` (06:17 UTC daily)
- Manual dispatch supported.

## Validation Status

- harvest self-test: 17/17
- node tests: 9/9
- `watchtower.yml`: valid YAML
- `original.html`: 0 external resource loads
- markdown lints: clean

## Source of Truth

The `.md` files in `wr/research/` remain the canonical source. Dashboard embeds
are condensed views; when they drift, the markdown wins.
