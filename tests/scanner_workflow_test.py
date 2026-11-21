#!/usr/bin/env python3
"""Validate only the existing scanner workflow; no repository-wide rewrites."""
import json
from pathlib import Path
import re
import subprocess
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/trivy.yml"


class WorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = WORKFLOW.read_text()
        cls.workflow = yaml.load(cls.text, Loader=yaml.BaseLoader)

    def test_existing_event_lane_no_target_event_or_schedule(self):
        events = self.workflow["on"]
        self.assertEqual(set(events), {"push", "pull_request", "workflow_dispatch"})
        self.assertEqual(events["pull_request"]["branches"], ["main"])

    def test_separate_trivy_and_malware_jobs_no_selfhost(self):
        self.assertEqual(set(self.workflow["jobs"]), {"trivy-fs", "malware-clamav"})
        for job in self.workflow["jobs"].values():
            self.assertEqual(job["runs-on"], "ubuntu-24.04")
            self.assertNotIn("continue-on-error", job)

    def test_all_active_actions_are_full_sha_manifest_pins(self):
        manifest = json.loads((ROOT / "scripts/security/install-manifest.json").read_text())
        for job in self.workflow["jobs"].values():
            for step in job["steps"]:
                if "uses" in step:
                    action, sha = step["uses"].split("@")
                    self.assertRegex(sha, r"^[a-f0-9]{40}$")
                    self.assertEqual(sha, manifest["actions"][action])

    def test_no_secrets_write_permissions_or_candidate_execution(self):
        self.assertEqual(self.workflow["permissions"], {"contents": "read"})
        for job in self.workflow["jobs"].values():
            for step in job["steps"]:
                self.assertNotIn("secrets.", str(step))
                self.assertNotIn("continue-on-error", step)
                if "run" in step and "scan.py" in step["run"]:
                    self.assertIn("trusted/scripts/security/scan.py", step["run"])
                    self.assertIn("python3 -I", step["run"])
                if "uses" in step and step["uses"].startswith("actions/checkout@"):
                    self.assertEqual(step["with"]["persist-credentials"], "false")
                    self.assertEqual(step["with"]["submodules"], "false")

    def test_always_collect_reports_and_missing_artifacts_fail(self):
        for job in self.workflow["jobs"].values():
            collection = [step for step in job["steps"]
                          if "Collect redacted" in step["name"]
                          or "Upload redacted" in step["name"]]
            self.assertEqual(len(collection), 2)
            self.assertTrue(all(step["if"] == "always()" for step in collection))
            self.assertEqual(collection[-1]["with"]["if-no-files-found"], "error")

    def test_legacy_lines_retained_in_dated_comments(self):
        legacy = subprocess.run(
            ["git", "show",
             "e6b5a99659bf454874f62e8c8e4fba8f5aed32d5:.github/workflows/trivy.yml"],
            cwd=ROOT, check=True, capture_output=True, text=True).stdout
        lines = {line.strip() for line in self.text.splitlines()}
        uncommented = {re.sub(r"^#\s*", "", line) for line in lines}
        for original in legacy.splitlines():
            original = original.strip()
            if original:
                self.assertTrue(original in lines or original in uncommented, original)
        self.assertIn("2026-11-15", self.text)


if __name__ == "__main__":
    unittest.main(verbosity=2)
