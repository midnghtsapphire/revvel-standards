"""Historical GeoTIFF comparison. Research prototype; not a material/remains detector."""

from __future__ import annotations
import json
import pathlib
# unused (flake8 F401), kept for reference: import math
from datetime import datetime, timezone
import numpy as np
from .pipeline import digest_file, anomalies
from .hfmr import Ledger


def inspect(path):
    import rasterio

    with rasterio.open(path) as ds:
        return {
            "driver": ds.driver,
            "width": ds.width,
            "height": ds.height,
            "count": ds.count,
            "crs": str(ds.crs) if ds.crs else None,
            "transform": list(ds.transform)[:6],
            "bounds": list(ds.bounds),
            "nodata": ds.nodata,
            "dtype": ds.dtypes[0],
            "units": ds.units[0] if ds.units else None,
            "sha256": digest_file(path),
        }


def run(
    case_id, before, after, output, threshold=3.5, min_pixels=2, band=1, resampling="bilinear", min_valid_fraction=0.2
):
    import rasterio
    from rasterio.warp import reproject, Resampling, transform as transform_coords

    if not case_id.strip():
        raise ValueError("case id required")
    if threshold <= 0 or min_pixels < 1:
        raise ValueError("invalid detector parameters")
    if resampling not in ("nearest", "bilinear"):
        raise ValueError("unsupported resampling")
    out = pathlib.Path(output)
    out.mkdir(parents=True, exist_ok=True)
    with rasterio.open(before) as a, rasterio.open(after) as b:
        if not a.crs or not b.crs:
            raise ValueError("both rasters require a real CRS")
        if not 1 <= band <= min(a.count, b.count):
            raise ValueError("invalid band")
        if a.width * a.height > 25_000_000:
            raise ValueError("prototype limit 25 million pixels")
        if a.crs.is_geographic and (abs(a.res[0]) > 1 or abs(a.res[1]) > 1):
            raise ValueError("suspicious geographic resolution")
        old = a.read(band, masked=True).astype("float64").filled(np.nan)
        new = np.full(old.shape, np.nan, dtype="float64")
        # NaN destination nodata avoids confusing valid zeros with missing observations.
        reproject(
            source=rasterio.band(b, band),
            destination=new,
            src_transform=b.transform,
            src_crs=b.crs,
            src_nodata=b.nodata,
            dst_transform=a.transform,
            dst_crs=a.crs,
            dst_nodata=np.nan,
            resampling=getattr(Resampling, resampling),
        )
        valid = np.isfinite(old) & np.isfinite(new)
        coverage = float(valid.mean())
        if coverage < min_valid_fraction or valid.sum() < 9:
            raise ValueError("insufficient spatial overlap")
        diff = np.where(valid, new - old, np.nan)
        # Prevent analysis on absurdly large grids without bounded memory.
        features = anomalies(diff.tolist(), threshold, min_pixels)
        geo = []
        for i, f in enumerate(features, 1):
            x, y = a.transform * (f["centroid_col"] + 0.5, f["centroid_row"] + 0.5)
            lon, lat = transform_coords(a.crs, "EPSG:4326", [x], [y])
            geo.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lon[0], lat[0]]},
                    "properties": {"id": f"A{i:04d}", **f, "source_xy": [x, y], "source_crs": str(a.crs)},
                }
            )
        fc = {"type": "FeatureCollection", "features": geo}
        (out / "candidates.geojson").write_text(json.dumps(fc, indent=2, allow_nan=False))
        # Keep numeric change raster and mask, with geospatial metadata.
        profile = a.profile.copy()
        profile.update(driver="GTiff", count=1, dtype="float32", nodata=-9999.0, compress="deflate")
        with rasterio.open(out / "difference.tif", "w", **profile) as dst:
            dst.write(np.where(valid, diff, -9999).astype("float32"), 1)
        manifest = {
            "schema": "hfmr.historical.v1",
            "case_id": case_id,
            "created_utc": datetime.now(timezone.utc).isoformat(),
            "sources": {
                "before": {"name": pathlib.Path(before).name, **inspect(before)},
                "after": {"name": pathlib.Path(after).name, **inspect(after)},
            },
            "processing": {
                "reference_grid": "before",
                "resampling": resampling,
                "band": band,
                "threshold": threshold,
                "min_pixels": min_pixels,
                "algorithm": "median_MAD_connected_components",
                "registration_uncertainty": "NOT estimated",
                "valid_overlap_fraction": coverage,
            },
            "outputs": {
                "difference_sha256": digest_file(out / "difference.tif"),
                "candidates_sha256": digest_file(out / "candidates.geojson"),
                "candidate_count": len(geo),
            },
            "limitations": [
                "Only comparable co-registered numeric bands are meaningful; radiometric and vertical datum harmonization are NOT performed.",  # noqa: E501
                "A detected change is not proof of metal, excavation, or human remains.",
                "No registration uncertainty propagation, blind calibration or material probabilities.",
                "The hash chain is not an immutable signed chain of custody.",
            ],
        }
        m = out / "manifest.json"
        m.write_text(json.dumps(manifest, indent=2, allow_nan=False))
        ledger = Ledger(out / "ledger.jsonl")
        head = ledger.append({"type": "historical_analysis", "case_id": case_id, "manifest_sha256": digest_file(m)})
        (out / "ledger_head.txt").write_text(head + "\n")
        return manifest


def verify(output):
    from .pipeline import verify_run

    out = pathlib.Path(output)
    if not verify_run(out):
        return False
    m = json.loads((out / "manifest.json").read_text())
    return m["outputs"]["difference_sha256"] == digest_file(out / "difference.tif") and m["outputs"][
        "candidates_sha256"
    ] == digest_file(out / "candidates.geojson")
