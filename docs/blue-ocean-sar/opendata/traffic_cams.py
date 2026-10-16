#!/usr/bin/env python3
"""Public traffic cameras near a point, from the OpenTrafficCamMap catalogue.

Catalogue: https://raw.githubusercontent.com/AidanWelch/OpenTrafficCamMap/master/cameras/<COUNTRY>.json
(community-maintained list of cameras that DOTs publish openly). Its shape is
{state: {county: [camera, ...]}} where each camera has description, latitude,
longitude, url, encoding, format (IMAGE_STREAM = a still JPEG refreshed by the
DOT; M3U8 = an HLS video stream), and optionally direction / updateRate /
markedForReview.

  python traffic_cams.py --country USA --lat 36.97 --lon -86.47 --radius-km 5
  python traffic_cams.py --catalog-file USA.json --lat ... --lon ... \\
      --snapshot-nearest 3 --snapshot-dir snaps/

Camera ids are "<state>/<county>/<index in that county's list>".

Snapshots: a still is fetched only for an IMAGE_STREAM camera, only from the
exact URL listed in the catalogue (http or https - many DOT stills are plain
http), only from that URL's host (no cross-host redirects), only if the
response is an image, and at most --max-snapshots per run. Each image is saved
with a JSON sidecar holding sha256, UTC fetch time, status, the catalogue entry
and the catalogue's own sha256. Video streams (M3U8) and RTSP URLs are listed
but never fetched; there is no credential handling and no private cameras.
If snapshots were asked for and none could be fetched, the exit code is 3.
"""

import argparse
import hashlib
import json
import math
import os
import re
import sys
import urllib.parse

try:
    from . import fetch as F
except ImportError:
    import fetch as F

CATALOG_BASE = "https://raw.githubusercontent.com/AidanWelch/OpenTrafficCamMap/master/cameras/"
CATALOG_HOSTS = ["raw.githubusercontent.com"]
SNAPSHOT_MAX_BYTES = 10 * 1024 * 1024
MAX_SNAPSHOTS = 20
_COUNTRY_RE = re.compile(r"^[A-Za-z_]{2,40}$")
EARTH_R_KM = 6371.0088


def haversine_km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_R_KM * math.asin(min(1.0, math.sqrt(h)))


def load_catalog(country=None, catalog_file=None, save_to=None, **kw):
    """Return (catalogue dict, provenance dict)."""
    if catalog_file:
        with open(catalog_file, "rb") as f:
            raw = f.read()
        prov = {"catalog_file": os.path.abspath(catalog_file), "sha256": hashlib.sha256(raw).hexdigest()}
    else:
        if not country or not _COUNTRY_RE.match(country):
            raise ValueError("--country must be a catalogue name such as USA")
        r = F.fetch(CATALOG_BASE + country + ".json", allowed_hosts=CATALOG_HOSTS, **kw)
        raw = r.body
        prov = {"catalog_url": r.url, "sha256": r.sha256, "fetched_at_utc": r.fetched_at}
        if save_to:
            with open(save_to, "wb") as f:
                f.write(raw)
            prov["saved_to"] = os.path.abspath(save_to)
    try:
        cat = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError) as e:
        raise ValueError(f"catalogue is not JSON: {e}")
    if not isinstance(cat, dict):
        raise ValueError("catalogue should be {state: {county: [camera, ...]}}")
    return cat, prov


def iter_cameras(cat):
    for state, counties in cat.items():
        if not isinstance(counties, dict):
            continue
        for county, cams in counties.items():
            for i, cam in enumerate(cams or []):
                try:
                    lat, lon = float(cam["latitude"]), float(cam["longitude"])
                except (KeyError, TypeError, ValueError):
                    continue
                yield dict(cam, id=f"{state}/{county}/{i}", state=state, county=county, latitude=lat, longitude=lon)


def within_radius(cat, lat, lon, radius_km, fmt=None, limit=None):
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError("lat/lon out of range")
    if not 0 < radius_km <= 500:
        raise ValueError("radius must be in (0, 500] km")
    hits = []
    for cam in iter_cameras(cat):
        if fmt and cam.get("format") != fmt:
            continue
        d = haversine_km(lat, lon, cam["latitude"], cam["longitude"])
        if d <= radius_km:
            cam["distance_km"] = round(d, 3)
            hits.append(cam)
    hits.sort(key=lambda c: (c["distance_km"], c["id"]))
    return hits[:limit] if limit else hits


def _catalogue_urls(cat):
    return {cam.get("url") for cam in iter_cameras(cat)}


