# Module 11 — Construction Documentation Follow-Up & Evidence Chronology

**Purpose:** turn an actual Module 9/10 `acquisition_report.json` into a deduplicated permit follow-up queue, date-qualified chronology, and a ready-to-edit public-records request for plans, photos, excavation and concrete-placement evidence.

## CLI
```bash
python -m unittest discover -s hfmr -t . -p 'test_*.py' -q
python -m hfmr.case001_acquire_cli --output case001_live_003 --number 1546 --street HIGH --start 2000 --end 2010
python -m hfmr.records_followup_cli --report case001_live_003/acquisition_report.json --output case001_followup_003
```

## Output
- `followups.json`: one record per layer + permit ID, document types to request, classification terms, parcel candidates.
- `chronology.json`: permit issuance/filing dates only; no invented concrete-pour dates.
- `records_request.txt`: editable public-records request with actual permit identifiers.
- `status.json`: source report SHA-256, errors, retrieval completeness.
- `.sha256` manifests for generated files.

**Status:** This module works offline against saved reports; the Columbus live acquisition has not succeeded in this environment. A report with zero matches or failed requests is not evidence of no construction. The module does not claim to have retrieved photos, blueprints, or inspection logs. An email draft is not sent automatically. If original plans were destroyed, request surviving inspection notes, archived indexes, photographs, and other independently held copies.
