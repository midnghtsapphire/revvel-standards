#!/usr/bin/env python3
"""STAC API item search against known public catalogues.

Catalogues (all searchable without a key):

  earth-search        https://earth-search.aws.element84.com/v1   (Element 84, AWS open data)
  planetary-computer  https://planetarycomputer.microsoft.com/api/stac/v1
                      asset hrefs on Azure Blob need a short-lived SAS token from
                      /api/sas/v1/token/<collection>; --sign fetches it (anonymous,
                      or with PC_SDK_SUBSCRIPTION_KEY for higher limits)
  cdse                https://stac.dataspace.copernicus.eu/v1     (Copernicus Data Space;
                      search is open, asset downloads need a CDSE account - not done here)
  cmr-lpcloud         https://cmr.earthdata.nasa.gov/stac/LPCLOUD  (NASA CMR-STAC: GEDI, HLS, ...)
  cmr-nsidc           https://cmr.earthdata.nasa.gov/stac/NSIDC_CPRD (ICESat-2 ATL03/ATL08, ...)
  cmr-ornl            https://cmr.earthdata.nasa.gov/stac/ORNL_CLOUD (GEDI L4A/L4B, ...)
                      search is open; --download-dir fetches the selected assets with an
                      Earthdata bearer token from env EARTHDATA_TOKEN (or --token-file).
                      The token is sent only on downloads, only to Earthdata hosts.

The search is POST <root>/search with a JSON body (bbox, datetime, collections,
query, limit). Pages are followed through the response's rel="next" link, which
may be a GET href or a POST with its own body (merged into the previous body when
the link says "merge": true), until --max-items or no next link.

  python stac.py --catalog earth-search --collections sentinel-2-l2a \\
      --bbox -83.10,39.90,-82.90,40.05 --datetime 2024-06-01/2024-06-30 \\
      --max-cloud 20 --band red --out s2.json
  EARTHDATA_TOKEN=... python stac.py --catalog cmr-lpcloud --collections GEDI02_A_002 \\
      --bbox ... --datetime ... --max-items 2 --download-dir gedi/
  python stac.py --catalog planetary-computer --collections sentinel-2-l2a \\
      --bbox ... --datetime ... --query "eo:cloud_cover<10" --band B04 --sign

Output: one record per item with id, collection, datetime, cloud cover, bbox and
asset hrefs (all assets, or only those matching --band by asset key, eo:bands /
bands name or common_name). Nothing is downloaded unless --download-dir is
given for a CMR-STAC catalogue.

pystac-client is not needed; this uses only the standard library.
"""

import argparse
import re
import sys
import urllib.parse

try:
    from . import cmr
    from . import fetch as F
except ImportError:
    import cmr
    import fetch as F

CATALOGS = {
    "earth-search": {
        "root": "https://earth-search.aws.element84.com/v1",
        "hosts": ["earth-search.aws.element84.com"],
    },
    "planetary-computer": {
        "root": "https://planetarycomputer.microsoft.com/api/stac/v1",
        "hosts": ["planetarycomputer.microsoft.com"],
        "sas": "https://planetarycomputer.microsoft.com/api/sas/v1/token/",
    },
    # "cdse": {
    #     "root": "https://stac.dataspace.copernicus.eu/v1",
    #     "hosts": ["stac.dataspace.copernicus.eu"],
    # },
    # Replaced (review 2026-10-16): CDSE filters with CQL2, not the query extension (as in opendata-rs).
    "cdse": {
        "root": "https://stac.dataspace.copernicus.eu/v1",
        "hosts": ["stac.dataspace.copernicus.eu"],
        "cql2": True,
    },
}
CMR_STAC_PROVIDERS = {"cmr-lpcloud": "LPCLOUD", "cmr-nsidc": "NSIDC_CPRD", "cmr-ornl": "ORNL_CLOUD"}
for _name, _prov in CMR_STAC_PROVIDERS.items():
    CATALOGS[_name] = {"root": f"https://cmr.earthdata.nasa.gov/stac/{_prov}",
                       "hosts": ["cmr.earthdata.nasa.gov"], "earthdata": True}
