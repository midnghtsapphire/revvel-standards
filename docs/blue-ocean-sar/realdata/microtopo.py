#!/usr/bin/env python3
"""M-TMAT: multi-temporal micro-topographic change between two bare-earth DEMs.

Two elevation models of the same ground from different years are put on one
grid and differenced (dZ = recent - baseline). Cells whose change is larger
than the level of detection are grouped into anomalies (fill_mound for a
rise, excavation_pit for a drop) and written as a ledger, GeoJSON and KML
with the distance and bearing of each one from a reference point. A local
relief model (LRM) and a sky-view factor (SVF) of the recent surface are
written alongside, for reading the shape of each anomaly.

Elevation sources:
  --baseline A.tif --recent B.tif     your own DEM GeoTIFFs (any CRS)
  --lat/--lon/--radius-m              USGS 3DEP 1 m bare-earth DEM tiles from the
                                      public prd-tnm S3 bucket. The project index
                                      (FESM_1m.gpkg, same bucket) lists every 1 m
                                      project covering the window; each project is
                                      one lidar acquisition, so the earliest and the
                                      latest give a baseline and a recent epoch.

Co-registration is a reprojection onto the baseline CRS at --res-m (1 m) and
removal of the median dZ over the window, which absorbs a constant vertical
datum or geoid offset between projects. It does not correct a horizontal
shift or a tilt between surveys.

Level of detection: a cell counts only if |dZ| > t * sqrt(s1^2 + s2^2), with
s1, s2 the vertical RMSE of each survey (default 0.10 m, USGS QL2 lidar) and
t = 1.96 (95 %).

A change in a DEM is a change in the terrain surface. It says nothing about
what caused it (construction, ploughing, erosion, vegetation misclassified as
ground, a different processing chain). Every result needs ground checking.

Exit codes: 0 analysis complete (zero anomalies is a valid result);
2 inputs do not overlap or contain no data; 3 fewer than two epochs found.

Example:
  python microtopo.py --lat 30.910 --lon -91.280 --radius-m 120 --out-dir out/stfrancisville
  python microtopo.py --baseline dtm_2015.tif --recent dtm_2022.tif --out-dir out/site
"""

import argparse
import concurrent.futures
import csv
import ctypes
import ctypes.util
import datetime as dt
import glob
import hashlib
import json
import math
import os
import re
import sys
import urllib.parse
import urllib.request
from xml.sax.saxutils import escape

import numpy as np
import rasterio
import rasterio.features
from rasterio.crs import CRS
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject, transform, transform_bounds, transform_geom
from rasterio.windows import from_bounds
from scipy import ndimage

TNM_HOST = "https://prd-tnm.s3.amazonaws.com"
TNM_1M = "StagedProducts/Elevation/1m"
FESM_URL = f"{TNM_HOST}/{TNM_1M}/FullExtentSpatialMetadata/FESM_1m.gpkg"
VERSION = "1.0.0"
NOTE = (
    "A DEM difference measures a change in the terrain surface between two surveys. It is not evidence of what "
    "caused the change (construction, agriculture, erosion, vegetation or structures classified as ground, or "
    "differences in survey processing can all produce it). Every anomaly needs ground verification before it is "
    "relied on."
)


class InputError(Exception):
    """Inputs do not overlap or hold no data (exit 2)."""


class EpochError(Exception):
    """Fewer than two acquisitions cover the window (exit 3)."""


def _setup_gdal():
    ca = os.environ.get("REQUESTS_CA_BUNDLE") or os.environ.get("SSL_CERT_FILE")
    if ca and "CURL_CA_BUNDLE" not in os.environ:
        os.environ["CURL_CA_BUNDLE"] = ca
    os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
    os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")


# ---------------------------------------------------------------- geometry


