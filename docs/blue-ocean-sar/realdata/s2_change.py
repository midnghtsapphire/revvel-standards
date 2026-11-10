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

Red-edge indices (SYSTEM_REVIEW B6, 2026-10-16)
-----------------------------------------------
Two red-edge indices are computed from the same L2A COGs, alongside NDVI:

  NDRE = (B8A - B05) / (B8A + B05)   narrow NIR vs red edge 1 (Gitelson & Merzlyak 1994 form)
  CIre = B07 / B05 - 1               red-edge chlorophyll index, Sentinel-2 variant of
                                     Gitelson et al. 2003 (J Plant Physiol 160:271-282)

B05, B07 and B8A are 20 m bands. ``--index`` picks the index whose change map
drives the loss clusters and pond bands (ndvi, ndre or cire); change maps for
all three are always written. Grid (``--grid-m``):

* 20 m (default for ndre/cire): every index is computed on the native 20 m
  grid. 10 m bands (B03, B04, B08) are averaged 2x2 onto it, so NDVI loses its
  10 m detail. This is the honest grid for red edge.
* 10 m (default for ndvi): 20 m bands are nearest-neighbour copied into 2x2
  blocks of 10 m cells. No 10 m red-edge detail is created; NDRE/CIre clusters
  are still 20 m features.

B06 is not read: neither index uses it. ``--min-px`` counts grid pixels, so 4
pixels is 400 m^2 at 10 m and 1600 m^2 at 20 m.

What this can and cannot do (also written into change_summary.json):
red-edge indices respond to leaf chlorophyll and canopy stress earlier and more
linearly than NDVI. The grave-vegetation literature is airborne or leaf-level
hyperspectral work at sub-metre to ~1 m pixels: Kalacska et al. 2009 (J
Forensic Sci 54(1):159-166, an experimental animal mass grave, Costa Rica),
Leblanc, Kalacska & Soffer 2014 (Forensic Sci Int 245:17-23, single graves,
airborne hyperspectral), and McGill theses from the Kalacska lab (Snirer MSc
2013; Ifimov MSc 2015; a de Gea honours project relating red-edge NDVI to
chlorophyll). **Detecting a single grave at 10-20 m Sentinel-2 pixels is not
established by any of these.** Treat every flagged cluster as a ground
disturbance / vegetation-stress screen to check on the ground, never as a
grave detection.

Candid note on earlier material: AI-generated reports in this case set
claimed that a SIPI "chlorophyll flush" detects decomposition. That claim was
never validated against any grave or decomposition data; SIPI is not computed
here and should not be cited as evidence.

Example:
  python s2_change.py --lat 36.6534 --lon -94.4418 --radius-m 1609 \
      --before 2026-08-15 2026-09-14 --after 2026-09-16 2026-10-15 --out-dir out_lindeman
  python s2_change.py --lat 50.88 --lon -119.89 --radius-m 400 --index ndre \
      --before 2026-07-01 2026-07-31 --after 2026-08-15 2026-09-15 --out-dir out_sunpeaks_ndre
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

