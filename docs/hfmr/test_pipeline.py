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

    def test_verify_rejects_unknown_manifest_schema(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "input.csv"
            write_grid(p)
            out = Path(t) / "run"
            analyze("TEST-001", p, out)
            self.assertEqual(run_cli("hfmr.__main__", ["verify", "--output", out]), 0)
            for schema in ("hfmr.unknown.v9", None):
                manifest = json.loads((out / "manifest.json").read_text())
                manifest["schema"] = schema
                (out / "manifest.json").write_text(json.dumps(manifest))
                # Re-chain the edited manifest so only the schema dispatch can reject it.
                head = Ledger(out / "ledger.jsonl").append({"manifest_sha256": digest_file(out / "manifest.json")})
                (out / "ledger_head.txt").write_text(head + "\n")
                self.assertTrue(verify_run(out))
                self.assertEqual(run_cli("hfmr.__main__", ["verify", "--output", out]), 1)

    def test_verify_malformed_ledger_event_fails_without_crashing(self):
        with tempfile.TemporaryDirectory() as t:
            out = Path(t) / "run"
            out.mkdir()
            (out / "manifest.json").write_text(json.dumps({"schema": "hfmr.run.v1"}))
            for event in (["manifest_sha256"], "manifest_sha256"):
                (out / "ledger.jsonl").unlink(missing_ok=True)
                head = Ledger(out / "ledger.jsonl").append(event)
                (out / "ledger_head.txt").write_text(head + "\n")
                self.assertEqual(run_cli("hfmr.__main__", ["verify", "--output", out]), 1)

    def test_geojson_declares_projected_crs(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "input.csv"
            write_grid(p)
            out = Path(t) / "run"
            analyze("TEST-001", p, out, cell_size_m=1.0, origin_xy=[500000.0, 4400000.0], crs="EPSG:32613")
            geo = json.loads((out / "candidate_points.geojson").read_text())
            self.assertEqual(geo["crs"]["properties"]["name"], "EPSG:32613")
            self.assertEqual(geo["features"][0]["properties"]["source_crs"], "EPSG:32613")
            out4326 = Path(t) / "run4326"
            analyze("TEST-001", p, out4326, cell_size_m=0.001, origin_xy=[-83.0, 40.0], crs="EPSG:4326")
            self.assertNotIn("crs", json.loads((out4326 / "candidate_points.geojson").read_text()))

    def test_geojson_tampering_fails_verification(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "input.csv"
            write_grid(p)
            out = Path(t) / "run"
            analyze("TEST-001", p, out, cell_size_m=1.0, origin_xy=[500000.0, 4400000.0], crs="EPSG:32613")
            geo_path = out / "candidate_points.geojson"
            geo = json.loads(geo_path.read_text())
            self.assertTrue(verify_run(out))
            geo["features"][0]["geometry"]["coordinates"] = [0.0, 0.0]
            geo_path.write_text(json.dumps(geo, indent=2))
            self.assertFalse(verify_run(out))
            geo_path.unlink()
            self.assertFalse(verify_run(out))

    def test_stale_geojson_from_reused_output_fails_verification(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "input.csv"
            write_grid(p)
            out = Path(t) / "run"
            analyze("TEST-001", p, out, cell_size_m=1.0, origin_xy=[500000.0, 4400000.0], crs="EPSG:32613")
            analyze("TEST-001", p, out)  # same directory, no georeferencing this time
            self.assertTrue((out / "candidate_points.geojson").exists())
            self.assertFalse(verify_run(out))

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
