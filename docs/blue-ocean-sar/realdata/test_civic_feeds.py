"""Tests for civic_feeds.py with fake servers (no network)."""

import csv
import datetime as dt
import io
import json
import os
import sys
import tempfile
import unittest
import urllib.parse
from contextlib import redirect_stderr, redirect_stdout
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import civic_feeds as cf  # noqa: E402

NOW = dt.datetime(2026, 10, 17, 12, 0, 0, tzinfo=dt.timezone.utc)


class Resp(io.BytesIO):
    def __init__(self, body, ctype="application/json", extra=None):
        super().__init__(body)
        self.status = 200
        self.headers = dict({"Content-Type": ctype}, **(extra or {}))

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def serve(*bodies):
    it, seen = iter(bodies), []

    def opener(req, timeout=None):
        seen.append(req)
        return next(it)
    return opener, seen


class Camera(unittest.TestCase):
    def test_only_real_images_are_saved_with_matching_ending(self):
        with tempfile.TemporaryDirectory() as d:
            cases = {"jpeg": (b"\xff\xd8\xff\xe0JFIF", "image/jpeg", ".jpg"),
                     "png": (b"\x89PNG\r\n\x1a\nxx", "image/png; charset=binary", ".png"),
                     "gif": (b"GIF89axx", "image/gif", ".gif")}
            for name, (body, ctype, ext) in cases.items():
                opener, _ = serve(Resp(body, ctype, {"Last-Modified": "Fri, 16 Oct 2026 20:30:00 GMT"}))
                path, sha = cf.camera("https://cdn.example/x", name, d, opener=opener, now=NOW)
                self.assertTrue(path.endswith(ext), path)
            refused = ((b"<!doctype html>", "text/html"), (b"<html>", "image/jpeg"), (b"\xff\xd8\xff", "text/plain"))
            for body, ctype in refused:
                opener, _ = serve(Resp(body, ctype))
                with self.subTest(ctype=ctype), self.assertRaises(cf.Refused):
                    cf.camera("https://ohgo.com", "home", d, opener=opener, now=NOW)
            with open(os.path.join(d, "manifest.csv")) as fh:
                rows = list(csv.DictReader(fh))
            self.assertEqual([r["name"] for r in rows], ["jpeg", "png", "gif"])
            self.assertEqual(rows[0]["last_modified"], "Fri, 16 Oct 2026 20:30:00 GMT")
            self.assertEqual(len(rows[0]["sha256"]), 64)
            self.assertEqual(len(os.listdir(d)), 4)


class ArcGIS(unittest.TestCase):
    def test_geojson_wgs84_and_paging(self):
        p1 = {"type": "FeatureCollection", "exceededTransferLimit": True,
              "features": [{"type": "Feature", "geometry": None, "properties": {"i": i}} for i in range(2)]}
        p2 = {"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": None, "properties": {"i": 2}}]}
        opener, seen = serve(Resp(json.dumps(p1).encode()), Resp(json.dumps(p2).encode()))
        fc = cf.arcgis("https://gis.example/arcgis/rest/services/P/MapServer/0", page=2, opener=opener)
        self.assertEqual(len(fc["features"]), 3)
        q = [urllib.parse.parse_qs(urllib.parse.urlparse(r.full_url).query) for r in seen]
        self.assertEqual((q[0]["f"], q[0]["outSR"], q[0]["resultOffset"], q[1]["resultOffset"]),
                         (["geojson"], ["4326"], ["0"], ["2"]))
        self.assertTrue(seen[0].full_url.startswith("https://gis.example/arcgis/rest/services/P/MapServer/0/query?"))

    def test_error_body_is_refused(self):
        opener, _ = serve(Resp(b'{"error": {"code": 400, "message": "Invalid field"}}'))
        with self.assertRaises(cf.Refused):
            cf.arcgis("https://gis.example/x/MapServer/0", opener=opener)


class Feeds(unittest.TestCase):
    def test_rss_and_atom(self):
        rss = (b"<rss><channel><item><title>Lien filed</title><link>https://r/2</link>"
               b"<pubDate>Thu</pubDate></item></channel></rss>")
        atom = (b'<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Deed recorded</title>'
                b'<link href="https://r/1"/><updated>2026-10-01</updated></entry></feed>')
        opener, _ = serve(Resp(rss, "application/rss+xml"), Resp(atom, "application/atom+xml"))
        self.assertEqual(cf.feed("https://x/rss", opener=opener)[0]["link"], "https://r/2")
        a = cf.feed("https://x/atom", opener=opener)[0]
        self.assertEqual((a["title"], a["link"], a["date"]), ("Deed recorded", "https://r/1", "2026-10-01"))


class Socrata(unittest.TestCase):
    def test_query_and_error(self):
        opener, seen = serve(Resp(b'[{"permit_": "1"}]'), Resp(b'{"error": true, "message": "bad column"}'))
        self.assertEqual(cf.socrata("data.cityofchicago.org", "ydr8-5enu", q="CONCRETE", limit=3, opener=opener),
                         [{"permit_": "1"}])
        q = urllib.parse.parse_qs(urllib.parse.urlparse(seen[0].full_url).query)
        self.assertEqual((q["$q"], q["$limit"]), (["CONCRETE"], ["3"]))
        with self.assertRaises(cf.Refused):
            cf.socrata("d", "x", opener=opener)


class OHGO(unittest.TestCase):
    LIST = {"results": [
        {"id": "1", "mainRoute": "I-70", "location": "I-70 at High St", "description": "I-70 at High St",
         "latitude": 39.95, "longitude": -83.0, "cameraViews": [{"largeUrl": "https://cdn/1.jpg"}]},
        {"id": "2", "mainRoute": "I-71", "location": "I-71 at 5th Ave",
         "cameraViews": [{"smallUrl": "https://cdn/2s.jpg"}]}]}

    def test_needs_key_and_sends_it_in_header(self):
        with mock.patch.dict(os.environ, {}, clear=True), self.assertRaises(ValueError):
            cf.ohgo_cameras()
        opener, seen = serve(Resp(json.dumps(self.LIST).encode()))
        cams = cf.ohgo_cameras("columbus", ["i-70", "high"], key="k", opener=opener)
        self.assertEqual([c["image_urls"] for c in cams], [["https://cdn/1.jpg"]])
        self.assertEqual(seen[0].headers["Authorization"], "APIKEY k")
        query = urllib.parse.parse_qs(urllib.parse.urlparse(seen[0].full_url).query)
        self.assertNotIn(["k"], list(query.values()))  # the key travels in the header, not the URL

    def test_cli_no_match_is_exit_1(self):
        opener, _ = serve(Resp(json.dumps(self.LIST).encode()))
        env = {"OHGO_API_KEY": "k"}
        with mock.patch.object(cf.urllib.request, "urlopen", opener), mock.patch.dict(os.environ, env):
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                self.assertEqual(cf.main(["ohgo-cameras", "--match", "nowhere"]), 1)


class Network(unittest.TestCase):
    def test_unreachable_is_exit_2(self):
        def down(req, timeout=None):
            raise OSError("blocked")
        with mock.patch.object(cf.urllib.request, "urlopen", down):
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                self.assertEqual(cf.main(["feed", "https://x/rss"]), 2)


if __name__ == "__main__":
    unittest.main()
