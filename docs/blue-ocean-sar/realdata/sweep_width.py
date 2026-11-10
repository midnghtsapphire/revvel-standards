#!/usr/bin/env python3
"""Effective sweep width (W) and search speed per segment, with a source on every number.

SYSTEM_REVIEW upgrades R3 (sweep-width tables by resource, terrain and
vegetation) and B3 (GEDI canopy cover as a visibility penalty on sweep width).
The output is a segments CSV that search_theory.read_segments and
optimal_search read directly: the input columns (name, area_km2, poa, ...) plus
sweep_width_km, speed_kmh and provenance columns.

Where W comes from, in order of precedence:

  1. a sweep_width_km already in the segments file (kept, marked "input");
  2. a field calibration table (--calibration), the primary path. Each row is a
     W measured by the team, or a range-of-detection trial (AMDR / ADD / Rd)
     converted with W = factor x range;
  3. the built-in table sweep_width_tables.json, which is mostly null.

Air resources (uav_visual, uav_thermal, helicopter): W is the open-terrain W
scaled by canopy cover (below), unless the calibration table has a W measured
in that segment's own vegetation, which already includes the canopy and is used
as is. Ground resources (searchers, hasty teams, dogs) use the vegetation class
instead; canopy cover is not applied to them.

Why most of the built-in table is null: see the comment block below the imports.

Canopy model (B3), for air resources:

  W_eff = W_open * (1 - cover) ** k,   0 <= cover <= 1,  k > 0

GEDI L2B "cover" is the fraction of ground hidden by the vertical projection of
canopy, so 1 - cover is the nadir gap probability: the chance a vertical line of
sight reaches the ground. Under the usual Beer-Lambert canopy model with a
random (spherical) leaf-angle distribution, the gap probability along a ray at
view zenith theta is Pgap(0) ** (1 / cos theta), so the default is
k = 1 / cos(view zenith), which is k = 1 straight down. ASSUMPTIONS, flagged:
detection needs a clear line of sight to the subject (thermal through thin
canopy and detections of partly hidden people are ignored, so this is
conservative there); foliage clumping, which raises gaps above the random
model, is ignored; and W is taken to scale with the visible fraction. k is a
parameter (--canopy-k or --view-zenith-deg) until field data fit it.

Canopy cover per segment, from (highest precedence first): a canopy_cover column
in the segments file; GEDI shots (a CSV of lat, lon, cover, or L2B HDF5 granules
when h5py is importable) averaged over each segment polygon in a GeoJSON file;
or a canopy-cover GeoTIFF (when rasterio is importable) averaged over each
polygon.

  python sweep_width.py segments.csv --out swept.csv --calibration trial.csv
  python sweep_width.py segments.csv --out swept.csv --resource uav_thermal --target unresponsive_adult \\
      --polygons segments.geojson --gedi-csv gedi_shots.csv --calibration trial.csv
  python sweep_width.py --list-sourced

Segments CSV: name, area_km2, poa and any other search_theory columns, plus
optional resource, target, vegetation, visibility, canopy_cover, speed_kmh
(per-segment values beat the --resource / --target / --vegetation /
--visibility defaults).

Calibration CSV: resource, target, vegetation, visibility (blank = any), then
either w_m, or range_m with an optional factor (no factor: the Koester et al.
2014 factor for the visibility class), optional speed_kmh, and source (required:
who ran the trial, where, when).

Exit codes: 0 every searchable segment has a W; 2 bad input; 3 the CSV was
written but at least one searchable segment has no W (pass --allow-missing to
accept that). Exit 0 means the postcondition holds, not that the script ran.
"""

import argparse
import csv
import json
import math
import os
import sys

# Why most of the built-in table is null
#
# Earlier material in this project carried POD and sweep-width numbers that came
# from AI-generated documents: values with no experiment behind them, or
# attributed to a field manual with no edition, table or page (for example the
# "POD = 1 - exp(-S / w)" row, SMATH-002, in
# docs/case-files/shtuka/sunpeaks_master_sar_database.db_1.txt, credited to a
# "SAR100 Field Manual"). A sweep width decides how many hours a team spends in a
# segment and what POD gets reported to a family or a court. A made-up W gives a
# made-up POD that looks exactly like a measured one, so a search can be closed
# on a number nobody measured. Those values were dropped. Every W here is null
# ("needs field calibration") unless it was traced to a named study, and each
# sourced value says how far it was verified. The fix for a null is a field
# trial, not a guess: run an AMDR / Rd trial in the segment's vegetation and pass
# it with --calibration.

