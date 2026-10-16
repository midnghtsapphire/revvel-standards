#!/usr/bin/env python3
"""Real Sentinel-2 before/after vegetation change over an area, plus ponds.

For a centre point and radius, reads every Sentinel-2 L2A scene in a
"before" and an "after" date range from the public AWS COG bucket (same
source as s2_ndvi.py), masks cloud/shadow with each scene's SCL layer, and
builds per-pixel median composites of:

  NDVI = (B08 - B04) / (B08 + B04)    vegetation
  NDWI = (B03 - B08) / (B03 + B08)    open water (McFeeters 1996)

It then reports:
  * water bodies (ponds) inside the radius, from the "before" NDWI;
  * NDVI change in a band around each pond;
  * clusters of NDVI loss that stand out from the area-wide change. Late
    September senescence lowers NDVI everywhere, so a cluster is flagged by
    its z-score against the whole area's change, not by raw drop.

10 m pixels: a cleared patch smaller than roughly 20 x 20 m will not show.
Change in NDVI says vegetation changed; it does not say why.

Example:
  python s2_change.py --lat 36.6534 --lon -94.4418 --radius-m 1609 \
      --before 2026-08-15 2026-09-14 --after 2026-09-16 2026-10-15 --out-dir out_lindeman
"""

import argparse
import datetime as dt
import json
import os
import re
import sys

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import transform
from rasterio.windows import from_bounds
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from s2_ndvi import SCL_KEEP, _setup_gdal, boa_offset, candidate_tiles, list_scenes, scene_url  # noqa: E402

SCL_WATER = 6


def _dates(start, end):
    a, b = dt.date.fromisoformat(start), dt.date.fromisoformat(end)
    months = sorted({(d.year, d.month) for d in (a + dt.timedelta(days=i) for i in range((b - a).days + 1))})
    return a, b, months


def read_scene(base, x, y, half):
    """Return (ndvi, ndwi, clear_or_water_mask, window_transform, crs) for a
    square window of +/-half metres around projected (x, y), or None."""
    offset, _ = boa_offset(base)
    if offset is None:
        return None
    with rasterio.open(f"{base}/B04.tif") as src:
        win = from_bounds(x - half, y - half, x + half, y + half, src.transform).round_offsets().round_lengths()
        red = src.read(1, window=win, boundless=True, fill_value=0).astype("f8")
        wtr, crs, full_t = src.window_transform(win), src.crs, src.transform
    bands = {}
    for name in ("B08", "B03"):
        with rasterio.open(f"{base}/{name}.tif") as src:
            bands[name] = src.read(1, window=win, boundless=True, fill_value=0).astype("f8")
    with rasterio.open(f"{base}/SCL.tif") as src:
        sw = from_bounds(*rasterio.windows.bounds(win, full_t), src.transform)
        scl = src.read(1, window=sw, out_shape=red.shape, resampling=Resampling.nearest, boundless=True, fill_value=0)
    nodata = (red == 0) | (bands["B08"] == 0) | (bands["B03"] == 0)
    r, n, g = ((v - offset) / 10000.0 for v in (red, bands["B08"], bands["B03"]))
    with np.errstate(divide="ignore", invalid="ignore"):
        ndvi = (n - r) / (n + r)
        ndwi = (g - n) / (g + n)
    ok = np.isin(scl, SCL_KEEP + (SCL_WATER,)) & ~nodata & np.isfinite(ndvi) & np.isfinite(ndwi)
    return ndvi, ndwi, ok, wtr, crs


