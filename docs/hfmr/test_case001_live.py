import json
import tempfile
import unittest
import urllib.parse
from pathlib import Path

# star import replaced with explicit names (flake8 F403/F405): from .case001_live import *
from .case001_live import reconcile, retrieve, run, where_address


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


class TestLive(unittest.TestCase):
    def test_where(self):
        self.assertIn("ISSUED_YEAR", where_address())
        self.assertIn("FILED_YEAR", where_address(layer="site_engineering"))

    def test_invalid(self):
        with self.assertRaises(ValueError):
            where_address(street="HIGH' OR 1=1")

    def test_fetch(self):
        def op(req, timeout):
            return Response(req.full_url, {"features": []})

        self.assertEqual(retrieve("building", "1=1", opener=op)["records"], [])

    def test_reconcile(self):
        r = {
            "layer": "building",
            "records": [
                {"OBJECTID": 1, "B1_ALT_ID": "X", "SITE_ADDRESS": "1546 N HIGH ST", "ISSUED_DT": 1143850000000}
            ],
        }
        self.assertEqual(reconcile([r, r])["count"], 1)

    def test_run(self):
        def op(req, timeout):
            return Response(req.full_url, {"features": [{"attributes": {"OBJECTID": 1, "B1_ALT_ID": "P1"}}]})

        with tempfile.TemporaryDirectory() as t:
            report = run(Path(t) / "out", opener=op)
            self.assertTrue(report["retrieval_complete"])
            self.assertEqual(report["records"], 2)
            self.assertTrue((Path(t) / "out" / "reconciliation.json.sha256").exists())

    def test_capped_layer_is_not_complete(self):
        # Every page is full, so the 500-record default cap is reached and more may exist.
        def op(req, timeout):
            q = urllib.parse.parse_qs(urllib.parse.urlsplit(req.full_url).query)
            start, n = int(q["resultOffset"][0]), int(q["resultRecordCount"][0])
            return Response(req.full_url, {"features": [{"attributes": {"OBJECTID": start + i}} for i in range(n)]})

        with tempfile.TemporaryDirectory() as t:
            report = run(Path(t) / "out", opener=op)
            self.assertEqual(report["errors"], [])
            self.assertFalse(report["retrieval_complete"])
            saved = json.loads((Path(t) / "out" / "reconciliation.json").read_text())
            self.assertEqual(saved["truncated_layers"], ["building", "site_engineering"])

    def test_failed_source(self):
        def op(req, timeout):
            raise OSError("offline")

        with tempfile.TemporaryDirectory() as t:
            report = run(Path(t) / "out", opener=op)
            self.assertFalse(report["retrieval_complete"])
            self.assertEqual(len(report["errors"]), 2)
