"""HFMR reproducible archival raster analysis (research, not forensic validation)."""

from __future__ import annotations
import csv
import hashlib
import json
import math
import pathlib
import statistics
from datetime import datetime, timezone
from .hfmr import Ledger
# unused (flake8 F401), kept for reference: from .hfmr import canonical, sha256


def digest_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_grid(path):
    """Portable CSV gridded scalar values; missing cells are blank; not SAR raw phase."""
    with open(path, newline="") as f:
        rows = [[float(v) if v.strip() else math.nan for v in row] for row in csv.reader(f)]
    if not rows or not rows[0] or any(len(r) != len(rows[0]) for r in rows):
        raise ValueError("nonrectangular/empty grid")
    if any(not math.isfinite(v) and not math.isnan(v) for r in rows for v in r):
        raise ValueError("infinite value")
    return rows


def robust_stats(grid):
    a = [v for r in grid for v in r if math.isfinite(v)]
    if len(a) < 9:
        raise ValueError("at least nine finite cells required")
    median = statistics.median(a)
    mad = statistics.median(abs(x - median) for x in a)
    return median, max(1.4826 * mad, 1e-9)


def anomalies(grid, threshold=3.5, min_pixels=2):
    """Connected positive/negative robust residuals; scores are NOT probabilities."""
    if threshold <= 0 or min_pixels < 1:
        raise ValueError("invalid thresholds")
    med, scale = robust_stats(grid)
    height = len(grid)
    width = len(grid[0])
    visited = set()
    features = []
    for r in range(height):
        for c in range(width):
            if (r, c) in visited or not math.isfinite(grid[r][c]):
                continue
            z = (grid[r][c] - med) / scale
            if abs(z) < threshold:
                continue
            sign = 1 if z > 0 else -1
            stack = [(r, c)]
            visited.add((r, c))
            cells = []
            while stack:
                y, x = stack.pop()
                cells.append((y, x))
                for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= yy < height and 0 <= xx < width and (yy, xx) not in visited and math.isfinite(grid[yy][xx]):
                        zz = (grid[yy][xx] - med) / scale
                        if zz * sign >= threshold:
                            visited.add((yy, xx))
                            stack.append((yy, xx))
            if len(cells) >= min_pixels:
                features.append(
                    {
                        "pixel_count": len(cells),
                        "centroid_col": sum(x for y, x in cells) / len(cells),
                        "centroid_row": sum(y for y, x in cells) / len(cells),
                        "peak_abs_robust_z": max(abs((grid[y][x] - med) / scale) for y, x in cells),
                        "polarity": "positive" if sign > 0 else "negative",
                        "bounding_pixels": [
                            min(x for y, x in cells),
                            min(y for y, x in cells),
                            max(x for y, x in cells),
                            max(y for y, x in cells),
                        ],
                    }
                )
    return sorted(features, key=lambda v: -v["peak_abs_robust_z"])


def compare(before, after, registration_sigma_cells=0):
    if len(before) != len(after) or len(before[0]) != len(after[0]):
        raise ValueError("unaligned grid shapes")
    if registration_sigma_cells < 0:
        raise ValueError("invalid registration uncertainty")
    diff = [
        [b - a if math.isfinite(a) and math.isfinite(b) else math.nan for a, b in zip(ra, rb)]
        for ra, rb in zip(before, after)
    ]
    return {
        "difference": diff,
        "registration_sigma_cells": registration_sigma_cells,
        "warning": "Pixelwise differences assume registration; registration uncertainty is recorded, not propagated.",
    }


