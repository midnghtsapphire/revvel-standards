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


def _check_address_args(number, street, start, end):
    """Reject bad query arguments up front, before any output is created or request is made."""
    # Original: if not isinstance(number, int) or not 1 <= number <= 99999:
    #   bool subclasses int, so number=True passed as street number 1.
    if type(number) is not int or not 1 <= number <= 99999:
        raise ValueError("Invalid number")
    if not isinstance(street, str) or not re.fullmatch("[A-Z]{2,25}", street):
        raise ValueError("Invalid street")
    if not isinstance(start, int) or not isinstance(end, int) or not 1800 <= start <= end <= 2100:
        raise ValueError("Invalid years")


def query_address_variants(layer, number=1546, street="HIGH", start=2000, end=2010, opener=None):
    if layer not in LAYERS:
        raise ValueError("Invalid layer")
    # Original: if not isinstance(number, int) or not 1 <= number <= 99999:
    #   bool subclasses int, so number=True passed as street number 1.
    if type(number) is not int or not 1 <= number <= 99999:
        raise ValueError("Invalid number")
    if not re.fullmatch("[A-Z]{2,25}", street):
        raise ValueError("Invalid street")
    if not 1800 <= start <= end <= 2100:
        raise ValueError("Invalid years")
    year = "ISSUED_YEAR" if layer == "building" else "FILED_YEAR"
    # Separate queries avoid requiring contiguous address text.
    patterns = [f"{number} N {street}", f"{number} NORTH {street}", f"{number} {street}"]
    queries = [f"SITE_ADDRESS LIKE '%{p}%' AND {year} BETWEEN {start} AND {end}" for p in patterns]
    # Original: return [(q, retrieve(layer, q, opener=opener)) for q in queries]
    #   the list was built before the caller could persist anything, so a failure on a later
    #   variant discarded earlier successful retrievals. Arguments are still validated eagerly
    #   above; each retrieval now happens as the caller iterates, so it can be saved at once.
    return ((q, retrieve(layer, q, opener=opener)) for q in queries)


def acquire(output, number=1546, street="HIGH", start=2000, end=2010, opener=None):
    # Invalid arguments are a caller error, not a per-layer retrieval failure: refuse them
    # before creating output, so no misleading partial report is written.
    _check_address_args(number, street, start, end)
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
            # Original: metadata_docs.append(meta)
            #   it ran before the required-field check, so a layer with missing fields was
            #   still listed under metadata_verified_for. Appended after the check below.
            needed = {
                "SITE_ADDRESS",
                "B1_ALT_ID",
                "B1_PARCEL_NBR",
                ("ISSUED_YEAR" if layer == "building" else "FILED_YEAR"),
            }
            missing = needed - set(meta["fields"])
            if missing:
                raise ValueError(f"Missing expected fields: {sorted(missing)}")
            metadata_docs.append(meta)
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
            # Original: "retrieval_complete": not errors,
            #   ignored retrieve()'s truncated_possible flag, so a capped query read as complete.
            "truncated_queries": [o["query"] for o in outcomes if o.get("truncated_possible")],
            "retrieval_complete": not errors and not any(o.get("truncated_possible") for o in outcomes),
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
