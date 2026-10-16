import argparse
import json
from .columbus import metadata, query_by_parcel, query, save, verify, export_csv

p = argparse.ArgumentParser(description="Columbus public permit GIS connector")
s = p.add_subparsers(dest="cmd", required=True)
a = s.add_parser("metadata")
a.add_argument("--output", required=True)
a = s.add_parser("parcel")
a.add_argument("--parcel", required=True)
a.add_argument("--output", required=True)
a.add_argument("--max-records", type=int, default=100)
a = s.add_parser("query")
a.add_argument("--where", required=True)
a.add_argument("--output", required=True)
a.add_argument("--max-records", type=int, default=100)
a = s.add_parser("verify")
a.add_argument("--input", required=True)
a = s.add_parser("csv")
a.add_argument("--input", required=True)
a.add_argument("--output", required=True)
v = p.parse_args()
if v.cmd == "metadata":
    result = save({"records": [], "layer_metadata": metadata()}, v.output)
elif v.cmd == "parcel":
    result = save(query_by_parcel(v.parcel, max_records=v.max_records), v.output)
elif v.cmd == "query":
    result = save(query(v.where, max_records=v.max_records), v.output)
elif v.cmd == "verify":
    result = {"verified": verify(v.input)}
else:
    result = {"exported_records": export_csv(v.input, v.output)}
print(json.dumps(result, indent=2))
