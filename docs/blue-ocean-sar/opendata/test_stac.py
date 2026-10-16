"""Tests for stac.py using recorded STAC API responses."""

import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import stac  # noqa: E402
from _fakenet import FakeOpener, fixture_json, read_bytes, read_json  # noqa: E402

ES = "https://earth-search.aws.element84.com/v1/search"
PC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
SAS = "https://planetarycomputer.microsoft.com/api/sas/v1/token/"
CDSE = "https://stac.dataspace.copernicus.eu/v1/search"
CMRSTAC = "https://cmr.earthdata.nasa.gov/stac/LPCLOUD/search"
TOKEN = "placeholder-" + "bearer" * 4


def _run(argv, opener):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = stac.main(argv + ["--retries", "0"], opener=opener)
    return code, (json.loads(out.getvalue()) if out.getvalue() else None), err.getvalue()


class Query(unittest.TestCase):
    def test_parse_query(self):
        q = stac.parse_query(["eo:cloud_cover<20", "eo:cloud_cover>=1.5", "platform=sentinel-2b"])
        self.assertEqual(q, {"eo:cloud_cover": {"lt": 20, "gte": 1.5}, "platform": {"eq": "sentinel-2b"}})
        with self.assertRaises(ValueError):
            stac.parse_query(["cloud ~ 5"])

    def test_body(self):
        b = stac.build_search_body([1, 2, 3, 4], ("2024-01-01T00:00:00Z", None), ["sentinel-2-l2a"], None, 10)
        self.assertEqual(b["datetime"], "2024-01-01T00:00:00Z/..")
        with self.assertRaises(ValueError):
            stac.build_search_body(collections=["bad id; drop"])


class Pagination(unittest.TestCase):
    def test_earth_search_post_next_without_merge(self):
        op = FakeOpener().add("POST", ES, (200, fixture_json("stac_earthsearch_p1.json")),
                              (200, fixture_json("stac_earthsearch_p2.json")))
        code, res, err = _run(["--catalog", "earth-search", "--collections", "sentinel-2-l2a",
                               "--bbox", "-83.1,39.9,-82.9,40.05", "--datetime", "2024-06-01/2024-06-30",
                               "--max-cloud", "20", "--limit", "2"], op)
        self.assertEqual(code, 0, err)
        self.assertEqual(res["pages"], 2)
        self.assertEqual(res["n_items"], 3)
        self.assertEqual(res["number_matched"], 3)
        self.assertEqual([i["cloud_cover"] for i in res["items"]], [4.2, 12.9, 18.0])
        first = json.loads(op.requests[0]["body"])
        self.assertEqual(first["query"], {"eo:cloud_cover": {"lte": 20.0}})
        self.assertEqual(first["bbox"], [-83.1, 39.9, -82.9, 40.05])
        second = json.loads(op.requests[1]["body"])
        self.assertIn("next", second)
        self.assertEqual(second["collections"], ["sentinel-2-l2a"])

    def test_pc_merge_body_and_signing(self):
        op = FakeOpener()
        op.add("POST", PC, (200, fixture_json("stac_pc_p1.json")), (200, fixture_json("stac_pc_p2.json")))
        op.add("GET", SAS + "sentinel-2-l2a", (200, fixture_json("stac_pc_sas_token.json")))
        code, res, err = _run(["--catalog", "planetary-computer", "--collections", "sentinel-2-l2a",
                               "--bbox", "-83.1,39.9,-82.9,40.05", "--limit", "1", "--band", "B04", "--sign"], op)
        self.assertEqual(code, 0, err)
        self.assertEqual(res["n_items"], 2)
        second = json.loads(op.requests[1]["body"])
        self.assertEqual(second["collections"], ["sentinel-2-l2a"])
        self.assertTrue(second["token"].startswith("next:"))
        for it in res["items"]:
            self.assertEqual(list(it["assets"]), ["B04"])
            self.assertIn("sig=", it["assets"]["B04"]["href"])
        sas_calls = [r for r in op.requests if r["url"].startswith(SAS)]
        self.assertEqual(len(sas_calls), 1, "SAS token should be cached per collection")

    def test_cdse_get_next_and_band_variants(self):
        op = FakeOpener()
        op.add("POST", CDSE, (200, fixture_json("stac_cdse_p1.json")))
        op.add("GET", CDSE, (200, fixture_json("stac_cdse_p2.json")))
        code, res, err = _run(["--catalog", "cdse", "--collections", "sentinel-2-l2a", "--limit", "1",
                               "--band", "red"], op)
        self.assertEqual(code, 0, err)
        self.assertEqual(res["n_items"], 2)
        self.assertEqual(op.requests[1]["method"], "GET")
        self.assertEqual(sorted(res["items"][0]["assets"]), ["B04_10m", "B04_20m"])

    def test_max_items_stops_paging(self):
        op = FakeOpener().add("POST", ES, (200, fixture_json("stac_earthsearch_p1.json")))
        code, res, _ = _run(["--catalog", "earth-search", "--max-items", "2", "--limit", "2"], op)
        self.assertEqual(code, 0)
        self.assertEqual(res["n_items"], 2)
        self.assertEqual(len(op.requests), 1)

    def test_next_link_to_other_host_refused(self):
        page = fixture_json("stac_earthsearch_p1.json")
        page["links"][0]["href"] = "https://evil.example.net/search"
        op = FakeOpener().add("POST", ES, (200, page))
        code, _, err = _run(["--catalog", "earth-search"], op)
        self.assertEqual(code, 2)
        self.assertIn("allow-list", err)


