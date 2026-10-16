"""Retrieve and preserve public City of Columbus ArcGIS building/engineering records.

Port of the owner's ``retriever.py``. It queries the City of Columbus public
ArcGIS MapServer::

    https://gis.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer

(by default layer 5 ``building`` and layer 22 ``engineering``) for records whose
address matches a house number and street, optionally restricted to a year
range, and preserves every response as evidence. Standard library only.

Safety properties kept from the original
----------------------------------------
* Host/path allow-list: only ``https://gis.columbus.gov`` under the MapServer
  path above, checked before every request and on every redirect hop.
* Redirects: a redirect to any other host/path is refused before it is
  followed, and the final URL is checked again after the response arrives.
* Size cap: at most ``MAX_BYTES`` are read; a larger body is rejected.
* Retries with exponential backoff (1 s, 2 s, ...) on network errors and on
  HTTP 429/5xx only. Policy failures (redirect, size) are never retried.

What changed
------------
* The ArcGIS ``where`` clause is built only from: a street matching
  ``^[A-Z0-9 ]{2,40}$`` after upper-casing (ASCII input only), a house number
  ``int`` in 1..99999, years ``int`` in 1800..2100, and field names taken from
  layer metadata that match ``^[A-Za-z_][A-Za-z0-9_]{0,63}$``. String literals
  are quoted with doubled single quotes. Nothing else is interpolated.
* Layer ids are configurable (``--layer name=id``) and always resolve under the
  same MapServer path. ``--list-layers`` prints the MapServer's layers/tables.
* Pagination honours the layer's ``maxRecordCount`` and the response
  ``exceededTransferLimit`` flag; a ``returnCountOnly`` request records how many
  rows the server says match, and the result is marked truncated when fewer
  rows were retrieved (``--max-records`` caps retrieval).
* Year filtering uses an ``esriFieldTypeDate`` field (``DATE 'YYYY-01-01'``
  literals) or an integer year field; the summary records which field was used
  or why no filter was applied, and counts returned rows outside the range.
* Evidence: each raw response body is written to disk byte-for-byte as
  received, with its request URL, final URL, HTTP status, UTC retrieval time and
  SHA-256. ``manifest.json`` chains each file's SHA-256 into a running hash
  ``chain_i = sha256(chain_{i-1} + sha256_i)`` (hex strings, genesis = 64 zeros)
  so reordering or deletion of entries is detectable; ``--verify`` recomputes it.

CLI::

    python columbus_records.py --number 1546 --street HIGH --start 2000 --end 2010 --output evidence
    python columbus_records.py --layer building=5 --layer engineering=22 --max-records 500
    python columbus_records.py --list-layers
    python columbus_records.py --verify evidence/run_20261016T120000000000Z [--expect-head <hex>]

Each collection run writes into a fresh ``<output>/run_<UTC stamp>/`` directory.

Exit codes: 0 complete (or verify passed); 1 incomplete, truncated, a layer
failed, or verify found a mismatch; 2 bad input.

Caution: GIS layer identity, addresses, parcels, dates and historical relevance
need independent verification. No results do not establish absence of
construction.
"""

import argparse
import datetime as dt
import hashlib
import http.client
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HOST = "gis.columbus.gov"
BASE_PATH = "/arcgis/rest/services/Schemas/BuildingZoning/MapServer"
BASE = "https://" + HOST + BASE_PATH
DEFAULT_LAYERS = {"building": 5, "engineering": 22}
MAX_BYTES = 6_000_000
DEFAULT_MAX_RECORDS = 1000
MAX_RECORDS_CEILING = 100_000
FALLBACK_PAGE_SIZE = 1000  # used only when the layer metadata has no maxRecordCount
USER_AGENT = "ForensicFinders/1.0 (public records research)"
RETRY_HTTP_CODES = {429, 500, 502, 503, 504}

MANIFEST = "manifest.json"
MANIFEST_VERSION = 2
GENESIS = "0" * 64
CHAIN_ALGORITHM = "chain_i = sha256_hex(ascii(chain_{i-1} + sha256_i)); chain_0 = 64 zeros"

