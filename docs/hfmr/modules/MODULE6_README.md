# Module 6 — Automated public archive retrieval

This module builds on Modules 1–5 and adds batch retrieval of **public HTTPS files** with explicit host allowlists, per-file size limits, bounded retries, non-overwriting storage, SHA-256 manifests, resumable-by-skipping-verified-items behavior, and integrity rechecks. It is not byte-range download resumption.

## Quick start
```bash
python -m unittest discover -s hfmr -t . -p 'test_*.py' -q
python -m hfmr.retrieval_cli queue-stac --inventory discovery/stac.json --output queue.csv --allow-host data.example.gov
python -m hfmr.retrieval_cli retrieve --queue queue.csv --output CASE001/retrieved --allow-host data.example.gov --max-mb 100 --max-items 100
python -m hfmr.retrieval_cli verify --output CASE001/retrieved
```

Queue CSV columns: `source_id,url,category,claimed_acquisition_date,date_basis,case_id`. At minimum `source_id,url` are required. Use actual public download URLs, not search-result pages. The example host above is a placeholder.

**Limitations:** Does not automate Columbus Accela portal authentication, bypass access restrictions, solve CAPTCHAs, or infer that permit issuance equals concrete placement. Does not yet crawl linked permit attachments, parse PDFs/blueprints, provide distributed rate limiting, enforce IP-level SSRF restrictions or implement cryptographic signatures. Use only trusted, explicitly allowlisted public hosts; redirect validation occurs after the HTTP client has followed redirects, so this is not suitable for untrusted arbitrary URLs without a hardened network egress proxy. No live records are bundled.

For historical permits, obtain the city's public CSV export or an authorized API endpoint, normalize using Module 4, then use this module to retrieve verified public document links. Maintain acquisition dates separately from retrieval timestamps.
