import csv
import tempfile
import unittest
from pathlib import Path
from hfmr.pipeline import analyze, verify_run, load_grid, compare


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
