import io
import json
import runpy
import sys
import tempfile
import unittest
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

    def test_bad_street(self):
        with self.assertRaises(ValueError):
            query_address_variants("building", street="HIGH';DROP")

    def test_failures_explicit(self):
        def fail(req, timeout):
            raise ConnectionError("offline")

        with tempfile.TemporaryDirectory() as t:
            r = acquire(Path(t) / "case", opener=fail)
            self.assertFalse(r["retrieval_complete"])
            self.assertEqual(len(r["errors"]), 2)
