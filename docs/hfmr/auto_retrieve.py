"""Verified public ArcGIS retrieval, resilient pagination, SQLite state and evidence manifests."""

import argparse
import datetime
import hashlib
# unused (flake8 F401), kept for reference: import ipaddress
import json
# unused (flake8 F401), kept for reference: import os
import pathlib
import re
# unused (flake8 F401), kept for reference: import socket
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
# unused (flake8 F401), kept for reference: from contextlib import closing

DEFAULT_LAYERS = {
    "building": "https://gis.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer/5",
    "site_engineering": "https://gis.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer/22",
}
HOSTS = {"gis.columbus.gov", "arc.columbus.gov", "maps2.columbus.gov"}


def validate_url(url):
    p = urllib.parse.urlsplit(url)
    if p.scheme != "https" or p.hostname not in HOSTS or p.username or p.password or p.port not in (None, 443):
        raise ValueError("Unapproved URL")
    if not re.fullmatch(r"/arcgis/rest/services/Schemas/BuildingZoning/MapServer/(5|22)(/query)?", p.path):
        raise ValueError("Unapproved path")
    return url


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch_json(url, opener=None, retries=3, timeout=25):
    validate_url(url)
    opener = opener or urllib.request.build_opener(SafeRedirect())
    for attempt in range(retries):
        try:
            with opener.open(
                urllib.request.Request(url, headers={"User-Agent": "ForensicFinders-public-records-research/1.0"}),
                timeout=timeout,
            ) as r:
                validate_url(r.geturl())
                raw = r.read(6_000_001)
            if len(raw) > 6_000_000:
                raise ValueError("Response too large")
            data = json.loads(raw)
            if "error" in data:
                raise RuntimeError("ArcGIS: " + str(data["error"]))
            return data, hashlib.sha256(raw).hexdigest()
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            if isinstance(e, urllib.error.HTTPError) and e.code not in (429, 500, 502, 503, 504):
                raise
            if attempt == retries - 1:
                raise
            time.sleep(min(2**attempt, 4))


def query_layer(url, where, fetcher=fetch_json, cap=1000):
    if cap < 1 or cap > 10000:
        raise ValueError("cap outside range")
    meta, mdig = fetcher(url + "?f=json")
    fields = {x["name"] for x in meta.get("fields", [])}
    required = {"OBJECTID", "SITE_ADDRESS", "B1_ALT_ID", "B1_PARCEL_NBR"}
    if not required.issubset(fields):
        raise ValueError("Missing expected fields: " + str(required - fields))
    records = []
    pages = []
    offset = 0
    while len(records) < cap:
        n = min(200, cap - len(records))
        q = urllib.parse.urlencode(
            {
                "f": "json",
                "where": where,
                "outFields": "*",
                "returnGeometry": "false",
                "resultOffset": offset,
                "resultRecordCount": n,
                "orderByFields": "OBJECTID ASC",
            }
        )
        data, digest = fetcher(url + "/query?" + q)
        batch = [f["attributes"] for f in data.get("features", [])]
        pages.append({"offset": offset, "count": len(batch), "sha256": digest})
        records += batch
        if not batch or (len(batch) < n and not data.get("exceededTransferLimit")):
            break
        offset += len(batch)
    return {"source": url, "schema_sha256": mdig, "records": records, "pages": pages, "truncated": len(records) >= cap}


def address_query(number, street, year_start, year_end, fields):
    if not (
        isinstance(number, int)
        and 1 <= number <= 99999
        and re.fullmatch("[A-Z]{2,25}", street)
        and 1800 <= year_start <= year_end <= 2100
    ):
        raise ValueError("Invalid query")
    year = "ISSUED_YEAR" if "ISSUED_YEAR" in fields else "FILED_YEAR"
    if year not in fields:
        raise ValueError("No year field")
    return f"SITE_ADDRESS LIKE '%{number}%{street}%' AND {year} >= {year_start} AND {year} <= {year_end}"


def init_db(conn):
    conn.execute(
        "CREATE TABLE IF NOT EXISTS runs (run_id TEXT PRIMARY KEY, run_at TEXT NOT NULL, status TEXT NOT NULL, manifest TEXT)"  # noqa: E501
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS records (source TEXT NOT NULL, objectid TEXT NOT NULL, content_hash TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(source,objectid))"  # noqa: E501
    )
    conn.commit()