HERE = os.path.dirname(os.path.abspath(__file__))
TABLES_PATH = os.path.join(HERE, "sweep_width_tables.json")
NEEDS = "needs field calibration"
ROW_NAMES = {"row", "rest of world", "rest_of_world"}  # same convention as search_theory
GEDI_FILL = -9999.0

OUT_COLUMNS = ["resource", "target", "vegetation", "visibility", "sweep_width_km", "speed_kmh",
               "sweep_width_m", "sweep_width_method", "sweep_width_source", "sweep_width_status",
               "canopy_cover", "canopy_k", "canopy_source", "canopy_n", "speed_source"]


# --------------------------------------------------------------------------- tables

def validate_tables(doc):
    """Every entry is null or carries a known source; axes and factors are consistent."""
    axes = doc["axes"]
    sources = doc["sources"]
    seen = set()
    for e in doc["entries"]:
        key = (e["resource"], e["target"], e["vegetation"], e["visibility"])
        for axis, val in zip(("resource", "target", "vegetation", "visibility"), key):
            if val not in axes[axis]:
                raise ValueError(f"table entry {key}: unknown {axis} {val!r}")
        if key in seen:
            raise ValueError(f"duplicate table entry {key}")
        seen.add(key)
        if e["w_m"] is None:
            if e.get("source") is not None or e.get("status") != NEEDS:
                raise ValueError(f"table entry {key}: a null W must be marked {NEEDS!r} with no source")
        else:
            if not isinstance(e["w_m"], (int, float)) or e["w_m"] <= 0:
                raise ValueError(f"table entry {key}: W must be positive")
            if e.get("source") not in sources:
                raise ValueError(f"table entry {key}: W {e['w_m']} has no known source")
            if not e.get("verification"):
                raise ValueError(f"table entry {key}: sourced W needs a verification level")
    for vis, f in doc["range_to_sweep_width"]["factors"].items():
        if vis not in axes["visibility"] or f["source"] not in sources or f["factor"] <= 0:
            raise ValueError(f"bad range factor for {vis!r}")
    for r, s in doc["speeds_kmh"].items():
        if r not in axes["resource"]:
            raise ValueError(f"speed for unknown resource {r!r}")
        if s["speed_kmh"] is not None and s.get("source") not in sources:
            raise ValueError(f"speed for {r} has no known source")
    return doc


def load_tables(path=TABLES_PATH):
    with open(path, encoding="utf-8") as f:
        return validate_tables(json.load(f))


def is_air(doc, resource):
    return doc["axes"]["resource"][resource]["kind"] == "air"


def table_width(doc, resource, target, vegetation, visibility):
    """Built-in W in metres, or None. Returns (w_m, source_id, status)."""
    for e in doc["entries"]:
        if (e["resource"], e["target"], e["vegetation"], e["visibility"]) == (resource, target, vegetation,
                                                                              visibility):
            return e["w_m"], e["source"], e["status"]
    return None, None, NEEDS


def range_factor(doc, visibility):
    f = doc["range_to_sweep_width"]["factors"].get(visibility)
    if f is None:
        raise ValueError(f"no range-to-W factor for visibility {visibility!r}; give a factor explicitly")
    return f["factor"], f["source"]


def sweep_width_from_range(range_m, visibility=None, factor=None, doc=None):
    """W = factor x range (AMDR / ADD / Rd trial). Returns (w_m, how)."""
    if not range_m > 0:
        raise ValueError("range of detection must be positive")
    if factor is not None:
        if not factor > 0:
            raise ValueError("factor must be positive")
        return factor * range_m, f"{factor:g} x range (factor given)"
    if visibility is None:
        raise ValueError("range trial needs a visibility class or an explicit factor")
    f, src = range_factor(doc or load_tables(), visibility)
    return f * range_m, f"{f:g} x range ({src}, {visibility} visibility)"


def source_label(doc, source_id):
    s = doc["sources"][source_id]
    return f"{source_id}: {s['citation']} [{s['verification'].split(':')[0]}]"


