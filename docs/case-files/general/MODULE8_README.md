# Module 8 — Real Columbus Public GIS Connector

Verified public sources:
- Building permit layer: https://arc.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer/5
- Layer schema: https://arc.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer/layers
- Citizen Access: https://portal.columbus.gov/Permits/Cap/CapHome.aspx?TabName=Building&module=Building

This module retrieves **public GIS permit records** from an actual identified City of Columbus ArcGIS REST layer, not an example server. It requests layer metadata, queries by exact parcel ID, supports bounded pagination, exports CSV and writes SHA-256 inventories. Test suite uses mocked network responses and does not claim live retrieval.

## Commands
```bash
python -m unittest discover -s hfmr -t . -p 'test_*.py' -q
python -m hfmr.columbus_cli metadata --output case001/columbus_layer.json
python -m hfmr.columbus_cli parcel --parcel YOUR_VERIFIED_PARCEL --output case001/permits.json
python -m hfmr.columbus_cli csv --input case001/permits.json --output case001/permits.csv
python -m hfmr.columbus_cli verify --input case001/permits.json
```

### Scope
The public GIS permit layer is **not the Accela portal's attachment API**. It may have incomplete historical coverage, and should not be treated as proof that a permit or construction event did not occur. For Accela, search publicly by parcel or address and remove default start date for records older than three years. Some attachments require separate records requests.

Do not infer concrete pour dates from issuance dates. No Columbus permit data has been downloaded during these offline tests.