CLOUD_KEYS = ("eo:cloud_cover", "cloud_cover", "s2:cloud_coverage_assessment")
QUERY_OPS = {"<": "lt", "<=": "lte", ">": "gt", ">=": "gte", "=": "eq", "!=": "neq"}
CQL2_OPS = {"lt": "<", "lte": "<=", "gt": ">", "gte": ">=", "eq": "=", "neq": "<>"}
_QUERY_RE = re.compile(r"^([A-Za-z0-9_:.\-]+)\s*(<=|>=|!=|=|<|>)\s*(.+)$")
_COLLECTION_RE = re.compile(r"^[A-Za-z0-9_.\-]+$")


def parse_query(exprs):
    """['eo:cloud_cover<20', 'platform=sentinel-2a'] -> STAC query-extension dict."""
    q = {}
    for e in exprs or []:
        m = _QUERY_RE.match(e.strip())
        if not m:
            raise ValueError(f"query {e!r}: expected PROPERTY OP VALUE with OP one of {', '.join(QUERY_OPS)}")
        prop, op, raw = m.group(1), m.group(2), m.group(3).strip()
        try:
            val = int(raw) if re.fullmatch(r"-?\d+", raw) else float(raw)
        except ValueError:
            val = raw.strip("'\"")
        q.setdefault(prop, {})[QUERY_OPS[op]] = val
    return q


def query_to_cql2(query):
    """STAC query-extension dict -> CQL2-JSON filter (one comparison, or an "and" of several)."""
    args = []
    for prop, ops in query.items():
        for op, val in ops.items():
            if op not in CQL2_OPS:
                raise ValueError(f"query operator {op!r} has no CQL2 equivalent")
            args.append({"op": CQL2_OPS[op], "args": [{"property": prop}, val]})
    return args[0] if len(args) == 1 else {"op": "and", "args": args}


# def build_search_body(bbox=None, datetime_range=None, collections=None, query=None, limit=100, intersects=None):
# Replaced (review 2026-10-16): new `cql2` flag so CDSE gets a CQL2-JSON filter instead of an ignored query.
def build_search_body(bbox=None, datetime_range=None, collections=None, query=None, limit=100, intersects=None,
                      cql2=False):
    if limit < 1 or limit > 1000:
        raise ValueError("limit must be 1..1000")
    body = {"limit": limit}
    if bbox:
        body["bbox"] = bbox
    if intersects:
        body["intersects"] = intersects
    if datetime_range:
        s, e = datetime_range
        body["datetime"] = f"{s or '..'}/{e or '..'}"
    if collections:
        for c in collections:
            if not _COLLECTION_RE.match(c):
                raise ValueError(f"bad collection id {c!r}")
        body["collections"] = list(collections)
    # if query:
    #     body["query"] = query
    # Replaced (review 2026-10-16): CQL2-JSON for catalogues that do not implement the query extension.
    if query and cql2:
        body["filter-lang"] = "cql2-json"
        body["filter"] = query_to_cql2(query)
    elif query:
        body["query"] = query
    return body


def _next_link(page):
    for link in page.get("links", []) or []:
        if link.get("rel") == "next" and link.get("href"):
            return link
    return None


def search(catalog, body, max_items=500, **kw):
    """Run the search and follow next links. Returns (items, pages, matched)."""
    cat = CATALOGS[catalog]
    hosts = cat["hosts"]
    url = cat["root"] + "/search"
    method, cur_body = "POST", dict(body)
    items, pages, matched = [], 0, None
    seen = set()
    while url and len(items) < max_items:
        key = (method, url, repr(sorted(cur_body.items())) if cur_body else "")
        if key in seen:
            raise F.FetchError(f"pagination loop at {url}")
        seen.add(key)
        if method == "POST":
            page = F.fetch_json(url, allowed_hosts=hosts, method="POST", json_body=cur_body,
                                headers={"Accept": "application/geo+json, application/json"}, **kw)
        else:
            page = F.fetch_json(url, allowed_hosts=hosts, headers={"Accept": "application/geo+json"}, **kw)
        pages += 1
        if matched is None:
            matched = page.get("numberMatched") or (page.get("context") or {}).get("matched")
        feats = page.get("features") or []
        items.extend(feats)
        link = _next_link(page)
        if not link or not feats:
            break
        url = link["href"]
        method = (link.get("method") or "GET").upper()
        if method == "POST":
            nb = link.get("body") or {}
            cur_body = dict(cur_body, **nb) if link.get("merge") else (nb or cur_body)
        else:
            cur_body = None
    return items[:max_items], pages, matched


