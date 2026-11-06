#!/usr/bin/env python3
"""US Census Bureau geocoder: address -> coordinates and census geographies.

Service: https://geocoding.geo.census.gov/geocoder/ (no key, US addresses only).

  address     /geographies/onelineaddress  (or /locations/... with --no-geographies)
  coordinates /geographies/coordinates     (point -> state, county, tract, block)

  python census.py --address "1600 Pennsylvania Ave NW, Washington, DC 20500"
  python census.py --point -83.0007,39.9612 --out geo.json

Benchmark / vintage default to Public_AR_Current / Current_Current. The
geocoder interpolates along TIGER address ranges, so a match is a street-segment
position, not a rooftop; the output says which side of the street and which
TIGER line it used.
"""

import argparse
import sys

try:
    from . import fetch as F
except ImportError:
    import fetch as F

BASE = "https://geocoding.geo.census.gov/geocoder"
HOSTS = ["geocoding.geo.census.gov"]
LAYER_KEYS = ("States", "Counties", "Census Tracts", "2020 Census Blocks", "Census Blocks",
              "County Subdivisions", "Incorporated Places", "Urban Areas")


def _geographies(geos):
    out = {}
    for key in LAYER_KEYS:
        rows = (geos or {}).get(key)
        if rows:
            r = rows[0]
            out[key] = {"GEOID": r.get("GEOID"), "NAME": r.get("NAME") or r.get("BASENAME"),
                        "CENTLAT": r.get("CENTLAT"), "CENTLON": r.get("CENTLON")}
    return out


def _check_resp(d):
    if "errors" in d:
        raise ValueError("census geocoder: " + "; ".join(str(e) for e in d["errors"]))
    if "result" not in d:
        raise F.FetchError("census geocoder: response has no 'result'")
    return d["result"]


def geocode_address(address, benchmark="Public_AR_Current", vintage="Current_Current", geographies=True, **kw):
    address = (address or "").strip()
    if not 3 <= len(address) <= 200:
        raise ValueError("address must be 3..200 characters")
    kind = "geographies" if geographies else "locations"
    params = {"address": address, "benchmark": benchmark, "format": "json"}
    if geographies:
        params["vintage"] = vintage
    result = _check_resp(F.fetch_json(f"{BASE}/{kind}/onelineaddress", allowed_hosts=HOSTS, params=params, **kw))
    matches = []
    for m in result.get("addressMatches") or []:
        c = m.get("coordinates") or {}
        tl = m.get("tigerLine") or {}
        matches.append({
            "matched_address": m.get("matchedAddress"),
            "lon": c.get("x"), "lat": c.get("y"),
            "tiger_line_id": tl.get("tigerLineId"), "side": tl.get("side"),
            "geographies": _geographies(m.get("geographies")),
        })
    return {"input": address, "benchmark": benchmark, "vintage": vintage if geographies else None,
            "n_matches": len(matches), "matches": matches}


def geographies_for_point(lon, lat, benchmark="Public_AR_Current", vintage="Current_Current", **kw):
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise ValueError("point out of range")
    params = {"x": f"{lon:.7f}", "y": f"{lat:.7f}", "benchmark": benchmark, "vintage": vintage, "format": "json"}
    result = _check_resp(F.fetch_json(f"{BASE}/geographies/coordinates", allowed_hosts=HOSTS, params=params, **kw))
    return {"lon": lon, "lat": lat, "benchmark": benchmark, "vintage": vintage,
            "geographies": _geographies(result.get("geographies"))}


def run(a, opener=None):
    kw = F.common_kwargs(a, opener)
    if bool(a.address) == bool(a.point):
        raise ValueError("give exactly one of --address or --point")
    if a.address:
        res = geocode_address(a.address, a.benchmark, a.vintage, not a.no_geographies, **kw)
    else:
        try:
            lon, lat = (float(v) for v in a.point.split(","))
        except ValueError:
            raise ValueError("--point needs LON,LAT")
        res = geographies_for_point(lon, lat, a.benchmark, a.vintage, **kw)
    res["source"] = BASE
    res["retrieved_at_utc"] = F.utc_now()
    return res


def build_parser():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--address", help="one-line US address")
    ap.add_argument("--point", help="LON,LAT -> census geographies")
    ap.add_argument("--benchmark", default="Public_AR_Current")
    ap.add_argument("--vintage", default="Current_Current")
    ap.add_argument("--no-geographies", action="store_true", help="coordinates only (locations endpoint)")
    F.add_common_args(ap)
    return ap


def main(argv=None, opener=None):
    return F.cli_main(build_parser(), run, argv, opener)


if __name__ == "__main__":
    sys.exit(main())
