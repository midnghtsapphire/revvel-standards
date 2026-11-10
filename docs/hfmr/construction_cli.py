import argparse
import json
from .construction import import_csv, timeline, arcgis_query, scrape_public_links, verify_import, request_text

p = argparse.ArgumentParser()
s = p.add_subparsers(dest="command", required=True)
a = s.add_parser("import-csv")
a.add_argument("--input", required=True)
a.add_argument("--output", required=True)
a.add_argument("--mapping")
a = s.add_parser("timeline")
a.add_argument("--input", required=True)
a.add_argument("--address")
a.add_argument("--parcel")
a = s.add_parser("arcgis")
a.add_argument("--layer", required=True)
a.add_argument("--where", required=True)
a.add_argument("--output", required=True)
a.add_argument("--max-records", type=int, default=1000)
a = s.add_parser("scrape-links")
a.add_argument("--html", required=True)
a.add_argument("--base-url", required=True)
a.add_argument("--allow-host", required=True)
a = s.add_parser("verify")
a.add_argument("--manifest", required=True)
a = s.add_parser("records-request")
a.add_argument("--address", required=True)
a.add_argument("--parcel", default="")
a.add_argument("--start", default="2000")
a.add_argument("--end", default="2010")
v = p.parse_args()
if v.command == "import-csv":
    result = import_csv(v.input, v.output, json.loads(v.mapping) if v.mapping else None)
elif v.command == "timeline":
    result = timeline(v.input, v.address, v.parcel)
elif v.command == "arcgis":
    from pathlib import Path

    dest = Path(v.output)
    if dest.exists():
        raise FileExistsError(dest)
    result = arcgis_query(v.layer, v.where, max_records=v.max_records)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(result, indent=2))
    result = {"records": len(result), "output": str(dest)}
elif v.command == "scrape-links":
    result = scrape_public_links(v.html, v.base_url, v.allow_host)
elif v.command == "verify":
    result = {"verified": verify_import(v.manifest)}
else:
    result = request_text(v.address, v.parcel, v.start, v.end)
print(result if isinstance(result, str) else json.dumps(result, indent=2))
# A failed import verification must not exit 0, or automation accepts a tampered import.
if v.command == "verify" and not result["verified"]:
    raise SystemExit(1)