def composite(lat, lon, radius_m, start, end, tile=None, min_clear=0.5, log=print):
    """Median NDVI/NDWI over clear scenes between start and end (inclusive)."""
    _setup_gdal()
    a, b, months = _dates(start, end)
    tiles = [tile] if tile else candidate_tiles(lat, lon)
    used, ndvis, ndwis, ref = [], [], [], None
    for t in tiles:
        for y, m in months:
            try:
                scenes = list_scenes(t, y, m)
            except Exception as e:
                log(f"list {t} {y}-{m}: {e}")
                continue
            for scene in sorted(scenes):
                ymd = re.search(r"_(\d{8})_", scene).group(1)
                d = dt.date(int(ymd[:4]), int(ymd[4:6]), int(ymd[6:]))
                if not a <= d <= b or any(u["date"] == d.isoformat() for u in used):
                    continue
                base = scene_url(t, scene)
                if ref is None:
                    with rasterio.open(f"{base}/B04.tif") as src:
                        (x,), (yy,) = transform("EPSG:4326", src.crs, [lon], [lat])
                    ref = (x, yy)
                try:
                    res = read_scene(base, ref[0], ref[1], radius_m + 50)
                except Exception as e:
                    log(f"{scene}: {e}")
                    continue
                if res is None:
                    continue
                ndvi, ndwi, ok, wtr, crs = res
                frac = float(ok.mean())
                log(f"{d} {scene} clear={frac:.2f}")
                if frac < min_clear:
                    continue
                ndvis.append(np.where(ok, ndvi, np.nan))
                ndwis.append(np.where(ok, ndwi, np.nan))
                used.append({"date": d.isoformat(), "scene": scene, "clear_fraction": round(frac, 3),
                             "source_url": base})
                grid = (wtr, crs)
        if used:
            break  # keep one tile so every scene shares the same pixel grid
    if not used:
        return None
    with np.errstate(all="ignore"):
        return {"ndvi": np.nanmedian(np.stack(ndvis), 0), "ndwi": np.nanmedian(np.stack(ndwis), 0),
                "scenes": used, "transform": grid[0], "crs": grid[1], "tile": t, "centre_xy": ref}


def _to_lonlat(t, crs, rows, cols):
    xs, ys = rasterio.transform.xy(t, rows, cols)
    lons, lats = transform(crs, "EPSG:4326", list(np.atleast_1d(xs)), list(np.atleast_1d(ys)))
    return lats, lons


def find_ponds(ndwi, inside, px_m, threshold=0.0, min_px=3):
    """Connected open-water clusters (NDWI > threshold) inside the radius."""
    lab, n = ndimage.label((ndwi > threshold) & inside)
    out = []
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() >= min_px:
            r, c = ndimage.center_of_mass(m)
            out.append({"label": i, "pixels": int(m.sum()), "area_m2": float(m.sum() * px_m * px_m),
                        "row": r, "col": c, "mask": m})
    return sorted(out, key=lambda p: -p["pixels"])


def loss_clusters(dndvi, inside, z_limit=-2.0, min_px=4):
    """Clusters whose NDVI change is at least |z_limit| sd below the area's
    median change. Returns clusters plus the area statistics used."""
    vals = dndvi[inside & np.isfinite(dndvi)]
    med = float(np.median(vals))
    sd = float(1.4826 * np.median(np.abs(vals - med)))  # robust sd (MAD)
    z = (dndvi - med) / sd if sd > 0 else np.zeros_like(dndvi)
    lab, n = ndimage.label((z <= z_limit) & inside & np.isfinite(dndvi))
    out = []
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() >= min_px:
            r, c = ndimage.center_of_mass(m)
            out.append({"pixels": int(m.sum()), "mean_dndvi": float(np.nanmean(dndvi[m])),
                        "mean_z": float(np.nanmean(z[m])), "row": r, "col": c})
    return sorted(out, key=lambda k: k["mean_z"]), {"median_dndvi": med, "robust_sd": sd, "pixels": int(vals.size)}


