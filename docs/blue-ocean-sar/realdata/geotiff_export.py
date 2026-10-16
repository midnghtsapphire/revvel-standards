#!/usr/bin/env python3
"""Write numpy arrays to GeoTIFF that other GIS software opens correctly.

Three jobs:

  write     an array (.npy) or several named arrays (.npz) that are already
            on a regular map grid -> GeoTIFF with CRS, geotransform, nodata,
            band names, units and provenance tags.
  georef    an array in *image* coordinates (a scanned or corrected aerial
            photo, a radargram slice) plus ground control points -> a
            polynomial fit with per-point residuals and leave-one-out error,
            a bilinear resample onto a north-up map grid, and a GeoTIFF.
  verify    re-open a GeoTIFF written here and check that every band still
            matches the SHA-256 recorded inside it, and that the CRS and
            geotransform are what the caller expects.

Output is a Cloud-Optimized GeoTIFF (tiled, DEFLATE, overviews) by default,
so QGIS, ArcGIS Pro, GDAL, Google Earth Engine and web viewers read it
directly. ``--plain`` writes an ordinary tiled GeoTIFF instead.

Embedded metadata (GDAL tags, readable with ``gdalinfo``):

  dataset tags  revvel_tool, revvel_tool_version, revvel_created_utc,
                revvel_description, revvel_source_<n> = "<sha256>  <name>",
                revvel_georef_* (method, order, n_gcp, rmse_m, loo_rmse_m)
  band tags     revvel_sha256 (SHA-256 of the band's little-endian bytes as
                written), units; band description = band name

Examples:

  python geotiff_export.py write corrected.npy --crs EPSG:32615 \\
      --bounds 412000 4101000 413000 4102000 --band-name ndmi --units 1 \\
      --nodata nan --source scene_before.json --out ndmi.tif

  python geotiff_export.py write layers.npz --crs EPSG:32615 \\
      --origin 412000 4102000 --pixel-size 10 --out layers.tif

  python geotiff_export.py georef photo_1965_corrected.npy --gcps gcps.csv \\
      --crs EPSG:27700 --order 1 --pixel-size 0.5 --out photo_1965.tif \\
      --report photo_1965_gcp_report.json

  python geotiff_export.py verify ndmi.tif --crs EPSG:32615

GCP CSV columns: id,col,row,x,y (col/row are image pixel coordinates, x/y map
coordinates in --crs). Pixel centres are at integer col/row.

Exit codes: 0 written / verified; 1 verification failed or GCP fit worse than
--max-rmse; 2 bad input.

Requires numpy, scipy and rasterio.
"""

# ---------------------------------------------------------------------------
# NOTEBOOK - how this file came about (kept on purpose, no holds barred)
#
# The pasted pipeline of 2026-10-16 ended with "convert these corrected numpy
# arrays directly into GeoTIFF raster files with embedded geospatial headers".
# That part is a good idea and is what this file does. The rest of that paste
# needs saying out loud, because I learned the hard way that AI-generated
# pipelines look finished long before they are right:
#
#   * Its georeferencing fitted a polynomial to GCPs and never printed a
#     residual. A 2nd-order fit through 6 points goes through all 6 exactly,
#     so "it lined up" proves nothing. Here every fit reports per-point
#     residuals and a leave-one-out error, and refuses to run with fewer
#     points than unknowns.
#   * It wrote arrays with no CRS (or a CRS but no transform), which opens in
#     QGIS at 0,0 off the coast of Africa. Here CRS and transform are
#     required arguments; nothing is guessed.
#   * It called output "court-ready" and stamped a fixed 0.91 confidence.
#     Nothing here produces a confidence. A GeoTIFF is a container; it is as
#     good as the array that went into it.
#   * The numbers inside it (regional diffusion constants, a 2.5 mm/yr peat
#     erosion rate, era weights, a Random Forest trained on synthetic
#     features) were invented. None of them are used here.
#
# The band SHA-256 tags exist so that "this file is the array I computed" is
# a check that can fail (CLAUDE.md gotcha 9), not a comment.
# ---------------------------------------------------------------------------

import argparse
import csv
import datetime as dt
import hashlib
import json
import math
import os
import sys
import tempfile

import numpy as np

