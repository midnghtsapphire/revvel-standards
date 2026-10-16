import io
import json
import runpy
import sys
import tempfile
import unittest
import urllib.parse
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock
from .case001_acquire import acquire, query_address_variants
# unused (flake8 F401), kept for reference: from .case001_acquire import metadata


def run_cli(module, argv):
    """Run a CLI module in-process and return its exit status (0 when it returns normally)."""
    with mock.patch.object(sys, "argv", [module] + [str(a) for a in argv]), redirect_stdout(io.StringIO()):
        try:
            runpy.run_module(module, run_name="__main__")
        except SystemExit as exc:
            return exc.code
    return 0


class R:
    def __init__(self, url, body):
        self.url = url
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *a):
        pass

    def read(self, n=-1):
        return json.dumps(self.body).encode()


class Tests(unittest.TestCase):
    def opener(self, req, timeout):
        url = req.full_url
        if "query?" not in url:
            return R(
                url,
                {
                    "fields": [
                        {"name": x} for x in ["SITE_ADDRESS", "B1_ALT_ID", "B1_PARCEL_NBR", "ISSUED_YEAR", "FILED_YEAR"]
                    ]
                },
            )
        return R(
            url,
            {
                "features": [
                    {
                        "attributes": {
                            "OBJECTID": 1,
                            "B1_ALT_ID": "TEST-1",
                            "B1_PARCEL_NBR": "123",
                            "SITE_ADDRESS": "1546 N HIGH ST",
                            "ISSUED_DT": None,
                            "B1_FILE_DD": None,
                        }
                    }
                ]
            },
        )

    def test_acquire(self):
        with tempfile.TemporaryDirectory() as t:
            out = Path(t) / "case"
            r = acquire(out, opener=self.opener)
            self.assertTrue(r["retrieval_complete"])
            self.assertEqual(r["records"], 2)
            self.assertEqual(r["parcel_candidates"], ["123"])
            self.assertEqual(len(list(out.glob("*.sha256"))), 9)

    def test_cli_exits_nonzero_when_incomplete(self):
        incomplete = {"output": "x", "records": 0, "parcel_candidates": [], "retrieval_complete": False, "errors": [1]}
        with mock.patch("hfmr.case001_acquire.acquire", return_value=incomplete):
            self.assertEqual(run_cli("hfmr.case001_acquire_cli", ["--output", "unused"]), 2)
        with mock.patch("hfmr.case001_acquire.acquire", return_value=dict(incomplete, retrieval_complete=True)):
            self.assertEqual(run_cli("hfmr.case001_acquire_cli", ["--output", "unused"]), 0)

    def test_capped_query_is_not_complete(self):
        def op(req, timeout):
            url = req.full_url
            if "query?" not in url:
                return self.opener(req, timeout)
            q = urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
            start, n = int(q["resultOffset"][0]), int(q["resultRecordCount"][0])
            return R(url, {"features": [{"attributes": {"OBJECTID": start + i}} for i in range(n)]})

        with tempfile.TemporaryDirectory() as t:
            r = acquire(Path(t) / "case", opener=op)
            self.assertEqual(r["errors"], [])
            self.assertFalse(r["retrieval_complete"])

    def test_later_variant_failure_keeps_earlier_results(self):
        calls = {"n": 0}

        def op(req, timeout):
            if "/MapServer/5/query?" in req.full_url:
                calls["n"] += 1
                if calls["n"] == 3:
                    raise ConnectionError("offline on third variant")
            return self.opener(req, timeout)

        with tempfile.TemporaryDirectory() as t:
            out = Path(t) / "case"
            r = acquire(out, opener=op)
            self.assertFalse(r["retrieval_complete"])
            self.assertTrue((out / "building_query1.json").exists())
            self.assertTrue((out / "building_query2.json").exists())
            report = json.loads((out / "acquisition_report.json").read_text())
            self.assertEqual(report["query_attempts"], 5)

    def test_invalid_arguments_rejected_before_output(self):
        with tempfile.TemporaryDirectory() as t:
            out = Path(t) / "case"
            # Original: for kwargs in ({"street": "high"}, {"number": 0}, {"start": 2011, "end": 2010}):
            #   number=True (a bool, which subclasses int) is now rejected too.
            for kwargs in ({"street": "high"}, {"number": 0}, {"number": True}, {"start": 2011, "end": 2010}):
                with self.assertRaises(ValueError):
                    acquire(out, opener=self.opener, **kwargs)
                self.assertFalse(out.exists())

    def test_schema_with_missing_fields_is_not_listed_as_verified(self):
        def op(req, timeout):
            if "query?" not in req.full_url:
                return R(req.full_url, {"fields": [{"name": "SITE_ADDRESS"}]})
            return self.opener(req, timeout)

        with tempfile.TemporaryDirectory() as t:
            out = Path(t) / "case"
            acquire(out, opener=op)
            report = json.loads((out / "acquisition_report.json").read_text())
            self.assertEqual(report["metadata_verified_for"], [])

    def test_bad_street(self):
        with self.assertRaises(ValueError):
            query_address_variants("building", street="HIGH';DROP")

    def test_bool_number_rejected(self):
        with self.assertRaises(ValueError):
            query_address_variants("building", number=True, opener=self.opener)

    def test_failures_explicit(self):
        def fail(req, timeout):
            raise ConnectionError("offline")

        with tempfile.TemporaryDirectory() as t:
            r = acquire(Path(t) / "case", opener=fail)
            self.assertFalse(r["retrieval_complete"])
            self.assertEqual(len(r["errors"]), 2)
