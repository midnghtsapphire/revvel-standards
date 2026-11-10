#!/usr/bin/env python3
"""Real terrain analysis around a point: slope, local relief, closed
depressions, and the downhill (steepest-descent) path from the point.

Elevation source, in order of preference:
  --dem FILE      your own GeoTIFF (drone DTM, NRCan HRDEM 1-2 m, USGS 3DEP 1 m)
  default         Copernicus GLO-30 DSM (30 m, global, public AWS bucket)

GLO-30 is 30 m and is a surface model (it includes trees and buildings), so it
shows gullies, benches and drainage paths, not anything grave-sized. Use
--dem with a 1 m bare-earth DTM for that.

Change mode (replaces run_county's random-terrain fallback):
  --before A.tif --after B.tif   difference of DEMs with a level of detection

Every output names the elevation file(s) it came from.
"""

import argparse
import heapq
import json
import math
import os
import sys

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.warp import Resampling, reproject, transform
from scipy import ndimage

COP_BASE = "https://copernicus-dem-30m.s3.amazonaws.com"


def _setup_gdal():
    ca = os.environ.get("REQUESTS_CA_BUNDLE") or os.environ.get("SSL_CERT_FILE")
    if ca and "CURL_CA_BUNDLE" not in os.environ:
        os.environ["CURL_CA_BUNDLE"] = ca
    os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")


def cop30_url(lat_floor, lon_floor):
    ns = f"N{lat_floor:02d}" if lat_floor >= 0 else f"S{-lat_floor:02d}"
    ew = f"E{lon_floor:03d}" if lon_floor >= 0 else f"W{-lon_floor:03d}"
    name = f"Copernicus_DSM_COG_10_{ns}_00_{ew}_00_DEM"
    return f"{COP_BASE}/{name}/{name}.tif"


