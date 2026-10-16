#!/usr/bin/env python3
"""Query a public ArcGIS REST FeatureServer / MapServer layer.

Give the layer URL of any public service, e.g.

  https://services.arcgis.com/<org>/arcgis/rest/services/<name>/FeatureServer/0
  https://gis.example.gov/arcgis/rest/services/Hydro/Culverts/MapServer/3

The URL must be https, carry no query string or credentials, and its path must
end in .../arcgis/rest/services/.../(FeatureServer|MapServer)/<layer number>.
Only that URL's host is contacted (redirects elsewhere are refused).

What it does:

  --info           layer metadata: name, geometry type, max record count,
                   pagination / GeoJSON support and the field list
  (default)        query features -> GeoJSON FeatureCollection

Where clause: built only from these pieces, combined with AND, with field names
checked against the layer's field list and values escaped (strings quoted with
'' doubling, numbers must parse as numbers, dates must parse as ISO dates):

  --eq FIELD=VALUE        FIELD = 'VALUE'
  --like FIELD=PATTERN    FIELD LIKE 'PATTERN'   (% and _ wildcards)
  --date-range FIELD START END   FIELD >= TIMESTAMP '...' AND FIELD <= TIMESTAMP '...'
  --where "1=1"           the only raw where clause accepted

Spatial filter: --bbox west,south,east,north (WGS84 envelope, intersects).
Paging: resultOffset / resultRecordCount, continuing while the server reports
exceededTransferLimit. Output geometry is requested in WGS84 (outSR=4326).
GeoJSON comes from f=geojson when the layer lists it in supportedQueryFormats;
otherwise esri JSON points, multipoints, polylines and polygons are converted
here (polygon rings are grouped into outer rings and holes by orientation).

  python arcgis.py URL --info
  python arcgis.py URL --eq STATUS=Active --bbox -83.1,39.9,-82.9,40.05 --out culverts.geojson
"""

import argparse
import datetime as _dt
import ipaddress
import re
import sys
import urllib.parse

try:
    from . import fetch as F
except ImportError:
    import fetch as F

_PATH_RE = re.compile(
    r"^(?:/[A-Za-z0-9_.\-]+)*/arcgis/rest/services(?:/[A-Za-z0-9_.\-]+)+/(FeatureServer|MapServer)/(\d+)/?$",
    re.IGNORECASE)
_HOSTED_RE = re.compile(r"^services\d*\.arcgis\.com$", re.IGNORECASE)
_HOSTED_PATH_RE = re.compile(r"^/[A-Za-z0-9]+/arcgis/rest/services/[A-Za-z0-9_.\-]+/FeatureServer/\d+/?$",
                             re.IGNORECASE)
_FIELD_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,63}$")
NUMERIC_TYPES = {"esriFieldTypeInteger", "esriFieldTypeSmallInteger", "esriFieldTypeDouble",
                 "esriFieldTypeSingle", "esriFieldTypeOID", "esriFieldTypeBigInteger"}
DATE_TYPES = {"esriFieldTypeDate", "esriFieldTypeDateOnly", "esriFieldTypeTimestampOffset"}
RAW_WHERE_ALLOWED = {"1=1"}


class WhereError(ValueError):
    """A where-clause piece was refused."""


def _public_host(host):
    """False for localhost names and for IP literals that are not globally routable."""
    host = host.rstrip(".")
    if host == "localhost" or host.endswith(".localhost"):
        return False
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return True  # a DNS name: not resolved here (the operator supplies the URL; redirects stay on this host)
    return ip.is_global and not ip.is_multicast


