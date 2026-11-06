import json
import tempfile
import unittest
from pathlib import Path
from .records_followup import classify, followups, chronology, write_packet


class Tests(unittest.TestCase):
    def setUp(self):
        self.report = {
            "records": [
                {
                    "permit_id": "P-7",
                    "layer": "building",
                    "address": "1546 N HIGH ST",
                    "parcel": "12",
                    "event_date": "2006-03-01T00:00:00Z",
                    "event_type": "permit_issued",
                    "description": "Concrete foundation work",
                    "source_record": {},
                },
                {"permit_id": "P-7", "layer": "building", "description": "duplicate"},
            ],
            "retrieval_complete": False,
            "errors": [{"layer": "site_engineering", "message": "offline"}],
        }

    def test_classification(self):
        self.assertIn("concrete", classify("Foundation slab poured"))

    def test_dedupe(self):
        self.assertEqual(len(followups(self.report)), 1)

    def test_no_pour_assertion(self):
        self.assertFalse(chronology(self.report)[0]["actual_pour_date_confirmed"])

    def test_packet(self):
        with tempfile.TemporaryDirectory() as t:
            inp = Path(t) / "report.json"
            inp.write_text(json.dumps(self.report))
            out = Path(t) / "packet"
            result = write_packet(inp, out)
            self.assertEqual(result["followups"], 1)
            self.assertIn("P-7", (out / "records_request.txt").read_text())
            self.assertNotIn("noqa", (out / "records_request.txt").read_text())
            self.assertFalse(json.loads((out / "status.json").read_text())["retrieval_complete"])
            with self.assertRaises(FileExistsError):
                write_packet(inp, out)