# Native resolution (m) of every band read. B06 is deliberately absent (unused).
BAND_RES = {"B03": 10, "B04": 10, "B08": 10, "B05": 20, "B07": 20, "B8A": 20}
INDEX_DEFINITIONS = {
    "ndvi": "(B08 - B04) / (B08 + B04)",
    "ndwi": "(B03 - B08) / (B03 + B08)  (McFeeters 1996; used for ponds only)",
    "ndre": "(B8A - B05) / (B8A + B05)",
    "cire": "B07 / B05 - 1",
}
CHANGE_INDICES = ("ndvi", "ndre", "cire")
INTERPRETATION = {
    "status": "disturbance screen, not grave detection",
    "limit": ("Single-grave detection at 10-20 m Sentinel-2 pixels is not established. A flagged cluster is a "
              "vegetation-stress / ground-disturbance anomaly to check on the ground; it does not say why "
              "vegetation changed."),
    "literature": [
        "Kalacska M, Bell LS, Sanchez-Azofeifa GA, Caelli T (2009) The application of remote sensing for detecting "
        "mass graves: an experimental animal case study from Costa Rica. J Forensic Sci 54(1):159-166.",
        "Leblanc G, Kalacska M, Soffer R (2014) Detection of single graves by airborne hyperspectral imaging. "
        "Forensic Sci Int 245:17-23.",
        "McGill University theses, Kalacska lab (eScholarship): Snirer (MSc 2013), Ifimov (MSc 2015), and a "
        "de Gea honours project relating red-edge NDVI to leaf chlorophyll.",
        "Gitelson A, Merzlyak MN (1994) red-edge NDVI; Gitelson AA, Gritz Y, Merzlyak MN (2003) J Plant Physiol "
        "160:271-282 (chlorophyll index red edge).",
    ],
    "scale_gap": ("All of the above are leaf-level or airborne work at sub-metre to ~1 m pixels; none validates "
                  "10-20 m satellite pixels for single graves."),
    "unvalidated_prior_claim": ("AI-generated reports claimed a SIPI 'chlorophyll flush' detects decomposition; "
                                "never validated, not computed here."),
}


def default_grid(index):
    """10 m for NDVI (its native grid), 20 m for the red-edge indices."""
    return 10 if index == "ndvi" else 20


def indices_from_reflectance(b):
    """Index arrays from a dict of surface-reflectance band arrays."""
    with np.errstate(divide="ignore", invalid="ignore"):
        return {
            "ndvi": (b["B08"] - b["B04"]) / (b["B08"] + b["B04"]),
            "ndwi": (b["B03"] - b["B08"]) / (b["B03"] + b["B08"]),
            "ndre": (b["B8A"] - b["B05"]) / (b["B8A"] + b["B05"]),
            "cire": b["B07"] / b["B05"] - 1.0,
        }


def _dates(start, end):
    a, b = dt.date.fromisoformat(start), dt.date.fromisoformat(end)
    months = sorted({(d.year, d.month) for d in (a + dt.timedelta(days=i) for i in range((b - a).days + 1))})
    return a, b, months


