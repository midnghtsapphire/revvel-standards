"""Environment Agency LIDAR DTM for an area of England, via the Defra OGC WCS.

The Environment Agency publishes its 1 m LIDAR Composite DTM (bare earth) as
open data under the Open Government Licence. The Defra spatial data service
exposes it as an OGC Web Coverage Service (WCS 2.0.1). This client:

  capabilities   lists the coverages the service offers, so you can pick one
                 (coverage ids change between releases; none is hard-coded)
  fetch          cuts a box in British National Grid (EPSG:27700) into chunks,
                 requests each with GetCoverage, refuses anything that is not a
                 GeoTIFF (the service returns XML exception reports with HTTP
                 200), mosaics the chunks, and writes one GeoTIFF plus a
                 manifest with the request URLs and SHA-256 of every chunk

The service URL defaults to the address listed for the LIDAR Composite DTM 1 m
dataset at the time of writing. It has NOT been called from the machine this
was written on (the host is not reachable there), so run ``capabilities`` first
and pass ``--wcs-url`` if the address has moved. Axis labels for ``subset`` are
read from the coverage description when possible; override with ``--axes``.

If the WCS is down, download the same tiles by hand from the Defra Data Services
Platform (https://environment.data.gov.uk/survey) and pass the files to the
analysis tools' ``--dem`` option instead.

CLI::

    python ea_lidar.py capabilities
    python ea_lidar.py fetch --coverage COVERAGE_ID --bbox 400100 403500 407600 407800 --out dtm.tif

Exit codes: 0 ok; 1 the service answered but with an error or non-TIFF body;
2 bad arguments or the service could not be reached.
"""

import argparse
import hashlib
import json
import math
import os
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

WCS_URL = "https://environment.data.gov.uk/spatialdata/lidar-composite-digital-terrain-model-dtm-1m/wcs"
UA = {"User-Agent": "revvel-standards blue-ocean-sar ea_lidar.py"}
TIFF_MAGIC = (b"II*\x00", b"MM\x00*", b"II+\x00", b"MM\x00+")  # classic and BigTIFF
MAX_BYTES = 512 * 1024 * 1024


class WCSError(Exception):
    pass


def _get(url, timeout=120, opener=None):
    req = urllib.request.Request(url, headers=UA)
    try:
        with (opener or urllib.request.urlopen)(req, timeout=timeout) as r:  # nosec B310 - https WCS host from the user
            body = r.read(MAX_BYTES + 1)
            ctype = r.headers.get("Content-Type", "") if hasattr(r, "headers") else ""
    except urllib.error.HTTPError as e:
        raise WCSError(f"HTTP {e.code} from {url}") from e
    except (urllib.error.URLError, OSError) as e:
        raise ConnectionError(f"cannot reach {url}: {e}") from e
    if len(body) > MAX_BYTES:
        raise WCSError(f"response larger than {MAX_BYTES} bytes; use a smaller --chunk-m")
    return body, ctype


def _local(tag):
    return tag.rsplit("}", 1)[-1]


def exception_text(body):
    """Text of an OWS ExceptionReport, or None if the body is not one."""
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return None
    if _local(root.tag) != "ExceptionReport":
        return None
    texts = [e.text.strip() for e in root.iter() if _local(e.tag) == "ExceptionText" and e.text]
    return " ".join(texts) or "ExceptionReport"


def capabilities(wcs_url=WCS_URL, opener=None):
    url = wcs_url + "?" + urllib.parse.urlencode({"service": "WCS", "version": "2.0.1", "request": "GetCapabilities"})
    body, _ = _get(url, opener=opener)
    err = exception_text(body)
    if err:
        raise WCSError(err)
    root = ET.fromstring(body)
    out = []
    for cs in root.iter():
        if _local(cs.tag) == "CoverageSummary":
            cid = next((e.text for e in cs if _local(e.tag) == "CoverageId"), None)
            title = next((e.text for e in cs.iter() if _local(e.tag) == "Title"), None)
            if cid:
                out.append({"coverage_id": cid, "title": title})
    return out


def axis_labels(wcs_url, coverage, opener=None):
    """(x_label, y_label) from DescribeCoverage, or None when the service does not say."""
    url = wcs_url + "?" + urllib.parse.urlencode({"service": "WCS", "version": "2.0.1",
                                                  "request": "DescribeCoverage", "coverageId": coverage})
    try:
        body, _ = _get(url, opener=opener)
        root = ET.fromstring(body)
    except (WCSError, ET.ParseError):
        return None
    for e in root.iter():
        if _local(e.tag) in ("Envelope", "EnvelopeWithTimePeriod") and e.get("axisLabels"):
            labels = e.get("axisLabels").split()
            if len(labels) >= 2:
                return labels[0], labels[1]
    return None


