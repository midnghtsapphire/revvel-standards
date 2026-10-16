#!/usr/bin/env python3
"""OpenStreetMap: Overpass feature queries around a point, and Nominatim lookup.

Overpass (https://overpass-api.de/api/interpreter, no key): find mapped
features within a radius of a point, e.g. drainage and access features that
matter to a ground search:

  python osm.py overpass --lat 39.96 --lon -83.0 --radius 800 \\
      --tag waterway --tag culvert=yes --tag man_made=manhole --tag highway=path \\
      --out features.geojson

Each --tag is KEY or KEY=VALUE (letters, digits, _ : - . and spaces in values).
Nodes, ways and relations ("nwr") are matched; "out geom" returns geometry,
which is converted to GeoJSON: nodes -> Point, open ways -> LineString, closed
area-like ways -> Polygon, relations -> MultiLineString of member ways.
Overpass usage policy: keep it under ~10,000 queries/day; a 429 means wait.

Nominatim (https://nominatim.openstreetmap.org, no key, strict policy): at
most one request per second, no bulk geocoding, and a User-Agent that
identifies the application with a contact. This module refuses to call
Nominatim unless env CONTACT_EMAIL is set, and spaces calls >= 1 s apart.

  CONTACT_EMAIL=you@example.org python osm.py nominatim --q "Scioto Audubon Metro Park"
  CONTACT_EMAIL=you@example.org python osm.py nominatim --reverse 39.94,-83.01
"""

import argparse
import os
import re
import sys
import time

try:
    from . import fetch as F
except ImportError:
    import fetch as F

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_HOSTS = ["overpass-api.de"]
NOMINATIM_URL = "https://nominatim.openstreetmap.org"
NOMINATIM_HOSTS = ["nominatim.openstreetmap.org"]
_KEY_RE = re.compile(r"^[A-Za-z0-9_:\-.]{1,64}$")
_VAL_RE = re.compile(r"^[A-Za-z0-9_:\-. ]{1,100}$")
AREA_KEYS = {"building", "landuse", "natural", "leisure", "amenity", "area", "water", "man_made", "place"}
MAX_RADIUS_M = 20000
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def parse_tag(text):
    if "=" in text:
        k, v = text.split("=", 1)
    else:
        k, v = text, None
    k = k.strip()
    if not _KEY_RE.match(k):
        raise ValueError(f"tag key {k!r} not allowed")
    if v is not None:
        v = v.strip()
        if not _VAL_RE.match(v):
            raise ValueError(f"tag value {v!r} not allowed")
    return k, v


def _ql_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def build_query(lat, lon, radius_m, tags, timeout=25):
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError("lat/lon out of range")
    if not 0 < radius_m <= MAX_RADIUS_M:
        raise ValueError(f"radius must be in (0, {MAX_RADIUS_M}] metres")
    if not 1 <= timeout <= 180:
        raise ValueError("timeout must be 1..180 s")
    if not tags:
        raise ValueError("give at least one --tag")
    around = f"(around:{radius_m:g},{lat:.7f},{lon:.7f})"
    lines = [f"[out:json][timeout:{int(timeout)}];", "("]
    for k, v in tags:
        sel = f"[{_ql_str(k)}]" if v is None else f"[{_ql_str(k)}={_ql_str(v)}]"
        lines.append(f"  nwr{sel}{around};")
    lines += [");", "out geom;"]
    return "\n".join(lines)


def _coords(geom):
    return [[p["lon"], p["lat"]] for p in geom or [] if p and "lat" in p and "lon" in p]


def _is_area(tags, coords):
    if len(coords) < 4 or coords[0] != coords[-1]:
        return False
    if tags.get("area") == "no":
        return False
    return bool(AREA_KEYS & set(tags))


def overpass_to_geojson(data):
    feats = []
    for el in data.get("elements") or []:
        t, tags = el.get("type"), el.get("tags") or {}
        geom = None
        if t == "node" and "lat" in el:
            geom = {"type": "Point", "coordinates": [el["lon"], el["lat"]]}
        elif t == "way":
            c = _coords(el.get("geometry"))
            if len(c) >= 2:
                geom = {"type": "Polygon", "coordinates": [c]} if _is_area(tags, c) else \
                    {"type": "LineString", "coordinates": c}
        elif t == "relation":
            lines = [_coords(m.get("geometry")) for m in el.get("members") or [] if m.get("type") == "way"]
            lines = [ln for ln in lines if len(ln) >= 2]
            if lines:
                geom = {"type": "MultiLineString", "coordinates": lines}
        if geom is None and "center" in el:
            geom = {"type": "Point", "coordinates": [el["center"]["lon"], el["center"]["lat"]]}
        props = dict(tags)
        props["@osm_type"], props["@osm_id"] = t, el.get("id")
        feats.append({"type": "Feature", "id": f"{t}/{el.get('id')}", "geometry": geom, "properties": props})
    return {"type": "FeatureCollection", "features": feats}


