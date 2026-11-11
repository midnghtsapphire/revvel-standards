"""Deterministic before/after score for LLMLingua-2 measurements (WR #18335).

This does not call a model. Token ratio and critical-term preservation come
from a measurement JSON that `prompt_compression.py measure` already wrote.
A same-task accuracy judge (compressed prompt vs full prompt, scored by a
model) would be a paid call. That step stays pending until the owner approves
spend. `--execute-paid-judge` refuses and exits 3. It does not open a socket.

Manual:

    python3 scripts/prompt_compression_accuracy.py \\
        --measurement wr/measurements/llmlingua2-governance-2026-11-11.json

What to check if it fails: the measurement file is the JSON from a local
measure run, its guarded ratio equals origin_tokens/compressed_tokens, and
no row lists missing_terms when the report claims the terms were kept.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path


def _ratio_matches(section) -> bool:
    guarded = section["guarded"]
    origin = guarded["origin_tokens"]
    compressed = guarded["compressed_tokens"]
    if not origin or not compressed:
        return guarded["ratio"] is None
    return abs((origin / compressed) - guarded["ratio"]) < 1e-6


def score_section(section) -> dict:
    """Term preservation is the share of non-empty docs that did not drop a
    force token. Empty docs are not failures: there was nothing to keep."""
    rows = section["rows"]
    checked = [row for row in rows if row.get("origin_tokens")]
    failures = [row for row in checked if row.get("missing_terms")]
    preserved = len(checked) - len(failures)
    rate = None if not checked else preserved / len(checked)
    if not _ratio_matches(section):
        raise ValueError("guarded ratio does not match origin/compressed token counts")
    return {
        "files_checked": len(checked),
        "term_failures": len(failures),
        "term_preservation_rate": rate,
        "guarded_ratio": section["guarded"]["ratio"],
        "guarded_origin_tokens": section["guarded"]["origin_tokens"],
        "guarded_compressed_tokens": section["guarded"]["compressed_tokens"],
    }


def score_measurement(payload) -> dict:
    scored = {
        "model": payload.get("model"),
        "paid_calls": False,
        "model_quality": {
            "status": "pending-owner-approved-spend",
            "reason": (
                "Same-task accuracy needs a judge model. This harness records "
                "the token ratio and term-preservation rate only. The paid "
                "judge was not executed."
            ),
        },
    }
    for name in ("reference_subset", "full_governance"):
        if name in payload:
            scored[name] = score_section(payload[name])
    if "reference_subset" not in scored and "full_governance" not in scored:
        raise ValueError("measurement JSON has no reference_subset or full_governance section")
    return scored


def measurement_json(raw: str, root) -> dict:
    """Load a measurement file that stays inside root.

    Sonar pythonsecurity:S8707: an agent can pass a CLI path. Absolute paths
    and `..` escapes are refused. `realpath` plus `commonpath` is the check
    that makes the later read safe.
    """
    if not isinstance(raw, str) or not raw.strip() or "\x00" in raw or os.path.isabs(raw):
        raise ValueError("measurement path must be a relative path inside --root")
    base = os.path.realpath(root)
    resolved = os.path.realpath(os.path.join(base, raw))
    if os.path.commonpath([resolved, base]) != base:
        raise ValueError(f"{raw} escapes {base}")
    if not resolved.endswith(".json"):
        raise ValueError("measurement file must end in .json")
    # 2026-11-11 first cut read args.measurement directly.
    # payload = json.loads(Path(args.measurement).read_text(encoding="utf-8"))
    return json.loads(Path(resolved).read_text(encoding="utf-8"))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Score a local LLMLingua-2 measurement. No paid calls.")
    parser.add_argument("--measurement", required=True)
    parser.add_argument("--root", default=".",
                        help="--measurement must be a relative path inside this directory.")
    parser.add_argument("--execute-paid-judge", action="store_true",
                        help="Refuses. A paid judge is pending owner-approved spend.")
    args = parser.parse_args(argv)
    if args.execute_paid_judge:
        print(json.dumps({
            "status": "pending-owner-approved-spend",
            "executed": False,
            "reason": "Paid judge refused. No provider was contacted.",
        }, indent=2))
        return 3
    try:
        payload = measurement_json(args.measurement, args.root)
    except (ValueError, OSError) as exc:
        print(str(exc))
        return 2
    print(json.dumps(score_measurement(payload), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
