"""Offline regressions for the inherited PoT paid lane, 2026-11-15.

No test contacts a provider: request construction, urlopen, and sockets are
observed or blocked. Gate-on responses are explicitly local test fixtures.
"""

import io
import importlib.util
import json
import os
import socket
import unittest
from pathlib import Path
from unittest.mock import patch

MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "pot_research_engine.py"
SPEC = importlib.util.spec_from_file_location("pot_research_engine", MODULE_PATH)
research = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(research)


class ResearchSpendGateTests(unittest.TestCase):
    def setUp(self):
        research.calls["n"] = 0
        self.network = patch.object(
            socket.socket, "connect", side_effect=AssertionError("network forbidden")
        )
        self.network.start()
        self.addCleanup(self.network.stop)

    def test_closed_gate_with_key_refuses_before_request_without_retry(self):
        for gate in (None, "0", "", "true", "yes", "on"):
            with self.subTest(gate=gate):
                research.calls["n"] = 0
                env = {"LLM_API_KEY": "offline-test-key"}
                if gate is not None:
                    env["REVVEL_LLM_ALLOW_CLOUD"] = gate
                with patch.dict(os.environ, env, clear=True), patch.object(
                    research.urllib.request, "Request"
                ) as request, patch.object(research.urllib.request, "urlopen") as send:
                    with self.assertRaisesRegex(
                        RuntimeError, "pot_research_engine.llm.*REVVEL_LLM_ALLOW_CLOUD"
                    ):
                        research.llm("offline question")
                    request.assert_not_called()
                    send.assert_not_called()
                    self.assertEqual(research.calls["n"], 1)

    def test_missing_key_preserves_repeatable_dry_run_without_network(self):
        for gate in (None, "0", "1"):
            with self.subTest(gate=gate):
                env = {} if gate is None else {"REVVEL_LLM_ALLOW_CLOUD": gate}
                with patch.dict(os.environ, env, clear=True), patch.object(
                    research.urllib.request, "Request"
                ) as request, patch.object(research.urllib.request, "urlopen") as send:
                    first = research.llm("repeatable offline question")
                    self.assertRegex(first, r"^\[dry-run answer \d{4}\]$")
                    self.assertEqual(research.llm("repeatable offline question"), first)
                    request.assert_not_called()
                    send.assert_not_called()

    def test_open_gate_uses_only_mock_response(self):
        payload = {"choices": [{"message": {"content": "OFFLINE MOCK completion"}}]}
        response = io.BytesIO(json.dumps(payload).encode())
        with patch.dict(
            os.environ,
            {"REVVEL_LLM_ALLOW_CLOUD": "1", "LLM_API_KEY": "offline-test-key"},
            clear=True,
        ), patch.object(research.urllib.request, "urlopen", return_value=response) as send:
            self.assertEqual(research.llm("offline question"), "OFFLINE MOCK completion")
            send.assert_called_once()
            request = send.call_args.args[0]
            self.assertEqual(request.get_method(), "POST")
            self.assertEqual(json.loads(request.data)["messages"][0]["content"], "offline question")
            self.assertEqual(send.call_args.kwargs["timeout"], 60)

    def test_open_gate_provider_failure_is_not_retried_or_faked(self):
        with patch.dict(
            os.environ,
            {"REVVEL_LLM_ALLOW_CLOUD": "1", "LLM_API_KEY": "offline-test-key"},
            clear=True,
        ), patch.object(
            research.urllib.request, "urlopen", side_effect=RuntimeError("mock provider refused")
        ) as send:
            with self.assertRaisesRegex(RuntimeError, "mock provider refused"):
                research.llm("offline question")
            send.assert_called_once()

    def test_keyless_tree_logic_still_executes(self):
        with patch.dict(os.environ, {"REVVEL_LLM_ALLOW_CLOUD": "0"}, clear=True), patch.object(
            research.urllib.request, "urlopen"
        ) as send:
            root = research.Node("offline tree question")
            research.mcts(root, iterations=3)
            self.assertEqual(root.visits, 3)
            self.assertTrue(root.children)
            self.assertIsNotNone(root.answer)
            send.assert_not_called()


if __name__ == "__main__":
    unittest.main(verbosity=2)
