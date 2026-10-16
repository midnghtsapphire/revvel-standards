#!/usr/bin/env python3
"""Real Sentinel-2 NDVI at a point, from the public AWS archive.

Reads actual Sentinel-2 L2A scenes (Element 84 COG mirror on AWS open data,
bucket sentinel-cogs) for a lat/lon, masks cloud/snow/shadow with the scene's
own SCL layer, and reports NDVI inside a small circle around the point and in
a background ring around it. Every row names the scene it came from.

No API key is needed. Only the S3 bucket is used (no STAC search), so it
works where only AWS open-data buckets are reachable.

Example:
  python s2_ndvi.py --lat 50.8782 --lon -119.9075 --start 2017-06 --end 2025-09 \
      --months 7 8 --buffer-m 20 --ring-m 150 --out shtuka_ndvi.csv
"""

import argparse
import csv
import json
# import math  (unused)
import os
import re
import sys
import urllib.request

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import transform
from rasterio.windows import from_bounds

BUCKET = "https://sentinel-cogs.s3.us-west-2.amazonaws.com"
PREFIX = "sentinel-s2-l2a-cogs"
# SCL classes kept: 4 vegetation, 5 bare soil. Everything else (cloud, shadow,
# snow, water, saturated, no data) is masked out.
SCL_KEEP = (4, 5)

_COLS = {1: "ABCDEFGH", 2: "JKLMNPQR", 0: "STUVWXYZ"}
_ROWS = "ABCDEFGHJKLMNPQRSTUV"
_BANDS = "CDEFGHJKLMNPQRSTUVWX"


def _setup_gdal():
    ca = os.environ.get("REQUESTS_CA_BUNDLE") or os.environ.get("SSL_CERT_FILE")
    if ca and "CURL_CA_BUNDLE" not in os.environ:
        os.environ["CURL_CA_BUNDLE"] = ca
    os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
    os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "3")


