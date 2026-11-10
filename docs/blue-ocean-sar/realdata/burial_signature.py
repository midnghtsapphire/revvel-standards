#!/usr/bin/env python3
"""Burial-timeline screening on a stack of N >= 2 bare-earth DEMs of the same ground.

A clandestine burial leaves a characteristic sequence in repeat elevation surveys:
backfill and spoil raise the ground soon after the grave is dug (a mound), and
over the following years the fill compacts and the body decomposes, so the
same spot settles (a sink). This tool looks for that sequence, mound first and
subsidence later, in the same grave-sized patch, across a stack of DEM GeoTIFFs
with known acquisition years.

Inputs:
  --epoch DTM.tif YEAR [SIGMA]      one per acquisition (at least two; three or
                                    more are needed for the timeline). SIGMA is
                                    the vertical 1-sigma error of that survey in
                                    metres, or a per-cell uncertainty GeoTIFF;
                                    --sigma-m (0.10 m, QL2 lidar) when omitted.
  --sites known.csv                 optional labelled sites (easting, northing,
                                    burial_year) for calibration.

Method:
  1. Every epoch is resampled onto one grid (the earliest epoch's CRS, --res-m)
     with microtopo.read_to_grid and the median vertical offset to the earliest
     epoch is removed (constant datum / geoid shift between projects).
  2. For each consecutive pair: dZ, propagated sigma = sqrt(s1^2 + s2^2) per cell
     (raised to the robust MAD of dZ when that is larger, unless --no-mad-floor),
     level of detection LoD = t * sigma and change significance
     C = 1 - p = 1 - 2 * (1 - Phi(|dZ| / sigma)), where p is the two-sided
     p-value of "no change" under Gaussian survey error. C is NOT a probability
     that the change is real (SYSTEM_REVIEW H6; it was mislabelled "P(real
     change)" before version 1.1.0): it says how unusual |dZ| would be if
     nothing had changed, and it ignores the prior chance of change.
  3. Timeline. The standardised change u = dZ / sigma is pooled over a disk of
     --neighbourhood-m (grave scale). Mound significance of pair a, sink
     significance of a later pair b, both from the pooled change with the
     formula above (one-sided: only a rise counts for the mound, a drop for the
     sink); the screening index S is the geometric mean
     sqrt(C_mound * C_sink), maximised over every (a, b) whose elapsed time can
     fall in --sink-window-years.
  4. Significance. Getis-Ord Gi* of u is computed per pair inside slope classes
     (--slope-edges, degrees) so steep ground cannot become its own hot spot;
     cells whose window is incomplete (grid border, nodata) are NaN. The mound
     needs an upper-tail and the sink a lower-tail Gi*; the timeline p-value is
     max(p_mound_Gi*, p_sink_Gi*) (intersection-union test: both phases must be real),
     minimised over (a, b) and multiplied by the number of combinations
     (Bonferroni). Benjamini-Hochberg q-values replace a fixed z threshold.
  5. Candidates: 8-connected cells with q <= --alpha and both phase
     significances >= --min-change-significance, at least --min-area-m2.
  6. Voids: black top-hat of the latest surface (closing with a disk of
     --void-width-m diameter minus the surface) deeper than --void-depth-m, with
     PCA second moments giving length, width and orientation; linear components
     (culvert, vault, trench) are separated from compact (grave-scale) ones.
  7. Optional calibration (scikit-learn): cells near labelled sites are
     positives, cells far from every site negatives; a logistic model wrapped in
     CalibratedClassifierCV is scored out-of-fold with StratifiedGroupKFold over
     spatial blocks (AUC, Brier, site-level precision / recall). Sites buried
     before the first epoch, or whose burial no (mound, sink) pair can observe,
     are censored: neither positives nor negatives.

Tiling. Steps 3 and 4 run in square tiles of --tile-cells with a halo of
--halo-cells on every side (default: the smallest allowed, the neighbourhood
radius plus the Gi* bandwidth in cells, plus one). Only each tile's core is kept, so
the result equals the whole-grid computation, while the per-(mound, sink)
working arrays, previously one full-grid layer per combination and phase, are
bounded by the tile size. The Gi* stratum mean, standard deviation and count
are accumulated over the whole grid first, so they do not change with the
tiling. Full-grid output layers (one per output raster) are still held in
memory, and the epochs are read whole.

Every output carries the label "screening index, not a probability of a grave"
unless a model was calibrated on labelled sites. A terrain change is not
evidence of a burial; every candidate needs ground verification.

Outputs in --out-dir: ledger.csv, anomalies.geojson, anomalies.kml (written
through microtopo.write_vectors), dod_Y0_Y1.tif, significance_Y0_Y1.tif
(change significance; pchange_Y0_Y1.tif is the same raster under its
deprecated name), gistar_Y0_Y1.tif per pair, score.tif, timeline_z.tif, qvalue.tif,
void_tophat.tif, p_grave_calibrated.tif and operating_curve.csv when
calibrated, and manifest.json with the sha256 of every input and output.
Deprecated aliases, kept so older readers keep working: ledger and record
columns p_mound / p_sink (= mound_significance / sink_significance), the
pchange_*.tif rasters, --min-change-prob (= --min-change-significance) and the
p_change_formula parameter record.

Exit codes: 0 analysis complete (zero candidates is a valid result); 2 bad
input (fewer than two epochs, unreadable or non-overlapping rasters, bad year
or sites file); 3 change products written but the burial timeline could not be
evaluated (fewer than three epochs, or no pair combination fits the sink window).

Example:
  python burial_signature.py --epoch dtm_2012.tif 2012 --epoch dtm_2016.tif 2016 0.08 \\
      --epoch dtm_2021.tif 2021 sigma_2021.tif --out-dir out/site
"""

import argparse
import csv
import datetime as dt
import json
import math
import os
import sys
from xml.sax.saxutils import escape

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.errors import RasterioIOError
from rasterio.warp import transform, transform_bounds
from scipy import ndimage, special

import microtopo as mt

# VERSION = "1.0.0"  # SYSTEM_REVIEW H6: change_significance rename and tiled processing
VERSION = "1.1.0"
LABEL = "screening index, not a probability of a grave"
NOTE = (
    "The burial-timeline index ranks places where the ground rose and later settled within a grave-sized patch. "
    "Construction, ploughing, spoil heaps, tree throw, erosion, vegetation classified as ground and survey "
    "processing differences can all produce the same sequence. It is not evidence of a burial; every candidate "
    "needs ground verification."
)
InputError = mt.InputError
SQRT2 = math.sqrt(2.0)

DEFAULTS = {
    "res_m": 1.0,
    "sigma_m": 0.10,
    "t": 1.96,
    "mad_floor": True,
    "neighbourhood_m": 1.5,
    "gi_bandwidth_m": None,
    "sink_window_years": (2.0, 10.0),
    "slope_edges": (10.0, 25.0),
    "min_stratum_cells": 30,
    "alpha": 0.05,
    # "min_change_prob": 0.95,  # SYSTEM_REVIEW H6: renamed; still accepted by params() and the CLI
    # Lesson: a threshold named "prob" invited readers to treat 0.95 as "95% sure"; it is a significance cut-off.
    "min_change_significance": 0.95,
    "min_area_m2": 2.0,
    "void_width_m": 8.0,
    "void_depth_m": 0.15,
    "void_min_length_m": 8.0,
    "void_min_elongation": 3.0,
    "void_min_area_m2": 3.0,
    "site_radius_m": 2.0,
    "exclusion_m": 10.0,
    "block_m": 50.0,
    "cv_folds": 5,
    "max_negatives": 20000,
    "hit_radius_m": 3.0,
    "tile_cells": 1024,
    "halo_cells": None,
}

# Old parameter name -> new one (SYSTEM_REVIEW H6).
DEPRECATED_PARAMS = {"min_change_prob": "min_change_significance"}


def params(**overrides):
    """Analysis parameters with the CLI defaults, for calling analyse() directly."""
    p = dict(DEFAULTS)
    for old, new in DEPRECATED_PARAMS.items():
        if old in overrides:
            if new in overrides:
                raise TypeError(f"give {new} or its deprecated alias {old}, not both")
            overrides[new] = overrides.pop(old)
    unknown = set(overrides) - set(p)
    if unknown:
        raise TypeError(f"unknown parameter(s): {sorted(unknown)}")
    p.update(overrides)
    return argparse.Namespace(**p)


def _yr(y):
    return str(int(y)) if float(y).is_integer() else f"{y:g}"