def chunks(bbox, chunk_m):
    e0, n0, e1, n1 = bbox
    nx, ny = math.ceil((e1 - e0) / chunk_m), math.ceil((n1 - n0) / chunk_m)
    for j in range(ny):
        for i in range(nx):
            yield (e0 + i * chunk_m, n0 + j * chunk_m, min(e1, e0 + (i + 1) * chunk_m), min(n1, n0 + (j + 1) * chunk_m))


def coverage_url(wcs_url, coverage, box, axes=("E", "N")):
    e0, n0, e1, n1 = box
    q = [("service", "WCS"), ("version", "2.0.1"), ("request", "GetCoverage"), ("coverageId", coverage),
         ("format", "image/tiff"), ("subset", f"{axes[0]}({e0},{e1})"), ("subset", f"{axes[1]}({n0},{n1})")]
    return wcs_url + "?" + urllib.parse.urlencode(q)


def fetch(coverage, bbox, out, wcs_url=WCS_URL, chunk_m=2000.0, axes=None, opener=None):
    e0, n0, e1, n1 = bbox
    if not (e1 > e0 and n1 > n0):
        raise ValueError("bbox must be E0 N0 E1 N1 with E1 > E0 and N1 > N0")
    if not (0 <= e0 <= 700000 and 0 <= n0 <= 1300000 and e1 <= 700000 and n1 <= 1300000):
        raise ValueError("bbox is outside the British National Grid (EPSG:27700) extent")
    axes = axes or axis_labels(wcs_url, coverage, opener) or ("E", "N")
    tmp = tempfile.mkdtemp(prefix="ea_lidar_")
    parts, manifest = [], []
    for k, box in enumerate(chunks(bbox, chunk_m)):
        url = coverage_url(wcs_url, coverage, box, axes)
        body, ctype = _get(url, opener=opener)
        if not body.startswith(TIFF_MAGIC):
            raise WCSError(f"chunk {box} is not a GeoTIFF ({ctype or 'no content type'}): "
                           f"{exception_text(body) or body[:200]!r}")
        path = os.path.join(tmp, f"chunk_{k:03d}.tif")
        with open(path, "wb") as fh:
            fh.write(body)
        parts.append(path)
        manifest.append({"bbox": box, "url": url, "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()})
    import rasterio
    from rasterio.merge import merge
    srcs = [rasterio.open(p) for p in parts]
    try:
        mosaic, transform = merge(srcs)
        profile = srcs[0].profile
        if srcs[0].crs is None:
            raise WCSError("the service returned GeoTIFFs with no CRS")
    finally:
        for s in srcs:
            s.close()
    profile.update(driver="GTiff", height=mosaic.shape[1], width=mosaic.shape[2], transform=transform,
                   compress="deflate", tiled=True, blockxsize=256, blockysize=256)
    with rasterio.open(out, "w", **profile) as dst:
        dst.write(mosaic)
    with open(out, "rb") as fh:
        out_sha = hashlib.sha256(fh.read()).hexdigest()
    rec = {"service": wcs_url, "coverage": coverage, "bbox_epsg27700": list(bbox), "axes": list(axes),
           "chunk_m": chunk_m, "chunks": manifest, "output": os.path.abspath(out), "output_sha256": out_sha,
           "licence": "Open Government Licence v3.0 - contains Environment Agency information"}
    with open(os.path.splitext(out)[0] + "_manifest.json", "w") as fh:
        json.dump(rec, fh, indent=1)
    return rec


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--wcs-url", default=WCS_URL)
    s = p.add_subparsers(dest="cmd", required=True)
    s.add_parser("capabilities")
    f = s.add_parser("fetch")
    f.add_argument("--coverage", required=True, help="coverage id from the capabilities command")
    f.add_argument("--bbox", type=float, nargs=4, required=True, metavar=("E0", "N0", "E1", "N1"))
    f.add_argument("--out", required=True)
    f.add_argument("--chunk-m", type=float, default=2000.0)
    f.add_argument("--axes", nargs=2, help="subset axis labels if DescribeCoverage does not give them, e.g. E N or x y")
    a = p.parse_args(argv)
    try:
        if a.cmd == "capabilities":
            for c in capabilities(a.wcs_url):
                print(f"{c['coverage_id']}\t{c['title'] or ''}")
        else:
            if a.chunk_m <= 0:
                raise ValueError("--chunk-m must be > 0")
            rec = fetch(a.coverage, a.bbox, a.out, a.wcs_url, a.chunk_m, tuple(a.axes) if a.axes else None)
            print(f"{len(rec['chunks'])} chunk(s) -> {rec['output']}  sha256 {rec['output_sha256']}")
    except (ValueError, ConnectionError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    except WCSError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
