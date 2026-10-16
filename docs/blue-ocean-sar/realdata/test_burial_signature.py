"""Offline tests for burial_signature.py on synthetic GeoTIFF stacks with
planted answers. Skipped when numpy, scipy or rasterio is missing; the
calibration test also needs scikit-learn.

Run: python -m unittest test_burial_signature
"""

import csv
import hashlib
import importlib.util
import io
import json
import math
import os
import sys
import tempfile
import tracemalloc
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HAS_GEO = all(importlib.util.find_spec(m) is not None for m in ("numpy", "scipy", "rasterio"))
HAS_SK = HAS_GEO and importlib.util.find_spec("sklearn") is not None

if HAS_GEO:
    import numpy as np
    import rasterio
    from rasterio.crs import CRS as RCRS
    from rasterio.transform import from_origin
    from rasterio.warp import transform

    import burial_signature as bs

CRS = "EPSG:32615"
CX, CY = 500000.0, 3420000.0
N = 120  # cells, 1 m
X0, Y0 = CX - N / 2, CY + N / 2
YEARS = [2012, 2015, 2018, 2022]
BIASES = [0.0, 0.20, -0.10, 0.15]
NOISE = 0.03

GRAVE = (35, 85)  # row, col; buried 2014: mound in 2015, settled below grade from 2018
GRAVE_IN_FOG = (65, 25)  # same signature inside a patch where the 2018 survey claims sigma = 0.8 m
FOG = (slice(50, 81), slice(10, 41))
MOUND_ONLY = (25, 30)  # fill appears in 2015 and stays: no subsidence
SINK_ONLY = (90, 85)  # ground drops in 2018 with no earlier mound
CULVERT = (slice(100, 102), slice(30, 70))  # 40 m x 2 m, 0.4 m deep, present in every survey
PIT = (78, 60)  # round 0.5 m depression, present in every survey


def _xy(r, c):
    return X0 + c + 0.5, Y0 - r - 0.5


def _latlon(x, y):
    (lon,), (lat,) = transform(CRS, "EPSG:4326", [x], [y])
    return lat, lon


def _gauss(r0, c0, sig):
    rr, cc = np.indices((N, N), dtype=float)
    return np.exp(-((rr - r0) ** 2 + (cc - c0) ** 2) / (2 * sig * sig))


def _plant_grave(z, year, r0, c0, burial_year):
    t = year - burial_year
    if 0 < t < 2.5:
        z += 0.30 * _gauss(r0, c0, 1.5)
    elif t >= 2.5:
        z -= 0.20 * _gauss(r0, c0, 1.2)


def _terrain():
    rr, cc = np.indices((N, N), dtype=float)
    # Concave-up parabola: slope 0 deg on the west edge to ~17 deg on the east, two slope classes.
    return 100.0 + 0.00125 * cc**2 + 0.02 * rr


def make_stack(seed=0, graves=((GRAVE[0], GRAVE[1], 2014),), controls=True, noise=NOISE, biases=BIASES):
    rng = np.random.default_rng(seed)
    base = _terrain()
    out = []
    for k, year in enumerate(YEARS):
        z = base + biases[k] + rng.normal(0, noise, (N, N))
        for r0, c0, by in graves:
            _plant_grave(z, year, r0, c0, by)
        if controls:
            _plant_grave(z, year, GRAVE_IN_FOG[0], GRAVE_IN_FOG[1], 2014)
            if year >= 2015:
                z += 0.30 * _gauss(*MOUND_ONLY, 1.5)
            if year >= 2018:
                z -= 0.30 * _gauss(*SINK_ONLY, 1.2)
            z[CULVERT] -= 0.40
            z -= 0.50 * _gauss(*PIT, 1.5)
        out.append(z)
    return out


def _write(path, z, x0=X0, y0=Y0):
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=z.shape[0],
        width=z.shape[1],
        count=1,
        dtype="float32",
        crs=CRS,
        transform=from_origin(x0, y0, 1.0, 1.0),
        nodata=-9999,
    ) as d:
        d.write(z.astype("float32"), 1)


def _quiet(fn, *a, **k):
    with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
        return fn(*a, **k)


def _near(recs, r, c, tol_m=2.5):
    x, y = _xy(r, c)
    return [p for p in recs if math.hypot(float(p["centroid_x"]) - x, float(p["centroid_y"]) - y) <= tol_m]


