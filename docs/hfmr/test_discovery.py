# unused (flake8 F401), kept for reference: import io
import io
import json
import runpy
import sys
import tempfile
import unittest
import urllib.request
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

# star import replaced with explicit names (flake8 F403/F405): from .discovery import *
from .discovery import arcgis_catalog, inventory, match_identity, stac_search, verify_inventory


def run_cli(module, argv):
    """Run a CLI module in-process and return its exit status (0 when it returns normally)."""
    with mock.patch.object(sys, "argv", [module] + [str(a) for a in argv]), redirect_stdout(io.StringIO()):
        try:
            runpy.run_module(module, run_name="__main__")
        except SystemExit as exc:
            return exc.code
    return 0


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

    def test_stac_datetime_uses_normalized_dates(self):
        urls = []

        def opener(req, timeout):
            urls.append(req.full_url)
            return FakeResponse(req.full_url, {"features": []})

        bbox = [-83.02, 39.98, -83.00, 40.00]
        stac_search("https://example.gov/stac/search", bbox, "1136203200000", "12/31/2006", opener=opener)
        self.assertIn("datetime=2006-01-02T00%3A00%3A00Z%2F2006-12-31T23%3A59%3A59Z", urls[0])
        with self.assertRaises(ValueError):
            stac_search("https://example.gov/stac/search", bbox, "12/31/2007", "2006-01-01", opener=opener)

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
            # Original: def open(self, req, timeout=None):
            #   OpenerDirector.open also takes data; checked_urlopen now forwards it like urlopen.
            def open(self, req, data=None, timeout=None):
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

    def test_incomplete_alias_does_not_match_blank_addresses(self):
        rows = [{"address": "", "parcel": ""}, {"address": "1546 N HIGH ST", "parcel": ""}]
        aliases = [
            {"from_address": "1546 N HIGH ST", "to_address": "", "verified": "yes", "source_url": "https://x.gov/r"}
        ]
        matches = match_identity(rows, address="1546 N HIGH ST", alias_rows=aliases)
        self.assertEqual([m["record"]["address"] for m in matches], ["1546 N HIGH ST"])

    def test_inventory_tamper(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "i.json"
            inventory([{"id": "a"}], p)
            self.assertTrue(verify_inventory(p))
            p.write_text("changed")
            self.assertFalse(verify_inventory(p))

    def test_cli_verify_inventory_exit_status(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "i.json"
            inventory([{"id": "a"}], p)
            self.assertEqual(run_cli("hfmr.discovery_cli", ["verify-inventory", "--input", p]), 0)
            p.write_text("changed")
            self.assertEqual(run_cli("hfmr.discovery_cli", ["verify-inventory", "--input", p]), 1)

    def test_no_overwrite(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "i.json"
            inventory([], p)
            with self.assertRaises(FileExistsError):
                inventory([], p)