# --------------------------------------------------------------------------- calibration

def _f(row, key):
    v = (row.get(key) or "").strip()
    return float(v) if v else None


def read_calibration(path, doc):
    """Field calibration rows -> list of dicts with w_m, method, source, speed_kmh."""
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise ValueError(f"{path}: no calibration rows")
    out, keys = [], set()
    axes = doc["axes"]
    for i, r in enumerate(rows, 2):
        res, tgt, veg = (r.get(k, "").strip() for k in ("resource", "target", "vegetation"))
        vis = (r.get("visibility") or "").strip() or None
        for axis, val in (("resource", res), ("target", tgt), ("vegetation", veg)):
            if val not in axes[axis]:
                raise ValueError(f"{path} line {i}: unknown {axis} {val!r}")
        if vis is not None and vis not in axes["visibility"]:
            raise ValueError(f"{path} line {i}: unknown visibility {vis!r}")
        src = (r.get("source") or "").strip()
        if not src:
            raise ValueError(f"{path} line {i}: every calibration row needs a source (who, where, when)")
        w, rng, fac = _f(r, "w_m"), _f(r, "range_m"), _f(r, "factor")
        if w is not None:
            if w <= 0:
                raise ValueError(f"{path} line {i}: w_m must be positive")
            method = "calibration: measured W"
        elif rng is not None:
            w, how = sweep_width_from_range(rng, vis, fac, doc)
            method = f"calibration: {how}"
        else:
            raise ValueError(f"{path} line {i}: give w_m, or range_m (with factor or visibility)")
        speed = _f(r, "speed_kmh")
        if speed is not None and speed <= 0:
            raise ValueError(f"{path} line {i}: speed_kmh must be positive")
        key = (res, tgt, veg, vis)
        if key in keys:
            raise ValueError(f"{path} line {i}: duplicate calibration row {key}")
        keys.add(key)
        out.append({"resource": res, "target": tgt, "vegetation": veg, "visibility": vis, "w_m": w,
                    "method": method, "source": f"calibration ({os.path.basename(path)} line {i}): {src}",
                    "speed_kmh": speed})
    return out


def match_calibration(cal, resource, target, vegetation, visibility):
    """Exact visibility beats a blank (any) visibility."""
    best = None
    for c in cal or []:
        if (c["resource"], c["target"], c["vegetation"]) != (resource, target, vegetation):
            continue
        if c["visibility"] == visibility and visibility is not None:
            return c
        if c["visibility"] is None:
            best = c
    return best


# --------------------------------------------------------------------------- canopy model

def k_from_view_zenith(deg):
    """Beer-Lambert path-length exponent 1 / cos(theta) for a view zenith angle in degrees."""
    if not 0 <= deg < 90:
        raise ValueError("view zenith must be in [0, 90) degrees")
    return 1.0 / math.cos(math.radians(deg))


def canopy_factor(cover, k=1.0):
    """Visible fraction (1 - cover) ** k, in [0, 1]; non-increasing in cover and in k."""
    if cover is None or math.isnan(cover) or not 0.0 <= cover <= 1.0:
        raise ValueError(f"canopy cover {cover} outside [0, 1]")
    if not k > 0 or math.isinf(k):
        raise ValueError("canopy exponent k must be positive and finite")
    return (1.0 - cover) ** k


def canopy_scaled_width(w_open, cover, k=1.0):
    if w_open is None or w_open < 0:
        raise ValueError("open-terrain sweep width must be non-negative")
    return w_open * canopy_factor(cover, k)


# --------------------------------------------------------------------------- geometry

def _in_ring(x, y, ring):
    """Ray casting; ring is a list of [lon, lat] (closed or not)."""
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def point_in_geometry(lon, lat, geom):
    """GeoJSON Polygon / MultiPolygon, holes respected."""
    t = geom.get("type")
    if t == "Polygon":
        polys = [geom["coordinates"]]
    elif t == "MultiPolygon":
        polys = geom["coordinates"]
    else:
        raise ValueError(f"segment geometry must be Polygon or MultiPolygon, not {t!r}")
    for rings in polys:
        if rings and _in_ring(lon, lat, rings[0]) and not any(_in_ring(lon, lat, h) for h in rings[1:]):
            return True
    return False


