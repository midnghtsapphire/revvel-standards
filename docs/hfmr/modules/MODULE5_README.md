# Module 5 — Public Catalog Discovery & Parcel Identity

Extends Modules 1–4. Provides:
- ArcGIS REST service listing from an explicitly specified public endpoint (discovery only).
- STAC GET search with bounded geographic area, acquisition-date window, and returned asset links.
- Exact address/parcel matching with **source-documented** address aliases; no fuzzy identity assertions.
- Write-once JSON discovery inventories and SHA-256 tamper checks.
- CLI interface and offline unit tests.

## Run
```bash
python -m unittest discover -s hfmr -t . -p 'test_*.py' -q
python -m hfmr.discovery_cli arcgis-discover --root https://YOUR_PUBLIC_SERVER/arcgis/rest/services --output discovery/arcgis.json
python -m hfmr.discovery_cli stac-discover --endpoint https://YOUR_PUBLIC_STAC/search --bbox '-83.02,39.98,-83.00,40.00' --start 2005-01-01 --end 2007-12-31 --output discovery/stac.json
python -m hfmr.discovery_cli match-records --input normalized.csv --address '1546 N High St' --aliases verified_aliases.csv --output discovery/matches.json
python -m hfmr.discovery_cli verify-inventory --input discovery/matches.json
```

**Data acquisition is not automatic in this module.** Catalog discovery is performed only for explicit endpoints. It does not circumvent login, robots restrictions, CAPTCHAs, or access controls. Source registry entries are leads until the actual dataset and acquisition date are verified.

**Address warning:** Abbreviations such as N versus NORTH are not treated as identical without a documented alias. A permit date is not a concrete-pour date. No physical reconstruction can be presented as an original blueprint.

**Next:** Discover and validate actual Columbus ArcGIS and STAC endpoints; build service-layer metadata inspection, safe paginated exports, verified address-alias table, and archive availability matrix. The sample CLI hosts above are placeholders.
