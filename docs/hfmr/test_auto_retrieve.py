# unused (flake8 F401), kept for reference: import json
# unused (flake8 F401), kept for reference: import sys
import tempfile
import unittest
from pathlib import Path

# original path hack for a top-level tests/ dir, not needed inside the package:
# sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
# original absolute import (top-level tests/ dir): from hfmr.auto_retrieve import validate_url,address_query,query_layer,acquire,verify  # noqa: E501
from .auto_retrieve import validate_url, address_query, query_layer, acquire, verify


class Tests(unittest.TestCase):
    def test_url(self):
        self.assertTrue(
            validate_url("https://gis.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer/5")
        )
        for u in [
            "http://gis.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer/5",
            "https://evil.example/a",
            "https://gis.columbus.gov/private",
        ]:
            with self.assertRaises(ValueError):
                validate_url(u)

    def test_query(self):
        self.assertIn("2006", address_query(1546, "HIGH", 2006, 2006, {"ISSUED_YEAR"}))
        with self.assertRaises(ValueError):
            address_query(1546, "HIGH'", 2000, 2010, {"ISSUED_YEAR"})

    def fake(self, url):
        if "/query?" in url:
            return {
                "features": [
                    {
                        "attributes": {
                            "OBJECTID": 1,
                            "SITE_ADDRESS": "1546 N HIGH ST",
                            "B1_ALT_ID": "P-1",
                            "B1_PARCEL_NBR": "ABC",
                        }
                    }
                ]
            }, "mock-query"
        return {
            "fields": [
                {"name": x}
                for x in ("OBJECTID", "SITE_ADDRESS", "B1_ALT_ID", "B1_PARCEL_NBR", "ISSUED_YEAR", "FILED_YEAR")
            ]
        }, "mock-schema"

    def test_acquire_verify(self):
        with tempfile.TemporaryDirectory() as d:
            m = acquire(d, fetcher=self.fake)
            self.assertTrue(m["complete"])
            self.assertEqual(len(m["layers"]), 2)
            self.assertEqual(verify(d), [])
            p = next(Path(d).glob("*_building.json"))
            p.write_text("tampered")
            self.assertTrue(verify(d))

    def test_verify_fails_without_manifests(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertTrue(verify(d))
            self.assertTrue(verify(Path(d) / "missing"))

    def test_verify_reports_corrupt_sidecar_instead_of_crashing(self):
        with tempfile.TemporaryDirectory() as d:
            acquire(d, fetcher=self.fake)
            next(Path(d).glob("*_manifest.sha256")).write_text("")
            errors = verify(d)
            self.assertEqual(len(errors), 1)
            self.assertIn("manifest invalid", errors[0])

    def test_verify_reports_deeply_nested_manifest_instead_of_crashing(self):
        import hashlib

        with tempfile.TemporaryDirectory() as d:
            m = Path(d) / "x_manifest.json"
            m.write_text("[" * 200000 + "]" * 200000)
            m.with_suffix(".sha256").write_text(hashlib.sha256(m.read_bytes()).hexdigest() + "  " + m.name + "\n")
            errors = verify(d)
            self.assertEqual(len(errors), 1)
            self.assertIn("RecursionError", errors[0])

    def test_failure_explicit(self):
        with tempfile.TemporaryDirectory() as d:
            m = acquire(d, fetcher=lambda url: (_ for _ in ()).throw(ConnectionError("offline")))
            self.assertFalse(m["complete"])
            self.assertEqual(len(m["errors"]), 2)

    def test_cap(self):
        with self.assertRaises(ValueError):
            query_layer(
                "https://gis.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer/5",
                "1=1",
                fetcher=self.fake,
                cap=0,
            )