def utm_crs(lat, lon):
    zone = int((lon + 180) // 6) + 1
    return CRS.from_epsg((32600 if lat >= 0 else 32700) + zone)


def load_grid(lat, lon, radius_m, res_m, sources):
    """Reproject one or more source rasters onto a square UTM grid centred on
    the point. Later sources only fill cells the earlier ones left empty."""
    dst_crs = utm_crs(lat, lon)
    (cx,), (cy,) = transform("EPSG:4326", dst_crs, [lon], [lat])
    n = int(math.ceil(2 * radius_m / res_m)) | 1  # odd, so the point is a cell centre
    dst_t = rasterio.transform.from_origin(cx - n * res_m / 2, cy + n * res_m / 2, res_m, res_m)
    out = np.full((n, n), np.nan, dtype="f8")
    for src_path in sources:
        tmp = np.full((n, n), np.nan, dtype="f8")
        with rasterio.open(src_path) as src:
            reproject(
                source=rasterio.band(src, 1), destination=tmp, dst_transform=dst_t, dst_crs=dst_crs,
                dst_nodata=np.nan, resampling=Resampling.bilinear,
            )
        fill = np.isnan(out) & ~np.isnan(tmp)
        out[fill] = tmp[fill]
    return out, dst_t, dst_crs


def cop30_sources(lat, lon, radius_m):
    dlat = radius_m / 111_000 + 0.01
    dlon = radius_m / (111_000 * max(0.1, math.cos(math.radians(lat)))) + 0.01
    tiles = {(math.floor(la), math.floor(lo)) for la in (lat - dlat, lat + dlat) for lo in (lon - dlon, lon + dlon)}
    return [cop30_url(a, b) for a, b in sorted(tiles)]


def slope_deg(z, res):
    gy, gx = np.gradient(z, res)
    return np.degrees(np.arctan(np.hypot(gx, gy)))


def local_relief(z, res, sigma_m):
    """Local relief model: elevation minus a smoothed trend surface."""
    filled = np.where(np.isnan(z), np.nanmean(z), z)
    return z - ndimage.gaussian_filter(filled, sigma_m / res)


def priority_flood(z, eps=0.0):
    """Fill closed depressions (Barnes et al. 2014 priority-flood).
    Returns the filled surface; filled - z is depression depth. With eps > 0,
    filled flats get a tiny gradient toward their outlet so a flow path can
    cross them (eps=0 for depth, eps>0 for routing)."""
    rows, cols = z.shape
    filled = z.copy()
    done = np.zeros(z.shape, bool)
    heap = []
    for r in range(rows):
        for c in (0, cols - 1):
            heapq.heappush(heap, (filled[r, c], r, c))
            done[r, c] = True
    for c in range(1, cols - 1):
        for r in (0, rows - 1):
            heapq.heappush(heap, (filled[r, c], r, c))
            done[r, c] = True
    nbrs = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    while heap:
        h, r, c = heapq.heappop(heap)
        for dr, dc in nbrs:
            rr, cc = r + dr, c + dc
            if 0 <= rr < rows and 0 <= cc < cols and not done[rr, cc]:
                done[rr, cc] = True
                if filled[rr, cc] < h + eps:
                    filled[rr, cc] = h + eps
                heapq.heappush(heap, (filled[rr, cc], rr, cc))
    return filled


def depressions(z, filled, res, min_depth_m, t, crs, top=20):
    depth = filled - z
    lab, n = ndimage.label(depth > min_depth_m, structure=np.ones((3, 3)))
    feats = []
    for i in range(1, n + 1):
        m = lab == i
        rr, cc = np.nonzero(m)
        k = np.argmax(depth[m])
        r0, c0 = rr[k], cc[k]
        x, y = rasterio.transform.xy(t, r0, c0)
        (lo,), (la,) = transform(crs, "EPSG:4326", [x], [y])
        feats.append({
            "max_depth_m": float(depth[r0, c0]), "area_m2": float(m.sum() * res * res),
            "volume_m3": float(depth[m].sum() * res * res), "lat": la, "lon": lo,
        })
    feats.sort(key=lambda f: f["volume_m3"], reverse=True)
    return feats[:top]


def downhill_path(filled, r, c, res, max_steps=5000):
    """Steepest-descent path over the depression-filled surface (D8),
    i.e. where water, or something sliding, would go from (r, c)."""
    path = [(r, c)]
    rows, cols = filled.shape
    for _ in range(max_steps):
        best, step = 0.0, None
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == dc == 0:
                    continue
                rr, cc = r + dr, c + dc
                if not (0 <= rr < rows and 0 <= cc < cols):
                    return path, "left_grid"
                drop = (filled[r, c] - filled[rr, cc]) / (res * math.hypot(dr, dc))
                if drop > best:
                    best, step = drop, (rr, cc)
        if step is None:
            return path, "flat_or_pit"
        r, c = step
        path.append(step)
    return path, "max_steps"


def slide_runout(coords_lon_lat_z, mu, g=9.81, v0=0.0):
    """Sliding-block run-out along a real terrain profile (the Whisper/
    Farber slope model, a = g(sin(theta) - mu cos(theta)), applied segment by
    segment to the DEM path instead of one assumed slope). Energy per unit
    mass: v^2 += 2 g (drop - mu * horizontal_run). Stops when v^2 <= 0."""
    if len(coords_lon_lat_z) < 2:
        return {"mu": mu, "stopped_after_m": 0.0, "max_speed_m_s": v0, "stop_index": 0}
    lon0, lat0 = coords_lon_lat_z[0][:2]
    kx = 111_320 * math.cos(math.radians(lat0))
    v2, dist, vmax = v0 * v0, 0.0, v0
    for i in range(1, len(coords_lon_lat_z)):
        (x1, y1, z1), (x2, y2, z2) = coords_lon_lat_z[i - 1], coords_lon_lat_z[i]
        run = math.hypot((x2 - x1) * kx, (y2 - y1) * 110_540)
        v2 += 2 * g * ((z1 - z2) - mu * run)
        if v2 <= 0:
            return {"mu": mu, "stopped_after_m": dist, "max_speed_m_s": vmax, "stop_index": i - 1,
                    "stop_lon_lat": [x1, y1]}
        dist += math.hypot(run, z1 - z2)
        vmax = max(vmax, math.sqrt(v2))
    return {"mu": mu, "stopped_after_m": None, "max_speed_m_s": vmax, "stop_index": None,
            "note": "still moving at the end of the profile; enlarge --radius-m"}


# def analyse_point(lat, lon, radius_m, res_m, sources, min_depth_m=0.5, lrm_sigma_m=None):
def analyse_point(lat, lon, radius_m, res_m, sources, min_depth_m=0.5, lrm_sigma_m=None, allow_partial=False):
    """allow_partial: run on a grid with nodata cells by filling them with the
    lowest elevation (the original behaviour). That invents terrain, so it is
    off by default and the count of filled cells is reported."""
    z, t, crs = load_grid(lat, lon, radius_m, res_m, sources)
    if np.isnan(z).all():
        raise ValueError("no elevation data covers this area")
    # Original: nodata was silently filled with the window minimum, which shows up
    # as false slopes, pits and downhill paths at the edge of coverage.
    # z = np.where(np.isnan(z), np.nanmin(z), z)
    nodata = int(np.isnan(z).sum())
    if nodata and not allow_partial:
        raise ValueError(f"{nodata} of {z.size} grid cells have no elevation data; shrink --radius-m, add a "
                         "--dem that covers them, or pass --allow-partial to fill them (results near the gap "
                         "are not real terrain)")
    z = np.where(np.isnan(z), np.nanmin(z), z)
    filled = priority_flood(z)
    routed = priority_flood(z, eps=1e-4)
    centre = z.shape[0] // 2
    path, end = downhill_path(routed, centre, centre, res_m)
    coords = []
    for r, c in path:
        x, y = rasterio.transform.xy(t, r, c)
        (lo,), (la,) = transform(crs, "EPSG:4326", [x], [y])
        coords.append([lo, la, float(z[r, c])])
    sl = slope_deg(z, res_m)
    lrm = local_relief(z, res_m, lrm_sigma_m or max(5 * res_m, 50.0))
    return {
        "point": {"lat": lat, "lon": lon, "elevation_m": float(z[centre, centre]),
                  "slope_deg": float(sl[centre, centre]), "local_relief_m": float(lrm[centre, centre])},
        "grid": {"res_m": res_m, "radius_m": radius_m, "crs": crs.to_string(), "cells": int(z.size)},
        "downhill_path": {"end": end, "length_m": float(sum(
            res_m * math.hypot(a[0] - b[0], a[1] - b[1]) for a, b in zip(path, path[1:]))),
            "drop_m": float(z[path[0]] - z[path[-1]]), "coords_lon_lat_z": coords},
        "depressions": depressions(z, filled, res_m, min_depth_m, t, crs),
        "sources": list(sources),
        "nodata_cells_filled": nodata,
        "note": "Copernicus GLO-30 is a 30 m surface model; it cannot resolve grave-scale features."
        if any("copernicus-dem-30m" in s for s in sources) else "",
        "_arrays": {"z": z, "slope": sl, "lrm": lrm, "depth": filled - z, "transform": t, "crs": crs},
    }


def dem_change(before, after, lod_m, min_cells=4):
    """DEM of difference on the `before` grid. Cells within +/-LoD are zeroed;
    remaining patches are reported with their mean change."""
    with rasterio.open(before) as b:
        zb = b.read(1, masked=True).filled(np.nan).astype("f8")
        t, crs = b.transform, b.crs
        res = abs(t.a)
    za = np.full(zb.shape, np.nan)
    with rasterio.open(after) as a:
        reproject(rasterio.band(a, 1), za, dst_transform=t, dst_crs=crs, dst_nodata=np.nan,
                  resampling=Resampling.bilinear)
    dod = za - zb
    sig = np.where(np.abs(dod) > lod_m, dod, 0.0)
    lab, n = ndimage.label(sig != 0)
    patches = []
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() < min_cells:
            continue
        rr, cc = np.nonzero(m)
        x, y = rasterio.transform.xy(t, int(rr.mean()), int(cc.mean()))
        (lo,), (la,) = transform(crs, "EPSG:4326", [x], [y])
        patches.append({"lat": la, "lon": lo, "area_m2": float(m.sum() * res * res),
                        "mean_change_m": float(np.nanmean(dod[m])), "min_change_m": float(np.nanmin(dod[m]))})
    patches.sort(key=lambda p: p["mean_change_m"])
    return {"lod_m": lod_m, "patches": patches, "sources": {"before": before, "after": after},
            "_arrays": {"dod": dod, "transform": t, "crs": crs}}


def _write_tif(path, arr, t, crs):
    with rasterio.open(path, "w", driver="GTiff", height=arr.shape[0], width=arr.shape[1], count=1,
                       dtype="float32", crs=crs, transform=t, nodata=np.nan) as dst:
        dst.write(arr.astype("float32"), 1)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--lat", type=float)
    ap.add_argument("--lon", type=float)
    ap.add_argument("--radius-m", type=float, default=1500.0)
    ap.add_argument("--res-m", type=float, help="grid resolution (default 30, or 1 with --dem)")
    ap.add_argument("--dem", action="append", help="your own elevation GeoTIFF(s); default Copernicus GLO-30")
    ap.add_argument("--min-depth-m", type=float, default=0.5)
    ap.add_argument("--allow-partial", action="store_true",
                    help="fill nodata cells with the lowest elevation instead of stopping (invents terrain)")
    ap.add_argument("--mu", type=float, nargs="*",
                    help="friction coefficient(s) for sliding run-out, e.g. 0.3 0.45 0.6")
    ap.add_argument("--before")
    ap.add_argument("--after")
    ap.add_argument("--lod-m", type=float, default=0.10)
    ap.add_argument("--out-prefix", required=True)
    a = ap.parse_args(argv)
    _setup_gdal()
    if a.before or a.after:
        if not (a.before and a.after):
            ap.error("--before and --after go together")
        res = dem_change(a.before, a.after, a.lod_m)
        arr = res.pop("_arrays")
        _write_tif(a.out_prefix + "_dod.tif", arr["dod"], arr["transform"], arr["crs"])
    else:
        if a.lat is None or a.lon is None:
            ap.error("--lat/--lon required")
        sources = a.dem or cop30_sources(a.lat, a.lon, a.radius_m)
        res_m = a.res_m or (1.0 if a.dem else 30.0)
        # res = analyse_point(a.lat, a.lon, a.radius_m, res_m, sources, a.min_depth_m)
        res = analyse_point(a.lat, a.lon, a.radius_m, res_m, sources, a.min_depth_m, allow_partial=a.allow_partial)
        if a.mu:
            res["slide_runout"] = [slide_runout(res["downhill_path"]["coords_lon_lat_z"], m) for m in a.mu]
        arr = res.pop("_arrays")
        for k in ("z", "slope", "lrm", "depth"):
            _write_tif(f"{a.out_prefix}_{k}.tif", arr[k], arr["transform"], arr["crs"])
        gj = {"type": "FeatureCollection", "features": [
            {"type": "Feature", "geometry": {"type": "LineString",
             "coordinates": [c[:2] for c in res["downhill_path"]["coords_lon_lat_z"]]},
             "properties": {"kind": "downhill_path", "sources": res["sources"]}}] + [
            {"type": "Feature", "geometry": {"type": "Point", "coordinates": [d["lon"], d["lat"]]},
             "properties": dict(d, kind="closed_depression", sources=res["sources"])}
            for d in res["depressions"]]}
        with open(a.out_prefix + ".geojson", "w") as f:
            json.dump(gj, f, indent=1)
    with open(a.out_prefix + ".json", "w") as f:
        json.dump(res, f, indent=1)
    print(json.dumps({k: v for k, v in res.items() if k not in ("depressions", "patches")}
                     | {"n_features": len(res.get("depressions", res.get("patches", [])))}, indent=1)[:2500])
    return 0


if __name__ == "__main__":
    sys.exit(main())
