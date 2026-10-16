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

# star import replaced with explicit names (flake8 F403/F405): from .columbus import *
from .columbus import export_csv, metadata, query_by_parcel, save, verify


def run_cli(module, argv):
    """Run a CLI module in-process and return its exit status (0 when it returns normally)."""
    with mock.patch.object(sys, "argv", [module] + [str(a) for a in argv]), redirect_stdout(io.StringIO()):
        try:
            runpy.run_module(module, run_name="__main__")
        except SystemExit as exc:
            return exc.code
    return 0


class Response:
    def __init__(self, url, obj):
        self.url = url
        self.obj = obj

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def read(self, n=-1):
        return json.dumps(self.obj).encode()


class ColumbusTests(unittest.TestCase):
    def test_metadata(self):
        def op(req, timeout):
            return Response(
                req.full_url,
                {"fields": [{"name": "B1_PARCEL_NBR", "type": "esriFieldTypeString"}], "maxRecordCount": 2000},
            )

        self.assertEqual(metadata(op)["fields"][0]["name"], "B1_PARCEL_NBR")

    def test_parcel(self):
        def op(req, timeout):
            self.assertIn("B1_PARCEL_NBR", req.full_url)
            return Response(req.full_url, {"features": [{"attributes": {"B1_ALT_ID": "X"}}]})

        self.assertEqual(query_by_parcel("123456", opener=op)["records"][0]["B1_ALT_ID"], "X")

    def test_short_page_with_exceeded_transfer_limit_keeps_paging(self):
        pages = [
            {"features": [{"attributes": {"ID": 1}}], "exceededTransferLimit": True},
            {"features": [{"attributes": {"ID": 2}}]},
        ]

        def op(req, timeout):
            return Response(req.full_url, pages.pop(0))

        doc = query_by_parcel("123456", opener=op, max_records=10)
        self.assertEqual([r["ID"] for r in doc["records"]], [1, 2])
        self.assertEqual(len(doc["pages"]), 2)

    def test_invalid_parcel(self):
        with self.assertRaises(ValueError):
            query_by_parcel("x' OR 1=1")

    def test_save_verify(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "permits.json"
            save({"records": [{"A": 1}]}, p)
            self.assertTrue(verify(p))
            self.assertEqual(export_csv(p, Path(t) / "p.csv"), 1)
            p.write_text("changed")
            self.assertFalse(verify(p))

    def test_cli_verify_exit_status(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "permits.json"
            save({"records": [{"A": 1}]}, p)
            self.assertEqual(run_cli("hfmr.columbus_cli", ["verify", "--input", p]), 0)
            p.write_text("changed")
            self.assertEqual(run_cli("hfmr.columbus_cli", ["verify", "--input", p]), 1)

    def test_overwrite(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "p.json"
            save({"records": []}, p)
            with self.assertRaises(FileExistsError):
                save({"records": []}, p)

    def test_default_opener_checks_redirects_before_following(self):
        handlers = []

        class FakeOpener:
            # Original: def open(self, req, timeout=None):
            #   OpenerDirector.open also takes data; checked_urlopen now forwards it like urlopen.
            def open(self, req, data=None, timeout=None):
                return Response(req.full_url, {"fields": []})

        def fake_build_opener(*args):
            handlers.extend(args)
            return FakeOpener()

        with mock.patch("urllib.request.build_opener", fake_build_opener):
            metadata()
        redirect = [h for h in handlers if isinstance(h, urllib.request.HTTPRedirectHandler)]
        self.assertEqual(len(redirect), 1)
        req = urllib.request.Request("https://arc.columbus.gov/arcgis")
        with self.assertRaises(ValueError):
            redirect[0].redirect_request(req, None, 302, "Found", {}, "https://10.0.0.1/internal")
        with self.assertRaises(ValueError):
            redirect[0].redirect_request(req, None, 302, "Found", {}, "http://arc.columbus.gov/arcgis")
        self.assertIsNotNone(redirect[0].redirect_request(req, None, 302, "Found", {}, "https://arc.columbus.gov/b"))
        with self.assertRaises(ValueError):
            redirect[0].redirect_request(req, None, 302, "Found", {}, "https://arc.columbus.gov:8443/admin")
        self.assertIsNotNone(redirect[0].redirect_request(req, None, 302, "Found", {}, "https://arc.columbus.gov:443/"))

    def test_host(self):
        with self.assertRaises(ValueError):
            _bad()


def _bad():
    from .columbus import _request

    _request("https://evil.example/arcgis")
