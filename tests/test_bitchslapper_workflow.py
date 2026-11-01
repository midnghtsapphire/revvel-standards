"""Validate workflow registration without spawning any child sessions."""
import runpy
import unittest
from pathlib import Path


WORKFLOW = Path(__file__).resolve().parents[1] / "workflows" / "bitchslapper.py"


class RegistrationCaptured(Exception):
    """Stop before any agents or external effects run."""


class WorkflowRegistrationTests(unittest.TestCase):
    def setUp(self):
        self.metadata = None
        self.agent_calls = 0

        async def register(metadata):
            self.metadata = metadata
            raise RegistrationCaptured

        async def agent(*args, **kwargs):
            self.agent_calls += 1
            raise AssertionError("registration validation must not spawn agents")

        with self.assertRaises(RegistrationCaptured):
            runpy.run_path(str(WORKFLOW), init_globals={
                "register_workflow": register,
                "agent": agent,
            })

    def test_required_registration_fields(self):
        for field in ("name", "description"):
            self.assertTrue(self.metadata[field].strip())
        self.assertGreater(len(self.metadata["phases"]), 0)
        for phase in self.metadata["phases"]:
            for field in ("title", "detail"):
                self.assertIsInstance(phase[field], str)
                self.assertTrue(phase[field].strip())

    def test_six_agent_architecture_parallel_integration_graph(self):
        phases = self.metadata["phases"]
        self.assertEqual([phase["title"] for phase in phases], [
            "Architecture contract", "Parallel implementation", "Integrate and verify",
        ])
        self.assertEqual([len(phase["labels"]) for phase in phases], [1, 4, 1])
        labels = [label for phase in phases for label in phase["labels"]]
        self.assertEqual(len(labels), len(set(labels)))

    def test_registration_precedes_agent_side_effects(self):
        self.assertIsNotNone(self.metadata)
        self.assertEqual(self.agent_calls, 0)


if __name__ == "__main__":
    unittest.main()
