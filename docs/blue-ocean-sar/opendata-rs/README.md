# opendata-rs

`opendata` is an async Rust command-line tool that pulls public geospatial
data for blue-ocean-sar. It covers four sources: STAC catalogues, ArcGIS REST
layers, NASA CMR granules and the OpenTrafficCamMap camera list. It can also
save every response it receives as evidence.

## What every request does

- **HTTPS only.** Each subcommand has its own list of allowed hosts. The
  redirect policy checks every redirect hop against that list and refuses
  any host that is not on it. URLs with a username or password in them are
  refused too.
- **Timeouts.** Each request has a 15 s connect timeout and a total timeout
  set by `--timeout` (60 s by default).
- **Retries.** The tool retries on 429, 500, 502, 503, 504 and on transport
  errors, waiting longer each time (`--retries`, 4 by default). It honours a
  `Retry-After` header in either seconds or HTTP-date form, up to a maximum
  of 120 s. It never retries other 4xx errors.
- **User-Agent.** Requests send `opendata-rs/<version> (revvel-standards
  blue-ocean-sar; open-data research client)`.
- **Tokens.** Tokens are read only from environment variables, never from
  the command line. They are sent in headers flagged as sensitive, never in
  URLs, and they are never printed or written to the manifest.
- **Concurrency.** ArcGIS paging fetches several pages at once with
  `buffer_unordered`, limited by `--concurrency` (4 by default, capped
  at 16). STAC `next` links and CMR `CMR-Search-After` are cursor-based, so
  they have to be fetched one page at a time.

## Build and test

```bash
cd docs/blue-ocean-sar/opendata-rs
cargo build --release          # binary: target/release/opendata
cargo test                     # all tests run against local mock servers
cargo clippy --all-targets -- -D warnings
cargo fmt --check
```

## Run

```bash
B=target/release/opendata

# STAC: Sentinel-2 L2A over Mobile Bay, max 20 % cloud, first 50 items
$B stac search --catalog earth-search --collections sentinel-2-l2a \
  --bbox -88.2,30.4,-87.8,30.8 --datetime 2026-01-01/2026-10-15 \
  --max-cloud 20 --limit 50

# Same query against Copernicus Data Space or a custom STAC API root
$B stac search --catalog cdse --collections sentinel-2-l2a \
  --bbox -88.2,30.4,-87.8,30.8 --datetime 2026-06-01/2026-06-30
$B stac search --catalog https://stac.example.org/v1 --collections c1 \
  --bbox 0,0,1,1 --datetime 2026-01-01/..

# ArcGIS: every feature of a layer as GeoJSON (Esri JSON converted locally)
$B arcgis query \
  --url https://services.arcgis.com/ORG/arcgis/rest/services/Roads/FeatureServer/0 \
  --where "1=1" --out-fields "*" --bbox -88.2,30.4,-87.8,30.8 --out roads.geojson
# ...or ask the server for GeoJSON directly
$B arcgis query --url https://host/arcgis/rest/services/X/MapServer/3 --geojson

# NASA CMR: GEDI L2A granules
$B cmr granules --short-name GEDI02_A --bbox -88.2,30.4,-87.8,30.8 \
  --temporal 2023-01-01,2023-12-31 --limit 100

# OpenTrafficCamMap: cameras within 5 km, nearest first
$B cams near --country USA --lat 30.6954 --lon -88.0399 --radius-km 5

# Save evidence for any subcommand, then verify the chain
$B --evidence-dir ./evidence cams near --country USA --lat 30.69 --lon -88.04
$B evidence verify --dir ./evidence
```

STAC, CMR and cams print one JSON object per line on stdout. ArcGIS prints a
single GeoJSON `FeatureCollection`, or writes it to the file given by `--out`.
A summary is printed on stderr. The exit code is non-zero on any failure. For
ArcGIS, the command also exits non-zero if the number of features retrieved
does not match the server's `returnCountOnly` total.

