"""Tests for census.py using recorded Census geocoder responses."""

import io
import json
import os
import sys
import unittest
import urllib.parse
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import census  # noqa: E402
from _fakenet import FakeOpener, fixture_json  # noqa: E402

BASE = "https://geocoding.geo.census.gov/geocoder/"


def _run(argv, opener):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = census.main(argv + ["--retries", "0"], opener=opener)
    return code, (json.loads(out.getvalue()) if out.getvalue() else None), err.getvalue()


class Census(unittest.TestCase):
    def test_address(self):
        op = FakeOpener().add("GET", BASE + "geographies/onelineaddress",
                              (200, fixture_json("census_onelineaddress.json")))
        code, res, err = _run(["--address", "1600 Pennsylvania Ave NW, Washington, DC 20500"], op)
        self.assertEqual(code, 0, err)
        m = res["matches"][0]
        self.assertAlmostEqual(m["lat"], 38.89869893252)
        self.assertAlmostEqual(m["lon"], -77.03518753691)
        self.assertEqual(m["geographies"]["Census Tracts"]["GEOID"], "11001006202")
        self.assertEqual(m["geographies"]["2020 Census Blocks"]["GEOID"], "110010062021031")
        q = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(op.requests[0]["url"]).query))
        self.assertEqual(q["benchmark"], "Public_AR_Current")
        self.assertEqual(q["vintage"], "Current_Current")
        self.assertEqual(q["format"], "json")

    def test_point(self):
        op = FakeOpener().add("GET", BASE + "geographies/coordinates", (200, fixture_json("census_coordinates.json")))
        code, res, err = _run(["--point", "-77.0352,38.8987"], op)
        self.assertEqual(code, 0, err)
        self.assertEqual(res["geographies"]["Counties"]["GEOID"], "11001")

    def test_locations_only(self):
        d = fixture_json("census_onelineaddress.json")
        op = FakeOpener().add("GET", BASE + "locations/onelineaddress", (200, d))
        code, _, _ = _run(["--address", "1600 Pennsylvania Ave NW, Washington, DC", "--no-geographies"], op)
        self.assertEqual(code, 0)
        self.assertNotIn("vintage=", op.requests[0]["url"])

    def test_bad_input(self):
        for argv in ([], ["--address", "x"], ["--point", "abc"], ["--address", "a b c", "--point", "1,2"]):
            code, _, _ = _run(argv, FakeOpener())
            self.assertEqual(code, 2, argv)

    def test_api_error_body(self):
        op = FakeOpener().add("GET", BASE, (400, fixture_json("census_error.json")))
        code, _, err = _run(["--address", "Washington DC"], op)
        self.assertEqual(code, 3)
        self.assertIn("House number", err)


if __name__ == "__main__":
    unittest.main()
