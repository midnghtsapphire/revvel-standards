import sys
import importlib
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
# 2026-11-10: dynamic lookup follows the explicit test import path setup.
# from wr_langgraph import persistent_workflow
persistent_workflow = importlib.import_module("wr_langgraph").persistent_workflow


class LifecycleTests(unittest.TestCase):
    def test_healing_checkpoint_and_approval_survive_restart(self):
        from langgraph.types import Command
        calls = []

        def action(name):
            def run(state):
                calls.append(name)
                if name == "test":
                    return {"test_passed": state["attempts"] >= 2}
                return {}
            return run
        actions = {name: action(name) for name in ("intake", "research", "build", "test", "heal", "deploy")}
        config = {"configurable": {"thread_id": "wr-18337"}}
        with tempfile.TemporaryDirectory() as directory:
            db = str(Path(directory) / "checkpoints.sqlite")
            with persistent_workflow(actions, db) as graph:
                result = graph.invoke({"issue": 18337}, config)
                self.assertIn("__interrupt__", result)
                self.assertEqual(2, result["attempts"])
                self.assertNotIn("deploy", calls)
            with persistent_workflow(actions, db) as graph:
                result = graph.invoke(Command(resume=True), config)
                self.assertEqual("deploy", result["status"])
                self.assertEqual(1, calls.count("research"))
                self.assertEqual(1, calls.count("deploy"))

    def test_retry_budget_stops_failing_builds(self):
        actions = {name: lambda state: {} for name in ("intake", "research", "build", "heal", "deploy")}
        actions["test"] = lambda state: {"test_passed": False}
        with tempfile.TemporaryDirectory() as directory:
            with persistent_workflow(actions, str(Path(directory) / "state.sqlite"), 2) as graph:
                result = graph.invoke({"issue": 1}, {"configurable": {"thread_id": "failed"}})
                self.assertEqual(2, result["attempts"])
                self.assertEqual("test", result["status"])


if __name__ == "__main__":
    unittest.main()