def cloud_cover(props):
    for k in CLOUD_KEYS:
        if props.get(k) is not None:
            return props[k]
    return None


def _band_names(asset):
    names = set()
    for b in (asset.get("eo:bands") or []) + (asset.get("bands") or []):
        for k in ("name", "common_name", "eo:common_name"):
            if b.get(k):
                names.add(str(b[k]).lower())
    return names


def asset_matches_band(key, asset, band):
    band = band.lower()
    k = key.lower()
    return k == band or k.startswith(band + "_") or band in _band_names(asset)


def summarize(item, band=None, signer=None):
    props = item.get("properties") or {}
    assets = {}
    for key, a in (item.get("assets") or {}).items():
        if band and not asset_matches_band(key, a, band):
            continue
        href = a.get("href")
        if signer and href:
            href = signer(item.get("collection"), href)
        assets[key] = {"href": href, "type": a.get("type"), "roles": a.get("roles")}
    return {
        "id": item.get("id"),
        "collection": item.get("collection"),
        "datetime": props.get("datetime") or props.get("start_datetime"),
        "cloud_cover": cloud_cover(props),
        "bbox": item.get("bbox"),
        "assets": assets,
    }


class PCSigner:
    """Append a Planetary Computer SAS token to Azure Blob asset hrefs."""

    BLOB_SUFFIX = ".blob.core.windows.net"

    def __init__(self, subscription_key=None, **kw):
        self.kw = kw
        self.headers = {"Ocp-Apim-Subscription-Key": subscription_key} if subscription_key else {}
        self.tokens = {}

    def token(self, collection):
        if collection not in self.tokens:
            if not collection or not _COLLECTION_RE.match(collection):
                raise ValueError(f"cannot sign: bad collection {collection!r}")
            url = CATALOGS["planetary-computer"]["sas"] + collection
            # d = F.fetch_json(url, allowed_hosts=CATALOGS["planetary-computer"]["hosts"],
            #                  headers=self.headers, **self.kw)
            # Replaced (review 2026-10-16): the SAS response is a live credential, unknown until it arrives,
            # so it was stored unredacted; it is fetched without evidence capture (it is auth, not data).
            kw = {k: v for k, v in self.kw.items() if k not in ("evidence_dir", "evidence_log")}
            d = F.fetch_json(url, allowed_hosts=CATALOGS["planetary-computer"]["hosts"],
                             headers=self.headers, **kw)
            if not d.get("token"):
                raise F.FetchError(f"no token in SAS response for {collection}")
            self.tokens[collection] = d["token"]
        return self.tokens[collection]

    def __call__(self, collection, href):
        host = (urllib.parse.urlsplit(href).hostname or "").lower()
        if not host.endswith(self.BLOB_SUFFIX) or "sig=" in href:
            return href
        sep = "&" if "?" in href else "?"
        return href + sep + self.token(collection)


def download_assets(summaries, out_dir, auth, **kw):
    """Download every listed asset href (https only) of CMR-STAC items."""
    done = []
    taken = {}
    for it in summaries:
        for key, asset in it["assets"].items():
            href = asset.get("href") or ""
            if not href.lower().startswith("https://"):
                continue
            # rec = cmr.download(href, out_dir, auth, **kw)
            # Replaced (review 2026-10-16): one name map per run so same-named assets do not overwrite.
            rec = cmr.download(href, out_dir, auth, taken=taken, **kw)
            rec.update({"item": it["id"], "asset": key})
            done.append(rec)
    return done


