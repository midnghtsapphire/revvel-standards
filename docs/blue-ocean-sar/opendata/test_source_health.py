"""Tests for source_health.py with a fake network (no real requests)."""

import datetime as dt
import io
import json
import os
import sys
import tempfile
import unittest
import urllib.error
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import source_health as sh  # noqa: E402
from _fakenet import FakeOpener  # noqa: E402

NOW = dt.datetime(2026, 10, 16, 12, 0, tzinfo=dt.timezone.utc)
ES = "https://earth-search.aws.element84.com/v1/search"
PC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
CDSE = "https://stac.dataspace.copernicus.eu/v1/search"
S2 = "https://sentinel-cogs.s3.us-west-2.amazonaws.com"
COP = "https://copernicus-dem-30m.s3.amazonaws.com"
TPS = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer"
CMR = "https://cmr.earthdata.nasa.gov/search/collections.json"
NWIS = "https://waterservices.usgs.gov/nwis/iv/"

FEATURES = (200, {"type": "FeatureCollection", "features": [{"id": "S2B_15SUD_20261001_0_L2A"}]})
EMPTY = (200, {"type": "FeatureCollection", "features": []})
DOWN = urllib.error.URLError("connection refused")


def listing(*keys):
    body = "<ListBucketResult>" + "".join(f"<Contents><Key>{k}</Key></Contents>" for k in keys) + \
        "</ListBucketResult>"
    return (200, body.encode(), {"Content-Type": "application/xml"})


TIFF = (206, b"II*\x00" + b"\x00" * 12, {"Content-Range": "bytes 0-15/123456"})


def healthy_opener(**over):
    o = FakeOpener()
    o.add("POST", ES, over.get("es", FEATURES))
    o.add("POST", PC, over.get("pc", FEATURES))
    o.add("POST", CDSE, over.get("cdse", FEATURES))
    o.add("GET", S2 + "/?", over.get("s2list", listing("sentinel-s2-l2a-cogs/15/S/UD/x/B04.tif")))
    o.add("GET", S2 + "/sentinel", over.get("s2cog", TIFF))
    o.add("GET", COP + "/?", listing(f"{sh.COP_TILE}/AUXFILES/x_EDM.tif", f"{sh.COP_TILE}/{sh.COP_TILE}.tif"))
    o.add("GET", COP + "/Copernicus", TIFF)
    o.add("GET", TPS, over.get("tps", (200, {"name": "3DEPElevation", "extent": {}})))
    o.add("GET", CMR, (200, {"feed": {"entry": [{"id": "C123-LPCLOUD"}]}}))
    o.add("GET", NWIS, over.get("nwis", (200, {"value": {"timeSeries": [{}, {}]}})))
    return o


def run(opener, services=None, **kw):
    clock = iter(range(0, 10000)).__next__
    return sh.run(services or sh.default_services(), now=NOW, opener=opener, sleep=lambda s: None,
                  clock=lambda: float(clock()), **kw)


