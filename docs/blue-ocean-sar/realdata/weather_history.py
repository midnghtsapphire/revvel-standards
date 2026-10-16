#!/usr/bin/env python3
"""Historical hourly weather at a point (ERA5 reanalysis via Open-Meteo).

Answers "how cold was it, how much snow fell" with numbers from a named
dataset instead of a slide. ERA5 is a ~25 km reanalysis grid, so it gives the
area's weather, not a mountainside micro-climate; the nearest Environment
Canada / NOAA station is the better source when one exists.

No API key. Needs outbound access to archive-api.open-meteo.com (not reachable
from every environment; use --from-json to parse a response saved elsewhere).

Example:
  python weather_history.py --lat 50.884 --lon -119.882 --start 2018-02-16 \
      --end 2018-02-18 --tz America/Vancouver --out sunpeaks_feb2018.csv
"""

import argparse
import csv
import json
import sys
import urllib.parse
import urllib.request

API = "https://archive-api.open-meteo.com/v1/archive"
HOURLY = ["temperature_2m", "apparent_temperature", "snowfall", "snow_depth", "precipitation",
          "wind_speed_10m", "wind_gusts_10m", "cloud_cover"]


def fetch(lat, lon, start, end, tz):
    q = urllib.parse.urlencode({"latitude": lat, "longitude": lon, "start_date": start, "end_date": end,
                                "hourly": ",".join(HOURLY), "timezone": tz})
    url = f"{API}?{q}"
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.loads(r.read().decode("utf-8")), url


def summarise(data):
    h = data["hourly"]
    times = h["time"]
    rows = [dict(time=t, **{k: h[k][i] for k in HOURLY if k in h}) for i, t in enumerate(times)]
    temps = [(r["temperature_2m"], r["time"]) for r in rows if r.get("temperature_2m") is not None]
    snow = [r["snowfall"] for r in rows if r.get("snowfall") is not None]
    summ = {
        "grid_lat": data.get("latitude"), "grid_lon": data.get("longitude"),
        "grid_elevation_m": data.get("elevation"), "timezone": data.get("timezone"),
        "hours": len(rows),
        "min_temp_c": min(temps)[0] if temps else None, "min_temp_time": min(temps)[1] if temps else None,
        "max_temp_c": max(temps)[0] if temps else None,
        "total_snowfall_cm": round(sum(snow), 1) if snow else None,
    }
    return rows, summ


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--lat", type=float)
    ap.add_argument("--lon", type=float)
    ap.add_argument("--start", help="YYYY-MM-DD")
    ap.add_argument("--end", help="YYYY-MM-DD")
    ap.add_argument("--tz", default="auto")
    ap.add_argument("--from-json", help="parse a saved Open-Meteo response instead of fetching")
    ap.add_argument("--out", required=True)
    a = ap.parse_args(argv)
    if a.from_json:
        with open(a.from_json) as f:
            data = json.load(f)
        source = a.from_json
    else:
        if None in (a.lat, a.lon, a.start, a.end):
            ap.error("--lat --lon --start --end required (or --from-json)")
        data, source = fetch(a.lat, a.lon, a.start, a.end, a.tz)
    rows, summ = summarise(data)
    summ["source"] = source
    summ["dataset"] = "ERA5 reanalysis (Open-Meteo historical weather API)"
    with open(a.out, "w", newline="") as f:
        w = csv.DictWriter(f, ["time"] + HOURLY, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    print(json.dumps(summ, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