def save_run(output, results, errors):
    out = pathlib.Path(output)
    out.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(out / "index.sqlite3")
    init_db(conn)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    manifest = {
        "run_id": stamp,
        "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "layers": {},
        "errors": errors,
        "complete": not bool(errors),
    }
    for label, result in results.items():
        raw = json.dumps(result, sort_keys=True, indent=2, default=str).encode()
        p = out / f"{stamp}_{label}.json"
        p.write_bytes(raw)
        manifest["layers"][label] = {
            "file": p.name,
            "sha256": hashlib.sha256(raw).hexdigest(),
            "records": len(result["records"]),
            "truncated": result["truncated"],
            "source": result["source"],
            "pages": result["pages"],
        }
        for row in result["records"]:
            oid = row.get("OBJECTID")
            if oid is None:
                continue
            payload = json.dumps(row, sort_keys=True, default=str)
            conn.execute(
                "INSERT INTO records(source,objectid,content_hash,payload) VALUES (?,?,?,?) ON CONFLICT(source,objectid) DO UPDATE SET content_hash=excluded.content_hash,payload=excluded.payload",  # noqa: E501
                (result["source"], str(oid), hashlib.sha256(payload.encode()).hexdigest(), payload),
            )
    data = json.dumps(manifest, indent=2, sort_keys=True).encode()
    m = out / f"{stamp}_manifest.json"
    m.write_bytes(data)
    (out / f"{stamp}_manifest.sha256").write_text(hashlib.sha256(data).hexdigest() + "  " + m.name + "\n")
    conn.execute(
        "INSERT INTO runs VALUES(?,?,?,?)",
        (stamp, manifest["retrieved_at"], "complete" if not errors else "partial", m.name),
    )
    conn.commit()
    conn.close()
    return manifest


def acquire(output, number=1546, street="HIGH", start=2000, end=2010, fetcher=fetch_json, cap=1000):
    results = {}
    errors = []
    for label, url in DEFAULT_LAYERS.items():
        try:
            meta, _ = fetcher(url + "?f=json")
            fields = {f["name"] for f in meta.get("fields", [])}
            where = address_query(number, street, start, end, fields)
            results[label] = query_layer(url, where, fetcher=fetcher, cap=cap)
        except Exception as exc:
            errors.append({"layer": label, "error_type": type(exc).__name__, "detail": str(exc)})
    return save_run(output, results, errors)


def verify(output):
    out = pathlib.Path(output)
    errors = []
    manifests = sorted(out.glob("*_manifest.json"))
    # An evidence set with no manifest has verified nothing; that is a failure, not a pass.
    if not manifests:
        errors.append(str(out) + ": no manifest found")
    # Original: for m in out.glob("*_manifest.json"):
    for m in manifests:
        # Original (loop body, unguarded):
        #     sha = m.with_suffix(".sha256")
        #     if not sha.exists() or hashlib.sha256(m.read_bytes()).hexdigest() != sha.read_text().split()[0]:
        #         errors.append(str(m) + ": manifest invalid")
        #         continue
        #     data = json.loads(m.read_text())
        #     for item in data["layers"].values():
        #         p = out / item["file"]
        #         if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest() != item["sha256"]:
        #             errors.append(str(p) + ": data invalid")
        #   an empty/garbled checksum sidecar or malformed manifest raised instead of failing.
        try:
            sha = m.with_suffix(".sha256")
            if not sha.exists() or hashlib.sha256(m.read_bytes()).hexdigest() != sha.read_text().split()[0]:
                errors.append(str(m) + ": manifest invalid")
                continue
            data = json.loads(m.read_text())
            for item in data["layers"].values():
                p = out / item["file"]
                if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest() != item["sha256"]:
                    errors.append(str(p) + ": data invalid")
        except (OSError, ValueError, IndexError, KeyError, TypeError, AttributeError) as exc:
            errors.append(f"{m}: manifest invalid ({type(exc).__name__})")
    return errors


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="command", required=True)
    a = sub.add_parser("acquire")
    a.add_argument("--output", default="evidence")
    a.add_argument("--number", type=int, default=1546)
    a.add_argument("--street", default="HIGH")
    a.add_argument("--start", type=int, default=2000)
    a.add_argument("--end", type=int, default=2010)
    a.add_argument("--cap", type=int, default=1000)
    v = sub.add_parser("verify")
    v.add_argument("--output", default="evidence")
    args = p.parse_args()
    if args.command == "acquire":
        m = acquire(args.output, args.number, args.street, args.start, args.end, cap=args.cap)
        print(json.dumps(m, indent=2))
        raise SystemExit(0 if m["complete"] else 2)
    errors = verify(args.output)
    print(json.dumps({"verified": not errors, "errors": errors}, indent=2))
    raise SystemExit(0 if not errors else 1)


if __name__ == "__main__":
    main()
