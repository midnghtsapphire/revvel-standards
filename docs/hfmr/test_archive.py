import tempfile
import unittest
from pathlib import Path
from .archive import register, verify

# unused (flake8 F401), kept for reference: from .archive import inspect_file


class ArchiveTests(unittest.TestCase):
    def test_manifest_and_tamper(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "source.bin"
            p.write_bytes(b"original")
            m = Path(td) / "evidence.json"
            d = register(p, "CASE001", "SRC001", m)
            self.assertEqual(d["status"], "acquisition_date_unverified")
            self.assertTrue(verify(m, p))
            p.write_bytes(b"changed")
            self.assertFalse(verify(m, p))

    def test_date_basis(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "source.bin"
            p.write_bytes(b"a")
            with self.assertRaises(ValueError):
                register(p, "CASE001", "SRC001", Path(td) / "m.json", "2006-04-01")

    def test_no_overwrite(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "source.bin"
            p.write_bytes(b"a")
            m = Path(td) / "m.json"
            register(p, "CASE001", "SRC001", m)
            with self.assertRaises(FileExistsError):
                register(p, "CASE001", "SRC001", m)


if __name__ == "__main__":
    unittest.main()
