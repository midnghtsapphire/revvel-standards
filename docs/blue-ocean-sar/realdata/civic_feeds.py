"""Public civic data: Socrata records, ArcGIS features, RSS/Atom notices, DOT camera stills.

All sources are published open data or public feeds; nothing here logs in.

  socrata DOMAIN DATASET   Socrata Open Data (SODA) JSON, e.g. city permits.
                           --q full-text search, --where SoQL filter.
  arcgis LAYER_URL         an ArcGIS FeatureServer/MapServer layer, as GeoJSON in
                           EPSG:4326 (f=geojson, outSR=4326), paged with
                           resultOffset until exceededTransferLimit is false.
                           Asking for f=json instead returns Esri JSON in the
                           service's own projection (e.g. State Plane feet).
  feed URL                 RSS <item> and Atom <entry> notices.
  camera URL NAME          one still image, saved only if the response is an
                           image (Content-Type image/* and JPEG/PNG/GIF bytes);
                           a web or error page is refused. Each saved still
                           gets a manifest row with UTC time, SHA-256 and the
                           server's Last-Modified.
  ohgo-cameras             Ohio DOT OHGO public API camera list (region, route
                           and location filters) with each camera's image URL.
                           Needs a free key from https://publicapi.ohgo.com in
                           the OHGO_API_KEY environment variable. Field names
                           follow the OHGO v1 docs as understood when written
                           (results[].cameraViews[].largeUrl); not yet checked
                           against the live API.

Network: ``urllib`` only.

CLI::

    python civic_feeds.py socrata data.cityofchicago.org ydr8-5enu --q CONCRETE --limit 20
    python civic_feeds.py arcgis https://gis.example.gov/arcgis/rest/services/Parcels/MapServer/0 --where "1=1"
    python civic_feeds.py feed https://example.gov/notices.rss
    python civic_feeds.py ohgo-cameras --region columbus --match I-70 High
    python civic_feeds.py camera https://cdn.example/cam.jpg I70_High --out stills

Exit codes: 0 ok; 1 the server answered but not with what was asked for
(error JSON, a non-image "camera" response, no OHGO match); 2 bad arguments,
missing key, or the server could not be reached.
"""

import argparse
import csv
import datetime as dt
import hashlib
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

UA = "revvel-standards blue-ocean-sar civic_feeds.py (public records research)"
IMAGE_MAGIC = {b"\xff\xd8\xff": ".jpg", b"\x89PNG\r\n\x1a\n": ".png", b"GIF87a": ".gif", b"GIF89a": ".gif"}
OHGO_API = "https://publicapi.ohgo.com/api/v1"


class Refused(Exception):
    """The server answered, but not with what was asked for."""


def get(url, params=None, headers=None, opener=None, timeout=30):
    if params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=dict({"User-Agent": UA}, **(headers or {})))
    try:
        with (opener or urllib.request.urlopen)(req, timeout=timeout) as r:  # nosec B310 - https URL from the user
            status = getattr(r, "status", 200)
            headers = dict(r.headers.items()) if hasattr(r, "headers") else {}
            return status, headers, r.read()
    except urllib.error.HTTPError as e:
        raise Refused(f"HTTP {e.code} from {url}") from e
    except (urllib.error.URLError, OSError) as e:
        raise ConnectionError(f"cannot reach {url}: {e}") from e


def _json(body, what):
    try:
        return json.loads(body)
    except ValueError as e:
        raise Refused(f"{what}: response is not JSON") from e


def socrata(domain, dataset, q=None, where=None, limit=1000, opener=None):
    params = {"$limit": limit}
    if q:
        params["$q"] = q
    if where:
        params["$where"] = where
    _, _, body = get(f"https://{domain}/resource/{dataset}.json", params, opener=opener)
    rows = _json(body, "socrata")
    if isinstance(rows, dict) and rows.get("error"):
        raise Refused(f"socrata: {rows.get('message') or rows}")
    return rows


def arcgis(layer_url, where="1=1", max_features=5000, page=1000, opener=None):
    feats, offset = [], 0
    while len(feats) < max_features:
        params = {"where": where, "outFields": "*", "f": "geojson", "outSR": 4326,
                  "resultOffset": offset, "resultRecordCount": min(page, max_features - len(feats))}
        _, _, body = get(layer_url.rstrip("/") + "/query", params, opener=opener)
        fc = _json(body, "arcgis")
        if "error" in fc:
            raise Refused(f"arcgis: {fc['error']}")
        got = fc.get("features", [])
        feats += got
        more = fc.get("exceededTransferLimit") or (fc.get("properties") or {}).get("exceededTransferLimit")
        if not got or not more:
            break
        offset += len(got)
    return {"type": "FeatureCollection", "features": feats}