# SYSTEM_REVIEW B6: replaced by the multi-band, grid-selectable read_scene/composite below.
# def read_scene(base, x, y, half):
#     """Return (ndvi, ndwi, clear_or_water_mask, window_transform, crs) for a
#     square window of +/-half metres around projected (x, y), or None."""
#     offset, _ = boa_offset(base)
#     if offset is None:
#         return None
#     with rasterio.open(f"{base}/B04.tif") as src:
#         win = from_bounds(x - half, y - half, x + half, y + half, src.transform).round_offsets().round_lengths()
#         red = src.read(1, window=win, boundless=True, fill_value=0).astype("f8")
#         wtr, crs, full_t = src.window_transform(win), src.crs, src.transform
#     bands = {}
#     for name in ("B08", "B03"):
#         with rasterio.open(f"{base}/{name}.tif") as src:
#             bands[name] = src.read(1, window=win, boundless=True, fill_value=0).astype("f8")
#     with rasterio.open(f"{base}/SCL.tif") as src:
#         sw = from_bounds(*rasterio.windows.bounds(win, full_t), src.transform)
#         scl = src.read(1, window=sw, out_shape=red.shape, resampling=Resampling.nearest, boundless=True, fill_value=0)
#     nodata = (red == 0) | (bands["B08"] == 0) | (bands["B03"] == 0)
#     r, n, g = ((v - offset) / 10000.0 for v in (red, bands["B08"], bands["B03"]))
#     with np.errstate(divide="ignore", invalid="ignore"):
#         ndvi = (n - r) / (n + r)
#         ndwi = (g - n) / (g + n)
#     ok = np.isin(scl, SCL_KEEP + (SCL_WATER,)) & ~nodata & np.isfinite(ndvi) & np.isfinite(ndwi)
#     return ndvi, ndwi, ok, wtr, crs
#
#
# def composite(lat, lon, radius_m, start, end, tile=None, min_clear=0.5, log=print):
#     """Median NDVI/NDWI over clear scenes between start and end (inclusive)."""
#     _setup_gdal()
#     a, b, months = _dates(start, end)
#     tiles = [tile] if tile else candidate_tiles(lat, lon)
#     used, ndvis, ndwis, ref = [], [], [], None
#     for t in tiles:
#         for y, m in months:
#             try:
#                 scenes = list_scenes(t, y, m)
#             except Exception as e:
#                 log(f"list {t} {y}-{m}: {e}")
#                 continue
#             for scene in sorted(scenes):
#                 ymd = re.search(r"_(\d{8})_", scene).group(1)
#                 d = dt.date(int(ymd[:4]), int(ymd[4:6]), int(ymd[6:]))
#                 if not a <= d <= b or any(u["date"] == d.isoformat() for u in used):
#                     continue
#                 base = scene_url(t, scene)
#                 if ref is None:
#                     with rasterio.open(f"{base}/B04.tif") as src:
#                         (x,), (yy,) = transform("EPSG:4326", src.crs, [lon], [lat])
#                     ref = (x, yy)
#                 try:
#                     res = read_scene(base, ref[0], ref[1], radius_m + 50)
#                 except Exception as e:
#                     log(f"{scene}: {e}")
#                     continue
#                 if res is None:
#                     continue
#                 ndvi, ndwi, ok, wtr, crs = res
#                 frac = float(ok.mean())
#                 log(f"{d} {scene} clear={frac:.2f}")
#                 if frac < min_clear:
#                     continue
#                 ndvis.append(np.where(ok, ndvi, np.nan))
#                 ndwis.append(np.where(ok, ndwi, np.nan))
#                 used.append({"date": d.isoformat(), "scene": scene, "clear_fraction": round(frac, 3),
#                              "source_url": base})
#                 grid = (wtr, crs)
#         if used:
#             break  # keep one tile so every scene shares the same pixel grid
#     if not used:
#         return None
#     with np.errstate(all="ignore"):
#         return {"ndvi": np.nanmedian(np.stack(ndvis), 0), "ndwi": np.nanmedian(np.stack(ndwis), 0),
#                 "scenes": used, "transform": grid[0], "crs": grid[1], "tile": t, "centre_xy": ref}


def read_scene(base, x, y, half, grid_m=10):
    """Return (indices, clear_or_water_mask, window_transform, crs) for a
    square window of +/-half metres around projected (x, y), or None.

    ``indices`` maps ndvi/ndwi/ndre/cire to arrays on a ``grid_m`` grid
    (10 or 20). Finer bands are averaged onto a coarser grid; coarser bands
    (and SCL) are nearest-neighbour copied onto a finer one."""
    if grid_m not in (10, 20):
        raise ValueError("grid_m must be 10 or 20")
    offset, _ = boa_offset(base)
    if offset is None:
        return None
    ref = "B04" if grid_m == 10 else "B05"
    with rasterio.open(f"{base}/{ref}.tif") as src:
        win = from_bounds(x - half, y - half, x + half, y + half, src.transform).round_offsets().round_lengths()
        shape = (int(win.height), int(win.width))
        bounds = rasterio.windows.bounds(win, src.transform)
        wtr, crs = src.window_transform(win), src.crs
    raw = {}
    for name, res in BAND_RES.items():
        rs = Resampling.average if res < grid_m else Resampling.nearest
        with rasterio.open(f"{base}/{name}.tif") as src:
            w = from_bounds(*bounds, src.transform)
            raw[name] = src.read(1, window=w, out_shape=shape, resampling=rs, boundless=True,
                                 fill_value=0).astype("f8")
    with rasterio.open(f"{base}/SCL.tif") as src:
        sw = from_bounds(*bounds, src.transform)
        scl = src.read(1, window=sw, out_shape=shape, resampling=Resampling.nearest, boundless=True, fill_value=0)
    nodata = np.zeros(shape, dtype=bool)
    for v in raw.values():
        nodata |= v == 0
    idx = indices_from_reflectance({k: (v - offset) / 10000.0 for k, v in raw.items()})
    ok = np.isin(scl, SCL_KEEP + (SCL_WATER,)) & ~nodata
    for v in idx.values():
        ok &= np.isfinite(v)
    return idx, ok, wtr, crs


