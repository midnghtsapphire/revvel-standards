#!/usr/bin/env python3
"""Search-planning package for a missing person who may have been taken.

Built from the three Keith Fleming uploads of 2026-10-17
(docs/case-files/fleming/): the DEM depression finder, the SQLite logger and
the QGIS buffer panel. What it keeps and what it changes:

  qgis_sar_panel.py        fixed 0.25 mi / 1 mi buffers, labelled "High
                           Priority" and "Secondary"   ->  rings come from a
                           published statistic in abduction_prior.json, each
                           labelled with its source, and drawn as true
                           geodesic circles (the panel buffered in the project
                           CRS, so with a lon/lat project such as EPSG:4326
                           a "402 m" buffer was 402 degrees wide).
  sar_geospatial_ingestion.py  5x5 local-minimum filter with a 0.5 m cut
                           ->  dem_terrain.priority_flood, which finds closed
                           depressions of any size and reports depth, area and
                           volume; nodata cells are refused, not compared.
  sar_pipeline_orchestrator.py  naive utcnow(), a fixed db path, a mock row
                           written on every run   ->  a run log with a
                           timezone-aware time, the SHA-256 of every input,
                           and no invented rows.

Rings are drawn around the point each statistic is measured from:

  --anchor last_known_location   the victim's last known location
  --anchor murder_site           a confirmed (or hypothesised) site; rings
                                 around it are only as good as that site
  --anchor offender_residence    a suspect's or offender's residence
  --anchor custom                any point you choose

The point is --lat/--lon, or --address (US addresses, geocoded with the free
US Census Bureau geocoder). --radius-m adds rings of your own size around it,
labelled as your choice rather than a published statistic, and --pin adds any
other places to the map with their distance and bearing from the anchor.

Optional inputs:

  --dem FILE.tif      your own DTM; closed depressions inside the largest
                      ring are listed with distance and bearing from the
                      anchor (dem_terrain.py, needs numpy/scipy/rasterio)
  --roads FILE.geojson  LineString/MultiLineString roads or tracks (for
                      example an OpenStreetMap export); each depression gets
                      the distance to the nearest one
  --log FILE.sqlite   append a row describing this run

Nothing here scores a place as a burial site. A depression is a terrain
feature to look at, and a ring is a planning prior, not a prediction.

Exit codes: 0 written; 1 --require-verified and a ring uses an unverified
statistic; 2 bad input.
"""

import argparse
import csv
import datetime as dt
import hashlib
import json
import math
import os
import sqlite3
import sys
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import lost_person_behavior as lpb  # noqa: E402

PRIOR_PATH = os.path.join(HERE, "abduction_prior.json")
ANCHORS = ("last_known_location", "murder_site", "offender_residence", "custom")
GEOCODER = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
NOTE = ("Rings are a planning prior from published case statistics, not a prediction of where this "
        "person is. Depressions are terrain features, not detections.")


def load_prior(path=PRIOR_PATH):
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    entries = data.get("entries") if isinstance(data, dict) else None
    if not isinstance(entries, list) or not entries:
        raise ValueError(f"{path}: no entries")
    seen = set()
    for e in entries:
        if not isinstance(e, dict):
            raise ValueError(f"{path}: entry is not an object")
        for k in ("id", "anchor", "percent", "distance_m", "source", "verified"):
            if k not in e:
                raise ValueError(f"{path}: entry {e.get('id')!r} has no {k}")
        if e["id"] in seen:
            raise ValueError(f"{path}: duplicate id {e['id']!r}")
        seen.add(e["id"])
        if e["anchor"] not in ANCHORS:
            raise ValueError(f"{path}: {e['id']}: anchor must be one of {ANCHORS}")
        if not isinstance(e["verified"], bool):
            raise ValueError(f"{path}: {e['id']}: verified must be true or false")
        if isinstance(e["distance_m"], bool) or not isinstance(e["distance_m"], (int, float)) or e["distance_m"] <= 0:
            raise ValueError(f"{path}: {e['id']}: distance_m must be a positive number")
        if isinstance(e["percent"], bool) or not isinstance(e["percent"], (int, float)) or not 0 < e["percent"] <= 100:
            raise ValueError(f"{path}: {e['id']}: percent must be in (0, 100]")
        if e["verified"] and not e.get("page"):
            raise ValueError(f"{path}: {e['id']}: verified entries need the printed page")
    return data