def feed(url, opener=None):
    _, _, body = get(url, opener=opener)
    try:
        root = ET.fromstring(body)
    except ET.ParseError as e:
        raise Refused(f"feed: not XML ({e})") from e
    out = []
    for el in root.iter():
        if el.tag.split("}")[-1] not in ("item", "entry"):
            continue
        kid = {c.tag.split("}")[-1]: c for c in el}
        link = kid.get("link")

        def first(*keys):
            return next(((kid[k].text or "") for k in keys if k in kid), "")
        out.append({"title": ((kid["title"].text if "title" in kid else "") or "").strip(),
                    "link": ((link.get("href") or link.text or "") if link is not None else "").strip(),
                    "date": first("pubDate", "updated", "published"),
                    "summary": first("description", "summary", "content")})
    return out


def camera(url, name, out_dir, opener=None, now=None):
    _, headers, body = get(url, opener=opener)
    ctype = (headers.get("Content-Type") or headers.get("content-type") or "").split(";")[0].strip().lower()
    ext = next((e for magic, e in IMAGE_MAGIC.items() if body.startswith(magic)), None)
    if not ctype.startswith("image/") or ext is None:
        raise Refused(f"{name}: not an image ({ctype or 'no content type'}); nothing saved")
    t = now or dt.datetime.now(dt.timezone.utc)
    os.makedirs(out_dir, exist_ok=True)
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in name)
    path = os.path.join(out_dir, f"{safe}_{t:%Y%m%dT%H%M%SZ}{ext}")
    with open(path, "wb") as fh:
        fh.write(body)
    sha = hashlib.sha256(body).hexdigest()
    man = os.path.join(out_dir, "manifest.csv")
    new = not os.path.exists(man)
    with open(man, "a", newline="") as fh:
        w = csv.writer(fh)
        if new:
            w.writerow(["saved_utc", "name", "url", "sha256", "bytes", "last_modified", "file"])
        w.writerow([t.isoformat(timespec="seconds"), name, url, sha, len(body),
                    headers.get("Last-Modified", ""), os.path.basename(path)])
    return path, sha


def ohgo_cameras(region=None, match=(), key=None, opener=None):
    key = key or os.environ.get("OHGO_API_KEY")
    if not key:
        raise ValueError("set OHGO_API_KEY (free key from https://publicapi.ohgo.com)")
    params = {"page-all": "true"}
    if region:
        params["region"] = region
    _, _, body = get(f"{OHGO_API}/cameras", params, headers={"Authorization": f"APIKEY {key}"}, opener=opener)
    data = _json(body, "ohgo")
    out = []
    for cam in data.get("results", []):
        text = " ".join(str(cam.get(k, "")) for k in ("mainRoute", "location", "description")).lower()
        if all(m.lower() in text for m in match):
            views = [v.get("largeUrl") or v.get("smallUrl") for v in cam.get("cameraViews", [])]
            out.append({"id": cam.get("id"), "description": cam.get("description") or cam.get("location"),
                        "lat": cam.get("latitude"), "lon": cam.get("longitude"), "image_urls": [v for v in views if v]})
    return out


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    s = p.add_subparsers(dest="cmd", required=True)
    so = s.add_parser("socrata")
    so.add_argument("domain")
    so.add_argument("dataset")
    so.add_argument("--q")
    so.add_argument("--where")
    so.add_argument("--limit", type=int, default=1000)
    ar = s.add_parser("arcgis")
    ar.add_argument("layer_url")
    ar.add_argument("--where", default="1=1")
    ar.add_argument("--max", type=int, default=5000)
    fe = s.add_parser("feed")
    fe.add_argument("url")
    ca = s.add_parser("camera")
    ca.add_argument("url")
    ca.add_argument("name")
    ca.add_argument("--out", default="camera_stills")
    oh = s.add_parser("ohgo-cameras")
    oh.add_argument("--region")
    oh.add_argument("--match", nargs="*", default=[], help="words that must all appear in route/location/description")
    a = p.parse_args(argv)
    try:
        if a.cmd == "socrata":
            res = socrata(a.domain, a.dataset, a.q, a.where, a.limit)
        elif a.cmd == "arcgis":
            res = arcgis(a.layer_url, a.where, a.max)
        elif a.cmd == "feed":
            res = feed(a.url)
        elif a.cmd == "camera":
            path, sha = camera(a.url, a.name, a.out)
            res = {"file": path, "sha256": sha}
        else:
            res = ohgo_cameras(a.region, a.match)
            if not res:
                raise Refused("no OHGO camera matched")
        json.dump(res, sys.stdout, indent=1)
        print()
    except (ValueError, ConnectionError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    except Refused as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
