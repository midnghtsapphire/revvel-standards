# Module 7 — Municipal Permit Intelligence

Public municipal construction record processing, preserving source file SHA-256 and original row references.

## Capabilities
- Import public Accela/other municipal CSV exports with **explicit** column mapping.
- Normalize permits, identify construction-related descriptions, and build evidence-linked timelines.
- Build a Module 6 retrieval queue from public attachment-index CSVs, with explicit allowed hosts.
- Generate public records request text for unavailable inspection notes, site plans and concrete logs.
- Never substitute issue/inspection dates for an actual concrete-pour date.

## Example CLI
```bash
python -m hfmr.municipal_cli ingest --input permits.csv --output case001/permits.json --mapping '{"record_id":"PermitNumber","address":"Address","issue_date":"IssuedDate","description":"Description"}'
python -m hfmr.municipal_cli chronology --input case001/permits.json --output case001/construction_timeline.json --address '1546 N High St'
python -m hfmr.municipal_cli attachments --input attachment_index.csv --output case001/attachments_queue.csv --mapping '{"record_id":"PermitNumber","document_url":"URL","document_type":"Type"}' --allow-host portal.columbus.gov
python -m hfmr.municipal_cli request --address '1546 N High St' --start 2000 --end 2010
python -m unittest discover -s hfmr -t . -p 'test_*.py' -q
```

## Critical limitations
This module **does not** log into Accela, automate CAPTCHA challenges, discover private APIs, or extract unlisted attachments. The CSV export or public attachment index must be obtained first. It does not establish construction dates from permit issuance, and does not recreate missing original blueprints. The output manifest is hash-linked only; trusted signing and WORM remain future work.

Next: verified public Columbus connector and metadata inspection of downloadable permit attachments; integrate extracted document text and cross-reference against dated photos, building inspection logs and historic parcel changes.