def rings_for(anchor, data):
    out = [e for e in data["entries"] if e["anchor"] == anchor]
    return sorted(out, key=lambda e: e["distance_m"])


def label(e):
    if e.get("user"):
        return f"{e['distance_m']:g} m ({e['distance_m'] / 1609.344:.2f} mi) - your radius"
    tag = "" if e["verified"] else " [UNVERIFIED]"
    return f"{e['percent']:g}% within {e['distance_m']:g} m ({e['measures_to']}){tag}"


def user_rings(anchor, radii):
    return [{"id": f"user_{r:g}m", "anchor": anchor, "percent": None, "distance_m": float(r),
             "measures_to": "radius you chose", "printed": None, "source": "user", "source_url": None,
             "page": None, "verified": True, "user": True} for r in radii]


def geocode(address, opener=None):
    """(lat, lon, matched_address) from the US Census Bureau one-line geocoder."""
    import urllib.parse
    import urllib.request

    url = GEOCODER + "?" + urllib.parse.urlencode(
        {"address": address, "benchmark": "Public_AR_Current", "format": "json"})
    with (opener or urllib.request.urlopen)(url, timeout=30) as r:
        body = json.load(r)
    matches = (body.get("result") or {}).get("addressMatches") or []
    if not matches:
        raise ValueError(f"the Census geocoder found no match for {address!r}")
    m = matches[0]
    return float(m["coordinates"]["y"]), float(m["coordinates"]["x"]), m.get("matchedAddress", address)


def bearing_deg(lat1, lon1, lat2, lon2):
    p1, p2, dl = math.radians(lat1), math.radians(lat2), math.radians(lon2 - lon1)
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def rings_geojson(anchor, lat, lon, rings, n_vertices=128, anchor_label=None, pins=()):
    feats = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]},
              "properties": {"name": anchor, "label": anchor_label or anchor.replace("_", " ")}}]
    for e in rings:
        props = {k: e.get(k) for k in ("id", "percent", "distance_m", "measures_to", "printed", "source",
                                       "source_url", "page", "verified")}
        props["label"] = label(e)
        ring = lpb.geodesic_circle(lat, lon, e["distance_m"] / 1000.0, n_vertices)
        feats.append({"type": "Feature", "properties": props,
                      "geometry": {"type": "Polygon", "coordinates": [[list(p) for p in ring]]}})
    for p in pins:
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [p["lon"], p["lat"]]},
                      "properties": {"name": "pin", "label": p["label"], "distance_m": p["distance_m"],
                                     "bearing_deg": p["bearing_deg"]}})
    return {"type": "FeatureCollection", "name": f"abduction_{anchor}", "features": feats, "note": NOTE}


