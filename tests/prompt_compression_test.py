import json
import os
import sys
import importlib
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
# 2026-11-10: dynamic lookup follows the explicit test import path setup.
# from prompt_compression import compress_context
compress_context = importlib.import_module("prompt_compression").compress_context
compression = importlib.import_module("prompt_compression")
accuracy = importlib.import_module("prompt_compression_accuracy")


class Compressor:
    def __init__(self, output):
        self.output = output

    def compress_prompt(self, text, **kwargs):
        self.options = kwargs
        return {"compressed_prompt": self.output, "origin_tokens": 100, "compressed_tokens": 30}


class Shrink:
    """Stand-in for PromptCompressor. Keeps force tokens that are in the text
    and reports a fixed 100 -> 30 token count so reduction math is exact."""

    def __init__(self):
        self.rates = []
        self.forced = None

    def compress_prompt(self, text, **kwargs):
        self.rates.append(kwargs["rate"])
        self.forced = list(kwargs["force_tokens"])
        kept = [term for term in kwargs["force_tokens"] if term in text]
        body = text[:max(1, int(len(text) * kwargs["rate"]))]
        return {
            "compressed_prompt": body + "\n" + " ".join(kept),
            "origin_tokens": 100,
            "compressed_tokens": 30,
        }


class CompressionTests(unittest.TestCase):
    def setUp(self):
        # A developer shell may export these. Tests pin the defaults.
        self._saved_env = {
            name: os.environ.pop(name, None)
            for name in ("REVVEL_FORCE_TOKENS", "REVVEL_LLMLINGUA_MODEL")
        }

    def tearDown(self):
        for name, value in self._saved_env.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value

    def test_empty_references_do_not_load_optional_model(self):
        # No compressor injected and optional llmlingua is absent on this host.
        result = compress_context("")
        self.assertEqual("empty-reference-context", result["reason"])
        self.assertFalse(result["compressed"])

    def test_accepts_measured_output_and_forces_critical_terms(self):
        engine = Compressor("UPREV WR MCP")
        result = compress_context("UPREV verbose WR reference MCP", compressor=engine)
        self.assertTrue(result["compressed"])
        self.assertEqual(30, result["compressed_tokens"])
        self.assertEqual(["UPREV", "WR", "MCP"], engine.options["force_tokens"])

    def test_rejects_term_loss_and_invalid_rate(self):
        result = compress_context("WR rules", compressor=Compressor("rules"))
        self.assertEqual("WR rules", result["content"])
        self.assertFalse(result["compressed"])
        with self.assertRaises(ValueError):
            compress_context("WR", rate=0, compressor=Compressor("WR"))

    def test_wr_inside_another_word_is_not_the_critical_term(self):
        # WRONG and WRAPPED contain the letters WR. They are not the term WR.
        kept = compress_context("WRONG approach and a WRAPPED table", compressor=Compressor("approach table"))
        self.assertTrue(kept["compressed"])
        lost = compress_context("WR rules", compressor=Compressor("rules"))
        self.assertFalse(lost["compressed"])
        self.assertEqual(["WR"], lost["missing_terms"])

    def test_rate_is_forwarded_and_defaults_to_keep_thirty_percent(self):
        engine = Shrink()
        compress_context("UPREV WR MCP keep this sentence", compressor=engine)
        self.assertEqual([0.3], engine.rates)
        custom = Shrink()
        compress_context("UPREV WR MCP", rate=0.5, compressor=custom)
        self.assertEqual([0.5], custom.rates)

    def test_rate_rejects_bool_and_out_of_range(self):
        engine = Compressor("WR")
        for bad in (True, False, 0, 1.1, -0.2, "0.3"):
            with self.assertRaises(ValueError):
                compress_context("WR", rate=bad, compressor=engine)

    def test_extra_force_tokens_from_argument_and_env(self):
        engine = Shrink()
        compress_context("UPREV WR MCP POLAR", compressor=engine, force_tokens=["POLAR"])
        self.assertEqual(["UPREV", "WR", "MCP", "POLAR"], engine.forced)
        os.environ["REVVEL_FORCE_TOKENS"] = "LEDGER, WR"
        env_engine = Shrink()
        compress_context("UPREV WR MCP LEDGER", compressor=env_engine)
        self.assertEqual(["UPREV", "WR", "MCP", "LEDGER"], env_engine.forced)

    def test_force_token_cap_matches_llmlingua_limit(self):
        allowed = [f"T{i}" for i in range(97)]
        self.assertEqual(100, len(compression.resolve_force_tokens(allowed)))
        with self.assertRaises(ValueError):
            compression.resolve_force_tokens([f"T{i}" for i in range(98)])

    def test_reduction_ratio_is_origin_over_compressed(self):
        report = compression.reduction_from_counts(200, 50)
        self.assertEqual(4.0, report["ratio"])
        self.assertEqual(0.25, report["kept_fraction"])
        self.assertIsNone(compression.reduction_from_counts(0, 0)["ratio"])
        self.assertIsNone(compression.reduction_from_counts(10, None)["ratio"])
        with self.assertRaises(ValueError):
            compression.reduction_from_counts(-1, 1)

    def test_measure_real_governance_docs_with_injected_compressor(self):
        root = Path(__file__).resolve().parents[1]
        engine = Shrink()
        report = compression.measure_governance(root, compressor=engine)
        self.assertIn("AGENTS.md", report["mandatory_paths"])
        reference_paths = [row["path"] for row in report["reference_subset"]["rows"]]
        full_paths = [row["path"] for row in report["full_governance"]["rows"]]
        self.assertNotIn("AGENTS.md", reference_paths)
        self.assertIn("AGENTS.md", full_paths)
        self.assertIn("standards/LEDGER_STANDARD.md", full_paths)
        self.assertGreater(report["full_governance"]["files"], report["reference_subset"]["files"])
        self.assertEqual(0, report["full_governance"]["rejected_files"])
        guarded = report["full_governance"]["guarded"]
        self.assertAlmostEqual(guarded["origin_tokens"] / guarded["compressed_tokens"], guarded["ratio"])
        self.assertAlmostEqual(100 / 30, guarded["ratio"])
        self.assertTrue(all(rate == 0.3 for rate in engine.rates))
        self.assertEqual(["UPREV", "WR", "MCP"], engine.forced)

    def test_rejected_compression_does_not_count_as_savings(self):
        rows = [compression.measure_document(
            "standards/EXAMPLE.md", "WR must stay", 0.3, Compressor("dropped"), None,
        )]
        summary = compression.summarize_rows(rows)
        self.assertEqual(1, summary["rejected_files"])
        self.assertEqual(summary["guarded"]["origin_tokens"], summary["guarded"]["compressed_tokens"])
        self.assertAlmostEqual(1.0, summary["guarded"]["ratio"])
        self.assertAlmostEqual(100 / 30, summary["raw_model"]["ratio"])

    def test_measure_does_not_write_or_clobber_by_default(self):
        args = compression.build_parser().parse_args(["measure"])
        self.assertIsNone(args.output)
        self.assertIsNone(compression.measurement_destination(None))
        self.assertIsNone(compression.measurement_destination(""))
        record = Path(__file__).resolve().parents[1] / "wr/measurements/llmlingua2-governance-2026-11-11.json"
        with self.assertRaises(FileExistsError):
            compression.measurement_destination(record)
        with tempfile.TemporaryDirectory() as tmp:
            fresh = Path(tmp) / "next.json"
            self.assertEqual(fresh, compression.measurement_destination(fresh))
            fresh.write_text("{}\n", encoding="utf-8")
            with self.assertRaises(FileExistsError):
                compression.write_measurement({}, fresh)

    def test_measure_status_is_nonzero_when_terms_were_lost(self):
        clean = {"full_governance": {"rejected_files": 0}}
        lost = {"full_governance": {"rejected_files": 3}}
        self.assertEqual(0, compression.measure_status(clean))
        self.assertEqual(2, compression.measure_status(lost))

    def test_committed_governance_measurement(self):
        # Numbers from the local CPU run on 2026-11-11. Compared values are
        # the JSON file versus these literals, and each ratio versus
        # origin_tokens / compressed_tokens in that same file.
        path = Path(__file__).resolve().parents[1] / "wr/measurements/llmlingua2-governance-2026-11-11.json"
        payload = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(
            "microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank",
            payload["model"],
        )
        self.assertEqual(0.3, payload["rate"])
        self.assertEqual(["UPREV", "WR", "MCP"], payload["force_tokens"])
        self.assertIs(False, payload["paid_calls"])
        self.assertEqual("pending-owner-approved-spend", payload["accuracy_benchmark"]["status"])
        full = payload["full_governance"]
        reference = payload["reference_subset"]
        self.assertEqual(141, full["files"])
        self.assertEqual(0, full["rejected_files"])
        self.assertEqual(137, reference["files"])
        self.assertEqual(0, reference["rejected_files"])
        self.assertEqual(299593, full["guarded"]["origin_tokens"])
        self.assertEqual(89978, full["guarded"]["compressed_tokens"])
        self.assertEqual(285009, reference["guarded"]["origin_tokens"])
        self.assertEqual(85707, reference["guarded"]["compressed_tokens"])
        for section in (full, reference):
            guarded = section["guarded"]
            self.assertAlmostEqual(
                guarded["origin_tokens"] / guarded["compressed_tokens"], guarded["ratio"],
            )
            self.assertGreaterEqual(guarded["ratio"], 2)
            self.assertLessEqual(guarded["ratio"], 5)
            for row in section["rows"]:
                self.assertEqual([], row["missing_terms"])
                self.assertTrue(row["compressed"])
        scored = accuracy.score_measurement(payload)
        self.assertEqual(1.0, scored["full_governance"]["term_preservation_rate"])
        self.assertEqual(1.0, scored["reference_subset"]["term_preservation_rate"])

    def test_accuracy_harness_scores_tokens_and_refuses_paid_judge(self):
        payload = {
            "model": "microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank",
            "paid_calls": False,
            "full_governance": {
                "files": 1,
                "accepted_files": 1,
                "rejected_files": 0,
                "guarded": {"origin_tokens": 300, "compressed_tokens": 100, "ratio": 3.0,
                            "kept_fraction": 1 / 3},
                "rows": [{
                    "path": "AGENTS.md", "chars": 10, "origin_tokens": 300,
                    "compressed_tokens": 100, "guarded_tokens": 100,
                    "compressed": True, "missing_terms": [],
                }],
            },
        }
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "measure.json"
            path.write_text(json.dumps(payload), encoding="utf-8")
            code = accuracy.main(["--measurement", str(path)])
            paid = accuracy.main(["--measurement", str(path), "--execute-paid-judge"])
        self.assertEqual(0, code)
        self.assertEqual(3, paid)
        scored = accuracy.score_measurement(payload)
        self.assertEqual(1.0, scored["full_governance"]["term_preservation_rate"])
        self.assertEqual(3.0, scored["full_governance"]["guarded_ratio"])
        self.assertEqual("pending-owner-approved-spend", scored["model_quality"]["status"])


if __name__ == "__main__":
    unittest.main()