class Probing(unittest.TestCase):
    def test_all_healthy_selects_preferred_mirrors_and_writes_config(self):
        rep, cfg = run(healthy_opener())
        self.assertTrue(rep["ok"])
        self.assertEqual([s["status"] for s in rep["services"]], ["ok"] * 6)
        self.assertEqual(cfg["services"]["sentinel2-search"]["mirror"], "earth-search")
        self.assertEqual(cfg["services"]["sentinel2-search"]["fallbacks"], ["planetary-computer", "cdse"])
        for v in cfg["services"].values():
            self.assertTrue(10 <= v["timeout_s"] <= 120)

    def test_failover_when_primary_down_or_returns_nothing(self):
        for bad in (DOWN, EMPTY, (503, b"busy")):
            with self.subTest(bad=bad):
                rep, cfg = run(healthy_opener(es=bad), sh.default_services()[:1])
                s = rep["services"][0]
                self.assertEqual(s["status"], "degraded")
                self.assertEqual(s["selected"], "planetary-computer")
                self.assertIn("failed over from earth-search", s["reason"])
                self.assertTrue(rep["ok"])
                self.assertEqual(rep["degraded"], ["sentinel2-search"])

    def test_cog_must_be_tiff_and_honour_range(self):
        for bad in ((206, b"<html>oops</html>"), (200, b"II*\x00" * 4)):
            with self.subTest(bad=bad[0]):
                rep, _ = run(healthy_opener(s2cog=bad), sh.default_services()[1:2])
                self.assertEqual(rep["services"][0]["status"], "down")
                self.assertFalse(rep["ok"])
                self.assertEqual(rep["down_required"], ["sentinel2-cog"])

    def test_cop_probe_reads_the_dem_not_an_auxfile(self):
        o = healthy_opener()
        run(o, sh.default_services()[2:3])
        cog_gets = [r["url"] for r in o.requests if r["url"].startswith(COP + "/Copernicus")]
        self.assertTrue(cog_gets and all(u.endswith("_DEM.tif") for u in cog_gets))
        self.assertTrue(all(r["headers"].get("range") == "bytes=0-15" for r in o.requests
                            if r["url"] in cog_gets))

    def test_optional_service_down_does_not_fail_the_run(self):
        rep, cfg = run(healthy_opener(tps=(200, {"error": {"code": 500}}), nwis=DOWN))
        self.assertTrue(rep["ok"])
        self.assertEqual(sorted(rep["down_optional"]), ["usgs-3dep", "usgs-water"])
        self.assertNotIn("usgs-3dep", cfg["services"])

    def test_flaky_mirror_needs_half_its_samples(self):
        svc = sh.default_services()[:1]
        rep, cfg = run(healthy_opener(es=DOWN), svc, samples=3)
        self.assertEqual(rep["services"][0]["selected"], "planetary-computer")
        o = FakeOpener().add("POST", ES, DOWN, FEATURES, FEATURES).add("POST", PC, FEATURES).add("POST", CDSE, FEATURES)
        rep, cfg = run(o, svc, samples=3)
        m = rep["services"][0]["mirrors"][0]
        self.assertEqual(m["ok_samples"], 2)
        self.assertTrue(m["healthy"])
        self.assertEqual(cfg["services"]["sentinel2-search"]["retries"], 3)

    def test_history_demotes_a_mirror_that_failed_every_run(self):
        # Regression: a 0.0 success rate was read as "no history" (0.0 or 1.0 == 1.0).
        state = {"history": {"sentinel2-search": {"earth-search": [False] * 4}}}
        rep, _ = run(healthy_opener(), sh.default_services()[:1], state=state)
        self.assertEqual(rep["services"][0]["selected"], "planetary-computer")

    def test_non_object_json_fails_over_instead_of_crashing(self):
        rep, _ = run(healthy_opener(es=(200, [1, 2])), sh.default_services()[:1])
        self.assertEqual(rep["services"][0]["selected"], "planetary-computer")
        self.assertIn("JSON object", rep["services"][0]["mirrors"][0]["samples"][0]["error"])
        rep, _ = run(healthy_opener(tps=(200, ["x"]), nwis=(200, {"value": []})))
        self.assertEqual(sorted(rep["down_optional"]), ["usgs-3dep", "usgs-water"])

    def test_history_demotes_a_mirror_that_keeps_failing(self):
        state = {"history": {"sentinel2-search": {"earth-search": [False, False, False, True]}}}
        rep, _ = run(healthy_opener(), sh.default_services()[:1], state=state)
        self.assertEqual(rep["services"][0]["selected"], "planetary-computer")
        new = sh.update_state(state, rep)
        self.assertEqual(new["history"]["sentinel2-search"]["earth-search"][-1], True)
        long = sh.update_state({"history": {"sentinel2-search": {"earth-search": [True] * 30}}}, rep)
        self.assertEqual(len(long["history"]["sentinel2-search"]["earth-search"]), sh.STATE_KEEP)

    def test_timeout_scales_with_observed_latency(self):
        t, r = sh.recommend_network({"max_latency_s": 7.2, "ok_samples": 2, "samples": [{}, {}]}, 20)
        self.assertEqual((t, r), (29.0, 2))
        t, _ = sh.recommend_network({"max_latency_s": 0.1, "ok_samples": 1, "samples": [{}]}, 20)
        self.assertEqual(t, 10.0)
        t, _ = sh.recommend_network({"max_latency_s": 90, "ok_samples": 1, "samples": [{}]}, 20)
        self.assertEqual(t, 120.0)