def rings_kml(gj, depressions=()):
    ns = "http://www.opengis.net/kml/2.2"
    ET.register_namespace("", ns)
    kml = ET.Element(f"{{{ns}}}kml")
    doc = ET.SubElement(kml, f"{{{ns}}}Document")
    ET.SubElement(doc, f"{{{ns}}}name").text = gj["name"]
    ET.SubElement(doc, f"{{{ns}}}description").text = NOTE

    def point(nm, desc, lo, la):
        pm = ET.SubElement(doc, f"{{{ns}}}Placemark")
        ET.SubElement(pm, f"{{{ns}}}name").text = nm
        ET.SubElement(pm, f"{{{ns}}}description").text = desc
        ET.SubElement(ET.SubElement(pm, f"{{{ns}}}Point"), f"{{{ns}}}coordinates").text = f"{lo:.7f},{la:.7f},0"

    anchor = gj["features"][0]
    point(anchor["properties"]["label"], "anchor point", *anchor["geometry"]["coordinates"])
    for f in gj["features"][1:]:
        p = f["properties"]
        if f["geometry"]["type"] == "Point":
            point(p["label"], f"{p['distance_m']:.0f} m at {p['bearing_deg']:.0f} deg from the anchor",
                  *f["geometry"]["coordinates"])
            continue
        pm = ET.SubElement(doc, f"{{{ns}}}Placemark")
        ET.SubElement(pm, f"{{{ns}}}name").text = p["label"]
        ET.SubElement(pm, f"{{{ns}}}description").text = f"{p['source']}; page {p['page'] or 'not checked'}"
        poly = ET.SubElement(pm, f"{{{ns}}}Polygon")
        outer = ET.SubElement(ET.SubElement(poly, f"{{{ns}}}outerBoundaryIs"), f"{{{ns}}}LinearRing")
        ET.SubElement(outer, f"{{{ns}}}coordinates").text = " ".join(
            f"{x:.7f},{y:.7f},0" for x, y in f["geometry"]["coordinates"][0])
    for i, d in enumerate(depressions, 1):
        point(f"depression {i}", f"max depth {d['max_depth_m']:.2f} m, area {d['area_m2']:.0f} m2, "
              f"{d['distance_m']:.0f} m from anchor", d["lon"], d["lat"])
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(kml, encoding="unicode")


def load_roads(path):
    with open(path, encoding="utf-8") as fh:
        gj = json.load(fh)
    lines = []
    for f in gj.get("features", []) if isinstance(gj, dict) else []:
        g = (f or {}).get("geometry") or {}
        if g.get("type") == "LineString":
            lines.append(g["coordinates"])
        elif g.get("type") == "MultiLineString":
            lines.extend(g["coordinates"])
    if not lines:
        raise ValueError(f"{path}: no LineString or MultiLineString features")
    return lines


def distance_to_lines_m(lat, lon, lines):
    """Shortest distance from a point to any segment, on a local equirectangular plane (fine below ~50 km)."""
    kx = 111_320.0 * math.cos(math.radians(lat))
    ky = 110_574.0
    best = math.inf
    for line in lines:
        pts = [((p[0] - lon) * kx, (p[1] - lat) * ky) for p in line]
        if len(pts) == 1:
            best = min(best, math.hypot(*pts[0]))
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            dx, dy = x2 - x1, y2 - y1
            L = dx * dx + dy * dy
            t = 0.0 if L == 0 else max(0.0, min(1.0, -(x1 * dx + y1 * dy) / L))
            best = min(best, math.hypot(x1 + t * dx, y1 + t * dy))
    return best


def is_url(path):
    return path.startswith(("https://", "http://", "/vsicurl/"))


