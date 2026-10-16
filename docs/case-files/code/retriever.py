"""Retrieve and preserve public Columbus ArcGIS records; no third-party packages."""
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import re
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://gis.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer"
LAYERS = {"building": 5, "engineering": 22}
MAX_BYTES = 6_000_000


def digest(data):
    return hashlib.sha256(data).hexdigest()


def fetch(url, retries=3):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname != "gis.columbus.gov" or not parsed.path.startswith("/arcgis/rest/services/Schemas/BuildingZoning/MapServer/"):
        raise ValueError("Unapproved API URL")
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ForensicFinders/1.0 (public records research)"})
            with urllib.request.urlopen(req, timeout=30) as response:
                final = urllib.parse.urlsplit(response.geturl())
                if final.hostname != "gis.columbus.gov" or final.scheme != "https":
                    raise ValueError("Unexpected redirect")
                raw = response.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise ValueError("Response too large")
            obj = json.loads(raw)
            if "error" in obj:
                raise RuntimeError(str(obj["error"]))
            return obj, digest(raw)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
            if attempt == retries - 1:
                raise
            time.sleep(2 ** attempt)


def choose_field(fields, candidates):
    names = {field["name"].upper(): field["name"] for field in fields if "name" in field}
    for candidate in candidates:
        if candidate.upper() in names:
            return names[candidate.upper()]
    return None


def collect(layer, number, street, start, end, getter=fetch):
    if layer not in LAYERS or not (1 <= number <= 99999) or not re.fullmatch(r"[A-Z]{2,25}", street) or not (1800 <= start <= end <= 2100):
        raise ValueError("Invalid search input")
    url = f"{BASE}/{LAYERS[layer]}"
    metadata, metadata_hash = getter(url + "?f=json")
    fields = metadata.get("fields", [])
    address = choose_field(fields, ["SITE_ADDRESS", "ADDRESS", "SITEADDR", "FULL_ADDRESS", "LOCATION_ADDRESS"])
    oid = metadata.get("objectIdField") or choose_field(fields, ["OBJECTID", "FID"])
    if not address or not oid:
        raise ValueError("Unrecognized source schema; manual field mapping required")
    # Query address without assuming historical-year columns exist. Filter years only
    # when a recognizable date/year field is available, and preserve raw records.
    year_field = choose_field(fields, ["ISSUED_YEAR", "FILED_YEAR", "PERMIT_YEAR", "YEAR"])
    where = f"UPPER({address}) LIKE '%{number}%{street}%'"
    if year_field:
        where += f" AND {year_field} >= {start} AND {year_field} <= {end}"
    records, pages, offset = [], [], 0
    limit = 1000
    while offset < limit:
        size = min(100, limit - offset)
        query = urllib.parse.urlencode({"f": "json", "where": where, "outFields": "*", "returnGeometry": "false", "orderByFields": f"{oid} ASC", "resultOffset": offset, "resultRecordCount": size})
        payload, page_hash = getter(url + "/query?" + query)
        batch = [f["attributes"] for f in payload.get("features", [])]
        pages.append({"offset": offset, "count": len(batch), "sha256": page_hash})
        records.extend(batch)
        offset += len(batch)
        if not batch or (len(batch) < size and not payload.get("exceededTransferLimit")):
            break
    return {"layer": layer, "source": url, "metadata_sha256": metadata_hash, "where": where, "requested_years": [start, end], "year_filter_applied": bool(year_field), "records": records, "pages": pages, "truncated": len(records) >= limit}


def run(output, number=1546, street="HIGH", start=2000, end=2010, collector=collect):
    directory = pathlib.Path(output)
    directory.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    report = {"case": "CASE001", "run_id": stamp, "target": f"{number} N {street} ST, Columbus, OH", "files": [], "errors": [], "complete": False}
    for layer in LAYERS:
        try:
            result = collector(layer, number, street, start, end)
            data = json.dumps(result, indent=2, sort_keys=True).encode("utf-8")
            name = f"{stamp}_{layer}.json"
            (directory / name).write_bytes(data)
            report["files"].append({"name": name, "sha256": digest(data), "count": len(result["records"]), "truncated": result["truncated"]})
        except Exception as error:
            report["errors"].append({"layer": layer, "error_type": type(error).__name__, "message": str(error)})
    report["complete"] = not report["errors"] and not any(x["truncated"] for x in report["files"])
    report["caution"] = "GIS layer identity, addresses, parcels, dates, and historical relevance require independent verification. No results do not establish absence of construction."
    (directory / "manifest.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def verify(output):
    directory = pathlib.Path(output)
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    return [item["name"] for item in manifest["files"] if not (directory / item["name"]).is_file() or digest((directory / item["name"]).read_bytes()) != item["sha256"]]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="evidence")
    parser.add_argument("--verify")
    parser.add_argument("--number", type=int, default=1546)
    parser.add_argument("--street", default="HIGH")
    parser.add_argument("--start", type=int, default=2000)
    parser.add_argument("--end", type=int, default=2010)
    args = parser.parse_args()
    if args.verify:
        failures = verify(args.verify)
        print(json.dumps({"integrity_failures": failures}))
        raise SystemExit(bool(failures))
    report = run(args.output, args.number, args.street.upper(), args.start, args.end)
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report["complete"] else 1)


if __name__ == "__main__":
    main()
