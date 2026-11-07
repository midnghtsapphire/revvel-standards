#!/usr/bin/env python3
"""Unit tests for local secret scan + masking (fixture strings only)."""
from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

from mask_secrets import mask_text, mask_value  # noqa: E402
from secret_scan import scan_text  # noqa: E402


class MaskTests(unittest.TestCase):
    def test_mask_short(self) -> None:
        self.assertEqual(mask_value("abcd"), "****")

    def test_mask_long(self) -> None:
        out = mask_value("sk_live_abcdefghijklmnopqrstuv")
        self.assertIn("…", out)
        self.assertNotIn("abcdefghijklmnopqrstuv", out)

    def test_mask_text_redacts_stripe(self) -> None:
        raw = "key=sk_live_ABCDEFGHijklmnop"
        masked = mask_text(raw)
        self.assertNotIn("ABCDEFGHijklmnop", masked)


class ScanTests(unittest.TestCase):
    def test_detects_aws_masked(self) -> None:
        # Synthetic AKIA-shaped fixture (not a real key).
        line = "AWS_KEY=AKIAIOSFODNN7EXAMPLE"
        findings = scan_text(Path("tmp.cfg"), line + "\n")
        # EXAMPLE marker → allowlisted as fake
        self.assertEqual(findings, [])

    def test_detects_github_token(self) -> None:
        # Synthetic ghp_ fixture without fake markers.
        token = "ghp_" + ("A" * 36)
        findings = scan_text(Path("leak.txt"), f"token={token}\n")
        self.assertEqual(len(findings), 1)
        self.assertIn("github-token", findings[0])
        self.assertNotIn(token, findings[0])

    def test_cli_blocks(self) -> None:
        token = "ghp_" + ("B" * 36)
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "bad.env"
            p.write_text(f"GITHUB_TOKEN={token}\n", encoding="utf-8")
            proc = subprocess.run(
                [sys.executable, str(SCRIPTS / "secret_scan.py"), str(p)],
                capture_output=True,
                text=True,
            )
            self.assertEqual(proc.returncode, 1)
            self.assertNotIn(token, proc.stderr)
            self.assertIn("github-token", proc.stderr)


if __name__ == "__main__":
    unittest.main()