# ------------------------------------------------------------ statistics


def change_significance(dod, sigma):
    """Change significance 1 - p, where p = 2 * (1 - Phi(|dZ| / sigma)) is the
    two-sided p-value of "no change" under Gaussian survey error; equal to
    erf(|dZ| / (sigma * sqrt 2)). 0 for no change, 0.95 at |dZ| = 1.96 sigma.
    NaN where either input is NaN. Not a probability that the change is real
    (SYSTEM_REVIEW H6)."""
    with np.errstate(invalid="ignore", divide="ignore"):
        return special.erf(np.abs(dod) / (sigma * SQRT2))


def change_probability(dod, sigma):
    """Deprecated name for change_significance (SYSTEM_REVIEW H6: the value is
    1 - p, not a probability of real change). Kept so existing callers work."""
    # Lesson: "P(real change)" read like the probability that a grave or a real change is there. It is 1 - p,
    # a significance: how unusual |dZ| would be with no change, ignoring how rare change is. Presenting
    # significance as certainty is the classic mistake in auto-generated reports; name quantities for what they are.
    # """P(real change) = 1 - 2 * (1 - Phi(|dZ| / sigma)) = erf(|dZ| / (sigma * sqrt 2)).
    # 0 for no change, 0.95 at |dZ| = 1.96 sigma. NaN where either input is NaN."""
    # with np.errstate(invalid="ignore", divide="ignore"):
    #     return special.erf(np.abs(dod) / (sigma * SQRT2))
    return change_significance(dod, sigma)


def bh_qvalues(p):
    """Benjamini-Hochberg adjusted p-values (q-values) over the finite entries
    of p; NaN stays NaN and is not counted in m. q is monotone in p and >= p."""
    p = np.asarray(p, dtype=float)
    q = np.full(p.shape, np.nan)
    ok = np.isfinite(p)
    pv = p[ok]
    m = pv.size
    if m == 0:
        return q
    order = np.argsort(pv, kind="mergesort")
    adj = pv[order] * m / np.arange(1, m + 1)
    adj = np.minimum.accumulate(adj[::-1])[::-1]
    out = np.empty(m)
    out[order] = np.clip(adj, 0.0, 1.0)
    q[ok] = out
    return q


def disk(radius_cells):
    """Boolean disk footprint of the given radius in cells (at least the centre cell)."""
    r = max(0.0, float(radius_cells))
    n = int(math.floor(r + 1e-9))
    yy, xx = np.mgrid[-n:n + 1, -n:n + 1]
    return (xx * xx + yy * yy) <= r * r + 1e-9


def neighbourhood_z(u, radius_m, res):
    """Pooled standardised change over a disk: sum(u) / sqrt(count). N(0, 1)
    under white noise when u is N(0, 1). NaN where u is NaN."""
    fp = disk(radius_m / res).astype(float)
    ok = np.isfinite(u)
    num = ndimage.convolve(np.where(ok, u, 0.0), fp, mode="constant", cval=0.0)
    cnt = ndimage.convolve(ok.astype(float), fp, mode="constant", cval=0.0)
    with np.errstate(invalid="ignore", divide="ignore"):
        out = num / np.sqrt(cnt)
    out[~ok] = np.nan
    return out


def slope_degrees(z, res):
    gy, gx = np.gradient(z, res)
    return np.degrees(np.arctan(np.hypot(gx, gy)))


def slope_strata(slope, edges):
    """Slope class per cell (0 = gentlest), -1 where slope is NaN."""
    s = np.digitize(np.nan_to_num(slope, nan=0.0), edges)
    s[~np.isfinite(slope)] = -1
    return s


def gistar_stats(x, strata):
    """{stratum: (n, mean, population standard deviation)} over the finite cells
    of x in each stratum (strata < 0 excluded)."""
    valid = np.isfinite(x) & (strata >= 0)
    out = {}
    for cls in np.unique(strata[valid]):
        vals = x[valid & (strata == cls)]
        out[int(cls)] = (int(vals.size), float(vals.mean()), float(vals.std()))
    return out


def gistar_stratified(x, strata, res, bandwidth_m, min_cells=30, stats=None, border=(True, True, True, True)):
    """Getis-Ord Gi* z-score with binary disk weights (self included), computed
    separately inside each stratum: neighbours, mean, standard deviation and n
    all come from the cell's own stratum. NaN for strata smaller than
    min_cells, for cells whose window holds nodata, and for the border band
    whose window leaves the grid.

    stats: per-stratum (n, mean, sd) from the whole grid (gistar_stats) when x
    is one tile of it; computed from x when None. border: (top, bottom, left,
    right) flags, True where that edge of x is an edge of the whole grid; only
    those edges get the NaN band (a tile's inner edges lie in its halo)."""
    fp = disk(bandwidth_m / res).astype(float)
    r = fp.shape[0] // 2
    valid = np.isfinite(x) & (strata >= 0)
    z = np.full(x.shape, np.nan)
    if stats is None:
        stats = gistar_stats(x, strata)
    for cls in np.unique(strata[valid]):
        m = valid & (strata == cls)
        # n = int(m.sum())  # SYSTEM_REVIEW H6: n, mean and sd now come from the whole grid when tiled
        # Lesson: computing the reference statistics from the array in hand tied the answer to whatever extent
        # was passed in, which blocked tiling. Global parameters must be computed once and passed to local steps.
        n, xbar, s = stats[int(cls)]
        if n < min_cells:
            continue
        # vals = x[m]
        # xbar = float(vals.mean())
        # s = float(vals.std())
        if s <= 0:
            z[m] = 0.0
            continue
        sw = ndimage.convolve(m.astype(float), fp, mode="constant", cval=0.0)
        local = ndimage.convolve(np.where(m, x, 0.0), fp, mode="constant", cval=0.0)
        with np.errstate(invalid="ignore", divide="ignore"):
            zc = (local - xbar * sw) / (s * np.sqrt((n * sw - sw * sw) / (n - 1.0)))
        z[m] = zc[m]
    holes = ndimage.convolve((~np.isfinite(x)).astype(float), fp, mode="constant", cval=0.0) > 0
    z[holes] = np.nan
    if r:
        top, bottom, left, right = border
        if top:
            z[:r, :] = np.nan
        if bottom:
            z[-r:, :] = np.nan
        if left:
            z[:, :r] = np.nan
        if right:
            z[:, -r:] = np.nan
    return z


def component_shape(rows, cols, res):
    """Length, width (m), elongation and grid azimuth of the major axis of a set
    of cells, from the second moments of their centres. sqrt(12 * lambda + res^2)
    is exact for a filled rectangle of cells (lambda = population variance
    along the axis; res^2 restores the extent of one cell)."""
    if rows.size < 2:
        return {"length_m": float(res), "width_m": float(res), "elongation": 1.0, "axis_azimuth_deg": None}
    xy = np.vstack([cols.astype(float) * res, -rows.astype(float) * res])
    w, v = np.linalg.eigh(np.cov(xy, bias=True))
    length = math.sqrt(12.0 * max(w[1], 0.0) + res * res)
    width = math.sqrt(12.0 * max(w[0], 0.0) + res * res)
    az = math.degrees(math.atan2(v[0, 1], v[1, 1])) % 180.0
    return {
        "length_m": round(length, 2),
        "width_m": round(width, 2),
        "elongation": round(length / width, 2),
        "axis_azimuth_deg": round(az, 1),
    }


# ------------------------------------------------------------- the stack


def parse_epoch_specs(items, default_sigma):
    """[[TIF, YEAR, (SIGMA_M | SIGMA.tif)], ...] -> epochs sorted by year."""
    eps = []
    for it in items:
        if len(it) not in (2, 3):
            raise InputError(f"--epoch takes TIF YEAR [SIGMA_M | SIGMA.tif], got {' '.join(it)}")
        path = it[0]
        if not os.path.isfile(path):
            raise InputError(f"epoch raster not found: {path}")
        try:
            year = float(it[1])
        except ValueError:
            raise InputError(f"bad acquisition year {it[1]!r} for {path}") from None
        if not 1900 <= year <= 2200:
            raise InputError(f"acquisition year {it[1]} for {path} is out of range")
        sig_m, sig_path = default_sigma, None
        if len(it) == 3:
            try:
                sig_m = float(it[2])
            except ValueError:
                sig_m, sig_path = None, it[2]
                if not os.path.isfile(sig_path):
                    raise InputError(f"uncertainty raster not found: {sig_path}") from None
            if sig_m is not None and not sig_m > 0:
                raise InputError(f"sigma for {path} must be > 0 m, got {it[2]}")
        eps.append({"path": path, "year": year, "sigma_m": sig_m, "sigma_path": sig_path})
    if len(eps) < 2:
        raise InputError(f"at least two epochs are needed, got {len(eps)}")
    eps.sort(key=lambda e: e["year"])
    years = [e["year"] for e in eps]
    if len(set(years)) != len(years):
        raise InputError(f"two epochs share an acquisition year: {years}")
    return eps