def composite(lat, lon, radius_m, start, end, tile=None, min_clear=0.5, log=print, grid_m=10):
    """Median NDVI/NDWI/NDRE/CIre over clear scenes between start and end (inclusive)."""
    _setup_gdal()
    a, b, months = _dates(start, end)
    tiles = [tile] if tile else candidate_tiles(lat, lon)
    used, stacks, ref = [], {k: [] for k in INDEX_DEFINITIONS}, None
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
                    res = read_scene(base, ref[0], ref[1], radius_m + 50, grid_m)
                except Exception as e:
                    log(f"{scene}: {e}")
                    continue
                if res is None:
                    continue
                idx, ok, wtr, crs = res
                frac = float(ok.mean())
                log(f"{d} {scene} clear={frac:.2f}")
                if frac < min_clear:
                    continue
                for k in stacks:
                    stacks[k].append(np.where(ok, idx[k], np.nan))
                used.append({"date": d.isoformat(), "scene": scene, "clear_fraction": round(frac, 3),
                             "source_url": base})
                grid = (wtr, crs)
        if used:
            break  # keep one tile so every scene shares the same pixel grid
    if not used:
        return None
    out = {"scenes": used, "transform": grid[0], "crs": grid[1], "tile": t, "centre_xy": ref, "grid_m": grid_m}
    with np.errstate(all="ignore"):
        for k, v in stacks.items():
            out[k] = np.nanmedian(np.stack(v), 0)
    return out


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