def analyse(lat, lon, radius_m, before, after, pond_band_m=60.0, z_limit=-2.0, log=print):
    pre = composite(lat, lon, radius_m, *before, log=log)
    if pre is None:
        return {"error": "no clear 'before' scenes"}
    post = composite(lat, lon, radius_m, *after, tile=pre["tile"], log=log)
    if post is None:
        return {"error": "no clear 'after' scenes", "before_scenes": pre["scenes"]}
    t, crs = pre["transform"], pre["crs"]
    px = abs(t.a)
    dndvi = post["ndvi"] - pre["ndvi"]
    rr, cc = np.indices(dndvi.shape)
    ccol, crow = ~t * pre["centre_xy"]
    dist = np.hypot(rr + 0.5 - crow, cc + 0.5 - ccol) * px
    inside = dist <= radius_m

    ponds = []
    stats_area = loss_clusters(dndvi, inside, z_limit)[1]
    for p in find_ponds(pre["ndwi"], inside, px):
        band = ndimage.binary_dilation(p["mask"], iterations=max(1, int(round(pond_band_m / px)))) & ~p["mask"] & inside
        d = dndvi[band & np.isfinite(dndvi)]
        (plat,), (plon,) = _to_lonlat(t, crs, [p["row"]], [p["col"]])
        ponds.append({
            "lat": round(plat, 6), "lon": round(plon, 6), "area_m2": p["area_m2"],
            "distance_from_centre_m": round(float(dist[int(p["row"]), int(p["col"])]), 1),
            "band_m": pond_band_m, "band_pixels": int(d.size),
            "band_mean_dndvi": float(d.mean()) if d.size else None,
            "band_z_vs_area": (float((d.mean() - stats_area["median_dndvi"]) / stats_area["robust_sd"])
                               if d.size and stats_area["robust_sd"] > 0 else None),
            "band_pixels_flagged": int(((d - stats_area["median_dndvi"]) / stats_area["robust_sd"] <= z_limit).sum())
            if d.size and stats_area["robust_sd"] > 0 else 0,
        })

    clusters, stats = loss_clusters(dndvi, inside, z_limit)
    for k in clusters:
        (k["lat"],), (k["lon"],) = _to_lonlat(t, crs, [k["row"]], [k["col"]])
        k["distance_from_centre_m"] = round(float(dist[int(k["row"]), int(k["col"])]), 1)
        k["area_m2"] = k["pixels"] * px * px
        del k["row"], k["col"]
    return {
        "centre": {"lat": lat, "lon": lon}, "radius_m": radius_m, "pixel_m": px, "tile": pre["tile"],
        "before": {"range": list(before), "scenes": pre["scenes"]},
        "after": {"range": list(after), "scenes": post["scenes"]},
        "area_change": stats, "z_limit": z_limit, "ponds": ponds, "loss_clusters": clusters,
        "_rasters": {"dndvi": dndvi, "ndvi_before": pre["ndvi"], "ndvi_after": post["ndvi"],
                     "ndwi_before": pre["ndwi"], "transform": t, "crs": crs},
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--radius-m", type=float, default=1609.0)
    ap.add_argument("--before", nargs=2, required=True, metavar=("START", "END"))
    ap.add_argument("--after", nargs=2, required=True, metavar=("START", "END"))
    ap.add_argument("--pond-band-m", type=float, default=60.0)
    ap.add_argument("--z-limit", type=float, default=-2.0)
    ap.add_argument("--out-dir", required=True)
    a = ap.parse_args(argv)
    res = analyse(a.lat, a.lon, a.radius_m, tuple(a.before), tuple(a.after), a.pond_band_m, a.z_limit,
                  log=lambda s: print(s, file=sys.stderr))
    os.makedirs(a.out_dir, exist_ok=True)
    rasters = res.pop("_rasters", None)
    if rasters:
        for name in ("dndvi", "ndvi_before", "ndvi_after", "ndwi_before"):
            arr = rasters[name].astype("float32")
            with rasterio.open(os.path.join(a.out_dir, f"{name}.tif"), "w", driver="GTiff", height=arr.shape[0],
                               width=arr.shape[1], count=1, dtype="float32", crs=rasters["crs"],
                               transform=rasters["transform"], nodata=np.nan) as dst:
                dst.write(arr, 1)
    with open(os.path.join(a.out_dir, "change_summary.json"), "w") as f:
        json.dump(res, f, indent=2)
    print(json.dumps({k: res[k] for k in ("area_change", "ponds") if k in res}, indent=2))
    # Exit 0 means the analysis ran with both composites; 2 means it could not.
    return 0 if "error" not in res else 2


if __name__ == "__main__":
    sys.exit(main())