def validate_layer_url(url):
    """Return (normalised url, host). Raises ValueError if it is not a layer URL."""
    try:
        p = urllib.parse.urlsplit(url.strip())
        port = p.port
    except ValueError as e:
        raise ValueError(f"bad URL: {e}")
    if p.scheme.lower() != "https":
        raise ValueError("layer URL must be https")
    if p.username or p.password or p.query or p.fragment or port not in (None, 443):
        raise ValueError("layer URL must not carry credentials, a query string, a fragment or a port")
    host = (p.hostname or "").lower()
    if not host or "%" in p.path or ".." in p.path:
        raise ValueError("layer URL has no host or has an encoded / traversal path")
    # Added (review 2026-10-16): a public service is never a loopback, private or link-local address.
    if not _public_host(host):
        raise ValueError(f"layer host {host!r} is not public (localhost, private or reserved address)")
    if _HOSTED_RE.match(host):
        if not _HOSTED_PATH_RE.match(p.path):
            raise ValueError("services*.arcgis.com URL must look like /<org>/arcgis/rest/services/<name>/"
                             "FeatureServer/<n>")
    elif not _PATH_RE.match(p.path):
        raise ValueError("path must end in /arcgis/rest/services/.../(FeatureServer|MapServer)/<n>")
    return f"https://{host}{p.path.rstrip('/')}", host


# --------------------------------------------------------------------------
# where-clause builder


def _sql_string(value):
    s = str(value)
    if any(ord(c) < 32 for c in s):
        raise WhereError("control characters are not allowed in values")
    if len(s) > 500:
        raise WhereError("value too long")
    return "'" + s.replace("'", "''") + "'"


def _check_field(name, fields):
    if not _FIELD_RE.match(name or ""):
        raise WhereError(f"field name {name!r} is not a plain identifier")
    if fields is not None:
        lookup = {f["name"].lower(): f for f in fields}
        if name.lower() not in lookup:
            raise WhereError(f"field {name!r} is not in the layer's field list")
        return lookup[name.lower()]
    return {"name": name, "type": None}


def _literal(field, value):
    if field.get("type") in NUMERIC_TYPES:
        if not re.fullmatch(r"-?\d+(\.\d+)?([eE][-+]?\d+)?", str(value).strip()):
            raise WhereError(f"field {field['name']} is numeric; {value!r} is not a number")
        return str(value).strip()
    return _sql_string(value)


def _timestamp(text, end=False):
    try:
        iso = F.parse_instant(text, end=end)
    except ValueError as e:
        raise WhereError(str(e))
    t = _dt.datetime.strptime(iso, "%Y-%m-%dT%H:%M:%SZ")
    return "TIMESTAMP '" + t.strftime("%Y-%m-%d %H:%M:%S") + "'"


def build_where(eq=(), like=(), date_ranges=(), raw=None, fields=None):
    """Build a where clause from (field, value) / (field, start, end) pieces.

    fields: the layer's field list (from metadata) to validate names and types
    against; None skips the existence check but still enforces identifier syntax.
    """
    parts = []
    if raw is not None:
        if raw.replace(" ", "") not in RAW_WHERE_ALLOWED:
            raise WhereError("the only raw where clause accepted is 1=1; use --eq/--like/--date-range")
        parts.append("1=1")
    for name, value in eq:
        f = _check_field(name, fields)
        parts.append(f"{f['name']} = {_literal(f, value)}")
    for name, pattern in like:
        f = _check_field(name, fields)
        if f.get("type") and f["type"] != "esriFieldTypeString":
            raise WhereError(f"LIKE needs a string field; {f['name']} is {f['type']}")
        parts.append(f"{f['name']} LIKE {_sql_string(pattern)}")
    for name, start, end in date_ranges:
        f = _check_field(name, fields)
        if f.get("type") and f["type"] not in DATE_TYPES:
            raise WhereError(f"date range needs a date field; {f['name']} is {f['type']}")
        lo, hi = _timestamp(start), _timestamp(end, end=True)
        if lo > hi:
            raise WhereError("date range ends before it starts")
        parts.append(f"{f['name']} >= {lo} AND {f['name']} <= {hi}")
    return " AND ".join(parts) if parts else "1=1"


def _split_kv(text):
    if "=" not in text:
        raise WhereError(f"expected FIELD=VALUE, got {text!r}")
    k, v = text.split("=", 1)
    return k.strip(), v


# --------------------------------------------------------------------------
# esri JSON -> GeoJSON


def _ring_area2(ring):
    """Twice the signed area (shoelace); positive = counter-clockwise."""
    a = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        a += x1 * y2 - x2 * y1
    return a


