"""Fleet orchestrator.

Runs the verification pipeline end-to-end and writes dashboard/dashboard-data.json
for the live HTML dashboard to read.

Modes:
  offline (default) — score the seed dataset, no network/LLM. Deterministic; CI-safe.
  live              — would dispatch each AgentSpec to an LLM with its prompt and
                      merge structured claims back in. Stubbed: requires API keys
                      and is intentionally not auto-enabled.

The orchestrator is the only place that decides parallel vs sequential agent
dispatch. See prompts/MASTER_PROMPT.md for the chaining contract.
"""
from __future__ import annotations
import json, os, datetime
from confidence import load_config
from judge import adjudicate
from agents import fleet_manifest

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, "..")


def run(seed_path: str, out_path: str, mode: str = "offline") -> dict:
    cfg = load_config(os.path.join(ROOT, "config", "source_tiers.yaml"))
    with open(seed_path) as f:
        case = json.load(f)

    if mode == "live":
        raise NotImplementedError(
            "live mode requires LLM API keys and human-in-the-loop review; "
            "run offline against curated seed data for CI/demo.")
    if mode != "offline":
        # Don't silently run offline while reporting a misleading mode. Agent-dispatch
        # styles ('parallel'/'sequential') belong to the prompt layer, not this runner.
        raise ValueError(
            f"unknown mode {mode!r}; this runner supports 'offline' (and 'live' is stubbed). "
            "Parallel/sequential dispatch is configured in prompts/MASTER_PROMPT.md.")

    report = adjudicate(case, cfg)
    report["generated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    report["mode"] = mode
    report["fleet"] = [{"name": a["name"], "mission": a["mission"]} for a in fleet_manifest()]
    report["sources"] = case["sources"]

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)
    return report


if __name__ == "__main__":
    seed = os.path.join(ROOT, "data", "seed", "newsom_case.json")
    out = os.path.join(ROOT, "dashboard", "dashboard-data.json")
    rep = run(seed, out)
    print(f"Wrote {out}")
    print(rep["headline_finding"])
