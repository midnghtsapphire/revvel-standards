#!/usr/bin/env python3
"""NASA CMR granule search (and optional Earthdata download).

Search is open: GET https://cmr.earthdata.nasa.gov/search/granules.json with
short_name, bounding_box and temporal. Paging uses the CMR-Search-After header:
each response carries one, and the next request sends it back unchanged, until
a response has no entries, no header, or --max-granules is reached. CMR-Hits
gives the total.

Short names you will want for canopy / ground structure:

  GEDI02_A   GEDI L2A elevation and height metrics (LP DAAC)
  GEDI02_B   GEDI L2B canopy cover and vertical profile
  ATL08      ICESat-2 land and vegetation height (NSIDC)
  ATL03      ICESat-2 geolocated photons

Downloads (--download-dir) need an Earthdata Login account. The token comes
from env EARTHDATA_TOKEN or a file named with --token-file (sent as a bearer
token, only to *.earthdata.nasa.gov / *.earthdatacloud.nasa.gov hosts); failing
that, the urs.earthdata.nasa.gov entry in ~/.netrc is used as basic auth, sent
only to urs.earthdata.nasa.gov. Never pass a token on the command line.

  python cmr.py --short-name GEDI02_A --bbox -83.1,39.9,-82.9,40.05 \\
      --temporal 2022-01-01/2022-12-31 --out gedi.json
  EARTHDATA_TOKEN=... python cmr.py --short-name ATL08 --bbox ... \\
      --temporal ... --max-granules 2 --download-dir granules/
"""

import argparse
import base64
import netrc
import os
import re
import sys
import urllib.parse

try:
    from . import fetch as F
except ImportError:
    import fetch as F

CMR_URL = "https://cmr.earthdata.nasa.gov/search/granules.json"
CMR_HOSTS = ["cmr.earthdata.nasa.gov"]
URS_HOST = "urs.earthdata.nasa.gov"
# Data hosts that serve GEDI / ICESat-2 granules (and the redirects they make).
DATA_HOSTS = [
    "*.earthdata.nasa.gov", "*.earthdatacloud.nasa.gov", "e4ftl01.cr.usgs.gov",
    "n5eil01u.ecs.nsidc.org", "*.s3.us-west-2.amazonaws.com",
]
TOKEN_HOSTS = ["*.earthdata.nasa.gov", "*.earthdatacloud.nasa.gov"]
ALIASES = {"gedi-l2a": "GEDI02_A", "gedi-l2b": "GEDI02_B", "atl08": "ATL08", "atl03": "ATL03"}
DATA_REL = "http://esipfed.org/ns/fedsearch/1.1/data#"
_SHORT_RE = re.compile(r"^[A-Za-z0-9_.\-]+$")
DOWNLOAD_MAX_BYTES = 8 * 1024 ** 3


def short_name(name):
    n = ALIASES.get(name.lower(), name)
    if not _SHORT_RE.match(n):
        raise ValueError(f"bad short name {name!r}")
    return n


def search(short, bbox=None, temporal=None, page_size=100, max_granules=1000, version=None,
           provider=None, **kw):
    """Return (granules, pages, hits)."""
    if not 1 <= page_size <= 2000:
        raise ValueError("page size must be 1..2000")
    params = [("short_name", short), ("page_size", str(min(page_size, max_granules))),
              ("sort_key[]", "start_date")]
    if version:
        params.append(("version", version))
    if provider:
        params.append(("provider", provider))
    if bbox:
        params.append(("bounding_box", ",".join(repr(v) for v in bbox)))
    if temporal:
        s, e = temporal
        params.append(("temporal", f"{s or ''},{e or ''}"))
    granules, pages, hits = [], 0, None
    search_after = None
    while len(granules) < max_granules:
        headers = {"Accept": "application/json"}
        if search_after:
            headers["CMR-Search-After"] = search_after
        r = F.fetch(CMR_URL, allowed_hosts=CMR_HOSTS, params=params, headers=headers, **kw)
        pages += 1
        if hits is None and r.header("cmr-hits") is not None:
            hits = int(r.header("cmr-hits"))
        entries = (r.json().get("feed") or {}).get("entry") or []
        granules.extend(entries)
        nxt = r.header("cmr-search-after")
        if not entries or not nxt or nxt == search_after:
            break
        search_after = nxt
    return granules[:max_granules], pages, hits


