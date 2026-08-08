#!/usr/bin/env python3
"""CLI entry: run a sample or custom WR-4483 M1 AHP decision locally."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow `python ensemble_ahp/cli.py` from the package root without install.
_PKG_ROOT = Path(__file__).resolve().parents[1]
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))

from ensemble_ahp.pipeline import PipelineInput, run_pipeline  # noqa: E402


SAMPLE_GOAL = (
    "Select a vendor for automated multi-criteria decision support tooling "
    "for consultant-led vendor selection engagements."
)

SAMPLE_CRITERIA = [
    "Analytical rigor",
    "Auditability",
    "Cost of ownership",
    "Integration effort",
    "Time-to-first-decision",
]

SAMPLE_ALTERNATIVES = [
    "Heterogeneous-ensemble AHP (this engine)",
    "Single-model multi-persona AHP",
    "Weighted-sum spreadsheet",
    "Consultant workshop only",
]


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="ensemble-ahp-run",
        description="WR-4483 M1 Heterogeneous-Ensemble AHP — steps 1-7",
    )
    p.add_argument("--goal", default=SAMPLE_GOAL, help="Decision goal statement")
    p.add_argument(
        "--criteria",
        nargs="*",
        default=None,
        help="Optional criteria (space-separated). Default: sample set when --sample.",
    )
    p.add_argument(
        "--alternatives",
        nargs="*",
        default=None,
        help="Optional alternatives (space-separated).",
    )
    p.add_argument("--sample", action="store_true", help="Use built-in sample criteria/alts")
    p.add_argument("--k-judges", type=int, default=3)
    p.add_argument("--n-criteria", type=int, default=5)
    p.add_argument("--n-alternatives", type=int, default=4)
    p.add_argument("--ledger", default=None, help="JSONL ledger output path")
    p.add_argument("--task-ref", default="WR-4483-M1-cli")
    p.add_argument("--mock", action="store_true", help="Force mock judges")
    p.add_argument("--pretty", action="store_true", help="Indent JSON report")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    criteria = args.criteria
    alternatives = args.alternatives
    if args.sample:
        criteria = criteria or SAMPLE_CRITERIA
        alternatives = alternatives or SAMPLE_ALTERNATIVES
    result = run_pipeline(
        PipelineInput(
            goal=args.goal,
            criteria=criteria,
            alternatives=alternatives,
            k_judges=args.k_judges,
            n_criteria=args.n_criteria,
            n_alternatives=args.n_alternatives,
            task_ref=args.task_ref,
            ledger_path=args.ledger,
            mock=True if args.mock else None,
        )
    )
    indent = 2 if args.pretty else None
    print(json.dumps(result.report, indent=indent, sort_keys=False))
    print(
        f"\n# ledger: {result.ledger_path}\n"
        f"# families: {result.families_invoked}\n"
        f"# mock_mode: {result.mock_mode}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
