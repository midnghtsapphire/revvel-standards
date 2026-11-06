import tempfile
import unittest

# unused (flake8 F401), kept for reference: import json
from pathlib import Path

# star import replaced with explicit names (flake8 F403/F405): from .municipal import *
from .municipal import attachments_from_csv, chronology, ingest_permits, records_request, save_chronology


class MunicipalTests(unittest.TestCase):
    def test_ingest_chronology(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t)
            (p / "p.csv").write_text(
                "ID,ADDRESS,ISSUED,DESCRIPTION\nP1,1546 N High St,04/02/2006,foundation concrete\n"
            )
            mapping = {"record_id": "ID", "address": "ADDRESS", "issue_date": "ISSUED", "description": "DESCRIPTION"}
            self.assertEqual(ingest_permits(p / "p.csv", p / "normalized.json", mapping), 1)
            ev = chronology(p / "normalized.json", "1546 N High St")
            self.assertEqual(ev[0]["event_type"], "permit_issued")
            self.assertTrue(ev[0]["potential_construction_relevance"])
            self.assertIn("not verified physical work date", ev[0]["interpretation"])
            self.assertEqual(save_chronology(p / "normalized.json", p / "events.json"), 1)

    def test_no_overwrite(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t)
            (p / "p.csv").write_text("ID,ADDR\nP1,One\n")
            m = {"record_id": "ID", "address": "ADDR"}
            ingest_permits(p / "p.csv", p / "n.json", m)
            with self.assertRaises(FileExistsError):
                ingest_permits(p / "p.csv", p / "n.json", m)

    def test_mapping_validation(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t)
            (p / "p.csv").write_text("ID,ADDR\nP1,One\n")
            with self.assertRaises(ValueError):
                ingest_permits(p / "p.csv", p / "n.json", {"record_id": "WRONG", "address": "ADDR"})

    def test_attachment_queue(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t)
            (p / "a.csv").write_text(
                "ID,URL,TYPE\nP1,https://city.gov/doc.pdf,plan\nP2,https://bad.org/doc.pdf,photo\n"
            )
            m = {"record_id": "ID", "document_url": "URL", "document_type": "TYPE"}
            self.assertEqual(attachments_from_csv(p / "a.csv", p / "queue.csv", m, ["city.gov"]), 1)
            self.assertIn("P1", (p / "queue.associations.json").read_text())

    def test_request(self):
        self.assertIn("retention schedule", records_request("1546 N High St"))
