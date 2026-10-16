"""Tests for the Blue Ocean SAR person finders.

Run: python3 -m unittest discover -s docs/blue-ocean-sar -p "test_*.py"
v1 needs numpy; v3 also needs scipy and rasterio (skipped when absent).
"""

import importlib.util
import os
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HAS_NP = importlib.util.find_spec("numpy") is not None
HAS_V3 = HAS_NP and all(importlib.util.find_spec(m) is not None for m in ("scipy", "rasterio"))

from provenance import LABEL_MEASURED, LABEL_SYNTHETIC, DataSource, MissingSourceError  # noqa: E402

import provenance  # noqa: E402

SYN = [DataSource("unit-test scene", "synthetic")]
_STRICT_BEFORE = provenance.STRICT


def setUpModule():
    # Refusal tests in this file exercise strict mode.
    provenance.STRICT = True


def tearDownModule():
    provenance.STRICT = _STRICT_BEFORE


if HAS_NP:
    import numpy as np

    import sar_person_finder as v1


def _scene():
    lat_vec = np.linspace(49.36, 49.41, 50)
    lon_vec = np.linspace(-122.97, -122.92, 50)
    glon, glat = np.meshgrid(lon_vec, lat_vec)
    rng = np.random.default_rng(42)
    inten = rng.gamma(2.0, 1.0, (50, 50))
    inten[22, 28] += 85.0
    inten[30, 20] += 60.0
    return inten, glat, glon


