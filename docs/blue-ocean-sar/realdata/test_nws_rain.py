"""Tests for nws_rain.py with a fake api.weather.gov (no network)."""

import datetime as dt
import io
import json
import os
import sys
import unittest
import urllib.parse
from contextlib import redirect_stderr, redirect_stdout

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import nws_rain as nr  # noqa: E402

NOW = dt.datetime(2026, 10, 17, 12, tzinfo=dt.timezone.utc)
GRID = {"properties": {"quantitativePrecipitation": {"uom": "wmoUnit:mm", "values": [
    {"validTime": "2026-10-17T06:00:00+00:00/PT6H", "value": 50.0},   # entirely in the past: not counted
    {"validTime": "2026-10-17T12:00:00+00:00/PT6H", "value": 4.0},    # fully inside
    {"validTime": "2026-10-17T18:00:00+00:00/PT12H", "value": 12.0},  # fully inside
    {"validTime": "2026-10-18T06:00:00+00:00/P1DT6H", "value": 30.0},  # 6 h of 30 h inside -> 6.0
    {"validTime": "2026-10-19T12:00:00+00:00/PT6H", "value": None}]}}}
OBS = {"features": [
    {"properties": {"timestamp": "2026-10-17T00:00:00+00:00", "precipitationLast6Hours": {"value": 3.0}}},
    {"properties": {"timestamp": "2026-10-17T06:00:00+00:00", "precipitationLast6Hours": {"value": 2.0}}},
    {"properties": {"timestamp": "2026-10-17T06:53:00+00:00", "precipitationLast6Hours": {"value": 2.0}}},
    {"properties": {"timestamp": "2026-10-17T09:00:00+00:00", "precipitationLast6Hours": {"value": None}}}]}


class Resp(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def fake(obs=OBS, stations=True):
    seen = []

    def opener(req, timeout=None):
        url = req.full_url
        seen.append((url, req.headers.get("User-agent")))
        path = urllib.parse.urlparse(url).path
        if path.startswith("/points/"):
            body = {"properties": {"forecastGridData": nr.API + "/gridpoints/ILN/84,82",
                                   "observationStations": nr.API + "/gridpoints/ILN/84,82/stations"}}
        elif path.endswith("/stations"):
            body = {"features": [{"properties": {"stationIdentifier": "KCMH"}}] if stations else []}
        elif "/observations" in path:
            body = obs
        else:
            body = GRID
        return Resp(json.dumps(body).encode())
    return opener, seen


class Rain(unittest.TestCase):
    def test_forecast_is_clipped_to_the_window(self):
        self.assertAlmostEqual(nr.forecast_mm(GRID, NOW, NOW + dt.timedelta(hours=24)), 4 + 12 + 6.0)

    def test_observed_uses_synoptic_reports_only(self):
        self.assertEqual(nr.observed_mm(OBS), 5.0)
        self.assertIsNone(nr.observed_mm({"features": []}))

    def test_full_run_and_request_urls(self):
        opener, seen = fake()
        r = nr.run(39.9612, -82.9988, 24, "ops@example.org", opener=opener, now=NOW)
        self.assertEqual((r["forecast_next_mm"], r["observed_past_mm"], r["mm_used"], r["multiplier"]),
                         (22.0, 5.0, 27.0, 1.65))
        self.assertEqual(seen[0][0], "https://api.weather.gov/points/39.9612,-82.9988")
        self.assertIn("ops@example.org", seen[0][1])
        self.assertTrue(any(u.startswith("https://api.weather.gov/stations/KCMH/observations?start=") for u, _ in seen))

    def test_multiplier_steps(self):
        self.assertEqual([nr.multiplier(m) for m in (0, 10, 10.1, 25, 25.1)], [1.0, 1.0, 1.3, 1.3, 1.65])

    def test_errors_exit_2_instead_of_pretending_dry(self):
        def down(req, timeout=None):
            raise OSError("blocked")
        with self.assertRaises(nr.NWSError):
            nr.run(39.96, -82.99, opener=down, now=NOW)
        opener, _ = fake(stations=False)
        with self.assertRaises(nr.NWSError):
            nr.run(39.96, -82.99, opener=opener, now=NOW)
        with self.assertRaises(nr.NWSError):
            nr.parse_period("2026-10-17T00:00:00+00:00/PT")
        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            self.assertEqual(nr.main(["95", "0"]), 2)


if __name__ == "__main__":
    unittest.main()
