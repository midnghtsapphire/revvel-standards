# unused (flake8 F401), kept for reference: import io
import json
import tempfile
import unittest
import urllib.request
from pathlib import Path
from unittest import mock

# star import replaced with explicit names (flake8 F403/F405): from .discovery import *
from .discovery import arcgis_catalog, inventory, match_identity, stac_search, verify_inventory


class FakeResponse:
    def __init__(self, url, obj):
        self.url = url
        self.obj = obj

    def __enter__(self):
        return self

    def __exit__(self, *a):
        pass

    def read(self, n=-1):
        return json.dumps(self.obj).encode()


class DiscoveryTests(unittest.TestCase):
    def test_arcgis(self):
        def opener(req, timeout):
            return FakeResponse(
                req.full_url,
                {
                    "services": [
                        {"name": "BuildingPermits", "type": "FeatureServer"},
                        {"name": "Other", "type": "ImageServer"},
                    ]
                },
            )

        rows = arcgis_catalog("https://example.gov/arcgis/rest/services", opener=opener)
        self.assertEqual(len(rows), 1)
        self.assertTrue(rows[0]["candidate"])

    def test_stac(self):
        def opener(req, timeout):
            return FakeResponse(
                req.full_url,
                {
                    "features": [
                        {
                            "id": "one",
                            "properties": {"datetime": "2006-04-05T12:00:00Z"},
                            "assets": {"data": {"href": "https://example.gov/a.tif"}},
                        }
                    ]
                },
            )

        rows = stac_search(
            "https://example.gov/stac/search", [-83.02, 39.98, -83.00, 40.00], "2005-01-01", "2007-12-31", opener=opener
        )
        self.assertEqual(rows[0]["id"], "one")

    def test_bad_bbox(self):
        with self.assertRaises(ValueError):
            stac_search("https://example.gov/search", [2, 3, 1, 4], "2005-01-01", "2007-01-01")

    def test_alias_provenance(self):
        rows = [{"address": "1546 NORTH HIGH STREET", "parcel": "123"}, {"address": "1550 N HIGH ST", "parcel": "456"}]
        self.assertEqual(len(match_identity(rows, address="1546 N HIGH ST")), 0)
        aliases = [
            {
                "from_address": "1546 N HIGH ST",
                "to_address": "1546 NORTH HIGH STREET",
                "verified": "yes",
                "source_url": "https://example.gov/record",
            }
        ]
        self.assertEqual(len(match_identity(rows, address="1546 N HIGH ST", alias_rows=aliases)), 1)

    def test_default_opener_checks_redirects_before_following(self):
        handlers = []

        class FakeOpener:
            def open(self, req, timeout=None):
                return FakeResponse(req.full_url, {"services": []})

        def fake_build_opener(*args):
            handlers.extend(args)
            return FakeOpener()

        with mock.patch("urllib.request.build_opener", fake_build_opener):
            arcgis_catalog("https://example.gov/arcgis/rest/services")
        redirect = [h for h in handlers if isinstance(h, urllib.request.HTTPRedirectHandler)]
        self.assertEqual(len(redirect), 1)
        req = urllib.request.Request("https://example.gov/arcgis/rest/services")
        for bad in ("https://evil.example/a", "http://example.gov/a"):
            with self.assertRaises(ValueError):
                redirect[0].redirect_request(req, None, 302, "Found", {}, bad)
        self.assertIsNotNone(redirect[0].redirect_request(req, None, 302, "Found", {}, "https://example.gov/b"))

    def test_inventory_tamper(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "i.json"
            inventory([{"id": "a"}], p)
            self.assertTrue(verify_inventory(p))
            p.write_text("changed")
            self.assertFalse(verify_inventory(p))

    def test_no_overwrite(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "i.json"
            inventory([], p)
            with self.assertRaises(FileExistsError):
                inventory([], p)
