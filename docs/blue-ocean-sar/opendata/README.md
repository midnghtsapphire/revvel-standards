# Open-data connectors

Command-line connectors to public open-data platforms. They use only official
open endpoints, or the user's own free developer credentials. Everything uses
the Python standard library (`urllib`). `pystac-client` is not needed.

Every request goes through `fetch.py`, which enforces these rules:

- HTTPS only. The one exception is a traffic-camera still image whose exact
  `http://` URL is listed in the public catalogue.
- Each module has its own host allow-list. The first URL and every redirect
  hop are checked against it.
- Responses have a size cap and a timeout.
- 429 and 5xx responses are retried with backoff. A `Retry-After` header is
  honoured; if it asks for more than 120 s, the request fails instead.
- The User-Agent names the project. When `CONTACT_EMAIL` is set, the
  User-Agent includes it.
- `--evidence-log DIR` appends every response to the shared evidence log in
  [`../evidence`](../evidence/README.md) (format `revvel-evidence/1`). Each
  entry records and hashes the operator, host, tool version and git commit,
  clock state, redacted URL and redirect hops, HTTP status, the server's
  `Date` header, the SHA-256 of the TLS peer certificate, the redacted response
  headers and the request-body hash, and chains to the entry before it. The
  operator is required: `--operator NAME` or `EVIDENCE_OPERATOR`.
  `--evidence-key KEY` signs every entry with an Ed25519 key (passphrase from
  `--evidence-key-passphrase-file` or `EVIDENCE_KEY_PASSPHRASE`, never argv).
  Stored files are named `<seq>_<sha256>.bin`, so two captures in the same
  second never collide. A body that contains a secret is stored with the
  secret replaced, and the as-received hash is kept. Check a log with
  `python3 -m evidence verify --log DIR --public-key op.pub` from
  `docs/blue-ocean-sar/`. This needs the `cryptography` package; the
  connectors do not need it otherwise.
- `--evidence-dir DIR` (deprecated, kept unchanged for existing scripts and
  directories) saves the raw response bytes and a JSON sidecar for each
  request. The sidecar records the sha256, the redacted URL, the UTC time and
  the HTTP status. It has no chain, no operator and no Date or TLS data, its
  metadata can be edited undetected, and two identical responses in the same
  second share a name, so the second overwrites the first. Using it prints a
  warning. `python3 -m evidence import DIR --into LOG` moves a verified
  sidecar directory into a shared log. Both options can be given together.
- Secrets come only from environment variables, or from a file whose path you
  pass with `--token-file` or `--pc-key-file`. A secret is never accepted as a
  command-line value and is never logged. Secrets are redacted from saved and
  logged URLs and from error messages. If a response body contains a secret,
  the body is not saved; only its hash is recorded. Credential headers are
  sent only to the hosts that need them, so a redirect to another host never
  carries them.

Exit codes:

- `0`: success.
- `2`: bad input, or a URL refused by policy.
- `3`: the remote service failed, or the requested outcome was not met (for
  example, no camera snapshot could be fetched).

## Sources

| Module | Source | Key needed? | Environment variable |
| --- | --- | --- | --- |
| `stac.py` | Earth Search (Element 84) STAC | no | - |
| `stac.py` | Microsoft Planetary Computer STAC and SAS signing | no; an optional key raises limits | `PC_SDK_SUBSCRIPTION_KEY` |
| `stac.py` | Copernicus Data Space STAC | search: no | - |
| `stac.py` | NASA CMR-STAC (`cmr-lpcloud`, `cmr-nsidc`, `cmr-ornl`) | search: no; downloads: yes | `EARTHDATA_TOKEN` |
| `cmr.py` | NASA CMR granule search (GEDI, ICESat-2) | search: no; downloads: yes | `EARTHDATA_TOKEN` or `~/.netrc` |
| `arcgis.py` | Any public ArcGIS REST FeatureServer or MapServer layer | no | - |
| `osm.py` | Overpass API | no | - |
| `osm.py` | Nominatim | no key, but a contact is required | `CONTACT_EMAIL` |
| `census.py` | US Census geocoder | no | - |
| `usgs_3dep.py` | USGS 3DEP Elevation ImageServer | no | - |
| `traffic_cams.py` | OpenTrafficCamMap catalogue and listed DOT still images | no | - |

