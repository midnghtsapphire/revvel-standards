"""Call-budget estimate for a real GEPA run.

The number comes from dspy.GEPA.auto_budget in the installed DSPy, not from a
copied formula. auto=light uses AUTO_RUN_SETTINGS['light']['n'] candidates
(6 in DSPy 3.5.0). Each metric call is one student completion for a
single-predictor program. Reflection adds up to one instruction-proposal call
per trial. The held-out benchmark, when the owner runs it, scores the test
split once before optimization and once after.
"""

from __future__ import annotations

import math


def _optimizer():
    import dspy
    from dspy.utils.dummies import DummyLM

    # max_metric_calls satisfies the "pick one budget" rule. auto_budget is
    # still the method that translates a candidate count into metric calls.
    # The dummy reflection model is not invoked by this constructor.
    return dspy.GEPA(
        metric=lambda *args, **kwargs: dspy.Prediction(score=0.0, feedback="budget probe"),
        reflection_lm=DummyLM([{"new_instruction": "unused"}]),
        max_metric_calls=1,
        num_threads=1,
    )


def candidate_count(auto: str) -> int:
    from dspy.teleprompt.gepa.gepa import AUTO_RUN_SETTINGS

    if auto not in AUTO_RUN_SETTINGS:
        raise ValueError("auto must be one of {0}".format(", ".join(sorted(AUTO_RUN_SETTINGS))))
    return int(AUTO_RUN_SETTINGS[auto]["n"])


def trial_count(num_candidates: int, num_preds: int = 1) -> int:
    """Same trial count GEPA derives inside auto_budget (DSPy 3.5.0)."""
    return int(max(2 * (num_preds * 2) * math.log2(num_candidates), 1.5 * num_candidates))


def estimate_lm_calls(valset_size: int, test_size: int, prompts: int, auto: str = "light") -> dict:
    if valset_size < 1 or test_size < 1 or prompts < 1:
        raise ValueError("valset, test, and prompt counts must be positive")
    candidates = candidate_count(auto)
    trials = trial_count(candidates)
    metric_calls = _optimizer().auto_budget(
        num_preds=1,
        num_candidates=candidates,
        valset_size=valset_size,
    )
    reflection_upper = trials
    benchmark = 2 * test_size
    per_prompt = metric_calls + reflection_upper + benchmark
    return {
        "auto": auto,
        "candidates_per_prompt": candidates,
        "trials_per_prompt": trials,
        "metric_calls_per_prompt": metric_calls,
        "reflection_calls_per_prompt_upper": reflection_upper,
        "benchmark_calls_per_prompt": benchmark,
        "prompts": prompts,
        "total_lm_calls_upper": per_prompt * prompts,
        "note": (
            "Upper bound. Student completions track metric calls plus the "
            "before/after test-split benchmark. Reflection calls happen only "
            "on trials that propose a new instruction. No dollar amount is known."
        ),
    }
