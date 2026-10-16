"""Tests for provenance.py and its use in the master script (stdlib only)."""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from master_sensor_wave_search_script_v2 import MultiBandWaveEngineV2  # noqa: E402
from provenance import (  # noqa: E402
    LABEL_ESTIMATE,
    LABEL_MEASURED,
    LABEL_SYNTHETIC,
    DataSource,
    MissingSourceError,
    provenance_block,
    require_provenance,
)
import provenance  # noqa: E402

_STRICT_BEFORE = provenance.STRICT


def setUpModule():
    # The refusal tests below cover strict mode (provenance.STRICT = True).
    provenance.STRICT = True


def tearDownModule():
    provenance.STRICT = _STRICT_BEFORE


class DefaultModeTests(unittest.TestCase):
    """Default (STRICT = False): run without sources, but label the output."""

    def setUp(self):
        provenance.STRICT = False

    def tearDown(self):
        provenance.STRICT = True

    def test_no_sources_runs_and_is_labelled(self):
        for empty in (None, [], ()):
            block = provenance_block(empty)
            self.assertEqual(block["status"], provenance.LABEL_UNSOURCED)
            self.assertFalse(block["ground_verified"])
            self.assertEqual(block["sources"], [])

    def test_measured_without_reference_allowed(self):
        block = provenance_block([DataSource("Sentinel-1 scene", "measured")])
        self.assertEqual(block["status"], LABEL_MEASURED)

    def test_exporter_accepts_record_without_provenance(self):
        self.assertEqual(require_provenance({"latitude": 1.0})["status"], provenance.LABEL_UNSOURCED)

    def test_master_script_runs_without_sources(self):
        out = MultiBandWaveEngineV2().evaluate_multi_band_node(0, 0, 1.0, 3.1)
        # Defaults filled in but no source named: unsourced, inputs still listed.
        self.assertEqual(out["provenance"]["status"], provenance.LABEL_UNSOURCED)
        self.assertIn("sif_stress", out["assumed_inputs"])

    def test_malformed_provenance_replaced_with_unsourced_block(self):
        good = provenance_block([DataSource("t", "synthetic")])
        bad_blocks = [
            {"status": "TOTALLY VERIFIED"},
            {"status": LABEL_SYNTHETIC},
            dict(good, status="made up"),
            dict(good, ground_verified="yes"),
            dict(good, sources="a file"),
            dict(good, sources=[{"kind": "synthetic"}]),
        ]
        for bad in bad_blocks:
            out = require_provenance({"provenance": bad})
            self.assertEqual(out["status"], provenance.LABEL_UNSOURCED, bad)
            self.assertEqual(out["sources"], [])
            self.assertIs(out["ground_verified"], False)
        self.assertIs(require_provenance({"provenance": good}), good)

    def test_unknown_kind_still_rejected(self):
        with self.assertRaises(MissingSourceError):
            provenance_block([DataSource("x", "vibes")])


class ProvenanceTests(unittest.TestCase):
    def test_no_sources_refused(self):
        for empty in (None, [], ()):
            with self.assertRaises(MissingSourceError):
                provenance_block(empty)

    def test_measured_and_public_record_need_reference(self):
        for kind in ("measured", "public_record"):
            with self.assertRaises(MissingSourceError):
                provenance_block([DataSource("something", kind)])
            provenance_block([DataSource("something", kind, "https://example.org/x")])

    def test_unknown_kind_and_blank_description(self):
        with self.assertRaises(MissingSourceError):
            provenance_block([DataSource("x", "vibes")])
        with self.assertRaises(MissingSourceError):
            provenance_block([DataSource("  ", "estimate")])

    def test_label_takes_weakest_source(self):
        m = DataSource("LiDAR tile", "measured", "USGS 3DEP tile ID")
        e = DataSource("soil density", "estimate")
        s = DataSource("test grid", "synthetic")
        self.assertEqual(provenance_block([m])["status"], LABEL_MEASURED)
        self.assertEqual(provenance_block([m, e])["status"], LABEL_ESTIMATE)
        self.assertEqual(provenance_block([m, e, s])["status"], LABEL_SYNTHETIC)
        self.assertFalse(provenance_block([m])["ground_verified"])

    def test_malformed_provenance_refused_in_strict_mode(self):
        with self.assertRaises(MissingSourceError):
            require_provenance({"provenance": {"status": "TOTALLY VERIFIED", "sources": [{"x": 1}]}})

    def test_require_provenance(self):
        with self.assertRaises(MissingSourceError):
            require_provenance({"latitude": 1.0})
        require_provenance({"provenance": provenance_block([DataSource("t", "synthetic")])})


class MasterScriptTests(unittest.TestCase):
    def setUp(self):
        self.engine = MultiBandWaveEngineV2()

    def test_refuses_without_sources(self):
        with self.assertRaises(MissingSourceError):
            self.engine.evaluate_multi_band_node(0, 0, 1.0, 3.1, swir_1720_reflectance=0.1, sif_stress=0.9)

    def test_defaults_are_flagged_as_estimates(self):
        measured = [DataSource("GPR trace", "measured", "survey-2026-01.dzt")]
        out = self.engine.evaluate_multi_band_node(0, 0, 1.0, 3.1, sources=measured)
        self.assertIn("swir_1720_reflectance", out["assumed_inputs"])
        self.assertIn("sif_stress", out["assumed_inputs"])
        self.assertEqual(out["provenance"]["status"], LABEL_ESTIMATE)
        self.assertFalse(out["score_is_calibrated_probability"])

    def test_score_unchanged_from_original(self):
        # Same numbers as the original demo call: the guard labels, it does not re-score.
        out = self.engine.evaluate_multi_band_node(
            2.5, -1.8, 1.2, 3.1, swir_1720_reflectance=0.12, sif_stress=0.92,
            sources=[DataSource("demo", "synthetic")])
        self.assertAlmostEqual(out["fused_probability"], 94.7, places=2)  # value from the unmodified script

    def test_out_of_range_indices_rejected(self):
        src = [DataSource("demo", "synthetic")]
        for kw in ({"sif_stress": 5.0}, {"sif_stress": -0.1}, {"swir_1720_reflectance": -2.0},
                   {"swir_1720_reflectance": float("nan")}, {"sif_stress": float("inf")}):
            args = dict({"swir_1720_reflectance": 0.12, "sif_stress": 0.92}, **kw)
            with self.assertRaises(ValueError, msg=kw):
                self.engine.evaluate_multi_band_node(0, 0, 1.0, 3.1, sources=src, **args)
        out = self.engine.evaluate_multi_band_node(0, 0, 1.0, 3.0, swir_1720_reflectance=0.0, sif_stress=1.0,
                                                   sources=src)
        self.assertLessEqual(out["fused_probability"], 100.0)


if __name__ == "__main__":
    unittest.main()