def utm_epsg(lat, lon, nad83=False):
    zone = int((lon + 180) // 6) + 1
    if nad83:
        return 26900 + zone
    return (32600 if lat >= 0 else 32700) + zone


def geodesic_offset(lat0, lon0, lat1, lon1):
    """Distance (m) and bearing (degrees clockwise from true north) from point 0
    to point 1 on the WGS84 ellipsoid, using the local radii of curvature.
    Accurate to well under a centimetre over the few-kilometre ranges used here."""
    a, f = 6378137.0, 1 / 298.257223563
    e2 = f * (2 - f)
    phi = math.radians((lat0 + lat1) / 2)
    w = math.sqrt(1 - e2 * math.sin(phi) ** 2)
    m_rad = a * (1 - e2) / w**3  # meridional
    n_rad = a / w  # prime vertical
    dn = math.radians(lat1 - lat0) * m_rad
    de = math.radians(lon1 - lon0) * n_rad * math.cos(phi)
    return math.hypot(de, dn), math.degrees(math.atan2(de, dn)) % 360.0


# ------------------------------------------------------------ terrain maths


def lod_threshold(s1, s2, t):
    """Minimum |dZ| that counts as change."""
    return t * math.sqrt(s1 * s1 + s2 * s2)


def _plane(z):
    """Least-squares plane through the finite cells of z, evaluated everywhere."""
    rr, cc = np.indices(z.shape, dtype="f8")
    ok = np.isfinite(z)
    if ok.sum() < 3:
        return np.full(z.shape, np.nanmean(z) if ok.any() else 0.0)
    a = np.column_stack([rr[ok], cc[ok], np.ones(ok.sum())])
    coef, *_ = np.linalg.lstsq(a, z[ok], rcond=None)
    return coef[0] * rr + coef[1] * cc + coef[2]


def local_relief(z, res, sigma_m):
    """Local relief model: elevation minus a Gaussian low-pass of itself.
    The best-fit plane is removed first so a uniform slope leaves no residue at
    the edges of the window (a plain Gaussian bends a slope near the border).
    NaN cells stay NaN; they are filled with the plane only for the filter."""
    plane = _plane(z)
    resid = z - plane
    filled = np.where(np.isfinite(resid), resid, 0.0)
    smooth = ndimage.gaussian_filter(filled, sigma_m / res, mode="nearest")
    out = resid - smooth
    out[~np.isfinite(z)] = np.nan
    return out


def sky_view_factor(z, res, radius_m=10.0, n_dirs=16):
    """Sky-view factor (Zaksek et al. 2011): 1 - mean over directions of
    sin(max(horizon angle, 0)), with the horizon searched out to radius_m.
    1 on open flat ground, lower in pits and trenches. Vectorised over the
    grid: one shifted-array comparison per (direction, step)."""
    rows, cols = z.shape
    steps = max(1, int(round(radius_m / res)))
    pad = steps + 1
    zp = np.full((rows + 2 * pad, cols + 2 * pad), np.nan)
    inner = (slice(pad, pad + rows), slice(pad, pad + cols))
    zp[inner] = z
    sin_sum = np.zeros(z.shape)
    for k in range(n_dirs):
        az = 2 * math.pi * k / n_dirs
        dx, dy = math.sin(az), -math.cos(az)  # column, row step; az from grid north
        horizon = np.zeros(z.shape)  # angles below 0 count as an open horizon
        for s in range(1, steps + 1):
            oc, orow = int(round(dx * s)), int(round(dy * s))
            if oc == 0 and orow == 0:
                continue
            dist = res * math.hypot(oc, orow)
            shifted = zp[slice(pad + orow, pad + orow + rows), slice(pad + oc, pad + oc + cols)]
            with np.errstate(invalid="ignore"):
                ang = np.arctan((shifted - z) / dist)
            horizon = np.fmax(horizon, np.where(np.isnan(ang), 0.0, ang))
        sin_sum += np.sin(horizon)
    svf = 1.0 - sin_sum / n_dirs
    svf[~np.isfinite(z)] = np.nan
    return svf


def coregister(zb, zr):
    """dZ with the median vertical offset over the overlap removed."""
    valid = np.isfinite(zb) & np.isfinite(zr)
    if not valid.any():
        raise InputError("the two DEMs share no cell with data on the common grid")
    raw = zr - zb
    bias = float(np.median(raw[valid]))
    dz = np.where(valid, raw - bias, np.nan)
    return dz, bias, valid


def extract_anomalies(dz, lod, res, min_area_m2, xform, crs, lrm=None, svf=None, ref=None):
    """Connected patches of |dZ| > lod, rises and drops labelled separately
    (8-connected), larger than min_area_m2. ref is (lat, lon) for distance and
    bearing. Sorted by |volume|, largest first."""
    cell = res * res
    min_cells = max(1, int(math.ceil(min_area_m2 / cell - 1e-9)))
    with np.errstate(invalid="ignore"):
        masks = (("fill_mound", dz > lod), ("excavation_pit", dz < -lod))
    out, poly_src = [], []
    for kind, mask in masks:
        lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
        if n == 0:
            continue
        sizes = ndimage.sum(np.ones(mask.shape), lab, index=np.arange(1, n + 1))
        for i in np.nonzero(sizes >= min_cells)[0] + 1:
            m = lab == i
            rr, cc = np.nonzero(m)
            x, y = xform * (cc.mean() + 0.5, rr.mean() + 0.5)
            (lon,), (lat,) = transform(crs, "EPSG:4326", [x], [y])
            vals = dz[m]
            k = int(np.argmax(np.abs(vals)))
            rec = {
                "type": kind,
                "centroid_lat": round(lat, 7),
                "centroid_lon": round(lon, 7),
                "centroid_x": round(float(x), 2),
                "centroid_y": round(float(y), 2),
                "cells": int(m.sum()),
                "area_m2": round(float(m.sum() * cell), 3),
                "mean_dz_m": round(float(vals.mean()), 4),
                "max_dz_m": round(float(vals[k]), 4),
                "volume_m3": round(float(vals.sum() * cell), 4),
                "mean_lrm_m": round(float(np.nanmean(lrm[m])), 4) if lrm is not None else None,
                "min_svf": round(float(np.nanmin(svf[m])), 4) if svf is not None else None,
            }
            if ref is not None:
                d, b = geodesic_offset(ref[0], ref[1], lat, lon)
                rec.update(distance_m=round(d, 2), distance_ft=round(d / 0.3048, 1), bearing_deg_true=round(b, 1))
            out.append(rec)
            poly_src.append(m)
    order = sorted(range(len(out)), key=lambda j: abs(out[j]["volume_m3"]), reverse=True)
    out = [out[j] for j in order]
    poly_src = [poly_src[j] for j in order]
    for rank, rec in enumerate(out, 1):
        rec["id"] = f"A{rank:03d}"
    return out, poly_src


def analyse(
    zb,
    zr,
    res,
    xform,
    crs,
    s1=0.10,
    s2=0.10,
    t=1.96,
    lrm_sigma_m=5.0,
    svf_dirs=16,
    svf_radius_m=10.0,
    min_area_m2=2.0,
    ref=None,
):
    """Full change analysis on two co-gridded arrays. Returns a dict with the
    arrays under '_arrays' and the anomaly masks under '_masks'."""
    if not (np.isfinite(zb).any() and np.isfinite(zr).any()):
        raise InputError("one of the DEMs has no data on the common grid")
    dz, bias, valid = coregister(zb, zr)
    lod = lod_threshold(s1, s2, t)
    lrm = local_relief(zr, res, lrm_sigma_m)
    svf = sky_view_factor(zr, res, svf_radius_m, svf_dirs)
    if ref is None:
        rows, cols = zb.shape
        x, y = xform * (cols / 2, rows / 2)
        (lon,), (lat,) = transform(crs, "EPSG:4326", [x], [y])
        ref = (lat, lon)
    anomalies, masks = extract_anomalies(dz, lod, res, min_area_m2, xform, crs, lrm, svf, ref)
    with np.errstate(invalid="ignore"):
        n_sig = int((np.abs(dz) > lod).sum())
    return {
        "vertical_bias_removed_m": round(bias, 4),
        "lod_m": round(lod, 4),
        "valid_cells": int(valid.sum()),
        "significant_cells": n_sig,
        "dz_std_m": round(float(np.nanstd(dz)), 4),
        "reference_point": {"lat": ref[0], "lon": ref[1]},
        "anomalies": anomalies,
        "_arrays": {"dz": dz, "lrm": lrm, "svf": svf},
        "_masks": masks,
    }


# ------------------------------------------------------------- raster I/O


def read_to_grid(sources, dst_t, dst_crs, shape):
    """Mosaic one or more rasters onto the target grid (bilinear); first source
    wins where they overlap. Only the window each source shares with the grid
    is read, so remote 1 m tiles are fetched by range request, not whole."""
    out = np.full(shape, np.nan)
    rows, cols = shape
    left, top = dst_t.c, dst_t.f
    right, bottom = left + cols * dst_t.a, top + rows * dst_t.e
    for path in sources:
        with rasterio.open(path) as src:
            sb = transform_bounds(dst_crs, src.crs, left, bottom, right, top, densify_pts=21)
            pad = 3 * max(abs(src.transform.a), abs(src.transform.e))
            win = from_bounds(sb[0] - pad, sb[1] - pad, sb[2] + pad, sb[3] + pad, src.transform)
            win = win.intersection(rasterio.windows.Window(0, 0, src.width, src.height))
            win = win.round_offsets().round_lengths()
            if win.width <= 0 or win.height <= 0:
                continue
            arr = src.read(1, window=win, masked=True).astype("f8").filled(np.nan)
            tmp = np.full(shape, np.nan)
            reproject(
                arr,
                tmp,
                src_transform=src.window_transform(win),
                src_crs=src.crs,
                src_nodata=np.nan,
                dst_transform=dst_t,
                dst_crs=dst_crs,
                dst_nodata=np.nan,
                resampling=Resampling.bilinear,
            )
        fill = np.isnan(out) & np.isfinite(tmp)
        out[fill] = tmp[fill]
    return out


def local_grid(baseline, recent, res, lat=None, lon=None, radius_m=None):
    """Common grid in the baseline CRS: the overlap of both rasters, optionally
    clipped to a square window around (lat, lon)."""
    with rasterio.open(baseline) as b:
        crs, bb = b.crs, b.bounds
    with rasterio.open(recent) as r:
        rb = transform_bounds(r.crs, crs, *r.bounds, densify_pts=21)
    left, bottom = max(bb.left, rb[0]), max(bb.bottom, rb[1])
    right, top = min(bb.right, rb[2]), min(bb.top, rb[3])
    if lat is not None and lon is not None and radius_m:
        (cx,), (cy,) = transform("EPSG:4326", crs, [lon], [lat])
        left, right = max(left, cx - radius_m), min(right, cx + radius_m)
        bottom, top = max(bottom, cy - radius_m), min(top, cy + radius_m)
    if right - left < res or top - bottom < res:
        raise InputError(f"baseline and recent DEMs do not overlap ({baseline} vs {recent})")
    left, top = math.floor(left / res) * res, math.ceil(top / res) * res
    cols, rows = int((right - left) // res), int((top - bottom) // res)
    if cols < 1 or rows < 1:
        raise InputError("overlap is smaller than one grid cell")
    return from_origin(left, top, res, res), crs, (rows, cols)


def window_grid(lat, lon, radius_m, res, crs):
    (cx,), (cy,) = transform("EPSG:4326", crs, [lon], [lat])
    n = int(math.ceil(2 * radius_m / res)) | 1
    left = math.floor((cx - n * res / 2) / res) * res
    top = math.floor((cy + n * res / 2) / res) * res
    return from_origin(left, top, res, res), CRS.from_user_input(crs), (n, n)


def write_tif(path, arr, xform, crs):
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=arr.shape[0],
        width=arr.shape[1],
        count=1,
        dtype="float32",
        crs=crs,
        transform=xform,
        nodata=np.nan,
        compress="deflate",
    ) as dst:
        dst.write(arr.astype("float32"), 1)


# ------------------------------------------------------------ 3DEP lookup


def _s3_list(prefix, host=TNM_HOST, timeout=60):
    """Keys under prefix in a public S3 bucket (anonymous ListObjectsV2)."""
    keys, token = [], None
    while True:
        q = {"list-type": "2", "prefix": prefix}
        if token:
            q["continuation-token"] = token
        with urllib.request.urlopen(f"{host}/?{urllib.parse.urlencode(q)}", timeout=timeout) as r:
            body = r.read().decode()
        keys += [k.replace("&amp;", "&") for k in re.findall(r"<Key>(.*?)</Key>", body)]
        m = re.search(r"<NextContinuationToken>(.*?)</NextContinuationToken>", body)
        if not m:
            return keys
        token = m.group(1).replace("&amp;", "&")


def _gdal_lib():
    """The GDAL shared library rasterio is using (bundled in the wheel, or system)."""
    here = os.path.dirname(rasterio.__file__)
    cands = sorted(glob.glob(os.path.join(here, "..", "rasterio.libs", "libgdal*.so*")))
    cands += sorted(glob.glob(os.path.join(here, ".dylibs", "libgdal*.dylib")))
    sys_lib = ctypes.util.find_library("gdal")
    if sys_lib:
        cands.append(sys_lib)
    for c in cands:
        try:
            return ctypes.CDLL(c)
        except OSError:
            continue
    raise RuntimeError("no GDAL shared library found for the 3DEP project index lookup")


def fesm_projects(lat, lon, half_m, index=FESM_URL):
    """3DEP 1 m projects whose footprint intersects the square window, read from
    the USGS FESM_1m.gpkg index over HTTP range requests (OGR C API through
    ctypes; rasterio has no vector reader). Returns [{project, folder, pub_date}]."""
    g = _gdal_lib()
    vp, cp, d = ctypes.c_void_p, ctypes.c_char_p, ctypes.c_double
    sig = {
        "GDALOpenEx": (vp, [cp, ctypes.c_uint, vp, vp, vp]),
        "GDALClose": (None, [vp]),
        "GDALDatasetGetLayer": (vp, [vp, ctypes.c_int]),
        "OGR_L_GetLayerDefn": (vp, [vp]),
        "OGR_FD_GetFieldIndex": (ctypes.c_int, [vp, cp]),
        "OGR_L_SetSpatialFilterRect": (None, [vp, d, d, d, d]),
        "OGR_L_GetNextFeature": (vp, [vp]),
        "OGR_F_GetFieldAsString": (cp, [vp, ctypes.c_int]),
        "OGR_F_GetGeometryRef": (vp, [vp]),
        "OGR_F_Destroy": (None, [vp]),
        "OGR_G_CreateFromWkt": (ctypes.c_int, [ctypes.POINTER(cp), vp, ctypes.POINTER(vp)]),
        "OGR_G_Intersects": (ctypes.c_int, [vp, vp]),
        "OGR_G_DestroyGeometry": (None, [vp]),
        "CPLSetConfigOption": (None, [cp, cp]),
    }
    for name, (res, args) in sig.items():
        fn = getattr(g, name)
        fn.restype, fn.argtypes = res, args
    g.GDALAllRegister()
    if os.environ.get("CURL_CA_BUNDLE"):
        g.CPLSetConfigOption(b"CURL_CA_BUNDLE", os.environ["CURL_CA_BUNDLE"].encode())
    path = index if not index.startswith("http") else "/vsicurl/" + index
    ds = g.GDALOpenEx(path.encode(), 0x04, None, None, None)  # GDAL_OF_VECTOR
    if not ds:
        raise RuntimeError(f"could not open the 3DEP project index {index}")
    dlat = half_m / 110_574.0
    dlon = half_m / (111_320.0 * max(0.05, math.cos(math.radians(lat))))
    x0, y0, x1, y1 = lon - dlon, lat - dlat, lon + dlon, lat + dlat
    win = ctypes.c_void_p()
    wkt = ctypes.c_char_p(f"POLYGON (({x0} {y0},{x1} {y0},{x1} {y1},{x0} {y1},{x0} {y0}))".encode())
    g.OGR_G_CreateFromWkt(ctypes.byref(wkt), None, ctypes.byref(win))
    layer = g.GDALDatasetGetLayer(ds, 0)
    defn = g.OGR_L_GetLayerDefn(layer)
    idx = {k: g.OGR_FD_GetFieldIndex(defn, k.encode()) for k in ("project", "pub_date", "product_link")}
    g.OGR_L_SetSpatialFilterRect(layer, x0, y0, x1, y1)
    found = []
    try:
        while True:
            f = g.OGR_L_GetNextFeature(layer)
            if not f:
                break
            try:
                if g.OGR_G_Intersects(g.OGR_F_GetGeometryRef(f), win):
                    rec = {k: (g.OGR_F_GetFieldAsString(f, i) or b"").decode() for k, i in idx.items()}
                    rec["folder"] = rec.pop("product_link").rstrip("/").rsplit("/", 1)[-1]
                    found.append(rec)
            finally:
                g.OGR_F_Destroy(f)
    finally:
        g.OGR_G_DestroyGeometry(win)
        g.GDALClose(ds)
    return found


def tile_indices(lat, lon, half_m):
    """3DEP 1 m tile names are x{floor(E/10 km)}y{ceil(N/10 km)} in NAD83 UTM."""
    epsg = utm_epsg(lat, lon, nad83=True)
    zone = epsg - 26900
    (cx,), (cy,) = transform("EPSG:4326", f"EPSG:{epsg}", [lon], [lat])
    xs = {int(math.floor((cx + s * half_m) / 10_000)) for s in (-1, 1)}
    ys = {int(math.ceil((cy + s * half_m) / 10_000)) for s in (-1, 1)}
    return zone, sorted((x, y) for x in xs for y in ys)


def project_tiles(folder, zone, cells):
    """S3 keys of the project's GeoTIFF tiles for the given cells. Three naming
    schemes are in use in the bucket; each is tried by prefix."""
    keys = []
    for x, y in cells:
        for stem in (f"USGS_1M_{zone}_x{x}y{y}_", f"USGS_one_meter_x{x}y{y}_", f"USGS_1m_x{x}y{y}_"):
            keys += [k for k in _s3_list(f"{TNM_1M}/Projects/{folder}/TIFF/{stem}") if k.endswith(".tif")]
    return sorted(set(keys))


def acquisition_dates(tile_key):
    """begdate/enddate of the lidar collection, from the tile's FGDC metadata."""
    folder_prefix, name = tile_key.rsplit("/TIFF/", 1)
    stem = name[:-4]
    for k in _s3_list(f"{folder_prefix}/metadata/{stem}"):
        if k.endswith(".xml"):
            with urllib.request.urlopen(f"{TNM_HOST}/{urllib.parse.quote(k)}", timeout=60) as r:
                xml = r.read().decode(errors="replace")
            b = re.search(r"<begdate>(\d{8})</begdate>", xml)
            e = re.search(r"<enddate>(\d{8})</enddate>", xml)
            s = re.search(r"<sngdate>\s*<caldate>(\d{8})</caldate>", xml)
            beg = (b or s).group(1) if (b or s) else None
            end = (e or s).group(1) if (e or s) else beg
            return beg, end, k
    return None, None, None


def find_epochs(lat, lon, radius_m, log=print):
    """Every 3DEP 1 m project with tiles over the window, with its acquisition
    dates, sorted oldest first."""
    half = radius_m * math.sqrt(2) + 5
    projects = fesm_projects(lat, lon, half)
    log(f"index: {len(projects)} project footprint(s) intersect the window: {[p['folder'] for p in projects]}")
    zone, cells = tile_indices(lat, lon, half)

    def one(p):
        keys = project_tiles(p["folder"], zone, cells)
        if not keys:
            return None
        beg, end, meta = acquisition_dates(keys[0])
        year_m = re.search(r"(19|20)\d\d", p["folder"])
        return {
            "project": p["project"],
            "folder": p["folder"],
            "pub_date": p["pub_date"],
            "acq_begin": beg,
            "acq_end": end,
            "metadata_key": meta,
            "year": int(beg[:4]) if beg else (int(year_m.group(0)) if year_m else None),
            "s3_keys": keys,
            "urls": [f"{TNM_HOST}/{k}" for k in keys],
        }

    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        epochs = [e for e in ex.map(one, projects) if e]
    seen, uniq = set(), []
    for e in epochs:  # the index can list one folder under several features
        if e["folder"] not in seen:
            seen.add(e["folder"])
            uniq.append(e)
    uniq.sort(key=lambda e: (e["acq_begin"] or str(e["year"] or 0), e["folder"]))
    return uniq


# ----------------------------------------------------------------- outputs


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


LEDGER_COLS = [
    "id",
    "type",
    "centroid_lat",
    "centroid_lon",
    "area_m2",
    "mean_dz_m",
    "max_dz_m",
    "volume_m3",
    "mean_lrm_m",
    "min_svf",
    "distance_m",
    "distance_ft",
    "bearing_deg_true",
    "cells",
    "centroid_x",
    "centroid_y",
]


def write_vectors(out_dir, anomalies, masks, xform, crs, provenance):
    feats = []
    for rec, m in zip(anomalies, masks):
        shapes = [s for s, v in rasterio.features.shapes(m.astype("uint8"), mask=m, transform=xform) if v == 1]
        geom = transform_geom(
            crs, "EPSG:4326", {"type": "MultiPolygon", "coordinates": [s["coordinates"] for s in shapes]}
        )
        feats.append({"type": "Feature", "geometry": geom, "properties": dict(rec, **provenance)})
    with open(os.path.join(out_dir, "anomalies.geojson"), "w") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f, indent=1)
    marks = []
    for feat in feats:
        p = feat["properties"]
        desc = "\n".join(f"{k}: {p.get(k)}" for k in LEDGER_COLS if k in p) + "\n" + NOTE
        polys = "".join(
            "<Polygon><outerBoundaryIs><LinearRing><coordinates>"
            + " ".join(f"{x:.7f},{y:.7f},0" for x, y in poly[0])
            + "</coordinates></LinearRing></outerBoundaryIs></Polygon>"
            for poly in feat["geometry"]["coordinates"]
        )
        marks.append(
            f"<Placemark><name>{escape(p['id'])} {escape(p['type'])}</name>"
            f"<description>{escape(desc)}</description><styleUrl>#{p['type']}</styleUrl>"
            f"<MultiGeometry><Point><coordinates>{p['centroid_lon']:.7f},{p['centroid_lat']:.7f},0</coordinates>"
            f"</Point>{polys}</MultiGeometry></Placemark>"
        )
    kml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document>'
        "<name>M-TMAT terrain change anomalies</name>"
        f"<description>{escape(NOTE)}</description>"
        '<Style id="fill_mound"><LineStyle><color>ff0000ff</color><width>2</width></LineStyle>'
        "<PolyStyle><color>400000ff</color></PolyStyle></Style>"
        '<Style id="excavation_pit"><LineStyle><color>ffff0000</color><width>2</width></LineStyle>'
        "<PolyStyle><color>40ff0000</color></PolyStyle></Style>" + "".join(marks) + "</Document></kml>\n"
    )
    with open(os.path.join(out_dir, "anomalies.kml"), "w") as f:
        f.write(kml)
    with open(os.path.join(out_dir, "ledger.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=LEDGER_COLS, extrasaction="ignore")
        w.writeheader()
        w.writerows(anomalies)


def write_manifest(out_dir, inputs, params, results, grid):
    outputs = {}
    for name in sorted(os.listdir(out_dir)):
        if name != "manifest.json" and os.path.isfile(os.path.join(out_dir, name)):
            outputs[name] = _sha256(os.path.join(out_dir, name))
    man = {
        "tool": "microtopo.py (M-TMAT)",
        "version": VERSION,
        "created_utc": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "inputs": inputs,
        "grid": grid,
        "parameters": params,
        "results": results,
        "outputs_sha256": outputs,
        "note": NOTE,
    }
    with open(os.path.join(out_dir, "manifest.json"), "w") as f:
        json.dump(man, f, indent=1)
    return man


# -------------------------------------------------------------------- CLI


def _params(a):
    return {
        "res_m": a.res_m,
        "rmse_baseline_m": a.rmse_baseline,
        "rmse_recent_m": a.rmse_recent,
        "t": a.t,
        "lod_formula": "t * sqrt(rmse_baseline^2 + rmse_recent^2)",
        "lrm_sigma_m": a.lrm_sigma_m,
        "svf_directions": a.svf_dirs,
        "svf_radius_m": a.svf_radius_m,
        "min_area_m2": a.min_area_m2,
        "vertical_coregistration": "median dZ over the overlap subtracted",
        "lrm_and_svf_surface": "recent DEM",
    }


def run(a, log=print):
    os.makedirs(a.out_dir, exist_ok=True)
    ref = (a.ref_lat, a.ref_lon) if a.ref_lat is not None and a.ref_lon is not None else None
    if a.baseline:
        xform, crs, shape = local_grid(a.baseline, a.recent, a.res_m, a.lat, a.lon, a.radius_m)
        inputs = {
            "mode": "local",
            "baseline": {"path": os.path.abspath(a.baseline), "label": a.baseline_label},
            "recent": {"path": os.path.abspath(a.recent), "label": a.recent_label},
        }
        base_src, rec_src = [a.baseline], [a.recent]
        if ref is None and a.lat is not None and a.lon is not None:
            ref = (a.lat, a.lon)
    else:
        epochs = find_epochs(a.lat, a.lon, a.radius_m, log=log)
        listing = [{k: e[k] for k in ("folder", "project", "acq_begin", "acq_end", "year", "s3_keys")} for e in epochs]
        if a.baseline_project:
            epochs = [e for e in epochs if e["folder"] in (a.baseline_project, a.recent_project)]
        log(f"epochs with tiles over the window: {[(e['folder'], e['acq_begin']) for e in epochs]}")
        if len(epochs) < 2:
            with open(os.path.join(a.out_dir, "manifest.json"), "w") as f:
                json.dump(
                    {
                        "tool": "microtopo.py (M-TMAT)",
                        "version": VERSION,
                        "status": "insufficient_epochs",
                        "query": {"lat": a.lat, "lon": a.lon, "radius_m": a.radius_m},
                        "index": FESM_URL,
                        "epochs_found": listing,
                        "note": NOTE,
                    },
                    f,
                    indent=1,
                )
            raise EpochError(
                f"{len(epochs)} USGS 3DEP 1 m acquisition(s) cover this window; two are needed. "
                "Found: " + (", ".join(f"{e['folder']} ({e['acq_begin']})" for e in epochs) or "none")
            )
        base_e, rec_e = epochs[0], epochs[-1]
        with rasterio.open(base_e["urls"][0]) as src:
            base_crs = src.crs
        xform, crs, shape = window_grid(a.lat, a.lon, a.radius_m, a.res_m, base_crs)
        base_src, rec_src = base_e["urls"], rec_e["urls"]
        strip = ("project", "folder", "acq_begin", "acq_end", "year", "pub_date", "metadata_key", "s3_keys", "urls")
        inputs = {
            "mode": "usgs_3dep_1m",
            "bucket": "s3://prd-tnm",
            "index": FESM_URL,
            "baseline": {k: base_e[k] for k in strip},
            "recent": {k: rec_e[k] for k in strip},
            "all_epochs_found": listing,
        }
        ref = ref or (a.lat, a.lon)
    log(f"grid {shape[0]}x{shape[1]} at {a.res_m} m in {crs}")
    zb = read_to_grid(base_src, xform, crs, shape)
    zr = read_to_grid(rec_src, xform, crs, shape)
    res = analyse(
        zb,
        zr,
        a.res_m,
        xform,
        crs,
        a.rmse_baseline,
        a.rmse_recent,
        a.t,
        a.lrm_sigma_m,
        a.svf_dirs,
        a.svf_radius_m,
        a.min_area_m2,
        ref,
    )
    arrays, masks = res.pop("_arrays"), res.pop("_masks")
    for k in ("dz", "lrm", "svf"):
        write_tif(os.path.join(a.out_dir, f"{k}.tif"), arrays[k], xform, crs)
    prov = {
        "baseline": inputs["baseline"].get("folder") or inputs["baseline"].get("path"),
        "recent": inputs["recent"].get("folder") or inputs["recent"].get("path"),
    }
    write_vectors(a.out_dir, res["anomalies"], masks, xform, crs, prov)
    grid = {
        "crs": crs.to_string(),
        "res_m": a.res_m,
        "rows": shape[0],
        "cols": shape[1],
        "bounds": list(rasterio.transform.array_bounds(shape[0], shape[1], xform)),
    }
    results = {k: v for k, v in res.items() if k != "anomalies"}
    results["n_anomalies"] = len(res["anomalies"])
    results["top_anomalies"] = res["anomalies"][:10]
    man = write_manifest(a.out_dir, inputs, _params(a), results, grid)
    return man


def build_parser():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--baseline", help="baseline (older) DEM GeoTIFF")
    ap.add_argument("--recent", help="recent DEM GeoTIFF")
    ap.add_argument("--baseline-label", help="free text kept in the manifest, e.g. 'county lidar 2015'")
    ap.add_argument("--recent-label")
    ap.add_argument("--lat", type=float, help="window centre (fetch mode, or clip in local mode)")
    ap.add_argument("--lon", type=float)
    ap.add_argument("--radius-m", type=float, default=120.0, help="half-width of the square window (default 120)")
    ap.add_argument("--baseline-project", help="fetch mode: force these two 3DEP project folders")
    ap.add_argument("--recent-project")
    ap.add_argument("--ref-lat", type=float, help="reference point for distance/bearing (default window centre)")
    ap.add_argument("--ref-lon", type=float)
    ap.add_argument("--res-m", type=float, default=1.0)
    ap.add_argument("--rmse-baseline", type=float, default=0.10, help="vertical RMSE of baseline, m (QL2: 0.10)")
    ap.add_argument("--rmse-recent", type=float, default=0.10)
    ap.add_argument("--t", type=float, default=1.96, help="LoD multiplier (1.96 = 95%%)")
    ap.add_argument("--lrm-sigma-m", type=float, default=5.0)
    ap.add_argument("--svf-dirs", type=int, default=16)
    ap.add_argument("--svf-radius-m", type=float, default=10.0)
    ap.add_argument("--min-area-m2", type=float, default=2.0)
    ap.add_argument("--out-dir", required=True)
    return ap


def main(argv=None):
    ap = build_parser()
    a = ap.parse_args(argv)
    if bool(a.baseline) != bool(a.recent):
        ap.error("--baseline and --recent go together")
    if not a.baseline and (a.lat is None or a.lon is None):
        ap.error("give --baseline/--recent, or --lat/--lon to fetch USGS 3DEP 1 m DEMs")
    if bool(a.baseline_project) != bool(a.recent_project):
        ap.error("--baseline-project and --recent-project go together")
    _setup_gdal()
    try:
        man = run(a, log=lambda m: print(m, file=sys.stderr))
    except InputError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    except EpochError as e:
        print(f"error: {e}", file=sys.stderr)
        return 3
    except rasterio.errors.RasterioIOError as e:
        print(f"error: cannot read input: {e}", file=sys.stderr)
        return 2
    summary = {
        k: man["results"][k]
        for k in ("vertical_bias_removed_m", "lod_m", "valid_cells", "significant_cells", "n_anomalies")
    }
    summary["top_anomalies"] = man["results"]["top_anomalies"][:5]
    print(json.dumps(summary, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