EXIT_OK = 0
EXIT_INCOMPLETE = 1
EXIT_BAD_INPUT = 2

STREET_RE = re.compile(r"[A-Z0-9 ]{2,40}")
FIELD_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]{0,63}")
LAYER_NAME_RE = re.compile(r"[a-z][a-z0-9_]{0,31}")
SAFE_FILE_RE = re.compile(r"[A-Za-z0-9_.-]{1,128}")
HEX64_RE = re.compile(r"[0-9a-f]{64}")

ADDRESS_CANDIDATES = ["SITE_ADDRESS", "ADDRESS", "SITEADDR", "FULL_ADDRESS", "LOCATION_ADDRESS"]
DATE_CANDIDATES = ["ISSUED_DATE", "ISSUE_DATE", "ISSUEDATE", "DATE_ISSUED", "PERMIT_DATE",
                   "FILED_DATE", "FILE_DATE", "APPLICATION_DATE", "APPLIED_DATE"]
YEAR_CANDIDATES = ["ISSUED_YEAR", "FILED_YEAR", "PERMIT_YEAR", "YEAR"]
DATE_TYPES = {"esriFieldTypeDate", "esriFieldTypeDateOnly", "esriFieldTypeTimestampOffset"}
NUMERIC_TYPES = {"esriFieldTypeInteger", "esriFieldTypeSmallInteger", "esriFieldTypeBigInteger",
                 "esriFieldTypeDouble", "esriFieldTypeSingle"}
STRING_TYPES = {"esriFieldTypeString"}

CAUTION = ("GIS layer identity, addresses, parcels, dates, and historical relevance require independent "
           "verification. No results do not establish absence of construction.")


class InputError(ValueError):
    """User-supplied input failed validation (exit 2)."""


class UnapprovedURL(ValueError):
    """A URL (request, redirect or final) is outside the allow-list."""


class ResponseTooLarge(ValueError):
    """The response body exceeded the size cap."""


class SchemaError(ValueError):
    """Layer metadata lacks a usable address or object-id field, or a field name is unsafe."""


class ArcGISError(RuntimeError):
    """The server answered with an ArcGIS error payload or non-JSON body."""


def digest(data):
    return hashlib.sha256(data).hexdigest()


def utc_now():
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


# --------------------------------------------------------------------------- transport


def check_url(url):
    """Return ``url`` if it is https://gis.columbus.gov under the MapServer path, else raise."""
    try:
        parts = urllib.parse.urlsplit(url)
        port = parts.port
    except (ValueError, TypeError, AttributeError) as error:
        raise UnapprovedURL(f"Unapproved API URL: {url!r}") from error
    path = parts.path
    ok = (
        parts.scheme == "https"
        and parts.hostname == HOST
        and port in (None, 443)
        and not parts.username
        and not parts.password
        and not parts.fragment
        and (path == BASE_PATH or path.startswith(BASE_PATH + "/"))
        and ".." not in path.split("/")
        and "%" not in path
        and "\\" not in url
    )
    if not ok:
        raise UnapprovedURL(f"Unapproved API URL: {url!r}")
    return url


class AllowListRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Refuse a redirect hop before following it unless the target is allow-listed."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        try:
            check_url(newurl)
        except UnapprovedURL as error:
            raise UnapprovedURL(f"Unexpected redirect to {newurl!r}") from error
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def build_opener():
    return urllib.request.build_opener(AllowListRedirectHandler())


def _is_retryable(error):
    if isinstance(error, urllib.error.HTTPError):
        return error.code in RETRY_HTTP_CODES
    return isinstance(error, (urllib.error.URLError, TimeoutError, ConnectionError, http.client.IncompleteRead))