TOOL = "geotiff_export.py"
VERSION = "1.0.0"
TAG_PREFIX = "revvel_"
POLY_TERMS = {1: 3, 2: 6, 3: 10}


class InputError(ValueError):
    """Bad input: exit code 2."""


def _rasterio():
    try:
        import rasterio
        return rasterio
    except ImportError as e:  # pragma: no cover - depends on environment
        raise InputError("rasterio is required: pip install rasterio") from e


# ---------------------------------------------------------------------------
# arrays and hashes


def band_sha256(band):
    """SHA-256 of a 2-D band's little-endian C-order bytes."""
    a = np.ascontiguousarray(band)
    if a.dtype.byteorder == ">" or (a.dtype.byteorder == "=" and sys.byteorder == "big"):
        a = a.byteswap().view(a.dtype.newbyteorder("<"))
    return hashlib.sha256(a.tobytes()).hexdigest()


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def as_band_stack(arrays, band_names=None):
    """(stack[bands, rows, cols], names) from a 2-D array, a 3-D array or a dict of 2-D arrays."""
    if isinstance(arrays, dict):
        if not arrays:
            raise InputError("no arrays to write")
        names = list(arrays)
        bands = [np.asarray(arrays[k]) for k in names]
        shapes = {b.shape for b in bands}
        if len(shapes) != 1 or len(next(iter(shapes))) != 2:
            raise InputError(f"named arrays must all be 2-D and the same shape; got {sorted(shapes)}")
        stack = np.stack(bands)
        if band_names:
            raise InputError("band names come from the .npz keys; do not also pass --band-name")
        return stack, names
    a = np.asarray(arrays)
    if a.ndim == 2:
        a = a[np.newaxis]
    if a.ndim != 3:
        raise InputError(f"array must be 2-D (rows, cols) or 3-D (bands, rows, cols); got shape {a.shape}")
    if a.shape[1] < 1 or a.shape[2] < 1:
        raise InputError(f"empty raster: shape {a.shape}")
    names = list(band_names or [])
    if names and len(names) != a.shape[0]:
        raise InputError(f"{len(names)} band names for {a.shape[0]} bands")
    return a, names or [f"band_{i + 1}" for i in range(a.shape[0])]


def output_dtype(stack, dtype=None):
    """Keep integer types; store float64 as float32 unless asked (GIS tools handle float32 best)."""
    if dtype:
        return np.dtype(dtype)
    if stack.dtype == np.bool_:
        return np.dtype("uint8")
    if stack.dtype == np.float64 or stack.dtype == np.float16:
        return np.dtype("float32")
    if stack.dtype.kind not in "iuf":
        raise InputError(f"cannot write dtype {stack.dtype} to GeoTIFF")
    return stack.dtype


def check_lossless_cast(stack, odt):
    """Raise InputError if writing `stack` as integer type `odt` would change any value."""
    if odt.kind not in "iu" or stack.size == 0:
        return
    if stack.dtype.kind == "f":
        if not np.isfinite(stack).all():
            raise InputError("array has NaN or infinity but the output type is integer; "
                             "pick a float type or fill those cells first")
        if not np.array_equal(stack, np.round(stack)):
            raise InputError(f"array has fractional values; writing {odt.name} would truncate them")
    info = np.iinfo(odt)
    lo, hi = stack.min(), stack.max()
    if lo < info.min or hi > info.max:
        raise InputError(f"values {lo}..{hi} do not fit {odt.name} ({info.min}..{info.max})")


def parse_nodata(text, dtype):
    if text is None or text == "":
        return None
    # v = float(text)
    # Replaced (review 2026-10-16): a non-number or an infinite integer nodata escaped as ValueError/OverflowError.
    try:
        v = float(text)
    except (TypeError, ValueError) as e:
        raise InputError(f"nodata {text!r} is not a number") from e
    if math.isnan(v) and np.dtype(dtype).kind != "f":
        raise InputError("nodata NaN needs a float output type")
    if np.dtype(dtype).kind in "iu":
        if not math.isfinite(v):
            raise InputError(f"nodata {text} does not fit {np.dtype(dtype).name}")
        info = np.iinfo(dtype)
        if v != int(v) or not info.min <= v <= info.max:
            raise InputError(f"nodata {text} does not fit {np.dtype(dtype).name}")
    return v


