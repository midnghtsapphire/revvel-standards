import argparse
import json
from .municipal import ingest_permits, attachments_from_csv, save_chronology, records_request

p = argparse.ArgumentParser(description="HFMR public municipal records adapter")
s = p.add_subparsers(dest="cmd", required=True)
a = s.add_parser("ingest")
a.add_argument("--input", required=True)
a.add_argument("--output", required=True)
a.add_argument("--mapping", required=True)
a.add_argument("--source-url", default="")
a = s.add_parser("attachments")
a.add_argument("--input", required=True)
a.add_argument("--output", required=True)
a.add_argument("--mapping", required=True)
a.add_argument("--allow-host", action="append", required=True)
a = s.add_parser("chronology")
a.add_argument("--input", required=True)
a.add_argument("--output", required=True)
a.add_argument("--address")
a = s.add_parser("request")
a.add_argument("--address", required=True)
a.add_argument("--start", type=int, default=2000)
a.add_argument("--end", type=int, default=2010)
v = p.parse_args()
if v.cmd == "ingest":
    result = ingest_permits(v.input, v.output, json.loads(v.mapping), source_url=v.source_url)
elif v.cmd == "attachments":
    result = attachments_from_csv(v.input, v.output, json.loads(v.mapping), v.allow_host)
elif v.cmd == "chronology":
    result = save_chronology(v.input, v.output, v.address)
else:
    result = records_request(v.address, year_start=v.start, year_end=v.end)
print(result if isinstance(result, str) else json.dumps({"records": result}))