def _read_once(url, opener, timeout, max_bytes):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    retrieved = utc_now()
    with opener.open(request, timeout=timeout) as response:
        final_url = response.geturl()
        try:
            check_url(final_url)
        except UnapprovedURL as error:
            raise UnapprovedURL(f"Unexpected redirect to {final_url!r}") from error
        status = getattr(response, "status", None) or response.getcode()
        body = response.read(max_bytes + 1)
    if len(body) > max_bytes:
        raise ResponseTooLarge(f"Response larger than {max_bytes} bytes from {url}")
    if status is None or not 200 <= int(status) < 300:
        raise urllib.error.HTTPError(url, int(status or 0), f"HTTP status {status}", None, None)
    return {"url": url, "final_url": final_url, "status": int(status), "retrieved_utc": retrieved,
            "body": body, "sha256": digest(body), "bytes": len(body)}


def fetch(url, opener=None, retries=3, timeout=30, max_bytes=MAX_BYTES, sleep=time.sleep):
    """GET an allow-listed URL; return a response dict holding the raw body bytes.

    The dict has ``url, final_url, status, retrieved_utc, body, sha256, bytes, attempts``.
    ``opener`` is anything with ``open(request, timeout=...)`` (tests inject a fake).
    """
    check_url(url)
    opener = opener or build_opener()
    for attempt in range(retries):
        try:
            result = _read_once(url, opener, timeout, max_bytes)
            result["attempts"] = attempt + 1
            return result
        except Exception as error:
            if not _is_retryable(error) or attempt == retries - 1:
                raise
            sleep(2 ** attempt)
    raise RuntimeError("unreachable")  # pragma: no cover - retries >= 1


def parse_json(response):
    """Parse a response dict's body; raise ArcGISError on an error payload or non-object JSON."""
    try:
        obj = json.loads(response["body"])
    except (ValueError, UnicodeDecodeError) as error:
        raise ArcGISError(f"Non-JSON response from {response.get('url')}: {error}") from error
    if not isinstance(obj, dict):
        raise ArcGISError(f"Unexpected JSON type {type(obj).__name__} from {response.get('url')}")
    if "error" in obj:
        raise ArcGISError(f"ArcGIS error from {response.get('url')}: {json.dumps(obj['error'], sort_keys=True)}")
    return obj


# --------------------------------------------------------------------------- input validation


def normalise_street(street):
    if not isinstance(street, str) or not street.isascii():
        raise InputError("street must be an ASCII string")
    value = street.strip().upper()
    if not STREET_RE.fullmatch(value):
        raise InputError("street must match ^[A-Z0-9 ]{2,40}$ after upper-casing")
    return value


def validate_number(number):
    if type(number) is not int or not 1 <= number <= 99999:
        raise InputError("number must be an integer 1..99999")
    return number


def validate_years(start, end):
    if type(start) is not int or type(end) is not int or not 1800 <= start <= end <= 2100:
        raise InputError("years must be integers with 1800 <= start <= end <= 2100")
    return start, end


def validate_max_records(max_records):
    if type(max_records) is not int or not 1 <= max_records <= MAX_RECORDS_CEILING:
        raise InputError(f"max_records must be an integer 1..{MAX_RECORDS_CEILING}")
    return max_records


def validate_layers(layers):
    if not isinstance(layers, dict) or not layers:
        raise InputError("at least one layer is required")
    for name, layer_id in layers.items():
        if not isinstance(name, str) or not LAYER_NAME_RE.fullmatch(name):
            raise InputError(f"layer name {name!r} must match ^[a-z][a-z0-9_]{{0,31}}$")
        if type(layer_id) is not int or not 0 <= layer_id <= 9999:
            raise InputError(f"layer id for {name!r} must be an integer 0..9999")
    return layers


def validate_query(number, street, start, end, layers, max_records):
    validate_number(number)
    street = normalise_street(street)
    validate_years(start, end)
    validate_layers(layers)
    validate_max_records(max_records)
    return street


def sql_quote(text):
    return "'" + text.replace("'", "''") + "'"


def check_field_name(name):
    if not isinstance(name, str) or not FIELD_RE.fullmatch(name):
        raise SchemaError(f"Unsafe or invalid field name from metadata: {name!r}")
    return name


