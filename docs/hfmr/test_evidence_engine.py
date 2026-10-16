# unused (flake8 F401), kept for reference: import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

# star import replaced with explicit names (flake8 F403/F405): from .evidence_engine import *
from .evidence_engine import (
    cross_reference,
    document_intelligence,
    evidence_quality,
    PERMIT_RE,
    extract_text,
    main,
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

    def test_permit_identifier_forms(self):
        cases = {
            "Permit P-7 issued": ["P-7"],
            "See #123456 for details": ["123456"],
            "Permit ID 123456": ["123456"],
            "Permit No. 123456": ["123456"],
            "Permit ABC-123456 issued 03/12/2006": ["ABC-123456"],
            "Case: CV-2006-1234 filed": ["CV-2006-1234"],
            "permit issued 03/12/2006": [],
        }
        for text, expected in cases.items():
            self.assertEqual(PERMIT_RE.findall(text), expected, text)

    def test_crossref_accepts_municipal_record_id(self):
        # municipal.ingest_permits emits record_id, not permit_id.
        mention = {"kind": "permit_mention", "value": "BLD-2006-01", "line": 3}
        out = cross_reference([mention], [{"record_id": "BLD200601"}])
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["permit_id"], "BLD200601")
        self.assertEqual(out[0]["source_line"], 3)

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

    def test_empty_or_missing_bundle_is_not_valid(self):
        with tempfile.TemporaryDirectory() as t:
            (Path(t) / "x.json").write_text("{}")
            self.assertFalse(verify_bundle(t)["valid"])
            self.assertFalse(verify_bundle(Path(t) / "missing")["valid"])
            argv = ["evidence_engine", "verify", "--root", t]
            with mock.patch.object(sys, "argv", argv), mock.patch("builtins.print"):
                with self.assertRaises(SystemExit) as ctx:
                    main()
            self.assertEqual(ctx.exception.code, 1)

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
