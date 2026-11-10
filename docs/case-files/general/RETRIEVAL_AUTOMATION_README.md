# Forensic Finders — Autonomous Public Records Retrieval

This repository-ready project builds on HFMR Modules 1–17. The new `hfmr.auto_retrieve` component supports scheduled public ArcGIS permit acquisition from **actual City of Columbus endpoints**, schema discovery, deterministic query building, bounded pagination, SQLite record upsert, timestamped immutable raw JSON snapshots, SHA-256 manifests, error reporting, and verification. GitHub Actions provides a manual trigger and weekly schedule, plus downloadable evidence artifacts.

## Local quickstart
```bash
python -m unittest discover -s tests -v
python -m hfmr.auto_retrieve acquire --output evidence --number 1546 --street HIGH --start 2000 --end 2010
python -m hfmr.auto_retrieve verify --output evidence
```

## GitHub
1. Create a private repository (e.g. `midnghtsapphire/forensic-finders-records`). Upload the contents of this ZIP to the repository root.
2. Enable Actions. Run **Public permit acquisition** via Actions > Run workflow, or let its weekly schedule run.
3. Download the evidence artifact from the workflow run. Artifacts expire according to configured retention; archive separately if preservation is required.
4. Review `*_manifest.json`, JSON source snapshots and `index.sqlite3`. Failures produce an incomplete manifest and a nonzero exit code.

## Limits / threat model
- No CAPTCHA bypass, private portal scraping, or unauthorized data access. An approved host and REST path are required.
- These GIS permit layers are **not** the Accela attachments API; blueprints and inspections require separate public records access.
- The query is a broad address substring match and **may include neighboring addresses**; manually verify each match and parcel.
- A missing permit does not prove an absence of construction. Issuance dates are not concrete placement dates.
- GitHub Actions artifact retention is temporary, not forensic-grade archival storage; hashes are integrity checks, not signed chain of custody.
- No live City of Columbus API retrieval has been verified in this build environment. Network-backed integration testing remains pending.
- A default GitHub hosted runner has network access, but success is dependent on the source server and its terms, schema and availability.
- Not a new or experimentally validated sensor algorithm; it is a deployable acquisition workflow.

## Further engineering
- Implement schema-driven address matching and `returnIdsOnly` pagination for large queries.
- Add official parcel historical crosswalk, Accela public export adapter, retention/response status, OCR and cited construction-event extraction.
- Consider Gitee CI using its own workflow syntax; the supplied YAML is for GitHub Actions only.