@unittest.skipUnless(HAS_NP, "numpy not installed")
class FinderV1(unittest.TestCase):
    def test_vectorised_lee_matches_original_loop(self):
        img = 10 * np.log10(np.random.default_rng(1).gamma(2.0, 1.0, (23, 31)))
        size = 5
        padded = np.pad(img, size // 2, mode="reflect")
        mean = np.zeros_like(img)
        var = np.zeros_like(img)
        for i in range(img.shape[0]):
            for j in range(img.shape[1]):
                patch = padded[i:i + size, j:j + size]
                mean[i, j] = patch.mean()
                var[i, j] = patch.var()
        expected = mean + var / (var + img.var() + 1e-6) * (img - mean)
        got = v1.SatelliteSARAnomalyDetector(size).lee_despeckle_filter(img)
        np.testing.assert_allclose(got, expected, rtol=1e-10, atol=1e-10)

    def test_targets_found_and_not_duplicated(self):
        inten, glat, glon = _scene()
        res = v1.BlueOceanSARPersonFinder(49.385, -122.945).process_sar_scene(
            inten, glat, glon, 6.0, top_n=5, sources=SYN)
        cells = [tuple(np.argwhere((glat == r["latitude"]) & (glon == r["longitude"]))[0]) for r in res]
        self.assertEqual(cells[0], (22, 28))
        self.assertEqual(cells[1], (30, 20))
        for i, a in enumerate(cells):
            for b in cells[i + 1:]:
                self.assertGreater(max(abs(a[0] - b[0]), abs(a[1] - b[1])), 2, "neighbouring pixels reported twice")

    def test_separation_zero_restores_original_behaviour(self):
        # What was wrong: this passed only because the old detector ranked noise pixels next to a one-pixel
        # target. With a real threshold those are not detections, so the scene now plants a 3x3 object.
        # Lesson: a test can pin a bug as expected behaviour (C1).
        # inten, glat, glon = _scene()
        inten, glat, glon = _scene()
        inten[10:13, 10:13] += 60.0  # 3x3 extended object
        res = v1.BlueOceanSARPersonFinder(49.385, -122.945).process_sar_scene(
            inten, glat, glon, 6.0, top_n=10, min_separation_px=-1, sources=SYN)
        cells = [tuple(np.argwhere((glat == r["latitude"]) & (glon == r["longitude"]))[0]) for r in res]
        near = [(a, b) for i, a in enumerate(cells) for b in cells[i + 1:]
                if max(abs(int(a[0]) - int(b[0])), abs(int(a[1]) - int(b[1]))) <= 2]
        self.assertTrue(near, "with suppression off, neighbouring pixels of one object reappear")
        res = v1.BlueOceanSARPersonFinder(49.385, -122.945).process_sar_scene(
            inten, glat, glon, 6.0, top_n=10, sources=SYN)
        cells = [tuple(np.argwhere((glat == r["latitude"]) & (glon == r["longitude"]))[0]) for r in res]
        self.assertEqual(sum(1 for c in cells if 10 <= c[0] <= 12 and 10 <= c[1] <= 12), 1)

    # --- SYSTEM_REVIEW C1: CA-CFAR with a stated false-alarm rate -------------------

    def _grid(self, n=100):
        lat = np.linspace(49.36, 49.41, n)
        lon = np.linspace(-122.97, -122.92, n)
        glon, glat = np.meshgrid(lon, lat)
        return glat, glon

    def test_pure_noise_yields_no_targets_in_most_seeds(self):
        glat, glon = self._grid()
        finder = v1.BlueOceanSARPersonFinder(49.385, -122.945)
        finder.sar_detector.pfa = 1e-6
        for name, draw in (("single-look", lambda g: g.exponential(1.0, (100, 100))),
                           ("two-look", lambda g: g.gamma(2.0, 0.5, (100, 100)))):
            empty = 0
            for seed in range(20):
                res = finder.process_sar_scene(draw(np.random.default_rng(seed)), glat, glon, 6.0,
                                               top_n=50, sources=SYN)
                empty += res == []
            self.assertGreaterEqual(empty, 18, f"{name}: noise produced targets in {20 - empty}/20 scenes")

    def test_planted_bright_target_is_found(self):
        glat, glon = self._grid()
        inten = np.random.default_rng(7).exponential(1.0, (100, 100))
        inten[40, 60] += 60.0
        res = v1.BlueOceanSARPersonFinder(49.385, -122.945).process_sar_scene(inten, glat, glon, 6.0, sources=SYN)
        self.assertTrue(res)
        self.assertEqual((res[0]["latitude"], res[0]["longitude"]), (glat[40, 60], glon[40, 60]))
        self.assertGreater(res[0]["cfar_ratio"], 1.0)
        self.assertEqual(res[0]["cfar_pfa"], 1e-6)

    def test_cfar_alpha_and_empirical_false_alarm_rate(self):
        self.assertAlmostEqual(v1.cfar_alpha(144, 1e-6), 144 * (1e-6 ** (-1 / 144) - 1))
        det, ratio, thr, n = v1.ca_cfar(np.random.default_rng(1).exponential(1.0, (400, 400)), 2, 4, 1e-2)
        self.assertEqual(n, 13 * 13 - 5 * 5)
        self.assertLess(abs(det.mean() - 1e-2) / 1e-2, 0.2)
        np.testing.assert_array_equal(det, ratio > 1.0)
        with self.assertRaises(ValueError):
            v1.ca_cfar(10 * np.log10(np.ones((20, 20)) * 0.5))  # dB input (negative) refused

    def test_lee_filter_on_intensity_uses_looks(self):
        noise = np.random.default_rng(2).exponential(1.0, (120, 120))
        flat = v1.lee_filter_intensity(np.full((20, 20), 3.0), 5, 1.0)
        np.testing.assert_allclose(flat, 3.0)
        self.assertLess(v1.lee_filter_intensity(noise, 5, 1.0).var(), 0.5 * noise.var())
        # Assuming many looks means little speckle, so the filter leaves more alone.
        self.assertGreater(v1.lee_filter_intensity(noise, 5, 50.0).var(), v1.lee_filter_intensity(noise, 5, 1.0).var())
        noise[60, 60] = 500.0
        out = v1.lee_filter_intensity(noise, 5, 1.0)
        self.assertGreater(out[60, 60], 100 * np.median(out))  # point scatterer kept well above clutter

    def test_output_is_uncalibrated_unless_constant_given_and_key_renamed(self):
        inten, glat, glon = _scene()
        finder = v1.BlueOceanSARPersonFinder(49.385, -122.945)
        res = finder.process_sar_scene(inten, glat, glon, 6.0, sources=SYN)
        self.assertEqual(res[0]["backscatter_units"], "uncalibrated DN^2")
        self.assertIn("fused_score", res[0])
        self.assertNotIn("fused_confidence", res[0])
        finder.sar_detector.calibration_constant = 100.0
        cal = finder.process_sar_scene(inten, glat, glon, 6.0, sources=SYN)
        self.assertTrue(cal[0]["backscatter_units"].startswith("sigma0"))
        self.assertAlmostEqual(cal[0]["sar_backscatter_db"], res[0]["sar_backscatter_db"] - 20.0)

    def test_no_sources_raises_even_when_strict_is_off(self):
        # SYSTEM_REVIEW H1: the docstring promised a refusal that default mode skipped.
        inten, glat, glon = _scene()
        finder = v1.BlueOceanSARPersonFinder(49.385, -122.945)
        provenance.STRICT = False
        try:
            with self.assertRaises(MissingSourceError):
                finder.process_sar_scene(inten, glat, glon, 6.0)
            res = finder.process_sar_scene(inten, glat, glon, 6.0, allow_unverified=True)
            self.assertEqual(res[0]["provenance"]["status"], provenance.LABEL_UNSOURCED)
        finally:
            provenance.STRICT = True

    def test_demo_writes_geojson(self):
        import json

        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "c.geojson")
            v1.run_demo(out)
            with open(out) as f:
                data = json.load(f)
            self.assertEqual(data["type"], "FeatureCollection")
            for feat in data["features"]:
                self.assertEqual(feat["properties"]["provenance"]["status"], LABEL_SYNTHETIC)
                self.assertFalse(feat["properties"]["provenance"]["ground_verified"])

    def test_refuses_without_source(self):
        inten, glat, glon = _scene()
        finder = v1.BlueOceanSARPersonFinder(49.385, -122.945)
        with self.assertRaises(MissingSourceError):
            finder.process_sar_scene(inten, glat, glon, 6.0)

    def test_measured_source_needs_reference(self):
        inten, glat, glon = _scene()
        finder = v1.BlueOceanSARPersonFinder(49.385, -122.945)
        with self.assertRaises(MissingSourceError):
            finder.process_sar_scene(inten, glat, glon, 6.0, sources=[DataSource("Sentinel-1 scene", "measured")])
        res = finder.process_sar_scene(
            inten, glat, glon, 6.0,
            sources=[DataSource("Sentinel-1 GRD scene", "measured", "S1A_IW_GRDH_1SDV_20180218_EXAMPLE")])
        self.assertEqual(res[0]["provenance"]["status"], LABEL_MEASURED)