def overpass(lat, lon, radius_m, tags, query_timeout=25, **kw):
    """query_timeout is Overpass's server-side [timeout:]; the HTTP timeout
    (kw['timeout']) is raised to at least query_timeout + 15 s."""
    q = build_query(lat, lon, radius_m, tags, query_timeout)
    kw["timeout"] = max(kw.get("timeout", F.DEFAULT_TIMEOUT), query_timeout + 15)
    r = F.fetch(OVERPASS_URL, allowed_hosts=OVERPASS_HOSTS, method="POST", data={"data": q}, **kw)
    d = r.json()
    if d.get("remark") and "error" in d["remark"].lower():
        raise F.FetchError(f"Overpass: {d['remark']}")
    fc = overpass_to_geojson(d)
    osm_base = (d.get("osm3s") or {}).get("timestamp_osm_base")
    fc["properties"] = {"source": OVERPASS_URL, "query": q, "osm_base": osm_base,
                        "n_features": len(fc["features"]), "retrieved_at_utc": r.fetched_at,
                        "attribution": "(c) OpenStreetMap contributors, ODbL 1.0"}
    return fc


class Nominatim:
    """Nominatim client that enforces the 1 request/second policy."""

    MIN_INTERVAL = 1.0

    def __init__(self, contact=None, clock=time.monotonic, sleep=time.sleep, **kw):
        contact = contact if contact is not None else os.environ.get("CONTACT_EMAIL", "").strip()
        if not contact or not _EMAIL_RE.match(contact):
            raise ValueError("Nominatim needs a contact: set env CONTACT_EMAIL to a real address "
                             "(usage policy: identify your application)")
        self.contact = contact
        self.clock, self.sleep, self.kw = clock, sleep, kw
        self._last = None

    def _get(self, path, params):
        if self._last is not None:
            wait = self.MIN_INTERVAL - (self.clock() - self._last)
            if wait > 0:
                self.sleep(wait)
        ua = f"{F.PROJECT}/{F.VERSION} (search-and-rescue open-data research; contact: {self.contact})"
        try:
            return F.fetch_json(f"{NOMINATIM_URL}/{path}", allowed_hosts=NOMINATIM_HOSTS, params=params,
                                headers={"User-Agent": ua}, **self.kw)
        finally:
            self._last = self.clock()

    def search(self, q, limit=5):
        if not q or len(q) > 300:
            raise ValueError("query must be 1..300 characters")
        if not 1 <= limit <= 40:
            raise ValueError("limit must be 1..40")
        return self._get("search", {"q": q, "format": "jsonv2", "limit": str(limit), "addressdetails": "1"})

    def reverse(self, lat, lon, zoom=18):
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("lat/lon out of range")
        return self._get("reverse", {"lat": f"{lat:.7f}", "lon": f"{lon:.7f}", "format": "jsonv2",
                                     "zoom": str(zoom)})


def _simplify_place(p):
    return {"display_name": p.get("display_name"), "lat": float(p["lat"]) if p.get("lat") else None,
            "lon": float(p["lon"]) if p.get("lon") else None, "category": p.get("category") or p.get("class"),
            "type": p.get("type"), "osm": f"{p.get('osm_type')}/{p.get('osm_id')}",
            "boundingbox": p.get("boundingbox")}


def run(a, opener=None):
    kw = F.common_kwargs(a, opener)
    if a.cmd == "overpass":
        tags = [parse_tag(t) for t in a.tag or []]
        return overpass(a.lat, a.lon, a.radius, tags, a.query_timeout, **kw)
    nom = Nominatim(**kw)
    if a.reverse:
        try:
            lat, lon = (float(v) for v in a.reverse.split(","))
        except ValueError:
            raise ValueError("--reverse needs LAT,LON")
        d = nom.reverse(lat, lon)
        places = [] if d.get("error") else [d]
    elif a.q:
        places = nom.search(a.q, a.limit)
    else:
        raise ValueError("nominatim needs --q or --reverse")
    return {"source": NOMINATIM_URL, "attribution": "(c) OpenStreetMap contributors, ODbL 1.0",
            "n_results": len(places), "results": [_simplify_place(p) for p in places],
            "retrieved_at_utc": F.utc_now()}


def build_parser():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    o = sub.add_parser("overpass", help="features around a point -> GeoJSON")
    o.add_argument("--lat", type=float, required=True)
    o.add_argument("--lon", type=float, required=True)
    o.add_argument("--radius", type=float, default=500, help="metres (max 20000)")
    o.add_argument("--tag", action="append", help="KEY or KEY=VALUE (repeat)")
    o.add_argument("--query-timeout", type=int, default=25, help="Overpass server-side timeout, s")
    F.add_common_args(o)
    n = sub.add_parser("nominatim", help="place search / reverse geocode (needs CONTACT_EMAIL)")
    n.add_argument("--q", help="free-text place query")
    n.add_argument("--reverse", help="LAT,LON")
    n.add_argument("--limit", type=int, default=5)
    F.add_common_args(n)
    return ap


def main(argv=None, opener=None):
    return F.cli_main(build_parser(), run, argv, opener)


if __name__ == "__main__":
    sys.exit(main())
