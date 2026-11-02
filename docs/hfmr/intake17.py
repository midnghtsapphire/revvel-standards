"""Module 17: auditable offline bulk evidence intake with quarantine by status."""

import argparse
import hashlib
import json
import mimetypes
# unused (flake8 F401), kept for reference: import os
from datetime import datetime, timezone
from pathlib import Path
from .evidence_engine import document_intelligence

ALLOWED = {
    ".pdf",
    ".txt",
    ".md",
    ".csv",
    ".json",
    ".jpg",
    ".jpeg",
    ".png",
    ".tif",
    ".tiff",
    ".las",
    ".laz",
    ".zip",
    ".kml",
    ".kmz",
    ".geojson",
}


def hash_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def collect(root, output, max_mb=1024):
    root = Path(root).resolve()
    output = Path(output).resolve()
    if not root.is_dir():
        raise NotADirectoryError(root)
    if output.exists():
        raise FileExistsError(output)
    if root == output or root in output.parents:
        raise ValueError("Output must be outside source directory")
    entries = []
    seen = {}
    for p in sorted(root.rglob("*")):
        if p.is_symlink() or not p.is_file():
            continue
        rel = p.relative_to(root).as_posix()
        size = p.stat().st_size
        ext = p.suffix.lower()
        row = {
            "relative_path": rel,
            "bytes": size,
            "media_type": mimetypes.guess_type(p.name)[0],
            "sha256": None,
            "status": "pending",
            "findings": [],
        }
        if ext not in ALLOWED:
            row["status"] = "unsupported_extension"
        elif size > max_mb * 1024 * 1024:
            row["status"] = "oversize"
        else:
            row["sha256"] = hash_file(p)
            if row["sha256"] in seen:
                row["status"] = "duplicate_bytes"
                row["duplicate_of"] = seen[row["sha256"]]
            else:
                seen[row["sha256"]] = rel
                row["status"] = "registered_unreviewed"
                if ext in {".txt", ".md", ".csv", ".json", ".pdf"}:
                    try:
                        doc = document_intelligence(p)
                        row["findings"] = doc["findings"]
                        row["extraction_method"] = doc["extraction_method"]
                    except Exception as exc:
                        row["extraction_error"] = str(exc)
                        row["status"] = "registered_needs_extraction"
        entries.append(row)
    result = {
        "schema": "hfmr.intake17.v1",
        "source_root": str(root),
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "files": entries,
        "summary": {
            "total": len(entries),
            "registered": sum(x["status"].startswith("registered") for x in entries),
            "duplicates": sum(x["status"] == "duplicate_bytes" for x in entries),
            "unsupported": sum(x["status"] == "unsupported_extension" for x in entries),
        },
        "limitations": [
            "Document mentions are not verified construction events",
            "No OCR for image-only scans",
            "Hash manifests are not digital signatures",
            "Intake does not establish historical acquisition date",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(result, indent=2, sort_keys=True).encode()
    with output.open("xb") as f:
        f.write(raw)
    output.with_suffix(output.suffix + ".sha256").write_text(
        hashlib.sha256(raw).hexdigest() + "  " + output.name + "\n"
    )
    return result


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--max-mb", type=int, default=1024)
    v = p.parse_args()
    print(json.dumps(collect(v.source, v.output, v.max_mb)["summary"], indent=2))


if __name__ == "__main__":
    main()
