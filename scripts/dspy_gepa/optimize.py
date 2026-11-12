"""GEPA compile paths.

offline_compile uses DummyLM and does not read an API key.
run_optimize is the owner command. A non-local endpoint is refused unless
REVVEL_LLM_ALLOW_CLOUD and REVVEL_GEPA_SPEND_APPROVED are both exactly "1".
That second name exists because one light GEPA run is hundreds of calls, and
the repo-wide cloud flag alone must not start it.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from dspy_gepa.scorecard_metric import score_response, scorecard_metric
from dspy_gepa.versions import append_version, guard_write_target, source_sha256

CLOUD_GATE = "REVVEL_LLM_ALLOW_CLOUD"
GEPA_GATE = "REVVEL_GEPA_SPEND_APPROVED"
LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})


def _assert_cloud_allowed(call_site: str) -> None:
    """Same exact-"1" rule as scripts/local_llm.py cloud_allowed(), plus the GEPA flag.

    A caller cannot widen the cloud gate. Unset, "true", and "yes" all refuse.
    """
    cloud = os.environ.get(CLOUD_GATE, "").strip()
    gepa = os.environ.get(GEPA_GATE, "").strip()
    if cloud != "1" or gepa != "1":
        raise PermissionError(
            "Refusing to call a paid LM from {0}: {1}={2!r} and {3}={4!r}. "
            "Both must be exactly \"1\" before a non-local GEPA run. "
            "The optimizer was not started.".format(call_site, CLOUD_GATE, cloud, GEPA_GATE, gepa)
        )


def endpoint_is_local(endpoint: str) -> bool:
    parsed = urlsplit(endpoint)
    return parsed.scheme == "http" and parsed.hostname in LOCAL_HOSTS


def assert_endpoint_allowed(endpoint: str) -> None:
    """Local HTTP is the unpaid path. Anything else needs both spend flags.

    The local server can still be configured to forward elsewhere. This check
    is the same loopback rule as scripts/optimize_agent_prompts.py; it is not
    a network sandbox.
    """
    if endpoint_is_local(endpoint):
        return
    _assert_cloud_allowed("dspy_gepa.optimize")


def _examples(rows: list[dict]):
    import dspy

    examples = []
    for row in rows:
        example = dspy.Example(
            request=row["request"],
            required_terms=list(row["required_terms"]),
        ).with_inputs("request")
        examples.append(example)
    return examples


def student_program(instructions: str):
    import dspy

    signature = dspy.Signature("request -> response", instructions=instructions)
    return dspy.Predict(signature)


def offline_compile(instructions: str, train_rows: list[dict], val_rows: list[dict],
                    student_answers: list[dict], reflection_answers: list[dict],
                    max_metric_calls: int = 8):
    """Run dspy.GEPA against DummyLM. No endpoint, no key, no version file write."""
    import dspy
    from dspy.utils.dummies import DummyLM

    if max_metric_calls < 1:
        raise ValueError("max_metric_calls must be positive")
    student_lm = DummyLM(student_answers)
    reflection_lm = DummyLM(reflection_answers)
    student = student_program(instructions)
    optimizer = dspy.GEPA(
        metric=scorecard_metric,
        reflection_lm=reflection_lm,
        max_metric_calls=max_metric_calls,
        num_threads=1,
        seed=0,
        use_merge=False,
        track_stats=False,
    )
    train = _examples(train_rows)
    val = _examples(val_rows)
    with dspy.context(lm=student_lm):
        return optimizer.compile(student, trainset=train, valset=val)


def _mean_quality(program, rows: list[dict]) -> float:
    if not rows:
        raise ValueError("The held-out split is empty")
    total = 0.0
    for row in rows:
        prediction = program(request=row["request"])
        graded = score_response(row["request"], prediction.response, list(row["required_terms"]))
        total += graded["quality"]
    return total / len(rows)


def run_optimize(dataset: dict, instructions: str, prompt_source: Path, prompt_id: str,
                 model: str, endpoint: str, versions_path: Path, run_dir: Path,
                 auto: str, dspy_version: str) -> dict:
    """Compile with GEPA and append one optimized version. The source prompt is read, not written."""
    guard_write_target(versions_path)
    if versions_path.resolve() == prompt_source.resolve():
        raise ValueError("refusing to write the source prompt over itself")
    assert_endpoint_allowed(endpoint)
    if not model or "/" not in model:
        raise ValueError("model must be a provider/id string, for example a local id passed by the owner")
    splits = dataset["splits"]
    for name in ("train", "validation", "test"):
        if not splits.get(name):
            raise ValueError("dataset split {0} is empty".format(name))
    import dspy

    local = endpoint_is_local(endpoint)
    if local:
        api_key = "local"
    else:
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key:
            raise RuntimeError(
                "OPENROUTER_API_KEY is unset. Only the key name is recorded here."
            )
    student_lm = dspy.LM(model, api_base=endpoint, api_key=api_key, cache=False)
    reflection_lm = dspy.LM(model, api_base=endpoint, api_key=api_key, cache=False)
    student = student_program(instructions)
    optimizer = dspy.GEPA(
        metric=scorecard_metric,
        reflection_lm=reflection_lm,
        auto=auto,
        num_threads=1,
        seed=0,
        track_stats=True,
        use_mlflow=False,
        use_wandb=False,
        log_dir=str(run_dir),
    )
    train = _examples(splits["train"])
    val = _examples(splits["validation"])
    run_dir.mkdir(parents=True, exist_ok=True)
    with dspy.context(lm=student_lm):
        before = _mean_quality(student, splits["test"])
        compiled = optimizer.compile(student, trainset=train, valset=val)
        after = _mean_quality(compiled, splits["test"])
    created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    ident = "{0}-gepa-{1}".format(prompt_id, created.replace(":", "").replace("-", ""))
    entry = {
        "id": ident.lower(),
        "source": str(prompt_source),
        "source_sha256": source_sha256(prompt_source),
        "status": "optimized",
        "created": created,
        "optimizer": "dspy.GEPA",
        "dspy_version": dspy_version,
        "auto": auto,
        "quality_before": round(before, 2),
        "quality_after": round(after, 2),
        "test_examples": len(splits["test"]),
        "regression": after < before,
        "note": "Held-out scorecard quality on the test split. Source prompt file was not modified.",
        "instructions": compiled.signature.instructions,
    }
    append_version(versions_path, entry)
    report = {
        "prompt_id": prompt_id,
        "version_id": entry["id"],
        "quality_before": entry["quality_before"],
        "quality_after": entry["quality_after"],
        "delta_points": round(after - before, 2),
        "regression": entry["regression"],
        "test_examples": entry["test_examples"],
        "endpoint_local": local,
        "model": model,
    }
    report_path = run_dir / "evaluation.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report