def _point_in_ring(pt, ring):
    x, y = pt[0], pt[1]
    inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-300) + x1:
            inside = not inside
    return inside


def _close(ring):
    ring = [list(p[:2]) for p in ring]
    if ring and ring[0] != ring[-1]:
        ring.append(list(ring[0]))
    return ring


def esri_polygon_to_geojson(rings):
    """Esri rings (outer clockwise, holes counter-clockwise) -> GeoJSON Polygon /
    MultiPolygon with RFC 7946 winding (outer counter-clockwise, holes clockwise)."""
    outers, holes = [], []
    for r in rings:
        r = _close(r)
        if len(r) < 4:
            continue
        (outers if _ring_area2(r) < 0 else holes).append(r)
    if not outers and holes:  # winding not followed by the server: treat all as outers
        outers, holes = holes, []
    polys = [[o[::-1]] for o in outers]
    for h in holes:
        for poly, o in zip(polys, outers):
            if _point_in_ring(h[0], o):
                poly.append(h[::-1])
                break
        else:
            polys.append([h])
    if not polys:
        return None
    if len(polys) == 1:
        return {"type": "Polygon", "coordinates": polys[0]}
    return {"type": "MultiPolygon", "coordinates": polys}


def esri_geometry_to_geojson(g):
    if not g:
        return None
    if "x" in g and "y" in g:
        if g["x"] is None or g["y"] is None or g["x"] != g["x"]:
            return None
        return {"type": "Point", "coordinates": [g["x"], g["y"]]}
    if "points" in g:
        return {"type": "MultiPoint", "coordinates": [list(p[:2]) for p in g["points"]]}
    if "paths" in g:
        paths = [[list(p[:2]) for p in path] for path in g["paths"] if path]
        if len(paths) == 1:
            return {"type": "LineString", "coordinates": paths[0]}
        return {"type": "MultiLineString", "coordinates": paths}
    if "rings" in g:
        return esri_polygon_to_geojson(g["rings"])
    if {"xmin", "ymin", "xmax", "ymax"} <= set(g):
        x0, y0, x1, y1 = g["xmin"], g["ymin"], g["xmax"], g["ymax"]
        return {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}
    raise ValueError(f"unsupported esri geometry keys: {sorted(g)}")


def esri_to_geojson(page, oid_field=None):
    oid_field = oid_field or page.get("objectIdFieldName")
    feats = []
    for f in page.get("features") or []:
        attrs = f.get("attributes") or {}
        feat = {"type": "Feature", "geometry": esri_geometry_to_geojson(f.get("geometry")), "properties": attrs}
        if oid_field and oid_field in attrs:
            feat["id"] = attrs[oid_field]
        feats.append(feat)
    return {"type": "FeatureCollection", "features": feats}


# --------------------------------------------------------------------------
# service calls


def layer_info(url, **kw):
    url, host = validate_layer_url(url)
    d = F.fetch_json(url, allowed_hosts=[host], params={"f": "json"}, **kw)
    if "error" in d:
        raise F.FetchError(f"service error: {d['error'].get('message')}")
    adv = d.get("advancedQueryCapabilities") or {}
    formats = [s.strip().lower() for s in (d.get("supportedQueryFormats") or "").split(",") if s.strip()]
    return {
        "url": url,
        "name": d.get("name"),
        "type": d.get("type"),
        "geometry_type": d.get("geometryType"),
        "object_id_field": d.get("objectIdField"),
        "max_record_count": d.get("maxRecordCount"),
        "supports_pagination": bool(adv.get("supportsPagination", False)),
        "supports_geojson": "geojson" in formats,
        "supported_query_formats": formats,
        "fields": [{"name": f.get("name"), "type": f.get("type"), "alias": f.get("alias")}
                   for f in d.get("fields") or []],
    }


def _exceeded(page):
    if page.get("exceededTransferLimit"):
        return True
    return bool((page.get("properties") or {}).get("exceededTransferLimit"))


