"""Modules 12-16: document intelligence, reconciliation, hypotheses, QA and audit.
Extraction reports candidates only; every fact must be verified from its source.
"""

import argparse
# unused (flake8 F401), kept for reference: import csv
import hashlib
import json
import re
# unused (flake8 F401), kept for reference: import math
# unused (flake8 F401), kept for reference: import statistics
# unused (flake8 F401), kept for reference: from datetime import datetime, timezone
from pathlib import Path

DATE_RE = re.compile(
    r"\b(?:19|20)\d{2}[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])\b|\b(?:0?[1-9]|1[0-2])/(?:0?[1-9]|[12]\d|3[01])/(?:19|20)\d{2}\b"  # noqa: E501
)
# Original:
# PERMIT_RE = re.compile(
#     r"\b(?:permit|application|case)\s*(?:no\.?|number|#|id)?\s*[:#-]?\s*([A-Z]{1,5}[- ]?\d{4,12}(?:[- ]?[A-Z0-9]{1,5})?)",  # noqa: E501
#     re.I,
# )
#   it required 1-5 letters plus 4+ digits (missing "P-7", "Permit No. 123456" and "#123456"),
#   backtracked to capture the qualifier ("ID 123456"), and its suffix could swallow the
#   next word ("ABC-123456 issu"). Letters are now optional, a bare "#NNN" is accepted, the
#   qualifier words cannot start the ID, a space-separated suffix must contain a digit, and
#   the ID must end on a word boundary (not inside a date).
# Original (previous revision of the pattern below):
# PERMIT_RE = re.compile(
#     r"(?:\b(?:permit|application|case)\s*(?:no\.?|number|#|id)?\s*[:#-]?\s*|#\s*)"
#     r"(?!(?:no|number|id)\b)((?:[A-Z]{1,5}[- ]?)?\d{1,12}(?:-[A-Z0-9]{1,5}|[A-Z0-9]{1,5}|\s(?=[A-Z]*\d)[A-Z0-9]{1,5})?)"  # noqa: E501
#     r"\b(?!/\d)",
#     re.I,
# )
#   a dash-separated date after a qualifier was read as an ID ("Permit No. 2006-01-02" gave
#   "2006-01"); the ID may no longer start with a Y-M-D or M-D-Y date-shaped token.
PERMIT_RE = re.compile(
    r"(?:\b(?:permit|application|case)\s*(?:no\.?|number|#|id)?\s*[:#-]?\s*|#\s*)"
    r"(?!(?:no|number|id)\b)"
    r"(?!(?:(?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/](?:19|20)\d{2})\b)"
    r"((?:[A-Z]{1,5}[- ]?)?\d{1,12}(?:-[A-Z0-9]{1,5}|[A-Z0-9]{1,5}|\s(?=[A-Z]*\d)[A-Z0-9]{1,5})?)"
    r"\b(?!/\d)",
    re.I,
)
EVENTS = {
    "concrete_placement": r"\b(?:concrete\s+(?:poured|placement|pour)|poured\s+concrete|pour\s+date)\b",
    "foundation_inspection": r"\b(?:foundation|footing)\s+inspection\b",
    "excavation": r"\b(?:excavation|excavated|grading|trenching)\b",
    "demolition": r"\b(?:demolition|demolished|razed)\b",
    "plan": r"\b(?:as[- ]built|blueprint|site plan|architectural drawing)\b",
    "photograph": r"\b(?:photograph|photo|picture|image)\b",
}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def atomic_new(path, raw):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("xb") as f:
        f.write(raw)
    return sha(p)


def save_json(path, obj):
    return atomic_new(path, json.dumps(obj, indent=2, sort_keys=True, ensure_ascii=False).encode())


def extract_text(path):
    p = Path(path)
    if p.suffix.lower() in (".txt", ".md", ".csv", ".json"):
        return p.read_text(encoding="utf-8-sig"), "text"
    if p.suffix.lower() == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError:
            raise RuntimeError("PDF text requires optional pypdf dependency; scanned pages need a separate OCR adapter")
        reader = PdfReader(str(p))
        return "\n".join(page.extract_text() or "" for page in reader.pages), "pdf_text"
    raise ValueError("Unsupported document format; do not pretend an image has been OCRed")


