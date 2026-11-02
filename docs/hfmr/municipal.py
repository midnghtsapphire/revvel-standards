"""Module 7: public permit exports, attachment indexes and construction chronology.
Never guesses when concrete was poured; no login bypass or live portal automation.
"""

import csv
import json
import re
import hashlib
from pathlib import Path
from urllib.parse import urlsplit
# unused (flake8 F401), kept for reference: from urllib.parse import urljoin
from .construction import normalize_row, normalized_address
# unused (flake8 F401), kept for reference: from .construction import date_value
from .retrieval import COLUMNS, safe_id

EVENTS = {
    "application_date": "permit_application",
    "issue_date": "permit_issued",
    "inspection_date": "inspection_recorded",
    "completion_date": "completion_recorded",
    "event_date": "other_recorded_event",
}


def ingest_permits(input_path, output_path, mapping, *, portal_name="public_export", source_url=""):
    """Map actual portal columns to canonical fields; preserve unmodified raw CSV."""
    inp = Path(input_path)
    out = Path(output_path)
    if out.exists():
        raise FileExistsError(out)
    if not mapping.get("record_id") or not mapping.get("address"):
        raise ValueError("Explicit record_id and address mappings required")
    with inp.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        missing = set(mapping.values()) - set(reader.fieldnames or [])
        if missing:
            raise ValueError("Missing input columns: " + repr(sorted(missing)))
        rows = []
        for line, row in enumerate(reader, start=2):
            n = normalize_row(row, mapping, source_url, portal_name)
            n["source_line"] = line
            n["source_sha256"] = hashlib.sha256(inp.read_bytes()).hexdigest()
            rows.append(n)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            {
                "schema": "hfmr.municipal.v1",
                "source_file": str(inp),
                "source_sha256": hashlib.sha256(inp.read_bytes()).hexdigest(),
                "source_url": source_url,
                "portal": portal_name,
                "mapping": mapping,
                "records": rows,
            },
            indent=2,
        )
    )
    return len(rows)


def attachments_from_csv(input_path, output_path, mapping, allowed_hosts):
    """Convert public attachment CSV into Module 6 retrieval queue; preserve associations."""
    inp = Path(input_path)
    out = Path(output_path)
    if out.exists():
        raise FileExistsError(out)
    required = {"record_id", "document_url", "document_type"}
    if not required.issubset(mapping):
        raise ValueError("Map record_id, document_url, document_type")
    with inp.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if set(mapping.values()) - set(reader.fieldnames or []):
            raise ValueError("Missing columns")
        rows = []
        associations = []
        for index, r in enumerate(reader):
            url = (r.get(mapping["document_url"]) or "").strip()
            parsed = urlsplit(url)
            if parsed.scheme != "https" or (parsed.hostname or "").lower() not in {h.lower() for h in allowed_hosts}:
                continue
            rid = (r.get(mapping["record_id"]) or "").strip()
            if not rid:
                continue
            sid = safe_id("permit_" + rid + "_" + str(index))
            rows.append(
                {
                    "source_id": sid,
                    "url": url,
                    "category": "permit_attachment",
                    "claimed_acquisition_date": "",
                    "date_basis": "document_date_not_verified",
                    "case_id": "",
                }
            )
            associations.append(
                {
                    "source_id": sid,
                    "permit_record_id": rid,
                    "document_type": r.get(mapping["document_type"]),
                    "source_row": index + 2,
                }
            )
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("x", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(rows)
    meta = out.with_suffix(".associations.json")
    if meta.exists():
        raise FileExistsError(meta)
    meta.write_text(
        json.dumps(
            {"input_sha256": hashlib.sha256(inp.read_bytes()).hexdigest(), "associations": associations}, indent=2
        )
    )
    return len(rows)


def chronology(normalized_json, address=None, *, concrete_keywords=True):
    doc = json.loads(Path(normalized_json).read_text())
    records = doc["records"]
    if address:
        target = normalized_address(address)
        records = [r for r in records if normalized_address(r.get("address", "")) == target]
    events = []
    for r in records:
        for field, event_type in EVENTS.items():
            if not r.get(field):
                continue
            desc = r.get("description", "")
            signal = (
                bool(re.search(r"\b(concrete|foundation|footing|slab|pour|excavat|demolit)\w*", desc, re.I))
                if concrete_keywords
                else False
            )
            events.append(
                {
                    "date": r[field],
                    "event_type": r.get("event_type") if field == "event_date" and r.get("event_type") else event_type,
                    "record_id": r.get("record_id"),
                    "description": desc,
                    "potential_construction_relevance": signal,
                    "date_basis": field,
                    "source_line": r.get("source_line"),
                    "source_sha256": r.get("source_sha256"),
                    "interpretation": "Administrative/inspection date, not verified physical work date",
                }
            )
    return sorted(events, key=lambda x: (x["date"], x["record_id"] or ""))


def save_chronology(normalized_json, output_path, address=None):
    out = Path(output_path)
    if out.exists():
        raise FileExistsError(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "events": chronology(normalized_json, address),
        "source_sha256": hashlib.sha256(Path(normalized_json).read_bytes()).hexdigest(),
        "warning": "No inferred concrete-pour dates. Source descriptions and timestamps require independent validation.",  # noqa: E501
    }
    out.write_text(json.dumps(data, indent=2))
    return len(data["events"])


def records_request(address, *, year_start=2000, year_end=2010):
    if year_start > year_end:
        raise ValueError("Invalid years")
    return (
        f"Subject: Public construction records request — {address}\n\n"
        f"Please provide available public permit applications, inspection logs, foundation and concrete-placement records, "  # noqa: E501
        f"demolition/excavation records, site plans, photographs, utility and right-of-way work, and relevant document indexes "  # noqa: E501
        f"for {address} between {year_start} and {year_end}. Please include record IDs, actual event dates when documented, "  # noqa: E501
        f"and any historical parcel/address cross-references. If records were destroyed under a retention schedule, "
        f"please identify surviving indexes or alternate repositories. Please provide electronic copies and notify me of fees.\n"  # noqa: E501
    )
