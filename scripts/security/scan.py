#!/usr/bin/env python3
"""Portable checks: exit 0=clean, 1=findings, 2=scan/install/coverage error."""
import argparse
from datetime import datetime, timezone
import email.utils
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import stat
import subprocess
import sys
import tempfile

# -I removes the script directory as well as unsafe environment import paths.
# Restore ONLY this reviewed base-script directory, never the candidate cwd.
sys.path.insert(0, str(Path(__file__).resolve().parent))
# 2026-11-20, kimi-work-lopez (flake8-debt PR): E402 is inherent — the sys.path
# restore above must run before this import; moving the import above it would
# re-open the -I import-path hole the comment describes. `MANIFEST` was
# imported but never referenced (F401); dropped from the name list and recorded
# here, not silently deleted. Re-add it to the import if a caller needs it.
from install_scanners import InstallError, engine_env, install  # noqa: E402


class ScanError(Exception):
    """Incomplete scanning must never be reported as clean."""


def atomic_report(directory, report):
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    staged = directory / "report.json.tmp"
    staged.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    staged.replace(directory / "report.json")
    text = (f"{report['engine']}: {report['status']}\n"
            f"Exit code: {report['exit_code']}\n"
            f"Reason: {report['reason']}\n"
            f"Findings: {report.get('findings', 0)}\n"
            "Candidate contents, filenames, secret matches and raw engine logs are withheld.\n")
    (directory / "summary.txt").write_text(text)


def candidate_files(target, snapshot=None):
    if not target.is_dir() or target.is_symlink():
        raise ScanError("candidate-directory-missing")
    if (target / ".gitmodules").exists():
        raise ScanError("candidate-submodules-require-materialized-reviewed-checkout")
    count = 0
    # .git is checkout transport metadata, not source. No other directory skip.
    # Git stores a symlink's target text as its blob. Scan that text, never follow
    # it out of the candidate tree. A private normalized copy avoids unsafe
    # traversal while keeping every tracked source blob visible to both engines.

    def walk_error(_):
        raise ScanError("candidate-unreadable")
    for base, dirs, files in os.walk(target, followlinks=False, onerror=walk_error):
        if Path(base) == target:
            if ".git" in dirs:
                dirs.remove(".git")
            if ".git" in files:
                files.remove(".git")
        for name in list(dirs) + files:
            path = Path(base) / name
            mode = path.lstat().st_mode
            output = snapshot / path.relative_to(target) if snapshot else None
            if output:
                output.parent.mkdir(parents=True, exist_ok=True)
            if stat.S_ISLNK(mode):
                if name in dirs:
                    dirs.remove(name)
                if output:
                    output.write_bytes(os.fsencode(os.readlink(path)))
                count += 1
            elif stat.S_ISREG(mode):
                # Git LFS pointers are not the object bytes, so fail instead of
                # asserting that a transport-only checkout scanned the payload.
                with path.open("rb") as stream:
                    header = stream.read(128)
                if header.startswith(b"version https://git-lfs.github.com/spec/v1"):
                    raise ScanError("candidate-lfs-content-not-materialized")
                if output:
                    shutil.copyfile(path, output, follow_symlinks=False)
                count += 1
            elif not stat.S_ISDIR(mode):
                raise ScanError("candidate-special-file")
    if count == 0:
        raise ScanError("candidate-has-no-readable-files")
    return count


def execute(command, work, env, timeout=900):
    # Never inherit stdout: scanner output can contain secret matches or hostile
    # filenames with GitHub workflow-command syntax. Only sanitized counts escape.
    result = subprocess.run(command, cwd=work, env=env, capture_output=True, timeout=timeout)
    return result.returncode, (result.stdout + b"\n" + result.stderr).decode("utf-8", errors="replace")


def validate_trivy_report(path, engine_exit):
    if engine_exit not in {0, 1}:
        raise ScanError("trivy-engine-error")
    try:
        document = json.loads(Path(path).read_text())
    except (OSError, ValueError):
        raise ScanError("trivy-report-missing-or-malformed") from None
    if (not isinstance(document, dict) or document.get("SchemaVersion") != 2
            or document.get("ArtifactType") != "filesystem"):
        raise ScanError("trivy-report-invalid-schema")
    # Trivy omits Results for a valid filesystem with no recognized artifacts.
    results = document.get("Results", [])
    if not isinstance(results, list) or document.get("Errors"):
        raise ScanError("trivy-report-invalid-results")
    counts = {"vulnerability": 0, "misconfiguration": 0, "secret": 0}
    for result in results:
        if not isinstance(result, dict) or result.get("Errors"):
            raise ScanError("trivy-result-invalid")
        for field, kind in [("Vulnerabilities", "vulnerability"),
                            ("Misconfigurations", "misconfiguration"), ("Secrets", "secret")]:
            entries = result.get(field, [])
            if not isinstance(entries, list):
                raise ScanError("trivy-findings-invalid")
            for entry in entries:
                if (not isinstance(entry, dict) or entry.get("Severity")
                        not in {"UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"}):
                    raise ScanError("trivy-finding-invalid-severity")
                if field == "Misconfigurations" and entry.get("Status") not in {"FAIL", "PASS", "EXCEPTION"}:
                    raise ScanError("trivy-misconfiguration-status-invalid")
                if (entry["Severity"] in {"HIGH", "CRITICAL"}
                        and (field != "Misconfigurations" or entry["Status"] == "FAIL")):
                    counts[kind] += 1
    findings = sum(counts.values())
    if (engine_exit == 1) != (findings > 0):
        raise ScanError("trivy-exit-report-disagreement")
    return counts