def analyze(
    case_id, source, output, kind="scalar_grid", before=None, threshold=3.5, cell_size_m=None, origin_xy=None, crs=None
):
    """Process CSV only; no geographic coordinates without explicit validated transform."""
    if not case_id.strip():
        raise ValueError("case ID required")
    if kind != "scalar_grid":
        raise ValueError("unsupported format: convert using documented external adapter")
    if cell_size_m is not None and cell_size_m <= 0:
        raise ValueError("invalid cell size")
    out = pathlib.Path(output)
    out.mkdir(parents=True, exist_ok=True)
    raw = load_grid(source)
    prior = load_grid(before) if before else None
    work = compare(prior, raw)["difference"] if prior else raw
    candidates = anomalies(work, threshold)
    if origin_xy is not None and (cell_size_m is None or not crs):
        raise ValueError("origin requires cell size and CRS")
    for i, a in enumerate(candidates):
        a["id"] = f"A{i + 1:04d}"
        if origin_xy is not None:
            a["map_xy"] = [
                origin_xy[0] + (a["centroid_col"] + 0.5) * cell_size_m,
                origin_xy[1] - (a["centroid_row"] + 0.5) * cell_size_m,
            ]
    manifest = {
        "schema": "hfmr.run.v1",
        "case_id": case_id,
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "input": {
            "path": str(pathlib.Path(source).name),
            "sha256": digest_file(source),
            "format": "CSV scalar grid",
            "before_sha256": digest_file(before) if before else None,
        },
        "algorithm": {
            "name": "robust_mad_connected_components",
            "version": "1.0",
            "threshold": threshold,
            "min_pixels": 2,
        },
        "spatial": {"crs": crs, "cell_size_m": cell_size_m, "origin_xy": origin_xy},
        "result": {"candidate_count": len(candidates), "candidates": candidates},
        "limitations": [
            "Anomaly detection only: NOT a metal classifier or remains probability.",
            "CSV scalar grids are not raw SAR/GPR/LiDAR measurements.",
            "No blind validation or sensor-specific calibration supplied.",
            "Pixelwise comparison requires independently verified alignment.",
        ],
    }
    path = out / "manifest.json"
    path.write_bytes(json.dumps(manifest, indent=2, allow_nan=False).encode())
    # Original (ledger written first, GeoJSON after and never hashed):
    # ledger = Ledger(out / "ledger.jsonl")
    # head = ledger.append({"type": "analysis", "manifest_sha256": digest_file(path), "case_id": case_id})
    # (out / "ledger_head.txt").write_text(head + "\n")
    # features = {"type": "FeatureCollection", "features": []}
    # if origin_xy is not None:
    #     for a in candidates:
    #         features["features"].append(
    #             {
    #                 "type": "Feature",
    #                 "geometry": {"type": "Point", "coordinates": a["map_xy"]},
    #                 "properties": {k: v for k, v in a.items() if k != "map_xy"},
    #             }
    #         )
    #     (out / "candidate_points.geojson").write_text(json.dumps(features, indent=2))
    #   Two problems: verify_run could not detect tampering of candidate_points.geojson, and
    #   projected map_xy values (e.g. EPSG:32613 metres) were written as bare GeoJSON
    #   coordinates, which RFC 7946 readers take as WGS 84 lon/lat and plot far off.
    #   The GeoJSON is now written first and its digest chained in the ledger entry, and a
    #   non-WGS 84 CRS is declared with a named "crs" member (honoured by GDAL/QGIS) plus a
    #   source_crs property. Coordinates stay in the supplied CRS: this stdlib-only pipeline
    #   has no projection library, so it labels rather than silently reprojects.
    event = {"type": "analysis", "manifest_sha256": digest_file(path), "case_id": case_id}
    if origin_xy is not None:
        features = {"type": "FeatureCollection", "features": []}
        if not _is_wgs84(crs):
            features["crs"] = {"type": "name", "properties": {"name": crs}}
        for a in candidates:
            properties = {k: v for k, v in a.items() if k != "map_xy"}
            properties["source_crs"] = crs
            features["features"].append(
                {"type": "Feature", "geometry": {"type": "Point", "coordinates": a["map_xy"]}, "properties": properties}
            )
        geo_path = out / "candidate_points.geojson"
        geo_path.write_text(json.dumps(features, indent=2))
        event["candidate_points_sha256"] = digest_file(geo_path)
    ledger = Ledger(out / "ledger.jsonl")
    head = ledger.append(event)
    (out / "ledger_head.txt").write_text(head + "\n")
    return manifest


_WGS84_NAMES = {
    "EPSG:4326",
    "OGC:CRS84",
    "CRS84",
    "WGS84",
    "URN:OGC:DEF:CRS:OGC:1.3:CRS84",
    "URN:OGC:DEF:CRS:EPSG::4326",
}


def _is_wgs84(crs):
    return str(crs or "").strip().upper() in _WGS84_NAMES


def verify_run(out):
    out = pathlib.Path(out)
    head = (out / "ledger_head.txt").read_text().strip()
    if not Ledger(out / "ledger.jsonl").verify(head):
        return False
    entries = Ledger(out / "ledger.jsonl").read()
    if not entries:
        return False
    # Original: return entries[-1]["event"]["manifest_sha256"] == digest_file(out / "manifest.json")
    #   candidate_points.geojson is a run output too; its chained digest is now checked as well.
    event = entries[-1]["event"]
    if event["manifest_sha256"] != digest_file(out / "manifest.json"):
        return False
    geojson_sha256 = event.get("candidate_points_sha256")
    if geojson_sha256 is not None:
        geo_path = out / "candidate_points.geojson"
        return geo_path.is_file() and digest_file(geo_path) == geojson_sha256
    return True
