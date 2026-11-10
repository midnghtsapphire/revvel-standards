"""Tests for traffic_cams.py using the real OpenTrafficCamMap catalogue.

The trimmed fixture (fixtures/otcm_USA_trimmed.json) is cut from the real
USA.json downloaded on 2026-10-16 (sha256 in the .provenance.json). Set
OPENDATA_OTCM_FULL to a downloaded full USA.json to also run the full-file
tests (e.g. python traffic_cams.py --country USA --save-catalog USA.json).
"""

import hashlib
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import traffic_cams as T  # noqa: E402
from _fakenet import FIXTURES, FakeOpener, FakeResponse, fixture_bytes, fixture_json, read_json  # noqa: E402

TRIM = os.path.join(FIXTURES, "otcm_USA_trimmed.json")
FULL = os.environ.get("OPENDATA_OTCM_FULL")
JPEG = b"\xff\xd8\xff\xe0" + b"\x00\x10JFIF" + b"\x00" * 64 + b"\xff\xd9"
# Bowling Green, KY (Warren County), where the trimmed fixture has 13 cameras.
BG = (36.97, -86.45)


def _run(argv, opener=None):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = T.main(argv + ["--retries", "0"], opener=opener or FakeOpener())
    return code, (json.loads(out.getvalue()) if out.getvalue() else None), err.getvalue()


class Radius(unittest.TestCase):
    def setUp(self):
        self.cat = fixture_json("otcm_USA_trimmed.json")

    def test_haversine(self):
        self.assertAlmostEqual(T.haversine_km(0, 0, 0, 1), 111.195, places=2)
        self.assertEqual(T.haversine_km(10, 10, 10, 10), 0)

    def test_within_radius_sorted_and_bounded(self):
        hits = T.within_radius(self.cat, BG[0], BG[1], 5.0)
        self.assertTrue(hits)
        self.assertTrue(all(h["distance_km"] <= 5.0 for h in hits))
        self.assertEqual([h["distance_km"] for h in hits], sorted(h["distance_km"] for h in hits))
        self.assertTrue(all(h["state"] == "Kentucky" for h in hits))
        # every camera in the fixture is either inside or provably outside
        inside = {h["id"] for h in hits}
        for cam in T.iter_cameras(self.cat):
            d = T.haversine_km(BG[0], BG[1], cam["latitude"], cam["longitude"])
            self.assertEqual(cam["id"] in inside, d <= 5.0, cam["id"])

    def test_format_filter_and_limit(self):
        hits = T.within_radius(self.cat, 30.54, -88.23, 10.0, fmt="M3U8", limit=2)
        self.assertEqual(len(hits), 2)
        self.assertTrue(all(h["format"] == "M3U8" for h in hits))

    def test_trimmed_fixture_matches_provenance_source_shape(self):
        prov = fixture_json("otcm_USA_trimmed.provenance.json")
        self.assertEqual(len(prov["source_sha256"]), 64)
        n = sum(1 for _ in T.iter_cameras(self.cat))
        self.assertEqual(n, 30)

    def test_cli_with_catalog_file(self):
        code, res, err = _run(["--catalog-file", TRIM, "--lat", str(BG[0]), "--lon", str(BG[1]), "--radius-km", "5"])
        self.assertEqual(code, 0, err)
        self.assertEqual(res["catalog"]["sha256"], hashlib.sha256(fixture_bytes("otcm_USA_trimmed.json")).hexdigest())
        self.assertEqual(res["n_cameras"], len(res["cameras"]))

    def test_fetch_catalogue_from_github_raw(self):
        op = FakeOpener().add("GET", T.CATALOG_BASE + "USA.json", (200, fixture_bytes("otcm_USA_trimmed.json")))
        code, res, err = _run(["--country", "USA", "--lat", str(BG[0]), "--lon", str(BG[1])], op)
        self.assertEqual(code, 0, err)
        self.assertTrue(res["catalog"]["catalog_url"].startswith("https://raw.githubusercontent.com/"))

    def test_bad_inputs(self):
        for argv in (["--country", "../etc"], [], ["--catalog-file", TRIM, "--lat", "1"],
                     ["--catalog-file", TRIM, "--lat", "1", "--lon", "1", "--radius-km", "0"],
                     ["--catalog-file", TRIM, "--snapshot-nearest", "1"]):
            code, _, _ = _run(argv)
            self.assertEqual(code, 2, argv)


