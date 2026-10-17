"""Rain already fallen and rain forecast at a US point, from the National Weather Service API.

Service: ``https://api.weather.gov``. ``/points/LAT,LON`` gives the forecast
grid and the list of nearby observation stations.

* Forecast: ``quantitativePrecipitation`` from the forecast grid. Each value is
  an ISO 8601 interval ("2026-10-17T12:00:00+00:00/PT6H"); periods are clipped
  to the window asked for, so "the next 24 h" is 24 h whatever the period
  lengths are.
* Observed: ``precipitationLast6Hours`` from the nearest station's
  observations, synoptic reports only (00/06/12/18 UTC) so periods do not
  overlap. Many stations leave it empty; then the observed total is ``None``,
  not 0.

The saturation multiplier (x1.0 up to 10 mm, x1.30 above 10 mm, x1.65 above
25 mm of observed + forecast rain) is the owner's rule from the field pipeline;
it is a planning weight, not a soil-moisture measurement.

NWS asks every client to send a User-Agent with contact details: pass
``--contact``. Network: ``urllib`` only.

CLI::

    python nws_rain.py 39.9612 -82.9988 --hours 24 --contact you@example.org

Exit codes: 0 ok; 2 the service could not be reached or answered with an error.
"""

import argparse
import datetime as dt
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.weather.gov"


class NWSError(Exception):
    pass


def _get_json(url, contact, opener=None, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": f"(revvel-standards blue-ocean-sar, {contact})",
                                               "Accept": "application/geo+json"})
    try:
        with (opener or urllib.request.urlopen)(req, timeout=timeout) as r:  # nosec B310 - fixed https host
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise NWSError(f"HTTP {e.code} from {url}") from e
    except (urllib.error.URLError, OSError, ValueError) as e:
        raise NWSError(f"{url}: {e}") from e


def parse_period(valid_time):
    start, dur = valid_time.split("/")
    t0 = dt.datetime.fromisoformat(start)
    m = re.fullmatch(r"P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?", dur)
    if not m or not any(m.groups()):
        raise NWSError(f"unsupported duration {dur!r}")
    d, h, mi = (int(x or 0) for x in m.groups())
    return t0, t0 + dt.timedelta(days=d, hours=h, minutes=mi)


def forecast_mm(grid, start, end):
    qpf = grid["properties"]["quantitativePrecipitation"]
    if not str(qpf.get("uom", "wmoUnit:mm")).endswith("mm"):
        raise NWSError(f"unexpected unit {qpf.get('uom')}")
    total = 0.0
    for v in qpf["values"]:
        a, b = parse_period(v["validTime"])
        overlap = (min(b, end) - max(a, start)).total_seconds()
        if overlap > 0 and v.get("value") is not None:
            total += v["value"] * overlap / (b - a).total_seconds()
    return total


def observed_mm(obs):
    total, seen = 0.0, 0
    for f in obs.get("features", []):
        p = f["properties"]
        t = dt.datetime.fromisoformat(p["timestamp"])
        v = (p.get("precipitationLast6Hours") or {}).get("value")
        if v is not None and t.hour % 6 == 0 and t.minute < 30:
            total += v
            seen += 1
    return total if seen else None


def multiplier(mm):
    return 1.65 if mm > 25 else 1.30 if mm > 10 else 1.00


def run(lat, lon, hours=24, contact="contact-not-set", opener=None, now=None):
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError(f"point out of range: {lat}, {lon}")
    if hours <= 0:
        raise ValueError("--hours must be > 0")
    now = now or dt.datetime.now(dt.timezone.utc)
    props = _get_json(f"{API}/points/{lat:.4f},{lon:.4f}", contact, opener)["properties"]
    grid = _get_json(props["forecastGridData"], contact, opener)
    fc = forecast_mm(grid, now, now + dt.timedelta(hours=hours))
    stations = _get_json(props["observationStations"], contact, opener)["features"]
    if not stations:
        raise NWSError("no observation stations listed for this point")
    station = stations[0]["properties"]["stationIdentifier"]
    q = urllib.parse.urlencode({"start": (now - dt.timedelta(hours=hours)).isoformat()})
    ob = observed_mm(_get_json(f"{API}/stations/{station}/observations?{q}", contact, opener))
    used = fc + (ob or 0.0)
    return {"lat": lat, "lon": lon, "hours": hours, "retrieved_utc": now.isoformat(timespec="seconds"),
            "forecast_next_mm": round(fc, 2), "observed_past_mm": None if ob is None else round(ob, 2),
            "station": station, "mm_used": round(used, 2), "multiplier": multiplier(used)}


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("lat", type=float)
    p.add_argument("lon", type=float)
    p.add_argument("--hours", type=int, default=24)
    p.add_argument("--contact", default="contact-not-set", help="your email or URL, sent in the User-Agent")
    a = p.parse_args(argv)
    try:
        print(json.dumps(run(a.lat, a.lon, a.hours, a.contact), indent=1))
    except (NWSError, ValueError, KeyError, IndexError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
