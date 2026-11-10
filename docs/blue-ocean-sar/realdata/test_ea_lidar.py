"""Tests for ea_lidar.py with a fake WCS (no network). The mosaic test needs rasterio."""

import importlib.util
import io
import json
import os
import re
import sys
import tempfile
import unittest
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import ea_lidar as ea  # noqa: E402

HAS_RASTERIO = importlib.util.find_spec("rasterio") is not None

CAPS = b"""<?xml version="1.0"?>
<wcs:Capabilities xmlns:wcs="http://www.opengis.net/wcs/2.0" xmlns:ows="http://www.opengis.net/ows/2.0">
 <wcs:Contents>
  <wcs:CoverageSummary><ows:Title>LIDAR Composite DTM 2022 1m</ows:Title>
   <wcs:CoverageId>dtm_2022</wcs:CoverageId></wcs:CoverageSummary>
  <wcs:CoverageSummary><ows:Title>LIDAR Composite DTM 2020 1m</ows:Title>
   <wcs:CoverageId>dtm_2020</wcs:CoverageId></wcs:CoverageSummary>
 </wcs:Contents>
</wcs:Capabilities>"""
DESCRIBE = b"""<?xml version="1.0"?><wcs:CoverageDescriptions xmlns:wcs="http://www.opengis.net/wcs/2.0"
 xmlns:gml="http://www.opengis.net/gml/3.2"><wcs:CoverageDescription><gml:boundedBy>
 <gml:Envelope srsName="http://www.opengis.net/def/crs/EPSG/0/27700" axisLabels="E N" srsDimension="2">
 <gml:lowerCorner>0 0</gml:lowerCorner><gml:upperCorner>700000 1300000</gml:upperCorner></gml:Envelope>
 </gml:boundedBy></wcs:CoverageDescription></wcs:CoverageDescriptions>"""
EXC = b"""<?xml version="1.0"?><ows:ExceptionReport xmlns:ows="http://www.opengis.net/ows/2.0"><ows:Exception
 exceptionCode="InvalidSubsetting"><ows:ExceptionText>subset outside coverage</ows:ExceptionText>
 </ows:Exception></ows:ExceptionReport>"""


class Resp:
    def __init__(self, body, ctype="application/xml"):
        self.body, self.headers = body, {"Content-Type": ctype}

    def read(self, n=-1):
        return self.body

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def tiff_for(box, res=1.0):
    """A GeoTIFF of the box whose value is the easting, so the mosaic can be checked."""
    import numpy as np
    from rasterio.io import MemoryFile
    from rasterio.transform import from_origin
    e0, n0, e1, n1 = box
    w, h = int(round((e1 - e0) / res)), int(round((n1 - n0) / res))
    a = np.tile((e0 + (np.arange(w) + 0.5) * res).astype("float32"), (h, 1))
    with MemoryFile() as mf:
        with mf.open(driver="GTiff", width=w, height=h, count=1, dtype="float32", crs="EPSG:27700",
                     transform=from_origin(e0, n1, res, res)) as d:
            d.write(a, 1)
        return mf.read()


class FakeWCS:
    def __init__(self, coverage_body=None):
        self.urls, self.coverage_body = [], coverage_body

    def __call__(self, req, timeout=None):
        url = req.full_url
        self.urls.append(url)
        q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        r = q["request"][0]
        if r == "GetCapabilities":
            return Resp(CAPS)
        if r == "DescribeCoverage":
            return Resp(DESCRIBE)
        if self.coverage_body is not None:
            return Resp(self.coverage_body)
        sub = {s.split("(")[0]: s for s in q["subset"]}
        e = re.match(r"E\(([\d.]+),([\d.]+)\)", sub["E"]).groups()
        n = re.match(r"N\(([\d.]+),([\d.]+)\)", sub["N"]).groups()
        return Resp(tiff_for((float(e[0]), float(n[0]), float(e[1]), float(n[1]))), "image/tiff")


class Capabilities(unittest.TestCase):
    def test_lists_coverages(self):
        cov = ea.capabilities(opener=FakeWCS())
        self.assertEqual([c["coverage_id"] for c in cov], ["dtm_2022", "dtm_2020"])
        self.assertEqual(cov[0]["title"], "LIDAR Composite DTM 2022 1m")

    def test_exception_report_is_an_error(self):
        with self.assertRaises(ea.WCSError):
            ea.capabilities(opener=lambda req, timeout=None: Resp(EXC))

    def test_unreachable_is_connection_error(self):
        def down(req, timeout=None):
            raise OSError("blocked")
        with self.assertRaises(ConnectionError):
            ea.capabilities(opener=down)


class Requests(unittest.TestCase):
    def test_chunks_cover_the_box_exactly(self):
        cs = list(ea.chunks((400100, 403500, 404600, 405500), 2000))
        self.assertEqual(len(cs), 3 * 1)
        self.assertEqual(cs[-1], (404100, 403500, 404600, 405500))
        self.assertEqual(sum((c[2] - c[0]) * (c[3] - c[1]) for c in cs), 4500 * 2000)

    def test_coverage_url(self):
        u = ea.coverage_url("https://x/wcs", "dtm_2022", (1, 2, 3, 4))
        q = urllib.parse.parse_qs(urllib.parse.urlparse(u).query)
        self.assertEqual(q["subset"], ["E(1,3)", "N(2,4)"])
        self.assertEqual(q["format"], ["image/tiff"])
        self.assertEqual(q["coverageId"], ["dtm_2022"])

    def test_bad_bbox_refused(self):
        for bad in ((5, 5, 1, 10), (-10, 0, 10, 10), (0, 0, 800000, 10)):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                ea.fetch("c", bad, "x.tif", opener=FakeWCS())

    def test_non_tiff_body_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            for body in (EXC, b"<html>maintenance</html>"):
                with self.subTest(body=body[:10]), self.assertRaises(ea.WCSError):
                    ea.fetch("dtm_2022", (400000, 403000, 400100, 403100), os.path.join(d, "o.tif"),
                             opener=FakeWCS(coverage_body=body))

    def test_cli_exit_codes(self):
        out, err = io.StringIO(), io.StringIO()
        from contextlib import redirect_stderr, redirect_stdout
        with redirect_stdout(out), redirect_stderr(err):
            self.assertEqual(ea.main(["fetch", "--coverage", "c", "--bbox", "5", "5", "1", "1", "--out", "o.tif"]), 2)


@unittest.skipUnless(HAS_RASTERIO, "needs rasterio")
class Mosaic(unittest.TestCase):
    def test_chunks_are_mosaicked_in_place_with_manifest(self):
        import rasterio
        fake = FakeWCS()
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "dtm.tif")
            rec = ea.fetch("dtm_2022", (400000, 403000, 400250, 403100), out, chunk_m=100, opener=fake)
            self.assertEqual(len(rec["chunks"]), 3)
            self.assertEqual(rec["axes"], ["E", "N"])  # from DescribeCoverage
            with rasterio.open(out) as src:
                self.assertEqual((src.width, src.height), (250, 100))
                self.assertEqual(src.crs.to_epsg(), 27700)
                a = src.read(1)
                self.assertAlmostEqual(float(a[0, 0]), 400000.5)
                self.assertAlmostEqual(float(a[50, 249]), 400249.5)
            with open(os.path.join(d, "dtm_manifest.json")) as fh:
                m = json.load(fh)
            self.assertEqual(len(m["chunks"][0]["sha256"]), 64)
            self.assertIn("Open Government Licence", m["licence"])


if __name__ == "__main__":
    unittest.main()
