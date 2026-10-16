"""Module 4: public construction-record discovery, intake and provenance.
Standard-library only. No authentication bypass or invented construction dates.
"""

import csv
import hashlib
import html.parser
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

FIELDS = (
    "record_id",
    "source_url",
    "source_system",
    "address",
    "parcel",
    "record_type",
    "description",
    "application_date",
    "issue_date",
    "inspection_date",
    "completion_date",
    "event_date",
    "event_type",
    "date_precision",
    "date_basis",
    "document_url",
    "document_type",
    "status",
    "notes",
)


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def normalized_address(value):
    return re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9 ]", " ", value.upper())).strip()


def date_value(value):
    if not value:
        return ""
    # CSV imports deliver ArcGIS/Unix epoch milliseconds as digit strings; treat them like numbers.
    if isinstance(value, str) and re.fullmatch(r"\d{12,14}", value.strip()):
        value = int(value.strip())
    if isinstance(value, (int, float)) and value > 10**11:
        return datetime.fromtimestamp(value / 1000, timezone.utc).date().isoformat()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(str(value)[:10], fmt).date().isoformat()
        except ValueError:
            pass
    return ""


def normalize_row(row, mapping=None, source_url="", source_system="csv"):
    mapping = mapping or {}

    def get(key):
        col = mapping.get(key, key)
        return str(row.get(col, "") or "").strip()

    out = {key: get(key) for key in FIELDS}
    out["source_url"] = out["source_url"] or source_url
    out["source_system"] = out["source_system"] or source_system
    out["address"] = normalized_address(out["address"])
    for key in ("application_date", "issue_date", "inspection_date", "completion_date", "event_date"):
        raw = out[key]
        out[key] = date_value(raw)
        if raw and not out[key]:
            out["notes"] += f" [unparsed {key}: {raw}]"
    if not out["date_basis"]:
        out["date_basis"] = "record_metadata_unverified"
    return out


def import_csv(input_file, output_file, mapping=None, source_url=""):
    src = Path(input_file)
    target = Path(output_file)
    if target.exists():
        raise FileExistsError(target)
    with src.open(newline="", encoding="utf-8-sig") as f:
        rows = [normalize_row(r, mapping, source_url) for r in csv.DictReader(f)]
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    manifest = {
        "input": str(src),
        "input_sha256": digest(src),
        "output": str(target),
        "output_sha256": digest(target),
        "records": len(rows),
        "mapping": mapping or {},
        "created_utc": datetime.now(timezone.utc).isoformat(),
    }
    target.with_suffix(".manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest


def _parcel_key(value):
    """Exact parcel key: separators removed, letters and digits kept (as in discovery.match_identity)."""
    return re.sub(r"[^A-Z0-9]", "", str(value or "").upper())


def timeline(input_file, address=None, parcel=None):
    with open(input_file, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if address:
        query = normalized_address(address)
        rows = [r for r in rows if normalized_address(r.get("address", "")) == query]
    if parcel:
        # Original: rows = [r for r in rows if re.sub(r"\D", "", r.get("parcel", "")) == re.sub(r"\D", "", parcel)]
        #   dropping every non-digit merged parcels that differ only by letters, and a
        #   non-numeric query normalised to "" and matched every blank parcel.
        query_parcel = _parcel_key(parcel)
        rows = [r for r in rows if query_parcel and _parcel_key(r.get("parcel", "")) == query_parcel]
    events = []
    for r in rows:
        for field, typ in (
            ("application_date", "permit_application"),
            ("issue_date", "permit_issued"),
            ("inspection_date", "inspection_recorded"),
            ("completion_date", "completion_recorded"),
            ("event_date", r.get("event_type") or "other_event"),
        ):
            if r.get(field):
                events.append(
                    {
                        "date": r[field],
                        "type": typ,
                        "record_id": r.get("record_id"),
                        "address": r.get("address"),
                        "source_url": r.get("source_url"),
                        "date_basis": r.get("date_basis"),
                        "description": r.get("description"),
                        "caution": "Permit/inspection dates do not prove the exact day concrete was poured.",
                    }
                )
    return sorted(events, key=lambda e: (e["date"], e["record_id"] or ""))


def arcgis_query(service_url, where, out_fields="*", max_records=1000, timeout=20):
    """Query a specifically supplied public ArcGIS FeatureServer layer."""
    parsed = urllib.parse.urlsplit(service_url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("HTTPS required")
    if not re.search(r"/(?:FeatureServer|MapServer)/\d+/?$", parsed.path, re.I):
        raise ValueError("URL must point to a layer ending FeatureServer/N or MapServer/N")
    if max_records < 1 or max_records > 5000:
        raise ValueError("Invalid record cap")
    base = service_url.rstrip("/")
    records = []
    offset = 0
    while len(records) < max_records:
        count = min(500, max_records - len(records))
        params = urllib.parse.urlencode(
            {
                "where": where,
                "outFields": out_fields,
                "returnGeometry": "false",
                "f": "json",
                "resultOffset": offset,
                "resultRecordCount": count,
            }
        )
        req = urllib.request.Request(base + "/query?" + params, headers={"User-Agent": "HFMR-Research/0.4"})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if urllib.parse.urlsplit(response.url).hostname != parsed.hostname:
                raise ValueError("Unexpected redirect host")
            data = json.load(response)
        if "error" in data:
            raise RuntimeError(str(data["error"]))
        batch = [x.get("attributes", {}) for x in data.get("features", [])]
        records.extend(batch)
        if len(batch) < count:
            break
        offset += len(batch)
    return records


class LinkParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)


def scrape_public_links(html_file, base_url, allowed_host):
    """Extract links from a saved public HTML page. No portal login automation."""
    if urllib.parse.urlsplit(base_url).hostname != allowed_host:
        raise ValueError("Host mismatch")
    p = LinkParser()
    p.feed(Path(html_file).read_text(encoding="utf-8"))
    links = []
    for href in p.links:
        u = urllib.parse.urljoin(base_url, href)
        parsed = urllib.parse.urlsplit(u)
        if parsed.scheme == "https" and parsed.hostname == allowed_host and u not in links:
            links.append(u)
    return links


def verify_import(manifest_file):
    m = json.loads(Path(manifest_file).read_text())
    return digest(m["input"]) == m["input_sha256"] and digest(m["output"]) == m["output_sha256"]


def request_text(address, parcel="", start="2000", end="2010"):
    return f"""Subject: Public records request — construction history, {address}

To: bzsrecords@columbus.gov

Please provide available non-exempt records for {address} (parcel: {parcel or 'unknown'}) covering {start}–{end}:
building, demolition, excavation, grading, foundation, concrete, utility and right-of-way permits; applications, inspections, inspection notes, completion/occupancy records, site plans, photographs, engineering drawings, and associated attachments.

Please include record identifiers, original event dates, document creation dates, and any historical address or parcel cross-references. I am specifically trying to distinguish permit approval dates from actual dates of excavation, concrete placement, inspection, and completion.

If any plans or photographs have been destroyed under retention schedules, please identify the applicable retention rule and whether indexes, inspection logs, archived microfilm, or other records remain.

Please advise of any fees before proceeding. Electronic copies are preferred.
"""  # noqa: E501
