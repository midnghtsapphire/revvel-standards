#!/usr/bin/env python3
"""Read-only file round trip with CalTopo / SARTopo: export planning numbers, import searched tracks.

No CalTopo API is called and nothing is written to a CalTopo account. You
import the exported file through CalTopo's own Import dialog, and you export
your map from CalTopo as GeoJSON for the import side.

export
    Segment polygons (GeoJSON) + the planning numbers from this folder's tools
    -> a GeoJSON FeatureCollection CalTopo can import, one feature per segment:
      * search_theory.py / lost_person_sim.py segments.csv (name, area_km2,
        poa, optional sweep_width_km, speed_kmh, ttl_km, pod);
      * optionally search_theory.py --out result.json (final_poa,
        cumulative_pod: POA after the recorded passes and POD achieved);
      * optionally optimal_search.py --out result.json (optimal.segments:
        planned effort and planned POD per segment).
    Each feature carries title, description (POA, POD, PSR, effort and the
    assignment number in plain text, so the numbers survive even if CalTopo
    drops unknown properties) and CalTopo / simplestyle styling: stroke,
    stroke-opacity, stroke-width, fill, fill-opacity, pattern. ``class`` is
    'Assignment' (SAR mode; letter = segment name, number = assignment number,
    resourceType, status, priority, responsivePOD, timeAllocated) or 'Shape'
    (recreation mode). Assignment numbers follow PSR rank (search_theory
    tasking order), starting at --start-number.

import
    A CalTopo GeoJSON export -> per-segment coverage -> a passes CSV that
    ``search_theory.py segments.csv --passes passes.csv`` reads.
      * tracks: LineString / MultiLineString features whose class is not
        'Assignment' (recorded tracks, AppTrack / LiveTrack, imported GPX
        lines); line assignments are plans, not tracks, and are skipped;
      * segments: Polygon / MultiPolygon features of class 'Assignment' (or
        every polygon if the file has none, or a separate --segments-geojson);
      * markers: Point features are listed with the segment they fall in.
    For each track and segment: track_km = length of the track inside the
    polygon, measured in a local metric projection (UTM through pyproj when it
    is installed, otherwise an equirectangular projection about the segment
    centroid, x = R cos(lat0) dlon, y = R dlat, which is accurate to well under
    1% for segments a few km across). Then
        C = track_km * W / area_km2,   POD = 1 - exp(-C)
    W is --sweep-width-km, or a track's own ``sweep_width_km`` property.
    One passes.csv row per (track, segment) with name, ttl_km,
    sweep_width_km: search_theory.py recomputes the same POD from those and
    its own segment area. Extra columns (track, area_km2_geojson, coverage,
    pod_model) are informational; search_theory ignores them. ``pod`` is not
    written unless --write-pod, because a ``pod`` column overrides the model
    in search_theory.py.

Segment names: the export puts ``segment=NAME`` on the first line of every
description and in a ``segment`` property; the import reads ``segment``, then
that description line, then ``letter``, then ``title``. Rename a segment in
CalTopo and the description line still ties it back.

CalTopo property names were checked against the open-source caltopo_python
client (github.com/ncssar/caltopo_python: Shape / Assignment / Marker /
AppTrack / LiveTrack classes; stroke, fill, stroke-opacity, fill-opacity,
stroke-width, pattern; letter, number, resourceType, status, priority,
responsivePOD) and CalTopo's training pages (GeoJSON keeps styles and
folders). CalTopo publishes no formal import schema; check the first import
on a scratch map.

  python caltopo_io.py export --polygons segs.geojson --segments segments.csv \\
      [--result search_theory.json] [--optimal optimal.json] [--class Assignment|Shape] \\
      [--start-number 101] --out caltopo_import.geojson
  python caltopo_io.py import caltopo_export.json --sweep-width-km 0.03 --passes-out passes.csv \\
      [--segments-geojson segs.geojson] [--segments-csv segments.csv] [--summary-out coverage.json]

Exit codes: 0 done; 2 bad input; 3 import found no track inside any segment
(nothing written).

Planning numbers from the exponential (random search) detection model. A
measured track inside a polygon is not proof the polygon was searched well.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import search_theory as st  # noqa: E402

try:  # optional: exact UTM projection; the equirectangular fallback is used without it
    from pyproj import Transformer

    HAVE_PYPROJ = True
except ImportError:
    Transformer = None
    HAVE_PYPROJ = False

EARTH_MEAN_RADIUS_KM = 6371.0088
LINE_TYPES = ("LineString", "MultiLineString")
POLY_TYPES = ("Polygon", "MultiPolygon")
NOTE = ("Planning numbers (exponential detection model). Initial POA is an input judgement; "
        "POD from a track assumes random search at sweep width W.")
POD_BUCKETS = ((0.4, "LOW"), (0.7, "MEDIUM"), (1.01, "HIGH"))  # our cut-offs for CalTopo's LOW/MEDIUM/HIGH


class InputError(ValueError):
    """Bad or inconsistent input file."""


# ---------------------------------------------------------------------------
# GeoJSON reading
# ---------------------------------------------------------------------------


def _features(obj, path):
    """Features from a FeatureCollection, a Feature, or CalTopo's API wrappers (state / result.state)."""
    if not isinstance(obj, dict):
        raise InputError(f"{path}: not a GeoJSON object")
    for wrap in (("result", "state"), ("state",)):
        o = obj
        for k in wrap:
            o = o.get(k) if isinstance(o, dict) else None
        if isinstance(o, dict) and isinstance(o.get("features"), list):
            return o["features"]
    if obj.get("type") == "FeatureCollection" and isinstance(obj.get("features"), list):
        return obj["features"]
    if obj.get("type") == "Feature":
        return [obj]
    raise InputError(f"{path}: no features found")


