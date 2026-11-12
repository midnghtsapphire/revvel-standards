"""Offline tests for the DSPy GEPA integration (WR #18338).

Requires the pinned DSPy environment (scripts/dspy_gepa/requirements.lock).
No API key and no network call. The live optimizer is not invoked.
"""

from __future__ import annotations

import importlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

budget = importlib.import_module("dspy_gepa.budget")
config_mod = importlib.import_module("dspy_gepa.config")
optimize = importlib.import_module("dspy_gepa.optimize")
scorecard = importlib.import_module("dspy_gepa.scorecard_metric")
trainset = importlib.import_module("dspy_gepa.trainset")
versions = importlib.import_module("dspy_gepa.versions")


class ScorecardMetricTests(unittest.TestCase):
    def test_clean_signals_score_high(self):
        graded = scorecard.quality_score({"ciGreen": True})
        self.assertGreaterEqual(graded["score"], 95)
        self.assertEqual(1, graded["dimensions"]["hallucination"])

    def test_hallucination_is_weighted_harder_than_rash(self):
        hallu = scorecard.quality_score({"ciGreen": True, "unresolvedRefs": 3})["score"]
        rash = scorecard.quality_score({"ciGreen": True, "forceAmends": 6})["score"]
        self.assertLess(hallu, rash)

    def test_feedback_names_the_missing_term_and_the_dimension(self):
        graded = scorecard.score_response(
            "Work request #18338: keep the rollback test.",
            "I changed several files.",
            ["#18338", "rollback"],
        )
        self.assertLess(graded["score"], 1)
        self.assertIn("rollback", graded["feedback"])
        self.assertIn("hallucination", graded["feedback"])
        self.assertIn("ci", graded["feedback"])

    def test_invented_issue_and_delete_are_called_out(self):
        graded = scorecard.score_response(
            "Work request #18338: add npm test.",
            "Delete the old module and cite #99999 plus `scripts/missing.py`.",
            ["#18338"],
        )
        self.assertIn("#99999", graded["feedback"])
        self.assertIn("delete", graded["feedback"])
        self.assertGreater(graded["signals"]["unresolvedRefs"], 0)

    def test_covered_answer_beats_a_bare_answer(self):
        request = "Work request #18338: add the offline check."
        terms = ["#18338", "offline"]
        bare = scorecard.score_response(request, "Done.", terms)
        covered = scorecard.score_response(
            request,
            "feat: add the offline check for #18338 and run npm test.",
            terms,
        )
        self.assertGreater(covered["score"], bare["score"])
        self.assertIn("All scorecard dimensions are covered.", covered["feedback"])


