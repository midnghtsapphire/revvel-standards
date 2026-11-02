"""Tests for osm.py: Overpass query building and JSON->GeoJSON, Nominatim policy."""

import io
import json
import os
import sys
import unittest
import urllib.parse
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import osm  # noqa: E402
from _fakenet import FakeOpener, fixture_json  # noqa: E402

OVERPASS = "https://overpass-api.de/api/interpreter"
NOM = "https://nominatim.openstreetmap.org/"


def _run(argv, opener):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = osm.main(argv + ["--retries", "0"], opener=opener)
    return code, (json.loads(out.getvalue()) if out.getvalue() else None), err.getvalue()


class Query(unittest.TestCase):
    def test_build_query(self):
        q = osm.build_query(39.96, -83.0, 800, [osm.parse_tag("waterway"), osm.parse_tag("culvert=yes"),
                                                osm.parse_tag("man_made=manhole"), osm.parse_tag("highway=path")])
        self.assertTrue(q.startswith("[out:json][timeout:25];"))
        self.assertIn('nwr["waterway"](around:800,39.9600000,-83.0000000);', q)
        self.assertIn('nwr["culvert"="yes"](around:800,39.9600000,-83.0000000);', q)
        self.assertIn('nwr["highway"="path"]', q)
        self.assertTrue(q.endswith("out geom;"))

    def test_rejects_ql_injection(self):
        for t in ('name"](around:1e9,0,0);out;("', "a=b;out", "key=val]", "x=" + "y" * 200, ""):
            with self.assertRaises(ValueError, msg=t):
                osm.parse_tag(t)
        with self.assertRaises(ValueError):
            osm.build_query(0, 0, 50000, [("waterway", None)])
        with self.assertRaises(ValueError):
            osm.build_query(0, 0, 100, [])


class ToGeoJson(unittest.TestCase):
    def test_conversion(self):
        fc = osm.overpass_to_geojson(fixture_json("overpass_response.json"))
        feats = {f["id"]: f for f in fc["features"]}
        self.assertEqual(feats["node/2201550001"]["geometry"], {"type": "Point", "coordinates": [-83.0011, 39.9601]})
        self.assertEqual(feats["way/31000001"]["geometry"]["type"], "LineString")
        self.assertEqual(feats["way/31000001"]["geometry"]["coordinates"][0], [-83.01, 39.95])
        self.assertEqual(feats["way/31000002"]["properties"]["culvert"], "yes")
        self.assertEqual(feats["way/31000003"]["geometry"]["type"], "Polygon")
        self.assertEqual(feats["way/31000004"]["geometry"]["type"], "LineString")
        rel = feats["relation/9100001"]
        self.assertEqual(rel["geometry"]["type"], "MultiLineString")
        self.assertEqual(len(rel["geometry"]["coordinates"]), 2)
        self.assertEqual(rel["properties"]["@osm_type"], "relation")

    def test_cli_posts_query(self):
        op = FakeOpener().add("POST", OVERPASS, (200, fixture_json("overpass_response.json")))
        code, fc, err = _run(["overpass", "--lat", "39.96", "--lon", "-83.0", "--radius", "800",
                              "--tag", "waterway", "--tag", "culvert=yes"], op)
        self.assertEqual(code, 0, err)
        self.assertEqual(fc["type"], "FeatureCollection")
        self.assertEqual(fc["properties"]["n_features"], 6)
        self.assertIn("OpenStreetMap", fc["properties"]["attribution"])
        sent = urllib.parse.parse_qs(op.requests[0]["body"].decode())["data"][0]
        self.assertIn('nwr["culvert"="yes"]', sent)

    def test_overpass_runtime_error_remark(self):
        d = fixture_json("overpass_response.json")
        d["remark"] = "runtime error: Query timed out in \"query\" at line 3 after 26 seconds."
        op = FakeOpener().add("POST", OVERPASS, (200, d))
        code, _, _ = _run(["overpass", "--lat", "1", "--lon", "1", "--tag", "waterway"], op)
        self.assertEqual(code, 3)


class NominatimPolicy(unittest.TestCase):
    def setUp(self):
        self._old = os.environ.pop("CONTACT_EMAIL", None)

    def tearDown(self):
        os.environ.pop("CONTACT_EMAIL", None)
        if self._old is not None:
            os.environ["CONTACT_EMAIL"] = self._old

    def test_requires_contact(self):
        op = FakeOpener()
        code, _, err = _run(["nominatim", "--q", "Columbus"], op)
        self.assertEqual(code, 2)
        self.assertIn("CONTACT_EMAIL", err)
        self.assertEqual(op.requests, [])

    def test_ua_contact_and_rate_limit(self):
        now = [100.0]
        waits = []

        def sleep(s):
            waits.append(s)
            now[0] += s

        op = FakeOpener().add("GET", NOM, (200, fixture_json("nominatim_search.json")))
        n = osm.Nominatim(contact="sar-team@example.org", clock=lambda: now[0], sleep=sleep, opener=op,
                          retries=0)
        n.search("Scioto Audubon Metro Park")
        now[0] += 0.2
        n.search("Scioto Audubon Metro Park")
        self.assertEqual(len(waits), 1)
        self.assertAlmostEqual(waits[0], 0.8)
        ua = op.requests[0]["headers"]["user-agent"]
        self.assertIn("contact: sar-team@example.org", ua)
        self.assertIn("format=jsonv2", op.requests[0]["url"])

    def test_cli_search(self):
        os.environ["CONTACT_EMAIL"] = "sar-team@example.org"
        op = FakeOpener().add("GET", NOM + "search", (200, fixture_json("nominatim_search.json")))
        code, res, err = _run(["nominatim", "--q", "Scioto Audubon Metro Park"], op)
        self.assertEqual(code, 0, err)
        self.assertEqual(res["n_results"], 1)
        self.assertAlmostEqual(res["results"][0]["lat"], 39.9431002)


if __name__ == "__main__":
    unittest.main()
