import tempfile
import unittest
from pathlib import Path
from unittest import mock
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

    def test_blank_or_variant_basis_is_not_a_basis(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "source.bin"
            p.write_bytes(b"a")
            for i, basis in enumerate(("", "   ", None, "UNKNOWN", " Unknown ")):
                with self.assertRaises(ValueError):
                    register(p, "CASE001", "SRC001", Path(td) / f"m{i}.json", "2006-04-01", basis)
            d = register(p, "CASE001", "SRC001", Path(td) / "ok.json", "2006-04-01", " vendor_metadata ")
            self.assertEqual(d["acquisition_basis"], "vendor_metadata")
            self.assertEqual(d["status"], "registered_not_validated")

    def test_write_is_exclusive_even_if_file_appears_after_check(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "source.bin"
            p.write_bytes(b"a")
            m = Path(td) / "m.json"
            m.write_text("existing evidence")
            # Simulate a concurrent writer creating the manifest after the exists() check.
            with mock.patch("pathlib.Path.exists", return_value=False):
                with self.assertRaises(FileExistsError):
                    register(p, "CASE001", "SRC001", m)
            self.assertEqual(m.read_text(), "existing evidence")

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
