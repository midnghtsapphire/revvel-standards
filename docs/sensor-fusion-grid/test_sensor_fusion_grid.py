"""Tests for sensor_fusion_grid. Run: python3 -m unittest discover -s docs/sensor-fusion-grid"""

import importlib.util
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HAS_NUMPY = importlib.util.find_spec("numpy") is not None
HAS_MPL = importlib.util.find_spec("matplotlib") is not None

if HAS_NUMPY:
    import numpy as np

    import sensor_fusion_grid as f


def _noise_inputs(seed: int) -> "dict[str, np.ndarray]":
    g = np.random.default_rng(seed)
    return {
        "sar_db": -14 + g.normal(0, 0.8, (15, 15)),
        "thermal_delta_c": g.normal(0, 0.25, (15, 15)),
        "sif_stress": 0.2 + g.normal(0, 0.05, (15, 15)),
        "permittivity": 20 + g.normal(0, 1.5, (15, 15, 20)),
    }


@unittest.skipUnless(HAS_NUMPY, "numpy not installed")
class Fusion(unittest.TestCase):
    def test_locates_simulated_target(self) -> None:
        for target, seed in [((7, 9, 11), 42), ((3, 12, 4), 1), ((11, 2, 16), 2)]:
            report, score = f.run(target=target, seed=seed, null_runs=0)
            self.assertEqual(score.shape, (15, 15, 20))
            self.assertTrue(report["result"]["matches_simulated_target"], target)

    def test_scores_bounded(self) -> None:
        _, score = f.run(null_runs=0)
        self.assertGreaterEqual(float(score.min()), 0.0)
        self.assertLessEqual(float(score.max()), 100.0)

    def test_permutation_null_separates_target_from_noise(self) -> None:
        report, _ = f.run(null_runs=40)
        self.assertLess(report["result"]["permutation_null"]["empirical_p_value"], 0.05)
        inp = _noise_inputs(9)
        peak = float(f.fuse(inp).max())
        self.assertGreater(f.permutation_null(inp, peak, 40, 1)["empirical_p_value"], 0.05)

    def test_weights_change_result_and_are_validated(self) -> None:
        inp = f.simulate_inputs(seed=4)
        a = f.fuse(inp)
        b = f.fuse(inp, {"sar": 1, "thermal": 0, "sif": 0, "permittivity": 0})
        self.assertFalse(np.allclose(a, b))
        self.assertTrue(np.allclose(b[:, :, 0], b[:, :, -1]), "surface-only weights are depth-independent after renorm")
        with self.assertRaises(ValueError):
            f.fuse(inp, {"sar": 0, "thermal": 0, "sif": 0, "permittivity": 0})

    def test_shape_validation(self) -> None:
        inp = f.simulate_inputs(seed=4)
        inp["sar_db"] = inp["sar_db"][:5]
        with self.assertRaises(ValueError):
            f.fuse(inp)
        with self.assertRaises(ValueError):
            f.simulate_inputs(target=(20, 0, 0))

    def test_report_is_plain_json_types(self) -> None:
        import json

        report, _ = f.run(null_runs=5)
        json.dumps(report)
        self.assertIsInstance(report["result"]["peak_position_m"]["x"], float)
        self.assertFalse(report["score_is_calibrated_probability"])

    @unittest.skipUnless(HAS_MPL, "matplotlib not installed")
    def test_plot_written(self) -> None:
        report, score = f.run(null_runs=0)
        with tempfile.TemporaryDirectory() as d:
            png = os.path.join(d, "g.png")
            f.plot(score, report, png, 50.0)
            self.assertGreater(os.path.getsize(png), 10_000)


if __name__ == "__main__":
    unittest.main()
