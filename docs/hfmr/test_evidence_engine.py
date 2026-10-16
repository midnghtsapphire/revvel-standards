# unused (flake8 F401), kept for reference: import json
import tempfile
import unittest
from pathlib import Path

# star import replaced with explicit names (flake8 F403/F405): from .evidence_engine import *
from .evidence_engine import (
    cross_reference,
    document_intelligence,
    evidence_quality,
    extract_text,
    save_json,
    sensor_compatibility,
    sha,
    verify_bundle,
)


class EvidenceTests(unittest.TestCase):
    def test_extract(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "doc.txt"
            p.write_text(
                "Permit ABC-123456 issued 03/12/2006\nFoundation inspection on 03/13/2006\nConcrete poured 03/14/2006"
            )
            d = document_intelligence(p)
            self.assertTrue(any(x.get("event") == "concrete_placement" for x in d["findings"]))
            self.assertTrue(any(x.get("kind") == "date_mention" for x in d["findings"]))
            self.assertEqual(d["sha256"], sha(p))

    def test_crossref(self):
        self.assertEqual(
            len(
                cross_reference(
                    [{"kind": "permit_mention", "value": "ABC-123456", "line": 2}], [{"permit_id": "ABC123456"}]
                )
            ),
            1,
        )

    def test_capability_gates(self):
        self.assertFalse(
            sensor_compatibility({"sensor": "sar", "complex_slc": False, "independent_baselines": 7})["tomo_sar"]
        )
        self.assertTrue(
            sensor_compatibility(
                {"sensor": "sar", "complex_slc": True, "independent_baselines": 4, "baseline_geometry": True}
            )["tomo_sar"]
        )

    def test_quality(self):
        self.assertEqual(
            evidence_quality(
                [{"source_url": "x", "sha256": "y", "acquisition_date": "2006", "spatial_reference": "EPSG:4326"}]
            )["complete_provenance_fraction"],
            1,
        )

    def test_integrity(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "x.json"
            save_json(p, {"a": 1})
            (Path(t) / "x.json.sha256").write_text(sha(p) + "  x.json")
            self.assertTrue(verify_bundle(t)["valid"])
            p.write_text("tampered")
            self.assertFalse(verify_bundle(t)["valid"])

    def test_pdf_optional(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "a.png"
            p.write_bytes(b"bad")
            with self.assertRaises(ValueError):
                extract_text(p)

    def test_no_overwrite(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "a.json"
            save_json(p, [])
            with self.assertRaises(FileExistsError):
                save_json(p, [])
