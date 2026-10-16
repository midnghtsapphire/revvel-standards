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
        inten, glat, glon = _scene()
        res = v1.BlueOceanSARPersonFinder(49.385, -122.945).process_sar_scene(
            inten, glat, glon, 6.0, top_n=10, min_separation_px=-1, sources=SYN)
        cells = [tuple(np.argwhere((glat == r["latitude"]) & (glon == r["longitude"]))[0]) for r in res]
        near = [(a, b) for i, a in enumerate(cells) for b in cells[i + 1:]
                if max(abs(int(a[0]) - int(b[0])), abs(int(a[1]) - int(b[1]))) <= 2]
        self.assertTrue(near, "with suppression off, neighbouring pixels of one object reappear")

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

    def test_wrong_band_count_rejected(self):
        for bands in (4, 7):
            with self.assertRaises(ValueError):
                self.engine.process_multiband_sar(self._write(f"b{bands}.tif", bands, 100, 100), sources=SYN)


if __name__ == "__main__":
    unittest.main()