# SYSTEM_REVIEW B6: replaced to take the change index (ndvi/ndre/cire), grid and min_px; new versions below.
# def loss_clusters(dndvi, inside, z_limit=-2.0, min_px=4):
#     """Clusters whose NDVI change is at least |z_limit| sd below the area's
#     median change. Returns clusters plus the area statistics used."""
#     vals = dndvi[inside & np.isfinite(dndvi)]
#     med = float(np.median(vals))
#     sd = float(1.4826 * np.median(np.abs(vals - med)))  # robust sd (MAD)
#     z = (dndvi - med) / sd if sd > 0 else np.zeros_like(dndvi)
#     lab, n = ndimage.label((z <= z_limit) & inside & np.isfinite(dndvi))
#     out = []
#     for i in range(1, n + 1):
#         m = lab == i
#         if m.sum() >= min_px:
#             r, c = ndimage.center_of_mass(m)
#             out.append({"pixels": int(m.sum()), "mean_dndvi": float(np.nanmean(dndvi[m])),
#                         "mean_z": float(np.nanmean(z[m])), "row": r, "col": c})
#     return sorted(out, key=lambda k: k["mean_z"]), {"median_dndvi": med, "robust_sd": sd, "pixels": int(vals.size)}
#
#
# def analyse(lat, lon, radius_m, before, after, pond_band_m=60.0, z_limit=-2.0, log=print):
#     pre = composite(lat, lon, radius_m, *before, log=log)
#     if pre is None:
#         return {"error": "no clear 'before' scenes"}
#     post = composite(lat, lon, radius_m, *after, tile=pre["tile"], log=log)
#     if post is None:
#         return {"error": "no clear 'after' scenes", "before_scenes": pre["scenes"]}
#     t, crs = pre["transform"], pre["crs"]
#     px = abs(t.a)
#     dndvi = post["ndvi"] - pre["ndvi"]
#     rr, cc = np.indices(dndvi.shape)
#     ccol, crow = ~t * pre["centre_xy"]
#     dist = np.hypot(rr + 0.5 - crow, cc + 0.5 - ccol) * px
#     inside = dist <= radius_m
#
#     ponds = []
#     stats_area = loss_clusters(dndvi, inside, z_limit)[1]
#     for p in find_ponds(pre["ndwi"], inside, px):
#         band = ndimage.binary_dilation(p["mask"], iterations=max(1, int(round(pond_band_m / px))))
#         band = band & ~p["mask"] & inside  (one line in the original; wrapped here for E501)
#         d = dndvi[band & np.isfinite(dndvi)]
#         (plat,), (plon,) = _to_lonlat(t, crs, [p["row"]], [p["col"]])
#         ponds.append({
#             "lat": round(plat, 6), "lon": round(plon, 6), "area_m2": p["area_m2"],
#             "distance_from_centre_m": round(float(dist[int(p["row"]), int(p["col"])]), 1),
#             "band_m": pond_band_m, "band_pixels": int(d.size),
#             "band_mean_dndvi": float(d.mean()) if d.size else None,
#             "band_z_vs_area": (float((d.mean() - stats_area["median_dndvi"]) / stats_area["robust_sd"])
#                                if d.size and stats_area["robust_sd"] > 0 else None),
#             "band_pixels_flagged": int(((d - stats_area["median_dndvi"]) / stats_area["robust_sd"] <= z_limit).sum())
#             if d.size and stats_area["robust_sd"] > 0 else 0,
#         })
#
#     clusters, stats = loss_clusters(dndvi, inside, z_limit)
#     for k in clusters:
#         (k["lat"],), (k["lon"],) = _to_lonlat(t, crs, [k["row"]], [k["col"]])
#         k["distance_from_centre_m"] = round(float(dist[int(k["row"]), int(k["col"])]), 1)
#         k["area_m2"] = k["pixels"] * px * px
#         del k["row"], k["col"]
#     return {
#         "centre": {"lat": lat, "lon": lon}, "radius_m": radius_m, "pixel_m": px, "tile": pre["tile"],
#         "before": {"range": list(before), "scenes": pre["scenes"]},
#         "after": {"range": list(after), "scenes": post["scenes"]},
#         "area_change": stats, "z_limit": z_limit, "ponds": ponds, "loss_clusters": clusters,
#         "_rasters": {"dndvi": dndvi, "ndvi_before": pre["ndvi"], "ndvi_after": post["ndvi"],
#                      "ndwi_before": pre["ndwi"], "transform": t, "crs": crs},
#     }
#
#
# def main(argv=None):
#     ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
#     ap.add_argument("--lat", type=float, required=True)
#     ap.add_argument("--lon", type=float, required=True)
#     ap.add_argument("--radius-m", type=float, default=1609.0)
#     ap.add_argument("--before", nargs=2, required=True, metavar=("START", "END"))
#     ap.add_argument("--after", nargs=2, required=True, metavar=("START", "END"))
#     ap.add_argument("--pond-band-m", type=float, default=60.0)
#     ap.add_argument("--z-limit", type=float, default=-2.0)
#     ap.add_argument("--out-dir", required=True)
#     a = ap.parse_args(argv)
#     res = analyse(a.lat, a.lon, a.radius_m, tuple(a.before), tuple(a.after), a.pond_band_m, a.z_limit,
#                   log=lambda s: print(s, file=sys.stderr))
#     os.makedirs(a.out_dir, exist_ok=True)
#     rasters = res.pop("_rasters", None)
#     if rasters:
#         for name in ("dndvi", "ndvi_before", "ndvi_after", "ndwi_before"):
#             arr = rasters[name].astype("float32")
#             with rasterio.open(os.path.join(a.out_dir, f"{name}.tif"), "w", driver="GTiff", height=arr.shape[0],
#                                width=arr.shape[1], count=1, dtype="float32", crs=rasters["crs"],
#                                transform=rasters["transform"], nodata=np.nan) as dst:
#                 dst.write(arr, 1)
#     with open(os.path.join(a.out_dir, "change_summary.json"), "w") as f:
#         json.dump(res, f, indent=2)
#     print(json.dumps({k: res[k] for k in ("area_change", "ponds") if k in res}, indent=2))
#     # Exit 0 means the analysis ran with both composites; 2 means it could not.
#     return 0 if "error" not in res else 2


