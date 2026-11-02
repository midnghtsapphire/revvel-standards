# Module 4 — Construction Records & Historical Event Intelligence

This extends Module 3 with **public permit records**, inspections, site plans, document link extraction, and public-records request generation.

## CLI
```bash
python -m unittest discover -s . -p 'test_*.py'
python -m hfmr.construction_cli import-csv --input permits.csv --output normalized.csv --mapping '{"record_id":"PermitNumber","address":"Address","issue_date":"IssuedDate"}'
python -m hfmr.construction_cli timeline --input normalized.csv --address '1546 N High St'
python -m hfmr.construction_cli verify --manifest normalized.manifest.json
python -m hfmr.construction_cli records-request --address '1546 N High St' --start 2000 --end 2010
python -m hfmr.construction_cli scrape-links --html saved_public_page.html --base-url https://example.gov/permits --allow-host example.gov
python -m hfmr.construction_cli arcgis --layer https://example.gov/arcgis/rest/services/Permits/FeatureServer/0 --where '1=1' --output raw_permits.json
```

**ArcGIS layer is an example URL**: discover the real layer and field names before use. Limit queries and respect portal access conditions. For Accela, use the public website's CSV export or a documented authorized API; do not bypass access controls or CAPTCHAs.

## Columbus sources (verified public entry points)
- https://portal.columbus.gov/permits/ (Citizen Access; search by address or parcel, remove default start date for old records)
- https://www.columbus.gov/Business-Development/Building-Zoning-Services/Records-Research (records request)
- https://www.columbus.gov/files/sharedassets/city/v/4/building-and-zoning/document-library/request-for-records-or-research-2026.pdf
- https://auditor.franklincountyohio.gov/Auditor/FTP (historical GIS shapefiles back to 2002)

## Important limitations
- Permit issuance does not establish when concrete was poured. Seek inspection notes, daily construction logs, dated photographs, delivery tickets, and verified imagery.
- Columbus's 2026 request form states **plans prior to 2011 are not available due to retention schedule**. Historical indexes and other surviving records may still exist.
- This module does not automatically search Accela, download private attachments, or reconstruct missing blueprints.
- Drawings generated from measurements must be labeled **reconstructions**, not original plans.
- Records can be missing, misdated, duplicated, or indexed under former addresses/parcel IDs.
- Hash manifests detect file modification relative to a trusted manifest; they are not cryptographic signatures or WORM storage.