def _bbox(geom):
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    xs = [p[0] for rings in polys for p in rings[0]]
    ys = [p[1] for rings in polys for p in rings[0]]
    return min(xs), min(ys), max(xs), max(ys)


def read_polygons(path, name_field="name"):
    with open(path, encoding="utf-8") as f:
        gj = json.load(f)
    feats = gj.get("features") if gj.get("type") == "FeatureCollection" else None
    if not feats:
        raise ValueError(f"{path}: expected a GeoJSON FeatureCollection with features")
    out = {}
    for feat in feats:
        name = str((feat.get("properties") or {}).get(name_field, "")).strip()
        if not name:
            raise ValueError(f"{path}: every feature needs a {name_field!r} property")
        if name in out:
            raise ValueError(f"{path}: duplicate segment {name!r}")
        geom = feat.get("geometry") or {}
        if geom.get("type") not in ("Polygon", "MultiPolygon"):
            raise ValueError(f"{path}: segment {name!r} is not a Polygon or MultiPolygon")
        out[name] = geom
    return out


# --------------------------------------------------------------------------- GEDI / raster inputs

def _pick(fieldnames, options, what):
    for o in options:
        if o in fieldnames:
            return o
    raise ValueError(f"GEDI CSV needs a {what} column (one of {', '.join(options)})")


def read_gedi_csv(path):
    """CSV of GEDI shots -> [(lat, lon, cover)]. Keeps quality_flag == 1 rows when a flag column exists;
    drops the GEDI fill value -9999."""
    with open(path, newline="", encoding="utf-8") as f:
        rd = csv.DictReader(f)
        fields = rd.fieldnames or []
        lat_c = _pick(fields, ("lat", "latitude", "lat_lowestmode"), "latitude")
        lon_c = _pick(fields, ("lon", "longitude", "lon_lowestmode"), "longitude")
        cov_c = _pick(fields, ("cover", "canopy_cover"), "cover")
        q_c = next((c for c in ("l2b_quality_flag", "quality_flag") if c in fields), None)
        shots = []
        for i, r in enumerate(rd, 2):
            if q_c and (r.get(q_c) or "").strip() not in ("1", "1.0", "true", "True"):
                continue
            try:
                cov, lat, lon = float(r[cov_c]), float(r[lat_c]), float(r[lon_c])
            except (TypeError, ValueError):
                raise ValueError(f"{path} line {i}: lat, lon and cover must be numbers") from None
            if cov == GEDI_FILL:
                continue
            if not 0.0 <= cov <= 1.0:
                raise ValueError(f"{path} line {i}: cover {cov} outside [0, 1] (GEDI cover is a fraction)")
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                raise ValueError(f"{path} line {i}: bad coordinates {lat}, {lon}")
            shots.append((lat, lon, cov))
    return shots


def shots_from_h5(handle):
    """Shots from an open GEDI L2B granule (h5py.File or any mapping with the same layout)."""
    shots = []
    for beam in sorted(k for k in handle.keys() if str(k).startswith("BEAM")):
        g = handle[beam]
        geo = g["geolocation"] if "geolocation" in g else g
        lat, lon = geo["lat_lowestmode"][()], geo["lon_lowestmode"][()]
        cov = g["cover"][()]
        q = g["l2b_quality_flag"][()] if "l2b_quality_flag" in g else [1] * len(cov)
        for la, lo, c, f in zip(lat, lon, cov, q):
            c = float(c)
            if int(f) != 1 or c == GEDI_FILL or not 0.0 <= c <= 1.0:
                continue
            shots.append((float(la), float(lo), c))
    return shots


def read_gedi_h5(paths):
    try:
        import h5py
    except ImportError:
        raise ValueError("reading GEDI HDF5 needs h5py, which is not installed; export the shots to CSV "
                         "(lat, lon, cover, l2b_quality_flag) and use --gedi-csv") from None
    shots = []
    for p in paths:
        with h5py.File(p, "r") as h:
            shots.extend(shots_from_h5(h))
    return shots


def aggregate_shots(shots, polygons):
    """Mean cover of the shots inside each polygon -> {name: (mean or None, n)}."""
    out = {}
    for name, geom in polygons.items():
        x0, y0, x1, y1 = _bbox(geom)
        vals = [c for lat, lon, c in shots
                if x0 <= lon <= x1 and y0 <= lat <= y1 and point_in_geometry(lon, lat, geom)]
        out[name] = (math.fsum(vals) / len(vals) if vals else None, len(vals))
    return out