def find_depressions(dems, lat, lon, radius_m, res_m, min_depth_m, allow_partial=False):
    import dem_terrain  # numpy / scipy / rasterio, only needed here

    dem_terrain._setup_gdal()
    res = dem_terrain.analyse_point(lat, lon, radius_m, res_m, list(dems), min_depth_m=min_depth_m,
                                    allow_partial=allow_partial)
    out = []
    for d in res["depressions"]:
        dist = lpb.haversine_km(lat, lon, d["lat"], d["lon"]) * 1000.0
        if dist <= radius_m:
            out.append(dict(d, distance_m=dist, bearing_deg=bearing_deg(lat, lon, d["lat"], d["lon"])))
    out.sort(key=lambda d: d["distance_m"])
    return out, res["nodata_cells_filled"]


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def log_run(db_path, row):
    con = sqlite3.connect(db_path)
    try:
        con.execute("""CREATE TABLE IF NOT EXISTS abduction_search_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, run_utc TEXT NOT NULL, case_id TEXT NOT NULL,
            anchor TEXT NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL, rings INTEGER NOT NULL,
            unverified_rings INTEGER NOT NULL, depressions INTEGER, inputs_json TEXT NOT NULL,
            out_dir TEXT NOT NULL)""")
        con.execute("""INSERT INTO abduction_search_runs (run_utc, case_id, anchor, lat, lon, rings,
            unverified_rings, depressions, inputs_json, out_dir) VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    (row["run_utc"], row["case_id"], row["anchor"], row["lat"], row["lon"], row["rings"],
                     row["unverified_rings"], row["depressions"], json.dumps(row["inputs"], sort_keys=True),
                     row["out_dir"]))
        con.commit()
    finally:
        con.close()


def build_parser():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--case-id", required=True, help="your label for the case, stored in the outputs and log")
    p.add_argument("--anchor", choices=ANCHORS, default="last_known_location")
    p.add_argument("--anchor-label", help="name shown on the anchor point")
    p.add_argument("--lat", type=float)
    p.add_argument("--lon", type=float)
    p.add_argument("--address", help="US street address to geocode instead of --lat/--lon")
    p.add_argument("--radius-m", type=float, nargs="+", default=[], help="rings of your own size, in metres")
    p.add_argument("--pin", nargs=3, action="append", default=[], metavar=("LABEL", "LAT", "LON"),
                   help="another place to mark (repeatable)")
    p.add_argument("--prior", default=PRIOR_PATH, help="distance statistics JSON (default: %(default)s)")
    p.add_argument("--dem", nargs="+", help="DTM GeoTIFF file(s) or COG URL(s); later ones fill gaps in earlier ones")
    p.add_argument("--res-m", type=float, default=1.0, help="grid resolution for --dem (default 1 m)")
    p.add_argument("--min-depth-m", type=float, default=0.3)
    p.add_argument("--min-radius-m", type=float, default=200.0,
                   help="terrain window is at least this radius even when every ring is smaller")
    p.add_argument("--allow-partial", action="store_true", help="see dem_terrain.py")
    p.add_argument("--roads", help="GeoJSON of roads or tracks")
    p.add_argument("--log", help="SQLite file to append a run row to")
    p.add_argument("--require-verified", action="store_true",
                   help="exit 1 if any ring uses a statistic not yet checked against its printed page")
    p.add_argument("--out", required=True, help="output folder")
    return p


def main(argv=None, now=None, opener=None):
    a = build_parser().parse_args(argv)
    try:
        geocoded = None
        if a.address:
            if a.lat is not None or a.lon is not None:
                raise ValueError("give --address or --lat/--lon, not both")
            try:
                a.lat, a.lon, matched = geocode(a.address, opener)
            except OSError as e:
                raise ValueError(f"geocoding {a.address!r} failed: {e}")
            geocoded = {"address": a.address, "matched": matched, "geocoder": GEOCODER}
        if a.lat is None or a.lon is None:
            raise ValueError("give --lat and --lon, or --address")
        if not (-90 < a.lat < 90 and -180 <= a.lon <= 180):
            raise ValueError(f"point out of range: {a.lat}, {a.lon}")
        if not a.case_id.strip():
            raise ValueError("--case-id is empty")
        if a.res_m <= 0 or a.min_depth_m <= 0 or a.min_radius_m <= 0:
            raise ValueError("--res-m, --min-depth-m and --min-radius-m must be > 0")
        for f in (a.dem or []) + ([a.roads] if a.roads else []):
            if not is_url(f) and not os.path.isfile(f):
                raise ValueError(f"no such file: {f}")
        data = load_prior(a.prior)
        if any(r <= 0 for r in a.radius_m):
            raise ValueError("--radius-m values must be > 0")
        rings = sorted(rings_for(a.anchor, data) + user_rings(a.anchor, a.radius_m), key=lambda e: e["distance_m"])
        if not rings:
            raise ValueError(f"{a.prior} has no statistic measured from {a.anchor}; add --radius-m")
        pins = []
        for lbl, la, lo in a.pin:
            la, lo = float(la), float(lo)
            if not (-90 < la < 90 and -180 <= lo <= 180):
                raise ValueError(f"pin {lbl!r} out of range: {la}, {lo}")
            pins.append({"label": lbl, "lat": la, "lon": lo,
                         "distance_m": lpb.haversine_km(a.lat, a.lon, la, lo) * 1000.0,
                         "bearing_deg": bearing_deg(a.lat, a.lon, la, lo)})
        roads = load_roads(a.roads) if a.roads else None
    except (ValueError, OSError, json.JSONDecodeError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2

    os.makedirs(a.out, exist_ok=True)
    gj = rings_geojson(a.anchor, a.lat, a.lon, rings, anchor_label=a.anchor_label, pins=pins)
    deps, filled = [], None
    if a.dem:
        radius = max(a.min_radius_m, rings[-1]["distance_m"])
        try:
            deps, filled = find_depressions(a.dem, a.lat, a.lon, radius, a.res_m, a.min_depth_m, a.allow_partial)
        except ValueError as e:
            print(f"error: {e}", file=sys.stderr)
            return 2
        for d in deps:
            d["inside_rings"] = [e["id"] for e in rings if d["distance_m"] <= e["distance_m"]]
            if roads:
                d["nearest_road_m"] = distance_to_lines_m(d["lat"], d["lon"], roads)
        with open(os.path.join(a.out, "depressions.csv"), "w", newline="", encoding="utf-8") as fh:
            cols = ["lat", "lon", "distance_m", "bearing_deg", "max_depth_m", "area_m2", "volume_m3",
                    "nearest_road_m", "inside_rings"]
            w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
            w.writeheader()
            for d in deps:
                w.writerow(dict(d, inside_rings=";".join(d["inside_rings"])))
    with open(os.path.join(a.out, "rings.geojson"), "w", encoding="utf-8") as fh:
        json.dump(gj, fh, indent=1)
    with open(os.path.join(a.out, "rings.kml"), "w", encoding="utf-8") as fh:
        fh.write(rings_kml(gj, deps))

    unverified = [e["id"] for e in rings if not e["verified"]]
    inputs = {"prior": {"path": a.prior, "sha256": sha256(a.prior)}}
    if a.dem:
        inputs["dem"] = [{"url": f} if is_url(f) else {"path": f, "sha256": sha256(f)} for f in a.dem]
    if a.roads:
        inputs["roads"] = {"path": a.roads, "sha256": sha256(a.roads)}
    run_utc = (now or dt.datetime.now(dt.timezone.utc)).isoformat()
    summary = {
        "case_id": a.case_id, "run_utc": run_utc,
        "anchor": {"kind": a.anchor, "label": a.anchor_label, "lat": a.lat, "lon": a.lon, "geocoded": geocoded},
        "pins": pins,
        "rings": [dict(e, label=label(e)) for e in rings], "unverified_rings": unverified,
        "depressions": deps if a.dem else None, "dem_nodata_cells_filled": filled,
        "inputs": inputs, "note": NOTE,
    }
    with open(os.path.join(a.out, "summary.json"), "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=1)
    if a.log:
        log_run(a.log, {"run_utc": run_utc, "case_id": a.case_id, "anchor": a.anchor, "lat": a.lat,
                        "lon": a.lon, "rings": len(rings), "unverified_rings": len(unverified),
                        "depressions": len(deps) if a.dem else None, "inputs": inputs,
                        "out_dir": os.path.abspath(a.out)})

    print(f"{len(rings)} ring(s) around the {a.anchor.replace('_', ' ')} -> {a.out}")
    if a.dem:
        print(f"{len(deps)} closed depression(s) deeper than {a.min_depth_m} m inside the window")
    if unverified:
        print(f"warning: unverified statistic(s): {', '.join(unverified)} - check the printed page and "
              f"set verified=true in {a.prior}", file=sys.stderr)
        if a.require_verified:
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