class Bands(unittest.TestCase):
    def test_asset_matching(self):
        a = {"eo:bands": [{"name": "B04", "common_name": "red"}]}
        self.assertTrue(stac.asset_matches_band("red", a, "B04"))
        self.assertTrue(stac.asset_matches_band("B04_10m", {}, "b04"))
        self.assertFalse(stac.asset_matches_band("B05", {}, "B04"))


class CmrStac(unittest.TestCase):
    def test_search_without_token_sends_no_auth(self):
        op = FakeOpener().add("POST", CMRSTAC, (200, fixture_json("stac_cmr_lpcloud_p1.json")))
        code, res, err = _run(["--catalog", "cmr-lpcloud", "--collections", "GEDI02_A_002"], op)
        self.assertEqual(code, 0, err)
        self.assertEqual(res["root"], "https://cmr.earthdata.nasa.gov/stac/LPCLOUD")
        self.assertNotIn("authorization", op.requests[0]["headers"])

    def test_download_needs_token(self):
        os.environ.pop("EARTHDATA_TOKEN", None)
        with tempfile.TemporaryDirectory() as d:
            code, _, err = _run(["--catalog", "cmr-lpcloud", "--download-dir", d], FakeOpener())
        self.assertEqual(code, 2)
        self.assertIn("EARTHDATA_TOKEN", err)

    def test_download_only_on_cmr_catalogs(self):
        with tempfile.TemporaryDirectory() as d:
            code, _, _ = _run(["--catalog", "earth-search", "--download-dir", d], FakeOpener())
        self.assertEqual(code, 2)

    def test_download_with_token_auth_only_on_download(self):
        op = FakeOpener()
        op.add("POST", CMRSTAC, (200, fixture_json("stac_cmr_lpcloud_p1.json")))
        op.add("GET", "https://data.lpdaac.earthdatacloud.nasa.gov/", (200, b"\x89HDF\r\n\x1a\n" + b"0" * 100))
        os.environ["EARTHDATA_TOKEN"] = TOKEN
        try:
            with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as ev:
                code, res, err = _run(["--catalog", "cmr-lpcloud", "--collections", "GEDI02_A_002", "--band", "data",
                                       "--download-dir", d, "--evidence-dir", ev, "-v"], op)
                self.assertEqual(code, 0, err)
                self.assertEqual(len(res["downloads"]), 1)  # s3:// asset skipped
                dl = res["downloads"][0]
                self.assertTrue(os.path.exists(dl["path"]))
                self.assertEqual(len(dl["sha256"]), 64)
                for f in os.listdir(ev):
                    self.assertNotIn(TOKEN.encode(), read_bytes(os.path.join(ev, f)))
                sidecars = [read_json(os.path.join(ev, f)) for f in os.listdir(ev) if f.endswith(".json")]
                self.assertTrue(any(s.get("body_file", "").endswith(".h5") for s in sidecars))
        finally:
            del os.environ["EARTHDATA_TOKEN"]
        self.assertNotIn(TOKEN, err)
        self.assertNotIn("authorization", op.requests[0]["headers"])
        self.assertEqual(op.requests[1]["headers"]["authorization"], "Bearer " + TOKEN)


class SharedEvidenceLog(unittest.TestCase):
    def test_download_into_shared_log_without_token(self):
        import fetch as F
        core = F.evidence_core()
        op = FakeOpener()
        op.add("POST", CMRSTAC, (200, fixture_json("stac_cmr_lpcloud_p1.json")))
        op.add("GET", "https://data.lpdaac.earthdatacloud.nasa.gov/", (200, b"\x89HDF\r\n\x1a\n" + b"0" * 100))
        with mock.patch.dict(os.environ, {"EARTHDATA_TOKEN": TOKEN, core.ENV_OPERATOR: "Det. A. Example"}), \
                tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as ev:
            log = os.path.join(ev, "case")
            code, res, err = _run(["--catalog", "cmr-lpcloud", "--collections", "GEDI02_A_002", "--band", "data",
                                   "--download-dir", d, "--evidence-log", log], op)
            self.assertEqual(code, 0, err)
            rep = core.verify_log(log)
            self.assertTrue(rep["ok"], rep["problems"])
            self.assertEqual(rep["count"], 2)  # the search response and the streamed download
            for root, _, files in os.walk(ev):
                for name in files:
                    self.assertNotIn(TOKEN.encode(), read_bytes(os.path.join(root, name)))
        self.assertNotIn("deprecated", err)  # only --evidence-dir warns


class Cli(unittest.TestCase):
    def test_list_catalogs(self):
        code, res, _ = _run(["--list-catalogs"], FakeOpener())
        self.assertEqual(code, 0)
        for name in ("earth-search", "planetary-computer", "cdse", "cmr-lpcloud", "cmr-nsidc"):
            self.assertIn(name, res)

    def test_bad_input_exit_2(self):
        for argv in (["--catalog", "nope"], ["--bbox", "1,2,3"], ["--max-cloud", "120"],
                     ["--catalog", "earth-search", "--sign"]):
            code, _, _ = _run(argv, FakeOpener())
            self.assertEqual(code, 2, argv)

    def test_server_error_exit_3(self):
        op = FakeOpener().add("POST", ES, (502, b"bad gateway"))
        code, _, _ = _run(["--catalog", "earth-search"], op)
        self.assertEqual(code, 3)


if __name__ == "__main__":
    unittest.main()
