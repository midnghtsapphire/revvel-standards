import sys
import importlib
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
# 2026-11-10: dynamic lookup follows the explicit test import path setup.
# from prompt_compression import compress_context
compress_context = importlib.import_module("prompt_compression").compress_context


class Compressor:
    def __init__(self, output):
        self.output = output

    def compress_prompt(self, text, **kwargs):
        self.options = kwargs
        return {"compressed_prompt": self.output, "origin_tokens": 100, "compressed_tokens": 30}


class CompressionTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