# --------------------------------------------------------------------------- schema handling


def _fields_by_upper(fields):
    out = {}
    for field in fields or []:
        name = field.get("name") if isinstance(field, dict) else None
        if isinstance(name, str) and FIELD_RE.fullmatch(name):
            out.setdefault(name.upper(), field)
    return out


def choose_field(fields, candidates, types=None):
    by_upper = _fields_by_upper(fields)
    for candidate in candidates:
        field = by_upper.get(candidate.upper())
        if field and (types is None or field.get("type") in types):
            return field["name"]
    return None


def object_id_field(metadata, fields):
    oid = metadata.get("objectIdField")
    if isinstance(oid, str) and FIELD_RE.fullmatch(oid):
        return oid
    for field in fields or []:
        if isinstance(field, dict) and field.get("type") == "esriFieldTypeOID":
            name = field.get("name")
            if isinstance(name, str) and FIELD_RE.fullmatch(name):
                return name
    return choose_field(fields, ["OBJECTID", "FID"])


def choose_year_filter(fields):
    """Pick the field for year filtering and say why.

    Order: a known-named date field; a known-named numeric year field; the only
    date field in the layer. Otherwise no filter is applied and the reason says so.
    """
    by_upper = _fields_by_upper(fields)
    date_fields = [f["name"] for f in by_upper.values() if f.get("type") in DATE_TYPES]
    base = {"date_fields": date_fields}
    named_date = choose_field(fields, DATE_CANDIDATES, DATE_TYPES)
    if named_date:
        return dict(base, applied=True, field=named_date, kind="date",
                    reason=f"named date field {named_date} ({by_upper[named_date.upper()].get('type')})")
    named_year = choose_field(fields, YEAR_CANDIDATES, NUMERIC_TYPES)
    if named_year:
        return dict(base, applied=True, field=named_year, kind="year_integer",
                    reason=f"named numeric year field {named_year}")
    if len(date_fields) == 1:
        return dict(base, applied=True, field=date_fields[0], kind="date",
                    reason=f"only date-typed field in layer: {date_fields[0]}")
    if date_fields:
        reason = f"ambiguous: {len(date_fields)} date fields {date_fields}, none with a recognised name"
    else:
        reason = "no date-typed or recognised numeric year field in layer metadata"
    return dict(base, applied=False, field=None, kind=None, reason=reason + "; no year filter applied")


def build_where(address_field, number, street, start, end, year_filter):
    """Build the ArcGIS where clause from validated parts only."""
    check_field_name(address_field)
    number = validate_number(number)
    street = normalise_street(street)
    start, end = validate_years(start, end)
    where = f"UPPER({address_field}) LIKE {sql_quote(f'%{number}%{street}%')}"
    if year_filter and year_filter.get("applied"):
        field = check_field_name(year_filter["field"])
        if year_filter["kind"] == "date":
            where += f" AND {field} >= DATE '{start:04d}-01-01' AND {field} < DATE '{end + 1:04d}-01-01'"
        elif year_filter["kind"] == "year_integer":
            where += f" AND {field} >= {start} AND {field} <= {end}"
        else:
            raise SchemaError(f"unknown year filter kind {year_filter['kind']!r}")
    return where


def page_size_from(metadata):
    value = metadata.get("maxRecordCount")
    if type(value) is int and value >= 1:
        return value, "maxRecordCount"
    return FALLBACK_PAGE_SIZE, f"fallback {FALLBACK_PAGE_SIZE} (metadata has no maxRecordCount)"


def _record_year(value, kind):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if kind == "date":
        try:
            return dt.datetime.fromtimestamp(value / 1000, tz=dt.timezone.utc).year
        except (OverflowError, OSError, ValueError):
            return None
    return int(value)


def check_years(records, year_filter, start, end):
    """Count returned rows whose filter field falls outside [start, end] or is empty."""
    if not year_filter.get("applied"):
        return {"outside_range": 0, "missing": 0}
    outside = missing = 0
    for record in records:
        year = _record_year(record.get(year_filter["field"]), year_filter["kind"])
        if year is None:
            missing += 1
        elif not start <= year <= end:
            outside += 1
    return {"outside_range": outside, "missing": missing}