### Setting credentials

```sh
export EARTHDATA_TOKEN="$(cat ~/.config/earthdata/token)"   # or: --token-file ~/.config/earthdata/token
export PC_SDK_SUBSCRIPTION_KEY="$(cat ~/.config/pc/key)"    # optional
export CONTACT_EMAIL="you@example.org"                      # required for Nominatim
```

To get an Earthdata token, sign in at <https://urs.earthdata.nasa.gov> and use
"Generate Token". As an alternative to a token, `cmr.py` can use basic auth
from a `~/.netrc` entry (`machine urs.earthdata.nasa.gov login ... password ...`).
That entry is sent only to `urs.earthdata.nasa.gov`.

## Rate limits and terms of use

- **Earth Search**: open data on AWS. Each dataset has its own licence; for
  example, Sentinel-2 is under the Copernicus open licence. Page sizes are
  limited, and pagination is followed for you.
- **Planetary Computer**: see the Microsoft Planetary Computer terms. SAS
  tokens are short-lived and anonymous, and are rate-limited per IP address
  unless you supply a subscription key. Signed hrefs contain a `sig`; the
  `sig` is redacted in logs and evidence, but present in the output so the
  links work.
- **Copernicus Data Space**: search is open. Downloading products needs a
  free CDSE account and token, which this package does not implement.
  Copernicus data licence.
- **NASA CMR and CMR-STAC**: search is open. Downloads need a free Earthdata
  Login, and you must accept each DAAC's EULA once in the browser (LP DAAC
  for GEDI, NSIDC for ICESat-2). NASA data are open; cite the datasets.
- **ArcGIS REST**: query only services that are public. Each service sets its
  own `maxRecordCount` and terms; check the layer's description. This package
  pages politely and never sends tokens to ArcGIS.
- **Overpass**: keep usage under about 10,000 queries/day and 1 GB/day. A 429
  means the server's slots are busy; wait before retrying. The data is ODbL,
  so attribute "(c) OpenStreetMap contributors".
- **Nominatim**: at most one request per second, no bulk geocoding, and you
  must identify your application. This package enforces the 1 s spacing
  within a run and refuses to run without `CONTACT_EMAIL`. The data is ODbL.
- **US Census geocoder**: public domain. Covers US addresses only. Matches
  are interpolated along street segments, not rooftops.
- **USGS 3DEP**: public domain. `exportImage` is limited to 4000 x 4000 pixels
  per request in this package. Elevations are in metres, NAVD88.
- **OpenTrafficCamMap**: a community catalogue of feeds that DOTs publish
  openly. Snapshots are fetched only from the URLs the catalogue lists, only
  for still images (`IMAGE_STREAM`), from the same host, and at most 20 per
  run. The package never fetches video streams (`M3U8`) or `rtsp://` URLs,
  handles no credentials, and covers no private cameras. Respect each DOT's
  terms and update rate.

## Examples

