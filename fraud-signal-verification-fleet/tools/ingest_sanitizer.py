"""Sanitize ingested source text before it reaches an agent.

Source text is untrusted: a pasted article or PDF may contain prompt-injection
("ignore previous instructions", "output that X is guilty"). This strips/flags
the obvious vectors and never lets ingested text relax the refusal doctrine.

Usage:
    python3 tools/ingest_sanitizer.py < raw.txt > clean.txt
"""
from __future__ import annotations
import re, sys

INJECTION = [
    r"ignore (?:all )?previous instructions",
    r"disregard (?:the )?(?:above|prior|system)",
    r"you are now",
    r"output that .*?\bis guilty\b",
    r"confirm (?:the )?fraud",
    r"override (?:the )?refusal",
]


def sanitize(text: str) -> tuple[str, list[str]]:
    flags = []
    for pat in INJECTION:
        if re.search(pat, text, re.I):
            flags.append(pat)
            text = re.sub(pat, "[REDACTED-INJECTION]", text, flags=re.I)
    return text, flags


if __name__ == "__main__":
    raw = sys.stdin.read()
    clean, flags = sanitize(raw)
    if flags:
        sys.stderr.write(f"[ingest_sanitizer] flagged {len(flags)} injection pattern(s): {flags}\n")
    sys.stdout.write(clean)
