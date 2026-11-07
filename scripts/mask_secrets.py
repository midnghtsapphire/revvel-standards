#!/usr/bin/env python3
"""Mask API keys and credential-like strings for safe local logging.

Never print a full secret. Used by secret_scan.py and any local tooling.
Brain-dump #6 — own code, not marketplace Actions.
"""
from __future__ import annotations

import re
import sys

# Keep patterns conservative: known prefixes + assignment forms.
_TOKENISH = re.compile(
    r"""(?ix)
    (
      sk_live_[A-Za-z0-9]{8,}
      | sk_test_[A-Za-z0-9]{8,}
      | rk_live_[A-Za-z0-9]{8,}
      | rk_test_[A-Za-z0-9]{8,}
      | ghp_[A-Za-z0-9]{20,}
      | gho_[A-Za-z0-9]{20,}
      | ghu_[A-Za-z0-9]{20,}
      | ghs_[A-Za-z0-9]{20,}
      | ghr_[A-Za-z0-9]{20,}
      | github_pat_[A-Za-z0-9_]{20,}
      | xox[baprs]-[A-Za-z0-9-]{10,}
      | AKIA[0-9A-Z]{16}
      | AIza[0-9A-Za-z\-_]{20,}
      | -----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----
      | (?<![A-Za-z0-9])sk-[A-Za-z0-9]{20,}
    )
    """
)


def mask_value(value: str, keep: int = 4) -> str:
    """Return a redacted form of value; never the full secret."""
    if not value:
        return ""
    if "PRIVATE KEY" in value.upper():
        return "[REDACTED PRIVATE KEY]"
    if len(value) <= keep * 2:
        return "*" * len(value)
    return f"{value[:keep]}…{value[-keep:]} (len={len(value)})"


def mask_text(text: str) -> str:
    """Replace credential-like substrings in text with masked forms."""

    def _sub(match: re.Match[str]) -> str:
        return mask_value(match.group(0))

    return _TOKENISH.sub(_sub, text)


def main(argv: list[str]) -> int:
    if len(argv) > 1:
        for path in argv[1:]:
            try:
                raw = open(path, encoding="utf-8", errors="replace").read()
            except OSError as exc:
                print(f"{path}: cannot read: {exc}", file=sys.stderr)
                return 1
            sys.stdout.write(mask_text(raw))
        return 0
    sys.stdout.write(mask_text(sys.stdin.read()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