# --------------------------------------------------------------------------- collection


def _page_record(kind, response, **extra):
    record = {"kind": kind, "url": response.get("url"), "final_url": response.get("final_url"),
              "status": response.get("status"), "retrieved_utc": response.get("retrieved_utc"),
              "sha256": response.get("sha256") or digest(response["body"]), "bytes": len(response["body"]),
              "file": response.get("file")}
    record.update(extra)
    return record


def _more_expected(exceeded, batch, size):
    if exceeded is True:
        return True
    if exceeded is None:  # flag absent: a full page implies there may be more
        return bool(batch) and len(batch) >= size
    return False


def _paginate(url, where, oid, page_size, supports_pagination, max_records, getter):
    """Fetch query pages; return (records, pages, issues, truncated)."""
    records, pages, issues = [], [], []
    truncated = False
    while True:
        size = min(page_size, max_records - len(records))
        params = {"f": "json", "where": where, "outFields": "*", "returnGeometry": "false",
                  "orderByFields": f"{oid} ASC", "resultRecordCount": size}
        if supports_pagination:
            params["resultOffset"] = len(records)
        response = getter(url + "/query?" + urllib.parse.urlencode(params))
        payload = parse_json(response)
        features = payload.get("features") or []
        batch = [f.get("attributes", {}) for f in features if isinstance(f, dict)]
        exceeded = payload.get("exceededTransferLimit")
        pages.append(_page_record("query", response, offset=params.get("resultOffset", 0),
                                  requested=size, count=len(batch), exceeded_transfer_limit=exceeded))
        records.extend(batch)
        if not _more_expected(exceeded, batch, size):
            break
        if not batch:
            truncated = True
            issues.append("server reported more rows (exceededTransferLimit) but returned an empty page")
            break
        if not supports_pagination:
            truncated = True
            issues.append("layer does not support pagination and the server reported more rows")
            break
        if len(records) >= max_records:
            truncated = True
            issues.append(f"max_records={max_records} reached while the server reported more rows")
            break
    return records, pages, issues, truncated


def collect(layer, number, street, start, end, getter=fetch, layers=None, max_records=DEFAULT_MAX_RECORDS):
    """Query one layer. ``getter(url)`` returns a response dict as produced by :func:`fetch`."""
    layers = DEFAULT_LAYERS if layers is None else layers
    street = validate_query(number, street, start, end, layers, max_records)
    if layer not in layers:
        raise InputError(f"unknown layer {layer!r}")
    url = f"{BASE}/{layers[layer]}"
    check_url(url)

    meta_response = getter(url + "?f=json")
    metadata = parse_json(meta_response)
    pages = [_page_record("metadata", meta_response)]
    fields = metadata.get("fields") or []
    address = choose_field(fields, ADDRESS_CANDIDATES, STRING_TYPES | {None})
    oid = object_id_field(metadata, fields)
    if not address or not oid:
        raise SchemaError("Unrecognized source schema; manual field mapping required")
    year_filter = choose_year_filter(fields)
    where = build_where(address, number, street, start, end, year_filter)
    page_size, page_size_source = page_size_from(metadata)
    capabilities = metadata.get("advancedQueryCapabilities") or {}
    supports_pagination = capabilities.get("supportsPagination", True) is not False

    count_response = getter(url + "/query?" + urllib.parse.urlencode(
        {"f": "json", "where": where, "returnCountOnly": "true"}))
    count_value = parse_json(count_response).get("count")
    server_count = count_value if type(count_value) is int else None
    pages.append(_page_record("count", count_response, count=server_count))

    records, query_pages, issues, truncated = _paginate(
        url, where, oid, page_size, supports_pagination, max_records, getter)
    pages.extend(query_pages)

    if server_count is None:
        issues.append("server returned no record count; completeness cannot be confirmed")
    elif len(records) < server_count:
        truncated = True
        issues.append(f"retrieved {len(records)} of {server_count} records reported by returnCountOnly")
    elif len(records) > server_count:
        issues.append(f"retrieved {len(records)} records but count reported {server_count}; data changed?")
    oids = [r.get(oid) for r in records]
    duplicates = len(oids) - len(set(map(repr, oids)))
    if duplicates:
        issues.append(f"{duplicates} duplicate {oid} values across pages")
    year_check = check_years(records, year_filter, start, end)
    if year_check["outside_range"]:
        issues.append(f"{year_check['outside_range']} returned rows fall outside {start}-{end} "
                      f"on {year_filter['field']}")

    return {"layer": layer, "layer_id": layers[layer], "source": url, "layer_name": metadata.get("name"),
            "address_field": address, "object_id_field": oid, "where": where,
            "requested_years": [start, end], "year_filter": year_filter, "year_check": year_check,
            "year_filter_applied": year_filter["applied"],
            "page_size": page_size, "page_size_source": page_size_source,
            "supports_pagination": supports_pagination, "max_records": max_records,
            "server_count": server_count, "record_count": len(records), "records": records,
            "pages": pages, "truncated": truncated, "issues": issues,
            "complete": not issues and not truncated}