def run(a, opener=None):
    if a.list_catalogs:
        return CATALOGS
    kw = F.common_kwargs(a, opener)
    if a.catalog not in CATALOGS:
        raise ValueError(f"unknown catalog {a.catalog!r}; known: {', '.join(CATALOGS)}")
    bbox = F.parse_bbox(a.bbox) if a.bbox else None
    dt = F.parse_interval(a.datetime) if a.datetime else None
    query = parse_query(a.query)
    if a.max_cloud is not None:
        if not 0 <= a.max_cloud <= 100:
            raise ValueError("--max-cloud must be 0..100")
        query.setdefault("eo:cloud_cover", {})["lte"] = a.max_cloud
    collections = [c for c in (a.collections or "").split(",") if c]
    # body = build_search_body(bbox, dt, collections, query or None, a.limit)
    # Replaced (review 2026-10-16): pass whether this catalogue filters with CQL2.
    body = build_search_body(bbox, dt, collections, query or None, a.limit,
                             cql2=bool(CATALOGS[a.catalog].get("cql2")))
    if a.max_items < 1:
        raise ValueError("--max-items must be >= 1")
    signer = None
    if a.sign:
        if a.catalog != "planetary-computer":
            raise ValueError("--sign applies only to --catalog planetary-computer")
        key = F.secret_from_env_or_file("PC_SDK_SUBSCRIPTION_KEY", a.pc_key_file)
        signer = PCSigner(key, **kw)
    auth = None
    if a.download_dir:
        if not CATALOGS[a.catalog].get("earthdata"):
            raise ValueError("--download-dir applies only to the cmr-* (NASA CMR-STAC) catalogues")
        token = F.secret_from_env_or_file("EARTHDATA_TOKEN", a.token_file)
        if not token:
            raise ValueError("--download-dir needs an Earthdata bearer token in env EARTHDATA_TOKEN "
                             "(or a file named with --token-file)")
        auth = ({"Authorization": f"Bearer {token}"}, cmr.TOKEN_HOSTS, [token])
    items, pages, matched = search(a.catalog, body, a.max_items, **kw)
    out = [summarize(it, a.band, signer) for it in items]
    if a.band:
        out = [o for o in out if o["assets"]]
    res = {
        "catalog": a.catalog,
        "root": CATALOGS[a.catalog]["root"],
        "request": body,
        "pages": pages,
        "number_matched": matched,
        "n_items": len(out),
        "band": a.band,
        "signed": bool(signer),
        "items": out,
        "retrieved_at_utc": F.utc_now(),
    }
    if auth:
        dkw = dict(kw)
        if a.max_bytes == F.DEFAULT_MAX_BYTES:
            dkw["max_bytes"] = cmr.DOWNLOAD_MAX_BYTES
        res["downloads"] = download_assets(out, a.download_dir, auth, **dkw)
    return res


def build_parser():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--catalog", default="earth-search", help=f"one of: {', '.join(CATALOGS)}")
    ap.add_argument("--list-catalogs", action="store_true", help="print known catalogues and exit")
    ap.add_argument("--collections", help="comma-separated collection ids, e.g. sentinel-2-l2a")
    ap.add_argument("--bbox", help="west,south,east,north (WGS84)")
    ap.add_argument("--datetime", help="start/end, ISO dates or datetimes; '..' for open")
    ap.add_argument("--query", action="append", help="query-extension filter, e.g. 'eo:cloud_cover<20' (repeat)")
    ap.add_argument("--max-cloud", type=float, help="shortcut for eo:cloud_cover <= N")
    ap.add_argument("--limit", type=int, default=100, help="items per page (1..1000)")
    ap.add_argument("--max-items", type=int, default=500, help="stop after this many items")
    ap.add_argument("--band", help="only list assets for this band (asset key, band name or common name)")
    ap.add_argument("--sign", action="store_true", help="sign Planetary Computer asset hrefs with a SAS token")
    ap.add_argument("--pc-key-file", help="file holding a PC subscription key (else env PC_SDK_SUBSCRIPTION_KEY)")
    ap.add_argument("--download-dir", help="cmr-* catalogues only: download the listed assets here")
    ap.add_argument("--token-file", help="file holding an Earthdata bearer token (else env EARTHDATA_TOKEN)")
    F.add_common_args(ap)
    return ap


def main(argv=None, opener=None):
    return F.cli_main(build_parser(), run, argv, opener)


if __name__ == "__main__":
    sys.exit(main())