@unittest.skipUnless(FULL and os.path.exists(FULL or ""), "set OPENDATA_OTCM_FULL to a downloaded USA.json")
class FullCatalogue(unittest.TestCase):
    def test_full_file_radius_search(self):
        cat, prov = T.load_catalog(catalog_file=FULL)
        total = sum(1 for _ in T.iter_cameras(cat))
        self.assertGreater(total, 1000)
        hits = T.within_radius(cat, BG[0], BG[1], 5.0)
        trimmed = T.within_radius(fixture_json("otcm_USA_trimmed.json"), BG[0], BG[1], 5.0)
        # the trimmed fixture holds all of Warren County, so the near set must agree
        self.assertEqual([(h["id"], h["url"]) for h in hits], [(h["id"], h["url"]) for h in trimmed])
        for h in T.within_radius(cat, 34.05, -118.25, 3.0):  # downtown Los Angeles
            self.assertLessEqual(h["distance_km"], 3.0)


class Snapshots(unittest.TestCase):
    def setUp(self):
        self.cat = fixture_json("otcm_USA_trimmed.json")
        self.near = [c for c in T.within_radius(self.cat, BG[0], BG[1], 5.0) if c["format"] == "IMAGE_STREAM"]

    def test_snapshot_saved_with_hash_and_time(self):
        cam = self.near[0]
        op = FakeOpener().add("GET", cam["url"], FakeResponse(200, JPEG, {"Content-Type": "image/jpeg"}))
        with tempfile.TemporaryDirectory() as d:
            code, res, err = _run(["--catalog-file", TRIM, "--lat", str(BG[0]), "--lon", str(BG[1]),
                                   "--snapshot-nearest", "1", "--snapshot-dir", d], op)
            self.assertEqual(code, 0, err)
            snap = res["snapshots"][0]
            self.assertEqual(snap["sha256"], hashlib.sha256(JPEG).hexdigest())
            self.assertTrue(snap["fetched_at_utc"].endswith("Z"))
            self.assertTrue(os.path.exists(snap["path"]))
            side = read_json(snap["path"] + ".json")
        self.assertEqual(side["camera"]["url"], cam["url"])
        self.assertEqual(side["catalog"]["sha256"], res["catalog"]["sha256"])
        self.assertEqual(op.requests[0]["url"], cam["url"])

    def test_stream_and_rtsp_not_fetched(self):
        m3u8 = next(c for c in T.iter_cameras(self.cat) if c["format"] == "M3U8")
        op = FakeOpener()
        with tempfile.TemporaryDirectory() as d:
            rec = T.snapshot(m3u8, self.cat, d, opener=op)
            rtsp = dict(self.near[0], url="rtsp://cam.example.org/live")
            cat2 = json.loads(json.dumps(self.cat))
            cat2["Kentucky"]["Warren"][0]["url"] = "rtsp://cam.example.org/live"
            rec2 = T.snapshot(rtsp, cat2, d, opener=op)
        self.assertIn("skipped", rec)
        self.assertIn("skipped", rec2)
        self.assertEqual(op.requests, [])

    def test_url_not_in_catalogue_refused(self):
        cam = dict(self.near[0], url="http://evil.example.net/x.jpg")
        op = FakeOpener()
        with tempfile.TemporaryDirectory() as d:
            rec = T.snapshot(cam, self.cat, d, opener=op)
        self.assertIn("not in the public catalogue", rec["skipped"])
        self.assertEqual(op.requests, [])

    def test_cross_host_redirect_and_non_image_rejected(self):
        a, b = self.near[0], self.near[1]
        op = FakeOpener()
        op.add("GET", a["url"], (302, b"", {"Location": "http://elsewhere.example.net/a.jpg"}))
        op.add("GET", b["url"], FakeResponse(200, b"<html>login</html>", {"Content-Type": "text/html"}))
        with tempfile.TemporaryDirectory() as d:
            code, res, err = _run(["--catalog-file", TRIM, "--snapshot-id", a["id"], "--snapshot-id", b["id"],
                                   "--snapshot-dir", d], op)
            self.assertEqual(os.listdir(d), [])
        self.assertEqual(code, 3, "no snapshot fetched must not exit 0")
        self.assertIn("redirect", res["snapshots"][0]["error"])
        self.assertIn("not an image", res["snapshots"][1]["error"])

    def test_unknown_id(self):
        with tempfile.TemporaryDirectory() as d:
            code, _, _ = _run(["--catalog-file", TRIM, "--snapshot-id", "Nowhere/x/0", "--snapshot-dir", d])
        self.assertEqual(code, 2)


if __name__ == "__main__":
    unittest.main()