def loss_clusters(dchange, inside, z_limit=-2.0, min_px=4, index="ndvi"):
    """Clusters whose change in ``index`` is at least |z_limit| robust sd
    below the area's median change. Returns clusters plus the area statistics
    used. Keys are named for the index (``mean_dndvi``, ``median_dndre``...)."""
    vals = dchange[inside & np.isfinite(dchange)]
    med = float(np.median(vals))
    sd = float(1.4826 * np.median(np.abs(vals - med)))  # robust sd (MAD)
    z = (dchange - med) / sd if sd > 0 else np.zeros_like(dchange)
    lab, n = ndimage.label((z <= z_limit) & inside & np.isfinite(dchange))
    out = []
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() >= min_px:
            r, c = ndimage.center_of_mass(m)
            out.append({"pixels": int(m.sum()), f"mean_d{index}": float(np.nanmean(dchange[m])),
                        "mean_z": float(np.nanmean(z[m])), "row": r, "col": c})
    return (sorted(out, key=lambda k: k["mean_z"]),
            {"index": index, f"median_d{index}": med, "robust_sd": sd, "pixels": int(vals.size)})


def change_maps(pre, post):
    """after - before for every change index; both composites share one grid."""
    return {k: post[k] - pre[k] for k in CHANGE_INDICES}


def analyse(lat, lon, radius_m, before, after, pond_band_m=60.0, z_limit=-2.0, log=print, index="ndvi",
            grid_m=None, min_px=4):
    if index not in CHANGE_INDICES:
        raise ValueError(f"index must be one of {CHANGE_INDICES}")
    grid_m = grid_m or default_grid(index)
    pre = composite(lat, lon, radius_m, *before, log=log, grid_m=grid_m)
    if pre is None:
        return {"error": "no clear 'before' scenes"}
    post = composite(lat, lon, radius_m, *after, tile=pre["tile"], log=log, grid_m=grid_m)
    if post is None:
        return {"error": "no clear 'after' scenes", "before_scenes": pre["scenes"]}
    t, crs = pre["transform"], pre["crs"]
    px = abs(t.a)
    deltas = change_maps(pre, post)
    dsel = deltas[index]
    rr, cc = np.indices(dsel.shape)
    ccol, crow = ~t * pre["centre_xy"]
    dist = np.hypot(rr + 0.5 - crow, cc + 0.5 - ccol) * px
    inside = dist <= radius_m
    mkey = f"median_d{index}"

    ponds = []
    stats_area = loss_clusters(dsel, inside, z_limit, min_px, index)[1]
    for p in find_ponds(pre["ndwi"], inside, px):
        band = ndimage.binary_dilation(p["mask"], iterations=max(1, int(round(pond_band_m / px)))) & ~p["mask"] & inside
        d = dsel[band & np.isfinite(dsel)]
        (plat,), (plon,) = _to_lonlat(t, crs, [p["row"]], [p["col"]])
        ok_sd = d.size and stats_area["robust_sd"] > 0
        ponds.append({
            "lat": round(plat, 6), "lon": round(plon, 6), "area_m2": p["area_m2"],
            "distance_from_centre_m": round(float(dist[int(p["row"]), int(p["col"])]), 1),
            "band_m": pond_band_m, "band_pixels": int(d.size),
            f"band_mean_d{index}": float(d.mean()) if d.size else None,
            "band_z_vs_area": float((d.mean() - stats_area[mkey]) / stats_area["robust_sd"]) if ok_sd else None,
            "band_pixels_flagged": int(((d - stats_area[mkey]) / stats_area["robust_sd"] <= z_limit).sum())
            if ok_sd else 0,
        })

    clusters, stats = loss_clusters(dsel, inside, z_limit, min_px, index)
    for k in clusters:
        (k["lat"],), (k["lon"],) = _to_lonlat(t, crs, [k["row"]], [k["col"]])
        k["distance_from_centre_m"] = round(float(dist[int(k["row"]), int(k["col"])]), 1)
        k["area_m2"] = k["pixels"] * px * px
        del k["row"], k["col"]
    other = {}
    for k in CHANGE_INDICES:
        v = deltas[k][inside & np.isfinite(deltas[k])]
        other[k] = {"median_change": float(np.median(v)) if v.size else None, "pixels": int(v.size)}
    rasters = {"transform": t, "crs": crs, "ndwi_before": pre["ndwi"]}
    for k in CHANGE_INDICES:
        rasters[f"d{k}"] = deltas[k]
        rasters[f"{k}_before"] = pre[k]
        rasters[f"{k}_after"] = post[k]
    return {
        "centre": {"lat": lat, "lon": lon}, "radius_m": radius_m, "pixel_m": px, "grid_m": grid_m,
        "tile": pre["tile"], "index": index, "index_definitions": INDEX_DEFINITIONS,
        "interpretation": INTERPRETATION,
        "before": {"range": list(before), "scenes": pre["scenes"]},
        "after": {"range": list(after), "scenes": post["scenes"]},
        "area_change": stats, "area_change_all_indices": other, "z_limit": z_limit, "min_px": min_px,
        "ponds": ponds, "loss_clusters": clusters, "_rasters": rasters,
    }


