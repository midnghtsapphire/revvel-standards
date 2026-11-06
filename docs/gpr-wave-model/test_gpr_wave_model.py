"""Tests for gpr_wave_model. Run: python3 -m unittest discover -s docs/gpr-wave-model"""

import contextlib
import io
import json
import math
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import gpr_wave_model as g  # noqa: E402


class LosslessPhysics(unittest.TestCase):
    def test_velocity_matches_c_over_sqrt_er(self) -> None:
        self.assertAlmostEqual(g.velocity(1.0), g.C_M_PER_NS)
        self.assertAlmostEqual(g.velocity(20.0), 0.0670356, places=6)

    def test_fresnel_known_value_and_sign(self) -> None:
        self.assertAlmostEqual(g.fresnel_r(20.0, 3.0), 0.441651, places=6)
        self.assertLess(g.fresnel_r(15.0, 16.4), 0.0)
        self.assertEqual(g.fresnel_r(9.0, 9.0), 0.0)

    def test_twt(self) -> None:
        self.assertAlmostEqual(g.twt_ns(1.0, g.velocity(20.0)), 29.835, places=3)
        self.assertEqual(g.twt_ns(0.0, 0.1), 0.0)

    def test_rejects_bad_inputs(self) -> None:
        with self.assertRaises(ValueError):
            g.velocity(0.5)
        with self.assertRaises(ValueError):
            g.complex_er(10.0, -1.0, 400.0)
        with self.assertRaises(ValueError):
            g.depth_grid(3.0, 0.0)
        with self.assertRaises(ValueError):
            g.pair_sigma([15.0, 20.0, 25.0], [10.0, 20.0])


class Attenuation(unittest.TestCase):
    def test_zero_conductivity_is_lossless(self) -> None:
        alpha, _, v = g.propagation(20.0, 0.0, 400.0)
        self.assertEqual(alpha, 0.0)
        self.assertAlmostEqual(v, g.velocity(20.0), places=9)

    def test_low_loss_matches_rule_of_thumb(self) -> None:
        alpha, _, _ = g.propagation(20.0, 5.0, 400.0)
        approx = 1.636 * 5.0 / math.sqrt(20.0)
        self.assertAlmostEqual(alpha * g.NP_TO_DB, approx, delta=approx * 1e-3)

    def test_attenuation_grows_with_conductivity(self) -> None:
        a10 = g.propagation(20.0, 10.0, 400.0)[0]
        a60 = g.propagation(20.0, 60.0, 400.0)[0]
        self.assertGreater(a60, a10)

    def test_loss_slows_the_wave(self) -> None:
        _, _, v = g.propagation(25.0, 200.0, 100.0)
        self.assertLess(v, g.velocity(25.0))

    def test_complex_r_reduces_to_real_when_lossless(self) -> None:
        rc = g.fresnel_r_complex(g.complex_er(20.0, 0.0, 400.0), g.complex_er(3.0, 0.0, 400.0))
        self.assertAlmostEqual(rc.real, g.fresnel_r(20.0, 3.0))
        self.assertAlmostEqual(rc.imag, 0.0)


class Detection(unittest.TestCase):
    def test_max_depth_closed_form(self) -> None:
        d = g.max_detectable_depth(0.5, 10.0, 60.0, spreading=False)
        self.assertAlmostEqual(d, (60.0 + 20 * math.log10(0.5)) / 20.0)

    def test_max_depth_edge_cases(self) -> None:
        self.assertIsNone(g.max_detectable_depth(0.0, 10.0, 60.0, False))
        self.assertIsNone(g.max_detectable_depth(1e-4, 10.0, 60.0, False))
        self.assertTrue(math.isinf(g.max_detectable_depth(0.5, 0.0, 60.0, False)))

    def test_spreading_reduces_reach_and_hits_budget(self) -> None:
        plain = g.max_detectable_depth(0.3, 5.0, 60.0, False)
        spread = g.max_detectable_depth(0.3, 5.0, 60.0, True)
        self.assertLess(spread, plain)
        level = 20 * math.log10(0.3) - g.path_loss_db(spread, 5.0, True)
        self.assertAlmostEqual(level, -60.0, places=6)

    def test_return_profile_consistent_with_max_depth(self) -> None:
        data = g.model([20.0], [3.0], max_depth=3.0, step=0.1, soil_sigmas=[30.0])
        t = data["results"][0]["targets"][0]
        d_max = t["max_detectable_depth_m"]
        for row in t["return_profile"]:
            self.assertEqual(row["detectable"], row["depth_m"] <= d_max, row)


class ModelOutput(unittest.TestCase):
    def test_sigma_pairing_and_shape(self) -> None:
        data = g.model([15.0, 25.0], [3.0, 9.0], soil_sigmas=[10.0, 60.0])
        self.assertEqual([s["soil_sigma_mS_per_m"] for s in data["results"]], [10.0, 60.0])
        self.assertEqual(len(data["results"][0]["depth_profile"]), 13)
        self.assertEqual(len(data["results"][1]["targets"]), 2)
        json.dumps(data, allow_nan=False)

    def test_cli_writes_valid_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "r.json")
            with contextlib.redirect_stdout(io.StringIO()) as buf:
                g.main(["--soil", "20", "--sigma", "30", "--target", "3", "16.4", "--spreading", "--out", out])
            self.assertIn("REFLECTION & DETECTION", buf.getvalue())
            with open(out) as f:
                data = json.load(f)
        self.assertTrue(data["parameters"]["geometric_spreading"])
        self.assertEqual(data["results"][0]["soil_sigma_mS_per_m"], 30.0)


if __name__ == "__main__":
    unittest.main()
