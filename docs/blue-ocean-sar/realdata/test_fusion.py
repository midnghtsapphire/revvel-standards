"""Tests for fusion.py. Table and feature layers use the standard library;
the raster layer test needs numpy and rasterio and is skipped without them."""

import csv
import importlib
import io
import json
import math
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fusion  # noqa: E402


def _has(*modules):
    try:
        for m in modules:
            importlib.import_module(m)
        return True
    except ImportError:
        return False


HAS_RASTER = _has("numpy", "rasterio")

SITES = [("S1", 50.0000, -119.0000), ("S2", 50.0010, -119.0000), ("S3", 50.0020, -119.0000),
         ("S4", 50.0030, -119.0000)]
# layer a: higher = more anomalous; layer b: lower = more anomalous (e.g. a negative NDVI-change z)
TABLE = {"S1": (1.0, -0.5), "S2": (2.0, -3.0), "S3": (3.0, -1.0), "S4": (10.0, 0.0)}


class Fusion(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = self.tmp.name
        with open(os.path.join(self.d, "sites.csv"), "w") as f:
            f.write("site_id,lat,lon\n" + "".join(f"{s},{la},{lo}\n" for s, la, lo in SITES))
        with open(os.path.join(self.d, "layers.csv"), "w") as f:
            f.write("site_id,a,b\n" + "".join(f"{s},{a},{b}\n" for s, (a, b) in TABLE.items()))

    def tearDown(self):
        self.tmp.cleanup()

    def _cfg(self, layers, **extra):
        path = os.path.join(self.d, f"cfg{len(os.listdir(self.d))}.json")
        with open(path, "w") as f:
            json.dump(dict({"sites": "sites.csv", "layers": layers}, **extra), f)
        return path

    def _table_layers(self, wa, wb):
        return [{"name": "a", "type": "table", "file": "layers.csv", "column": "a", "weight": wa},
                {"name": "b", "type": "table", "file": "layers.csv", "column": "b", "weight": wb,
                 "direction": "lower"}]

    def _run(self, cfg_path):
        return fusion.fuse(fusion.load_config(cfg_path))

    def test_every_site_lists_inputs_weights_and_recomputable_score(self):
        res = self._run(self._cfg(self._table_layers(2.0, 1.0)))
        self.assertNotIn("probability", json.dumps(res).replace("not a probability", ""))
        self.assertIn("not a probability", res["score_kind"])
        for s in res["sites"]:
            self.assertEqual(set(s["layers"]), {"a", "b"})
            num = 0.0
            for name, w in (("a", 2.0), ("b", 1.0)):
                e = s["layers"][name]
                col = 0 if name == "a" else 1
                self.assertEqual(e["raw_value"], TABLE[s["site_id"]][col])
                self.assertEqual(e["weight"], w)
                self.assertEqual(e["source"]["file"], "layers.csv")
                self.assertAlmostEqual(e["contribution"], w * e["normalised"], places=12)
                num += e["contribution"]
            self.assertAlmostEqual(s["score"], num / 3.0, places=12)

    def test_robust_z_values_exact(self):
        res = self._run(self._cfg(self._table_layers(1.0, 1.0)))
        by = {s["site_id"]: s for s in res["sites"]}
        # a = [1, 2, 3, 10]: median 2.5, MAD 1.0 -> scale 1.4826
        for sid, (a, _) in TABLE.items():
            self.assertAlmostEqual(by[sid]["layers"]["a"]["normalised"], (a - 2.5) / 1.4826, places=12)
        # b flipped (direction lower): [0.5, 3, 1, 0] -> median 0.75, |dev| [.25, 2.25, .25, .75] -> MAD 0.5
        for sid, (_, b) in TABLE.items():
            self.assertAlmostEqual(by[sid]["layers"]["b"]["normalised"], (-b - 0.75) / (1.4826 * 0.5), places=12)
        stats = {L["name"]: L["stats"] for L in res["layers"]}
        self.assertAlmostEqual(stats["a"]["scale"], 1.4826, places=12)

    def test_ranking_follows_weights_from_config(self):
        only_a = [s["site_id"] for s in self._run(self._cfg(self._table_layers(1.0, 0.0)))["sites"]]
        only_b = [s["site_id"] for s in self._run(self._cfg(self._table_layers(0.0, 1.0)))["sites"]]
        self.assertEqual(only_a, ["S4", "S3", "S2", "S1"])
        self.assertEqual(only_b, ["S2", "S3", "S1", "S4"])
        res = self._run(self._cfg(self._table_layers(1.0, 0.0)))
        self.assertEqual([s["rank"] for s in res["sites"]], [1, 2, 3, 4])

    def test_weight_must_be_set_in_config(self):
        bad = self._table_layers(1.0, 1.0)
        del bad[0]["weight"]
        with self.assertRaisesRegex(fusion.ConfigError, "weight"):
            fusion.load_config(self._cfg(bad))
        neg = self._table_layers(-1.0, 1.0)
        with self.assertRaises(fusion.ConfigError):
            fusion.load_config(self._cfg(neg))
        no_decay = json.dumps(fusion.fuse(fusion.load_config(self._cfg(self._table_layers(1.0, 1.0)))))
        self.assertNotIn("pmi", no_decay.lower())

    def test_rank_percentile_with_ties(self):
        self.assertEqual(fusion._rank_pct([5.0, 1.0, 5.0, 3.0]), [5 / 6, 0.0, 5 / 6, 1 / 3])
        self.assertEqual(fusion._rank_pct([7.0]), [0.5])
        layers = self._table_layers(1.0, 1.0)
        layers[0]["normalise"] = "rank_pct"
        by = {s["site_id"]: s for s in self._run(self._cfg(layers))["sites"]}
        self.assertEqual([by[s]["layers"]["a"]["normalised"] for s in ("S1", "S2", "S3", "S4")],
                         [0.0, 1 / 3, 2 / 3, 1.0])

    def _features_file(self):
        # dem_terrain.py-style output: {"depressions": [{"lat", "lon", "max_depth_m", ...}]}
        path = os.path.join(self.d, "td.json")
        with open(path, "w") as f:
            json.dump({"depressions": [{"lat": 50.00002, "lon": -119.0, "max_depth_m": 0.8},
                                       {"lat": 50.0020, "lon": -119.00003, "max_depth_m": 1.6}]}, f)
        return "td.json"

    def test_feature_layer_nearest_within_distance_and_fill(self):
        layers = [{"name": "dep", "type": "features", "file": self._features_file(), "path": "depressions",
                   "field": "max_depth_m", "max_distance_m": 10, "fill_value": 0, "weight": 1}]
        by = {s["site_id"]: s for s in self._run(self._cfg(layers))["sites"]}
        self.assertEqual(by["S1"]["layers"]["dep"]["raw_value"], 0.8)
        self.assertEqual(by["S1"]["layers"]["dep"]["source"]["feature_index"], 0)
        self.assertAlmostEqual(by["S1"]["layers"]["dep"]["source"]["distance_m"], 2.224, places=2)
        self.assertEqual(by["S3"]["layers"]["dep"]["raw_value"], 1.6)
        self.assertEqual(by["S2"]["layers"]["dep"]["raw_value"], 0.0)
        self.assertIn("filled", by["S2"]["layers"]["dep"]["source"])
        self.assertEqual(by["S3"]["rank"], 1)

    def test_missing_policy_zero_vs_renormalise(self):
        feat = {"name": "dep", "type": "features", "file": self._features_file(), "path": "depressions",
                "field": "max_depth_m", "max_distance_m": 10, "weight": 1}
        layers = self._table_layers(1.0, 0.0) + [feat]
        z = {s["site_id"]: s for s in self._run(self._cfg(layers))["sites"]}
        r = {s["site_id"]: s for s in self._run(self._cfg(layers, missing="renormalise"))["sites"]}
        self.assertEqual(z["S2"]["missing_layers"], ["dep"])
        a2 = z["S2"]["layers"]["a"]["contribution"]
        self.assertAlmostEqual(z["S2"]["score"], a2 / 2.0, places=12)
        self.assertAlmostEqual(r["S2"]["score"], a2 / 1.0, places=12)
        # two sites with a depression: z = (v - median)/scale over just those two
        # values 0.8, 1.6 -> median 1.2, MAD 0.4 -> z = -/+ 0.4 / (1.4826 * 0.4)
        self.assertAlmostEqual(z["S1"]["layers"]["dep"]["normalised"], -1 / 1.4826, places=12)
        self.assertAlmostEqual(z["S3"]["layers"]["dep"]["normalised"], 1 / 1.4826, places=12)

    def test_cli_outputs_and_exit_codes(self):
        cfg = self._cfg(self._table_layers(1.0, 1.0))
        out, out_csv = os.path.join(self.d, "r.json"), os.path.join(self.d, "r.csv")
        with redirect_stderr(io.StringIO()):
            self.assertEqual(fusion.main(["--config", cfg, "--out", out, "--csv", out_csv]), 0)
            self.assertEqual(fusion.main(["--config", os.path.join(self.d, "nope.json"), "--out", out]), 2)
        with open(out_csv) as f:
            rows = list(csv.DictReader(f))
        self.assertEqual(len(rows), 4)
        self.assertIn("a_weight", rows[0])
        self.assertEqual(float(rows[0]["a_weight"]), 1.0)


@unittest.skipUnless(HAS_RASTER, "numpy/rasterio not installed")
class RasterLayer(unittest.TestCase):
    def test_raster_sampled_at_site(self):
        import numpy as np
        import rasterio
        from rasterio.transform import from_origin
        from rasterio.warp import transform as warp

        with tempfile.TemporaryDirectory() as d:
            z = np.zeros((50, 50), dtype="float32")
            z[10, 20] = -0.4  # one 1 m cell of subsidence
            tif = os.path.join(d, "dod.tif")
            with rasterio.open(tif, "w", driver="GTiff", height=50, width=50, count=1, dtype="float32",
                               crs="EPSG:32611", transform=from_origin(500000.0, 5600000.0, 1.0, 1.0)) as dst:
                dst.write(z, 1)
            pts = {"HIT": (500020.5, 5599989.5), "MISS": (500040.5, 5599960.5), "OUT": (500500.5, 5599000.5)}
            with open(os.path.join(d, "sites.csv"), "w") as f:
                f.write("site_id,lat,lon\n")
                for sid, (x, y) in pts.items():
                    (lo,), (la,) = warp("EPSG:32611", "EPSG:4326", [x], [y])
                    f.write(f"{sid},{la:.9f},{lo:.9f}\n")
            with open(os.path.join(d, "cfg.json"), "w") as f:
                json.dump({"sites": "sites.csv", "layers": [
                    {"name": "dod", "type": "raster", "file": "dod.tif", "stat": "min", "buffer_m": 1,
                     "direction": "lower", "weight": 1}]}, f)
            res = fusion.fuse(fusion.load_config(os.path.join(d, "cfg.json")))
        by = {s["site_id"]: s for s in res["sites"]}
        self.assertAlmostEqual(by["HIT"]["layers"]["dod"]["raw_value"], -0.4, places=6)
        self.assertEqual((by["HIT"]["layers"]["dod"]["source"]["row"], by["HIT"]["layers"]["dod"]["source"]["col"]),
                         (10, 20))
        self.assertEqual(by["HIT"]["layers"]["dod"]["source"]["cells"], 9)
        self.assertEqual(by["MISS"]["layers"]["dod"]["raw_value"], 0.0)
        self.assertIsNone(by["OUT"]["layers"]["dod"]["raw_value"])
        self.assertEqual(by["HIT"]["rank"], 1)
        self.assertTrue(math.isfinite(by["HIT"]["score"]))


if __name__ == "__main__":
    unittest.main()