def document_intelligence(path):
    p = Path(path)
    text, method = extract_text(p)
    lines = text.splitlines()
    findings = []
    for i, line in enumerate(lines, 1):
        for event, pattern in EVENTS.items():
            if re.search(pattern, line, re.I):
                context = " ".join(lines[max(0, i - 2) : min(len(lines), i + 1)])[:600]  # noqa: E203
                findings.append(
                    {
                        "kind": "event_mention",
                        "event": event,
                        "line": i,
                        "quote": line[:300],
                        "context": context,
                        "status": "unverified_text_mention",
                        "confidence": None,
                    }
                )
        for date in DATE_RE.findall(line):
            findings.append({"kind": "date_mention", "value": date, "line": i, "status": "unverified_text_mention"})
        for permit in PERMIT_RE.findall(line):
            findings.append({"kind": "permit_mention", "value": permit, "line": i, "status": "unverified_text_mention"})
    return {
        "file": str(p),
        "sha256": sha(p),
        "extraction_method": method,
        "lines": len(lines),
        "findings": findings,
        "warning": "A date near a construction term does not establish an event date; human source verification required.",  # noqa: E501
    }


def cross_reference(findings, records):
    """Exact permit-ID linkage; avoid weak fuzzy associations."""
    # Original: ids = {re.sub(r"[^A-Z0-9]", "", str(x.get("permit_id", "")).upper()): x for x in records if x.get("permit_id")}  # noqa: E501
    #   municipal.ingest_permits records carry `record_id`, not `permit_id`, so they never matched.
    ids = {}
    ambiguous = set()
    for x in records:
        # Original:
        # record_key = x.get("permit_id") or x.get("record_id")
        # if record_key:
        #     ids[re.sub(r"[^A-Z0-9]", "", str(record_key).upper())] = x
        #   a record carrying both identifiers was indexed only under permit_id, so a document
        #   citing its record_id never matched. Every non-empty identifier is indexed now.
        for field in ("permit_id", "record_id"):
            record_key = x.get(field)
            if record_key:
                # Original: ids[re.sub(r"[^A-Z0-9]", "", str(record_key).upper())] = x
                #   a later record whose identifier normalized to the same key silently replaced the
                #   earlier one, so a mention could link to the wrong record. A key shared by two
                #   different records is now ambiguous and links to neither.
                key = re.sub(r"[^A-Z0-9]", "", str(record_key).upper())
                if key in ids and ids[key] is not x:
                    ambiguous.add(key)
                ids[key] = x
    for key in ambiguous:
        del ids[key]
    out = []
    for item in findings:
        if item.get("kind") != "permit_mention":
            continue
        key = re.sub(r"[^A-Z0-9]", "", item["value"].upper())
        if key in ids:
            out.append(
                {
                    # Original: "permit_id": ids[key]["permit_id"],  (KeyError for record_id-only rows)
                    "permit_id": ids[key].get("permit_id") or ids[key].get("record_id"),
                    "source_line": item["line"],
                    "match": "exact_normalized_id",
                    "verification": "identifier_only_not_event_confirmation",
                }
            )
    return out


def sensor_compatibility(meta):
    """Capability gates: absence of requisite raw data prevents a method claim."""
    kind = str(meta.get("sensor", "")).lower()
    complex_data = bool(meta.get("complex_slc"))
    baselines = int(meta.get("independent_baselines", 0) or 0)
    result = {
        "change_detection": False,
        "insar": False,
        "tomo_sar": False,
        "gpr_migration": False,
        "lidar_terrain": False,
        "reason": [],
    }
    if kind == "sar":
        result["change_detection"] = bool(meta.get("co_registered_epochs", 0) >= 2)
        result["insar"] = complex_data and baselines >= 2 and bool(meta.get("coherence_metadata"))
        result["tomo_sar"] = complex_data and baselines >= 3 and bool(meta.get("baseline_geometry"))
        if not complex_data:
            result["reason"].append("Intensity-only SAR cannot support coherent phase inversion")
    if kind == "gpr":
        result["gpr_migration"] = bool(
            meta.get("trace_times") and meta.get("antenna_positions") and meta.get("velocity_model")
        )
    if kind == "lidar":
        result["lidar_terrain"] = bool(meta.get("point_coordinates") and meta.get("vertical_datum"))
    result["reason"].append("Capabilities indicate possible analyses, not validated detections")
    return result