# ---------------------------------------------------------------------------
# grid definition


def transform_from_bounds(west, south, east, north, width, height):
    rasterio = _rasterio()
    if not (east > west and north > south):
        raise InputError("bounds must be west south east north with east > west and north > south")
    return rasterio.transform.from_bounds(west, south, east, north, width, height)


def transform_from_origin(x_ul, y_ul, dx, dy=None):
    rasterio = _rasterio()
    dy = dx if dy is None else dy
    if dx <= 0 or dy <= 0:
        raise InputError("pixel size must be positive")
    return rasterio.transform.from_origin(x_ul, y_ul, dx, dy)


def parse_crs(text):
    rasterio = _rasterio()
    if not text:
        raise InputError("--crs is required (e.g. EPSG:32615); nothing is guessed")
    try:
        crs = rasterio.crs.CRS.from_user_input(text)
    except Exception as e:  # rasterio raises CRSError; keep the message
        raise InputError(f"unknown CRS {text!r}: {e}") from e
    return crs


# ---------------------------------------------------------------------------
# writing


def write_geotiff(path, arrays, *, crs, transform, nodata=None, band_names=None, units=None,
                  description=None, sources=(), extra_tags=None, dtype=None, cog=True, gcps=None,
                  now=None):
    """Write `arrays` to `path` and return a summary dict.

    arrays: 2-D, 3-D (bands first) or a dict of named 2-D arrays.
    crs: anything rasterio.crs.CRS.from_user_input accepts.
    transform: an affine.Affine geotransform for the north-up grid.
    nodata: number or NaN; masked/NaN cells keep their value as written.
    units: one string for every band, or a list with one per band.
    sources: input file paths; each is hashed into a revvel_source_<n> tag.
    gcps: optional list of (col, row, x, y, id) recorded in the revvel_gcps_json
      tag (not as native GeoTIFF GCPs: a file holds those or a geotransform).
    The file is written to a temporary name in the same folder and renamed,
    so a crash never leaves a half-written GeoTIFF under the final name.
    """
    rasterio = _rasterio()
    from rasterio.shutil import copy as rio_copy

    crs = parse_crs(crs) if isinstance(crs, str) else crs
    if crs is None or transform is None:
        raise InputError("crs and transform are both required")
    stack, names = as_band_stack(arrays, band_names)
    odt = output_dtype(stack, dtype)
    if odt.kind in "iu" and stack.dtype.kind == "f" and np.isnan(stack).any():
        raise InputError("array has NaN but the output type is integer; pick a float type or fill NaN first")
    # data = stack.astype(odt, copy=False)
    # Replaced (review 2026-10-16): astype wraps out-of-range integers and truncates floats silently,
    # and the band hash would then bless the corrupted values. Refuse any lossy integer cast.
    check_lossless_cast(stack, odt)
    data = stack.astype(odt, copy=False)
    nd = parse_nodata(nodata, odt) if isinstance(nodata, str) else nodata
    if isinstance(units, str) or units is None:
        units = [units] * data.shape[0]
    if len(units) != data.shape[0]:
        raise InputError(f"{len(units)} units for {data.shape[0]} bands")

    now = now or dt.datetime.now(dt.timezone.utc)
    tags = {
        f"{TAG_PREFIX}tool": TOOL,
        f"{TAG_PREFIX}tool_version": VERSION,
        f"{TAG_PREFIX}created_utc": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    if description:
        tags[f"{TAG_PREFIX}description"] = description
    src_hashes = []
    for i, s in enumerate(sources, 1):
        if not os.path.isfile(s):
            raise InputError(f"--source {s}: not a file")
        h = file_sha256(s)
        src_hashes.append({"path": os.path.basename(s), "sha256": h})
        tags[f"{TAG_PREFIX}source_{i}"] = f"{h}  {os.path.basename(s)}"
    for k, v in (extra_tags or {}).items():
        tags[k if k.startswith(TAG_PREFIX) else TAG_PREFIX + k] = str(v)
    band_hashes = [band_sha256(data[i]) for i in range(data.shape[0])]

    out_dir = os.path.dirname(os.path.abspath(path)) or "."
    os.makedirs(out_dir, exist_ok=True)
    predictor = 3 if odt.kind == "f" else 2
    profile = {
        "driver": "GTiff", "height": data.shape[1], "width": data.shape[2], "count": data.shape[0],
        "dtype": odt.name, "crs": crs, "transform": transform, "nodata": nd,
        "compress": "deflate", "predictor": predictor,
    }
    if data.shape[1] >= 16 and data.shape[2] >= 16:
        profile.update(tiled=True, blockxsize=256, blockysize=256)
    fd, tmp = tempfile.mkstemp(suffix=".tif", dir=out_dir)
    os.close(fd)
    tmp2 = None
    try:
        with rasterio.open(tmp, "w", **profile) as dst:
            dst.write(data)
            dst.update_tags(**tags)
            for i, name in enumerate(names, 1):
                dst.set_band_description(i, name)
                btags = {f"{TAG_PREFIX}sha256": band_hashes[i - 1]}
                if units[i - 1]:
                    btags["units"] = units[i - 1]
                dst.update_tags(i, **btags)
            if any(units):
                dst.units = tuple(u or "" for u in units)
            if gcps:
                # GCPs are stored for reference alongside the fitted transform.
                # GDAL/QGIS then show them, but use the geotransform for display.
                # Correction (review 2026-10-16): the line above was wrong. A GeoTIFF
                # holds either a geotransform or native GCPs, not both, and GDAL
                # drops one. The output is already warped onto a north-up grid, so
                # the geotransform is kept and the GCPs go in this JSON tag only.
                dst.update_tags(**{f"{TAG_PREFIX}gcps_json": json.dumps(
                    [{"id": g[4], "col": g[0], "row": g[1], "x": g[2], "y": g[3]} for g in gcps])})
            if cog and min(data.shape[1:]) >= 512:
                factors = [f for f in (2, 4, 8, 16, 32) if min(data.shape[1:]) // f >= 256]
                if factors:
                    dst.build_overviews(factors, rasterio.enums.Resampling.average)
        final_tmp = tmp
        if cog:
            fd, tmp2 = tempfile.mkstemp(suffix=".tif", dir=out_dir)
            os.close(fd)
            rio_copy(tmp, tmp2, driver="COG", compress="DEFLATE", predictor=str(predictor),
                     overview_resampling="AVERAGE")
            final_tmp = tmp2
        os.replace(final_tmp, path)
    finally:
        for p in (tmp, tmp2):
            if p and os.path.exists(p):
                os.remove(p)
    return {
        "path": path, "sha256": file_sha256(path), "driver": "COG" if cog else "GTiff",
        "crs": crs.to_string(), "transform": list(transform)[:6], "width": data.shape[2],
        "height": data.shape[1], "bands": [{"name": n, "units": u, "sha256": h}
                                           for n, u, h in zip(names, units, band_hashes)],
        "dtype": odt.name, "nodata": None if nd is None else ("nan" if math.isnan(nd) else nd),
        "sources": src_hashes,
    }


# ---------------------------------------------------------------------------
# verification


def verify_geotiff(path, *, crs=None, transform=None, atol=1e-6):
    """Re-open `path` and check embedded band hashes, CRS and transform.

    Returns (ok, problems, info). A band without a revvel_sha256 tag is a
    problem: an unverifiable file does not pass verification.
    """
    rasterio = _rasterio()
    problems = []
    with rasterio.open(path) as src:
        info = {"crs": src.crs.to_string() if src.crs else None, "transform": list(src.transform)[:6],
                "width": src.width, "height": src.height, "count": src.count, "dtype": src.dtypes[0],
                "nodata": src.nodata, "tags": src.tags(), "bands": []}
        if src.crs is None:
            problems.append("no CRS in file")
        if src.transform == rasterio.Affine.identity():
            problems.append("identity geotransform (file is not georeferenced)")
        if crs is not None and src.crs != parse_crs(crs):
            problems.append(f"CRS {info['crs']} != expected {crs}")
        if transform is not None and not np.allclose(list(src.transform)[:6], list(transform)[:6], atol=atol):
            problems.append(f"transform {info['transform']} != expected {list(transform)[:6]}")
        for i in range(1, src.count + 1):
            want = src.tags(i).get(f"{TAG_PREFIX}sha256")
            got = band_sha256(src.read(i))
            info["bands"].append({"index": i, "name": src.descriptions[i - 1], "sha256": got,
                                  "recorded_sha256": want, "units": src.tags(i).get("units")})
            if not want:
                problems.append(f"band {i}: no {TAG_PREFIX}sha256 tag; cannot verify")
            elif want != got:
                problems.append(f"band {i}: data SHA-256 {got} != recorded {want}")
    return not problems, problems, info


# ---------------------------------------------------------------------------
# polynomial georeferencing from ground control points


def read_gcps(path):
    """[(col, row, x, y, id)] from a CSV with columns id,col,row,x,y."""
    out = []
    with open(path, newline="", encoding="utf-8") as f:
        rd = csv.DictReader(f)
        need = {"col", "row", "x", "y"}
        if not rd.fieldnames or not need <= {c.strip().lower() for c in rd.fieldnames}:
            raise InputError(f"{path}: GCP CSV needs columns id,col,row,x,y")
        for n, rec in enumerate(rd, 1):
            rec = {k.strip().lower(): (v or "").strip() for k, v in rec.items() if k}
            try:
                vals = [float(rec[k]) for k in ("col", "row", "x", "y")]
            except ValueError as e:
                raise InputError(f"{path} line {n + 1}: {e}") from e
            if not all(math.isfinite(v) for v in vals):
                raise InputError(f"{path} line {n + 1}: non-finite value")
            out.append((*vals, rec.get("id") or str(n)))
    ids = [g[4] for g in out]
    if len(set(ids)) != len(ids):
        raise InputError(f"{path}: duplicate GCP ids")
    return out


def _design(u, v, order):
    cols = [np.ones_like(u)]
    for total in range(1, order + 1):
        for j in range(total + 1):
            cols.append(u ** (total - j) * v ** j)
    return np.column_stack(cols)


class PolyMap:
    """Least-squares polynomial map (a, b) -> (p, q) with centred, scaled inputs.

    Centring and scaling keeps a 3rd-order fit on UTM-sized numbers
    (about 4e6) well conditioned.
    """

    def __init__(self, a, b, p, q, order):
        a, b, p, q = (np.asarray(t, dtype=float) for t in (a, b, p, q))
        self.order = order
        self.ca, self.cb = a.mean(), b.mean()
        self.s = max(np.ptp(a), np.ptp(b), 1e-12) / 2.0
        A = _design((a - self.ca) / self.s, (b - self.cb) / self.s, order)
        if np.linalg.matrix_rank(A) < A.shape[1]:
            raise InputError(f"GCPs are degenerate for an order-{order} fit (collinear or repeated points)")
        self.cp, *_ = np.linalg.lstsq(A, p, rcond=None)
        self.cq, *_ = np.linalg.lstsq(A, q, rcond=None)

    def __call__(self, a, b):
        A = _design((np.asarray(a, float) - self.ca) / self.s, (np.asarray(b, float) - self.cb) / self.s,
                    self.order)
        return A @ self.cp, A @ self.cq


def fit_gcps(gcps, order):
    """Fit image->map and map->image polynomials; return (fwd, inv, report).

    report holds per-GCP residuals in map units, RMSE, and leave-one-out
    residuals (each point predicted by a fit that did not see it), which is
    the honest accuracy number. With exactly as many points as unknowns the
    RMSE is 0 by construction and LOO is undefined: that is reported, not
    hidden.
    """
    if order not in POLY_TERMS:
        raise InputError("--order must be 1, 2 or 3")
    n, k = len(gcps), POLY_TERMS[order]
    if n < k:
        raise InputError(f"order {order} needs at least {k} GCPs, got {n}")
    c, r, x, y = (np.array([g[i] for g in gcps], float) for i in range(4))
    fwd = PolyMap(c, r, x, y, order)
    inv = PolyMap(x, y, c, r, order)
    px, py = fwd(c, r)
    res = np.hypot(px - x, py - y)
    loo = []
    if n > k:
        for i in range(n):
            m = np.arange(n) != i
            try:
                f_i = PolyMap(c[m], r[m], x[m], y[m], order)
            except InputError:
                loo.append(float("nan"))
                continue
            qx, qy = f_i(c[i:i + 1], r[i:i + 1])
            loo.append(float(np.hypot(qx[0] - x[i], qy[0] - y[i])))
    loo_arr = np.array(loo, float)
    report = {
        "order": order, "n_gcp": n, "unknowns_per_axis": k,
        "redundancy": n - k,
        "rmse_map_units": float(np.sqrt(np.mean(res ** 2))),
        "loo_rmse_map_units": (float(np.sqrt(np.nanmean(loo_arr ** 2)))
                               if loo and np.isfinite(loo_arr).any() else None),
        # NaN (a degenerate leave-one-out fold) becomes null so the report stays standard JSON.
        "points": [{"id": g[4], "col": g[0], "row": g[1], "x": g[2], "y": g[3],
                    "residual": float(res[i]),
                    "loo_residual": (loo[i] if loo and math.isfinite(loo[i]) else None)}
                   for i, g in enumerate(gcps)],
        "warnings": [],
    }
    if n == k:
        report["warnings"].append("exactly as many GCPs as unknowns: the fit passes through every point, so "
                                  "RMSE is 0 by construction and says nothing about accuracy. Add points.")
    elif n - k < 3:
        report["warnings"].append(f"only {n - k} redundant GCP(s); the leave-one-out error is the number to trust")
    if order > 1 and n < 2 * k:
        report["warnings"].append(f"order {order} with {n} GCPs can bend wildly between points; "
                                  "prefer order 1 unless residuals clearly demand more")
    return fwd, inv, report


def georeference(arr, gcps, order, *, pixel_size=None, nodata=np.nan):
    """Warp a 2-D or 3-D (bands first) image-space array onto a north-up grid.

    Uses the fitted map->image polynomial and bilinear interpolation
    (scipy map_coordinates, order=1). Cells that map outside the image get
    `nodata`. Returns (stack, transform, report).
    """
    from scipy import ndimage

    stack = np.asarray(arr, dtype=float)
    if stack.ndim == 2:
        stack = stack[np.newaxis]
    if stack.ndim != 3:
        raise InputError(f"array must be 2-D or 3-D; got shape {stack.shape}")
    _, h, w = stack.shape
    fwd, inv, report = fit_gcps(gcps, order)
    # Edge of the image (pixel edges at -0.5 and n-0.5) mapped to the ground.
    # t = np.linspace(-0.5, w - 0.5, 64)
    # s = np.linspace(-0.5, h - 0.5, 64)
    # Replaced (review 2026-10-16): 64 samples per edge can miss where an order-2/3
    # polynomial bulges between samples, cropping the output. Sample every half pixel
    # (capped) and pad by one output pixel below.
    t = np.linspace(-0.5, w - 0.5, min(2 * w + 1, 20001))
    s = np.linspace(-0.5, h - 0.5, min(2 * h + 1, 20001))
    ec = np.concatenate([t, t, np.full_like(s, -0.5), np.full_like(s, w - 0.5)])
    er = np.concatenate([np.full_like(t, -0.5), np.full_like(t, h - 0.5), s, s])
    ex, ey = fwd(ec, er)
    if pixel_size is None:
        # Ground size of one image pixel at the image centre, from the fitted map.
        cx, cy = fwd(np.array([w / 2, w / 2 + 1, w / 2]), np.array([h / 2, h / 2, h / 2 + 1]))
        pixel_size = float(np.sqrt(abs((cx[1] - cx[0]) * (cy[2] - cy[0]) - (cx[2] - cx[0]) * (cy[1] - cy[0]))))
        report["warnings"].append(f"--pixel-size not given; using the fitted ground size {pixel_size:.4g}")
    if not pixel_size or pixel_size <= 0 or not math.isfinite(pixel_size):
        raise InputError("pixel size must be positive")
    # west, east, south, north = ex.min(), ex.max(), ey.min(), ey.max()
    west, east = ex.min() - pixel_size, ex.max() + pixel_size
    south, north = ey.min() - pixel_size, ey.max() + pixel_size
    ncols = int(math.ceil((east - west) / pixel_size))
    nrows = int(math.ceil((north - south) / pixel_size))
    if ncols * nrows > 400_000_000:
        raise InputError(f"output grid {ncols}x{nrows} is too large; raise --pixel-size")
    xform = transform_from_origin(west, north, pixel_size)
    jj, ii = np.meshgrid(np.arange(ncols), np.arange(nrows))
    gx = west + (jj + 0.5) * pixel_size
    gy = north - (ii + 0.5) * pixel_size
    sc, sr = inv(gx.ravel(), gy.ravel())
    inside = (sc >= -0.5) & (sc <= w - 0.5) & (sr >= -0.5) & (sr <= h - 0.5)
    out = np.full((stack.shape[0], nrows, ncols), nodata, dtype=float)
    for b in range(stack.shape[0]):
        band = stack[b]
        valid = np.isfinite(band)
        # map_coordinates cannot skip NaN; interpolate a validity mask too and
        # blank any output cell that drew on an invalid input cell.
        vals = ndimage.map_coordinates(np.where(valid, band, 0.0), [sr, sc], order=1, mode="nearest")
        wgt = ndimage.map_coordinates(valid.astype(float), [sr, sc], order=1, mode="nearest")
        ok = inside & (wgt > 0.999)
        flat = np.full(sc.shape, nodata, dtype=float)
        flat[ok] = vals[ok]
        out[b] = flat.reshape(nrows, ncols)
    report.update({"method": "polynomial GCP fit + bilinear resample", "pixel_size": pixel_size,
                   "output_shape": [nrows, ncols], "bounds": [west, south, east, north]})
    return out, xform, report


# ---------------------------------------------------------------------------
# CLI


def _load_arrays(path, allow_pickle=False):
    if not os.path.isfile(path):
        raise InputError(f"{path}: not a file")
    try:
        obj = np.load(path, allow_pickle=allow_pickle)
    except ValueError as e:
        raise InputError(f"{path}: {e} (object arrays are refused; save plain numeric arrays)") from e
    if isinstance(obj, np.lib.npyio.NpzFile):
        with obj:
            return {k: obj[k] for k in obj.files}
    return obj


def _parse_transform_args(a, shape):
    if a.bounds and a.origin:
        raise InputError("give either --bounds or --origin/--pixel-size, not both")
    if a.bounds:
        return transform_from_bounds(*a.bounds, width=shape[-1], height=shape[-2])
    if a.origin:
        if not a.pixel_size:
            raise InputError("--origin needs --pixel-size")
        if len(a.pixel_size) not in (1, 2):
            raise InputError("--pixel-size takes DX or DX DY")
        return transform_from_origin(a.origin[0], a.origin[1], *a.pixel_size)
    raise InputError("the grid is undefined: give --bounds W S E N or --origin X Y --pixel-size DX [DY]")


def _first_shape(arrays):
    if isinstance(arrays, dict):
        return np.asarray(next(iter(arrays.values()))).shape
    return np.asarray(arrays).shape


def cmd_write(a):
    arrays = _load_arrays(a.array)
    xform = _parse_transform_args(a, _first_shape(arrays))
    units = a.units if not a.units or len(a.units) > 1 else a.units[0]
    res = write_geotiff(a.out, arrays, crs=a.crs, transform=xform, nodata=a.nodata,
                        band_names=a.band_name, units=units, description=a.description,
                        sources=[a.array] + (a.source or []), dtype=a.dtype, cog=not a.plain)
    ok, problems, _ = verify_geotiff(a.out, crs=a.crs, transform=xform)
    res["verified"] = ok
    print(json.dumps(res, indent=2))
    if not ok:
        print("verification failed: " + "; ".join(problems), file=sys.stderr)
        return 1
    return 0


def cmd_georef(a):
    arrays = _load_arrays(a.array)
    if isinstance(arrays, dict):
        names = list(arrays)
        stack = np.stack([np.asarray(arrays[k], float) for k in names])
    else:
        stack = np.asarray(arrays, float)
        names = a.band_name
    gcps = read_gcps(a.gcps)
    out, xform, report = georeference(stack, gcps, a.order, pixel_size=a.pixel_size)
    tags = {"georef_method": report["method"], "georef_order": a.order, "georef_n_gcp": report["n_gcp"],
            "georef_rmse_map_units": f"{report['rmse_map_units']:.6g}",
            "georef_loo_rmse_map_units": ("undefined" if report["loo_rmse_map_units"] is None
                                          else f"{report['loo_rmse_map_units']:.6g}")}
    res = write_geotiff(a.out, out, crs=a.crs, transform=xform, nodata=float("nan"), band_names=names,
                        units=a.units[0] if a.units and len(a.units) == 1 else a.units,
                        description=a.description, sources=[a.array, a.gcps] + (a.source or []),
                        extra_tags=tags, dtype=a.dtype, cog=not a.plain, gcps=gcps)
    ok, problems, _ = verify_geotiff(a.out, crs=a.crs, transform=xform)
    res["verified"] = ok
    res["georef"] = report
    if a.report:
        with open(a.report, "w", encoding="utf-8") as f:
            json.dump(res, f, indent=2)
    print(json.dumps(res, indent=2))
    for w in report["warnings"]:
        print(f"warning: {w}", file=sys.stderr)
    if not ok:
        print("verification failed: " + "; ".join(problems), file=sys.stderr)
        return 1
    worst = report["loo_rmse_map_units"] if report["loo_rmse_map_units"] is not None else report["rmse_map_units"]
    if a.max_rmse is not None and (report["loo_rmse_map_units"] is None or worst > a.max_rmse):
        print(f"GCP fit fails --max-rmse {a.max_rmse}: leave-one-out RMSE "
              f"{'undefined' if report['loo_rmse_map_units'] is None else f'{worst:.4g}'}", file=sys.stderr)
        return 1
    return 0


def cmd_verify(a):
    xform = None
    if a.transform:
        from affine import Affine
        xform = Affine(*a.transform)
    ok, problems, info = verify_geotiff(a.tif, crs=a.crs, transform=xform)
    info["ok"] = ok
    info["problems"] = problems
    print(json.dumps(info, indent=2, default=str))
    return 0 if ok else 1


def build_parser():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)

    def common(p):
        p.add_argument("array", help=".npy (2-D or bands-first 3-D) or .npz (named 2-D arrays)")
        p.add_argument("--crs", required=True, help="e.g. EPSG:32615, EPSG:27700, or a WKT/PROJ string")
        p.add_argument("--out", required=True, help="output .tif")
        p.add_argument("--band-name", action="append", help="name per band (repeat); .npz uses its keys")
        p.add_argument("--units", action="append", help="units for all bands, or one per band (repeat)")
        p.add_argument("--description", help="free-text description stored in the file")
        p.add_argument("--source", action="append", help="input file to hash into the provenance tags (repeat)")
        p.add_argument("--dtype", help="output type, e.g. float32, int16, uint8 (default: keep; float64->float32)")
        p.add_argument("--plain", action="store_true", help="plain tiled GeoTIFF instead of COG")

    w = sub.add_parser("write", help="array already on a map grid -> GeoTIFF")
    common(w)
    w.add_argument("--bounds", nargs=4, type=float, metavar=("W", "S", "E", "N"))
    w.add_argument("--origin", nargs=2, type=float, metavar=("X_UL", "Y_UL"), help="upper-left corner")
    w.add_argument("--pixel-size", nargs="+", type=float, metavar="D", help="DX [DY]")
    w.add_argument("--nodata", help="nodata value, e.g. nan or -9999")
    w.set_defaults(func=cmd_write)

    g = sub.add_parser("georef", help="image-space array + GCPs -> polynomial fit -> GeoTIFF")
    common(g)
    g.add_argument("--gcps", required=True, help="CSV with id,col,row,x,y")
    g.add_argument("--order", type=int, default=1, choices=(1, 2, 3), help="polynomial order (default 1)")
    g.add_argument("--pixel-size", type=float, help="output pixel size in CRS units (default: fitted)")
    g.add_argument("--max-rmse", type=float, help="exit 1 if the leave-one-out RMSE exceeds this (map units)")
    g.add_argument("--report", help="also write the JSON result, with GCP residuals, here")
    g.set_defaults(func=cmd_georef)

    v = sub.add_parser("verify", help="check band hashes, CRS and transform of a GeoTIFF")
    v.add_argument("tif")
    v.add_argument("--crs", help="expected CRS")
    v.add_argument("--transform", nargs=6, type=float, metavar=("A", "B", "C", "D", "E", "F"),
                   help="expected affine geotransform (rasterio order)")
    v.set_defaults(func=cmd_verify)
    return ap


def main(argv=None):
    a = build_parser().parse_args(argv)
    try:
        return a.func(a)
    except InputError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    except OSError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
