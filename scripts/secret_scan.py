#!/usr/bin/env python3
"""Local pre-commit secret scanner (own code — no marketplace Actions).

Scans staged or listed files for common API key / token patterns.
Findings are printed MASKED (path:line:rule:redacted). Exit 1 on hit.

Brain-dump #6. Blocks #5 (API router). Related #3 governance.
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from mask_secrets import mask_value  # noqa: E402


@dataclass(frozen=True)
class Rule:
    name: str
    pattern: re.Pattern[str]


RULES: list[Rule] = [
    Rule("aws-access-key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    Rule("github-pat", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b")),
    Rule("github-token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b")),
    Rule("slack-token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    Rule("stripe-live", re.compile(r"\bsk_live_[A-Za-z0-9]{8,}\b")),
    Rule("stripe-test", re.compile(r"\bsk_test_[A-Za-z0-9]{8,}\b")),
    Rule("google-api-key", re.compile(r"\bAIza[0-9A-Za-z\-_]{20,}\b")),
    Rule("openai-ish", re.compile(r"(?<![A-Za-z0-9])sk-[A-Za-z0-9]{20,}\b")),
    Rule(
        "pem-private-key",
        re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    ),
    Rule(
        "assignment-secret",
        re.compile(
            r"(?i)(password|passwd|secret|api[_-]?key|auth[_-]?token|access[_-]?token)"
            r"\s*[=:]\s*['\"]([^'\"]{12,})['\"]"
        ),
    ),
]

SKIP_PATH_PARTS = {
    ".secrets.baseline",
    "node_modules",
    ".git",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
}

ALLOWLIST_NAME_SUFFIXES = (
    ".env.example",
    ".env.template",
    ".env.sample",
)

FAKE_MARKERS = (
    "EXAMPLE",
    "example",
    "CHANGEME",
    "changeme",
    "YOUR_",
    "your_",
    "xxx",
    "XXX",
    "fake",
    "FAKE",
    "not_real",
    "NOT_REAL",
    "placeholder",
    "PLACEHOLDER",
    "dummy",
    "DUMMY",
    "test_key_do_not_use",
)


def should_skip(path: Path) -> bool:
    name = path.name
    if name.endswith(ALLOWLIST_NAME_SUFFIXES):
        return True
    if set(path.parts) & SKIP_PATH_PARTS:
        return True
    if name in SKIP_PATH_PARTS:
        return True
    return False


def looks_fake(value: str) -> bool:
    return any(m in value for m in FAKE_MARKERS)


def scan_text(path: Path, text: str) -> list[str]:
    findings: list[str] = []
    for lineno, line in enumerate(text.splitlines(), start=1):
        for rule in RULES:
            for match in rule.pattern.finditer(line):
                raw = match.group(0)
                if rule.name == "assignment-secret" and match.lastindex and match.lastindex >= 2:
                    raw = match.group(2)
                if looks_fake(raw) or looks_fake(line):
                    continue
                findings.append(f"{path}:{lineno}:{rule.name}:{mask_value(raw)}")
    return findings


def scan_file(path: Path) -> list[str]:
    if should_skip(path) or not path.is_file():
        return []
    try:
        raw_bytes = path.read_bytes()
    except OSError as exc:
        return [f"{path}:0:read-error:{exc}"]
    if b"\0" in raw_bytes[:2048]:
        return []
    try:
        text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text = raw_bytes.decode("utf-8", errors="replace")
    return scan_text(path, text)


def main(argv: list[str]) -> int:
    targets = [Path(a) for a in argv[1:]]
    if not targets:
        print("secret_scan: no files given — passing")
        return 0
    all_findings: list[str] = []
    for t in targets:
        all_findings.extend(scan_file(t))
    if all_findings:
        print("secret_scan: ❌ potential secrets (values masked):", file=sys.stderr)
        for f in all_findings:
            print(f"  {f}", file=sys.stderr)
        print(
            "secret_scan: remove or rotate the secret; do not commit live keys.",
            file=sys.stderr,
        )
        return 1
    print("secret_scan: ✅ no matches")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