def write_rasters(rasters, out_dir):
    names = [k for k in rasters if k not in ("transform", "crs")]
    for name in names:
        arr = rasters[name].astype("float32")
        with rasterio.open(os.path.join(out_dir, f"{name}.tif"), "w", driver="GTiff", height=arr.shape[0],
                           width=arr.shape[1], count=1, dtype="float32", crs=rasters["crs"],
                           transform=rasters["transform"], nodata=np.nan) as dst:
            dst.write(arr, 1)
    return names


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--radius-m", type=float, default=1609.0)
    ap.add_argument("--before", nargs=2, required=True, metavar=("START", "END"))
    ap.add_argument("--after", nargs=2, required=True, metavar=("START", "END"))
    ap.add_argument("--pond-band-m", type=float, default=60.0)
    ap.add_argument("--z-limit", type=float, default=-2.0)
    ap.add_argument("--index", choices=CHANGE_INDICES, default="ndvi",
                    help="index whose change drives clusters and pond bands (all change maps are written)")
    ap.add_argument("--grid-m", type=int, choices=(10, 20), default=None,
                    help="analysis grid; default 10 for ndvi, 20 for ndre/cire")
    ap.add_argument("--min-px", type=int, default=4, help="minimum cluster size in grid pixels")
    ap.add_argument("--out-dir", required=True)
    a = ap.parse_args(argv)
    res = analyse(a.lat, a.lon, a.radius_m, tuple(a.before), tuple(a.after), a.pond_band_m, a.z_limit,
                  log=lambda s: print(s, file=sys.stderr), index=a.index, grid_m=a.grid_m, min_px=a.min_px)
    os.makedirs(a.out_dir, exist_ok=True)
    rasters = res.pop("_rasters", None)
    if rasters:
        res["rasters_written"] = [f"{n}.tif" for n in write_rasters(rasters, a.out_dir)]
    with open(os.path.join(a.out_dir, "change_summary.json"), "w") as f:
        json.dump(res, f, indent=2)
    print(json.dumps({k: res[k] for k in ("index", "grid_m", "area_change", "ponds") if k in res}, indent=2))
    print(f"NOTE: {INTERPRETATION['limit']}", file=sys.stderr)
    # Exit 0 means the analysis ran with both composites; 2 means it could not.
    return 0 if "error" not in res else 2


if __name__ == "__main__":
    sys.exit(main())
