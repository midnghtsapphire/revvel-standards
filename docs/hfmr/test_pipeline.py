import csv
import io
import json
import runpy
import sys
import tempfile
import types
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock
from hfmr.hfmr import Ledger
from hfmr.pipeline import analyze, digest_file, verify_run, load_grid, compare


def run_cli(module, argv):
    """Run a CLI module in-process and return its exit status (0 when it returns normally)."""
    with mock.patch.object(sys, "argv", [module] + [str(a) for a in argv]), redirect_stdout(io.StringIO()):
        try:
            runpy.run_module(module, run_name="__main__")
        except SystemExit as exc:
            return exc.code
    return 0


def write_grid(path):
    grid = [[0.0] * 12 for _ in range(12)]
    for y in (4, 5):
        for x in (4, 5):
            grid[y][x] = 20.0
    with path.open("w", newline="") as f:
        csv.writer(f).writerows(grid)


class TestPipeline(unittest.TestCase):
    def test_anomaly_and_integrity(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "input.csv"
            grid = [[0.0] * 12 for _ in range(12)]
            for y in (4, 5):
                for x in (4, 5):
                    grid[y][x] = 20.0
            with p.open("w", newline="") as f:
                csv.writer(f).writerows(grid)
            out = Path(t) / "run"
            m = analyze("TEST-001", p, out)
            self.assertEqual(m["result"]["candidate_count"], 1)
            self.assertTrue(verify_run(out))
            with (out / "manifest.json").open("a") as f:
                f.write(" ")
            self.assertFalse(verify_run(out))

    def test_cli_works_without_geotiff_dependencies(self):
        # CSV/archive commands must not need NumPy just because the historical pipeline exists.
        with tempfile.TemporaryDirectory() as t:
            registry = Path(t) / "r.csv"
            registry.write_text("source_id,modality,acquisition_window,source_url,validation_needed\n")
            with mock.patch.dict(sys.modules, {"numpy": None, "hfmr.historical": None}):
                self.assertEqual(run_cli("hfmr.__main__", ["archive-timeline", "--registry", registry]), 0)

    def test_verify_dispatches_on_manifest_schema(self):
        calls = []
        fake = types.ModuleType("hfmr.historical")
        fake.run = fake.inspect = None
        fake.verify = lambda out: calls.append(out) or False
        with tempfile.TemporaryDirectory() as t:
            out = Path(t) / "run"
            out.mkdir()
            # A historical run whose difference.tif was deleted: ledger and manifest still agree.
            (out / "manifest.json").write_text(json.dumps({"schema": "hfmr.historical.v1", "outputs": {}}))
            head = Ledger(out / "ledger.jsonl").append({"manifest_sha256": digest_file(out / "manifest.json")})
            (out / "ledger_head.txt").write_text(head + "\n")
            with mock.patch.dict(sys.modules, {"hfmr.historical": fake}):
                self.assertEqual(run_cli("hfmr.__main__", ["verify", "--output", out]), 1)
            self.assertEqual(len(calls), 1)

    def test_verify_scalar_run_ignores_stale_difference_tif(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "input.csv"
            write_grid(p)
            out = Path(t) / "run"
            analyze("TEST-001", p, out)
            (out / "difference.tif").write_bytes(b"stale")
            self.assertEqual(run_cli("hfmr.__main__", ["verify", "--output", out]), 0)
            (out / "manifest.json").unlink()
            self.assertEqual(run_cli("hfmr.__main__", ["verify", "--output", out]), 1)

    def test_alignment_error(self):
        with self.assertRaises(ValueError):
            compare([[1]], [[1, 2]])

    def test_bad_grid(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "bad.csv"
            p.write_text("1,2\n3\n")
            with self.assertRaises(ValueError):
                load_grid(p)


if __name__ == "__main__":
    unittest.main()
