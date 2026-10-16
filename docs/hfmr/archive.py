"""Offline, non-destructive historical source registration and inspection."""

import csv
import hashlib
import json
import mimetypes
from datetime import datetime, timezone
from pathlib import Path


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def inspect_file(path):
    p = Path(path).resolve(strict=True)
    if not p.is_file():
        raise ValueError("Not a regular file")
    info = {
        "name": p.name,
        "bytes": p.stat().st_size,
        "sha256": sha256(p),
        "extension": p.suffix.lower(),
        "mime_guess": mimetypes.guess_type(p.name)[0],
        "metadata": {},
        "warnings": [],
    }
    if p.suffix.lower() in (".tif", ".tiff"):
        try:
            import rasterio

            with rasterio.open(p) as ds:
                info["metadata"] = {
                    "driver": ds.driver,
                    "width": ds.width,
                    "height": ds.height,
                    "bands": ds.count,
                    "crs": str(ds.crs) if ds.crs else None,
                    "bounds": list(ds.bounds),
                    "transform": list(ds.transform)[:6],
                    "nodata": ds.nodata,
                    "tags": ds.tags(),
                }
                if ds.crs is None:
                    info["warnings"].append("Missing CRS: cannot georeference safely")
        except ImportError:
            info["warnings"].append("Install rasterio to inspect GeoTIFF metadata")
    elif p.suffix.lower() in (".las", ".laz"):
        try:
            import laspy

            with laspy.open(p) as ds:
                hd = ds.header
                info["metadata"] = {
                    "point_count": hd.point_count,
                    "bounds_min": hd.mins.tolist(),
                    "bounds_max": hd.maxs.tolist(),
                    "crs": str(hd.parse_crs()) if hd.parse_crs() else None,
                    "version": str(hd.version),
                }
                if not hd.parse_crs():
                    info["warnings"].append("Missing CRS: cannot georeference safely")
        except ImportError:
            info["warnings"].append("Install laspy (and lazrs for LAZ) to inspect point clouds")
    elif p.suffix.lower() in (".jpg", ".jpeg", ".png"):
        try:
            from PIL import Image

            with Image.open(p) as im:
                info["metadata"] = {"size": list(im.size), "exif": {str(k): str(v) for k, v in im.getexif().items()}}
        except ImportError:
            info["warnings"].append("Install Pillow to inspect image EXIF")
    return info


def register(path, case_id, source_id, output, acquired=None, acquisition_basis="unknown", source_url=None):
    # Blank, whitespace-only, None and case variants of "unknown" are all "no basis".
    basis = str(acquisition_basis).strip() if acquisition_basis is not None else ""
    if not basis or basis.lower() == "unknown":
        basis = "unknown"
    if acquired:
        datetime.fromisoformat(acquired.replace("Z", "+00:00"))
        # Original: if acquisition_basis == "unknown":
        #   exact-string check let "", "  ", None and "UNKNOWN" through as an evidence basis.
        if basis == "unknown":
            raise ValueError("Acquisition date requires explicit evidence basis")
    data = {
        "schema": "hfmr.archive.v1",
        "case_id": case_id,
        "source_id": source_id,
        "source_url": source_url,
        "acquisition_time": acquired,
        # Original: "acquisition_basis": acquisition_basis,
        "acquisition_basis": basis,
        "registered_utc": datetime.now(timezone.utc).isoformat(),
        "file": inspect_file(path),
    }
    data["status"] = "acquisition_date_unverified" if not acquired else "registered_not_validated"
    out = Path(output)
    if out.exists():
        raise FileExistsError("Refusing to overwrite existing evidence manifest")
    out.parent.mkdir(parents=True, exist_ok=True)
    # Original: out.write_text(json.dumps(data, indent=2, sort_keys=True, default=str) + "\n", encoding="utf-8")
    #   the exists() check above and this write were not atomic, so a concurrent register()
    #   could overwrite the manifest. Exclusive creation ("x") makes the no-overwrite rule hold.
    with out.open("x", encoding="utf-8") as f:
        f.write(json.dumps(data, indent=2, sort_keys=True, default=str) + "\n")
    return data


def verify(manifest, source):
    d = json.loads(Path(manifest).read_text(encoding="utf-8"))
    return d["file"]["sha256"] == sha256(source) and d["file"]["bytes"] == Path(source).stat().st_size


def sources(registry):
    with open(registry, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))