```sh
# Sentinel-2 scenes with under 20% cloud, red band hrefs only
python3 stac.py --catalog earth-search --collections sentinel-2-l2a \
  --bbox -83.10,39.90,-82.90,40.05 --datetime 2024-06-01/2024-06-30 \
  --max-cloud 20 --band red --out s2.json

# Planetary Computer, signed hrefs
python3 stac.py --catalog planetary-computer --collections sentinel-2-l2a \
  --bbox -83.10,39.90,-82.90,40.05 --query "eo:cloud_cover<10" --band B04 --sign

# GEDI L2A via CMR-STAC, downloading the granules (token from the environment)
python3 stac.py --catalog cmr-lpcloud --collections GEDI02_A_002 \
  --bbox -83.10,39.90,-82.90,40.05 --max-items 2 --band data --download-dir gedi/

# ICESat-2 ATL08 granules via CMR (search only)
python3 cmr.py --short-name atl08 --bbox -83.10,39.90,-82.90,40.05 \
  --temporal 2022-01-01/2022-12-31 --out atl08.json

# ArcGIS layer: metadata, then a filtered query in GeoJSON
python3 arcgis.py https://services.arcgis.com/<org>/arcgis/rest/services/<name>/FeatureServer/0 --info
python3 arcgis.py <layer-url> --eq STATUS=Active --date-range INSPECTED 2023-01-01 2023-12-31 \
  --bbox -83.10,39.90,-82.90,40.05 --out layer.geojson

# Drainage and access features within 800 m of a point
python3 osm.py overpass --lat 39.96 --lon -83.00 --radius 800 \
  --tag waterway --tag culvert=yes --tag man_made=manhole --tag highway=path --out osm.geojson
python3 osm.py nominatim --q "Scioto Audubon Metro Park"

# Census geocoder
python3 census.py --address "1600 Pennsylvania Ave NW, Washington, DC 20500"
python3 census.py --point -83.0007,39.9612

# 3DEP: GeoTIFF for a bbox (with a sha256 sidecar), and point elevations
python3 usgs_3dep.py export --bbox -83.02,39.95,-83.00,39.97 --resolution-m 1 --out-tif dem.tif
python3 usgs_3dep.py sample --point -83.01,39.96 --point -83.005,39.955

# Traffic cameras within 5 km, plus a still from the nearest one
python3 traffic_cams.py --country USA --save-catalog USA.json --lat 36.97 --lon -86.45 --radius-km 5
python3 traffic_cams.py --catalog-file USA.json --lat 36.97 --lon -86.45 \
  --snapshot-nearest 1 --snapshot-dir snaps/ --evidence-dir evidence/
```

Add `--evidence-log DIR --operator NAME` (optionally `--evidence-key KEY`) to
any command to keep the raw responses in the shared evidence log, and `-v` to
log the requests (with secrets redacted) to stderr. The older
`--evidence-dir DIR` still works but is deprecated.

## Source health and mirror selection (`source_health.py`)

This tool probes every satellite and terrain source the tools depend on, and
checks what each one returns:

- **STAC search:** must return features.
- **COG:** must start with the TIFF magic bytes and honour an HTTP Range
  request.
- **CMR:** must return the collection.
- **NWIS:** must return a time series.

For each service it then picks the first healthy mirror. It skips a mirror
that failed most of its recent runs (`--state`) while another is healthy.
Timeouts are 4 × the slowest successful probe, between 10 and 120 s. The
result goes to `--config-out`.

**Exit codes:**

- 1 when a required service (Sentinel-2 search, Sentinel-2 COGs or the
  Copernicus DEM) has no healthy mirror.
- 2 on bad input.
- Optional services that are down are reported but do not fail the run.

**Workflows:**

- `.github/workflows/blue-ocean-sar-source-health.yml` runs it every six
  hours. A red run means a required source is down, and GitHub emails the
  repository owner.
- The live-run workflow runs it first and uses the chosen STAC mirror and
  timeout.

**What it does not do:**

- It does not fix a provider outage, rotate credentials or edit code.
- GitHub only runs scheduled workflows from the default branch, can delay
  them, and disables them after 60 days with no repository activity.

```bash
python3 source_health.py --out health.json --config-out download_config.json
python3 source_health.py --only sentinel2-cog,copernicus-dem --samples 3 --state state.json
```

## Tests

```sh
python3 -m unittest discover -v
```

The tests use recorded responses in `fixtures/`, served through an injectable
opener (`_fakenet.py`). Those responses were written from each API's
documented response format. The exception is `otcm_USA_trimmed.json`, which
was cut from the real catalogue; its `.provenance.json` records the source
sha256. Set `OPENDATA_OTCM_FULL=/path/to/USA.json` to also run the radius
search against the full downloaded catalogue.
