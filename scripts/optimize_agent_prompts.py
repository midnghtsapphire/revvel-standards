"""GEPA prompt optimization against held-out WR examples (#18338).

Uses an explicitly configured local OpenAI-compatible endpoint. It cannot
select a paid endpoint; this keeps optimization outside the cloud spend lane.
Dataset JSON has train/validation/test arrays of {request, required_terms}.
The lexical metric is an auditable baseline, not an agent quality benchmark.

2026-11-11 PromptOrchestrator, WR #18338: the scorecard metric, the historical
WR trainset, and the append-only writer for .github/agent-prompts.yml live in
scripts/dspy_gepa/. This file stays the local lexical experiment.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit


def score_output(required_terms: list[str], output: str) -> dict:
    if not required_terms:
        raise ValueError("Every example must define required_terms")
    missing = [term for term in required_terms if term.casefold() not in output.casefold()]
    return {"score": 1 - len(missing) / len(required_terms),
            "feedback": "Missing required criteria: " + ", ".join(missing) if missing
            else "All required criteria present"}


def optimize(dataset: dict, instructions: str, model: str, endpoint: str, output: Path):
    parsed = urlsplit(endpoint)
    if parsed.scheme != "http" or parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("GEPA endpoint must be a local HTTP inference server")
    if output.exists() or output.with_suffix(".evaluation.json").exists():
        raise FileExistsError("Use a new candidate path; prior optimized prompts are preserved")
    splits = [dataset.get(name, []) for name in ("train", "validation", "test")]
    if any(not split for split in splits):
        raise ValueError("Separate nonempty train, validation, and test splits are required")
    requests = [row["request"] for split in splits for row in split]
    if len(set(requests)) != len(requests):
        raise ValueError("Repeated requests would leak between evaluation splits")
    for split in splits:
        for row in split:
            score_output(row["required_terms"], "")
    import dspy
    lm = dspy.LM(f"openai/{model}", api_base=endpoint, api_key="local", cache=False)
    signature = dspy.Signature("request -> response", instructions=instructions)
    baseline = dspy.Predict(signature)

    def metric(example, prediction, trace=None, pred_name=None, pred_trace=None):
        return dspy.Prediction(**score_output(example.required_terms, prediction.response))
    train, validation, test = [[dspy.Example(**row).with_inputs("request") for row in split] for split in splits]
    with dspy.context(lm=lm):
        optimizer = dspy.GEPA(metric=metric, reflection_lm=lm, auto="light", num_threads=1)
        optimized = optimizer.compile(baseline, trainset=train, valset=validation)

        def evaluate(program):
            return sum(metric(row, program(request=row.request)).score for row in test) / len(test)
        before, after = evaluate(baseline), evaluate(optimized)
    output.parent.mkdir(parents=True, exist_ok=True)
    # Write a candidate only; promotion remains a reviewed change to live prompts.
    optimized.save(str(output))
    report = {"metric": "required-term coverage", "baseline": before, "optimized": after,
              "test_examples": len(test), "regression": after < before,
              "instructions": optimized.signature.instructions}
    output.with_suffix(".evaluation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--prompt", type=Path, required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--endpoint", default="http://127.0.0.1:1234/v1")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(optimize(json.loads(args.dataset.read_text(encoding="utf-8")),
                              args.prompt.read_text(encoding="utf-8"), args.model,
                              args.endpoint, args.output), indent=2))
