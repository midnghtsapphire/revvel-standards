"""Module 9: reproducible public permit search and evidence reconciliation.
No claim of live retrieval unless run succeeds. Requires only Python standard library.
"""

import hashlib
import json
import re
# unused (flake8 F401), kept for reference: import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = "https://gis.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer"
LAYERS = {"building": 5, "site_engineering": 22}
FIELDS = {
    "building": [
        "OBJECTID",
        "B1_ALT_ID",
        "B1_PARCEL_NBR",
        "SITE_ADDRESS",
        "ISSUED_YEAR",
        "ISSUED_DT",
        "LAST_STATUS_DT",
        "B1_PER_TYPE",
        "B1_PER_SUB_TYPE",
        "PERMIT_STATUS",
        "VALUE_DESC",
        "ACA_URL",
    ],
    "site_engineering": [
        "OBJECTID",
        "B1_ALT_ID",
        "B1_PARCEL_NBR",
        "SITE_ADDRESS",
        "FILED_YEAR",
        "B1_FILE_DD",
        "LAST_STATUS_DT",
        "B1_WORK_DESC",
        "B1_SHORT_NOTES",
        "ACA_URL",
    ],
}


def fetch(url, opener=None, timeout=25):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname != "gis.columbus.gov":
        raise ValueError("Unapproved host")
    req = urllib.request.Request(url, headers={"User-Agent": "ForensicFinders-PublicResearch/0.9"})
    with (opener or urllib.request.urlopen)(req, timeout=timeout) as response:
        end = urllib.parse.urlsplit(response.url)
        if end.scheme != "https" or end.hostname != parsed.hostname:
            raise ValueError("Redirect host changed")
        body = response.read(5_000_001)
        if len(body) > 5_000_000:
            raise ValueError("Response too large")
    return json.loads(body), hashlib.sha256(body).hexdigest()


def where_address(number=1546, street="HIGH", year_start=2000, year_end=2010, layer="building"):
    if layer not in LAYERS:
        raise ValueError("Unknown layer")
    if not isinstance(number, int) or not 1 <= number <= 99999:
        raise ValueError("Invalid street number")
    if not re.fullmatch("[A-Z ]{2,30}", street):
        raise ValueError("Invalid street name")
    if not (1800 <= year_start <= year_end <= 2100):
        raise ValueError("Invalid years")
    year = "ISSUED_YEAR" if layer == "building" else "FILED_YEAR"
    # Broad address search intentionally allows abbreviations, alternate street formatting.
    return f"SITE_ADDRESS LIKE '%{number}%{street}%' AND {year} >= {year_start} AND {year} <= {year_end}"


def retrieve(layer, where, max_records=500, opener=None):
    if layer not in LAYERS:
        raise ValueError("Unknown layer")
    if not 1 <= max_records <= 2000:
        raise ValueError("Invalid limit")
    out = []
    pages = []
    offset = 0
    while len(out) < max_records:
        count = min(200, max_records - len(out))
        params = urllib.parse.urlencode(
            {
                "f": "json",
                "where": where,
                "outFields": ",".join(FIELDS[layer]),
                "returnGeometry": "false",
                "resultOffset": offset,
                "resultRecordCount": count,
                "orderByFields": "OBJECTID ASC",
            }
        )
        url = f"{ROOT}/{LAYERS[layer]}/query?{params}"
        data, digest = fetch(url, opener)
        if "error" in data:
            raise RuntimeError(str(data["error"]))
        batch = [x.get("attributes", {}) for x in data.get("features", [])]
        pages.append({"url": url, "sha256": digest, "returned": len(batch)})
        out += batch
        if len(batch) < count:
            break
        offset += len(batch)
    return {
        "layer": layer,
        "query": where,
        "retrieved_utc": datetime.now(timezone.utc).isoformat(),
        "records": out,
        "pages": pages,
        "truncated_possible": len(out) == max_records,
    }


def normalize(record, layer):
    if layer not in LAYERS:
        raise ValueError("Unknown layer")
    dt = record.get("ISSUED_DT") if layer == "building" else record.get("B1_FILE_DD")
    iso = None
    if isinstance(dt, (int, float)):
        iso = datetime.fromtimestamp(dt / 1000, timezone.utc).isoformat()
    return {
        "permit_id": record.get("B1_ALT_ID"),
        "layer": layer,
        "address": record.get("SITE_ADDRESS"),
        "parcel": record.get("B1_PARCEL_NBR"),
        "event_date": iso,
        "event_type": "permit_issued" if layer == "building" else "engineering_permit_filed",
        "description": record.get("B1_WORK_DESC") or record.get("VALUE_DESC") or record.get("B1_SHORT_NOTES"),
        "source_record": record,
        "date_warning": "Not evidence of actual excavation or concrete placement",
    }


def reconcile(results):
    entries = []
    seen = set()
    for result in results:
        for row in result["records"]:
            key = (result["layer"], row.get("OBJECTID"))
            if key in seen:
                continue
            seen.add(key)
            entries.append(normalize(row, result["layer"]))
    entries.sort(key=lambda x: (x["event_date"] or "", x["permit_id"] or ""))
    return {
        "records": entries,
        "count": len(entries),
        "verified_concrete_pour_dates": 0,
        "warning": "No concrete pour dates inferred from permits; inspect supporting records.",
    }


def write_evidence(data, path):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists():
        raise FileExistsError(p)
    payload = json.dumps(data, indent=2, sort_keys=True).encode()
    p.write_bytes(payload)
    h = hashlib.sha256(payload).hexdigest()
    p.with_suffix(p.suffix + ".sha256").write_text(h + "  " + p.name + "\n")
    return h


def run(output_dir, number=1546, street="HIGH", year_start=2000, year_end=2010, opener=None):
    dest = Path(output_dir)
    if dest.exists() and any(dest.iterdir()):
        raise FileExistsError("Output folder must be empty")
    dest.mkdir(parents=True, exist_ok=True)
    results = []
    errors = []
    for layer in LAYERS:
        query = where_address(number, street, year_start, year_end, layer)
        try:
            result = retrieve(layer, query, opener=opener)
            write_evidence(result, dest / f"{layer}.json")
            results.append(result)
        except Exception as e:
            errors.append({"layer": layer, "error_type": type(e).__name__, "message": str(e)})
    report = reconcile(results)
    report.update(
        {
            "case": "CASE001",
            "target": "1546 N High St, Columbus, OH",
            "errors": errors,
            "sources": list(LAYERS),
            "retrieval_complete": len(errors) == 0,
        }
    )
    write_evidence(report, dest / "reconciliation.json")
    return {
        "records": report["count"],
        "errors": errors,
        "retrieval_complete": report["retrieval_complete"],
        "output": str(dest),
    }