def mgrs_tile(lat, lon, zone):
    """MGRS 100 km tile for (lat, lon) expressed in UTM `zone` (zone may be a
    neighbour of the native one; Sentinel-2 tiles overlap zone edges)."""
    epsg = (32600 if lat >= 0 else 32700) + zone
    (e,), (n,) = transform("EPSG:4326", f"EPSG:{epsg}", [lon], [lat])
    ci = int(e // 100000) - 1
    if not 0 <= ci < 8:
        return None
    r = int(n // 100000) % 20
    if zone % 2 == 0:
        r = (r + 5) % 20
    band = _BANDS[int((lat + 80) // 8)]
    return f"{zone}{band}{_COLS[zone % 3][ci]}{_ROWS[r]}"


def candidate_tiles(lat, lon):
    z = int((lon + 180) // 6) + 1
    out = []
    for zone in (z, z - 1, z + 1):
        if 1 <= zone <= 60:
            t = mgrs_tile(lat, lon, zone)
            if t:
                out.append(t)
    return out


def _get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read().decode("utf-8")


def list_scenes(tile, year, month):
    m = re.match(r"(\d+)([A-Z])([A-Z]{2})", tile)
    zone, band, sq = m.groups()
    prefix = f"{PREFIX}/{zone}/{band}/{sq}/{year}/{month}/"
    xml = _get(f"{BUCKET}/?list-type=2&delimiter=/&prefix={prefix}")
    return [p.rstrip("/").split("/")[-1] for p in re.findall(r"<Prefix>([^<]+/)</Prefix>", xml) if p != prefix]


def scene_url(tile, scene):
    zone, band, sq = re.match(r"(\d+)([A-Z])([A-Z]{2})", tile).groups()
    date = re.search(r"_(\d{8})_", scene).group(1)
    return f"{BUCKET}/{PREFIX}/{zone}/{band}/{sq}/{int(date[:4])}/{int(date[4:6])}/{scene}"


def boa_offset(base):
    """DN offset: processing baseline >= 04.00 (from 2022-01-25) stores
    reflectance as DN = 10000*R + 1000. Read the baseline from the scene's
    STAC item rather than guessing from the date."""
    try:
        item = json.loads(_get(f"{base}/{base.split('/')[-1]}.json"))
        props = item["properties"]
        pb = float(props.get("s2:processing_baseline", "0"))
        # Element 84 harmonises newer scenes and says so with this flag; the
        # DN are then already comparable to pre-2022 scenes (checked: red DN
        # median ~470 over vegetation, impossible with the +1000 still in).
        if props.get("earthsearch:boa_offset_applied"):
            return 0.0, pb
        return (1000.0 if pb >= 4.0 else 0.0), pb
    except Exception:
        return None, None


def _circle_masks(shape, center_rc, px_m, buffer_m, ring_m):
    rr, cc = np.indices(shape)
    d = np.hypot(rr - center_rc[0], cc - center_rc[1]) * px_m
    inner = d <= buffer_m
    ring = (d > max(2 * buffer_m, buffer_m + px_m)) & (d <= ring_m)
    return inner, ring


def measure_scene(base, lat, lon, buffer_m, ring_m):
    offset, pb = boa_offset(base)
    if offset is None:
        return None
    with rasterio.open(f"{base}/B04.tif") as red_src:
        (x,), (y,) = transform("EPSG:4326", red_src.crs, [lon], [lat])
        b = red_src.bounds
        if not (b.left < x < b.right and b.bottom < y < b.top):
            return {"status": "point_outside_tile"}
        half = ring_m + 20
        win = from_bounds(x - half, y - half, x + half, y + half, red_src.transform).round_offsets().round_lengths()
        red = red_src.read(1, window=win).astype("f8")
        wtr = red_src.window_transform(win)
    with rasterio.open(f"{base}/B08.tif") as nir_src:
        nir = nir_src.read(1, window=win).astype("f8")
    with rasterio.open(f"{base}/SCL.tif") as scl_src:
        sw = from_bounds(*rasterio.windows.bounds(win, red_src.transform), scl_src.transform)
        scl = scl_src.read(1, window=sw, out_shape=red.shape, resampling=Resampling.nearest)
    nodata = (red == 0) | (nir == 0)
    r = (red - offset) / 10000.0
    n = (nir - offset) / 10000.0
    with np.errstate(divide="ignore", invalid="ignore"):
        ndvi = (n - r) / (n + r)
    ok = np.isin(scl, SCL_KEEP) & ~nodata & np.isfinite(ndvi)
    col, row = ~wtr * (x, y)
    inner, ring = _circle_masks(red.shape, (row, col), abs(wtr.a), buffer_m, ring_m)
    ti, tr = ndvi[inner & ok], ndvi[ring & ok]
    out = {
        "status": "ok",
        "processing_baseline": pb,
        "target_valid_px": int(ti.size),
        "target_total_px": int(inner.sum()),
        "ring_valid_px": int(tr.size),
        "target_ndvi_mean": float(ti.mean()) if ti.size else None,
        "ring_ndvi_mean": float(tr.mean()) if tr.size else None,
        "ring_ndvi_std": float(tr.std()) if tr.size > 1 else None,
    }
    if ti.size and tr.size > 1 and out["ring_ndvi_std"] > 0:
        out["target_minus_ring"] = out["target_ndvi_mean"] - out["ring_ndvi_mean"]
        out["z_vs_ring"] = out["target_minus_ring"] / out["ring_ndvi_std"]
    return out


def months_between(start, end):
    y, m = map(int, start.split("-"))
    ye, me = map(int, end.split("-"))
    while (y, m) <= (ye, me):
        yield y, m
        m += 1
        if m == 13:
            y, m = y + 1, 1


FIELDS = [
    "date", "scene", "tile", "status", "processing_baseline", "target_valid_px", "target_total_px",
    "ring_valid_px", "target_ndvi_mean", "ring_ndvi_mean", "ring_ndvi_std", "target_minus_ring",
    "z_vs_ring", "source_url",
]


def run(lat, lon, start, end, months=None, buffer_m=20.0, ring_m=150.0, min_valid_frac=0.6, tiles=None, log=print):
    _setup_gdal()
    tiles = tiles or candidate_tiles(lat, lon)
    rows, seen_dates = [], set()
    for y, m in months_between(start, end):
        if months and m not in months:
            continue
        for tile in tiles:
            try:
                scenes = list_scenes(tile, y, m)
            except Exception as e:
                log(f"list {tile} {y}-{m}: {e}")
                continue
            for scene in sorted(scenes):
                date = re.search(r"_(\d{8})_", scene).group(1)
                if date in seen_dates:
                    continue  # same overpass already measured from another tile/processing
                base = scene_url(tile, scene)
                try:
                    res = measure_scene(base, lat, lon, buffer_m, ring_m)
                except Exception as e:
                    log(f"{scene}: {e}")
                    continue
                if not res or res.get("status") != "ok":
                    continue
                if res["target_total_px"] == 0 or res["target_valid_px"] / res["target_total_px"] < min_valid_frac:
                    res["status"] = "masked_cloud_snow_or_shadow"
                else:
                    seen_dates.add(date)
                row = {"date": f"{date[:4]}-{date[4:6]}-{date[6:]}", "scene": scene, "tile": tile, "source_url": base}
                row.update(res)
                rows.append(row)
                log(f"{row['date']} {scene} {row['status']} target={row.get('target_ndvi_mean')}")
    return rows


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--start", required=True, help="YYYY-MM")
    ap.add_argument("--end", required=True, help="YYYY-MM")
    ap.add_argument("--months", type=int, nargs="*", help="only these calendar months, e.g. 7 8 for summer")
    ap.add_argument("--buffer-m", type=float, default=20.0, help="target circle radius (m); 10 m pixels")
    ap.add_argument("--ring-m", type=float, default=150.0, help="outer radius of background ring (m)")
    ap.add_argument("--min-valid", type=float, default=0.6, help="min clear fraction of target pixels")
    ap.add_argument("--tile", action="append", help="override MGRS tile(s), e.g. 10UGB")
    ap.add_argument("--out", required=True)
    a = ap.parse_args(argv)
    rows = run(a.lat, a.lon, a.start, a.end, a.months, a.buffer_m, a.ring_m, a.min_valid, a.tile,
               log=lambda s: print(s, file=sys.stderr))
    with open(a.out, "w", newline="") as f:
        w = csv.DictWriter(f, FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    good = [r for r in rows if r["status"] == "ok"]
    print(f"{len(good)} clear scenes ({len(rows)} examined) -> {a.out}")
    return 0 if good else 1


if __name__ == "__main__":
    sys.exit(main())