def raster_cover(path, polygons, percent=False):
    """Mean canopy cover of pixels whose centres fall in each polygon (needs rasterio)."""
    try:
        import numpy as np
        import rasterio
        from rasterio.features import geometry_mask
        from rasterio.warp import transform_geom
    except ImportError:
        raise ValueError("reading a GeoTIFF needs rasterio and numpy; give per-segment canopy_cover or "
                         "GEDI shots instead") from None
    out = {}
    with rasterio.open(path) as ds:
        band = ds.read(1, masked=True).astype("float64")
        for name, geom in polygons.items():
            g = transform_geom("EPSG:4326", ds.crs, geom) if ds.crs else geom
            outside = geometry_mask([g], out_shape=band.shape, transform=ds.transform, invert=False)
            vals = band[~outside]
            vals = vals.compressed() if np.ma.isMaskedArray(vals) else vals
            vals = vals[~np.isnan(vals)]
            if percent:
                vals = vals / 100.0
            if vals.size and (vals.min() < 0 or vals.max() > 1):
                raise ValueError(f"{path}: cover values outside [0, 1] in {name!r}"
                                 + ("" if percent else " (use --raster-percent for 0-100 rasters)"))
            out[name] = (float(vals.mean()) if vals.size else None, int(vals.size))
    return out


# --------------------------------------------------------------------------- per segment

def _is_row(name):
    return name.strip().lower() in ROW_NAMES


def _check_axis(doc, axis, val, where):
    if val is not None and val not in doc["axes"][axis]:
        raise ValueError(f"{where}: unknown {axis} {val!r} (known: {', '.join(doc['axes'][axis])})")


def resolve_segment(row, doc, cal=None, defaults=None, canopy=None, k=1.0, speed_default=None):
    """Return the output columns for one segment row (dict of strings in -> dict of values out)."""
    defaults = defaults or {}
    name = (row.get("name") or "").strip()
    out = {c: "" for c in OUT_COLUMNS}

    def val(key):
        v = (row.get(key) or "").strip()
        return v or defaults.get(key)

    res, tgt, veg, vis = val("resource"), val("target"), val("vegetation"), val("visibility")
    for axis, v in (("resource", res), ("target", tgt), ("vegetation", veg), ("visibility", vis)):
        _check_axis(doc, axis, v, f"segment {name!r}")
    out.update(resource=res or "", target=tgt or "", vegetation=veg or "", visibility=vis or "")
    if _is_row(name):
        out["sweep_width_status"] = "ROW segment: never searched"
        return out

    w_m, method, source, status = None, "", "", ""
    cal_hit = None
    given = (row.get("sweep_width_km") or "").strip()
    if given:
        w_m = float(given) * 1000.0
        if w_m < 0:
            raise ValueError(f"segment {name!r}: sweep width cannot be negative")
        method, source, status = "input", "segments file (user-supplied)", "given"
    elif not res or not tgt:
        status = "needs resource and target"
    else:
        cal_hit = match_calibration(cal, res, tgt, veg, vis) if veg else None
        if cal_hit:
            w_m, method, source, status = cal_hit["w_m"], cal_hit["method"], cal_hit["source"], "calibrated"
        elif is_air(doc, res):
            # an aircraft's speed does not depend on canopy, so the open-terrain calibration row's speed applies
            cal_hit = match_calibration(cal, res, tgt, "open", vis)
            w_m, method, source, status = _air_width(doc, cal_hit, res, tgt, vis, veg, canopy, k, out)
        elif not veg:
            status = "needs vegetation class"
        elif not vis:
            status = "needs visibility class for table lookup"
        else:
            w, sid, st_ = table_width(doc, res, tgt, veg, vis)
            if w is None:
                status = st_
            else:
                w_m, method, source, status = w, "table", source_label(doc, sid), "sourced"

    if canopy and canopy.get("cover") is not None and out["canopy_cover"] == "":
        note = canopy["source"] if res and is_air(doc, res) else \
            f"{canopy['source']} (recorded only; not applied: ground resources use the vegetation class)"
        out.update(canopy_cover=canopy["cover"], canopy_source=note, canopy_n=canopy.get("n", ""))
    out.update(sweep_width_m=w_m if w_m is not None else "",
               sweep_width_km=w_m / 1000.0 if w_m is not None else "",
               sweep_width_method=method, sweep_width_source=source, sweep_width_status=status)
    _speed(row, doc, res, cal_hit, speed_default, out)
    return out