# --------------------------------------------------------------------------- evidence


def chain_step(previous, file_sha256):
    return digest((previous + file_sha256).encode("ascii"))


class EvidenceLog:
    """Writes files exactly once (``xb``) and keeps the running hash chain."""

    def __init__(self, directory):
        self.directory = pathlib.Path(directory)
        self.entries = []
        self.head = GENESIS

    def write(self, name, data, **meta):
        if not SAFE_FILE_RE.fullmatch(name) or name == MANIFEST:
            raise ValueError(f"unsafe evidence file name {name!r}")
        with open(self.directory / name, "xb") as handle:
            handle.write(data)
        sha = digest(data)
        self.head = chain_step(self.head, sha)
        entry = {"seq": len(self.entries) + 1, "name": name, "sha256": sha, "bytes": len(data),
                 "chain": self.head}
        entry.update(meta)
        self.entries.append(entry)
        return entry


def _kind_of(url):
    parts = urllib.parse.urlsplit(url)
    if not parts.path.endswith("/query"):
        return "metadata"
    return "count" if "returnCountOnly=true" in parts.query else "query"


class RecordingGetter:
    """Wraps a getter so every raw body is written to disk before it is parsed."""

    def __init__(self, log, layer, getter):
        self.log, self.layer, self.getter = log, layer, getter

    def __call__(self, url):
        response = self.getter(url)
        body = response.get("body")
        if not isinstance(body, bytes):
            raise TypeError("getter must return the raw body as bytes")
        if response.get("sha256") and response["sha256"] != digest(body):
            raise ValueError("getter-reported sha256 does not match body")
        kind = _kind_of(url)
        name = f"{len(self.log.entries) + 1:03d}_{self.layer}_{kind}.json"
        entry = self.log.write(name, body, role="raw_response", layer=self.layer, kind=kind,
                               url=response.get("url", url), final_url=response.get("final_url"),
                               status=response.get("status"), retrieved_utc=response.get("retrieved_utc"),
                               attempts=response.get("attempts"))
        out = dict(response)
        out.update(file=name, sha256=entry["sha256"], url=entry["url"])
        return out


