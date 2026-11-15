"""Behavior checks for graph selection, mandatory rules, and cache invalidation."""
import sys
import importlib
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
# 2026-11-10: dynamic lookup follows the explicit test import path setup.
# from context_graph import build_graph, select_context
build_graph = importlib.import_module("context_graph").build_graph
select_context = importlib.import_module("context_graph").select_context


class GraphTests(unittest.TestCase):
    def test_relevance_references_and_invalidation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "standards").mkdir()
            (root / "AGENTS.md").write_text("Owner instructions", encoding="utf-8")
            (root / "START_HERE_CALL_CHAIN.md").write_text("Pipeline", encoding="utf-8")
            (root / "MASTER.md").write_text("Precedence", encoding="utf-8")
            (root / "VISITING_AGENTS.md").write_text("Guest contract", encoding="utf-8")
            (root / "standards/billing.md").write_text("Stripe checkout [policy](policy.md)", encoding="utf-8")
            policy = root / "standards/policy.md"
            policy.write_text("Payments policy", encoding="utf-8")
            (root / "standards/unrelated.md").write_text("Flowers gardening", encoding="utf-8")
            selected = select_context(root, "Stripe checkout")
            self.assertIn("standards/billing.md", selected["paths"])
            self.assertIn("standards/policy.md", selected["paths"])
            self.assertNotIn("standards/unrelated.md", selected["paths"])
            self.assertIn("AGENTS.md", selected["paths"])
            self.assertIn("MASTER.md", selected["paths"])
            self.assertIn("VISITING_AGENTS.md", selected["paths"])
            policy.write_text("Changed policy", encoding="utf-8")
            self.assertIn("Changed policy", select_context(root, "Stripe checkout")["content"])
            self.assertLess(selected["selected_chars"], selected["full_chars"])
            with self.assertRaises(ValueError):
                select_context(root, "Stripe", max_chars=1)

    def test_symlink_and_escape_excluded(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "AGENTS.md").write_text("[external](../outside.md)", encoding="utf-8")
            (root / "START_HERE_CALL_CHAIN.md").write_text("pipeline", encoding="utf-8")
            docs, edges = build_graph(root)
            self.assertEqual(2, len(docs))
            self.assertFalse(edges["AGENTS.md"])


if __name__ == "__main__":
    unittest.main()
