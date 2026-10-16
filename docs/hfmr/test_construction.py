# unused (flake8 F401), kept for reference: import csv
import tempfile
import unittest
from pathlib import Path

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
