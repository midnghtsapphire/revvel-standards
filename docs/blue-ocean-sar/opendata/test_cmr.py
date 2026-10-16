"""Tests for cmr.py using recorded CMR granules.json responses."""

import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cmr  # noqa: E402
from _fakenet import FakeOpener, FakeResponse, fixture_json, read_bytes  # noqa: E402

CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
DATA_HOST = "https://data.lpdaac.earthdatacloud.nasa.gov/"
TOKEN = "placeholder-" + "edltoken" * 3


def _run(argv, opener):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = cmr.main(argv + ["--retries", "0"], opener=opener)
    return code, (json.loads(out.getvalue()) if out.getvalue() else None), err.getvalue()


def _page(name, search_after=None, hits="3"):
    h = {"Content-Type": "application/json", "CMR-Hits": hits}
    if search_after:
        h["CMR-Search-After"] = search_after
    return FakeResponse(200, json.dumps(fixture_json(name)).encode(), h)


class SearchAfter(unittest.TestCase):
    def test_pages_with_search_after_header(self):
        op = FakeOpener().add("GET", CMR, _page("cmr_gedi_p1.json", '["lpcloud",1654061954000,2384582411]'),
                              _page("cmr_gedi_p2.json", '["lpcloud",1654234354000,2384582413]'),
                              _page("cmr_gedi_p3_empty.json"))
        code, res, err = _run(["--short-name", "gedi-l2a", "--bbox", "-83.1,39.9,-82.9,40.05",
                               "--temporal", "2022-06-01/2022-06-30", "--page-size", "2"], op)
        self.assertEqual(code, 0, err)
        self.assertEqual(res["short_name"], "GEDI02_A")
        self.assertEqual(res["cmr_hits"], 3)
        self.assertEqual(res["n_granules"], 3)
        self.assertEqual(res["pages"], 3)
        self.assertNotIn("cmr-search-after", op.requests[0]["headers"])
        self.assertEqual(op.requests[1]["headers"]["cmr-search-after"], '["lpcloud",1654061954000,2384582411]')
        self.assertEqual(op.requests[2]["headers"]["cmr-search-after"], '["lpcloud",1654234354000,2384582413]')
        url = op.requests[0]["url"]
        self.assertIn("short_name=GEDI02_A", url)
        self.assertIn("bounding_box=-83.1,39.9,-82.9,40.05", url)
        self.assertIn("temporal=2022-06-01T00:00:00Z,2022-06-30T23:59:59Z", url)

    def test_stops_at_max_granules(self):
        op = FakeOpener().add("GET", CMR, _page("cmr_gedi_p1.json", "x"))
        code, res, _ = _run(["--short-name", "ATL08", "--max-granules", "2"], op)
        self.assertEqual(code, 0)
        self.assertEqual(res["n_granules"], 2)
        self.assertEqual(len(op.requests), 1)

    def test_no_header_means_last_page(self):
        op = FakeOpener().add("GET", CMR, _page("cmr_gedi_p2.json"))
        code, res, _ = _run(["--short-name", "ATL08"], op)
        self.assertEqual(res["pages"], 1)

    def test_summary_data_links_exclude_inherited_and_s3(self):
        g = cmr.summarize(fixture_json("cmr_gedi_p1.json")["feed"]["entry"][0])
        self.assertEqual(len(g["data_links"]), 1)
        self.assertTrue(g["data_links"][0].startswith("https://data.lpdaac.earthdatacloud.nasa.gov/"))
        self.assertAlmostEqual(g["size_mb"], 2851.17)


class Auth(unittest.TestCase):
    def setUp(self):
        os.environ.pop("EARTHDATA_TOKEN", None)

    def test_download_without_credentials_is_input_error(self):
        with tempfile.TemporaryDirectory() as d:
            old = os.environ.get("HOME")
            os.environ["HOME"] = d  # no ~/.netrc
            try:
                code, _, err = _run(["--short-name", "ATL08", "--download-dir", d], FakeOpener())
            finally:
                if old is not None:
                    os.environ["HOME"] = old
        self.assertEqual(code, 2)
        self.assertIn("EARTHDATA_TOKEN", err)

    def test_netrc_basic_auth_only_to_urs(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "netrc")
            with open(p, "w") as f:
                f.write("machine urs.earthdata.nasa.gov login alice password pa55-word-xyz\n")
            os.chmod(p, 0o600)
            headers, hosts, secrets = cmr.earthdata_auth(netrc_path=p)
        self.assertTrue(headers["Authorization"].startswith("Basic "))
        self.assertEqual(hosts, ["urs.earthdata.nasa.gov"])
        self.assertIn("pa55-word-xyz", secrets)

    def test_token_download_redirect_strips_token_off_earthdata(self):
        s3 = "https://lp-prod-protected.s3.us-west-2.amazonaws.com/G.h5?X-Amz-Signature=abc"
        op = FakeOpener()
        op.add("GET", CMR, _page("cmr_gedi_p2.json"))
        op.add("GET", DATA_HOST, (307, b"", {"Location": s3}))
        op.add("GET", "https://lp-prod-protected.s3.us-west-2.amazonaws.com/", (200, b"HDF5DATA" * 10))
        os.environ["EARTHDATA_TOKEN"] = TOKEN
        try:
            with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as ev:
                code, res, err = _run(["--short-name", "GEDI02_A", "--download-dir", d, "--evidence-dir", ev, "-v"], op)
                self.assertEqual(code, 0, err)
                self.assertEqual(len(res["downloads"]), 1)
                self.assertTrue(os.path.getsize(res["downloads"][0]["path"]) == 80)
                for f in os.listdir(ev):
                    self.assertNotIn(TOKEN.encode(), read_bytes(os.path.join(ev, f)))
        finally:
            del os.environ["EARTHDATA_TOKEN"]
        self.assertNotIn(TOKEN, err)
        self.assertNotIn(TOKEN, json.dumps(res))
        dl = [r for r in op.requests if not r["url"].startswith(CMR)]
        self.assertTrue(dl[0]["url"].startswith(DATA_HOST))
        self.assertTrue(dl[1]["url"].startswith(s3))
        self.assertEqual(dl[0]["headers"]["authorization"], "Bearer " + TOKEN)
        self.assertNotIn("authorization", dl[1]["headers"])
        self.assertNotIn("authorization", op.requests[0]["headers"])

    def test_token_file(self):
        with tempfile.NamedTemporaryFile("w", delete=False) as f:
            f.write(TOKEN)
        try:
            h, hosts, s = cmr.earthdata_auth(token_file=f.name)
        finally:
            os.remove(f.name)
        self.assertEqual(h["Authorization"], "Bearer " + TOKEN)
        self.assertIn("*.earthdatacloud.nasa.gov", hosts)


class Cli(unittest.TestCase):
    def test_bad_inputs(self):
        for argv in (["--short-name", "GEDI02_A;rm"], ["--short-name", "ATL08", "--temporal", "yesterday"],
                     ["--short-name", "ATL08", "--max-granules", "0"]):
            code, _, _ = _run(argv, FakeOpener())
            self.assertEqual(code, 2, argv)


if __name__ == "__main__":
    unittest.main()
