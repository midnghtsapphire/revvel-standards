"""Tests for usgs_3dep.py: bbox serialisation, exportImage (image and json), samples."""

import io
import json
import os
import sys
import tempfile
import unittest
import urllib.parse
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import usgs_3dep as U  # noqa: E402
from _fakenet import FakeOpener, FakeResponse, fixture_json, read_json  # noqa: E402

SVC = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer"
TIFF = b"II*\x00" + b"\x08\x00\x00\x00" + b"\x00" * 120


def _run(argv, opener):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = U.main(argv + ["--retries", "0"], opener=opener)
    return code, (json.loads(out.getvalue()) if out.getvalue() else None), err.getvalue()


def _q(url):
    return dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(url).query))


class Bbox(unittest.TestCase):
    def test_bbox_serialised_once_not_repeated(self):
        bbox = [-83.02, 39.95, -83.0, 39.97]
        s = U.format_bbox(bbox)
        self.assertEqual(s, "-83.02,39.95,-83.0,39.97")
        self.assertEqual(len(s.split(",")), 4)
        self.assertEqual([float(v) for v in s.split(",")], bbox)
        # the owner's draft repeated the whole list for each slot; guard against that shape
        self.assertNotIn("[", s)
        self.assertNotEqual(s, ",".join(str(bbox) for _ in range(4)))
        with self.assertRaises(ValueError):
            U.format_bbox(bbox * 4)

    def test_bbox_on_the_wire(self):
        op = FakeOpener().add("GET", SVC + "/exportImage", FakeResponse(200, TIFF, {"Content-Type": "image/tiff"}))
        with tempfile.TemporaryDirectory() as d:
            code, res, err = _run(["export", "--bbox", "-83.02,39.95,-83.00,39.97", "--size", "200,200",
                                   "--out-tif", os.path.join(d, "dem.tif")], op)
        self.assertEqual(code, 0, err)
        q = _q(op.requests[0]["url"])
        self.assertEqual(q["bbox"], "-83.02,39.95,-83.0,39.97")
        self.assertEqual(q["bboxSR"], "4326")
        self.assertEqual(q["size"], "200,200")
        self.assertEqual(q["format"], "tiff")
        self.assertEqual(q["f"], "image")

    def test_size_from_resolution(self):
        w, h = U.size_for_resolution([-83.02, 39.95, -83.0, 39.97], 10)
        self.assertTrue(160 <= w <= 180, w)
        self.assertTrue(215 <= h <= 230, h)
        with self.assertRaises(ValueError):
            U.export_params([-84, 39, -83, 40], (9000, 10))


class Export(unittest.TestCase):
    def test_image_mode_saves_tif_with_sha256_sidecar(self):
        op = FakeOpener().add("GET", SVC + "/exportImage", FakeResponse(200, TIFF, {"Content-Type": "image/tiff"}))
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "dem.tif")
            code, res, err = _run(["export", "--bbox", "-83.02,39.95,-83.00,39.97", "--out-tif", path], op)
            self.assertEqual(code, 0, err)
            self.assertTrue(os.path.exists(path))
            side = read_json(path + ".json")
        import hashlib
        self.assertEqual(side["sha256"], hashlib.sha256(TIFF).hexdigest())
        self.assertEqual(res["sha256"], side["sha256"])
        self.assertEqual(side["status"], 200)
        self.assertTrue(side["fetched_at_utc"].endswith("Z"))
        self.assertIn("exportImage", side["url"])

    def test_json_mode_follows_href(self):
        info = fixture_json("usgs3dep_export_json.json")
        op = FakeOpener()
        op.add("GET", SVC + "/exportImage", (200, info))
        op.add("GET", info["href"], FakeResponse(200, TIFF, {"Content-Type": "image/tiff"}))
        with tempfile.TemporaryDirectory() as d:
            code, res, err = _run(["export", "--bbox", "-83.02,39.95,-83.00,39.97", "--mode", "json",
                                   "--out-tif", os.path.join(d, "dem.tif")], op)
        self.assertEqual(code, 0, err)
        self.assertEqual(_q(op.requests[0]["url"])["f"], "json")
        self.assertEqual(op.requests[1]["url"], info["href"])
        self.assertEqual(res["width"], 171)

    def test_json_mode_href_off_host_refused(self):
        info = fixture_json("usgs3dep_export_json.json")
        info["href"] = "https://evil.example.net/x.tif"
        op = FakeOpener().add("GET", SVC + "/exportImage", (200, info))
        with tempfile.TemporaryDirectory() as d:
            code, _, _ = _run(["export", "--bbox", "-83.02,39.95,-83.00,39.97", "--mode", "json",
                               "--out-tif", os.path.join(d, "dem.tif")], op)
        self.assertEqual(code, 2)

    def test_error_json_with_200_is_not_saved(self):
        op = FakeOpener().add("GET", SVC + "/exportImage", (200, fixture_json("usgs3dep_error.json")))
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "dem.tif")
            code, _, err = _run(["export", "--bbox", "-83.02,39.95,-83.00,39.97", "--out-tif", path], op)
            self.assertEqual(code, 3)
            self.assertFalse(os.path.exists(path))
        self.assertIn("did not return a GeoTIFF", err)


class Points(unittest.TestCase):
    def test_get_samples(self):
        op = FakeOpener().add("GET", SVC + "/getSamples", (200, fixture_json("usgs3dep_getsamples.json")))
        code, res, err = _run(["sample", "--point", "-83.01,39.96", "--point", "-83.005,39.955"], op)
        self.assertEqual(code, 0, err)
        self.assertAlmostEqual(res["samples"][0]["elevation_m"], 222.548279)
        self.assertIsNone(res["samples"][1]["elevation_m"])
        q = _q(op.requests[0]["url"])
        self.assertEqual(json.loads(q["geometry"])["points"], [[-83.01, 39.96], [-83.005, 39.955]])
        self.assertEqual(q["geometryType"], "esriGeometryMultipoint")

    def test_identify(self):
        op = FakeOpener().add("GET", SVC + "/identify", (200, fixture_json("usgs3dep_identify.json")))
        code, res, err = _run(["identify", "--point", "-83.01,39.96"], op)
        self.assertEqual(code, 0, err)
        self.assertAlmostEqual(res["results"][0]["elevation_m"], 222.548279)
        self.assertEqual(json.loads(_q(op.requests[0]["url"])["geometry"])["spatialReference"], {"wkid": 4326})

    def test_bad_points(self):
        for argv in (["sample"], ["identify", "--point", "200,1"], ["sample", "--point", "x"]):
            code, _, _ = _run(argv, FakeOpener())
            self.assertEqual(code, 2, argv)


if __name__ == "__main__":
    unittest.main()
