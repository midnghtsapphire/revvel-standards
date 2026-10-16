"""Columbus public ArcGIS building permit connector. No authentication or guessed dates."""

import csv
import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from datetime import datetime, timezone
from .safe_redirect import checked_urlopen

LAYER = "https://arc.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer/5"
PORTAL = "https://portal.columbus.gov/Permits/Cap/CapHome.aspx?TabName=Building&module=Building"
ALLOWED_HOSTS = {"arc.columbus.gov"}


def _check_redirect(url):
    dest = urllib.parse.urlsplit(url)
    # Original: if dest.scheme != "https" or dest.hostname not in ALLOWED_HOSTS:
    #   any port on an allowlisted host was accepted; only the default HTTPS port is now,
    #   matching acquire.validate_url.
    if dest.scheme != "https" or dest.hostname not in ALLOWED_HOSTS or dest.port not in (None, 443):
        raise ValueError("Redirect rejected")


def _request(url, opener=None, timeout=20):
    p = urllib.parse.urlsplit(url)
    if p.scheme != "https" or p.hostname not in ALLOWED_HOSTS:
        raise ValueError("Host not approved")
    req = urllib.request.Request(url, headers={"User-Agent": "ForensicFinders-ArchiveResearch/0.8"})
    # Original: response = (opener or urllib.request.urlopen)(req, timeout=timeout)
    #   urlopen followed redirects to unapproved hosts before the check below ran.
    response = (opener or checked_urlopen(_check_redirect))(req, timeout=timeout)
    with response as r:
        dest = urllib.parse.urlsplit(r.url)
        if dest.scheme != "https" or dest.hostname not in ALLOWED_HOSTS:
            raise ValueError("Redirect rejected")
        raw = r.read(5_000_001)
        if len(raw) > 5_000_000:
            raise ValueError("Response size exceeded")
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def metadata(opener=None):
    data, digest = _request(LAYER + "?f=json", opener)
    if "error" in data:
        raise RuntimeError(data["error"])
    return {
        "url": LAYER,
        "fields": [{"name": x.get("name"), "type": x.get("type")} for x in data.get("fields", [])],
        "object_id_field": data.get("objectIdField"),
        "max_record_count": data.get("maxRecordCount"),
        "supports_pagination": data.get("advancedQueryCapabilities", {}).get("supportsPagination"),
        "raw_sha256": digest,
    }


def query_by_parcel(parcel, opener=None, max_records=100, delay=0):
    """Use explicit parcel number, validate input and request exact matches."""
    if not re.fullmatch(r"[A-Za-z0-9\-]{3,40}", parcel):
        raise ValueError("Invalid parcel")
    where = "B1_PARCEL_NBR = '" + parcel.replace("'", "''") + "'"
    return query(where, opener=opener, max_records=max_records, delay=delay)


def query(where, opener=None, max_records=100, delay=0):
    """Bounded paginated query; caller must supply valid server field expression."""
    if not 1 <= max_records <= 2000:
        raise ValueError("Record cap must be 1..2000")
    rows = []
    pages = []
    offset = 0
    while len(rows) < max_records:
        n = min(200, max_records - len(rows))
        params = urllib.parse.urlencode(
            {
                "f": "json",
                "where": where,
                "outFields": "*",
                "returnGeometry": "false",
                "resultOffset": offset,
                "resultRecordCount": n,
            }
        )
        url = LAYER + "/query?" + params
        data, digest = _request(url, opener)
        if "error" in data:
            raise RuntimeError(data["error"])
        batch = [f.get("attributes", {}) for f in data.get("features", [])]
        pages.append({"url": url, "response_sha256": digest, "count": len(batch)})
        rows.extend(batch)
        # Original: if len(batch) < n:
        #   a server whose maxRecordCount is below n returns a short page with
        #   exceededTransferLimit=true; treating that as the last page saved incomplete results.
        if not batch or (len(batch) < n and not data.get("exceededTransferLimit")):
            break
        offset += len(batch)
        if delay:
            time.sleep(delay)
    return {
        "schema": "hfmr.columbus.public.v1",
        "source": LAYER,
        "retrieved_utc": datetime.now(timezone.utc).isoformat(),
        "query": where,
        "records": rows,
        "pages": pages,
        "caveat": "Current public map layer; coverage and historical completeness unverified.",
    }


def save(doc, output):
    p = Path(output)
    if p.exists():
        raise FileExistsError(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(doc, indent=2, sort_keys=True).encode()
    p.write_bytes(data)
    digest = hashlib.sha256(data).hexdigest()
    p.with_suffix(p.suffix + ".sha256").write_text(digest + "  " + p.name + "\n")
    return {"output": str(p), "records": len(doc.get("records", [])), "sha256": digest}


def verify(path):
    p = Path(path)
    hash_path = p.with_suffix(p.suffix + ".sha256")
    return hashlib.sha256(p.read_bytes()).hexdigest() == hash_path.read_text().split()[0]


def export_csv(doc_path, out_path):
    data = json.loads(Path(doc_path).read_text())
    rows = data["records"]
    p = Path(out_path)
    if p.exists():
        raise FileExistsError(p)
    fields = sorted({key for row in rows for key in row})
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("x", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)
