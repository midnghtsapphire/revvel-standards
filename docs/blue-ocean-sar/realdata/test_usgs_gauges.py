"""Tests for usgs_gauges.py. Offline: parses a synthetic fixture shaped like an NWIS IV JSON response."""

import copy
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

import usgs_gauges as ug  # noqa: E402

FIXTURE = os.path.join(HERE, "fixtures", "nwis_iv_synthetic_okanogan.json")


def load_fixture():
    with open(FIXTURE) as f:
        return json.load(f)


class Url(unittest.TestCase):
    def test_query_parameters(self):
        url = ug.build_iv_url(["12439500", "12442500"], "2026-05-27T00:00-07:00", "2026-05-28T00:00-07:00")
        self.assertTrue(url.startswith("https://waterservices.usgs.gov/nwis/iv/?"))
        q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        self.assertEqual(q["sites"], ["12439500,12442500"])
        self.assertEqual(q["parameterCd"], ["00060,00065,00010"])
        self.assertEqual(q["format"], ["json"])
        self.assertEqual(q["startDT"], ["2026-05-27T00:00-07:00"])
        self.assertEqual(q["endDT"], ["2026-05-28T00:00-07:00"])

    def test_fetch_failure_is_nwiserror(self):
        with mock.patch("urllib.request.urlopen", side_effect=OSError("blocked")):
            with self.assertRaises(ug.NWISError):
                ug.fetch_iv("12442500", "2026-05-27", "2026-05-28")

    def test_fetch_uses_urllib_and_parses(self):
        body = json.dumps(load_fixture()).encode()
        resp = mock.MagicMock()
        resp.read.return_value = body
        resp.__enter__.return_value = resp
        with mock.patch("urllib.request.urlopen", return_value=resp) as m:
            doc = ug.fetch_iv("12442500", "2026-05-27", "2026-05-28")
        self.assertIn("sites=12442500", m.call_args[0][0].full_url)
        self.assertEqual(len(ug.parse_iv(doc)), 5)