def trivy_analysis_incomplete(log):
    # 2026-11-15 real requirements.txt fixture: Trivy warns when site-packages
    # are absent for LICENSE detection, while requirements vulnerabilities are
    # still scanned successfully. License is not one of our enabled scanners.
    # Exempt only this exact upstream warning, not arbitrary WARN/error lines.
    license_only = re.compile(
        r"\tWARN\t\[pip\] Unable to find python `site-packages` directory\. License "
        r"detection is skipped\.\s+err=\"site-packages directory not found\"$")
    relevant = "\n".join(line for line in log.splitlines() if not license_only.search(line))
    return bool(re.search(r"(?im)^.*(?:WARN|ERROR|FATAL).*\b(?:fail(?:ed|ure)?|error|unable|could not)\b", relevant))


def trivy_scan(receipt, target, work):
    config, ignores, secret_config, policy = [
        work / name for name in ("trivy.yaml", "ignore", "secret.yaml", "ignore.rego")]
    config.write_text("{}\n")
    ignores.write_text("")
    secret_config.write_text("rules: []\nallow-rules: []\n")
    # An empty file is NOT a no-op policy: OPA rejects it as an empty module.
    # The explicit false decision also prevents any candidate ignore policy.
    policy.write_text("package trivy\nimport rego.v1\ndefault ignore := false\n")
    private = work / "raw.json"
    command = [receipt["binary"], "fs", "--config", str(config), "--ignorefile", str(ignores),
               "--secret-config", str(secret_config), "--ignore-policy", str(policy),
               "--scanners", "vuln,misconfig,secret", "--severity", "HIGH,CRITICAL",
               "--ignore-unfixed=false", "--exit-code", "1", "--format", "json", "--output", str(private),
               "--no-progress", "--cache-dir", str(work / "cache"), "--timeout", "10m",
               "--skip-dirs", str(target / ".git"), str(target)]
    code, log = execute(command, work, engine_env(work), timeout=720)
    # A parser/database warning indicating incomplete analysis is not a clean pass.
    if trivy_analysis_incomplete(log):
        raise ScanError("trivy-incomplete-analysis")
    counts = validate_trivy_report(private, code)
    try:
        metadata = json.loads((work / "cache/db/metadata.json").read_text())
        updated = datetime.fromisoformat(metadata["UpdatedAt"].replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - updated).total_seconds()
        if not -600 <= age <= 48 * 3600:
            raise ScanError("trivy-database-stale")
    except (OSError, ValueError, KeyError, TypeError):
        raise ScanError("trivy-database-missing-or-malformed") from None
    return code, {"findings": sum(counts.values()), "counts": counts, "database_updated_at": updated.isoformat()}


def database_freshness(info, maximum_age, now=None):
    match = re.search(r"(?m)^Build time:\s*(.+)$", info)
    if not match:
        raise ScanError("clamav-database-date-missing")
    try:
        built = email.utils.parsedate_to_datetime(match[1])
        if built.tzinfo is None:
            built = built.replace(tzinfo=timezone.utc)
        age = ((now or datetime.now(timezone.utc)) - built).total_seconds()
    except (ValueError, TypeError):
        raise ScanError("clamav-database-date-malformed") from None
    if not -600 <= age <= maximum_age:
        raise ScanError("clamav-database-stale")
    return built.isoformat()


def validate_clam_report(log, engine_exit):
    if engine_exit not in {0, 1}:
        raise ScanError("clamav-engine-error")
    infected = re.findall(r"(?m)^Infected files:\s*([0-9]+)\s*$", log)
    scanned = re.findall(r"(?m)^Scanned files:\s*([0-9]+)\s*$", log)
    errors = re.findall(r"(?m)^Total errors:\s*([0-9]+)\s*$", log)
    # Candidate filenames may forge a summary line, so duplicate fields fail.
    if len(infected) != 1 or len(scanned) != 1 or int(scanned[0]) == 0:
        raise ScanError("clamav-report-missing-or-malformed")
    if len(errors) > 1 or (errors and int(errors[0])) or re.search(r"(?im)(?:^|\s)(?:ERROR|WARNING):", log):
        raise ScanError("clamav-incomplete-analysis")
    findings = int(infected[0])
    if (engine_exit == 1) != (findings > 0):
        raise ScanError("clamav-exit-report-disagreement")
    return findings, int(scanned[0])


