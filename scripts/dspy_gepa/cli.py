"""Manual commands for the GEPA integration.

From the repo root, with the pinned environment installed:

    PYTHONPATH=scripts python -m dspy_gepa build-trainset
    PYTHONPATH=scripts python -m dspy_gepa estimate
    PYTHONPATH=scripts python -m dspy_gepa offline-demo
    PYTHONPATH=scripts python -m dspy_gepa seed-versions

The optimize command is the real run. It is refused for a non-local endpoint
until both spend flags are exactly "1". This module does not set those flags.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone

from dspy_gepa.budget import estimate_lm_calls
from dspy_gepa.config import load_config, repo_root
from dspy_gepa.optimize import offline_compile, run_optimize
from dspy_gepa.trainset import build_trainset, load_trainset, write_trainset
from dspy_gepa.versions import append_if_absent, source_sha256


def _paths(config: dict):
    root = repo_root()
    return {
        "issues": root / config["issues_dir"],
        "trainset": root / config["trainset_output"],
        "versions": root / config["versions_output"],
        "prompts": [(item["id"], root / item["source"]) for item in config["prompts"]],
    }


def cmd_build(config: dict) -> int:
    paths = _paths(config)
    payload = build_trainset(paths["issues"])
    write_trainset(payload, paths["trainset"])
    summary = {
        "files_seen": payload["files_seen"],
        "examples": payload["examples"],
        "meets_minimum": payload["meets_minimum"],
        "minimum": payload["minimum"],
        "counts": payload["counts"],
        "output": str(paths["trainset"].relative_to(repo_root())),
    }
    print(json.dumps(summary, indent=2))
    return 0 if payload["meets_minimum"] else 2


def cmd_estimate(config: dict) -> int:
    paths = _paths(config)
    payload = load_trainset(paths["trainset"])
    counts = payload["counts"]
    estimate = estimate_lm_calls(
        valset_size=counts["validation"],
        test_size=counts["test"],
        prompts=len(config["prompts"]),
        auto=config["auto"],
    )
    estimate["examples"] = payload["examples"]
    estimate["counts"] = counts
    estimate["optimizer_run"] = "pending-owner-approved-spend"
    estimate["benchmark_target_pp"] = config["pending_owner_spend"]["benchmark_target_pp"]
    print(json.dumps(estimate, indent=2))
    return 0 if payload["meets_minimum"] else 2


def cmd_seed(config: dict) -> int:
    paths = _paths(config)
    added = []
    for prompt_id, source in paths["prompts"]:
        entry = {
            "id": "{0}-seed".format(prompt_id),
            "source": str(source.relative_to(repo_root())),
            "source_sha256": source_sha256(source),
            "status": "seed",
            "created": "2026-11-11",
            "optimizer": "none",
            "dspy_version": config["dspy_version"],
            "auto": "none",
            "note": (
                "Copy of the source prompt for versioning. Not an optimized candidate. "
                "The source file was not modified."
            ),
            "instructions": source.read_text(encoding="utf-8"),
        }
        if append_if_absent(paths["versions"], entry):
            added.append(entry["id"])
    print(json.dumps({"added": added, "versions": str(paths["versions"].relative_to(repo_root()))}))
    return 0


def cmd_offline(config: dict) -> int:
    """One dummy-LM compile. Writes nothing. Shows that GEPA accepts the metric."""
    rows = [{
        "request": "Work request #18338: add the offline check.",
        "required_terms": ["#18338", "offline"],
    }]
    compiled = offline_compile(
        instructions="Answer the work request briefly.",
        train_rows=rows,
        val_rows=rows,
        student_answers=[{"response": "I would change files."}] * 4
        + [{"response": "feat: cover #18338 offline with npm test."}] * 40,
        reflection_answers=[{"new_instruction": "Name npm test, a commit type, and the work request id."}] * 10,
        max_metric_calls=8,
    )
    print(json.dumps({
        "offline": True,
        "instructions": compiled.signature.instructions,
    }, indent=2))
    return 0


def cmd_optimize(config: dict, prompt_id: str, model: str, endpoint: str) -> int:
    paths = _paths(config)
    match = [pair for pair in paths["prompts"] if pair[0] == prompt_id]
    if not match:
        raise SystemExit("unknown prompt id {0}".format(prompt_id))
    source = match[0][1]
    dataset = load_trainset(paths["trainset"])
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = repo_root() / "wr" / "memory" / "dspy-gepa-runs" / prompt_id / stamp
    if run_dir.exists():
        raise SystemExit("run directory already exists: {0}".format(run_dir))
    try:
        report = run_optimize(
            dataset=dataset,
            instructions=source.read_text(encoding="utf-8"),
            prompt_source=source,
            prompt_id=prompt_id,
            model=model,
            endpoint=endpoint,
            versions_path=paths["versions"],
            run_dir=run_dir,
            auto=config["auto"],
            dspy_version=config["dspy_version"],
        )
    except PermissionError as exc:
        # A refused run must not look like a successful optimize. The message
        # names the gates and does not include a key value.
        print(str(exc), file=sys.stderr)
        return 3
    print(json.dumps(report, indent=2))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="DSPy GEPA prompt optimization (WR #18338)")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("build-trainset")
    sub.add_parser("estimate")
    sub.add_parser("seed-versions")
    sub.add_parser("offline-demo")
    optimize = sub.add_parser("optimize")
    optimize.add_argument("--prompt", required=True)
    optimize.add_argument("--model", required=True)
    optimize.add_argument("--endpoint", required=True)
    args = parser.parse_args(argv)
    config = load_config()
    if args.command == "build-trainset":
        return cmd_build(config)
    if args.command == "estimate":
        return cmd_estimate(config)
    if args.command == "seed-versions":
        return cmd_seed(config)
    if args.command == "offline-demo":
        return cmd_offline(config)
    if args.command == "optimize":
        return cmd_optimize(config, args.prompt, args.model, args.endpoint)
    return 2


if __name__ == "__main__":
    sys.exit(main())
