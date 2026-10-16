import hashlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hfmr import HYPOTHESES, CalibratedModel, Ledger, Observation, infer  # noqa: E402


class TestHFMR(unittest.TestCase):
    def model(self):
        return CalibratedModel(
            means={h: {"demo": i} for i, h in enumerate(HYPOTHESES)},
            intrinsic_sd={h: {"demo": 0.5} for h in HYPOTHESES},
            priors={h: 0.2 for h in HYPOTHESES},
            calibration_id="SYNTHETIC-TEST-ONLY",
        )

    def test_posterior_normalizes(self):
        o = Observation("demo", 1.0, 0.1, "group-a", "a" * 64)
        p = infer([o], self.model())["posterior"]
        self.assertAlmostEqual(sum(p.values()), 1)
        self.assertEqual(max(p, key=p.get), "metal")

    def test_dependency_rejected(self):
        o = Observation("demo", 1, 0.1, "same", "a" * 64)
        with self.assertRaises(ValueError):
            infer([o, o], self.model())

    def test_ledger_tamper(self):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "ledger.jsonl"
            ledger = Ledger(f)
            head = ledger.append({"action": "ingest", "sha256": "a" * 64})
            self.assertTrue(ledger.verify(head))
            f.write_bytes(f.read_bytes().replace(b"ingest", b"change"))
            self.assertFalse(ledger.verify(head))

    def test_head_detects_truncation(self):
        with tempfile.TemporaryDirectory() as d:
            ledger = Ledger(Path(d) / "ledger.jsonl")
            ledger.append({"a": 1})
            head = ledger.append({"a": 2})
            ledger.path.write_bytes(ledger.path.read_bytes().splitlines()[0] + b"\n")
            self.assertFalse(ledger.verify(head))

    def test_out_of_distribution_abstains(self):
        r = infer([Observation("demo", 1e6, 0.1, "g", "a" * 64)], self.model())
        self.assertEqual(r["decision"], "abstain")
        self.assertIsNone(r["posterior"])
        self.assertGreater(r["best_fit_z"], 4.0)
        ok = infer([Observation("demo", 2.1, 0.1, "g", "a" * 64)], self.model())
        self.assertEqual(ok["decision"], "posterior")

    def test_non_finite_calibrated_mean_rejected(self):
        m = self.model()
        for bad in (float("nan"), float("inf")):
            means = {h: dict(m.means[h]) for h in HYPOTHESES}
            means["void"]["demo"] = bad
            model = CalibratedModel(means, m.intrinsic_sd, m.priors, "X")
            with self.assertRaisesRegex(ValueError, "invalid calibrated mean"):
                infer([Observation("demo", 1.0, 0.1, "g", "a" * 64)], model)

    def test_invalid_ood_limit_rejected(self):
        o = Observation("demo", 1e6, 0.1, "g", "a" * 64)
        for bad in (float("nan"), float("inf"), -1.0, 0.0):
            with self.assertRaisesRegex(ValueError, "ood_z_limit"):
                infer([o], self.model(), ood_z_limit=bad)

    def test_non_standard_json_constant_fails_verification(self):
        with tempfile.TemporaryDirectory() as d:
            ledger = Ledger(Path(d) / "ledger.jsonl")
            # Original:
            # line = '{"sequence": 0, "previous_hash": "%s", "event": {"x": NaN}, "entry_hash": "0"}\n' % ("0" * 64)
            #   entry_hash "0" can never match, so the test passed even if NaN were accepted.
            #   The hash is now computed with permissive encoding, so only the NaN rejection fails it.
            body = {"sequence": 0, "previous_hash": "0" * 64, "event": {"x": float("nan")}}
            digest = hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
            line = json.dumps(dict(body, entry_hash=digest)) + "\n"
            ledger.path.write_text(line)
            self.assertFalse(ledger.verify())
            self.assertFalse(ledger.verify(digest))

    def test_unknown_sensor_is_value_error(self):
        with self.assertRaisesRegex(ValueError, "no calibration"):
            infer([Observation("other-sensor", 1.0, 0.1, "g", "a" * 64)], self.model())

    def test_model_must_cover_every_hypothesis(self):
        m = self.model()
        bad = CalibratedModel({h: m.means[h] for h in HYPOTHESES[:-1]}, m.intrinsic_sd, m.priors, "X")
        with self.assertRaisesRegex(ValueError, "means must define every hypothesis"):
            bad.validate()

    def test_empty_observations_rejected(self):
        with self.assertRaisesRegex(ValueError, "no observations"):
            infer([], self.model())

    def test_corrupt_tail_fails_verification_without_crashing(self):
        with tempfile.TemporaryDirectory() as d:
            ledger = Ledger(Path(d) / "ledger.jsonl")
            head = ledger.append({"a": 1})
            ledger.path.write_bytes(ledger.path.read_bytes() + b'{"bad')
            self.assertFalse(ledger.verify(head))
            ledger.path.write_bytes(b"[1, 2]\n")
            self.assertFalse(ledger.verify())

    def test_concurrent_appends_keep_chain_valid(self):
        import threading

        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "ledger.jsonl"
            threads = [threading.Thread(target=lambda i=i: Ledger(path).append({"i": i})) for i in range(20)]
            for th in threads:
                th.start()
            for th in threads:
                th.join()
            ledger = Ledger(path)
            self.assertEqual(len(ledger.read()), 20)
            self.assertTrue(ledger.verify())


if __name__ == "__main__":
    unittest.main()
