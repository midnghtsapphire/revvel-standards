"""Module 11: permit-to-document follow-up, evidence chronology and records packet."""

# unused (flake8 F401), kept for reference: import csv
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

TERMS = {
    "concrete": r"\b(concrete|pour(?:ed|ing)?|ready.mix|slab|footing|foundation)\b",
    "earthwork": r"\b(excavat(?:ion|e|ed|ing)|grading|trench|backfill|soil)\b",
    "demolition": r"\b(demolition|demolish|removed|razed)\b",
    "inspection": r"\b(inspect(?:ion|ed|or)?|approved|failed)\b",
    "photograph": r"\b(photo(?:graph)?s?|image|picture)\b",
    "drawing": r"\b(blueprint|drawing|site.plan|as.built|architectural|structural)\b",
}


def classify(description):
    text = str(description or "")
    return [name for name, regex in TERMS.items() if re.search(regex, text, re.I)]


def read_case(report_path):
    doc = json.loads(Path(report_path).read_text(encoding="utf-8"))
    if not isinstance(doc.get("records"), list):
        raise ValueError("Expected acquisition report with records")
    return doc


def followups(report, address="1546 N High St, Columbus, OH", start=2000, end=2010):
    if not 1800 <= start <= end <= 2100:
        raise ValueError("Invalid year range")
    rows = []
    seen = set()
    for item in report["records"]:
        pid = str(item.get("permit_id") or "").strip()
        layer = item.get("layer") or "unknown"
        key = (layer, pid)
        if not pid or key in seen:
            continue
        seen.add(key)
        description = item.get("description") or ""
        rows.append(
            {
                "permit_id": pid,
                "layer": layer,
                "address": item.get("address") or address,
                "parcel_candidate": str(item.get("parcel") or ""),
                "event_date": item.get("event_date"),
                "event_type": item.get("event_type"),
                "topics": classify(description),
                "request_documents": [
                    "application",
                    "permit",
                    "inspection log and notes",
                    "inspection photographs",
                    "site plans or as-built drawings",
                    "excavation and grading records",
                    "concrete placement and foundation inspection records",
                    "contractor daily logs if held",
                ],
                "date_status": "permit_metadata_only",
                "source": item.get("source_record", {}).get("ACA_URL") or "",
                "notes": "Do not infer actual construction or concrete pour dates from permit dates.",
            }
        )
    return sorted(rows, key=lambda r: (r["permit_id"], r["layer"]))


def chronology(report):
    events = []
    for item in report["records"]:
        if item.get("event_date"):
            events.append(
                {
                    "date": item["event_date"],
                    "event_type": item.get("event_type"),
                    "permit_id": item.get("permit_id"),
                    "source_layer": item.get("layer"),
                    "topics": classify(item.get("description")),
                    "date_basis": "municipal_permit_metadata",
                    "actual_pour_date_confirmed": False,
                }
            )
    return sorted(events, key=lambda e: e["date"])


def request_letter(rows, address, start, end):
    ids = ", ".join(sorted({r["permit_id"] for r in rows})) or "(permit identifiers not yet located)"
    return f"""Subject: Public records request — historical construction, {address}

Please provide electronically available public records for {address} during {start}–{end}.
Known permit identifiers: {ids}.

I request the available permit applications and amendments, inspection reports and inspection notes, dated site or foundation photographs, excavation/grading and utility work records, foundation and concrete placement inspection records, certificates of occupancy, engineering drawings, site plans, and as-built plans. If held, please include concrete delivery tickets, pour logs, and contractor daily logs.

Please provide original document dates and associated permit and parcel identifiers. I am seeking documented dates of actual site activity, not merely permit issuance. If records are unavailable due to retention policies, please identify the applicable retention rule and any surviving indexes, microfilm, or successor custodians. Please advise of fees before processing.

Thank you.
"""  # noqa: E501


def write_packet(report_path, output, address="1546 N High St, Columbus, OH", start=2000, end=2010):
    out = Path(output)
    if out.exists():
        raise FileExistsError(out)
    report = read_case(report_path)
    rows = followups(report, address, start, end)
    events = chronology(report)
    out.mkdir(parents=True)
    payloads = {
        "followups.json": json.dumps(rows, indent=2),
        "chronology.json": json.dumps(events, indent=2),
        "records_request.txt": request_letter(rows, address, start, end),
        "status.json": json.dumps(
            {
                "retrieval_complete": report.get("retrieval_complete", False),
                "errors": report.get("errors", []),
                "record_count": len(report["records"]),
                "permit_followups": len(rows),
                "source_report": str(report_path),
                "source_sha256": hashlib.sha256(Path(report_path).read_bytes()).hexdigest(),
                "generated_utc": datetime.now(timezone.utc).isoformat(),
                "caveat": "Records are unverified leads until primary documents are obtained.",
            },
            indent=2,
        ),
    }
    for name, text in payloads.items():
        path = out / name
        path.write_text(text, encoding="utf-8")
        (out / (name + ".sha256")).write_text(hashlib.sha256(path.read_bytes()).hexdigest() + "  " + name + "\n")
    return {
        "output": str(out),
        "followups": len(rows),
        "events": len(events),
        "retrieval_complete": report.get("retrieval_complete", False),
    }