def query(url, where="1=1", out_fields="*", bbox=None, page_size=None, max_features=10000, info=None, **kw):
    """Page through a layer query. Returns (FeatureCollection, pages, notes)."""
    url, host = validate_layer_url(url)
    info = info or layer_info(url, **kw)
    if not re.fullmatch(r"\*|[A-Za-z_][A-Za-z0-9_]*(,[A-Za-z_][A-Za-z0-9_]*)*", out_fields.replace(" ", "")):
        raise WhereError(f"outFields {out_fields!r}: use * or a comma list of field names")
    if out_fields != "*":
        known = {f["name"].lower() for f in info["fields"]}
        for name in out_fields.replace(" ", "").split(","):
            if name.lower() not in known:
                raise WhereError(f"outFields: {name!r} is not a field of this layer")
    mrc = info.get("max_record_count") or 1000
    size = min(page_size or mrc, mrc)
    fmt = "geojson" if info["supports_geojson"] else "json"
    base = {"where": where, "outFields": out_fields, "outSR": "4326", "returnGeometry": "true", "f": fmt}
    if bbox:
        base.update({"geometry": ",".join(repr(v) for v in bbox), "geometryType": "esriGeometryEnvelope",
                     "inSR": "4326", "spatialRel": "esriSpatialRelIntersects"})
    feats, pages, offset, notes = [], 0, 0, []
    while len(feats) < max_features:
        params = dict(base)
        if info["supports_pagination"]:
            params.update({"resultOffset": str(offset), "resultRecordCount": str(size)})
        page = F.fetch_json(url + "/query", allowed_hosts=[host], params=params, **kw)
        pages += 1
        if "error" in page:
            raise F.FetchError(f"service error: {page['error'].get('message')} {page['error'].get('details') or ''}")
        fc = page if fmt == "geojson" else esri_to_geojson(page, info.get("object_id_field"))
        got = fc.get("features") or []
        feats.extend(got)
        if not _exceeded(page) or not got:
            break
        if not info["supports_pagination"]:
            notes.append("server reported exceededTransferLimit but does not support pagination; "
                         "results are truncated - narrow the where clause or bbox")
            break
        offset += len(got)
    if len(feats) >= max_features and pages and _exceeded(page):
        notes.append(f"stopped at --max-features {max_features}")
    return {"type": "FeatureCollection", "features": feats[:max_features]}, pages, notes


def run(a, opener=None):
    kw = F.common_kwargs(a, opener)
    info = layer_info(a.url, **kw)
    if a.info:
        return info
    eq = [_split_kv(s) for s in a.eq or []]
    like = [_split_kv(s) for s in a.like or []]
    where = build_where(eq, like, a.date_range or [], a.where, info["fields"])
    bbox = F.parse_bbox(a.bbox) if a.bbox else None
    if a.max_features < 1:
        raise ValueError("--max-features must be >= 1")
    fc, pages, notes = query(a.url, where, a.out_fields, bbox, a.page_size, a.max_features, info, **kw)
    fc["properties"] = {"source": info["url"], "layer": info["name"], "where": where, "bbox": bbox,
                        "pages": pages, "n_features": len(fc["features"]), "notes": notes,
                        "format_used": "geojson" if info["supports_geojson"] else "esri-json converted",
                        "retrieved_at_utc": F.utc_now()}
    return fc


def build_parser():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("url", help="layer URL ending in /FeatureServer/<n> or /MapServer/<n>")
    ap.add_argument("--info", action="store_true", help="print layer metadata and field list only")
    ap.add_argument("--eq", action="append", metavar="FIELD=VALUE")
    ap.add_argument("--like", action="append", metavar="FIELD=PATTERN")
    ap.add_argument("--date-range", nargs=3, action="append", metavar=("FIELD", "START", "END"))
    ap.add_argument("--where", help="raw where clause; only '1=1' is accepted")
    ap.add_argument("--out-fields", default="*", help="* or comma-separated field names")
    ap.add_argument("--bbox", help="west,south,east,north (WGS84)")
    ap.add_argument("--page-size", type=int, help="records per page (capped at the layer's maxRecordCount)")
    ap.add_argument("--max-features", type=int, default=10000)
    F.add_common_args(ap)
    return ap


def main(argv=None, opener=None):
    return F.cli_main(build_parser(), run, argv, opener)


if __name__ == "__main__":
    sys.exit(main())