def _air_width(doc, base, res, tgt, vis, veg, canopy, k, out):
    """Open-terrain W (calibration row `base`, else the table) scaled by canopy cover."""
    if base:
        w_open, src = base["w_m"], base["source"]
    elif vis:
        w_open, sid, _ = table_width(doc, res, tgt, "open", vis)
        src = source_label(doc, sid) if w_open is not None else ""
    else:
        w_open, src = None, ""
    if w_open is None:
        return None, "", "", f"{NEEDS} (open-terrain W for {res})"
    cover = canopy.get("cover") if canopy else None
    csrc = canopy.get("source") if canopy else ""
    if cover is None and veg == "open":
        cover, csrc = 0.0, "vegetation class 'open'"
    if cover is None:
        return None, "", "", "needs canopy cover for air resource"
    w = canopy_scaled_width(w_open, cover, k)
    out.update(canopy_cover=cover, canopy_k=k, canopy_source=csrc, canopy_n=(canopy or {}).get("n", ""))
    return w, f"canopy-scaled: W_open * (1 - cover)^k, k={k:g}", src, "canopy-scaled"


def _speed(row, doc, res, cal_hit, speed_default, out):
    given = (row.get("speed_kmh") or "").strip()
    if given:
        if float(given) <= 0:
            raise ValueError(f"segment {row.get('name')!r}: speed_kmh must be positive")
        out.update(speed_kmh=float(given), speed_source="segments file (user-supplied)")
    elif cal_hit and cal_hit.get("speed_kmh") is not None:
        out.update(speed_kmh=cal_hit["speed_kmh"], speed_source=cal_hit["source"])
    elif speed_default is not None:
        out.update(speed_kmh=speed_default, speed_source="command line --speed-kmh")
    elif res and doc["speeds_kmh"][res]["speed_kmh"] is not None:
        s = doc["speeds_kmh"][res]
        out.update(speed_kmh=s["speed_kmh"], speed_source=source_label(doc, s["source"]))
    else:
        out["speed_source"] = NEEDS


def canopy_by_segment(rows, polygons=None, shots=None, raster=None, raster_percent=False, shot_label="GEDI"):
    """{name: {cover, source, n}} from per-segment values, GEDI shots or a raster (that precedence)."""
    agg, label = {}, ""
    if shots is not None and raster is not None:
        raise ValueError("give GEDI shots or a canopy raster, not both")
    if (shots is not None or raster is not None) and polygons is None:
        raise ValueError("GEDI shots and canopy rasters need segment polygons (--polygons)")
    if shots is not None:
        agg, label = aggregate_shots(shots, polygons), f"{shot_label}: mean of shots in polygon"
    elif raster is not None:
        agg = raster_cover(raster, polygons, raster_percent)
        label = f"raster {os.path.basename(raster)}: mean of pixels in polygon"
    out = {}
    for r in rows:
        name = (r.get("name") or "").strip()
        v = (r.get("canopy_cover") or "").strip()
        if v:
            c = float(v)
            if not 0.0 <= c <= 1.0:
                raise ValueError(f"segment {name!r}: canopy_cover {c} outside [0, 1]")
            out[name] = {"cover": c, "source": "segments file (user-supplied)", "n": ""}
        elif name in agg:
            mean, n = agg[name]
            out[name] = {"cover": mean, "source": label if mean is not None else f"{label} (no data)", "n": n}
    return out


def process(rows, doc, cal=None, defaults=None, canopy=None, k=1.0, speed_default=None):
    out_rows, missing = [], []
    for r in rows:
        name = (r.get("name") or "").strip()
        if not name:
            raise ValueError("every segment needs a name")
        res = resolve_segment(r, doc, cal, defaults, (canopy or {}).get(name), k, speed_default)
        merged = dict(r)
        merged.update(res)
        out_rows.append(merged)
        if not _is_row(name) and res["sweep_width_km"] == "":
            missing.append((name, res["sweep_width_status"]))
    return out_rows, missing


