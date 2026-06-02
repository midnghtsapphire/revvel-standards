#!/usr/bin/env python3
"""Smoke tests for the openrouter_coder write-path deny-list.

These exist to lock down the RCE-close added per the strict-reviewer audit:
the model-driven coder must not be able to overwrite the very workflow gates
and persona scripts that invoke it.
"""

from __future__ import annotations

import unittest
from pathlib import Path

from openrouter_coder import validate_rel_path


class ValidateRelPathTests(unittest.TestCase):
    def test_allows_normal_docs_path(self) -> None:
        self.assertEqual(validate_rel_path("docs/note.md"), Path("docs/note.md"))

    def test_allows_normal_source_path(self) -> None:
        self.assertEqual(validate_rel_path("src/foo/bar.py"), Path("src/foo/bar.py"))

    def test_denies_github_workflow(self) -> None:
        with self.assertRaises(PermissionError):
            validate_rel_path(".github/workflows/foo.yml")

    def test_denies_github_script(self) -> None:
        with self.assertRaises(PermissionError):
            validate_rel_path(".github/scripts/openrouter_coder.py")

    def test_denies_wr_scripts(self) -> None:
        with self.assertRaises(PermissionError):
            validate_rel_path("wr/scripts/anything.js")

    def test_denies_persona_scripts(self) -> None:
        with self.assertRaises(PermissionError):
            validate_rel_path("scripts/openrouter-personas/persona.json")
        with self.assertRaises(PermissionError):
            validate_rel_path("scripts/persona-runner.js")

    def test_denies_yaml_anywhere(self) -> None:
        with self.assertRaises(PermissionError):
            validate_rel_path("config/thing.yaml")

    def test_denies_shell_scripts(self) -> None:
        with self.assertRaises(PermissionError):
            validate_rel_path("tools/setup.sh")

    def test_denies_mjs_under_scripts_dir(self) -> None:
        with self.assertRaises(PermissionError):
            validate_rel_path("scripts/runner.mjs")

    def test_allows_mjs_outside_scripts_dir(self) -> None:
        self.assertEqual(
            validate_rel_path("src/lib/helper.mjs"),
            Path("src/lib/helper.mjs"),
        )

    def test_rejects_traversal(self) -> None:
        with self.assertRaises(ValueError):
            validate_rel_path("../etc/passwd")

    def test_rejects_absolute(self) -> None:
        with self.assertRaises(ValueError):
            validate_rel_path("/etc/passwd")


if __name__ == "__main__":
    unittest.main()
