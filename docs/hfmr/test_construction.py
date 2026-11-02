# unused (flake8 F401), kept for reference: import csv
import io
import runpy
import sys
from contextlib import redirect_stdout
import tempfile
import unittest
from pathlib import Path
from unittest import mock

# star import replaced with explicit names (flake8 F403/F405): from .construction import *
from .construction import (
    arcgis_query,
    date_value,
    import_csv,
    request_text,
    scrape_public_links,
    timeline,
    verify_import,
)


def run_cli(module, argv):
    """Run a CLI module in-process and return its exit status (0 when it returns normally)."""
    with mock.patch.object(sys, "argv", [module] + [str(a) for a in argv]), redirect_stdout(io.StringIO()):
        try:
            runpy.run_module(module, run_name="__main__")
        except SystemExit as exc:
            return exc.code
    return 0


class TestConstruction(unittest.TestCase):
    def test_dates(self):
        self.assertEqual(date_value("03/12/2006"), "2006-03-12")
        self.assertEqual(date_value("not-a-date"), "")

    def test_import_and_verify(self):
        with tempfile.TemporaryDirectory() as t:
            inp = Path(t) / "in.csv"
            out = Path(t) / "out.csv"
            inp.write_text("ID,ADDR,ISSUED\n7,1546 N. High St,03/12/2006\n")
            import_csv(inp, out, {"record_id": "ID", "address": "ADDR", "issue_date": "ISSUED"})
            self.assertTrue(verify_import(out.with_suffix(".manifest.json")))
            self.assertEqual(timeline(out, address="1546 N High St")[0]["type"], "permit_issued")
            out.write_text("changed")
            self.assertFalse(verify_import(out.with_suffix(".manifest.json")))

    def test_cli_verify_exit_status(self):
        with tempfile.TemporaryDirectory() as t:
            inp = Path(t) / "in.csv"
            out = Path(t) / "out.csv"
            inp.write_text("ID,ADDR\n7,1546 N. High St\n")
            import_csv(inp, out, {"record_id": "ID", "address": "ADDR"})
            manifest = out.with_suffix(".manifest.json")
            self.assertEqual(run_cli("hfmr.construction_cli", ["verify", "--manifest", manifest]), 0)
            out.write_text("changed")
            self.assertEqual(run_cli("hfmr.construction_cli", ["verify", "--manifest", manifest]), 1)

    def test_epoch_millisecond_strings_parse(self):
        self.assertEqual(date_value("1143850000000"), "2006-04-01")
        self.assertEqual(date_value(1143850000000), "2006-04-01")
        with tempfile.TemporaryDirectory() as t:
            inp = Path(t) / "in.csv"
            out = Path(t) / "out.csv"
            inp.write_text("ID,ADDR,ISSUED\n7,1546 N. High St,1143850000000\n")
            import_csv(inp, out, {"record_id": "ID", "address": "ADDR", "issue_date": "ISSUED"})
            self.assertEqual(timeline(out)[0]["date"], "2006-04-01")

    def test_parcel_filter_keeps_letters_and_ignores_blanks(self):
        with tempfile.TemporaryDirectory() as t:
            inp = Path(t) / "in.csv"
            out = Path(t) / "out.csv"
            inp.write_text(
                "ID,ADDR,PARCEL,ISSUED\n"
                "1,1 A St,010-ABC123,03/12/2006\n"
                "2,2 B St,010-XYZ123,03/12/2006\n"
                "3,3 C St,,03/12/2006\n"
            )
            import_csv(inp, out, {"record_id": "ID", "address": "ADDR", "parcel": "PARCEL", "issue_date": "ISSUED"})
            self.assertEqual([e["record_id"] for e in timeline(out, parcel="010ABC123")], ["1"])
            self.assertEqual(timeline(out, parcel="ABC"), [])
            self.assertEqual(timeline(out, parcel="--"), [])

    def test_links(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "page.html"
            p.write_text('<a href="/public.pdf">a</a><a href="https://evil.test/a">bad</a>')
            self.assertEqual(
                scrape_public_links(p, "https://example.gov/list", "example.gov"), ["https://example.gov/public.pdf"]
            )

    def test_arcgis_rejects_bad_url(self):
        with self.assertRaises(ValueError):
            arcgis_query("http://example.gov/FeatureServer/0", "1=1")

    def test_request(self):
        self.assertIn("concrete placement", request_text("1546 N High St"))

    def test_request_letter_has_no_lint_markers(self):
        # A lint suppression once landed inside this triple-quoted letter and
        # would have been mailed to the records office as literal text.
        self.assertNotIn("noqa", request_text("1546 N High St"))
