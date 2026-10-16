# unused (flake8 F401), kept for reference: import csv
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

# star import replaced with explicit names (flake8 F403/F405): from .retrieval import *
from .retrieval import queue_from_stac, read_queue, run_queue, verify_queue


class RetrievalTests(unittest.TestCase):
    def test_stac_queue(self):
        with tempfile.TemporaryDirectory() as d:
            src = Path(d) / "inventory.json"
            out = Path(d) / "q.csv"
            src.write_text(
                json.dumps(
                    {
                        "items": [
                            {
                                "id": "scene1",
                                "acquired": "2006-04-01",
                                "assets": {"image": "https://example.gov/a.tif", "external": "https://other.gov/b.tif"},
                            }
                        ]
                    }
                )
            )
            self.assertEqual(queue_from_stac(src, out, ["example.gov"]), 1)
            self.assertEqual(read_queue(out)[0]["source_id"], "scene1_image")

    def test_retrieve_and_tamper(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            q = root / "q.csv"
            q.write_text("source_id,url,category,case_id\na,https://example.gov/a,imagery,CASE001\n")

            def fake(url, dest, hosts, max_bytes):
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(b"evidence")
                return {
                    "file": str(dest),
                    "bytes": 8,
                    "sha256": hashlib.sha256(b"evidence").hexdigest(),
                    "requested_url": url,
                }

            out = root / "out"
            self.assertEqual(run_queue(q, out, ["example.gov"], fetcher=fake)[0]["status"], "downloaded")
            self.assertTrue(verify_queue(out)["a"])
            self.assertEqual(run_queue(q, out, ["example.gov"], fetcher=fake)[0]["status"], "already_verified")
            (out / "raw" / "a" / "original.bin").write_bytes(b"tampered")
            self.assertFalse(verify_queue(out)["a"])

    def test_host_rejection(self):
        with tempfile.TemporaryDirectory() as d:
            q = Path(d) / "q.csv"
            q.write_text("source_id,url\na,https://other.gov/file\n")
            self.assertEqual(run_queue(q, Path(d) / "out", ["example.gov"])[0]["status"], "failed")

    def test_duplicate_ids(self):
        with tempfile.TemporaryDirectory() as d:
            q = Path(d) / "q.csv"
            q.write_text("source_id,url\na,https://example.gov/a\na,https://example.gov/b\n")
            with self.assertRaises(ValueError):
                read_queue(q)

    def test_no_overwrite_queue(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "i.json"
            q = Path(d) / "q.csv"
            p.write_text('{"items":[]}')
            queue_from_stac(p, q, ["example.gov"])
            with self.assertRaises(FileExistsError):
                queue_from_stac(p, q, ["example.gov"])
