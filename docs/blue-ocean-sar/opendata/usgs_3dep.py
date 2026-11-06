#!/usr/bin/env python3
"""USGS 3DEP elevation from the National Map ImageServer (no key).

Service: https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer
(the best available 3DEP DEM at each place: 1 m lidar where flown, else 1/3
arc-second; elevations are metres above NAVD88).

  export   exportImage -> GeoTIFF for a WGS84 bbox
           bbox is sent as the string "minx,miny,maxx,maxy" with bboxSR=4326;
           size is "width,height" (or derived from --resolution-m);
           --mode image fetches f=image (the TIFF bytes directly),
           --mode json fetches f=json and then downloads the returned href.
  sample   getSamples for one or more points (lon,lat) -> elevation values
  identify identify for one point -> the pixel value at that point

  python usgs_3dep.py export --bbox -83.02,39.95,-83.00,39.97 --resolution-m 1 --out-tif dem.tif
  python usgs_3dep.py sample --point -83.01,39.96 --point -83.005,39.955
  python usgs_3dep.py identify --point -83.01,39.96

The GeoTIFF is saved with a sidecar <file>.json holding its sha256, the request
URL, the UTC fetch time and the HTTP status; a response that is not a TIFF
(ArcGIS reports errors as JSON with HTTP 200) is deleted and reported as a
failure (exit 3).
"""

import argparse
import json
import math
import os
import sys

try:
    from . import fetch as F
except ImportError:
    import fetch as F

SERVICE = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer"
HOSTS = ["elevation.nationalmap.gov"]
MAX_PIXELS = 4000
TIFF_MAGIC = (b"II*\x00", b"MM\x00*", b"II+\x00", b"MM\x00+")
TIFF_MAX_BYTES = 512 * 1024 * 1024


def format_bbox(bbox):
    """[minx, miny, maxx, maxy] -> 'minx,miny,maxx,maxy' (each number once)."""
    if len(bbox) != 4:
        raise ValueError("bbox needs exactly four numbers")
    return ",".join(repr(float(v)) for v in bbox)


def size_for_resolution(bbox, resolution_m):
    """Pixel width/height covering a WGS84 bbox at about `resolution_m` per pixel."""
    if resolution_m <= 0:
        raise ValueError("resolution must be positive")
    w, s, e, n = bbox
    mid = math.radians((s + n) / 2)
    dx = (e - w) * 111320.0 * math.cos(mid)
    dy = (n - s) * 110574.0
    return max(1, math.ceil(dx / resolution_m)), max(1, math.ceil(dy / resolution_m))


def export_params(bbox, size, image_sr=4326, mode="image", interpolation="RSP_BilinearInterpolation"):
    wpx, hpx = size
    if not (1 <= wpx <= MAX_PIXELS and 1 <= hpx <= MAX_PIXELS):
        raise ValueError(f"image size {wpx}x{hpx} outside 1..{MAX_PIXELS} per side; use a smaller bbox "
                         "or coarser --resolution-m")
    if mode not in ("image", "json"):
        raise ValueError("mode must be image or json")
    return {
        "bbox": format_bbox(bbox),
        "bboxSR": "4326",
        "size": f"{int(wpx)},{int(hpx)}",
        "imageSR": str(int(image_sr)),
        "format": "tiff",
        "pixelType": "F32",
        "noData": "-9999",
        "noDataInterpretation": "esriNoDataMatchAny",
        "interpolation": interpolation,
        "f": mode,
    }


def _check_tiff(path):
    with open(path, "rb") as f:
        head = f.read(512)
    if head[:4] in TIFF_MAGIC:
        return
    os.remove(path)
    raise F.FetchError("service did not return a GeoTIFF: " + head.decode("utf-8", "replace")[:300])