def run(output, number=1546, street="HIGH", start=2000, end=2010, collector=collect, getter=fetch,
        layers=None, max_records=DEFAULT_MAX_RECORDS, case="CASE001"):
    layers = dict(DEFAULT_LAYERS if layers is None else layers)
    street = validate_query(number, street, start, end, layers, max_records)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    directory = pathlib.Path(output) / f"run_{stamp}"
    directory.mkdir(parents=True, exist_ok=False)
    log = EvidenceLog(directory)
    report = {"case": case, "run_id": stamp, "run_dir": str(directory),
              "query": {"number": number, "street": street, "start": start, "end": end,
                        "layers": layers, "max_records": max_records},
              "layers": [], "errors": [], "complete": False}
    for layer in layers:
        try:
            result = collector(layer, number, street, start, end, getter=RecordingGetter(log, layer, getter),
                               layers=layers, max_records=max_records)
            data = json.dumps(result, indent=2, sort_keys=True).encode("utf-8")
            entry = log.write(f"{len(log.entries) + 1:03d}_{layer}_summary.json", data,
                              role="parsed_summary", layer=layer)
            report["layers"].append({key: result[key] for key in (
                "layer", "layer_id", "where", "year_filter", "server_count", "record_count",
                "truncated", "complete", "issues")} | {"summary_file": entry["name"]})
        except Exception as error:
            report["errors"].append({"layer": layer, "error_type": type(error).__name__, "message": str(error)})
    report["complete"] = not report["errors"] and all(item["complete"] for item in report["layers"])
    manifest = {"manifest_version": MANIFEST_VERSION, "chain_algorithm": CHAIN_ALGORITHM, "genesis": GENESIS,
                "caution": CAUTION, "files": log.entries, "file_count": len(log.entries),
                "chain_head": log.head}
    manifest.update({k: report[k] for k in ("case", "run_id", "query", "layers", "errors", "complete")})
    manifest_bytes = json.dumps(manifest, indent=2, sort_keys=True).encode("utf-8")
    (directory / MANIFEST).write_bytes(manifest_bytes)
    report.update(chain_head=log.head, file_count=len(log.entries), manifest_sha256=digest(manifest_bytes),
                  caution=CAUTION)
    return report


def _verify_entries(directory, files):
    failures, listed = [], set()
    chain, chain_ok = GENESIS, True
    for position, item in enumerate(files, 1):
        item = item if isinstance(item, dict) else {}
        name, sha = item.get("name"), item.get("sha256")
        if not isinstance(name, str) or not SAFE_FILE_RE.fullmatch(name) or name == MANIFEST:
            failures.append(f"entry {position}: unsafe or missing file name {name!r}")
            chain_ok = False
            continue
        listed.add(name)
        if item.get("seq") != position:
            failures.append(f"{name}: seq {item.get('seq')} at position {position} (entries reordered or removed)")
        chain = chain_step(chain, sha if isinstance(sha, str) else "")
        if chain_ok and item.get("chain") != chain:
            failures.append(f"{name}: hash chain breaks at position {position}")
            chain_ok = False
        path = directory / name
        if not path.is_file():
            failures.append(f"{name}: missing")
        elif digest(path.read_bytes()) != sha:
            failures.append(f"{name}: sha256 mismatch")
    return failures, listed, chain


