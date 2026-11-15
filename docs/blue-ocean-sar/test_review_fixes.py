"""Regression tests for the 2026-11 code-review fixes (findings 1-10).

Each test pins one fix so it cannot silently regress. Run with:
    python3 -m unittest test_review_fixes -v
"""

import unittest

import numpy as np

import provenance
from provenance import DataSource, MissingSourceError, LABEL_UNSOURCED
from sar_person_finder import ca_cfar, BlueOceanSARPersonFinder, run_demo
from sar_person_finder_v3 import MultiBandSAREngine


class ZeroClutterCFAR(unittest.TestCase):
    """Finding 1: an all-zero training ring must not manufacture detections."""

    def test_zero_region_gives_no_detections(self):
        x = np.zeros((40, 40), dtype=np.float64)
        x[20, 20] = 500.0  # a lone positive cell in a sea of zeros (nodata fill)
        detections, ratio, _, _ = ca_cfar(x, guard=2, train=4, pfa=1e-6)
        # With a zero clutter mean the old code set threshold 0 and detected the
        # cell with a runaway ratio; now no cell detects and ratios stay finite.
        self.assertFalse(detections.any())
        self.assertTrue(np.all(np.isfinite(ratio)))
        self.assertEqual(ratio.max(), 0.0)


class DemoExportLabel(unittest.TestCase):
    """Finding 2: v1 --demo export must write the UNSOURCED label it promises.

    Drives run_demo end to end with a candidate that has NO provenance (the
    exact case the gate exists for) and reads the label back out of the written
    GeoJSON. Before the fix, run_demo ignored the gate's return value and wrote
    properties=cand, so the feature had no status; this test fails on that code."""

    def test_run_demo_writes_unsourced_label_for_stripped_record(self):
        import json
        import os
        import tempfile
        from unittest import mock

        # A candidate as process_sar_scene might hand back after losing its
        # provenance block somewhere in the pipeline.
        stripped = [{"rank": 1, "latitude": 49.0, "longitude": -122.0, "fused_score": 1.0}]

        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "c.geojson")
            with mock.patch.object(
                BlueOceanSARPersonFinder, "process_sar_scene", return_value=stripped
            ):
                run_demo(out_path=out, allow_unverified=True)
            with open(out) as f:
                feature = json.load(f)["features"][0]

        prov = feature["properties"]["provenance"]
        self.assertEqual(prov["status"], LABEL_UNSOURCED)
        self.assertFalse(prov["ground_verified"])

    def test_run_demo_without_demo_flag_refuses_stripped_record(self):
        import os
        import tempfile
        from unittest import mock

        stripped = [{"rank": 1, "latitude": 49.0, "longitude": -122.0}]
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "c.geojson")
            with mock.patch.object(
                BlueOceanSARPersonFinder, "process_sar_scene", return_value=stripped
            ):
                # No --demo: the export gate must refuse, not write an unlabelled point.
                with self.assertRaises(MissingSourceError):
                    run_demo(out_path=out, allow_unverified=False)
                self.assertFalse(os.path.exists(out))


class ProvenanceNotAliased(unittest.TestCase):
    """Finding 8: each target carries its own provenance block."""

    def test_v3_targets_have_independent_provenance(self):
        eng = MultiBandSAREngine()  # default grid (anomalies injected up to row 62)
        import os
        import tempfile

        with tempfile.TemporaryDirectory() as d:
            raster = os.path.join(d, "s.tif")
            eng.generate_multiband_raster(raster)
            targets = eng.process_multiband_sar(
                raster, sources=[DataSource("synthetic demo", "synthetic")]
            )
        self.assertGreaterEqual(len(targets), 2)
        targets[0]["provenance"]["ground_verified"] = True
        self.assertFalse(targets[1]["provenance"]["ground_verified"])
        self.assertIsNot(targets[0]["provenance"], targets[1]["provenance"])


class CallsignPrefix(unittest.TestCase):
    """Finding 9: an UNSOURCED target gets an UNSOURCED callsign, not UNVERIFIED."""

    def test_unsourced_callsign_prefix(self):
        import os
        import tempfile
        import xml.etree.ElementTree as ET

        eng = MultiBandSAREngine()  # default grid (anomalies injected up to row 62)
        with tempfile.TemporaryDirectory() as d:
            raster = os.path.join(d, "s.tif")
            eng.generate_multiband_raster(raster)
            targets = eng.process_multiband_sar(raster, sources=None, allow_unverified=True)
            self.assertTrue(targets)
            self.assertEqual(targets[0]["provenance"]["status"], LABEL_UNSOURCED)
            xml_path = os.path.join(d, "m.xml")
            eng.export_cot_xml(targets, xml_path, allow_unverified=True)
            root = ET.parse(xml_path).getroot()
            callsign = root.find(".//contact").get("callsign")
            self.assertTrue(callsign.startswith("UNSOURCED "), callsign)


class ExportStrictCannotBeDisabled(unittest.TestCase):
    """Finding 10: flipping EXPORT_STRICT off must not open the export gate."""

    def test_export_gate_ignores_global(self):
        saved = provenance.EXPORT_STRICT
        try:
            provenance.EXPORT_STRICT = False
            provenance.STRICT = False
            with self.assertRaises(MissingSourceError):
                # A record with no provenance must still be refused on export,
                # even with both globals off, because the gate hard-codes strict.
                provenance.require_export_provenance({"latitude": 1.0, "longitude": 2.0})
        finally:
            provenance.EXPORT_STRICT = saved
            provenance.STRICT = False


if __name__ == "__main__":
    unittest.main()
