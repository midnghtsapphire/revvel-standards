"""Module 5: deterministic public-catalog discovery and historical identity linking."""

import csv
import hashlib
import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from .construction import normalized_address, date_value
from .safe_redirect import checked_urlopen


def _check_same_host(url, host):
    final = urllib.parse.urlsplit(url)
    if final.scheme != "https" or final.hostname != host:
        raise ValueError("Cross-host redirect blocked")


def _get_json(url, *, opener=None, allowed_host=None, timeout=20):
    p = urllib.parse.urlsplit(url)
    if p.scheme != "https" or not p.hostname:
        raise ValueError("HTTPS required")
    if allowed_host and p.hostname.lower() != allowed_host.lower():
        raise ValueError("Unapproved host")
    req = urllib.request.Request(url, headers={"User-Agent": "HFMR-PublicArchiveResearch/0.5"})
    if opener is None:
        # Original: opener = urllib.request.urlopen
        #   urlopen followed cross-host or downgrade redirects before the check below ran.
        opener = checked_urlopen(lambda target: _check_same_host(target, p.hostname))
    with opener(req, timeout=timeout) as response:
        final = urllib.parse.urlsplit(response.url)
        if final.scheme != "https" or final.hostname != p.hostname:
            raise ValueError("Cross-host redirect blocked")
        raw = response.read(10_000_001)
        if len(raw) > 10_000_000:
            raise ValueError("Catalog response too large")
        return json.loads(raw)


def arcgis_catalog(root, *, opener=None, max_services=200):
    """Discover service metadata, not permits. No guessing layer schemas."""
    root = root.rstrip("/")
    p = urllib.parse.urlsplit(root)
    if not p.path.endswith("/rest/services"):
        raise ValueError("Expected /rest/services endpoint")
    host = p.hostname
    data = _get_json(root + "?f=pjson", opener=opener, allowed_host=host)
    services = data.get("services", [])[:max_services]
    out = []
    for svc in services:
        name = svc.get("name", "")
        kind = svc.get("type", "")
        if kind not in ("FeatureServer", "MapServer") or not name:
            continue
        url = root + "/" + urllib.parse.quote(name, safe="/") + "/" + kind
        out.append(
            {
                "title": name,
                "kind": kind,
                "url": url,
                "discovery_source": root,
                "candidate": bool(re.search(r"permit|build|parcel|address|zoning|historic|aerial|imag", name, re.I)),
            }
        )
    return out


def stac_search(endpoint, bbox, start_date, end_date, *, opener=None, limit=100):
    """Read public STAC /search via GET; explicitly preserve datetime and footprint."""
    if len(bbox) != 4 or not (-180 <= bbox[0] < bbox[2] <= 180 and -90 <= bbox[1] < bbox[3] <= 90):
        raise ValueError("Invalid lon/lat bounding box")
    if not (date_value(start_date) and date_value(end_date) and start_date <= end_date):
        raise ValueError("Invalid date range")
    if not 1 <= limit <= 100:
        raise ValueError("Limit 1..100")
    p = urllib.parse.urlsplit(endpoint)
    if not p.path.rstrip("/").endswith("/search"):
        raise ValueError("Expected STAC /search")
    query = urllib.parse.urlencode(
        {"bbox": ",".join(map(str, bbox)), "datetime": f"{start_date}T00:00:00Z/{end_date}T23:59:59Z", "limit": limit}
    )
    url = endpoint + ("&" if "?" in endpoint else "?") + query
    data = _get_json(url, opener=opener, allowed_host=p.hostname)
    result = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        assets = feature.get("assets", {})
        result.append(
            {
                "id": str(feature.get("id", "")),
                "acquired": props.get("datetime") or props.get("start_datetime"),
                "geometry": feature.get("geometry"),
                "bbox": feature.get("bbox"),
                "assets": {k: v.get("href") for k, v in assets.items() if isinstance(v, dict)},
                "collection": feature.get("collection"),
                "source": endpoint,
            }
        )
    return result


def load_identity_rows(csv_path):
    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def match_identity(records, address=None, parcel=None, alias_rows=None):
    """Exact normalized match only; alias records require documented cross-reference."""
    aliases = alias_rows or []
    target_address = normalized_address(address or "")
    target_parcel = re.sub(r"\W", "", parcel or "").upper()
    verified = set()
    for a in aliases:
        if str(a.get("verified", "")).lower() not in ("true", "1", "yes"):
            continue
        if not a.get("source_url"):
            continue
        from_addr = normalized_address(a.get("from_address", ""))
        to_addr = normalized_address(a.get("to_address", ""))
        if target_address and target_address in (from_addr, to_addr):
            verified.update((from_addr, to_addr))
    if target_address:
        verified.add(target_address)
    matches = []
    for r in records:
        addr = normalized_address(r.get("address", ""))
        pid = re.sub(r"\W", "", r.get("parcel", "")).upper()
        reasons = []
        if target_address and addr in verified:
            reasons.append("exact_address_or_documented_alias")
        if target_parcel and pid == target_parcel:
            reasons.append("exact_parcel")
        if reasons:
            matches.append({"record": r, "match_reasons": reasons})
    return matches


def inventory(items, output):
    """Write-once inventory with source metadata and digest."""
    p = Path(output)
    if p.exists():
        raise FileExistsError(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(
        {"created_utc": datetime.now(timezone.utc).isoformat(), "items": items}, indent=2, sort_keys=True
    ).encode()
    p.write_bytes(raw)
    digest = hashlib.sha256(raw).hexdigest()
    manifest = p.with_suffix(p.suffix + ".sha256")
    manifest.write_text(digest + "  " + p.name + "\n")
    return {"inventory": str(p), "sha256": digest, "items": len(items)}


def verify_inventory(path):
    p = Path(path)
    expected = p.with_suffix(p.suffix + ".sha256").read_text().split()[0]
    return hashlib.sha256(p.read_bytes()).hexdigest() == expected