class Cli(unittest.TestCase):
    def _main(self, argv, opener):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = sh.main(argv, opener=opener, now=NOW, sleep=lambda s: None)
        return code, out.getvalue(), err.getvalue()

    def test_exit_codes_and_files(self):
        with tempfile.TemporaryDirectory() as d:
            rp, cp, st, md = (os.path.join(d, n) for n in ("r.json", "c.json", "s.json", "s.md"))
            code, _, _ = self._main(["--samples", "1", "--out", rp, "--config-out", cp, "--state", st,
                                     "--summary-md", md], healthy_opener())
            self.assertEqual(code, 0)
            for p in (rp, cp, st, md):
                self.assertTrue(os.path.exists(p), p)
            with open(cp, encoding="utf-8") as f:
                self.assertIn("copernicus-dem", json.load(f)["services"])
            code, _, err = self._main(["--samples", "1", "--only", "copernicus-dem", "--out", rp],
                                      FakeOpener().add(None, COP, DOWN))
            self.assertEqual(code, 1)
            self.assertIn("down: copernicus-dem", err)
        self.assertEqual(self._main(["--samples", "0"], healthy_opener())[0], 2)
        self.assertEqual(self._main(["--only", "nope"], healthy_opener())[0], 2)

    def test_custom_services_file_is_validated(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "svc.json")
            with open(p, "w", encoding="utf-8") as f:
                json.dump([{"name": "x", "mirrors": [{"name": "m", "kind": "stac", "root": "http://evil.example",
                                                      "hosts": ["evil.example"]}]}], f)
            code, _, err = self._main(["--services", p], healthy_opener())
            self.assertEqual(code, 2)
            with open(p, "w", encoding="utf-8") as f:
                json.dump([{"name": "x", "mirrors": [{"name": "m", "kind": "shell", "root": "https://a.example",
                                                      "hosts": ["a.example"]}]}], f)
            self.assertEqual(self._main(["--services", p], healthy_opener())[0], 2)
            ok_mirror = {"name": "m", "kind": "stac", "root": "https://a.example", "hosts": ["a.example"]}
            for bad in ([1], [{"name": "x", "mirrors": [7]}], {"name": "x"},
                        [{"name": "x", "mirrors": [{"name": "m", "kind": "stac", "root": "https://a.example"}]}],
                        [{"name": "x", "mirrors": [{"name": "m", "kind": "cmr", "root": "https://a.example",
                                                    "hosts": ["a.example"]}]}],
                        [{"name": "x", "required": "false", "mirrors": [ok_mirror]}],
                        [{"name": "x", "mirrors": [ok_mirror, ok_mirror]}]):
                with self.subTest(bad=bad):
                    with open(p, "w", encoding="utf-8") as f:
                        json.dump(bad, f)
                    self.assertEqual(self._main(["--services", p], healthy_opener())[0], 2)

    def test_bad_state_file_is_exit_2(self):
        with tempfile.TemporaryDirectory() as d:
            st = os.path.join(d, "s.json")
            for bad in ([1, 2], {"history": []}, {"history": {"svc": 3}},
                        {"history": {"svc": {"m": ["no", 0, 1]}}}):
                with self.subTest(bad=bad):
                    with open(st, "w", encoding="utf-8") as f:
                        json.dump(bad, f)
                    self.assertEqual(self._main(["--state", st], healthy_opener())[0], 2)


if __name__ == "__main__":
    unittest.main()