def snapshot(cam, cat, out_dir, catalog_prov=None, **kw):
    """Fetch one still image for a catalogue camera. Returns a record (never raises
    for a remote failure; the record carries 'error')."""
    url = cam.get("url") or ""
    rec = {"id": cam["id"], "description": cam.get("description"), "url": url}
    if cam.get("format") != "IMAGE_STREAM":
        rec["skipped"] = f"format {cam.get('format')} is a stream, not a still image; not fetched"
        return rec
    if url not in _catalogue_urls(cat):
        rec["skipped"] = "URL is not in the public catalogue"
        return rec
    scheme = url.split(":", 1)[0].lower()
    if scheme not in ("http", "https"):
        rec["skipped"] = f"scheme {scheme} not fetched"
        return rec
    host = (urllib.parse.urlsplit(url).hostname or "").lower()
    kw = dict(kw)
    kw.setdefault("max_bytes", SNAPSHOT_MAX_BYTES)
    try:
        r = F.fetch(url, allowed_hosts=[host], allow_http=True, same_host_redirects_only=True,
                    headers={"Accept": "image/*"}, **kw)
    except F.FetchError as e:
        rec["error"] = str(e)
        return rec
    ctype = (r.header("content-type") or "").split(";")[0].strip().lower()
    if not ctype.startswith("image/"):
        rec["error"] = f"response is {ctype or 'untyped'}, not an image; not saved"
        return rec
    ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp"}.get(ctype, ".img")
    os.makedirs(out_dir, exist_ok=True)
    safe_id = re.sub(r"[^A-Za-z0-9_.-]+", "_", cam["id"])
    stamp = r.fetched_at.replace(":", "").replace("-", "")
    path = os.path.join(out_dir, f"{safe_id}_{stamp}_{r.sha256[:12]}{ext}")
    with open(path, "wb") as f:
        f.write(r.body)
    rec.update({"path": path, "sha256": r.sha256, "bytes": r.nbytes, "status": r.status, "content_type": ctype,
                "fetched_at_utc": r.fetched_at, "final_url": r.final_url})
    side = dict(rec, camera=cam, catalog=catalog_prov or {})
    with open(path + ".json", "w", encoding="utf-8") as f:
        json.dump(side, f, indent=1, sort_keys=True)
        f.write("\n")
    return rec


def run(a, opener=None):
    kw = F.common_kwargs(a, opener)
    if not a.catalog_file and not a.country:
        raise ValueError("give --country (fetch catalogue) or --catalog-file")
    want_snaps = bool(a.snapshot_nearest or a.snapshot_id)
    if want_snaps and not a.snapshot_dir:
        raise ValueError("snapshots need --snapshot-dir")
    if a.snapshot_nearest is not None and not 1 <= a.snapshot_nearest <= a.max_snapshots:
        raise ValueError(f"--snapshot-nearest must be 1..{a.max_snapshots}")
    if a.max_snapshots > MAX_SNAPSHOTS:
        raise ValueError(f"--max-snapshots is capped at {MAX_SNAPSHOTS}")
    cat, prov = load_catalog(a.country, a.catalog_file, a.save_catalog, **kw)
    res = {"catalog": prov, "retrieved_at_utc": F.utc_now()}
    hits = []
    if a.lat is not None or a.lon is not None:
        if a.lat is None or a.lon is None:
            raise ValueError("--lat and --lon go together")
        hits = within_radius(cat, a.lat, a.lon, a.radius_km, a.format, a.limit)
        res.update({"center": [a.lat, a.lon], "radius_km": a.radius_km, "n_cameras": len(hits), "cameras": hits})
    elif not a.snapshot_id:
        res["n_cameras_total"] = sum(1 for _ in iter_cameras(cat))
    if want_snaps:
        targets = []
        if a.snapshot_id:
            by_id = {c["id"]: c for c in iter_cameras(cat)}
            for cid in a.snapshot_id:
                if cid not in by_id:
                    raise ValueError(f"camera id {cid!r} not in catalogue")
                targets.append(by_id[cid])
        if a.snapshot_nearest:
            targets += [c for c in hits if c.get("format") == "IMAGE_STREAM"][:a.snapshot_nearest]
        targets = targets[:a.max_snapshots]
        snaps = [snapshot(c, cat, a.snapshot_dir, prov, **kw) for c in targets]
        res["snapshots"] = snaps
        if not any("sha256" in s for s in snaps):
            F.write_output(res, a.out)
            raise F.FetchError(f"no snapshot fetched ({len(snaps)} attempted); details in output")
    return res


def build_parser():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--country", help="catalogue name, e.g. USA (fetched from raw.githubusercontent.com)")
    ap.add_argument("--catalog-file", help="use a local copy of the catalogue instead")
    ap.add_argument("--save-catalog", help="save the fetched catalogue here")
    ap.add_argument("--lat", type=float)
    ap.add_argument("--lon", type=float)
    ap.add_argument("--radius-km", type=float, default=5.0)
    ap.add_argument("--format", choices=["IMAGE_STREAM", "M3U8"], help="only this camera format")
    ap.add_argument("--limit", type=int, help="nearest N only")
    ap.add_argument("--snapshot-nearest", type=int, help="fetch stills from the N nearest IMAGE_STREAM cameras")
    ap.add_argument("--snapshot-id", action="append", help="fetch a still from this camera id (repeat)")
    ap.add_argument("--snapshot-dir", help="where stills and their sidecars go")
    ap.add_argument("--max-snapshots", type=int, default=5)
    F.add_common_args(ap)
    return ap


def main(argv=None, opener=None):
    return F.cli_main(build_parser(), run, argv, opener)


if __name__ == "__main__":
    sys.exit(main())
