import tempfile
import unittest
# unused (flake8 F401), kept for reference: import json
from pathlib import Path
from .intake17 import collect


class IntakeTests(unittest.TestCase):
    def test_intake_and_duplicate(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t) / "in"
            root.mkdir()
            (root / "a.txt").write_text("Foundation inspection 2006-04-01")
            (root / "b.txt").write_text("Foundation inspection 2006-04-01")
            (root / "c.exe").write_text("x")
            result = collect(root, Path(t) / "out.json")
            self.assertEqual(result["summary"], {"total": 3, "registered": 1, "duplicates": 1, "unsupported": 1})
            self.assertTrue(result["files"][0]["findings"])

    def test_refuse_overwrite(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t) / "in"
            root.mkdir()
            p = Path(t) / "out.json"
            collect(root, p)
            with self.assertRaises(FileExistsError):
                collect(root, p)

    def test_symlink_skip(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t) / "in"
            root.mkdir()
            (root / "link.txt").symlink_to("/etc/hosts")
            self.assertEqual(collect(root, Path(t) / "out.json")["summary"]["total"], 0)

    def test_size_cap(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t) / "in"
            root.mkdir()
            (root / "a.txt").write_text("hello")
            self.assertEqual(collect(root, Path(t) / "out.json", max_mb=0)["files"][0]["status"], "oversize")