@unittest.skipUnless(HAS_V3, "numpy/scipy/rasterio not installed")
class FinderV3(unittest.TestCase):
    def setUp(self):
        import sar_person_finder_v3 as v3

        self.v3 = v3
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = v3.MultiBandSAREngine()
        self.raster = os.path.join(self.tmp.name, "r.tif")
        self.engine.generate_multiband_raster(self.raster)

    def tearDown(self):
        self.tmp.cleanup()

    def test_ranked_targets_are_separated(self):
        import rasterio

        targets = self.engine.process_multiband_sar(self.raster, sources=SYN)
        with rasterio.open(self.raster) as src:
            cells = [src.index(t["longitude"], t["latitude"]) for t in targets]
        self.assertEqual(tuple(cells[0]), (52, 49))
        for i, a in enumerate(cells):
            for b in cells[i + 1:]:
                self.assertGreater(max(abs(a[0] - b[0]), abs(a[1] - b[1])), 2)

    def test_cot_uses_current_time_and_one_file_per_target(self):
        targets = self.engine.process_multiband_sar(self.raster, sources=SYN)[:3]
        now = datetime(2027, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
        paths = self.engine.export_cot_files(targets, os.path.join(self.tmp.name, "cot"), now=now)
        self.assertEqual(len(paths), 3)
        ev = ET.parse(paths[0]).getroot()
        self.assertEqual(ev.tag, "event")
        self.assertEqual(ev.get("time"), "2027-01-02T03:04:05Z")
        self.assertEqual(ev.get("stale"), "2027-01-03T03:04:05Z")

    def test_refuses_without_source(self):
        with self.assertRaises(MissingSourceError):
            self.engine.process_multiband_sar(self.raster)

    def test_exports_refuse_targets_without_provenance(self):
        targets = self.engine.process_multiband_sar(self.raster, sources=SYN)[:2]
        stripped = [{k: v for k, v in t.items() if k != "provenance"} for t in targets]
        with self.assertRaises(MissingSourceError):
            self.engine.export_geojson(stripped, os.path.join(self.tmp.name, "x.geojson"))
        with self.assertRaises(MissingSourceError):
            self.engine.export_cot_xml(stripped, os.path.join(self.tmp.name, "x.xml"))

    def test_cot_marker_says_synthetic(self):
        targets = self.engine.process_multiband_sar(self.raster, sources=SYN)[:1]
        paths = self.engine.export_cot_files(targets, os.path.join(self.tmp.name, "cot2"))
        ev = ET.parse(paths[0]).getroot()
        self.assertTrue(ev.find("detail/contact").get("callsign").startswith("SYNTHETIC "))
        self.assertNotIn("%", ev.find("detail/contact").get("callsign"))
        self.assertIn(LABEL_SYNTHETIC, ev.find("detail/remarks").text)

    def test_intensity_input_mode(self):
        amp = self.engine.process_multiband_sar(self.raster, sources=SYN)
        self.engine.input_is_amplitude = False
        inten = self.engine.process_multiband_sar(self.raster, sources=SYN)
        self.assertNotEqual(amp[0]["band_backscatter_db"], inten[0]["band_backscatter_db"])

    def _write(self, name, bands, height, width):
        import rasterio
        from rasterio.transform import from_origin

        path = os.path.join(self.tmp.name, name)
        data = np.random.default_rng(3).gamma(2.0, 5.0, (bands, height, width)).astype("float32")
        data[:, height // 2, width // 3] += 400.0
        with rasterio.open(path, "w", driver="GTiff", height=height, width=width, count=bands, dtype="float32",
                           crs="EPSG:4326", transform=from_origin(-122.95, 49.39, 0.0001, 0.0001)) as dst:
            dst.write(data)
        return path

    def test_non_square_raster_of_other_size_is_processed(self):
        path = self._write("wide.tif", 6, 80, 130)
        targets = self.engine.process_multiband_sar(path, sources=SYN)
        self.assertTrue(targets)
        import rasterio

        with rasterio.open(path) as src:
            self.assertEqual(tuple(src.index(targets[0]["longitude"], targets[0]["latitude"])), (40, 43))

    def _reordered_copy(self, name, perm, descriptions):
        import rasterio

        path = os.path.join(self.tmp.name, name)
        with rasterio.open(self.raster) as src:
            data, profile = src.read(), src.profile
        with rasterio.open(path, "w", **profile) as dst:
            for out_idx, in_idx in enumerate(perm, start=1):
                dst.write(data[in_idx], out_idx)
                if descriptions is not None:
                    dst.set_band_description(out_idx, descriptions[in_idx])
        return path

    def test_reordered_bands_read_by_description(self):
        names = list(self.engine.BAND_CONFIGS)
        ref = self.engine.process_multiband_sar(self.raster, sources=SYN)
        self.assertEqual(ref[0]["band_order"], "from_band_descriptions")
        shuffled = self._reordered_copy("rev.tif", [5, 4, 3, 2, 1, 0], names)
        got = self.engine.process_multiband_sar(shuffled, sources=SYN)
        self.assertEqual([t["band_backscatter_db"] for t in got], [t["band_backscatter_db"] for t in ref])

    def test_bad_band_descriptions_rejected_and_unlabelled_order_flagged(self):
        names = list(self.engine.BAND_CONFIGS)
        dup = self._reordered_copy("dup.tif", range(6), ["Band_A"] + names[:5])
        with self.assertRaises(ValueError):
            self.engine.process_multiband_sar(dup, sources=SYN)
        bare = self._reordered_copy("bare.tif", range(6), None)
        targets = self.engine.process_multiband_sar(bare, sources=SYN)
        self.assertEqual(targets[0]["band_order"], "assumed_file_order")
        out = os.path.join(self.tmp.name, "bare.geojson")
        self.engine.export_geojson(targets, out)
        import json

        with open(out) as f:
            self.assertEqual(json.load(f)["features"][0]["properties"]["band_order"], "assumed_file_order")
        # ATAK users see only the CoT remarks, so the note has to be there too.
        paths = self.engine.export_cot_files(targets[:1], os.path.join(self.tmp.name, "bare_cot"))
        self.assertIn("Band order: assumed_file_order", ET.parse(paths[0]).getroot().find("detail/remarks").text)

    # --- SYSTEM_REVIEW C2: distances and spread ---------------------------------

    def test_one_km_east_at_49n_is_one_km(self):
        # 1 km east on the WGS84 ellipsoid: dlon = 1 km / (N cos(lat)), N the prime-vertical radius.
        a, e2, lat = 6378137.0, 6.69437999014e-3, 49.0
        n_m = a / np.sqrt(1 - e2 * np.sin(np.radians(lat)) ** 2)
        dlon = np.degrees(1000.0 / (n_m * np.cos(np.radians(lat))))
        d = float(self.v3.haversine_km(lat, -123.0, lat, -123.0 + dlon))
        self.assertLess(abs(d - 1.0), 0.01, d)
        self.assertGreater(dlon * 111.0, 1.4)  # what the old formula said

    def test_motion_spread_follows_elapsed_hours(self):
        self.assertAlmostEqual(self.engine.motion_sigma_km(6.0), 1.5)
        self.assertAlmostEqual(self.engine.motion_sigma_km(24.0), 6.0)
        self.assertAlmostEqual(self.engine.motion_sigma_km(0.0), self.engine.min_spread_km)
        with self.assertRaises(ValueError):
            self.engine.motion_sigma_km(-1.0)
        far = self._write("far.tif", 6, 100, 100)  # target ~0.6 km from the LKP
        short = self.engine.process_multiband_sar(far, sources=SYN, elapsed_hours=0.5)
        long_ = self.engine.process_multiband_sar(far, sources=SYN, elapsed_hours=48.0)
        self.assertEqual(short[0]["motion_sigma_km"], 0.125)
        self.assertEqual(long_[0]["motion_sigma_km"], 12.0)
        self.assertLess(short[0]["motion_pdf_weight"], long_[0]["motion_pdf_weight"])

    # --- SYSTEM_REVIEW C1 in the 6-band engine ------------------------------------

    def test_pure_noise_raster_gives_no_targets(self):
        import rasterio
        from rasterio.transform import from_origin

        engine = self.v3.MultiBandSAREngine(input_is_amplitude=False)
        empty = 0
        for seed in range(5):
            path = os.path.join(self.tmp.name, f"noise{seed}.tif")
            data = np.random.default_rng(seed).exponential(1.0, (6, 100, 100)).astype("float32")
            with rasterio.open(path, "w", driver="GTiff", height=100, width=100, count=6, dtype="float32",
                               crs="EPSG:4326", transform=from_origin(-122.95, 49.39, 0.0001, 0.0001)) as dst:
                dst.write(data)
            empty += engine.process_multiband_sar(path, sources=SYN) == []
        self.assertGreaterEqual(empty, 4)

    def test_targets_carry_score_units_and_detections(self):
        t = self.engine.process_multiband_sar(self.raster, sources=SYN)[0]
        self.assertNotIn("fused_confidence", t)
        self.assertEqual(t["detecting_bands"], 6)
        self.assertEqual(set(t["backscatter_units"].values()), {"uncalibrated DN^2"})
        out = os.path.join(self.tmp.name, "u.geojson")
        self.engine.export_geojson([t], out)
        import json

        with open(out) as f:
            props = json.load(f)["features"][0]["properties"]
        self.assertEqual(props["fused_score"], t["fused_score"])
        self.assertNotIn("confidence", props)
        self.engine.calibration_constant = {"Band_F": 4.0}
        cal = self.engine.process_multiband_sar(self.raster, sources=SYN)[0]
        self.assertTrue(cal["backscatter_units"]["Band_F"].startswith("sigma0"))
        self.assertEqual(cal["backscatter_units"]["Band_A"], "uncalibrated DN^2")

    # --- SYSTEM_REVIEW H1 ---------------------------------------------------------

    def test_no_sources_raises_and_exports_refuse_even_when_strict_is_off(self):
        provenance.STRICT = False
        try:
            with self.assertRaises(MissingSourceError):
                self.engine.process_multiband_sar(self.raster)
            unsourced = self.engine.process_multiband_sar(self.raster, allow_unverified=True)[:1]
            with self.assertRaises(MissingSourceError):
                self.engine.export_geojson(unsourced, os.path.join(self.tmp.name, "n.geojson"))
            with self.assertRaises(MissingSourceError):
                self.engine.export_cot_files(unsourced, os.path.join(self.tmp.name, "ncot"))
            self.engine.export_geojson(unsourced, os.path.join(self.tmp.name, "n.geojson"), allow_unverified=True)
        finally:
            provenance.STRICT = True

    # --- SYSTEM_REVIEW H3 ---------------------------------------------------------

    def test_cot_uid_scene_and_run_and_unknown_height(self):
        import hashlib

        with open(self.raster, "rb") as f:
            sha8 = hashlib.sha256(f.read()).hexdigest()[:8]
        eng_a = self.v3.MultiBandSAREngine(run_id="runA")
        eng_b = self.v3.MultiBandSAREngine(run_id="runB", geolocation_error_m=10.0)
        ev_a = ET.parse(eng_a.export_cot_files(eng_a.process_multiband_sar(self.raster, sources=SYN)[:1],
                                               os.path.join(self.tmp.name, "ca"))[0]).getroot()
        tb = eng_b.process_multiband_sar(self.raster, sources=SYN)[:1]
        ev_b = ET.parse(eng_b.export_cot_files(tb, os.path.join(self.tmp.name, "cb"))[0]).getroot()
        self.assertEqual(ev_a.get("uid"), f"SAR-{sha8}-runA-R1")
        self.assertNotEqual(ev_a.get("uid"), ev_b.get("uid"))
        pa, pb = ev_a.find("point"), ev_b.find("point")
        for pt in (pa, pb):
            self.assertEqual(float(pt.get("hae")), 9999999.0)
            self.assertEqual(float(pt.get("le")), 9999999.0)
        self.assertEqual(float(pa.get("ce")), 9999999.0)  # no stated geolocation error
        px = tb[0]["pixel_size_m"]
        self.assertAlmostEqual(px, 11.1, delta=0.2)  # 0.0001 deg of latitude
        self.assertAlmostEqual(float(pb.get("ce")), round(np.hypot(10.0, px / np.sqrt(2.0)), 1))
        # Two runs without a run_id still get different UIDs.
        t1 = self.engine.process_multiband_sar(self.raster, sources=SYN)[0]
        t2 = self.engine.process_multiband_sar(self.raster, sources=SYN)[0]
        self.assertNotEqual(self.engine.cot_uid(t1, "x"), self.engine.cot_uid(t2, "x"))

    def test_wrong_band_count_rejected(self):
        for bands in (4, 7):
            with self.assertRaises(ValueError):
                self.engine.process_multiband_sar(self._write(f"b{bands}.tif", bands, 100, 100), sources=SYN)


if __name__ == "__main__":
    unittest.main()