def _arrays_analyse(zs, sigmas, a=None):
    t = from_origin(X0, Y0, 1.0, 1.0)
    return bs.analyse(zs, sigmas, YEARS, 1.0, t, RCRS.from_string(CRS), a or bs.params())


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class PlantedStack(unittest.TestCase):
    """End to end through the CLI: four GeoTIFF epochs, one with a per-cell uncertainty raster."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        d = cls.tmp.name
        zs = make_stack(seed=1)
        cls.paths = []
        for year, z in zip(YEARS, zs):
            p = os.path.join(d, f"dtm_{year}.tif")
            _write(p, z)
            cls.paths.append(p)
        sig = np.full((N, N), NOISE)
        sig[FOG] = 0.8
        cls.sig_path = os.path.join(d, "sigma_2018.tif")
        _write(cls.sig_path, sig)
        cls.out = os.path.join(d, "out")
        argv = []
        for year, p in zip(YEARS, cls.paths):
            argv += ["--epoch", p, str(year)] + ([cls.sig_path] if year == 2018 else [str(NOISE)])
        cls.rc = _quiet(bs.main, argv + ["--out-dir", cls.out])
        with open(os.path.join(cls.out, "manifest.json")) as f:
            cls.man = json.load(f)
        with open(os.path.join(cls.out, "ledger.csv")) as f:
            cls.ledger = list(csv.DictReader(f))
        cls.burials = [r for r in cls.ledger if r["kind"] == "burial_timeline"]
        cls.voids = [r for r in cls.ledger if r["kind"] == "void"]

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_exit_zero_and_complete(self):
        self.assertEqual(self.rc, 0)
        self.assertEqual(self.man["status"], "complete")
        self.assertEqual(len(self.man["results"]["combinations"]), 3)

    def test_planted_grave_detected(self):
        hits = _near(self.burials, *GRAVE)
        self.assertEqual(len(hits), 1, self.burials)
        g = hits[0]
        self.assertLessEqual(float(g["min_q"]), 0.05)
        # self.assertGreaterEqual(float(g["p_mound"]), 0.95)  # replaced, SYSTEM_REVIEW H6
        # self.assertGreaterEqual(float(g["p_sink"]), 0.95)
        # Lesson: the test repeated the misleading name, so it checked the number but never questioned the label.
        self.assertGreaterEqual(float(g["mound_significance"]), 0.95)
        self.assertGreaterEqual(float(g["sink_significance"]), 0.95)
        # Deprecated aliases (SYSTEM_REVIEW H6) still carry the same values for older readers.
        self.assertEqual(g["p_mound"], g["mound_significance"])
        self.assertEqual(g["p_sink"], g["sink_significance"])
        self.assertEqual(g["mound_interval"], "2012-2015")
        self.assertEqual(g["sink_interval"], "2015-2018")
        self.assertEqual(g["type"], "burial_compact")
        self.assertGreater(float(g["mound_max_dz_m"]), 0.2)
        self.assertLess(float(g["sink_min_dz_m"]), -0.3)
        lat, lon = _latlon(*_xy(*GRAVE))
        self.assertAlmostEqual(float(g["centroid_lat"]), lat, delta=3e-5)
        self.assertAlmostEqual(float(g["centroid_lon"]), lon, delta=3e-5)

    def test_controls_not_reported(self):
        # Mound without later subsidence, subsidence without an earlier mound, and a real
        # signature where the 2018 survey's uncertainty is too large to see the sink.
        for spot in (MOUND_ONLY, SINK_ONLY, GRAVE_IN_FOG):
            self.assertEqual(_near(self.burials, *spot, tol_m=6), [], spot)
        self.assertEqual(len(self.burials), 1, self.burials)

    def test_culvert_linear_and_pit_compact(self):
        culv = _near(self.voids, 100.5, 49.5, tol_m=3)
        self.assertEqual(len(culv), 1, self.voids)
        c = culv[0]
        self.assertEqual(c["type"], "void_linear")
        self.assertAlmostEqual(float(c["length_m"]), 40, delta=4)
        self.assertLess(float(c["width_m"]), 4)
        self.assertAlmostEqual(float(c["depth_max_m"]), 0.45, delta=0.12)
        self.assertAlmostEqual(float(c["axis_azimuth_deg"]) % 180, 90, delta=3)
        pit = _near(self.voids, *PIT, tol_m=2)
        self.assertEqual(len(pit), 1, self.voids)
        self.assertEqual(pit[0]["type"], "void_compact")

    def test_vertical_bias_removed(self):
        got = [e["vertical_bias_removed_m"] for e in self.man["inputs"]["epochs"]]
        for g, b in zip(got, BIASES):
            self.assertAlmostEqual(g, b, delta=0.01)

    def test_every_output_labelled(self):
        self.assertEqual(self.man["label"], bs.LABEL)
        self.assertTrue(all(r["label"] == bs.LABEL for r in self.ledger))
        with open(os.path.join(self.out, "anomalies.geojson")) as f:
            gj = json.load(f)
        self.assertEqual(len(gj["features"]), len(self.ledger))
        self.assertTrue(all(ft["properties"]["label"] == bs.LABEL for ft in gj["features"]))
        with open(os.path.join(self.out, "anomalies.kml")) as f:
            kml = f.read()
        self.assertEqual(kml.count("<Placemark>"), len(self.ledger))
        self.assertGreaterEqual(kml.count(bs.LABEL), len(self.ledger) + 1)
        self.assertNotIn("M-TMAT", kml)
        for name in ("score.tif", "timeline_z.tif", "qvalue.tif"):
            with rasterio.open(os.path.join(self.out, name)) as d:
                self.assertEqual(d.tags()["LABEL"], bs.LABEL)

    def test_manifest_hashes_inputs_and_outputs(self):
        def sha(p):
            with open(p, "rb") as f:
                return hashlib.sha256(f.read()).hexdigest()

        eps = self.man["inputs"]["epochs"]
        self.assertEqual([e["year"] for e in eps], YEARS)
        for e, p in zip(eps, self.paths):
            self.assertEqual(e["sha256"], sha(p))
        self.assertEqual(eps[2]["sigma_raster_sha256"], sha(self.sig_path))
        self.assertIsNone(eps[0]["sigma_raster"])
        outs = self.man["outputs_sha256"]
        for name in ("ledger.csv", "anomalies.geojson", "anomalies.kml", "score.tif", "dod_2015_2018.tif"):
            self.assertEqual(outs[name], sha(os.path.join(self.out, name)), name)


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class SpatiallyVariableLoD(unittest.TestCase):
    def test_fog_patch_alone_hides_the_second_grave(self):
        """Guard for PlantedStack.test_controls_not_reported: the same arrays with a uniform
        sigma do show the grave inside the patch, so the patch, not the planting, hid it."""
        zs = [z - b for z, b in zip(make_stack(seed=1), BIASES)]
        uniform = [np.full((N, N), NOISE) for _ in YEARS]
        fog = [s.copy() for s in uniform]
        fog[2][FOG] = 0.8
        seen = _arrays_analyse(zs, uniform)["candidates"]
        hidden = _arrays_analyse(zs, fog)["candidates"]
        self.assertEqual(len(_near(seen, *GRAVE_IN_FOG)), 1, seen)
        self.assertEqual(_near(hidden, *GRAVE_IN_FOG, tol_m=6), [])
        self.assertEqual(len(_near(hidden, *GRAVE)), 1)


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class PureNoise(unittest.TestCase):
    def test_noise_only_stacks_rarely_produce_candidates(self):
        sig = [np.full((N, N), NOISE) for _ in YEARS]
        flagged = []
        for seed in range(10):
            zs = make_stack(seed=100 + seed, graves=(), controls=False, biases=[0.0] * 4)
            res = _arrays_analyse(zs, sig)
            if res["candidates"]:
                flagged.append(seed)
            self.assertGreater(res["tested_cells"], 10000)
        self.assertLessEqual(len(flagged), 1, f"seeds with FDR-significant candidates: {flagged}")

    def test_gistar_of_white_noise_is_standard_normal(self):
        rng = np.random.default_rng(5)
        x = rng.normal(3.0, 2.0, (200, 200))
        z = bs.gistar_stratified(x, np.zeros(x.shape, int), 1.0, 2.0)
        v = z[np.isfinite(z)]
        self.assertAlmostEqual(float(v.mean()), 0.0, delta=0.05)
        self.assertAlmostEqual(float(v.std()), 1.0, delta=0.05)


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class Voids(unittest.TestCase):
    def setUp(self):
        rr, cc = np.indices((100, 100), dtype=float)
        self.z = 50 + 0.03 * cc - 0.01 * rr
        self.z[40:42, 20:56] -= 0.4  # 36 m x 2 m culvert, north-south rows -> runs east-west
        self.z -= 0.5 * np.exp(-((rr - 75) ** 2 + (cc - 70) ** 2) / (2 * 1.5**2))

    def test_culvert_linear_pit_compact(self):
        bth, recs, masks = bs.detect_voids(self.z, 1.0, bs.params())
        self.assertEqual(len(recs), 2, recs)
        by = {r["type"]: r for r in recs}
        lin, comp = by["void_linear"], by["void_compact"]
        self.assertAlmostEqual(lin["length_m"], 36, delta=1)
        self.assertAlmostEqual(lin["width_m"], 2, delta=0.5)
        self.assertAlmostEqual(lin["depth_max_m"], 0.4, delta=0.02)
        self.assertAlmostEqual(lin["axis_azimuth_deg"], 90, delta=1)
        self.assertAlmostEqual(lin["row"], 40.5, delta=0.1)
        self.assertLess(comp["elongation"], 1.5)
        self.assertLess(comp["length_m"], 8)
        # The skirt of a gaussian pit reaches past the 4 m closing radius, so the top-hat
        # reads it a little shallow; it never reads deeper than the pit.
        self.assertGreater(comp["depth_max_m"], 0.35)
        self.assertLessEqual(comp["depth_max_m"], 0.5 + 1e-9)
        self.assertEqual(len(masks), 2)
        self.assertLess(float(np.nanmax(np.abs(bth[5:30, 60:95]))), 1e-9)  # a plane has no top-hat

    def test_component_shape_rectangle(self):
        rr, cc = np.nonzero(np.ones((3, 12), bool))
        s = bs.component_shape(rr, cc, 0.5)
        self.assertAlmostEqual(s["length_m"], 6.0, places=6)
        self.assertAlmostEqual(s["width_m"], 1.5, places=6)
        self.assertAlmostEqual(s["elongation"], 4.0, places=2)


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class Statistics(unittest.TestCase):
    def test_change_significance_is_one_minus_p_and_old_name_is_an_alias(self):
        # SYSTEM_REVIEW H6: the quantity is 1 - (two-sided p-value of "no change"), not P(real change).
        for k in (0.0, 0.5, 1.0, 1.96, 3.0):
            p_two_sided = 2 * (1 - 0.5 * (1 + math.erf(k / math.sqrt(2))))
            self.assertAlmostEqual(float(bs.change_significance(k * 0.1, 0.1)), 1 - p_two_sided, places=12)
        x = np.array([-0.3, 0.0, 0.05, np.nan])
        np.testing.assert_array_equal(bs.change_probability(x, 0.1), bs.change_significance(x, 0.1))
        a = bs.params(min_change_prob=0.9)
        self.assertEqual(a.min_change_significance, 0.9)
        self.assertFalse(hasattr(a, "min_change_prob"))
        with self.assertRaises(TypeError):
            bs.params(min_change_prob=0.9, min_change_significance=0.8)

    def test_change_probability(self):
        self.assertAlmostEqual(float(bs.change_probability(1.96 * 0.1, 0.1)), 0.95, places=3)
        self.assertEqual(float(bs.change_probability(0.0, 0.1)), 0.0)
        # 1 - 2(1 - Phi(k)), checked against the normal CDF at k = 1
        phi1 = 0.5 * (1 + math.erf(1 / math.sqrt(2)))
        self.assertAlmostEqual(float(bs.change_probability(-0.05, 0.05)), 1 - 2 * (1 - phi1), places=12)
        self.assertTrue(np.isnan(bs.change_probability(np.nan, 0.1)))
        sig = np.array([0.05, 0.5])
        p = bs.change_probability(np.array([0.2, 0.2]), sig)
        self.assertGreater(p[0], 0.99)
        self.assertLess(p[1], 0.35)

    def test_bh_qvalues_reference_and_monotone(self):
        p = np.array([0.01, 0.04, 0.03, 0.005, np.nan, 0.5])
        q = bs.bh_qvalues(p)
        np.testing.assert_allclose(q[[0, 1, 2, 3, 5]], [0.025, 0.05, 0.05, 0.025, 0.5])
        self.assertTrue(np.isnan(q[4]))
        rng = np.random.default_rng(3)
        p = np.concatenate([rng.uniform(size=5000), rng.uniform(0, 1e-4, 50)])
        q = bs.bh_qvalues(p)
        o = np.argsort(p)
        self.assertTrue(np.all(np.diff(q[o]) >= -1e-15))
        self.assertTrue(np.all(q >= p - 1e-15))
        self.assertTrue(np.all(q <= 1.0))

    def test_timeline_combos_respect_sink_window(self):
        pairs = [(2012, 2015), (2015, 2018), (2018, 2022)]
        self.assertEqual(bs.timeline_combos(pairs, (2, 10)), [(0, 1), (0, 2), (1, 2)])
        self.assertEqual(bs.timeline_combos(pairs, (8, 10)), [(0, 2)])
        self.assertEqual(bs.timeline_combos(pairs, (11, 20)), [])
        self.assertEqual(bs.timeline_combos([(2012, 2020)], (0, 50)), [])

    def test_gistar_border_and_small_strata_are_nan(self):
        rng = np.random.default_rng(1)
        x = rng.normal(size=(40, 40))
        strata = np.zeros((40, 40), int)
        strata[:, 35:] = 1  # 200 cells
        strata[0:3, 0:3] = 2  # 9 cells: below min_cells
        z = bs.gistar_stratified(x, strata, 1.0, 2.0, min_cells=30)
        self.assertTrue(np.isnan(z[:2]).all() and np.isnan(z[-2:]).all())
        self.assertTrue(np.isnan(z[:, :2]).all() and np.isnan(z[:, -2:]).all())
        self.assertTrue(np.isfinite(z[2:-2, 3:-2]).all())
        self.assertTrue(np.isfinite(z[10:30, 36:38]).all())
        x[20, 20] = np.nan
        z = bs.gistar_stratified(x, strata, 1.0, 2.0)
        self.assertTrue(np.isnan(z[18:23, 20]).all())


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class Censoring(unittest.TestCase):
    def test_sites_outside_the_record_are_censored_not_negative(self):
        pair_years = [(2012, 2015), (2015, 2018), (2018, 2022)]
        combos = bs.timeline_combos(pair_years, (2, 10))
        t = from_origin(X0, Y0, 1.0, 1.0)
        sites = [
            (*_xy(10, 10), 2010),  # before the first survey
            (*_xy(10, 20), 2012),  # in the first survey's year: no before-image
            (*_xy(10, 30), 2013),
            (*_xy(10, 40), 2017),
            (*_xy(10, 50), 2020),  # last interval: no later survey to show subsidence
            (X0 - 500, Y0, 2014),  # off the grid
        ]
        lab = bs.label_sites(sites, YEARS, combos, pair_years, t, (N, N))
        self.assertEqual([s["burial_year"] for s in lab["usable"]], [2013, 2017])
        self.assertEqual(
            [(s["burial_year"], s["reason"]) for s in lab["censored"]],
            [(2010, "buried_before_first_epoch"), (2012, "buried_before_first_epoch"),
             (2020, "no_observable_timeline")],
        )
        self.assertEqual(lab["outside_grid"], 1)
        self.assertEqual((lab["usable"][0]["row"], lab["usable"][0]["col"]), (10, 30))


def _write_sites(path, rows, header=("easting", "northing", "burial_year")):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


CAL_GRAVES = [(20, 20, 2014), (20, 100, 2013), (60, 60, 2016), (100, 20, 2014), (100, 100, 2016), (60, 100, 2014)]
CAL_CENSORED = [(60, 20, 2008), (100, 60, 2020)]


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class CalibrationRuns(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        d = cls.tmp.name
        zs = make_stack(seed=7, graves=[g for g in CAL_GRAVES] + [CAL_CENSORED[1]], controls=False)
        cls.argv = []
        for year, z in zip(YEARS, zs):
            p = os.path.join(d, f"e{year}.tif")
            _write(p, z)
            cls.argv += ["--epoch", p, str(year), str(NOISE)]
        cls.sites = os.path.join(d, "sites.csv")
        _write_sites(cls.sites, [(*_xy(r, c), by) for r, c, by in CAL_GRAVES + CAL_CENSORED])
        cls.common = ["--sites", cls.sites, "--block-m", "40", "--cv-folds", "3"]

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def _run(self, name):
        out = os.path.join(self.tmp.name, name)
        rc = _quiet(bs.main, self.argv + self.common + ["--out-dir", out])
        with open(os.path.join(out, "manifest.json")) as f:
            return rc, out, json.load(f)

    def test_missing_sklearn_skips_calibration_with_message(self):
        err = io.StringIO()
        missing = (None, "scikit-learn is not installed (pip install scikit-learn)")
        with mock.patch.object(bs, "_load_sklearn", return_value=missing), redirect_stderr(err):
            with redirect_stdout(io.StringIO()):
                out = os.path.join(self.tmp.name, "nosk")
                rc = bs.main(self.argv + self.common + ["--out-dir", out])
        self.assertEqual(rc, 0)
        self.assertIn("scikit-learn is not installed", err.getvalue())
        with open(os.path.join(out, "manifest.json")) as f:
            man = json.load(f)
        self.assertTrue(man["results"]["calibration"]["status"].startswith("skipped: scikit-learn"))
        self.assertEqual(man["label"], bs.LABEL)
        self.assertFalse(os.path.exists(os.path.join(out, "p_grave_calibrated.tif")))

    @unittest.skipUnless(HAS_SK, "scikit-learn not installed")
    def test_blocked_cv_calibration(self):
        rc, out, man = self._run("cal")
        self.assertEqual(rc, 0)
        cal = man["results"]["calibration"]
        self.assertEqual(cal["status"], "calibrated", cal)
        self.assertEqual(cal["n_sites_usable"], 6)
        self.assertEqual(cal["n_sites_censored"], 2)
        self.assertEqual(sorted(s["reason"] for s in cal["censored_sites"]),
                         ["buried_before_first_epoch", "no_observable_timeline"])
        self.assertGreater(cal["oof_auc"], 0.9)
        self.assertLess(cal["oof_brier_sample_prevalence"], 0.05)
        self.assertGreaterEqual(cal["best_site_level_threshold"]["recall"], 0.8)
        self.assertTrue(os.path.isfile(os.path.join(out, "operating_curve.csv")))
        self.assertIn("calibrated on 6 labelled sites", man["label"])
        with rasterio.open(os.path.join(out, "p_grave_calibrated.tif")) as d:
            p = d.read(1)
            self.assertIn("calibrated", d.tags()["LABEL"])
        self.assertTrue(np.nanmin(p) >= 0 and np.nanmax(p) <= 1)
        with open(os.path.join(out, "ledger.csv")) as f:
            burials = [r for r in csv.DictReader(f) if r["kind"] == "burial_timeline"]
        self.assertGreaterEqual(len(burials), 5)
        self.assertTrue(all(r["p_calibrated_max"] != "" for r in burials))


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class CliErrors(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.p = []
        for k, year in enumerate(YEARS[:3]):
            path = os.path.join(self.tmp.name, f"e{year}.tif")
            _write(path, np.full((40, 40), 10.0) + k * 0.01)
            self.p.append(path)
        self.out = os.path.join(self.tmp.name, "o")

    def tearDown(self):
        self.tmp.cleanup()

    def _rc(self, *argv):
        return _quiet(bs.main, list(argv) + ["--out-dir", self.out])

    def test_single_epoch_exit_2(self):
        self.assertEqual(self._rc("--epoch", self.p[0], "2012"), 2)

    def test_missing_file_exit_2(self):
        self.assertEqual(self._rc("--epoch", self.p[0], "2012", "--epoch", "/nonexistent.tif", "2015"), 2)

    def test_bad_year_and_duplicate_year_exit_2(self):
        self.assertEqual(self._rc("--epoch", self.p[0], "twenty", "--epoch", self.p[1], "2015"), 2)
        self.assertEqual(self._rc("--epoch", self.p[0], "2015", "--epoch", self.p[1], "2015"), 2)
        self.assertEqual(self._rc("--epoch", self.p[0], "2012", "-0.1", "--epoch", self.p[1], "2015"), 2)

    def test_non_overlapping_exit_2(self):
        far = os.path.join(self.tmp.name, "far.tif")
        _write(far, np.full((40, 40), 10.0), x0=X0 + 5000)
        self.assertEqual(self._rc("--epoch", self.p[0], "2012", "--epoch", far, "2015"), 2)

    def test_bad_sites_csv_exit_2(self):
        bad = os.path.join(self.tmp.name, "s.csv")
        _write_sites(bad, [(X0, Y0, 2014)], header=("x", "y", "year"))
        argv = ["--epoch", self.p[0], "2012", "--epoch", self.p[1], "2015", "--epoch", self.p[2], "2018"]
        self.assertEqual(self._rc(*argv, "--sites", bad), 2)
        _write_sites(bad, [(X0, Y0, "unknown")])
        self.assertEqual(self._rc(*argv, "--sites", bad), 2)

    def test_bad_argument_values_exit_2(self):
        with self.assertRaises(SystemExit) as cm, redirect_stderr(io.StringIO()):
            bs.main(["--epoch", self.p[0], "2012", "--epoch", self.p[1], "2015", "--alpha", "2", "--out-dir", self.out])
        self.assertEqual(cm.exception.code, 2)

    def test_two_epochs_write_change_products_and_exit_3(self):
        rc = self._rc("--epoch", self.p[0], "2012", "--epoch", self.p[1], "2015")
        self.assertEqual(rc, 3)
        with open(os.path.join(self.out, "manifest.json")) as f:
            man = json.load(f)
        self.assertEqual(man["status"], "timeline_not_evaluable")
        self.assertEqual(man["results"]["n_candidates"], 0)
        # for name in ("dod_2012_2015.tif", "pchange_2012_2015.tif", "ledger.csv", "anomalies.kml"):  # SYSTEM_REVIEW H6
        for name in ("dod_2012_2015.tif", "significance_2012_2015.tif", "pchange_2012_2015.tif", "ledger.csv",
                     "anomalies.kml"):
            self.assertIn(name, man["outputs_sha256"])
        # pchange_*.tif is the deprecated name of the same raster (SYSTEM_REVIEW H6).
        with rasterio.open(os.path.join(self.out, "significance_2012_2015.tif")) as d:
            new = d.read(1)
        with rasterio.open(os.path.join(self.out, "pchange_2012_2015.tif")) as d:
            old = d.read(1)
        np.testing.assert_array_equal(new, old)
        params = man["parameters"]
        self.assertEqual(params["min_change_prob"], params["min_change_significance"])
        self.assertIn("not a probability", params["change_significance_formula"])

    def test_deprecated_min_change_prob_flag_still_accepted(self):
        argv = ["--epoch", self.p[0], "2012", "--epoch", self.p[1], "2015", "--epoch", self.p[2], "2018"]
        self.assertEqual(self._rc(*argv, "--min-change-prob", "0.9"), 0)
        with open(os.path.join(self.out, "manifest.json")) as f:
            self.assertEqual(json.load(f)["parameters"]["min_change_significance"], 0.9)

    def test_halo_smaller_than_required_exit_2(self):
        argv = ["--epoch", self.p[0], "2012", "--epoch", self.p[1], "2015", "--epoch", self.p[2], "2018"]
        need = bs.required_halo(bs.params(), 1.0)
        with self.assertRaises(SystemExit) as cm, redirect_stderr(io.StringIO()):
            bs.main(argv + ["--tile-cells", "16", "--halo-cells", str(need - 1), "--out-dir", self.out])
        self.assertEqual(cm.exception.code, 2)
        with self.assertRaises(SystemExit), redirect_stderr(io.StringIO()):
            bs.main(argv + ["--tile-cells", "-1", "--out-dir", self.out])
        self.assertEqual(self._rc(*argv, "--tile-cells", "16", "--halo-cells", str(need)), 0)


def _assert_same_map(tc, a, b, rtol=1e-9, atol=1e-9):
    tc.assertEqual(a.shape, b.shape)
    np.testing.assert_array_equal(np.isnan(a), np.isnan(b))
    ok = np.isfinite(a)
    np.testing.assert_allclose(a[ok], b[ok], rtol=rtol, atol=atol)


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class Tiling(unittest.TestCase):
    """SYSTEM_REVIEW H6: overlapping tiles give the whole-grid answer with bounded working memory."""

    def setUp(self):
        self.zs = [z - b for z, b in zip(make_stack(seed=1), BIASES)]
        self.sig = [np.full((N, N), NOISE) for _ in YEARS]
        self.sig[2][FOG] = 0.8

    def test_tiled_matches_untiled_on_a_small_stack(self):
        whole = _arrays_analyse(self.zs, self.sig, bs.params(tile_cells=0))
        self.assertEqual(whole["tiling"]["n_tiles"], 1)
        self.assertEqual(len(_near(whole["candidates"], *GRAVE)), 1)
        need = bs.required_halo(bs.params(), 1.0)
        # Tile edges at 37 and 40 cells cut through the planted grave (row 35, col 85) and the fog patch.
        for tile, halo in ((37, None), (40, need), (25, need + 5)):
            with self.subTest(tile=tile, halo=halo):
                tiled = _arrays_analyse(self.zs, self.sig, bs.params(tile_cells=tile, halo_cells=halo))
                self.assertGreater(tiled["tiling"]["n_tiles"], 1)
                self.assertEqual(tiled["candidates"], whole["candidates"])
                self.assertEqual(tiled["voids"], whole["voids"])
                self.assertEqual(tiled["tested_cells"], whole["tested_cells"])
                for k in ("score", "qvalue", "mound_significance", "sink_significance", "p_mound"):
                    _assert_same_map(self, tiled["_arrays"][k], whole["_arrays"][k])
                # timeline_z = -ndtri(p) magnifies last-bit differences in tiny p-values.
                _assert_same_map(self, tiled["_arrays"]["timeline_z"], whole["_arrays"]["timeline_z"], rtol=1e-6)
                for g_t, g_w in zip(tiled["_timeline"]["gi_z"], whole["_timeline"]["gi_z"]):
                    _assert_same_map(self, g_t, g_w)
                np.testing.assert_array_equal(tiled["_timeline"]["combo"], whole["_timeline"]["combo"])

    def test_halo_below_neighbourhood_plus_bandwidth_refused(self):
        a = bs.params(neighbourhood_m=2.0, gi_bandwidth_m=3.0)
        self.assertGreaterEqual(bs.required_halo(a, 1.0), 5)
        pairs = bs.pair_changes(self.zs, self.sig, YEARS)
        combos = bs.timeline_combos([p["years"] for p in pairs], a.sink_window_years)
        strata = bs.slope_strata(bs.slope_degrees(self.zs[-1], 1.0), a.slope_edges)
        with self.assertRaises(bs.InputError):
            bs.burial_timeline_tiled(pairs, combos, strata, 1.0, a, 30, halo=4)

    def test_cli_tiled_and_untiled_ledgers_identical(self):
        with tempfile.TemporaryDirectory() as d:
            argv = []
            for year, z in zip(YEARS, make_stack(seed=1)):
                path = os.path.join(d, f"e{year}.tif")
                _write(path, z)
                argv += ["--epoch", path, str(year), str(NOISE)]
            ledgers = {}
            for tile in ("0", "33"):
                out = os.path.join(d, f"t{tile}")
                self.assertEqual(_quiet(bs.main, argv + ["--tile-cells", tile, "--out-dir", out]), 0)
                with open(os.path.join(out, "ledger.csv")) as f:
                    ledgers[tile] = f.read()
                with open(os.path.join(out, "manifest.json")) as f:
                    man = json.load(f)
                self.assertEqual(man["results"]["tiling"]["n_tiles"], 1 if tile == "0" else 16)
            self.assertEqual(ledgers["0"], ledgers["33"])
            self.assertIn("mound_significance", ledgers["0"].splitlines()[0])

    def test_working_memory_bounded_by_tile_not_grid(self):
        """Peak memory above the returned layers stays flat as the grid grows 4x when tiled;
        the whole-grid computation grows with the grid times the number of combinations."""
        years = [2000 + 2 * k for k in range(7)]  # 6 pairs, 15 (mound, sink) combinations
        a = bs.params(sink_window_years=(0.0, 100.0))

        def workspace(n, tiled):
            rng = np.random.default_rng(0)
            rr, cc = np.indices((n, n), dtype=float)
            zs = [100 + 0.002 * cc + 0.01 * rr + rng.normal(0, 0.03, (n, n)) for _ in years]
            pairs = bs.pair_changes(zs, [np.full((n, n), 0.03) for _ in years], years)
            combos = bs.timeline_combos([p["years"] for p in pairs], a.sink_window_years)
            self.assertEqual(len(combos), 15)
            strata = bs.slope_strata(bs.slope_degrees(zs[-1], 1.0), a.slope_edges)
            tracemalloc.start()
            try:
                if tiled:
                    tl = bs.burial_timeline_tiled(pairs, combos, strata, 1.0, a, 32)
                else:
                    tl = bs.burial_timeline(pairs, combos, strata, 1.0, a)
                retained, peak = tracemalloc.get_traced_memory()
            finally:
                tracemalloc.stop()
            self.assertEqual(tl["score"].shape, (n, n))
            return peak - retained  # working memory beyond the full-grid result layers

        small_t, big_t = workspace(160, True), workspace(320, True)
        small_u, big_u = workspace(160, False), workspace(320, False)
        self.assertGreater(big_u, 3.0 * small_u)  # the measurement does see grid-sized working arrays
        self.assertLess(big_t, 1.5 * small_t + 256 * 1024, (small_t, big_t))
        window = (32 + 2 * bs.required_halo(a, 1.0)) ** 2 * 8  # bytes per float64 window layer
        self.assertLess(big_t, 400 * window, (big_t, window))  # a few layers per combination, of window size
        self.assertLess(big_t, big_u / 5, (big_t, big_u))


if __name__ == "__main__":
    unittest.main()