def stack_grid(paths, res, lat=None, lon=None, radius_m=None):
    """Common grid: the footprint shared by every raster, in the CRS of the
    first (a UTM zone if that one is geographic), optionally clipped to a
    square window around (lat, lon)."""
    with rasterio.open(paths[0]) as d:
        crs, b = d.crs, d.bounds
    if crs is None:
        raise InputError(f"{paths[0]} has no CRS")
    if crs.is_geographic:
        (clon, clat) = ((b.left + b.right) / 2, (b.bottom + b.top) / 2)
        crs = CRS.from_epsg(mt.utm_epsg(clat, clon))
    left, bottom, right, top = -math.inf, -math.inf, math.inf, math.inf
    for p in paths:
        with rasterio.open(p) as d:
            if d.crs is None:
                raise InputError(f"{p} has no CRS")
            ob = transform_bounds(d.crs, crs, *d.bounds, densify_pts=21)
        left, bottom = max(left, ob[0]), max(bottom, ob[1])
        right, top = min(right, ob[2]), min(top, ob[3])
    if lat is not None and lon is not None and radius_m:
        (cx,), (cy,) = transform("EPSG:4326", crs, [lon], [lat])
        left, right = max(left, cx - radius_m), min(right, cx + radius_m)
        bottom, top = max(bottom, cy - radius_m), min(top, cy + radius_m)
    if right - left < res or top - bottom < res:
        raise InputError("the epochs do not share a footprint of at least one grid cell")
    left, top = math.floor(left / res) * res, math.ceil(top / res) * res
    cols, rows = int((right - left) // res), int((top - bottom) // res)
    if cols < 1 or rows < 1:
        raise InputError("the shared footprint is smaller than one grid cell")
    return rasterio.transform.from_origin(left, top, res, res), crs, (rows, cols)


def load_stack(epochs, xform, crs, shape):
    """Elevation and sigma arrays on the common grid; each later epoch has its
    median offset to the first removed. Returns (z, sigma, biases)."""
    z, sig = [], []
    for e in epochs:
        arr = mt.read_to_grid([e["path"]], xform, crs, shape)
        if not np.isfinite(arr).any():
            raise InputError(f"{e['path']} has no data on the common grid")
        if e["sigma_path"]:
            s = mt.read_to_grid([e["sigma_path"]], xform, crs, shape)
            with np.errstate(invalid="ignore"):
                s[~(s > 0)] = np.nan
            if not np.isfinite(s).any():
                raise InputError(f"uncertainty raster {e['sigma_path']} has no positive values on the grid")
        else:
            s = np.full(shape, float(e["sigma_m"]))
        z.append(arr)
        sig.append(s)
    biases = [0.0]
    for k in range(1, len(z)):
        _, bias, _ = mt.coregister(z[0], z[k])
        z[k] = z[k] - bias
        biases.append(round(bias, 4))
    return z, sig, biases


# ------------------------------------------------------------- analysis


def pair_changes(z, sigma, years, t=1.96, mad_floor=True):
    """DEM of difference for each consecutive pair with its propagated sigma,
    LoD and per-cell change significance ("significance"; "p" is a deprecated
    alias of the same array)."""
    out = []
    for i in range(len(z) - 1):
        dod = z[i + 1] - z[i]
        sp = np.sqrt(sigma[i] ** 2 + sigma[i + 1] ** 2)
        ok = np.isfinite(dod) & np.isfinite(sp)
        emp = float("nan")
        if ok.any():
            d = dod[ok]
            emp = float(1.4826 * np.median(np.abs(d - np.median(d))))
        s = np.maximum(sp, emp) if (mad_floor and math.isfinite(emp)) else sp
        s = np.where(ok, s, np.nan)
        dod = np.where(ok, dod, np.nan)
        lod = t * s
        with np.errstate(invalid="ignore"):
            up, down = int((dod > lod).sum()), int((dod < -lod).sum())
        sig = change_significance(dod, s)
        out.append(
            {
                "years": (years[i], years[i + 1]),
                "dod": dod,
                "sigma": s,
                # "p": change_probability(dod, s),  # SYSTEM_REVIEW H6: renamed; "p" kept as an alias
                # Lesson: a key called "p" holding 1 - p is the opposite of what a statistician would read it as.
                "significance": sig,
                "p": sig,
                "stats": {
                    "pair": f"{_yr(years[i])}-{_yr(years[i + 1])}",
                    "sigma_propagated_median_m": round(float(np.nanmedian(np.where(ok, sp, np.nan))), 4),
                    "sigma_empirical_mad_m": round(emp, 4) if math.isfinite(emp) else None,
                    "sigma_used_median_m": round(float(np.nanmedian(s)), 4),
                    "lod_median_m": round(float(np.nanmedian(lod)), 4),
                    "cells_rise_above_lod": up,
                    "cells_drop_below_lod": down,
                },
            }
        )
    return out


def timeline_combos(pair_years, window):
    """(mound pair a, sink pair b) with b after a whose possible elapsed time
    since burial overlaps window. Burial lies in (ya0, ya1]; subsidence is seen
    in (yb0, yb1], so elapsed time spans [yb0 - ya1, yb1 - ya0]."""
    lo, hi = window
    out = []
    for a, (ya0, ya1) in enumerate(pair_years):
        for b in range(a + 1, len(pair_years)):
            yb0, yb1 = pair_years[b]
            if yb1 - ya0 >= lo and yb0 - ya1 <= hi:
                out.append((a, b))
    return out


def burial_timeline(pairs, combos, strata, res, a, gi_stats=None, border=(True, True, True, True)):
    """Screening index, phase significances, Gi* per pair and the timeline
    p-value for every cell. See the module docstring, steps 3 and 4.

    gi_stats (one gistar_stats dict per pair) and border are passed when pairs
    and strata are one tile of the grid; see burial_timeline_tiled."""
    bw = a.gi_bandwidth_m or a.neighbourhood_m
    with np.errstate(invalid="ignore", divide="ignore"):
        u = [p["dod"] / p["sigma"] for p in pairs]
    nz = [neighbourhood_z(x, a.neighbourhood_m, res) for x in u]
    with np.errstate(invalid="ignore"):
        pm = [np.where(np.isfinite(n), np.where(n > 0, special.erf(n / SQRT2), 0.0), np.nan) for n in nz]
        ps = [np.where(np.isfinite(n), np.where(n < 0, special.erf(-n / SQRT2), 0.0), np.nan) for n in nz]
    # gz = [gistar_stratified(x, strata, res, bw, a.min_stratum_cells) for x in u]  # SYSTEM_REVIEW H6: tiles
    # Lesson: whole-grid only meant one full layer per (mound, sink) combination and phase, about 7.8 GB per km^2.
    # Tests on 120 x 120 grids never showed it; check memory scaling, not just correctness, on small inputs.
    gz = [gistar_stratified(x, strata, res, bw, a.min_stratum_cells, None if gi_stats is None else gi_stats[k], border)
          for k, x in enumerate(u)]
    s_st = np.stack([np.sqrt(pm[i] * ps[j]) for i, j in combos])
    m_st = np.stack([pm[i] for i, _ in combos])
    k_st = np.stack([ps[j] for _, j in combos])
    p_st = np.stack([np.fmax(special.ndtr(-gz[i]), special.ndtr(gz[j])) for i, j in combos])
    for k, (i, j) in enumerate(combos):  # fmax ignores NaN; an untestable phase must not pass
        p_st[k][~(np.isfinite(gz[i]) & np.isfinite(gz[j]))] = np.nan
    best = np.argmax(np.where(np.isfinite(s_st), s_st, -1.0), axis=0)
    take = (lambda st: np.take_along_axis(st, best[None], axis=0)[0])
    any_ok = np.isfinite(s_st).any(axis=0)
    score = np.where(any_ok, take(s_st), np.nan)
    p_tl = np.fmin.reduce(p_st, axis=0)
    p_tl = np.clip(p_tl * len(combos), 0.0, 1.0)
    with np.errstate(divide="ignore"):
        z_tl = -special.ndtri(np.clip(p_tl, 1e-300, 1.0))
    mound_sig = np.where(any_ok, take(m_st), np.nan)
    sink_sig = np.where(any_ok, take(k_st), np.nan)
    return {
        "score": score,
        # "p_mound": np.where(any_ok, take(m_st), np.nan),  # SYSTEM_REVIEW H6: renamed, kept as aliases
        # Lesson: "p_mound" next to a q-value column looked like a p-value or a probability of a mound; it was neither.
        # "p_sink": np.where(any_ok, take(k_st), np.nan),
        "mound_significance": mound_sig,
        "sink_significance": sink_sig,
        "p_mound": mound_sig,
        "p_sink": sink_sig,
        "combo": np.where(any_ok, best, -1),
        "p": p_tl,
        "z": z_tl,
        "gi_z": gz,
        "nb_z": nz,
    }


def required_halo(a, res):
    """Smallest halo, in cells, for which tiled and whole-grid timelines agree:
    the neighbourhood radius plus the Gi* bandwidth, plus one cell of margin."""
    bw = a.gi_bandwidth_m or a.neighbourhood_m
    return int(math.ceil((a.neighbourhood_m + bw) / res - 1e-9)) + 1


def tile_windows(shape, tile, halo):
    """Square tiles covering shape. Each: core (slices into the grid), win (core
    grown by halo, clipped to the grid), inner (the core as slices into win) and
    border (top, bottom, left, right: True where win touches the grid edge)."""
    rows, cols = shape
    out = []
    for r0 in range(0, rows, tile):
        r1 = min(rows, r0 + tile)
        for c0 in range(0, cols, tile):
            c1 = min(cols, c0 + tile)
            wr0, wr1 = max(0, r0 - halo), min(rows, r1 + halo)
            wc0, wc1 = max(0, c0 - halo), min(cols, c1 + halo)
            out.append(
                {
                    "core": (slice(r0, r1), slice(c0, c1)),
                    "win": (slice(wr0, wr1), slice(wc0, wc1)),
                    "inner": (slice(r0 - wr0, r1 - wr0), slice(c0 - wc0, c1 - wc0)),
                    "border": (wr0 == 0, wr1 == rows, wc0 == 0, wc1 == cols),
                }
            )
    return out


def _gistar_stats_tiled(dod, sigma, strata, cores):
    """gistar_stats of u = dod / sigma accumulated tile by tile (two passes:
    count and sum, then squared deviations), never holding u for the whole grid."""
    n, s1, ssd = {}, {}, {}

    def chunks(core):
        with np.errstate(invalid="ignore", divide="ignore"):
            x = dod[core] / sigma[core]
        st = strata[core]
        valid = np.isfinite(x) & (st >= 0)
        for cls in np.unique(st[valid]):
            yield int(cls), x[valid & (st == cls)]

    for core in cores:
        for cls, v in chunks(core):
            n[cls] = n.get(cls, 0) + int(v.size)
            s1[cls] = s1.get(cls, 0.0) + float(v.sum())
    mean = {c: s1[c] / n[c] for c in n}
    for core in cores:
        for cls, v in chunks(core):
            ssd[cls] = ssd.get(cls, 0.0) + float(((v - mean[cls]) ** 2).sum())
    return {c: (n[c], mean[c], math.sqrt(ssd[c] / n[c])) for c in n}


def burial_timeline_tiled(pairs, combos, strata, res, a, tile, halo=None):
    """burial_timeline computed in tiles of tile x tile cells with halo cells of
    overlap (default required_halo). Same result as the whole-grid call; the
    per-combination working arrays are bounded by (tile + 2 * halo)^2 cells."""
    need = required_halo(a, res)
    halo = need if halo is None else int(halo)
    if halo < need:
        raise InputError(
            f"halo of {halo} cells is smaller than the neighbourhood radius plus the Gi* bandwidth "
            f"({need} cells at {res:g} m); tiles would disagree with the whole-grid result"
        )
    if tile < 1:
        raise InputError(f"tile size must be at least one cell, got {tile}")
    shape = strata.shape
    tiles = tile_windows(shape, int(tile), halo)
    cores = [t["core"] for t in tiles]
    stats = [_gistar_stats_tiled(p["dod"], p["sigma"], strata, cores) for p in pairs]
    full = (lambda: np.full(shape, np.nan))
    out = {
        "score": full(),
        "mound_significance": full(),
        "sink_significance": full(),
        "combo": np.full(shape, -1, dtype=np.int64),
        "p": full(),
        "z": full(),
        "gi_z": [full() for _ in pairs],
        "nb_z": [full() for _ in pairs],
    }
    for t in tiles:
        win, inner, core = t["win"], t["inner"], t["core"]
        sub = [{"dod": p["dod"][win], "sigma": p["sigma"][win]} for p in pairs]
        tl = burial_timeline(sub, combos, strata[win], res, a, gi_stats=stats, border=t["border"])
        for key in ("score", "mound_significance", "sink_significance", "combo", "p", "z"):
            out[key][core] = tl[key][inner]
        for k in range(len(pairs)):
            out["gi_z"][k][core] = tl["gi_z"][k][inner]
            out["nb_z"][k][core] = tl["nb_z"][k][inner]
        del tl, sub
    out["p_mound"] = out["mound_significance"]  # deprecated aliases (SYSTEM_REVIEW H6)
    out["p_sink"] = out["sink_significance"]
    out["tiling"] = {"tile_cells": int(tile), "halo_cells": halo, "n_tiles": len(tiles)}
    return out


def _xy(xform, col, row):
    """World x, y of a fractional (col, row) on an affine grid (no deprecated `affine * tuple`)."""
    return xform.c + xform.a * col + xform.b * row, xform.f + xform.d * col + xform.e * row


def _locate(rows, cols, xform, crs, ref):
    x, y = _xy(xform, cols.mean() + 0.5, rows.mean() + 0.5)
    (lon,), (lat,) = transform(crs, "EPSG:4326", [x], [y])
    d, b = mt.geodesic_offset(ref[0], ref[1], lat, lon)
    return {
        "centroid_lat": round(lat, 7),
        "centroid_lon": round(lon, 7),
        "centroid_x": round(float(x), 2),
        "centroid_y": round(float(y), 2),
        "distance_m": round(d, 2),
        "distance_ft": round(d / 0.3048, 1),
        "bearing_deg_true": round(b, 1),
    }


def _shape_class(shape, a, prefix):
    linear = shape["length_m"] >= a.void_min_length_m and shape["elongation"] >= a.void_min_elongation
    return f"{prefix}_{'linear' if linear else 'compact'}"


def extract_candidates(tl, q, pairs, combos, res, xform, crs, ref, a):
    """Connected cells passing FDR and the minimum change significance of both
    phases. Returns (records, masks), records sorted by peak screening index."""
    with np.errstate(invalid="ignore"):
        # ok = (q <= a.alpha) & (np.fmin(tl["p_mound"], tl["p_sink"]) >= a.min_change_prob)  # SYSTEM_REVIEW H6
        # Lesson: the logic was right; only the names were misleading. Wrong names spread into every report that
        # quotes them, so a rename is a correctness fix, not cosmetics.
        ok = (q <= a.alpha) & (
            np.fmin(tl["mound_significance"], tl["sink_significance"]) >= a.min_change_significance
        )
    lab, n = ndimage.label(ok, structure=np.ones((3, 3)))
    min_cells = max(1, int(math.ceil(a.min_area_m2 / (res * res) - 1e-9)))
    recs, masks = [], []
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() < min_cells:
            continue
        rr, cc = np.nonzero(m)
        sc = tl["score"][m]
        k = int(np.nanargmax(sc))
        pr, pc = rr[k], cc[k]
        ia, ib = combos[int(tl["combo"][pr, pc])]
        shape = component_shape(rr, cc, res)
        rec = {
            "kind": "burial_timeline",
            "type": _shape_class(shape, a, "burial"),
            "cells": int(m.sum()),
            "area_m2": round(float(m.sum() * res * res), 3),
            "peak_score": round(float(sc[k]), 4),
            "mean_score": round(float(np.nanmean(sc)), 4),
            "min_q": float(f"{float(np.nanmin(q[m])):.3g}"),
            "timeline_z_max": round(float(np.nanmax(tl["z"][m])), 2),
            "mound_significance": round(float(tl["mound_significance"][pr, pc]), 4),
            "sink_significance": round(float(tl["sink_significance"][pr, pc]), 4),
            # Deprecated aliases of the two above (SYSTEM_REVIEW H6: 1 - p, not a probability); dossier.py reads them.
            "p_mound": round(float(tl["p_mound"][pr, pc]), 4),
            "p_sink": round(float(tl["p_sink"][pr, pc]), 4),
            "gi_z_mound": round(float(tl["gi_z"][ia][pr, pc]), 2),
            "gi_z_sink": round(float(tl["gi_z"][ib][pr, pc]), 2),
            "mound_interval": pairs[ia]["stats"]["pair"],
            "sink_interval": pairs[ib]["stats"]["pair"],
            "mound_max_dz_m": round(float(np.nanmax(pairs[ia]["dod"][m])), 4),
            "sink_min_dz_m": round(float(np.nanmin(pairs[ib]["dod"][m])), 4),
        }
        rec.update(shape)
        rec.update(_locate(rr, cc, xform, crs, ref))
        recs.append(rec)
        masks.append(m)
    order = sorted(range(len(recs)), key=lambda j: -recs[j]["peak_score"])
    return [recs[j] for j in order], [masks[j] for j in order]


def detect_voids(z, res, a, xform=None, crs=None, ref=None):
    """Black top-hat depressions of z with PCA shape. Returns (tophat, records,
    masks); records carry world coordinates when xform/crs/ref are given."""
    ok = np.isfinite(z)
    bth = np.full(z.shape, np.nan)
    if not ok.any():
        return bth, [], []
    zf = np.where(ok, z, np.nanmedian(z))
    fp = disk(a.void_width_m / (2.0 * res))
    bth = ndimage.grey_closing(zf, footprint=fp) - zf
    bth[~ok] = np.nan
    with np.errstate(invalid="ignore"):
        mask = bth > a.void_depth_m
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    min_cells = max(2, int(math.ceil(a.void_min_area_m2 / (res * res) - 1e-9)))
    recs, masks = [], []
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() < min_cells:
            continue
        rr, cc = np.nonzero(m)
        shape = component_shape(rr, cc, res)
        d = bth[m]
        rec = {
            "kind": "void",
            "type": _shape_class(shape, a, "void"),
            "cells": int(m.sum()),
            "area_m2": round(float(m.sum() * res * res), 3),
            "depth_max_m": round(float(d.max()), 4),
            "depth_mean_m": round(float(d.mean()), 4),
            "void_volume_m3": round(float(d.sum() * res * res), 4),
            "row": round(float(rr.mean()), 2),
            "col": round(float(cc.mean()), 2),
        }
        rec.update(shape)
        if xform is not None:
            rec.update(_locate(rr, cc, xform, crs, ref))
        recs.append(rec)
        masks.append(m)
    order = sorted(range(len(recs)), key=lambda j: -recs[j]["depth_max_m"])
    return bth, [recs[j] for j in order], [masks[j] for j in order]


def analyse(z, sigma, years, res, xform, crs, a=None, ref=None):
    """Full screening on co-gridded arrays (oldest epoch first). Returns a dict;
    arrays under '_arrays', vector masks under '_masks'."""
    a = a or params()
    shape = z[0].shape
    if ref is None:
        x, y = _xy(xform, shape[1] / 2, shape[0] / 2)
        (lon,), (lat,) = transform(crs, "EPSG:4326", [x], [y])
        ref = (lat, lon)
    pairs = pair_changes(z, sigma, years, a.t, a.mad_floor)
    combos = timeline_combos([p["years"] for p in pairs], a.sink_window_years)
    slope = slope_degrees(z[-1], res)
    strata = slope_strata(slope, a.slope_edges)
    arrays = {"slope_deg": slope, "lrm_m": mt.local_relief(z[-1], res, 5.0)}
    cands, cmasks, tl = [], [], None
    tile = int(getattr(a, "tile_cells", 0) or 0)
    halo = getattr(a, "halo_cells", None)
    tiling = {"tile_cells": 0, "halo_cells": 0, "n_tiles": 1}
    if combos:
        # tl = burial_timeline(pairs, combos, strata, res, a)  # SYSTEM_REVIEW H6: tiled when the grid is larger
        # Lesson: one call over the whole grid capped the tool at a few hectares; county scale needs bounded memory.
        if tile and (shape[0] > tile or shape[1] > tile):
            tl = burial_timeline_tiled(pairs, combos, strata, res, a, tile, halo)
            tiling = tl["tiling"]
        else:
            tl = burial_timeline(pairs, combos, strata, res, a)
        q = bh_qvalues(tl["p"])
        cands, cmasks = extract_candidates(tl, q, pairs, combos, res, xform, crs, ref, a)
        # arrays.update(score=tl["score"], timeline_z=tl["z"], qvalue=q, p_mound=tl["p_mound"], p_sink=tl["p_sink"])
        arrays.update(score=tl["score"], timeline_z=tl["z"], qvalue=q, mound_significance=tl["mound_significance"],
                      sink_significance=tl["sink_significance"], p_mound=tl["p_mound"], p_sink=tl["p_sink"])
    bth, voids, vmasks = detect_voids(z[-1], res, a, xform, crs, ref)
    arrays["void_tophat"] = bth
    for i, r in enumerate(cands, 1):
        r["id"] = f"B{i:03d}"
    for i, r in enumerate(voids, 1):
        r["id"] = f"V{i:03d}"
    nan = np.full(shape, np.nan)
    return {
        "timeline_evaluable": bool(combos),
        "combinations": [
            {"mound": pairs[i]["stats"]["pair"], "sink": pairs[j]["stats"]["pair"]} for i, j in combos
        ],
        "pairs": [p["stats"] for p in pairs],
        "reference_point": {"lat": ref[0], "lon": ref[1]},
        "valid_cells": int(np.isfinite(tl["score"]).sum()) if tl else 0,
        "tested_cells": int(np.isfinite(tl["p"]).sum()) if tl else 0,
        "tiling": tiling,
        "candidates": cands,
        "voids": voids,
        "_arrays": arrays,
        "_pairs": pairs,
        "_timeline": tl,
        "_masks": cmasks + vmasks,
        "_nan": nan,
    }


# ----------------------------------------------------------- calibration


def read_sites_csv(path, src_crs, dst_crs):
    """[(x, y, burial_year)] in dst_crs from a CSV with easting, northing,
    burial_year columns in src_crs."""
    try:
        with open(path, newline="") as f:
            rows = list(csv.DictReader(f))
            fields = {k.strip().lower() for k in (rows[0].keys() if rows else []) if k}
    except OSError as e:
        raise InputError(f"cannot read sites file {path}: {e}") from None
    need = {"easting", "northing", "burial_year"}
    if not rows or not need <= fields:
        raise InputError(f"{path} needs columns easting, northing, burial_year and at least one row")
    xs, ys, yrs = [], [], []
    for n, r in enumerate(rows, 2):
        r = {k.strip().lower(): v for k, v in r.items() if k}
        try:
            xs.append(float(r["easting"]))
            ys.append(float(r["northing"]))
            yrs.append(float(r["burial_year"]))
        except (TypeError, ValueError):
            raise InputError(f"{path} line {n}: easting, northing and burial_year must be numbers") from None
    if CRS.from_user_input(src_crs) != CRS.from_user_input(dst_crs):
        xs, ys = transform(src_crs, dst_crs, xs, ys)
    return list(zip(xs, ys, yrs))


def label_sites(sites, epoch_years, combos, pair_years, xform, shape):
    """Split labelled sites into usable and censored. A site is censored, not a
    negative, when it was buried at or before the first epoch (no survey saw the
    ground before the grave) or when no (mound, sink) combination can observe
    its burial year (e.g. buried in the last interval, so no later survey can
    show subsidence). Sites off the grid are counted and dropped."""
    mound_pairs = sorted({pair_years[i] for i, _ in combos})
    usable, censored, outside = [], [], 0
    for x, y, yr in sites:
        r, c = rasterio.transform.rowcol(xform, x, y, op=math.floor)
        r, c = int(r), int(c)
        if not (0 <= r < shape[0] and 0 <= c < shape[1]):
            outside += 1
            continue
        rec = {"easting": x, "northing": y, "burial_year": yr, "row": r, "col": c}
        if yr <= epoch_years[0]:
            censored.append(dict(rec, reason="buried_before_first_epoch"))
        elif not any(y0 < yr <= y1 for y0, y1 in mound_pairs):
            censored.append(dict(rec, reason="no_observable_timeline"))
        else:
            usable.append(rec)
    return {"usable": usable, "censored": censored, "outside_grid": outside}


def _load_sklearn():
    """(namespace of the scikit-learn pieces calibration needs, None) or
    (None, reason) when scikit-learn is missing or cannot be imported."""
    try:
        from sklearn.calibration import CalibratedClassifierCV
        from sklearn.impute import SimpleImputer
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import brier_score_loss, roc_auc_score
        from sklearn.model_selection import StratifiedGroupKFold
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler
    except ImportError as e:
        if getattr(e, "name", None) == "sklearn" or "No module named 'sklearn'" in str(e):
            return None, "scikit-learn is not installed (pip install scikit-learn)"
        return None, f"scikit-learn is installed but failed to import ({e})"
    return argparse.Namespace(
        CalibratedClassifierCV=CalibratedClassifierCV,
        SimpleImputer=SimpleImputer,
        LogisticRegression=LogisticRegression,
        brier_score_loss=brier_score_loss,
        roc_auc_score=roc_auc_score,
        StratifiedGroupKFold=StratifiedGroupKFold,
        Pipeline=Pipeline,
        StandardScaler=StandardScaler,
    ), None


def _model(sk):
    base = sk.Pipeline(
        [
            ("impute", sk.SimpleImputer(strategy="median")),
            ("scale", sk.StandardScaler()),
            ("logit", sk.LogisticRegression(class_weight="balanced", max_iter=2000)),
        ]
    )
    return sk.CalibratedClassifierCV(base, method="sigmoid", cv=3)


def prior_correct(p, frac):
    """Undo negative subsampling: training odds = true odds / frac."""
    if frac >= 1.0:
        return p
    with np.errstate(invalid="ignore", divide="ignore"):
        return p * frac / (p * frac + (1.0 - p))


def _site_distance(sites, shape, res):
    pts = np.zeros(shape, dtype=bool)
    for s in sites:
        pts[s["row"], s["col"]] = True
    if not pts.any():
        return np.full(shape, np.inf)
    return ndimage.distance_transform_edt(~pts) * res


def operating_curve(prob, usable, d_usable, d_any, res, hit_radius_m, thresholds):
    """Site-level sweep of a probability threshold. A site is hit when a passing
    cell lies within hit_radius_m; a passing 8-connected region with no site
    (usable or censored) within hit_radius_m is a false alarm; regions near a
    censored site only are neither."""
    rows = []
    rc = int(math.ceil(hit_radius_m / res))
    yy, xx = np.mgrid[-rc:rc + 1, -rc:rc + 1]
    near_disk = (np.hypot(yy, xx) * res) <= hit_radius_m
    for thr in thresholds:
        with np.errstate(invalid="ignore"):
            passed = prob >= thr
        hits = 0
        for s in usable:
            r0, c0 = s["row"] - rc, s["col"] - rc
            win = np.zeros_like(near_disk)
            sub = passed[max(0, r0):r0 + 2 * rc + 1, max(0, c0):c0 + 2 * rc + 1]
            win[max(0, -r0):max(0, -r0) + sub.shape[0], max(0, -c0):max(0, -c0) + sub.shape[1]] = sub
            hits += bool((win & near_disk).any())
        lab, n = ndimage.label(passed, structure=np.ones((3, 3)))
        tp = fa = 0
        if n:
            idx = np.arange(1, n + 1)
            near_u = np.asarray(ndimage.maximum(d_usable <= hit_radius_m, lab, idx), dtype=bool)
            near_a = np.asarray(ndimage.maximum(d_any <= hit_radius_m, lab, idx), dtype=bool)
            tp, fa = int(near_u.sum()), int((~near_a).sum())
        prec = tp / (tp + fa) if (tp + fa) else None
        rec = hits / len(usable) if usable else None
        f1 = 2 * prec * rec / (prec + rec) if (prec and rec) else 0.0
        rows.append(
            {
                "threshold": float(f"{thr:.4g}"),
                "passed_cells": int(passed.sum()),
                "sites": len(usable),
                "sites_hit": hits,
                "true_regions": tp,
                "false_alarms": fa,
                "precision": None if prec is None else round(prec, 3),
                "recall": None if rec is None else round(rec, 3),
                "f1": round(f1, 3),
            }
        )
    return rows


def calibrate(features, valid, labelled, res, a, sk, seed=0):
    """Calibrated classifier with spatially blocked cross-validation.
    Returns (info, probability raster or None, operating curve rows)."""
    usable, censored = labelled["usable"], labelled["censored"]
    info = {"n_sites_usable": len(usable), "n_sites_censored": len(censored), "features": list(features)}
    if len(usable) < 2:
        return dict(info, status="skipped: fewer than two usable labelled sites on the grid"), None, []
    shape = valid.shape
    d_usable = _site_distance(usable, shape, res)
    d_any = _site_distance(usable + censored, shape, res)
    pos = valid & (d_usable <= a.site_radius_m)
    neg_pool = np.flatnonzero(valid & (d_any > a.exclusion_m))
    if not pos.any() or neg_pool.size == 0:
        return dict(info, status="skipped: no positive or no negative cells"), None, []
    rng = np.random.default_rng(seed)
    neg = neg_pool if neg_pool.size <= a.max_negatives else rng.choice(neg_pool, a.max_negatives, replace=False)
    frac = neg.size / neg_pool.size
    bc = max(1, int(round(a.block_m / res)))
    rows_i, cols_i = np.indices(shape)
    block = ((rows_i // bc) * (-(-shape[1] // bc)) + cols_i // bc).ravel()
    idx = np.concatenate([np.flatnonzero(pos), neg])
    y = np.concatenate([np.ones(int(pos.sum()), int), np.zeros(neg.size, int)])
    xall = np.column_stack([features[k].ravel() for k in features])
    x, g = xall[idx], block[idx]
    k = min(a.cv_folds, np.unique(g[y == 1]).size)
    if k < 2:
        return dict(info, status="skipped: labelled sites fall in fewer than two spatial blocks"), None, []
    cv = sk.StratifiedGroupKFold(n_splits=k, shuffle=True, random_state=seed)
    oof = np.full(y.size, np.nan)
    models, fold_of = [], {}
    try:
        for f, (tr, te) in enumerate(cv.split(x, y, g)):
            mdl = _model(sk).fit(x[tr], y[tr])
            models.append(mdl)
            oof[te] = mdl.predict_proba(x[te])[:, 1]
            fold_of.update({int(b): f for b in np.unique(g[te])})
        final = _model(sk).fit(x, y)
    except ValueError as e:
        return dict(info, status=f"skipped: model could not be fitted ({e})"), None, []
    vflat = valid.ravel()
    cell_fold = np.array([fold_of.get(int(b), int(b) % k) for b in range(int(block.max()) + 1)])[block]
    oof_r = np.full(vflat.size, np.nan)
    for f, mdl in enumerate(models):
        sel = vflat & (cell_fold == f)
        if sel.any():
            oof_r[sel] = mdl.predict_proba(xall[sel])[:, 1]
    oof_r = prior_correct(oof_r, frac).reshape(shape)
    thresholds = np.unique(np.concatenate([np.geomspace(1e-6, 0.5, 20), [0.6, 0.7, 0.8, 0.9]]))
    curve = operating_curve(oof_r, usable, d_usable, d_any, res, a.hit_radius_m, thresholds)
    prob = np.full(vflat.size, np.nan)
    prob[vflat] = final.predict_proba(xall[vflat])[:, 1]
    best = max(curve, key=lambda r: r["f1"]) if curve else None
    info.update(
        status="calibrated",
        model="StandardScaler + LogisticRegression(class_weight=balanced), CalibratedClassifierCV(sigmoid, cv=3)",
        cv=f"StratifiedGroupKFold(n_splits={k}) over {a.block_m:g} m spatial blocks",
        n_positive_cells=int(y.sum()),
        n_negative_cells=int(neg.size),
        negative_sampling_fraction=round(frac, 6),
        oof_auc=round(float(sk.roc_auc_score(y, oof)), 4),
        oof_brier_sample_prevalence=round(float(sk.brier_score_loss(y, oof)), 4),
        best_site_level_threshold=best,
        censored_sites=[{k2: s[k2] for k2 in ("easting", "northing", "burial_year", "reason")} for s in censored],
    )
    return info, prior_correct(prob, frac).reshape(shape), curve


# ----------------------------------------------------------------- outputs


LEDGER_COLS = [
    "id",
    "kind",
    "type",
    "label",
    "centroid_lat",
    "centroid_lon",
    "area_m2",
    "cells",
    "peak_score",
    "mean_score",
    "min_q",
    "timeline_z_max",
    "mound_significance",
    "sink_significance",
    "p_mound",
    "p_sink",
    "gi_z_mound",
    "gi_z_sink",
    "mound_interval",
    "sink_interval",
    "mound_max_dz_m",
    "sink_min_dz_m",
    "p_calibrated_max",
    "depth_max_m",
    "depth_mean_m",
    "void_volume_m3",
    "length_m",
    "width_m",
    "elongation",
    "axis_azimuth_deg",
    "distance_m",
    "distance_ft",
    "bearing_deg_true",
    "centroid_x",
    "centroid_y",
]


def _write_tagged(path, arr, xform, crs, label):
    mt.write_tif(path, arr, xform, crs)
    with rasterio.open(path, "r+") as d:
        d.update_tags(LABEL=label, TOOL=f"burial_signature.py {VERSION}")


def _relabel_kml(path, label, n_records):
    """microtopo.write_vectors titles its KML for M-TMAT; put this tool's name
    and label on the document and on every placemark, and fail loudly if the
    text it replaces is no longer there."""
    with open(path) as f:
        s = f.read()
    old_name = "<name>M-TMAT terrain change anomalies</name>"
    old_doc = f"<description>{escape(mt.NOTE)}</description>"
    old_mark = f"\n{escape(mt.NOTE)}</description>"
    if old_name not in s or old_doc not in s or s.count(old_mark) != n_records:
        raise RuntimeError("microtopo.write_vectors KML layout changed; cannot label the KML output")
    s = s.replace(old_name, f"<name>Burial-timeline screening ({escape(label)})</name>", 1)
    s = s.replace(old_doc, f"<description>{escape(label + '. ' + NOTE)}</description>", 1)
    s = s.replace(old_mark, f"\n{escape('label: ' + label)}\n{escape(NOTE)}</description>")
    with open(path, "w") as f:
        f.write(s)


def write_outputs(out_dir, res, xform, crs, label, prov):
    arrays = res["_arrays"]
    for p in res["_pairs"]:
        tag = p["stats"]["pair"].replace("-", "_")
        mt.write_tif(os.path.join(out_dir, f"dod_{tag}.tif"), p["dod"], xform, crs)
        mt.write_tif(os.path.join(out_dir, f"significance_{tag}.tif"), p["significance"], xform, crs)
        # Deprecated name of the same raster (SYSTEM_REVIEW H6), kept so existing readers find it.
        mt.write_tif(os.path.join(out_dir, f"pchange_{tag}.tif"), p["p"], xform, crs)
    if res["_timeline"] is not None:
        for p, gz in zip(res["_pairs"], res["_timeline"]["gi_z"]):
            tag = p["stats"]["pair"].replace("-", "_")
            mt.write_tif(os.path.join(out_dir, f"gistar_{tag}.tif"), gz, xform, crs)
    for name in ("score", "timeline_z", "qvalue"):
        _write_tagged(os.path.join(out_dir, f"{name}.tif"), arrays.get(name, res["_nan"]), xform, crs, LABEL)
    mt.write_tif(os.path.join(out_dir, "void_tophat.tif"), arrays["void_tophat"], xform, crs)
    recs = res["candidates"] + res["voids"]
    for r in recs:
        r["label"] = label
    mt.write_vectors(out_dir, recs, res["_masks"], xform, crs, prov)
    _relabel_kml(os.path.join(out_dir, "anomalies.kml"), label, len(recs))
    with open(os.path.join(out_dir, "ledger.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=LEDGER_COLS, extrasaction="ignore", restval="")
        w.writeheader()
        w.writerows(recs)


def write_manifest(out_dir, man):
    outputs = {}
    for name in sorted(os.listdir(out_dir)):
        if name != "manifest.json" and os.path.isfile(os.path.join(out_dir, name)):
            outputs[name] = mt._sha256(os.path.join(out_dir, name))
    man["outputs_sha256"] = outputs
    with open(os.path.join(out_dir, "manifest.json"), "w") as f:
        json.dump(man, f, indent=1)
    return man


# -------------------------------------------------------------------- CLI


def _params_record(a):
    keys = list(DEFAULTS)
    rec = {k: getattr(a, k) for k in keys}
    rec["gi_bandwidth_m"] = a.gi_bandwidth_m or a.neighbourhood_m
    rec["sink_window_years"] = list(a.sink_window_years)
    rec["slope_edges"] = list(a.slope_edges)
    rec["sigma_formula"] = "sqrt(s1^2 + s2^2)" + (", floored at 1.4826 * MAD(dZ)" if a.mad_floor else "")
    rec["change_significance_formula"] = "1 - p, p = 2 * (1 - Phi(|dZ| / sigma)); not a probability of change"
    rec["p_change_formula"] = "1 - 2 * (1 - Phi(|dZ| / sigma))"  # deprecated key (SYSTEM_REVIEW H6)
    rec["min_change_prob"] = a.min_change_significance  # deprecated key (SYSTEM_REVIEW H6)
    rec["halo_cells"] = (a.halo_cells if a.halo_cells is not None else required_halo(a, a.res_m))
    rec["deprecated_aliases"] = {
        "p_mound": "mound_significance",
        "p_sink": "sink_significance",
        "pchange_*.tif": "significance_*.tif",
        "min_change_prob": "min_change_significance",
        "p_change_formula": "change_significance_formula",
    }
    rec["timeline_p"] = "min over (mound, sink) pairs of max(p_mound_Gi*, p_sink_Gi*) x n_pairs, then BH"
    return rec


def _calibration_step(a, z, years, res, xform, sites, out_dir, log):
    """Run calibration when requested. Returns (info, prob raster or None)."""
    if sites is None:
        return None, None
    tl = res["_timeline"]
    if tl is None:
        return {"status": "skipped: burial timeline not evaluable"}, None
    sk, why = _load_sklearn()
    if sk is None:
        msg = f"skipped: {why}; outputs remain a screening index"
        log(f"calibration {msg}")
        return {"status": msg}, None
    pairs = res["_pairs"]
    combos = timeline_combos([p["years"] for p in pairs], a.sink_window_years)
    labelled = label_sites(sites, years, combos, [p["years"] for p in pairs], xform, z[0].shape)
    arr = res["_arrays"]
    feats = {
        "score": arr["score"],
        # "p_mound": arr["p_mound"],  # SYSTEM_REVIEW H6: renamed
        # "p_sink": arr["p_sink"],
        "mound_significance": arr["mound_significance"],
        "sink_significance": arr["sink_significance"],
        "timeline_z": np.clip(arr["timeline_z"], -10, 40),
        "slope_deg": arr["slope_deg"],
        "lrm_m": arr["lrm_m"],
        "void_tophat_m": arr["void_tophat"],
    }
    info, prob, curve = calibrate(feats, np.isfinite(arr["score"]), labelled, a.res_m, a, sk)
    info["sites_outside_grid"] = labelled["outside_grid"]
    log(f"calibration {info['status']}")
    if prob is not None:
        with open(os.path.join(out_dir, "operating_curve.csv"), "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(curve[0]))
            w.writeheader()
            w.writerows(curve)
        info["operating_curve"] = curve
    return info, prob


def run(a, log=print):
    epochs = parse_epoch_specs(a.epoch, a.sigma_m)
    xform, crs, shape = stack_grid([e["path"] for e in epochs], a.res_m, a.lat, a.lon, a.radius_m)
    sites = read_sites_csv(a.sites, a.sites_crs or crs, crs) if a.sites else None
    os.makedirs(a.out_dir, exist_ok=True)
    log(f"{len(epochs)} epochs {[_yr(e['year']) for e in epochs]}; grid {shape[0]}x{shape[1]} at {a.res_m} m in {crs}")
    z, sigma, biases = load_stack(epochs, xform, crs, shape)
    years = [e["year"] for e in epochs]
    ref = (a.ref_lat, a.ref_lon) if a.ref_lat is not None and a.ref_lon is not None else None
    res = analyse(z, sigma, years, a.res_m, xform, crs, a, ref)
    if not res["timeline_evaluable"]:
        log("burial timeline not evaluable: needs three or more epochs with a (mound, sink) pair in the sink window")
    cal, prob = _calibration_step(a, z, years, res, xform, sites, a.out_dir, log)
    label = LABEL
    if prob is not None:
        label = (
            f"{LABEL} (score columns); p_calibrated_max is a probability calibrated on {cal['n_sites_usable']} "
            f"labelled sites, blocked-CV AUC {cal['oof_auc']}; valid only for ground and surveys like the "
            "training sites"
        )
        _write_tagged(os.path.join(a.out_dir, "p_grave_calibrated.tif"), prob, xform, crs, label)
        for r, m in zip(res["candidates"], res["_masks"]):
            r["p_calibrated_max"] = round(float(np.nanmax(prob[m])), 6)
    prov = {"epochs": ",".join(_yr(y) for y in years), "label": label}
    write_outputs(a.out_dir, res, xform, crs, label, prov)
    inputs = {
        "epochs": [
            {
                "path": os.path.abspath(e["path"]),
                "year": e["year"],
                "sha256": mt._sha256(e["path"]),
                "sigma_m": e["sigma_m"],
                "sigma_raster": os.path.abspath(e["sigma_path"]) if e["sigma_path"] else None,
                "sigma_raster_sha256": mt._sha256(e["sigma_path"]) if e["sigma_path"] else None,
                "vertical_bias_removed_m": b,
            }
            for e, b in zip(epochs, biases)
        ],
        "sites": {"path": os.path.abspath(a.sites), "sha256": mt._sha256(a.sites)} if a.sites else None,
    }
    results = {k: v for k, v in res.items() if not k.startswith("_") and k not in ("candidates", "voids")}
    results.update(
        n_candidates=len(res["candidates"]),
        n_voids=len(res["voids"]),
        top_candidates=res["candidates"][:10],
        top_voids=res["voids"][:10],
        calibration=cal,
    )
    man = {
        "tool": "burial_signature.py",
        "version": VERSION,
        "created_utc": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "status": "complete" if res["timeline_evaluable"] else "timeline_not_evaluable",
        "label": label,
        "inputs": inputs,
        "grid": {
            "crs": crs.to_string(),
            "res_m": a.res_m,
            "rows": shape[0],
            "cols": shape[1],
            "bounds": list(rasterio.transform.array_bounds(shape[0], shape[1], xform)),
        },
        "parameters": _params_record(a),
        "results": results,
        "note": NOTE,
    }
    return write_manifest(a.out_dir, man)


def build_parser():
    d = DEFAULTS
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--epoch",
        nargs="+",
        action="append",
        required=True,
        metavar="ITEM",
        help="TIF YEAR [SIGMA_M | SIGMA.tif]; once per acquisition, at least two",
    )
    ap.add_argument("--sigma-m", type=float, default=d["sigma_m"], help="default vertical sigma per epoch, m")
    ap.add_argument("--res-m", type=float, default=d["res_m"])
    ap.add_argument("--lat", type=float, help="clip to a square window around this point")
    ap.add_argument("--lon", type=float)
    ap.add_argument("--radius-m", type=float, help="half-width of the clip window")
    ap.add_argument("--ref-lat", type=float, help="reference point for distance/bearing (default grid centre)")
    ap.add_argument("--ref-lon", type=float)
    ap.add_argument("--t", type=float, default=d["t"], help="LoD multiplier (1.96 = 95%%)")
    ap.add_argument("--no-mad-floor", dest="mad_floor", action="store_false", help="trust the given sigmas only")
    ap.add_argument("--neighbourhood-m", type=float, default=d["neighbourhood_m"], help="grave-scale radius, m")
    ap.add_argument("--gi-bandwidth-m", type=float, help="Gi* disk radius, m (default: --neighbourhood-m)")
    ap.add_argument("--sink-window-years", type=float, nargs=2, default=d["sink_window_years"], metavar=("MIN", "MAX"))
    ap.add_argument("--slope-edges", type=float, nargs="+", default=d["slope_edges"], help="slope class edges, deg")
    ap.add_argument("--min-stratum-cells", type=int, default=d["min_stratum_cells"])
    ap.add_argument("--alpha", type=float, default=d["alpha"], help="Benjamini-Hochberg FDR level")
    # ap.add_argument("--min-change-prob", type=float, default=d["min_change_prob"])  # SYSTEM_REVIEW H6
    # Lesson: the CLI flag repeated the "probability" wording to every user; the old spelling stays as an alias.
    ap.add_argument(
        "--min-change-significance",
        "--min-change-prob",
        dest="min_change_significance",
        type=float,
        default=d["min_change_significance"],
        help="minimum change significance (1 - p) of both phases; --min-change-prob is a deprecated alias",
    )
    ap.add_argument("--min-area-m2", type=float, default=d["min_area_m2"])
    ap.add_argument("--void-width-m", type=float, default=d["void_width_m"], help="widest structure the top-hat fills")
    ap.add_argument("--void-depth-m", type=float, default=d["void_depth_m"])
    ap.add_argument("--void-min-length-m", type=float, default=d["void_min_length_m"])
    ap.add_argument("--void-min-elongation", type=float, default=d["void_min_elongation"])
    ap.add_argument("--void-min-area-m2", type=float, default=d["void_min_area_m2"])
    ap.add_argument("--sites", help="labelled sites CSV: easting,northing,burial_year (enables calibration)")
    ap.add_argument("--sites-crs", help="CRS of the sites CSV (default: the analysis grid CRS)")
    ap.add_argument("--site-radius-m", type=float, default=d["site_radius_m"])
    ap.add_argument("--exclusion-m", type=float, default=d["exclusion_m"], help="no negatives this close to a site")
    ap.add_argument("--block-m", type=float, default=d["block_m"], help="spatial CV block size, m")
    ap.add_argument("--cv-folds", type=int, default=d["cv_folds"])
    ap.add_argument("--max-negatives", type=int, default=d["max_negatives"])
    ap.add_argument("--hit-radius-m", type=float, default=d["hit_radius_m"])
    ap.add_argument(
        "--tile-cells",
        type=int,
        default=d["tile_cells"],
        help="timeline tile size in cells (bounds memory); 0 processes the grid in one piece",
    )
    ap.add_argument(
        "--halo-cells",
        type=int,
        help="tile overlap in cells (default and minimum: neighbourhood radius + Gi* bandwidth, + 1)",
    )
    ap.add_argument("--out-dir", required=True)
    return ap


def main(argv=None):
    ap = build_parser()
    a = ap.parse_args(argv)
    if a.res_m <= 0 or a.neighbourhood_m <= 0 or (a.gi_bandwidth_m is not None and a.gi_bandwidth_m <= 0):
        ap.error("--res-m, --neighbourhood-m and --gi-bandwidth-m must be > 0")
    # if not 0 < a.alpha < 1 or not 0 <= a.min_change_prob < 1:  # SYSTEM_REVIEW H6: renamed
    if not 0 < a.alpha < 1 or not 0 <= a.min_change_significance < 1:
        ap.error("--alpha must be in (0, 1) and --min-change-significance in [0, 1)")
    if a.tile_cells < 0:
        ap.error("--tile-cells must be >= 0 (0 = no tiling)")
    if a.halo_cells is not None and a.halo_cells < required_halo(a, a.res_m):
        ap.error(f"--halo-cells must be at least {required_halo(a, a.res_m)} (neighbourhood radius + Gi* bandwidth "
                 "in cells, + 1) so tiles agree with the whole grid")
    if a.sink_window_years[0] > a.sink_window_years[1]:
        ap.error("--sink-window-years MIN must not exceed MAX")
    if (a.lat is None) != (a.lon is None) or (a.ref_lat is None) != (a.ref_lon is None):
        ap.error("--lat/--lon and --ref-lat/--ref-lon go in pairs")
    a.slope_edges = tuple(sorted(a.slope_edges))
    a.sink_window_years = tuple(a.sink_window_years)
    mt._setup_gdal()
    try:
        man = run(a, log=lambda m: print(m, file=sys.stderr))
    except InputError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    except RasterioIOError as e:
        print(f"error: cannot read input: {e}", file=sys.stderr)
        return 2
    r = man["results"]
    summary = {
        "status": man["status"],
        "label": man["label"],
        "n_candidates": r["n_candidates"],
        "n_voids": r["n_voids"],
        "top_candidates": r["top_candidates"][:5],
        "calibration": (r["calibration"] or {}).get("status"),
    }
    print(json.dumps(summary, indent=1))
    return 0 if man["status"] == "complete" else 3


if __name__ == "__main__":
    sys.exit(main())