def write_csv(path, rows, in_fields):
    fields = list(in_fields) + [c for c in OUT_COLUMNS if c not in in_fields]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: ("" if r.get(k) is None else r.get(k)) for k in fields})


def sourced_summary(doc):
    return {
        "sourced_entries": [e for e in doc["entries"] if e["w_m"] is not None],
        "null_entries": sum(1 for e in doc["entries"] if e["w_m"] is None),
        "range_to_sweep_width": doc["range_to_sweep_width"],
        "sources": doc["sources"],
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("segments", nargs="?")
    ap.add_argument("--out")
    ap.add_argument("--tables", default=TABLES_PATH)
    ap.add_argument("--calibration", help="field calibration CSV (AMDR / ADD / Rd trial or measured W)")
    for axis in ("resource", "target", "vegetation", "visibility"):
        ap.add_argument(f"--{axis}", help=f"default {axis} for segments without one")
    ap.add_argument("--polygons", help="segment polygons, GeoJSON FeatureCollection")
    ap.add_argument("--name-field", default="name", help="polygon property holding the segment name")
    ap.add_argument("--gedi-csv", help="GEDI shots CSV: lat, lon, cover [, l2b_quality_flag]")
    ap.add_argument("--gedi-h5", nargs="+", help="GEDI L2B HDF5 granules (needs h5py)")
    ap.add_argument("--canopy-raster", help="canopy-cover GeoTIFF (needs rasterio)")
    ap.add_argument("--raster-percent", action="store_true", help="raster cover is 0-100, not 0-1")
    kg = ap.add_mutually_exclusive_group()
    kg.add_argument("--canopy-k", type=float, help="exponent k in (1 - cover)^k (default 1, nadir)")
    kg.add_argument("--view-zenith-deg", type=float, help="set k = 1 / cos(view zenith)")
    ap.add_argument("--speed-kmh", type=float, help="search speed for segments with none (state its source)")
    ap.add_argument("--allow-missing", action="store_true", help="exit 0 even if some W are null")
    ap.add_argument("--list-sourced", action="store_true", help="print the sourced table values and exit")
    a = ap.parse_args(argv)
    try:
        doc = load_tables(a.tables)
        if a.list_sourced:
            print(json.dumps(sourced_summary(doc), indent=2))
            return 0
        if not a.segments or not a.out:
            raise ValueError("segments CSV and --out are required")
        if a.speed_kmh is not None and not a.speed_kmh > 0:
            raise ValueError("--speed-kmh must be positive")
        k = k_from_view_zenith(a.view_zenith_deg) if a.view_zenith_deg is not None else (
            1.0 if a.canopy_k is None else a.canopy_k)
        canopy_factor(0.5, k)  # validates k
        defaults = {ax: getattr(a, ax) for ax in ("resource", "target", "vegetation", "visibility")}
        for ax, v in defaults.items():
            _check_axis(doc, ax, v, "command line")
        with open(a.segments, newline="", encoding="utf-8") as f:
            rd = csv.DictReader(f)
            rows, fields = list(rd), rd.fieldnames or []
        if not rows or "name" not in fields:
            raise ValueError(f"{a.segments}: needs a header with name and at least one segment")
        cal = read_calibration(a.calibration, doc) if a.calibration else None
        polygons = read_polygons(a.polygons, a.name_field) if a.polygons else None
        shots, label = None, "GEDI"
        if a.gedi_csv and a.gedi_h5:
            raise ValueError("give --gedi-csv or --gedi-h5, not both")
        if a.gedi_csv:
            shots, label = read_gedi_csv(a.gedi_csv), f"GEDI CSV {os.path.basename(a.gedi_csv)}"
        elif a.gedi_h5:
            shots, label = read_gedi_h5(a.gedi_h5), "GEDI L2B HDF5"
        canopy = canopy_by_segment(rows, polygons, shots, a.canopy_raster, a.raster_percent, label)
        out_rows, missing = process(rows, doc, cal, defaults, canopy, k, a.speed_kmh)
        write_csv(a.out, out_rows, fields)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    for name, why in missing:
        print(f"no sweep width for {name}: {why}", file=sys.stderr)
    if missing and not a.allow_missing:
        print(f"wrote {a.out}, but {len(missing)} segment(s) have no sweep width (exit 3)", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
