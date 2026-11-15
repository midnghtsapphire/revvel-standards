#!/usr/bin/env python3
"""Run real engines installed by install_scanners.py; never commit sample files."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts/security"))
import scan
from install_scanners import engine_env


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trivy-prefix", type=Path)
    parser.add_argument("--clamav-prefix", type=Path)
    parser.add_argument("--official-clamav", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    receipts = []
    with tempfile.TemporaryDirectory(prefix="revvel-scanner-runtime-") as scratch:
        scratch = Path(scratch)
        if args.trivy_prefix:
            candidate = scratch / "trivy-candidate"
            candidate.mkdir()
            (candidate / "Dockerfile").write_text("FROM alpine:3.20\nUSER root\n")
            # A policy bypass attempt in candidate data must not suppress findings.
            (candidate / "trivy.yaml").write_text("scanners: []\nignore-unfixed: true\n")
            (candidate / ".trivyignore").write_text("AVD-DS-0002\n")
            work = scratch / "trivy-work"
            work.mkdir()
            receipt = json.loads((args.trivy_prefix / "installation.json").read_text())
            original = scan.execute
            def traced(command, work, env, timeout=900):
                code, log = original(command, work, env, timeout)
                # Safe fixture diagnostics are kept outside Git. Public receipts
                # below never include raw logs, signed download URLs or contents.
                args.output.parent.mkdir(parents=True, exist_ok=True)
                args.output.with_suffix(".private.log").write_text(log)
                return code, log
            scan.execute = traced
            try:
                code, details = scan.trivy_scan(receipt, candidate, work)
                assert code == 1 and details["counts"]["misconfiguration"] > 0
                receipts.append({"engine": "trivy", "test": "root-user-misconfiguration-and-candidate-policy-bypass", "engine_exit": code, **details})
            except scan.ScanError as error:
                receipts.append({"engine": "trivy", "test": "root-user-misconfiguration-and-candidate-policy-bypass", "status": "error", "reason": str(error)})
            finally:
                scan.execute = original
        if args.clamav_prefix:
            receipt = json.loads((args.clamav_prefix / "installation.json").read_text())
            env = engine_env(scratch, args.clamav_prefix)
            candidate = scratch / "clam-candidate"
            candidate.mkdir()
            # Standard harmless EICAR test string is assembled only in temporary
            # storage. This is NOT a malware sample and is never executed.
            parts = ["X5O!P%@AP[4", "\\PZX54(P^)7CC)7}$", "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"]
            sample = "".join(parts).encode("ascii")
            sample_file = candidate / "eicar-test.txt"
            sample_file.write_bytes(sample)
            # A local test-only MD5 signature validates the real signature engine
            # without pretending that synthetic defs satisfy production freshness.
            database = scratch / "test-only.hdb"
            database.write_text(f"{hashlib.md5(sample).hexdigest()}:{len(sample)}:Revvel.HarmlessEicarTest\n")
            result = subprocess.run([receipt["binary"], "--database", str(database), str(sample_file)], env=env, cwd=scratch, capture_output=True, text=True, timeout=60)
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.with_suffix(".clam-private.log").write_text(result.stdout + result.stderr)
            found, scanned = scan.validate_clam_report(result.stdout + result.stderr, result.returncode)
            assert result.returncode == 1 and found == 1
            receipts.append({"engine": "clamav", "test": "safe-EICAR-synthetic-signature", "engine_exit": result.returncode, "infected_files": found, "scanned_files": scanned, "official_database": False})
            clean = candidate / "clean.txt"
            clean.write_text("safe content\n")
            result = subprocess.run([receipt["binary"], "--database", str(database), str(clean)], env=env, cwd=scratch, capture_output=True, text=True, timeout=60)
            assert scan.validate_clam_report(result.stdout + result.stderr, result.returncode) == (0, 1)
            receipts.append({"engine": "clamav", "test": "clean-file", "engine_exit": result.returncode})
            result = subprocess.run([receipt["binary"], "--database", str(scratch / "missing-db"), str(clean)], env=env, cwd=scratch, capture_output=True, timeout=60)
            assert result.returncode == 2
            receipts.append({"engine": "clamav", "test": "missing-database-engine-error", "engine_exit": result.returncode})
            if args.official_clamav:
                work = scratch / "clam-official-work"
                work.mkdir()
                original = scan.execute
                def trace_official(command, work, env, timeout=900):
                    code, log = original(command, work, env, timeout)
                    args.output.with_suffix(".official-private.log").write_text(log)
                    return code, log
                scan.execute = trace_official
                try:
                    code, details = scan.clamav_scan(receipt, candidate, work)
                    assert code == 1 and details["findings"] == 1
                    receipts.append({"engine": "clamav", "test": "safe-EICAR-official-definitions", "engine_exit": code, "official_database": True, **details})
                except scan.ScanError as error:
                    receipts.append({"engine": "clamav", "test": "safe-EICAR-official-definitions", "status": "error", "reason": str(error)})
                finally:
                    scan.execute = original
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"tests": receipts}, indent=2) + "\n")
    print(args.output.read_text())
    return 1 if any(test.get("status") == "error" for test in receipts) else 0


if __name__ == "__main__":
    raise SystemExit(main())
