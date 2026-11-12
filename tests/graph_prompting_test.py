"""Graph prompting checks for WR 18336.

Typed edges, the routed subgraph cache, the committed artifact, and the
local token measurement. The accuracy harness is refused here so this suite
cannot bill a provider.
"""
import importlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
cg = importlib.import_module("context_graph")

REPO = Path(__file__).resolve().parents[1]


def _governance(root: Path) -> None:
    (root / "standards").mkdir()
    (root / "AGENTS.md").write_text("Owner instructions", encoding="utf-8")
    (root / "START_HERE_CALL_CHAIN.md").write_text("Pipeline", encoding="utf-8")
    (root / "MASTER.md").write_text("Precedence", encoding="utf-8")
    (root / "VISITING_AGENTS.md").write_text("Guest contract", encoding="utf-8")


class TypedGraphTests(unittest.TestCase):
    def test_edge_types_cache_and_reference_text(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            _governance(root)
            (root / "standards" / "billing.md").write_text(
                "Stripe checkout [policy](policy.md) and [form](form.yml)",
                encoding="utf-8",
            )
            (root / "standards" / "policy.md").write_text("Payments policy", encoding="utf-8")
            (root / "standards" / "form.yml").write_text("id: work\n", encoding="utf-8")
            (root / "standards" / "unrelated.md").write_text("Flowers gardening", encoding="utf-8")
            document = cg.graph_document(root)
            edges = document["edges"]
            self.assertIn(
                {"from": "standards/policy.md", "to": "standards/billing.md", "type": "referenced_by"},
                edges,
            )
            self.assertIn(
                {"from": "standards/billing.md", "to": "standards/policy.md", "type": "governs"},
                edges,
            )
            self.assertIn(
                {"from": "standards/form.yml", "to": "standards/billing.md", "type": "populates"},
                edges,
            )
            first = cg.route_query(root, "Stripe checkout")
            second = cg.route_query(root, "Stripe checkout")
            self.assertFalse(first["cache_hit"])
            self.assertTrue(second["cache_hit"])
            self.assertEqual(first["paths"], second["paths"])
            self.assertIn("standards/billing.md", first["paths"])
            self.assertIn("standards/policy.md", first["paths"])
            self.assertNotIn("standards/unrelated.md", first["paths"])
            self.assertNotIn("Owner instructions", first["reference_text"])
            self.assertIn("Stripe checkout", first["reference_text"])
            paths = set(first["paths"])
            for edge in first["subgraph_edges"]:
                self.assertIn(edge["from"], paths)
                self.assertIn(edge["to"], paths)
            self.assertLess(first["selected_tokens"], first["full_tokens"])
            (root / "standards" / "policy.md").write_text("Changed policy text", encoding="utf-8")
            third = cg.route_query(root, "Stripe checkout")
            self.assertFalse(third["cache_hit"])
            self.assertIn("Changed policy text", third["content"])

    def test_tokenizer_is_local_and_stable(self):
        self.assertEqual(1, cg.count_tokens("abcd"))
        self.assertEqual(2, cg.count_tokens("abcde"))
        self.assertEqual(cg.count_tokens("Stripe checkout"), cg.count_tokens("Stripe checkout"))
        self.assertEqual("revvel-local-4byte", cg.TOKENIZER_NAME)

    def test_accuracy_harness_refuses_without_approval(self):
        previous = os.environ.pop("REVVEL_GRAPH_ACCURACY_APPROVED", None)
        try:
            code = cg.execute_accuracy(REPO, [{"id": "x", "query": "ledger handoff"}])
        finally:
            if previous is not None:
                os.environ["REVVEL_GRAPH_ACCURACY_APPROVED"] = previous
        self.assertEqual(2, code)
        source = (REPO / "scripts" / "context_graph.py").read_text(encoding="utf-8")
        self.assertNotIn("openrouter.ai", source)


class CommittedArtifactTests(unittest.TestCase):
    def test_generator_matches_committed_files_and_clears_sixty_percent(self):
        graph = REPO / "docs" / "graph-prompting" / "standards-context-graph.json"
        queries = REPO / "docs" / "graph-prompting" / "sample-queries.json"
        measured = REPO / "docs" / "graph-prompting" / "token-measurements.json"
        accuracy = REPO / "docs" / "graph-prompting" / "accuracy-benchmark.json"
        self.assertEqual(0, cg.main(["build", "--root", str(REPO), "--out", str(graph), "--check"]))
        self.assertEqual(
            0,
            cg.main([
                "measure", "--root", str(REPO), "--queries", str(queries),
                "--out", str(measured), "--check",
            ]),
        )
        self.assertEqual(
            0,
            cg.main([
                "accuracy-harness", "--root", str(REPO), "--queries", str(queries),
                "--out", str(accuracy), "--check",
            ]),
        )
        report = json.loads(measured.read_text(encoding="utf-8"))
        self.assertGreaterEqual(report["mean_reduction_percent"], 60)
        self.assertTrue(report["meets_60_percent_mean"])
        self.assertEqual("revvel-local-4byte", report["tokenizer"]["name"])
        for row in report["queries"]:
            self.assertTrue(row["expect_included"], row["id"])
            self.assertLess(row["selected_tokens"], row["full_tokens"])
            self.assertLess(row["selected_documents"], row["full_documents"])
        status = json.loads(accuracy.read_text(encoding="utf-8"))
        self.assertEqual("pending-owner-approved-spend", status["status"])
        self.assertFalse(status["measured"])
        kinds = {edge["type"] for edge in json.loads(graph.read_text(encoding="utf-8"))["edges"]}
        self.assertTrue({"governs", "referenced_by", "populates"} <= kinds)


if __name__ == "__main__":
    unittest.main()
