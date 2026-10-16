"""Module 10: field-aware parcel cross-reference and evidence acquisition.
This is a LIVE-capable client; never labels a failed request as zero records.
"""

# unused (flake8 F401), kept for reference: import json
import re
# unused (flake8 F401), kept for reference: import urllib.parse
from pathlib import Path
from .case001_live import fetch, retrieve, reconcile, write_evidence, ROOT, LAYERS
# unused (flake8 F401), kept for reference: from .case001_live import normalize

PARCEL_LAYER = "https://gis.columbus.gov/arcgis/rest/services/Applications/Zoning/MapServer/5"


def metadata(url, opener=None):
    doc, sha = fetch(url + "?f=json", opener)
    if "error" in doc:
        raise RuntimeError(str(doc["error"]))
    return {
        "url": url,
        "sha256": sha,
        "fields": [f["name"] for f in doc.get("fields", [])],
        "capabilities": doc.get("advancedQueryCapabilities", {}),
    }


def query_address_variants(layer, number=1546, street="HIGH", start=2000, end=2010, opener=None):
    if layer not in LAYERS:
        raise ValueError("Invalid layer")
    if not isinstance(number, int) or not 1 <= number <= 99999:
        raise ValueError("Invalid number")
    if not re.fullmatch("[A-Z]{2,25}", street):
        raise ValueError("Invalid street")
    if not 1800 <= start <= end <= 2100:
        raise ValueError("Invalid years")
    year = "ISSUED_YEAR" if layer == "building" else "FILED_YEAR"
    # Separate queries avoid requiring contiguous address text.
    patterns = [f"{number} N {street}", f"{number} NORTH {street}", f"{number} {street}"]
    queries = [f"SITE_ADDRESS LIKE '%{p}%' AND {year} BETWEEN {start} AND {end}" for p in patterns]
    return [(q, retrieve(layer, q, opener=opener)) for q in queries]


def acquire(output, number=1546, street="HIGH", start=2000, end=2010, opener=None):
    dest = Path(output)
    if dest.exists() and any(dest.iterdir()):
        raise FileExistsError("Output not empty")
    dest.mkdir(parents=True, exist_ok=True)
    outcomes = []
    errors = []
    metadata_docs = []
    for layer, lid in LAYERS.items():
        url = f"{ROOT}/{lid}"
        try:
            meta = metadata(url, opener)
            write_evidence(meta, dest / f"{layer}_schema.json")
            metadata_docs.append(meta)
            needed = {
                "SITE_ADDRESS",
                "B1_ALT_ID",
                "B1_PARCEL_NBR",
                ("ISSUED_YEAR" if layer == "building" else "FILED_YEAR"),
            }
            missing = needed - set(meta["fields"])
            if missing:
                raise ValueError(f"Missing expected fields: {sorted(missing)}")
            for idx, (query, result) in enumerate(query_address_variants(layer, number, street, start, end, opener), 1):
                write_evidence(result, dest / f"{layer}_query{idx}.json")
                outcomes.append(result)
        except Exception as exc:
            errors.append({"layer": layer, "error_type": type(exc).__name__, "detail": str(exc)})
    report = reconcile(outcomes)
    parcels = sorted({str(r["parcel"]) for r in report["records"] if r.get("parcel")})
    report.update(
        {
            "target": f"{number} N {street} ST",
            "year_window": [start, end],
            "parcel_candidates": parcels,
            "parcel_status": "unverified_current_vs_historical",
            "query_attempts": len(outcomes),
            "errors": errors,
            "retrieval_complete": not errors,
            "metadata_verified_for": [m["url"] for m in metadata_docs],
            "absence_caveat": "Zero records in public GIS does not establish no historical construction or permit.",
            "source_note": "GIS records are leads; historical parcel identities need independent documentary confirmation.",  # noqa: E501
        }
    )
    write_evidence(report, dest / "acquisition_report.json")
    return {
        "output": str(dest),
        "records": report["count"],
        "parcel_candidates": parcels,
        "retrieval_complete": report["retrieval_complete"],
        "errors": errors,
    }