def summarize(entry):
    data = [lk["href"] for lk in entry.get("links") or []
            if lk.get("rel") == DATA_REL and lk.get("href") and not lk.get("inherited")]
    return {
        "id": entry.get("id"),
        "title": entry.get("title") or entry.get("producer_granule_id"),
        "time_start": entry.get("time_start"),
        "time_end": entry.get("time_end"),
        "size_mb": float(entry["granule_size"]) if entry.get("granule_size") else None,
        "boxes": entry.get("boxes"),
        "polygons": entry.get("polygons"),
        "data_links": data,
    }


def earthdata_auth(token_file=None, netrc_path=None):
    """Return (headers, auth_hosts, secrets) for Earthdata downloads, or raise."""
    token = F.secret_from_env_or_file("EARTHDATA_TOKEN", token_file)
    if token:
        return {"Authorization": f"Bearer {token}"}, TOKEN_HOSTS, [token]
    path = netrc_path or os.path.expanduser("~/.netrc")
    try:
        creds = netrc.netrc(path).authenticators(URS_HOST)
    except (OSError, netrc.NetrcParseError):
        creds = None
    if creds and creds[0] and creds[2]:
        pair = base64.b64encode(f"{creds[0]}:{creds[2]}".encode()).decode()
        return {"Authorization": f"Basic {pair}"}, [URS_HOST], [creds[2], pair]
    raise ValueError("downloads need EARTHDATA_TOKEN (env), --token-file, or a ~/.netrc entry for "
                     "urs.earthdata.nasa.gov")


def download(url, out_dir, auth, **kw):
    headers, auth_hosts, secrets = auth
    name = os.path.basename(urllib.parse.urlsplit(url).path) or "granule"
    if name in (".", "..") or "/" in name:
        raise ValueError(f"refusing file name from {url}")
    os.makedirs(out_dir, exist_ok=True)
    dest = os.path.join(out_dir, name)
    kw = dict(kw)
    kw.setdefault("max_bytes", DOWNLOAD_MAX_BYTES)
    r = F.fetch(url, allowed_hosts=DATA_HOSTS, headers=dict(headers), auth_hosts=auth_hosts,
                secrets=secrets, stream_to=dest, **kw)
    return {"url": F.redact_url(url, secrets), "path": dest, "sha256": r.sha256, "bytes": r.nbytes,
            "fetched_at_utc": r.fetched_at}


def run(a, opener=None):
    kw = F.common_kwargs(a, opener)
    short = short_name(a.short_name)
    bbox = F.parse_bbox(a.bbox) if a.bbox else None
    temporal = F.parse_interval(a.temporal) if a.temporal else None
    if a.max_granules < 1:
        raise ValueError("--max-granules must be >= 1")
    auth = earthdata_auth(a.token_file) if a.download_dir else None
    grans, pages, hits = search(short, bbox, temporal, a.page_size, a.max_granules, a.version, a.provider, **kw)
    out = [summarize(g) for g in grans]
    res = {"short_name": short, "bbox": bbox, "temporal": temporal, "cmr_hits": hits, "pages": pages,
           "n_granules": len(out), "granules": out, "retrieved_at_utc": F.utc_now()}
    if auth:
        dkw = dict(kw)
        if a.max_bytes == F.DEFAULT_MAX_BYTES:
            dkw["max_bytes"] = DOWNLOAD_MAX_BYTES
        res["downloads"] = []
        for g in out:
            for link in g["data_links"]:
                res["downloads"].append(download(link, a.download_dir, auth, **dkw))
    return res


def build_parser():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--short-name", required=True, help="collection short name or alias (atl08, gedi-l2a, ...)")
    ap.add_argument("--version", help="collection version, e.g. 002 or 006")
    ap.add_argument("--provider", help="CMR provider, e.g. LPCLOUD or NSIDC_CPRD")
    ap.add_argument("--bbox", help="west,south,east,north (WGS84)")
    ap.add_argument("--temporal", help="start/end, ISO dates or datetimes")
    ap.add_argument("--page-size", type=int, default=100)
    ap.add_argument("--max-granules", type=int, default=200)
    ap.add_argument("--download-dir", help="download each granule's data links here (needs Earthdata auth)")
    ap.add_argument("--token-file", help="file holding an Earthdata bearer token (else env EARTHDATA_TOKEN)")
    F.add_common_args(ap)
    return ap


def main(argv=None, opener=None):
    return F.cli_main(build_parser(), run, argv, opener)


if __name__ == "__main__":
    sys.exit(main())
