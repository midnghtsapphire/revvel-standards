import sys
import importlib
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
# 2026-11-10: dynamic lookup follows the explicit test import path setup.
# from optimize_agent_prompts import optimize, score_output
optimize = importlib.import_module("optimize_agent_prompts").optimize
score_output = importlib.import_module("optimize_agent_prompts").score_output


class OptimizerTests(unittest.TestCase):
    def test_prior_candidate_is_preserved_before_optional_import(self):
        with tempfile.TemporaryDirectory() as directory:
            candidate = Path(directory) / "candidate.json"
            candidate.write_text("prior result", encoding="utf-8")
            with self.assertRaises(FileExistsError):
                optimize({}, "", "model", "http://127.0.0.1:1234/v1", candidate)
            self.assertEqual("prior result", candidate.read_text())

    def test_feedback_identifies_missing_criteria(self):
        result = score_output(["tests", "rollback"], "Tests passed")
        self.assertEqual(0.5, result["score"])
        self.assertIn("rollback", result["feedback"])

    def test_cloud_endpoint_and_data_leakage_rejected_before_import(self):
        with self.assertRaises(ValueError):
            optimize({}, "", "model", "https://api.openai.com/v1", Path("unused"))
        repeated = {name: [{"request": "same", "required_terms": ["test"]}]
                    for name in ("train", "validation", "test")}
        with self.assertRaises(ValueError):
            optimize(repeated, "", "model", "http://127.0.0.1:1234/v1", Path("unused"))


if __name__ == "__main__":
    unittest.main()
