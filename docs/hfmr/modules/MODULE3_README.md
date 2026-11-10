# Module 3 — Historical Archive Acquisition (2026-10-09)

Extends the original Module 2 code with `hfmr/acquire.py`, HTTPS-only allowlisted bounded acquisition, original-byte SHA-256 hashing, HTTP provenance, no-overwrite manifests, tamper verification, and a registry timeline that explicitly labels acquisition dates as unverified. No external archive has been downloaded by this module. The Case 001 archive registry is a list of research leads, not independently authenticated source records.

## Commands

```bash
python -m unittest discover -s hfmr -t . -p 'test_*.py'
python -m hfmr archive-timeline --registry source_registry.csv
python -m hfmr archive-download --url 'https://example.org/data.tif' --allow-host example.org --output raw/data.tif --manifest manifests/data.json --max-mb 100
python -m hfmr download-verify --manifest manifests/data.json
python -m hfmr archive-inspect --input raw/data.tif
```

`example.org` is a placeholder, not a dataset. Use the real host explicitly. The downloader accepts up to 2 GiB via `--max-mb` and defaults to 100 MiB. Large CLIF archives require future chunking/resume support. HTTPS redirect targets must also be on the allowlist. The current downloader does not prevent DNS rebinding/private-address routing in hostile environments; run in an egress-restricted environment and add DNS/IP policy and network-level controls before deployment. The manifest's file path is local; move the manifest and raw data together only after updating paths in a separately tracked event.

<!-- Original: Redirects are validated before they are followed: `fetch` installs a redirect handler (`hfmr/safe_redirect.py`) that runs the allowlist check on every `Location`, so a redirect to an unapproved host is refused without being requested. The DNS/private-address caveat above still applies to allowlisted hosts.
  Reason: the claim held only for the default opener; a caller-supplied opener bypasses the handler. -->
With the default opener, redirects are validated before they are followed: `fetch` installs a redirect handler (`hfmr/safe_redirect.py`) that runs the allowlist check on every `Location`, so a redirect to an unapproved host is refused without being requested. A caller that passes its own `opener` bypasses that handler — `fetch` then only checks the final URL after the redirect has already been requested — so such a caller must enforce the same policy itself, for example by building its opener with `checked_urlopen`. The DNS/private-address caveat above still applies to allowlisted hosts.

## Remaining engineering

- Live catalog adapters: STAC, ArcGIS REST, WMS/WCS, directory listings, institution-specific CLIF archive.
- Authenticated acquisition-date and coverage metadata; licensing checks and archive citations.
- Streaming/ranged resumable large downloads and remote checksum validation.
- Raster registration error estimates, SAR SLC phase-capability checks, LiDAR ingestion.
- Cryptographic signatures, independent timestamping and WORM storage.
- Blind sensor validation and real case-data analysis.

Do not infer metallic composition or remains from imagery or anomaly maps.
