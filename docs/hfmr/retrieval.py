"""Module 6: manifest-driven, bounded retrieval of public historical records."""

import csv
import hashlib
import json
import re
import time
from pathlib import Path
# unused (flake8 F401), kept for reference: from urllib.parse import urlsplit
from .acquire import fetch, save_manifest, verify_manifest, validate_url
# unused (flake8 F401), kept for reference: from .archive import inspect_file

COLUMNS = ("source_id", "url", "category", "claimed_acquisition_date", "date_basis", "case_id")


def safe_id(value):
    value = re.sub(r"[^A-Za-z0-9_.-]+", "_", str(value)).strip("._")
    if not value or len(value) > 90:
        raise ValueError("Invalid source_id")
    return value


def read_queue(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not {"source_id", "url"}.issubset(reader.fieldnames or []):
            raise ValueError("Queue requires source_id,url")
        rows = list(reader)
    ids = [safe_id(r["source_id"]) for r in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate source_id")
    return rows


def queue_from_stac(inventory_path, output, allow_hosts):
    """Extract HTTPS asset URLs from Module 5 inventory, no automatic downloads."""
    p = Path(output)
    if p.exists():
        raise FileExistsError(p)
    data = json.loads(Path(inventory_path).read_text())
    rows = []
    for item in data.get("items", []):
        for asset, url in (item.get("assets") or {}).items():
            if not url:
                continue
            try:
                validate_url(url, allow_hosts)
            except ValueError:
                continue
            rows.append(
                {
                    "source_id": safe_id(str(item.get("id", "unknown")) + "_" + asset),
                    "url": url,
                    "category": "stac_asset",
                    "claimed_acquisition_date": item.get("acquired") or "",
                    "date_basis": "stac_catalog_claim_unverified",
                    "case_id": "",
                }
            )
    ids = [r["source_id"] for r in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate STAC asset IDs")
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("x", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(rows)
    return len(rows)


def run_queue(
    queue_path,
    output_dir,
    allow_hosts,
    max_bytes=100 * 1024 * 1024,
    max_items=100,
    retries=2,
    fetcher=fetch,
    sleep=time.sleep,
):
    if not allow_hosts:
        raise ValueError("Explicit host allowlist required")
    if not 0 <= retries <= 5 or not 1 <= max_items <= 10000:
        raise ValueError("Invalid limits")
    if not 0 < max_bytes <= 2 * 1024**3:
        raise ValueError("Invalid max_bytes")
    rows = read_queue(queue_path)
    if len(rows) > max_items:
        raise ValueError("Queue exceeds item cap")
    root = Path(output_dir)
    root.mkdir(parents=True, exist_ok=True)
    results = []
    for r in rows:
        sid = safe_id(r["source_id"])
        url = r["url"]
        target = root / "raw" / sid / "original.bin"
        manifest = root / "manifests" / (sid + ".json")
        status = {"source_id": sid, "url": url, "status": "failed", "manifest": str(manifest)}
        try:
            validate_url(url, allow_hosts)
            if manifest.exists():
                status["status"] = "already_verified" if verify_manifest(manifest) else "integrity_failure"
                results.append(status)
                continue
            if target.exists():
                status["error"] = "Orphaned file exists; manual review required"
                results.append(status)
                continue
            for attempt in range(retries + 1):
                try:
                    result = fetcher(url, target, allow_hosts, max_bytes=max_bytes)
                    result.update(
                        {
                            "case_id": r.get("case_id", ""),
                            "source_id": sid,
                            "category": r.get("category", ""),
                            "claimed_acquisition_date": r.get("claimed_acquisition_date", ""),
                            "date_basis": r.get("date_basis", "unverified"),
                            "warning": "Claimed date is not independently validated",
                        }
                    )
                    save_manifest(result, manifest)
                    status.update(status="downloaded", bytes=result["bytes"], sha256=result["sha256"])
                    break
                # exception object was bound but never read (flake8 F841):
                # except (TimeoutError, ConnectionError, OSError) as exc:
                except (TimeoutError, ConnectionError, OSError):
                    if target.exists():
                        break
                    if attempt == retries:
                        raise
                    sleep(min(2**attempt, 8))
        except Exception as exc:
            status["error"] = str(exc)
        results.append(status)
    report = root / "retrieval_report.json"
    if report.exists():
        # A previous report must not be silently overwritten.
        report = root / (
            "retrieval_report_"
            + hashlib.sha256(json.dumps(results, sort_keys=True).encode()).hexdigest()[:12]
            + ".json"
        )
    if report.exists():
        raise FileExistsError(report)
    report.write_text(json.dumps({"queue": str(queue_path), "results": results}, indent=2) + "\n")
    return results


def verify_queue(output_dir):
    root = Path(output_dir)
    manifests = sorted((root / "manifests").glob("*.json"))
    return {p.stem: verify_manifest(p) for p in manifests}
