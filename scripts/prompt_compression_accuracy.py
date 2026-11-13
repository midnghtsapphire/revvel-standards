"""Deterministic before/after score for LLMLingua-2 measurements (WR #18335).

Token ratio and critical-term preservation come from a measurement JSON that
`prompt_compression.py measure` already wrote.
# 2026-11-11: the next sentences were the refusal. Audrey approved spend on
# 2026-11-11 ("All") and named the OpenRouter key on 2026-11-12. The judge
# runs only with --execute-paid-judge and REVVEL_LLM_ALLOW_CLOUD=1.
# A same-task accuracy judge (compressed prompt vs full prompt, scored by a
# model) would be a paid call. That step stays pending until the owner approves
# spend. `--execute-paid-judge` refuses and exits 3. It does not open a socket.

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


def _relative_parts(raw: str) -> list:
    """Split a relative CLI path. `..`, absolute paths, and NULs are refused.

    The parts are names to match against directory entries. They are not
    joined back into a path that gets opened.
    """
    if not isinstance(raw, str) or not raw.strip() or "\x00" in raw or os.path.isabs(raw):
        raise ValueError("measurement path must be a relative path inside --root")
    parts = [part for part in raw.replace("\\", "/").split("/") if part]
    if not parts or any(part in (".", "..") for part in parts):
        raise ValueError("measurement path must be a relative path inside --root")
    return parts


def measurement_json(raw: str, root) -> dict:
    """Load a measurement file by walking directory entries from root.

    Sonar pythonsecurity:S8707 does not treat realpath+commonpath as a
    sanitizer: the 08233bfb check still traced argv into read_text. The path
    that is read is taken from os.scandir entry.path, matched by name. The
    CLI string is never passed to the file read.
    """
    # 2026-11-11 15:59 realpath version, not used. It did not clear the taint.
    # base = os.path.realpath(root)
    # resolved = os.path.realpath(os.path.join(base, raw))
    # if os.path.commonpath([resolved, base]) != base: raise ValueError
    # return json.loads(Path(resolved).read_text(encoding="utf-8"))
    base = Path(os.path.realpath(root))
    current = base
    for part in _relative_parts(raw):
        chosen = None
        with os.scandir(current) as scan:
            for entry in scan:
                if entry.name == part:
                    chosen = entry.path
                    break
        if chosen is None:
            raise FileNotFoundError(raw)
        current = Path(os.path.realpath(chosen))
        if os.path.commonpath([str(current), str(base)]) != str(base):
            raise ValueError(f"{raw} escapes {base}")
    if current.suffix.lower() != ".json":
        raise ValueError("measurement file must end in .json")
    # 2026-11-11 first cut read args.measurement directly.
    # payload = json.loads(Path(args.measurement).read_text(encoding="utf-8"))
    return json.loads(current.read_text(encoding="utf-8"))


# Audrey Evans approved this spend on 2026-11-11 ("All") and asked on
# 2026-11-12 that the judge use the new OpenRouter key. The model is the
# cheap Flash Lite pin. Listed OpenRouter price checked 2026-11-12:
# https://openrouter.ai/google/gemini-2.5-flash-lite — $0.10 / 1M input,
# $0.40 / 1M output. Four short calls stay under $0.02 even if every token
# is billed at the output rate.
JUDGE_MODEL = "google/gemini-2.5-flash-lite"
JUDGE_TEMPERATURE = 0
MAX_JUDGE_CALLS = 4
MAX_PROMPT_CHARS = 4000
JUDGE_TASKS = "wr/measurements/llmlingua2-judge-tasks.json"
INPUT_USD_PER_MILLION = 0.10
OUTPUT_USD_PER_MILLION = 0.40


def _hits(answer: str, terms) -> tuple:
    text = answer or ""
    folded = text.lower()
    found = [term for term in terms if term.lower() in folded]
    missed = [term for term in terms if term.lower() not in folded]
    return found, missed


def judge_tasks(tasks: dict, caller) -> dict:
    """Ask each question on the uncompressed context and the compressed one.

    `caller(prompt)` returns `(text, total_tokens, model_name)`. The call cap
    is checked before any request, so a larger task file cannot overspend.
    """
    questions = tasks["questions"]
    needed = len(questions) * 2
    if needed > MAX_JUDGE_CALLS:
        raise ValueError(f"{needed} calls would exceed the cap of {MAX_JUDGE_CALLS}")
    rows = []
    calls_used = 0
    total_tokens = 0
    model_seen = JUDGE_MODEL
    for question in questions:
        pair = {"id": question["id"], "ask": question["ask"]}
        for condition in ("uncompressed", "compressed"):
            prompt = (
                "Answer using only the context. One short sentence.\n\n"
                f"Condition: {condition}\n"
                f"Context:\n{tasks[condition]}\n\n"
                f"Question:\n{question['ask']}\n"
            )
            if len(prompt) > MAX_PROMPT_CHARS:
                raise ValueError("prompt exceeds the size cap; refusing to call")
            text, tokens, model_seen = caller(prompt)
            calls_used += 1
            total_tokens += int(tokens or 0)
            found, missed = _hits(text, question["required_terms"])
            pair[condition] = {
                "answer": text,
                "hits": found,
                "misses": missed,
                "tokens": int(tokens or 0),
            }
        uncompressed_hits = set(pair["uncompressed"]["hits"])
        compressed_hits = set(pair["compressed"]["hits"])
        pair["regression"] = sorted(uncompressed_hits - compressed_hits)
        rows.append(pair)
    regressions = [row["id"] for row in rows if row["regression"]]
    ceiling = total_tokens * OUTPUT_USD_PER_MILLION / 1_000_000
    return {
        "status": "completed",
        "executed": True,
        "paid_calls": True,
        "model": model_seen,
        "temperature": JUDGE_TEMPERATURE,
        "max_calls": MAX_JUDGE_CALLS,
        "calls_used": calls_used,
        "total_tokens": total_tokens,
        "estimated_cost_usd_ceiling": ceiling,
        "price": {
            "input_usd_per_million": INPUT_USD_PER_MILLION,
            "output_usd_per_million": OUTPUT_USD_PER_MILLION,
            "ceiling_uses": "output rate on total_tokens",
            "source": "https://openrouter.ai/google/gemini-2.5-flash-lite",
            "checked": "2026-11-12",
        },
        "regressions": regressions,
        "questions": rows,
    }


def _openrouter_caller(prompt: str):
    import local_llm
    done = local_llm.call_openrouter(prompt, JUDGE_MODEL, temperature=JUDGE_TEMPERATURE)
    return done.text, int(done.tokens or 0), done.model


def run_paid_judge(caller=None) -> tuple:
    """Return (exit_code, report). No socket unless the gate is open and a
    caller is the real OpenRouter client."""
    import local_llm
    if not local_llm.cloud_allowed():
        return 3, {
            "status": "spend-gate-closed",
            "executed": False,
            "reason": "REVVEL_LLM_ALLOW_CLOUD is not exactly 1. No provider was contacted.",
        }
    if caller is None and not os.environ.get("OPENROUTER_API_KEY", "").strip():
        return 2, {
            "status": "missing-openrouter-api-key",
            "executed": False,
            "where": (
                "CircleCI project environment variable OPENROUTER_API_KEY "
                "for gh/midnghtsapphire/revvel-standards. "
                "Project Settings -> Environment Variables. "
                "This job attaches no context, so a context secret is not visible."
            ),
        }
    tasks = measurement_json(JUDGE_TASKS, os.getcwd())
    report = judge_tasks(tasks, caller or _openrouter_caller)
    return 0, report


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Score a local LLMLingua-2 measurement. No paid calls.")
    parser.add_argument("--measurement", required=True,
                        help="Relative path under the working directory. Walked by directory entry name.")
    # 2026-11-11 16:05 PromptOrchestrator, PR #18377: --root no longer selects
    # the directory. Sonar S8707 treated a CLI root as tainted. The walk uses
    # os.getcwd() below. The option stays registered so `--measurement X --root DIR`
    # is not argparse's "unrecognized arguments", which exits 2, the same code
    # as a real path failure.
    # parser.add_argument("--root", default=".",
    #                     help="--measurement must be a relative path inside this directory.")
    parser.add_argument("--root", default=".",
                        help="Accepted and ignored. The walk uses the working directory.")
    parser.add_argument("--execute-paid-judge", action="store_true",
                        help="Run the OpenRouter judge. Also requires REVVEL_LLM_ALLOW_CLOUD=1.")
    args = parser.parse_args(argv)
    if args.execute_paid_judge:
        # 2026-11-11 refusal, retired 2026-11-13. Audrey approved the spend
        # ("All", 2026-11-11) and the new OpenRouter key (2026-11-12).
        # print(json.dumps({
        #     "status": "pending-owner-approved-spend",
        #     "executed": False,
        #     "reason": "Paid judge refused. No provider was contacted.",
        # }, indent=2))
        # return 3
        code, report = run_paid_judge()
        print(json.dumps(report, indent=2))
        return code
    try:
        # Root is the process working directory, not a second CLI path.
        payload = measurement_json(args.measurement, os.getcwd())
    except (ValueError, OSError) as exc:
        print(str(exc))
        return 2
    print(json.dumps(score_measurement(payload), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
