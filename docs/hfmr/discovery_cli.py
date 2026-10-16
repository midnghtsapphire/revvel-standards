import argparse
import json
from .discovery import arcgis_catalog, stac_search, load_identity_rows, match_identity, inventory, verify_inventory

p = argparse.ArgumentParser(description="HFMR Module 5 historical catalog discovery")
s = p.add_subparsers(dest="command", required=True)
a = s.add_parser("arcgis-discover")
a.add_argument("--root", required=True)
a.add_argument("--output", required=True)
a = s.add_parser("stac-discover")
a.add_argument("--endpoint", required=True)
a.add_argument("--bbox", required=True)
a.add_argument("--start", required=True)
a.add_argument("--end", required=True)
a.add_argument("--output", required=True)
a = s.add_parser("match-records")
a.add_argument("--input", required=True)
a.add_argument("--address")
a.add_argument("--parcel")
a.add_argument("--aliases")
a.add_argument("--output", required=True)
a = s.add_parser("verify-inventory")
a.add_argument("--input", required=True)
v = p.parse_args()
if v.command == "arcgis-discover":
    result = inventory(arcgis_catalog(v.root), v.output)
elif v.command == "stac-discover":
    result = inventory(stac_search(v.endpoint, [float(x) for x in v.bbox.split(",")], v.start, v.end), v.output)
elif v.command == "match-records":
    result = inventory(
        match_identity(
            load_identity_rows(v.input), v.address, v.parcel, load_identity_rows(v.aliases) if v.aliases else None
        ),
        v.output,
    )
else:
    result = {"verified": verify_inventory(v.input)}
print(json.dumps(result, indent=2))
# A failed digest must not exit 0, or automation accepts a tampered inventory.
if v.command == "verify-inventory" and not result["verified"]:
    raise SystemExit(1)
