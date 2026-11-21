#!/usr/bin/env python3
"""Offline regression tests. No external API calls or actual malware fixtures."""
from datetime import datetime, timezone
# 2026-11-20, kimi-work-lopez (flake8-debt PR): `timedelta` was imported but never
# used (F401). Commented out, not deleted, per OWNER RULE 4.
# from datetime import timedelta
import hashlib
# 2026-11-20, kimi-work-lopez (flake8-debt PR): `importlib.util` was imported but
# never used (F401). Commented out, not deleted, per OWNER RULE 4.
# import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts/security"))
# 2026-11-20, kimi-work-lopez (flake8-debt PR): sys.path insert above must
# precede this import, so E402 is inherent; noqa keeps the gate green.
import install_scanners as installer  # noqa: E402
import scan  # noqa: E402


class ScannerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.candidate = self.root / "candidate"
        self.candidate.mkdir()
        (self.candidate / "data.txt").write_text("safe test data\n")
        self.pin = json.loads(installer.MANIFEST.read_text())["trivy"]

    def report(self, value):
        path = self.root / "raw.json"
        path.write_text(json.dumps(value))
        return path

    def test_valid_official_pin(self):
        self.assertEqual(installer.validate_pin("trivy", self.pin), self.pin)

    def test_reject_unpinned_or_compromised_installs(self):
        for changes in ({"version": "latest"}, {"version": "0.69.4"}, {"sha256": ""},
                        {"sha256": "wrong"}, {"url": "https://evil.test/scanner"}, {"format": "shell"}):
            with self.subTest(changes=changes), self.assertRaises(installer.InstallError):
                installer.validate_pin("trivy", {**self.pin, **changes})

    def test_checksum_mismatch_never_executes(self):
        archive = self.root / "archive"
        archive.write_bytes(b"not a trusted scanner")
        with patch.object(installer.subprocess, "run") as execute, self.assertRaises(installer.InstallError):
            installer.verify_checksum(archive, "0" * 64)
        execute.assert_not_called()
        installer.verify_checksum(archive, hashlib.sha256(archive.read_bytes()).hexdigest())

    def test_install_invalid_manifest_fails_before_download(self):
        manifest = self.root / "manifest.json"
        manifest.write_text(json.dumps(
            {"schema": 1, "platform": "linux-x86_64",
             "trivy": {**self.pin, "sha256": "invalid"}}))
        with patch.object(installer.platform, "system", return_value="Linux"), \
                patch.object(installer.platform, "machine", return_value="x86_64"), \
                patch.object(installer, "download") as download:
            with self.assertRaises(installer.InstallError):
                installer.install("trivy", self.root / "tools", manifest)
            download.assert_not_called()

    def test_reject_nonofficial_redirect(self):
        request = installer.urllib.request.Request(self.pin["url"])
        for url in ("http://github.com/data", "https://evil.test/data", "https://user:password@github.com/data"):
            with self.subTest(url=url), self.assertRaises(installer.InstallError):
                installer.OfficialRedirects().redirect_request(request, None, 302, "Found", {}, url)

    def test_engine_environment_excludes_tokens_and_import_paths(self):
        with patch.dict("os.environ", {"GITHUB_TOKEN": "sensitive",
                                       "TRIVY_IGNORE_UNFIXED": "true",
                                       "PYTHONPATH": "/candidate"}):
            env = installer.engine_env(self.root)
        self.assertNotIn("GITHUB_TOKEN", env)
        self.assertNotIn("TRIVY_IGNORE_UNFIXED", env)
        self.assertNotIn("PYTHONPATH", env)

    def test_valid_clean_trivy_report(self):
        counts = scan.validate_trivy_report(
            self.report({"SchemaVersion": 2, "ArtifactType": "filesystem", "Results": []}), 0)
        self.assertEqual(sum(counts.values()), 0)

    def test_disabled_license_warning_does_not_hide_security_errors(self):
        harmless = ("2026-11-15T16:49:58Z\tWARN\t[pip] Unable to find python `site-packages` "
                    "directory. License detection is skipped.\t"
                    "err=\"site-packages directory not found\"")
        self.assertFalse(scan.trivy_analysis_incomplete(harmless))
        self.assertTrue(scan.trivy_analysis_incomplete(harmless + "\nFATAL Fatal error run error"))
        self.assertTrue(scan.trivy_analysis_incomplete("WARN Unable to parse dependency manifest"))
        self.assertTrue(scan.trivy_analysis_incomplete("ERROR failed to download database"))

    def test_unfixed_high_critical_and_secret_findings_block(self):
        value = {"SchemaVersion": 2, "ArtifactType": "filesystem", "Results": [{
            "Vulnerabilities": [{"Severity": "CRITICAL", "FixedVersion": ""}],
            "Misconfigurations": [{"Severity": "HIGH", "Status": "FAIL"}],
            "Secrets": [{"Severity": "HIGH", "Match": "sensitive content"}]}]}
        self.assertEqual(sum(scan.validate_trivy_report(self.report(value), 1).values()), 3)
        with self.assertRaises(scan.ScanError):
            scan.validate_trivy_report(self.report(value), 0)

    def test_invalid_missing_malformed_and_error_trivy_reports_fail(self):
        for value in ([], {}, {"SchemaVersion": 2, "ArtifactType": "filesystem", "Results": None},
                      {"SchemaVersion": 2, "ArtifactType": "filesystem", "Errors": ["failure"]},
                      {"SchemaVersion": 2, "ArtifactType": "filesystem", "Results": [{"Secrets": [{}]}]}):
            with self.subTest(value=value), self.assertRaises(scan.ScanError):
                scan.validate_trivy_report(self.report(value), 0)
        for path in (self.root / "missing", self.root / "malformed"):
            if path.name == "malformed":
                path.write_text("{")
            with self.assertRaises(scan.ScanError):
                scan.validate_trivy_report(path, 0)
        with self.assertRaises(scan.ScanError):
            scan.validate_trivy_report(self.report({"SchemaVersion": 2, "ArtifactType": "filesystem"}), 2)

    def test_clamav_clean_detection_engine_error_and_report_mismatch(self):
        clean = "Scanned files: 1\nInfected files: 0\n"
        detection = "redacted: test-signature FOUND\nScanned files: 1\nInfected files: 1\n"
        self.assertEqual(scan.validate_clam_report(clean, 0), (0, 1))
        self.assertEqual(scan.validate_clam_report(detection, 1), (1, 1))
        for log, code in ((clean, 2), (clean, 1), (detection, 0), ("", 0),
                          (clean + "Total errors: 1\n", 0), (clean + "WARNING: skipped file\n", 0),
                          (clean + "Infected files: 0\n", 0), ("Scanned files: 0\nInfected files: 0\n", 0)):
            with self.subTest(log=log, code=code), self.assertRaises(scan.ScanError):
                scan.validate_clam_report(log, code)

    def test_signature_freshness_missing_stale_and_future(self):
        now = datetime(2026, 11, 15, 12, tzinfo=timezone.utc)
        info = "Build time: 15 Nov 2026 11:00 +0000\n"
        self.assertIn("2026-11-15", scan.database_freshness(info, 48 * 3600, now))
        for value in ("", "Build time: bad\n", "Build time: 10 Nov 2026 11:00 +0000\n",
                      "Build time: 16 Nov 2026 11:00 +0000\n"):
            with self.subTest(value=value), self.assertRaises(scan.ScanError):
                scan.database_freshness(value, 48 * 3600, now)

    def test_freshclam_failure_or_cooldown_never_scans(self):
        receipt = {"prefix": str(self.root / "engine"), "binary": str(self.root / "engine/clamscan")}
        for code, log in ((1, "failed"), (0, "WARNING: cooldown")):
            work = self.root / f"work-{code}"
            work.mkdir()
            with patch.object(scan, "execute", return_value=(code, log)) as execute, self.assertRaises(scan.ScanError):
                scan.clamav_scan(receipt, self.candidate, work)
            self.assertEqual(execute.call_count, 1)

    def test_missing_definitions_never_scans(self):
        work = self.root / "work"
        work.mkdir()
        receipt = {"prefix": str(self.root / "engine"), "binary": str(self.root / "engine/clamscan")}
        with patch.object(scan, "execute", return_value=(0, "updated")) as execute, self.assertRaises(scan.ScanError):
            scan.clamav_scan(receipt, self.candidate, work)
        self.assertEqual(execute.call_count, 1)

    def test_error_receipt_exists_and_redacts_runtime_exception(self):
        reports = self.root / "reports"
        with patch.object(scan, "install", side_effect=OSError("sensitive content")):
            code = scan.main(["trivy", "--candidate", str(self.candidate), "--tools",
                              str(self.root / "tools"), "--reports", str(reports)])
        self.assertEqual(code, 2)
        self.assertNotIn("sensitive content", (reports / "report.json").read_text())
        self.assertEqual(json.loads((reports / "report.json").read_text())["status"], "error")

    def test_candidate_is_not_executed(self):
        marker = self.root / "executed"
        (self.candidate / "setup.py").write_text(f"open({str(marker)!r},'w').write('oops')")
        scan.candidate_files(self.candidate)
        self.assertFalse(marker.exists())

    def test_symlink_is_scanned_as_blob_never_followed(self):
        (self.candidate / "link").symlink_to("/etc/shadow")
        (self.candidate / ".git").write_text("gitdir: /private")
        snapshot = self.root / "snapshot"
        snapshot.mkdir()
        self.assertEqual(scan.candidate_files(self.candidate, snapshot), 2)
        self.assertEqual((snapshot / "link").read_text(), "/etc/shadow")
        self.assertFalse((snapshot / "link").is_symlink())
        self.assertFalse((snapshot / ".git").exists())

    def test_lfs_and_submodule_transport_gaps_fail(self):
        (self.candidate / "pointer").write_text("version https://git-lfs.github.com/spec/v1\noid sha256:abc\n")
        with self.assertRaises(scan.ScanError):
            scan.candidate_files(self.candidate)
        other = self.root / "other"
        other.mkdir()
        (other / ".gitmodules").write_text("[submodule \"test\"]\n")
        with self.assertRaises(scan.ScanError):
            scan.candidate_files(other)

    def test_arm64_pins_are_official_and_distinct(self):
        data = json.loads(installer.MANIFEST.read_text())
        for engine in ("trivy", "clamav"):
            arm = data[engine]["arm64"]
            installer.validate_pin(engine, arm, arm64=True)
            self.assertNotEqual(data[engine]["sha256"], arm["sha256"])

    def test_trivy_flags_cannot_enable_candidate_ignores(self):
        work = self.root / "work"
        work.mkdir()

        def inspect(command, cwd, env, timeout=900):
            self.assertIn("--ignore-unfixed=false", command)
            self.assertIn("vuln,misconfig,secret", command)
            policy = Path(command[command.index("--ignore-policy") + 1]).read_text()
            self.assertIn("default ignore := false", policy)
            self.assertIn("package trivy", policy)
            raise scan.ScanError("test-stop-after-validation")
        with patch.object(scan, "execute", side_effect=inspect), self.assertRaises(scan.ScanError):
            scan.trivy_scan({"binary": "/trusted/trivy"}, self.candidate, work)

    def test_isolated_python_entrypoint_works(self):
        result = subprocess.run(
            [sys.executable, "-I", str(ROOT / "scripts/security/scan.py"), "--help"],
            capture_output=True)
        self.assertEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