class Parse(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.series = ug.parse_iv(load_fixture())

    def get(self, site, pcode):
        return [s for s in self.series if s.site == site and s.parameter_code == pcode][0]

    def test_series_per_site_and_parameter(self):
        keys = sorted((s.site, s.parameter_code) for s in self.series)
        self.assertEqual(
            keys,
            [
                ("12439500", "00010"),
                ("12439500", "00060"),
                ("12439500", "00065"),
                ("12442500", "00010"),
                ("12442500", "00060"),
            ],
        )

    def test_units_and_names(self):
        q = self.get("12442500", "00060")
        self.assertEqual(q.unit, "ft3/s")
        self.assertEqual(q.parameter, "discharge")
        self.assertEqual(q.site_name, "SIMILKAMEEN RIVER NEAR NIGHTHAWK, WA")
        self.assertEqual(self.get("12439500", "00010").unit, "deg C")
        self.assertEqual(self.get("12439500", "00065").parameter, "gauge_height")

    def test_no_data_value_becomes_none(self):
        q = self.get("12442500", "00060")
        self.assertEqual(len(q.points), 12)
        self.assertIsNone(q.points[6].value)
        self.assertEqual(len(q.values()), 11)
        self.assertNotIn(-999999.0, q.values())
        st = q.stats()
        self.assertEqual(st["n_missing"], 1)
        self.assertEqual(st["min"], 5180.0)  # would be -999999 if the sentinel leaked through

    def test_custom_no_data_value_honoured(self):
        doc = load_fixture()
        ts = doc["value"]["timeSeries"][0]
        ts["variable"]["noDataValue"] = -1.0
        ts["values"][0]["value"][0]["value"] = "-1"
        s = ug.parse_iv(doc)[0]
        self.assertIsNone(s.points[0].value)

    def test_qualifiers(self):
        q = self.get("12442500", "00060")
        self.assertEqual(q.points[0].qualifiers, ("P",))
        self.assertEqual(q.points[6].qualifiers, ("P", "Eqp"))
        st = q.stats()
        self.assertEqual(st["qualifier_counts"], {"P": 12, "Eqp": 1})
        self.assertEqual(st["qualifier_descriptions"]["Eqp"], "Equipment malfunction")

    def test_values_are_floats_and_times_kept(self):
        q = self.get("12439500", "00060")
        self.assertEqual(q.points[0].datetime, "2026-05-27T13:00:00.000-07:00")
        self.assertEqual(q.stats()["median"], 151.0)

    def test_tidy_rows(self):
        rows = ug.tidy_rows(self.series)
        self.assertEqual(len(rows), 60)
        miss = [r for r in rows if r["missing"]]
        self.assertEqual(len(miss), 1)
        self.assertEqual(miss[0]["qualifiers"], "P;Eqp")

    def test_bad_document(self):
        with self.assertRaises(ug.NWISError):
            ug.parse_iv({"foo": 1})
        doc = load_fixture()
        del doc["value"]["timeSeries"][0]["sourceInfo"]["siteCode"]
        with self.assertRaises(ug.NWISError):
            ug.parse_iv(doc)


class Compare(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.series = ug.parse_iv(load_fixture())

    def test_mismatch_151_vs_5200(self):
        c = ug.compare_gauges(self.series, governing="12442500", obvious="12439500")
        self.assertTrue(c["mismatch"])
        self.assertAlmostEqual(c["ratio"], 5200 / 151, places=6)
        self.assertIn("MISMATCH", c["message"])
        self.assertIn("cannot know which gauge governs", c["note"])
        self.assertAlmostEqual(c["sites"]["12442500"]["water_temp"]["median"], 20.25)

    def test_no_flag_when_within_factor(self):
        c = ug.compare_gauges(self.series, governing="12442500", obvious="12439500", factor=40)
        self.assertFalse(c["mismatch"])

    def test_flag_is_symmetric(self):
        c = ug.compare_gauges(self.series, governing="12439500", obvious="12442500")
        self.assertTrue(c["mismatch"])
        self.assertLess(c["ratio"], 1)

    def test_factor_boundary(self):
        doc = load_fixture()
        for v in doc["value"]["timeSeries"][3]["values"][0]["value"]:
            v["value"] = "453"  # exactly 3x 151
        s = ug.parse_iv(doc)
        self.assertFalse(ug.compare_gauges(s, "12442500", "12439500", 3.0)["mismatch"])
        for v in doc["value"]["timeSeries"][3]["values"][0]["value"]:
            v["value"] = "454"
        s = ug.parse_iv(doc)
        self.assertTrue(ug.compare_gauges(s, "12442500", "12439500", 3.0)["mismatch"])

    def test_without_governing_does_not_pick(self):
        c = ug.compare_gauges(self.series)
        self.assertTrue(c["mismatch"])
        self.assertIsNone(c["governing_site"])
        self.assertIn("does not pick", c["message"])

    def test_unknown_governing_site_errors(self):
        with self.assertRaises(ug.NWISError):
            ug.compare_gauges(self.series, governing="99999999", obvious="12439500")


class Cli(unittest.TestCase):
    def test_from_file_writes_outputs_and_says_not_live(self):
        with tempfile.TemporaryDirectory() as d:
            oc, oj = os.path.join(d, "iv.csv"), os.path.join(d, "c.json")
            with redirect_stdout(io.StringIO()) as out:
                rc = ug.main(
                    [
                        "--from-file",
                        FIXTURE,
                        "--governing",
                        "12442500",
                        "--obvious",
                        "12439500",
                        "--out-csv",
                        oc,
                        "--out-json",
                        oj,
                    ]
                )
            self.assertEqual(rc, 0)
            self.assertIn("NOT live", out.getvalue())
            with open(oj) as f:
                j = json.load(f)
            self.assertFalse(j["provenance"]["live"])
            self.assertTrue(j["comparison"]["mismatch"])
            with open(oc) as f:
                self.assertEqual(len(f.read().strip().splitlines()), 61)

    def test_fail_on_mismatch_exit_code(self):
        with redirect_stdout(io.StringIO()):
            rc = ug.main(
                ["--from-file", FIXTURE, "--governing", "12442500", "--obvious", "12439500", "--fail-on-mismatch"]
            )
        self.assertEqual(rc, 1)

    def test_network_error_exit_2(self):
        with mock.patch("urllib.request.urlopen", side_effect=OSError("blocked")):
            with redirect_stderr(io.StringIO()) as err:
                rc = ug.main(["--sites", "12442500", "--start", "2026-05-27", "--end", "2026-05-28"])
        self.assertEqual(rc, 2)
        self.assertIn("NWIS IV request failed", err.getvalue())

    def test_fixture_untouched_by_parse(self):
        doc = load_fixture()
        before = copy.deepcopy(doc)
        ug.parse_iv(doc)
        self.assertEqual(doc, before)


if __name__ == "__main__":
    unittest.main()