def _sidecar(path, r, params):
    meta = {"file": os.path.basename(path), "sha256": r.sha256, "bytes": r.nbytes,
            "url": F.redact_url(r.url), "final_url": F.redact_url(r.final_url), "status": r.status,
            "fetched_at_utc": r.fetched_at, "content_type": r.header("content-type"),
            "request": params, "service": SERVICE}
    with open(path + ".json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=1, sort_keys=True)
        f.write("\n")
    return meta


def export_image(bbox, size, out_tif, image_sr=4326, mode="image", **kw):
    params = export_params(bbox, size, image_sr, mode)
    kw = dict(kw)
    kw.setdefault("max_bytes", TIFF_MAX_BYTES)
    os.makedirs(os.path.dirname(os.path.abspath(out_tif)), exist_ok=True)
    info = None
    if mode == "image":
        r = F.fetch(SERVICE + "/exportImage", allowed_hosts=HOSTS, params=params, stream_to=out_tif, **kw)
    else:
        jkw = dict(kw, max_bytes=F.DEFAULT_MAX_BYTES)
        info = F.fetch_json(SERVICE + "/exportImage", allowed_hosts=HOSTS, params=params, **jkw)
        if "error" in info:
            raise F.FetchError(f"exportImage error: {info['error'].get('message')}")
        href = info.get("href")
        if not href:
            raise F.FetchError("exportImage f=json response has no href")
        r = F.fetch(href, allowed_hosts=HOSTS, stream_to=out_tif, **kw)
    _check_tiff(out_tif)
    meta = _sidecar(out_tif, r, params)
    if info:
        meta["extent"] = info.get("extent")
        meta["width"], meta["height"] = info.get("width"), info.get("height")
    return dict(meta, path=out_tif)


def _point_json(lon, lat):
    return json.dumps({"x": lon, "y": lat, "spatialReference": {"wkid": 4326}}, separators=(",", ":"))


def _value(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return None if x <= -9999 or x != x else x


def get_samples(points, **kw):
    if not points or len(points) > 1000:
        raise ValueError("give 1..1000 points")
    geom = json.dumps({"points": [[lon, lat] for lon, lat in points], "spatialReference": {"wkid": 4326}},
                      separators=(",", ":"))
    params = {"geometry": geom, "geometryType": "esriGeometryMultipoint", "returnFirstValueOnly": "true",
              "interpolation": "RSP_BilinearInterpolation", "outFields": "", "f": "json"}
    d = F.fetch_json(SERVICE + "/getSamples", allowed_hosts=HOSTS, params=params, **kw)
    if "error" in d:
        raise F.FetchError(f"getSamples error: {d['error'].get('message')}")
    out = []
    for s in d.get("samples") or []:
        loc = s.get("location") or {}
        i = s.get("locationId")
        req = points[i] if isinstance(i, int) and 0 <= i < len(points) else None
        out.append({"location_id": i, "lon": req[0] if req else loc.get("x"), "lat": req[1] if req else loc.get("y"),
                    "elevation_m": _value(s.get("value")), "resolution": s.get("resolution"),
                    "raster_id": s.get("rasterId")})
    return out


def identify(lon, lat, **kw):
    params = {"geometry": _point_json(lon, lat), "geometryType": "esriGeometryPoint", "returnGeometry": "false",
              "returnCatalogItems": "false", "f": "json"}
    d = F.fetch_json(SERVICE + "/identify", allowed_hosts=HOSTS, params=params, **kw)
    if "error" in d:
        raise F.FetchError(f"identify error: {d['error'].get('message')}")
    return {"lon": lon, "lat": lat, "elevation_m": _value(d.get("value")), "raw_value": d.get("value"),
            "name": d.get("name")}


def _parse_point(text):
    try:
        lon, lat = (float(v) for v in text.split(","))
    except ValueError:
        raise ValueError(f"point {text!r}: expected LON,LAT")
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise ValueError(f"point {text!r} out of range")
    return lon, lat


def run(a, opener=None):
    kw = F.common_kwargs(a, opener)
    if a.cmd == "export":
        bbox = F.parse_bbox(a.bbox)
        if a.size:
            try:
                size = tuple(int(v) for v in a.size.split(","))
            except ValueError:
                raise ValueError("--size needs WIDTH,HEIGHT")
            if len(size) != 2:
                raise ValueError("--size needs WIDTH,HEIGHT")
        else:
            size = size_for_resolution(bbox, a.resolution_m)
        if a.max_bytes == F.DEFAULT_MAX_BYTES:
            kw["max_bytes"] = TIFF_MAX_BYTES
        return export_image(bbox, size, a.out_tif, a.image_sr, a.mode, **kw)
    pts = [_parse_point(p) for p in a.point or []]
    if not pts:
        raise ValueError("give at least one --point LON,LAT")
    if a.cmd == "sample":
        return {"service": SERVICE, "samples": get_samples(pts, **kw), "retrieved_at_utc": F.utc_now()}
    return {"service": SERVICE, "results": [identify(lon, lat, **kw) for lon, lat in pts],
            "retrieved_at_utc": F.utc_now()}


def build_parser():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("export", help="exportImage -> GeoTIFF")
    e.add_argument("--bbox", required=True, help="minx,miny,maxx,maxy in WGS84 degrees")
    e.add_argument("--size", help="WIDTH,HEIGHT pixels (else from --resolution-m)")
    e.add_argument("--resolution-m", type=float, default=10.0, help="target pixel size in metres")
    e.add_argument("--image-sr", type=int, default=4326, help="output spatial reference WKID")
    e.add_argument("--mode", choices=["image", "json"], default="image", help="f=image or f=json + href")
    e.add_argument("--out-tif", required=True)
    F.add_common_args(e)
    for name, hlp in (("sample", "getSamples for points"), ("identify", "identify for points")):
        p = sub.add_parser(name, help=hlp)
        p.add_argument("--point", action="append", help="LON,LAT (repeat)")
        F.add_common_args(p)
    return ap


def main(argv=None, opener=None):
    return F.cli_main(build_parser(), run, argv, opener)


if __name__ == "__main__":
    sys.exit(main())