def verify(output, expect_head=None):
    """Return a list of integrity failures for a run directory (empty list = verified)."""
    directory = pathlib.Path(output)
    try:
        manifest = json.loads((directory / MANIFEST).read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        return [f"{MANIFEST}: unreadable ({type(error).__name__}: {error})"]
    files = manifest.get("files") if isinstance(manifest, dict) else None
    if not isinstance(files, list):
        return [f"{MANIFEST}: no file list"]
    failures, listed, chain = _verify_entries(directory, files)
    if manifest.get("file_count") != len(files):
        failures.append(f"file_count {manifest.get('file_count')} != {len(files)} listed entries")
    if manifest.get("chain_head") != chain:
        failures.append("chain_head does not match recomputed chain")
    if expect_head is not None and expect_head != chain:
        failures.append("recomputed chain does not match --expect-head")
    for path in sorted(directory.iterdir()):
        if path.name != MANIFEST and path.name not in listed:
            failures.append(f"{path.name}: present on disk but not in manifest")
    return failures


# --------------------------------------------------------------------------- list layers / CLI


def list_layers(getter=fetch):
    response = getter(BASE + "?f=json")
    service = parse_json(response)
    items = []
    for kind in ("layers", "tables"):
        for item in service.get(kind) or []:
            if isinstance(item, dict) and type(item.get("id")) is int:
                items.append({"id": item["id"], "name": item.get("name"), "type": item.get("type"),
                              "kind": kind[:-1]})
    return {"source": BASE, "url": response.get("url"), "status": response.get("status"),
            "retrieved_utc": response.get("retrieved_utc"), "sha256": digest(response["body"]),
            "layers": sorted(items, key=lambda x: (x["kind"], x["id"]))}


def parse_layer_spec(text):
    name, sep, raw_id = text.partition("=")
    if not sep or not LAYER_NAME_RE.fullmatch(name) or not raw_id.isdigit() or not 0 <= int(raw_id) <= 9999:
        raise argparse.ArgumentTypeError(
            f"--layer expects name=id (name ^[a-z][a-z0-9_]{{0,31}}$, id 0..9999): {text!r}")
    return name, int(raw_id)


def build_parser():
    parser = argparse.ArgumentParser(description="Retrieve and preserve City of Columbus ArcGIS records.")
    parser.add_argument("--output", default="evidence", help="parent directory; each run gets run_<stamp>/")
    parser.add_argument("--verify", metavar="RUN_DIR", help="verify a run directory's manifest and hash chain")
    parser.add_argument("--expect-head", help="with --verify: chain head recorded elsewhere at collection time")
    parser.add_argument("--list-layers", action="store_true", help="print the MapServer's layer ids and names")
    parser.add_argument("--number", type=int, default=1546)
    parser.add_argument("--street", default="HIGH")
    parser.add_argument("--start", type=int, default=2000)
    parser.add_argument("--end", type=int, default=2010)
    parser.add_argument("--layer", action="append", type=parse_layer_spec, metavar="NAME=ID",
                        help="repeatable; replaces the default building=5 engineering=22")
    parser.add_argument("--max-records", type=int, default=DEFAULT_MAX_RECORDS)
    parser.add_argument("--case", default="CASE001")
    return parser


def _layers_from_args(specs):
    if not specs:
        return dict(DEFAULT_LAYERS)
    layers = {}
    for name, layer_id in specs:
        if name in layers:
            raise InputError(f"duplicate --layer name {name!r}")
        layers[name] = layer_id
    return layers


def _print(obj):
    print(json.dumps(obj, indent=2))


def main(argv=None, getter=None):
    args = build_parser().parse_args(argv)
    getter = getter or fetch
    try:
        if args.verify:
            if args.expect_head is not None and not HEX64_RE.fullmatch(args.expect_head):
                raise InputError("--expect-head must be 64 lowercase hex characters")
            failures = verify(args.verify, args.expect_head)
            try:  # informational only: integrity can verify on a run that was itself incomplete
                manifest = json.loads((pathlib.Path(args.verify) / MANIFEST).read_text(encoding="utf-8"))
                context = {"run_complete": manifest.get("complete"), "file_count": manifest.get("file_count")}
            except (OSError, ValueError, AttributeError):
                context = {"run_complete": None, "file_count": None}
            _print({"verified": not failures, "integrity_failures": failures, **context})
            return EXIT_INCOMPLETE if failures else EXIT_OK
        if args.list_layers:
            try:
                _print(list_layers(getter))
            except Exception as error:
                _print({"error_type": type(error).__name__, "message": str(error)})
                return EXIT_INCOMPLETE
            return EXIT_OK
        layers = _layers_from_args(args.layer)
        validate_query(args.number, args.street, args.start, args.end, layers, args.max_records)
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", args.case):
            raise InputError("--case must match ^[A-Za-z0-9_-]{1,64}$")
    except InputError as error:
        print(f"error: {error}", file=sys.stderr)
        return EXIT_BAD_INPUT
    report = run(args.output, args.number, args.street, args.start, args.end, getter=getter,
                 layers=layers, max_records=args.max_records, case=args.case)
    _print(report)
    return EXIT_OK if report["complete"] else EXIT_INCOMPLETE


if __name__ == "__main__":
    sys.exit(main())