def load_features(path):
    try:
        with open(path, encoding="utf-8") as fh:
            obj = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        raise InputError(f"{path}: cannot read GeoJSON: {exc}") from exc
    out = []
    for f in _features(obj, path):
        if isinstance(f, dict) and isinstance(f.get("geometry"), dict):
            out.append(f)
    return out


def _props(f):
    p = f.get("properties")
    return p if isinstance(p, dict) else {}


def _class(f):
    return str(_props(f).get("class") or "").strip()


SEG_LINE = re.compile(r"^\s*segment\s*=\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE)


def segment_name(props, fallback):
    """segment property, then 'segment=NAME' in the description, then letter, then title, then name/id."""
    if str(props.get("segment") or "").strip():
        return str(props["segment"]).strip()
    m = SEG_LINE.search(str(props.get("description") or ""))
    if m:
        return m.group(1)
    for k in ("letter", "title", "name", "id"):
        if str(props.get(k) or "").strip():
            return str(props[k]).strip()
    return fallback


def polygons_of(geom):
    """List of polygons (each a list of rings of [lon, lat]) from a Polygon or MultiPolygon."""
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon":
        return list(geom["coordinates"])
    raise InputError(f"geometry {geom['type']} is not a polygon")


def lines_of(geom):
    if geom["type"] == "LineString":
        return [geom["coordinates"]]
    if geom["type"] == "MultiLineString":
        return list(geom["coordinates"])
    raise InputError(f"geometry {geom['type']} is not a line")


def read_segment_polygons(features, path, only_class=None):
    """[(name, geometry, properties)] for polygon features; unique names; ROW refused."""
    out, seen = [], set()
    for i, f in enumerate(features, 1):
        g = f["geometry"]
        if g.get("type") not in POLY_TYPES:
            continue
        if only_class and _class(f).lower() != only_class.lower():
            continue
        p = _props(f)
        name = segment_name(p, f"segment_{i}")
        if st._is_row(name):
            raise InputError(f"{path}: {name!r} is reserved for the rest-of-world segment")
        if name in seen:
            raise InputError(f"{path}: duplicate segment name {name!r}")
        seen.add(name)
        polygons_of(g)
        out.append((name, g, p))
    return out


# ---------------------------------------------------------------------------
# local projection and planar geometry
# ---------------------------------------------------------------------------


class LocalProjection:
    """Lon/lat -> local metric km. UTM (pyproj) when available, else equirectangular about (lat0, lon0)."""

    def __init__(self, lat0, lon0, use_pyproj=None):
        self.lat0, self.lon0 = lat0, lon0
        use = HAVE_PYPROJ if use_pyproj is None else (use_pyproj and HAVE_PYPROJ)
        if use:
            zone = int((lon0 + 180) // 6) % 60 + 1
            epsg = (32600 if lat0 >= 0 else 32700) + zone
            self._tr = Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True)
            self.method = f"UTM EPSG:{epsg} (pyproj)"
        else:
            self._tr = None
            self._kx = EARTH_MEAN_RADIUS_KM * math.cos(math.radians(lat0)) * math.pi / 180.0
            self._ky = EARTH_MEAN_RADIUS_KM * math.pi / 180.0
            self.method = f"equirectangular about lat {lat0:.5f}, lon {lon0:.5f} (R = {EARTH_MEAN_RADIUS_KM} km)"

    def __call__(self, pt):
        lon, lat = float(pt[0]), float(pt[1])
        if self._tr is not None:
            x, y = self._tr.transform(lon, lat)
            return x / 1000.0, y / 1000.0
        return (lon - self.lon0) * self._kx, (lat - self.lat0) * self._ky


def _centroid_lonlat(geom):
    pts = []
    for poly in polygons_of(geom):
        ring = poly[0]
        pts.extend(ring[:-1] if len(ring) > 1 and list(ring[0][:2]) == list(ring[-1][:2]) else ring)
    return sum(p[1] for p in pts) / len(pts), sum(p[0] for p in pts) / len(pts)


def _ring_area(ring):
    s = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def _project_polygons(geom, proj):
    return [[[proj(p) for p in ring] for ring in poly] for poly in polygons_of(geom)]


def area_km2(rings_by_poly):
    """Outer rings minus holes, km^2 (planar, projected)."""
    return sum(_ring_area(poly[0]) - sum(_ring_area(h) for h in poly[1:]) for poly in rings_by_poly)


def _inside(x, y, rings):
    """Even-odd point-in-polygon over every ring (outer rings and holes)."""
    c = False
    for ring in rings:
        n = len(ring)
        for i in range(n):
            x1, y1 = ring[i]
            x2, y2 = ring[(i + 1) % n]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                c = not c
    return c


def _seg_params(p, q, a, b):
    """Parameter t on p->q where it crosses edge a->b (0 < t < 1), or None."""
    rx, ry = q[0] - p[0], q[1] - p[1]
    sx, sy = b[0] - a[0], b[1] - a[1]
    den = rx * sy - ry * sx
    if den == 0:
        return None
    t = ((a[0] - p[0]) * sy - (a[1] - p[1]) * sx) / den
    u = ((a[0] - p[0]) * ry - (a[1] - p[1]) * rx) / den
    if 0 < t < 1 and 0 <= u <= 1:
        return t
    return None


def length_inside(line_xy, rings):
    """Length (km) of a projected polyline inside the even-odd region of ``rings``.

    Each track segment is cut at every polygon-edge crossing; each piece is
    inside or outside as a whole, decided by its midpoint.
    """
    edges = []
    for ring in rings:
        n = len(ring)
        edges.extend((ring[i], ring[(i + 1) % n]) for i in range(n))
    total = 0.0
    for p, q in zip(line_xy, line_xy[1:]):
        ts = sorted({0.0, 1.0, *(t for a, b in edges if (t := _seg_params(p, q, a, b)) is not None)})
        seg_len = math.hypot(q[0] - p[0], q[1] - p[1])
        for t0, t1 in zip(ts, ts[1:]):
            tm = (t0 + t1) / 2.0
            if _inside(p[0] + tm * (q[0] - p[0]), p[1] + tm * (q[1] - p[1]), rings):
                total += (t1 - t0) * seg_len
    return total


def haversine_km(a, b):
    lon1, lat1, lon2, lat2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * EARTH_MEAN_RADIUS_KM * math.asin(min(1.0, math.sqrt(h)))


# ---------------------------------------------------------------------------
# import: CalTopo export -> coverage -> passes.csv
# ---------------------------------------------------------------------------


def _positive(v, what):
    try:
        x = float(v)
    except (TypeError, ValueError) as exc:
        raise InputError(f"{what} must be a number, got {v!r}") from exc
    if not math.isfinite(x) or x <= 0:
        raise InputError(f"{what} must be > 0, got {v!r}")
    return x


def classify(features):
    """Split a CalTopo export into (tracks, assignment polygons, other polygons, markers)."""
    tracks, assign, polys, markers = [], [], [], []
    for f in features:
        t, c = f["geometry"].get("type"), _class(f).lower()
        if t in LINE_TYPES and c != "assignment":
            tracks.append(f)
        elif t in POLY_TYPES:
            (assign if c == "assignment" else polys).append(f)
        elif t == "Point":
            markers.append(f)
    return tracks, assign, polys, markers


def coverage(export_features, sweep_width_km, segment_features=None, use_pyproj=None, path="export"):
    """Per-(track, segment) and per-segment coverage. Returns dict with passes, segments, markers, method."""
    w_default = _positive(sweep_width_km, "sweep width")
    tracks, assign, polys, markers = classify(export_features)
    if segment_features is not None:
        segs = read_segment_polygons(segment_features, "segments")
    else:
        segs = read_segment_polygons(assign, path) if assign else read_segment_polygons(polys, path)
    if not segs:
        raise InputError(f"{path}: no segment polygons (Assignment polygons, any polygon, or --segments-geojson)")
    if not tracks:
        raise InputError(f"{path}: no track lines (LineString features that are not line assignments)")
    tnames = [str(_props(f).get("title") or _props(f).get("name") or f"track_{i}") for i, f in enumerate(tracks, 1)]
    if len(set(tnames)) != len(tnames):
        tnames = [f"{n} [{i}]" for i, n in enumerate(tnames, 1)]
    seg_rows, passes, methods = [], [], set()
    for name, g, _ in segs:
        lat0, lon0 = _centroid_lonlat(g)
        proj = LocalProjection(lat0, lon0, use_pyproj)
        methods.add(proj.method.split(" about")[0])
        polys_xy = _project_polygons(g, proj)
        rings = [r for poly in polys_xy for r in poly]
        a = area_km2(polys_xy)
        if a <= 0:
            raise InputError(f"segment {name!r} has zero area")
        swept, km_in = 0.0, 0.0
        for f, tname in zip(tracks, tnames):
            p = _props(f)
            w = _positive(p["sweep_width_km"], f"track {tname!r} sweep_width_km") \
                if p.get("sweep_width_km") not in (None, "") else w_default
            km = sum(length_inside([proj(pt) for pt in line], rings) for line in lines_of(f["geometry"]) if line)
            if km <= 0:
                continue
            c = km * w / a
            passes.append({"name": name, "ttl_km": km, "sweep_width_km": w, "track": tname,
                           "area_km2_geojson": a, "coverage": c, "pod_model": 1.0 - math.exp(-c)})
            swept += km * w
            km_in += km
        c_tot = swept / a
        seg_rows.append({"name": name, "area_km2": a, "track_km_inside": km_in, "coverage": c_tot,
                         "pod": 1.0 - math.exp(-c_tot), "projection": proj.method})
    track_rows = []
    for f, tname in zip(tracks, tnames):
        total = sum(haversine_km(a, b) for line in lines_of(f["geometry"]) for a, b in zip(line, line[1:]))
        track_rows.append({"track": tname, "class": _class(f), "length_km_haversine": total,
                           "km_inside_segments": sum(r["ttl_km"] for r in passes if r["track"] == tname)})
    marker_rows = []
    for f in markers:
        pt = f["geometry"].get("coordinates") or []
        if len(pt) < 2:
            continue
        inside = []
        for name, g, _ in segs:
            lat0, lon0 = _centroid_lonlat(g)
            proj = LocalProjection(lat0, lon0, use_pyproj)
            rings = [r for poly in _project_polygons(g, proj) for r in poly]
            if _inside(*proj(pt), rings):
                inside.append(name)
        p = _props(f)
        marker_rows.append({"title": p.get("title"), "class": _class(f), "lon": pt[0], "lat": pt[1],
                            "segments": inside, "description": p.get("description")})
    return {"passes": passes, "segments": seg_rows, "tracks": track_rows, "markers": marker_rows,
            "projection": sorted(methods), "sweep_width_km_default": w_default,
            "formula": "C = track_km_inside * W / area_km2; POD = 1 - exp(-C)", "note": NOTE}


PASS_COLUMNS = ["name", "ttl_km", "sweep_width_km", "track", "area_km2_geojson", "coverage", "pod_model"]


def write_passes_csv(path, passes, write_pod=False):
    cols = PASS_COLUMNS + (["pod"] if write_pod else [])
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(cols)
        for r in passes:
            row = dict(r, pod=r["pod_model"])
            w.writerow([repr(row[c]) if isinstance(row[c], float) else row[c] for c in cols])


def check_against_segments_csv(passes, segs_csv_path, rel_tol=0.02):
    """Every pass names a non-ROW segment in segments.csv; returns area warnings (> rel_tol mismatch)."""
    segs = {s["name"]: s for s in st.read_segments(segs_csv_path)}
    warnings = []
    for r in passes:
        if r["name"] not in segs:
            raise InputError(f"segment {r['name']!r} is in the CalTopo file but not in {segs_csv_path}")
        a = segs[r["name"]].get("area_km2")
        if a and abs(a - r["area_km2_geojson"]) > rel_tol * a:
            warnings.append(f"{r['name']}: area {r['area_km2_geojson']:.4f} km2 from the polygon vs {a:.4f} km2 "
                            f"in {os.path.basename(segs_csv_path)}; search_theory uses the CSV area")
    return sorted(set(warnings))


# ---------------------------------------------------------------------------
# export: planning numbers -> CalTopo-importable GeoJSON
# ---------------------------------------------------------------------------


def _load_json(path, what):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        raise InputError(f"{what} {path}: {exc}") from exc


def poa_colour(poa, max_poa):
    """Yellow (low POA) to red (highest POA) as #RRGGBB."""
    f = 0.0 if max_poa <= 0 else max(0.0, min(1.0, poa / max_poa))
    return f"#FF{int(round(255 * (1 - f))):02X}00"


def pod_bucket(pod):
    if pod is None:
        return None
    return next(label for cut, label in POD_BUCKETS if pod < cut)


def _fmt(x, nd=4):
    return "n/a" if x is None else f"{x:.{nd}f}"


def planning_numbers(segments, result=None, optimal=None):
    """Per-segment dict: poa (current), poa_initial, pod_achieved, pod_planned, psr, effort, rank."""
    cur = {s["name"]: s["poa"] for s in segments}
    if result is not None:
        fp = result.get("final_poa")
        if not isinstance(fp, dict):
            raise InputError("search_theory result has no final_poa")
        unknown = set(fp) - set(cur)
        if unknown:
            raise InputError(f"search_theory result names segments not in segments.csv: {sorted(unknown)}")
        cur.update({k: float(v) for k, v in fp.items()})
    cum = (result or {}).get("cumulative_pod") or {}
    planned = {}
    if optimal is not None:
        rows = (optimal.get("optimal") or {}).get("segments")
        if not isinstance(rows, list):
            raise InputError("optimal_search result has no optimal.segments")
        planned = {r["name"]: r for r in rows if isinstance(r, dict) and "name" in r}
    current = [dict(s, poa=cur[s["name"]]) for s in segments]
    ranks = {r["name"]: r for r in st.tasking_table(current)}
    out = {}
    for s in segments:
        n = s["name"]
        if st._is_row(n):
            continue
        p = planned.get(n, {})
        effort_km = p.get("effort_km") if p else s.get("ttl_km")
        effort_h = p.get("effort_hours") if p else None
        if effort_h is None and effort_km is not None and s.get("speed_kmh"):
            effort_h = effort_km / s["speed_kmh"]
        out[n] = {"poa": cur[n], "poa_initial": s["poa"], "pod_achieved": cum.get(n),
                  "pod_planned": p.get("pod") if p else None, "psr": ranks[n]["psr"], "pden": ranks[n]["pden"],
                  "rank": ranks[n]["rank"], "effort_km": effort_km, "effort_hours": effort_h,
                  "area_km2": s["area_km2"], "sweep_width_km": s.get("sweep_width_km"),
                  "speed_kmh": s.get("speed_kmh")}
    return out


def _description(name, number, nums):
    lines = [f"segment={name}", f"Assignment {number}",
             f"POA {_fmt(nums['poa'])}" + ("" if nums["poa"] == nums["poa_initial"]
                                           else f" (initial {_fmt(nums['poa_initial'])})"),
             f"POD achieved {_fmt(nums['pod_achieved'], 3)}; POD planned {_fmt(nums['pod_planned'], 3)}",
             f"PSR {_fmt(nums['psr'], 5)} per hour (W {_fmt(nums['sweep_width_km'], 3)} km, "
             f"v {_fmt(nums['speed_kmh'], 2)} km/h, area {_fmt(nums['area_km2'], 4)} km2); PSR rank {nums['rank']}",
             f"Effort {_fmt(nums['effort_km'], 2)} km track, {_fmt(nums['effort_hours'], 2)} searcher-hours",
             NOTE]
    return "\n".join(lines)


def _clean_geometry(g):
    def ring(r):
        return [[round(float(p[0]), 7), round(float(p[1]), 7)] for p in r]
    if g["type"] == "Polygon":
        return {"type": "Polygon", "coordinates": [ring(r) for r in g["coordinates"]]}
    return {"type": "MultiPolygon", "coordinates": [[ring(r) for r in poly] for poly in g["coordinates"]]}


def export_features(polygons, segments, result=None, optimal=None, feature_class="Assignment", start_number=1):
    """CalTopo-importable FeatureCollection. polygons: [(name, geometry, props)]; segments: search_theory rows."""
    if feature_class not in ("Assignment", "Shape"):
        raise InputError("class must be Assignment or Shape")
    st.check_poa(segments)
    nums = planning_numbers(segments, result, optimal)
    by_poly = {n: g for n, g, _ in polygons}
    missing = sorted(set(nums) - set(by_poly))
    if missing:
        raise InputError(f"segments with no polygon: {missing} (every non-ROW segment needs a map polygon)")
    extra = sorted(set(by_poly) - set(nums))
    if extra:
        raise InputError(f"polygons with no segment row: {extra}")
    max_poa = max((v["poa"] for v in nums.values()), default=0.0)
    feats = []
    for name, v in sorted(nums.items(), key=lambda kv: kv[1]["rank"]):
        number = str(start_number + v["rank"] - 1)
        colour = poa_colour(v["poa"], max_poa)
        props = {
            "class": feature_class,
            "title": f"{name} {number}" if feature_class == "Assignment" else f"{name} (#{number})",
            "description": _description(name, number, v),
            "stroke": colour, "stroke-opacity": 1.0, "stroke-width": 2, "pattern": "solid",
            "fill": colour, "fill-opacity": round(0.1 + 0.4 * (v["poa"] / max_poa if max_poa > 0 else 0.0), 3),
            # our own keys; CalTopo may drop them, the description carries the same numbers
            "segment": name, "poa": v["poa"], "pod_achieved": v["pod_achieved"], "pod_planned": v["pod_planned"],
            "psr": v["psr"], "effort_km": v["effort_km"], "effort_hours": v["effort_hours"],
        }
        if feature_class == "Assignment":
            pod = v["pod_planned"] if v["pod_planned"] is not None else v["pod_achieved"]
            third = max(1, math.ceil(len(nums) / 3))
            props.update({
                "letter": name, "number": number, "resourceType": "GROUND", "status": "DRAFT",
                # priority by PSR rank tercile: our convention, not a CalTopo rule
                "priority": "HIGH" if v["rank"] <= third else "MEDIUM" if v["rank"] <= 2 * third else "LOW",
                "timeAllocated": round(v["effort_hours"], 2) if v["effort_hours"] is not None else 0,
            })
            if pod is not None:
                props["responsivePOD"] = pod_bucket(pod)  # our LOW/MEDIUM/HIGH cut-offs: < 0.4, < 0.7, >= 0.7
        feats.append({"type": "Feature", "geometry": _clean_geometry(by_poly[name]), "properties": props})
    return {"type": "FeatureCollection", "features": feats}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _write_json(path, obj):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def _cmd_export(a):
    polygons = read_segment_polygons(load_features(a.polygons), a.polygons)
    segments = st.read_segments(a.segments)
    result = _load_json(a.result, "search_theory result") if a.result else None
    optimal = _load_json(a.optimal, "optimal_search result") if a.optimal else None
    fc = export_features(polygons, segments, result, optimal, a.feature_class, a.start_number)
    _write_json(a.out, fc)
    print(f"wrote {len(fc['features'])} {a.feature_class} features to {a.out}; import it in CalTopo "
          "(Import > choose file); nothing was sent to CalTopo")
    return 0


def _cmd_import(a):
    feats = load_features(a.export)
    seg_feats = load_features(a.segments_geojson) if a.segments_geojson else None
    res = coverage(feats, a.sweep_width_km, seg_feats, path=a.export)
    if not res["passes"]:
        print("error: no track lies inside any segment polygon; nothing written", file=sys.stderr)
        return 3
    warnings = check_against_segments_csv(res["passes"], a.segments_csv) if a.segments_csv else []
    res["warnings"] = warnings
    res["inputs"] = {"export": os.path.abspath(a.export),
                     "segments_geojson": os.path.abspath(a.segments_geojson) if a.segments_geojson else None,
                     "segments_csv": os.path.abspath(a.segments_csv) if a.segments_csv else None}
    write_passes_csv(a.passes_out, res["passes"], a.write_pod)
    if a.summary_out:
        _write_json(a.summary_out, res)
    for w in warnings:
        print(f"warning: {w}", file=sys.stderr)
    for s in res["segments"]:
        print(f"  {s['name']:<16} track {s['track_km_inside']:8.3f} km  area {s['area_km2']:8.4f} km2  "
              f"C {s['coverage']:.3f}  POD {s['pod']:.3f}")
    print(f"wrote {len(res['passes'])} passes to {a.passes_out} (projection: {', '.join(res['projection'])})")
    return 0


def _parser():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd")
    e = sub.add_parser("export", help="segments + planning numbers -> CalTopo-importable GeoJSON")
    e.add_argument("--polygons", required=True, help="segment polygons GeoJSON (name/title/id per feature)")
    e.add_argument("--segments", required=True, help="segments.csv (search_theory.py / lost_person_sim.py)")
    e.add_argument("--result", help="search_theory.py --out JSON (POA after passes, POD achieved)")
    e.add_argument("--optimal", help="optimal_search.py --out JSON (planned effort and POD)")
    e.add_argument("--class", dest="feature_class", default="Assignment", choices=["Assignment", "Shape"])
    e.add_argument("--start-number", type=int, default=1)
    e.add_argument("--out", required=True)
    i = sub.add_parser("import", help="CalTopo GeoJSON export -> coverage -> passes.csv for search_theory.py")
    i.add_argument("export", help="GeoJSON exported from CalTopo")
    i.add_argument("--sweep-width-km", type=float, required=True, help="W for tracks without sweep_width_km")
    i.add_argument("--segments-geojson", help="segment polygons, if not taken from the export's assignments")
    i.add_argument("--segments-csv", help="segments.csv to check names and areas against")
    i.add_argument("--passes-out", required=True)
    i.add_argument("--summary-out")
    i.add_argument("--write-pod", action="store_true", help="also write pod (overrides search_theory's model)")
    return ap


def main(argv=None):
    ap = _parser()
    try:
        a = ap.parse_args(argv)
    except SystemExit as exc:
        return int(exc.code or 0)
    try:
        if a.cmd == "export":
            return _cmd_export(a)
        if a.cmd == "import":
            return _cmd_import(a)
    except (InputError, ValueError, OSError, KeyError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    ap.print_usage(sys.stderr)
    print("error: choose a subcommand: export or import", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