def evidence_quality(items):
    """Transparent completeness metrics; never a probability of human remains."""
    if not items:
        return {"records": 0, "complete_provenance_fraction": 0.0, "source_independent_count": 0, "missing_fields": {}}
    needed = ("source_url", "sha256", "acquisition_date", "spatial_reference")
    missing = {field: sum(not x.get(field) for x in items) for field in needed}
    complete = sum(all(x.get(k) for k in needed) for x in items)
    return {
        "records": len(items),
        "complete_provenance_fraction": complete / len(items),
        "source_independent_count": len(set(x.get("source_group") for x in items if x.get("source_group"))),
        "missing_fields": missing,
        "interpretation": "Data readiness, not a calibrated remains probability",
    }


def verify_bundle(root):
    root = Path(root)
    problems = []
    checked = 0
    for m in root.rglob("*.sha256"):
        try:
            text = m.read_text().strip().split()
            expected = text[0]
            # Common format is HASH  basename; tolerate only local file references.
            name = text[1] if len(text) > 1 else m.name[:-7]
            target = m.parent / Path(name).name
            if not target.is_file() or sha(target) != expected:
                problems.append(str(m))
            checked += 1
        except Exception:
            problems.append(str(m))
    # Original: return {"checked": checked, "valid": not problems, "failed_manifests": problems}
    #   a missing root or a tree with no *.sha256 manifests reported valid without checking anything.
    result = {"checked": checked, "valid": root.is_dir() and checked > 0 and not problems, "failed_manifests": problems}
    if not root.is_dir():
        result["error"] = "root is not a directory"
    elif not checked:
        result["error"] = "no *.sha256 manifests found; nothing was verified"
    return result


def main():
    p = argparse.ArgumentParser(description="HFMR integrated evidence intelligence CLI")
    s = p.add_subparsers(dest="cmd", required=True)
    a = s.add_parser("extract")
    a.add_argument("--input", required=True)
    a.add_argument("--output", required=True)
    a = s.add_parser("compatibility")
    a.add_argument("--metadata", required=True)
    a.add_argument("--output", required=True)
    a = s.add_parser("quality")
    a.add_argument("--inventory", required=True)
    a.add_argument("--output", required=True)
    a = s.add_parser("verify")
    a.add_argument("--root", required=True)
    a = s.add_parser("crossref")
    a.add_argument("--extraction", required=True)
    a.add_argument("--records", required=True)
    a.add_argument("--output", required=True)
    v = p.parse_args()
    if v.cmd == "verify":
        result = verify_bundle(v.root)
    elif v.cmd == "extract":
        result = document_intelligence(v.input)
        save_json(v.output, result)
    elif v.cmd == "compatibility":
        result = sensor_compatibility(json.loads(Path(v.metadata).read_text()))
        save_json(v.output, result)
    elif v.cmd == "quality":
        data = json.loads(Path(v.inventory).read_text())
        result = evidence_quality(data if isinstance(data, list) else data.get("items", []))
        save_json(v.output, result)
    else:
        extraction = json.loads(Path(v.extraction).read_text())
        records = json.loads(Path(v.records).read_text())
        result = cross_reference(
            extraction["findings"], records if isinstance(records, list) else records.get("records", [])
        )
        save_json(v.output, result)
    print(json.dumps(result, indent=2))
    # The verify command's exit status must reflect the result, not just that it ran.
    if v.cmd == "verify" and not result["valid"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