def clamav_scan(receipt, target, work):
    prefix = Path(receipt["prefix"])
    env = engine_env(work, prefix)
    bindir = prefix / "usr/local/bin"
    database = work / "definitions"
    database.mkdir(mode=0o700)
    config = work / "freshclam.conf"
    config.write_text(f"DatabaseDirectory {database}\nDatabaseOwner {pwd.getpwuid(os.getuid()).pw_name}\n"
                      "DatabaseMirror database.clamav.net\nDNSDatabaseInfo current.cvd.clamav.net\n"
                      "Foreground yes\nMaxAttempts 2\nConnectTimeout 30\nReceiveTimeout 120\n"
                      "ScriptedUpdates yes\nBytecode no\n")
    code, log = execute([str(bindir / "freshclam"), f"--config-file={config}"], work, env, timeout=420)
    # Some older updater releases returned zero on cooldown. Check fresh headers
    # in addition to its status; never treat a CDN block as a clean scan.
    if code or re.search(r"(?i)\b(?:error|warning|cool.?down|rate.limit|forbidden|failed)\b", log):
        raise ScanError("clamav-signature-update-failed")
    dates = {}
    # 2026-11-15 runtime finding: upstream bytecode v339 was built 2025-09-11
    # even after a successful current freshclam update. Its arbitrary one-year
    # age gate did not represent upstream freshness. Bytecode is not executed in
    # this signature-only lane, so do not download it or claim it is scanned.
    # Effective main+daily databases are mandatory and verified; daily is rolling.
    for name in ("main", "daily"):
        paths = [database / f"{name}.{suffix}" for suffix in ("cvd", "cld")
                 if (database / f"{name}.{suffix}").is_file()]
        if len(paths) != 1 or paths[0].stat().st_size == 0:
            raise ScanError("clamav-definitions-missing-or-ambiguous")
        code, info = execute([str(bindir / "sigtool"), "--info", str(paths[0])], work, env, timeout=60)
        if code:
            raise ScanError("clamav-definition-verification-failed")
        # main is intentionally a long-lived base; daily is the rolling updates.
        if name == "daily":
            dates[name] = database_freshness(info, 48 * 3600)
    command = [receipt["binary"], "--recursive=yes", f"--database={database}", "--official-db-only=yes",
               "--bytecode=no", "--follow-dir-symlinks=0", "--follow-file-symlinks=0", "--cross-fs=no",
               "--alert-exceeds-max=yes", "--alert-encrypted=yes", "--alert-broken=yes",
               "--max-filesize=100M", "--max-scansize=400M", "--max-recursion=40", "--max-files=100000",
               "--exclude-dir=^" + re.escape(str(target / ".git")) + "$", "--infected", str(target)]
    code, log = execute(command, work, env, timeout=900)
    findings, scanned = validate_clam_report(log, code)
    return code, {"findings": findings, "scanned_files": scanned, "database_build_times": dates,
                  "bytecode_execution": False}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("engine", choices=["trivy", "clamav"])
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--reports", type=Path, required=True)
    parser.add_argument("--tools", type=Path, required=True)
    args = parser.parse_args(argv)
    target, reports, tools = [path.resolve() for path in (args.candidate, args.reports, args.tools)]
    # Reports/tools must be outside candidate: no overwrite or candidate data
    # masquerading as trusted receipts. All engine temporary files stay private.
    for path in (reports, tools):
        if path == target or target in path.parents:
            parser.error("reports and tools must be outside candidate checkout")
    report = {"schema": 1, "engine": args.engine, "status": "error", "exit_code": 2,
              "reason": "scanner-did-not-complete", "findings": 0,
              "timestamp": datetime.now(timezone.utc).isoformat()}
    atomic_report(reports, report)
    try:
        report["candidate_files"] = candidate_files(target)
        receipt = install(args.engine, tools)
        report.update({"version": receipt["version"], "archive_sha256": receipt["archive_sha256"]})
        with tempfile.TemporaryDirectory(prefix="scan-", dir=tools) as scratch:
            scratch = Path(scratch)
            snapshot = scratch / "candidate-data"
            snapshot.mkdir(mode=0o700)
            report["candidate_files"] = candidate_files(target, snapshot)
            operation = trivy_scan if args.engine == "trivy" else clamav_scan
            code, details = operation(receipt, snapshot, scratch)
        report.update(details)
        report.update({"status": "clean" if code == 0 else "findings", "exit_code": code,
                       "reason": "scan-complete" if code == 0 else "blocking-findings"})
    except ScanError as error:
        report["reason"] = str(error)  # All ScanError reasons are fixed codes.
    except InstallError:
        report["reason"] = "scanner-installation-failed"
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        report["reason"] = "scanner-runtime-or-report-error"
    atomic_report(reports, report)
    print((reports / "summary.txt").read_text(), end="")
    return report["exit_code"]


if __name__ == "__main__":
    raise SystemExit(main())