## Evidence manifest

With `--evidence-dir DIR`, the tool saves the raw bytes of every response it
receives, including 5xx responses that are later retried. Each one is stored
at `DIR/objects/<sha256>.bin`, and one line is appended to
`DIR/manifest.jsonl` with these fields:
`seq, utc, method, url, final_url, status, request_body_sha256, sha256,
bytes, file, prev_hash, entry_hash`.

- `entry_hash` is the SHA-256 of the canonical JSON of all the other fields.
- `prev_hash` is the previous entry's `entry_hash`. The first entry uses 64
  zeros.
- When a URL parameter's name looks like a credential (`key`, `token`, `sig`
  and so on), its value is redacted in the manifest.
- Opening a directory whose existing chain is broken is refused.
- `opendata evidence verify --dir DIR` re-checks the chain and re-hashes
  every stored object. It exits 1 on the first mismatch.

## Proxy and CA

The tool uses rustls with the bundled webpki roots. To trust one more CA,
such as an egress proxy, pass `--ca-bundle PEM` or set `OPENDATA_CA_BUNDLE`.
If neither is set, the tool falls back to `SSL_CERT_FILE`. `HTTPS_PROXY` is
honoured.

## Keys and terms by source

| Source | Hosts allowed | Key | Terms |
| --- | --- | --- | --- |
| Earth Search (Element 84) | `earth-search.aws.element84.com` | None | Sentinel-2 data falls under the Copernicus Sentinel data terms (free and open; credit "Contains modified Copernicus Sentinel data"). Assets are served from AWS Open Data. |
| Microsoft Planetary Computer | `planetarycomputer.microsoft.com` | Optional `PC_SDK_SUBSCRIPTION_KEY`, sent as the `Ocp-Apim-Subscription-Key` header | Planetary Computer terms of use. Each dataset keeps its own licence. Asset hrefs need SAS signing before download, which this tool does not do. |
| Copernicus Data Space (CDSE) | `stac.dataspace.copernicus.eu` | None for search | Copernicus terms. Downloading products needs a CDSE account and OAuth token, which this tool does not handle. Cloud filtering uses CQL2-JSON. |
| Custom STAC URL | That URL's host only | None | Whatever terms that catalogue publishes. |
| ArcGIS REST | The layer URL's host only | None | Each publisher sets its own licence. Check the service's `copyrightText` and the portal's terms. Token-secured layers are not supported. |
| NASA CMR | `cmr.earthdata.nasa.gov` | Optional `EARTHDATA_TOKEN` (Earthdata Login bearer token) | NASA's open data policy applies; cite the dataset DOI. A token is needed only for restricted collections. Downloading granules needs Earthdata Login. |
| OpenTrafficCamMap | `raw.githubusercontent.com` | None | The catalogue is MIT-licensed. Camera streams belong to the transport agencies that run them. Stream URLs are listed in the output but never fetched. |

Keep tokens out of shell history. Set them with something like
`read -rs EARTHDATA_TOKEN && export EARTHDATA_TOKEN`.

## Known limits

- STAC: the server filters on cloud cover with the `query` extension (or
  CQL2 for CDSE), and the client checks the value again. Items with no
  `eo:cloud_cover` value are kept. Paging stops at `--max-pages` (50 by
  default), and the stderr summary says when output was truncated.
- ArcGIS: offset paging needs `supportsPagination`. Without it, the tool
  makes one request and fails if `exceededTransferLimit` is set. Results are
  always requested in WGS84 (`outSR=4326`). `--max-features` (100000 by
  default) sets an upper limit.
- Bounding boxes that cross the antimeridian are rejected. Split them into
  two queries.
- A CONNECT failure at a proxy counts as a transport error, so it is retried
  like any other.
- Only `cams` was run against the live service while this tool was being
  built. The sandbox blocks the STAC, CMR and ArcGIS hosts, so those
  subcommands are tested only against local mock servers.