class TrainsetTests(unittest.TestCase):
    def _write_issue(self, directory: Path, issue_id: int, extra: str) -> None:
        path = directory / "issue-{0}-sample.md".format(issue_id)
        path.write_text(
            "# WR: sample {0}\n\n- [ ] keep term{1} visible\n".format(issue_id, extra),
            encoding="utf-8",
        )

    def test_splits_are_disjoint_and_cover_numbered_files(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            for issue_id in range(1, 121):
                self._write_issue(folder, issue_id, "a")
            payload = trainset.build_trainset(folder)
            self.assertEqual(120, payload["examples"])
            counts = payload["counts"]
            self.assertEqual(120, sum(counts.values()))
            self.assertGreater(counts["train"], 0)
            self.assertGreater(counts["validation"], 0)
            self.assertGreater(counts["test"], 0)
            self.assertLessEqual(counts["validation"], 24)
            ids = []
            for name in ("train", "validation", "test"):
                ids.extend(row["issue"] for row in payload["splits"][name])
            self.assertEqual(120, len(set(ids)))

    def test_historical_wr_archive_meets_the_minimum(self):
        payload = trainset.build_trainset(ROOT / "wr" / "issues")
        self.assertGreaterEqual(payload["files_seen"], payload["examples"])
        self.assertGreaterEqual(payload["examples"], 100)
        self.assertTrue(payload["meets_minimum"])
        committed = ROOT / "wr" / "memory" / "dspy-gepa-trainset.json"
        saved = json.loads(committed.read_text(encoding="utf-8"))
        self.assertEqual(payload["examples"], saved["examples"])
        self.assertEqual(payload["counts"], saved["counts"])
        fresh_ids = sorted(row["issue"] for rows in payload["splits"].values() for row in rows)
        saved_ids = sorted(row["issue"] for rows in saved["splits"].values() for row in rows)
        self.assertEqual(fresh_ids, saved_ids)


class VersionWriterTests(unittest.TestCase):
    def test_append_keeps_the_existing_prefix_and_refuses_source_prompts(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "agent-prompts.yml"
            original = "prompts:\n  triage: |\n    You are triage.\n"
            target.write_text(original, encoding="utf-8")
            versions.append_version(target, {
                "id": "goap-agent-seed",
                "source": "GOAP_AGENT_PROMPT.md",
                "source_sha256": "abc",
                "status": "seed",
                "created": "2026-11-11",
                "optimizer": "none",
                "dspy_version": "3.5.0",
                "auto": "none",
                "note": "Copy only.",
                "instructions": "You are Goap.\nStay on the task.\n",
            })
            written = target.read_text(encoding="utf-8")
            self.assertTrue(written.startswith(original))
            self.assertIn("gepa_prompt_versions:", written)
            self.assertFalse(versions.append_if_absent(target, {
                "id": "goap-agent-seed",
                "source": "GOAP_AGENT_PROMPT.md",
                "source_sha256": "abc",
                "status": "seed",
                "created": "2026-11-11",
                "instructions": "You are Goap.\n",
            }))
            import yaml
            parsed = yaml.safe_load(written)
            self.assertIn("triage", parsed["prompts"])
            self.assertEqual("goap-agent-seed", parsed["gepa_prompt_versions"][0]["id"])
            live = yaml.safe_load((ROOT / ".github/agent-prompts.yml").read_text(encoding="utf-8"))
            self.assertIn("triage", live["prompts"])
            ids = [item["id"] for item in live["gepa_prompt_versions"]]
            self.assertIn("goap-agent-seed", ids)
            self.assertIn("agent-build-seed", ids)
            for item in live["gepa_prompt_versions"]:
                if item["status"] != "seed":
                    continue
                digest = versions.source_sha256(ROOT / item["source"])
                self.assertEqual(digest, item["source_sha256"])
            blocked = Path(directory) / "GOAP_AGENT_PROMPT.md"
            with self.assertRaises(ValueError):
                versions.append_version(blocked, {
                    "id": "goap-agent-seed",
                    "source": "GOAP_AGENT_PROMPT.md",
                    "source_sha256": "abc",
                    "status": "seed",
                    "created": "2026-11-11",
                    "instructions": "nope",
                })


class SpendAndCompileTests(unittest.TestCase):
    def test_remote_endpoint_is_refused_unless_both_flags_are_exactly_one(self):
        saved = {name: os.environ.get(name) for name in (
            "REVVEL_LLM_ALLOW_CLOUD", "REVVEL_GEPA_SPEND_APPROVED")}
        try:
            os.environ.pop("REVVEL_LLM_ALLOW_CLOUD", None)
            os.environ.pop("REVVEL_GEPA_SPEND_APPROVED", None)
            with self.assertRaises(PermissionError):
                optimize.run_optimize(
                    dataset={"splits": {"train": [], "validation": [], "test": []}},
                    instructions="seed",
                    prompt_source=Path("notes.md"),
                    prompt_id="goap-agent",
                    model="openai/local-test",
                    endpoint="https://example.invalid/v1",
                    versions_path=Path("agent-prompts.yml"),
                    run_dir=Path("unused-run"),
                    auto="light",
                    dspy_version="3.5.0",
                )
            os.environ["REVVEL_LLM_ALLOW_CLOUD"] = "true"
            os.environ["REVVEL_GEPA_SPEND_APPROVED"] = "1"
            with self.assertRaises(PermissionError):
                optimize.assert_endpoint_allowed("https://example.invalid/v1")
            os.environ["REVVEL_LLM_ALLOW_CLOUD"] = "1"
            os.environ["REVVEL_GEPA_SPEND_APPROVED"] = "1"
            optimize.assert_endpoint_allowed("https://example.invalid/v1")
            optimize.assert_endpoint_allowed("http://127.0.0.1:9/v1")
        finally:
            for name, value in saved.items():
                if value is None:
                    os.environ.pop(name, None)
                else:
                    os.environ[name] = value

    def test_dummy_lm_compile_accepts_a_higher_scoring_instruction(self):
        rows = [{
            "request": "Work request #18338: add the offline check.",
            "required_terms": ["#18338", "offline"],
        }]
        compiled = optimize.offline_compile(
            instructions="Answer the work request briefly.",
            train_rows=rows,
            val_rows=rows,
            student_answers=[{"response": "I would change files."}] * 4
            + [{"response": "feat: add the offline check for #18338 and run npm test."}] * 40,
            reflection_answers=[{
                "new_instruction": "Name npm test, a commit type, and the work request id.",
            }] * 10,
            max_metric_calls=8,
        )
        self.assertIn("npm test", compiled.signature.instructions)

    def test_light_budget_for_a_24_example_valset(self):
        estimate = budget.estimate_lm_calls(24, 10, 2, "light")
        self.assertEqual(6, estimate["candidates_per_prompt"])
        self.assertEqual(476, estimate["metric_calls_per_prompt"])
        self.assertEqual(10, estimate["reflection_calls_per_prompt_upper"])
        self.assertEqual(2 * (476 + 10 + 20), estimate["total_lm_calls_upper"])

    def test_config_names_the_pinned_optimizer_and_both_prompts(self):
        loaded = config_mod.load_config()
        self.assertEqual("3.5.0", loaded["dspy_version"])
        self.assertEqual("light", loaded["auto"])
        sources = [item["source"] for item in loaded["prompts"]]
        self.assertEqual(["GOAP_AGENT_PROMPT.md", "AGENT_BUILD_PROMPT.md"], sources)
        self.assertEqual(".github/agent-prompts.yml", loaded["versions_output"])
        self.assertEqual(10, loaded["pending_owner_spend"]["benchmark_target_pp"])


if __name__ == "__main__":
    unittest.main()
