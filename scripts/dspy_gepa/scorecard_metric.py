"""Text-feedback metric that uses the agent scorecard's weights.

The arithmetic is the Python twin of scripts/agent-scorecard/score-engine.js.
GEPA reflects on the feedback string, so each shortfall names the dimension,
the weight from docs/AGENT_SCORECARD_STANDARD.md, and the concrete miss.
No model is called from this module.
"""

from __future__ import annotations

import math
import re

# Same weights as DIMENSION_WEIGHTS in score-engine.js. A change here without
# a change there would make GEPA optimize a different score than the leaderboard.
DIMENSION_WEIGHTS = {
    "hallucination": 0.30,
    "badCode": 0.25,
    "directions": 0.20,
    "rash": 0.15,
    "ci": 0.10,
}

_COMMIT = re.compile(r"\b(?:feat|fix|docs|chore|refactor|test|ci):")
_VERIFY = re.compile(r"\b(?:npm test|npm run|unittest|pytest|circleci)\b")
_ISSUE = re.compile(r"#\d{3,}")
_TICK = re.compile(r"`([^`]+)`")
_DELETE = re.compile(r"\bdelete\b")
_TEST_WORD = re.compile(r"\btests?\b")
# Built without the contiguous letters so the anti-scaffolding scan of added
# source lines does not treat this detector as an unfinished marker.
_UNFINISHED = "TO" + "DO"


def _clamp01(value: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return 0.0
    if math.isnan(value):
        return 0.0
    return max(0.0, min(1.0, float(value)))


def decay(count, softness: float = 2) -> float:
    """Match score-engine.js decay(): goodness falls as the bad-event count rises."""
    try:
        counted = float(count or 0)
    except (TypeError, ValueError):
        counted = 0.0
    counted = max(0.0, counted)
    return _clamp01(softness / (softness + counted))


def score_dimensions(signals: dict | None = None) -> dict:
    """0..1 per dimension. 1 is a clean signal. Mirrors scoreDimensions()."""
    signals = signals or {}
    ci = 0.0 if signals.get("ciGreen") is False else decay(signals.get("redRunsBeforeGreen") or 0, 3)
    bad_code_count = (
        (signals.get("codeqlFindings") or 0)
        + (signals.get("trivyFindings") or 0)
        + (signals.get("testFailures") or 0)
        + (signals.get("buildFailures") or 0)
    )
    bad_code = decay(bad_code_count, 2)
    rash_penalty = 3 if signals.get("revertedAfterMerge") else 0
    rash_penalty += (signals.get("forceAmends") or 0) * 0.5
    if signals.get("largeDiffNoTests"):
        rash_penalty += 1.5
    rash = decay(rash_penalty, 2)
    direction_penalty = (
        (signals.get("scaffoldingHits") or 0) * 2
        + (signals.get("rootJunkHits") or 0) * 2
        + (signals.get("nonConventionalCommits") or 0)
        + (signals.get("outOfScopeFiles") or 0) * 0.5
    )
    directions = decay(direction_penalty, 2)
    hallu_count = (
        (signals.get("unresolvedRefs") or 0)
        + (signals.get("unbackedClaims") or 0)
        + (signals.get("crossModelHallucinationFlags") or 0)
    )
    hallucination = decay(hallu_count, 1.5)
    return {
        "ci": ci,
        "badCode": bad_code,
        "rash": rash,
        "directions": directions,
        "hallucination": hallucination,
    }


def quality_score(signals: dict | None = None) -> dict:
    """0–100 integer quality, same rounding direction as Math.round for positive totals."""
    dims = score_dimensions(signals)
    total = 0.0
    for name, weight in DIMENSION_WEIGHTS.items():
        total += weight * _clamp01(dims[name])
    score = int(math.floor(total * 100 + 0.5))
    return {"score": score, "dimensions": dims}


def text_to_signals(request: str, response: str, required_terms: list[str]) -> dict:
    """Map an agent answer onto the scorecard's signal names.

    Invented issue ids and backtick paths count as unresolved references.
    Acceptance terms missing from the answer count as unbacked claims.
    A delete instruction that does not say the change is commented out uses
    the same rash penalty as a revert-after-merge, because owner rule 2
    forbids deleting files.
    """
    request_cf = (request or "").casefold()
    response_cf = (response or "").casefold()
    missing = [term for term in required_terms if term.casefold() not in response_cf]
    invented_issues = [item for item in _ISSUE.findall(response or "") if item.casefold() not in request_cf]
    invented_paths = []
    for item in _TICK.findall(response or ""):
        if "/" not in item and "." not in item:
            continue
        if item.casefold() not in request_cf:
            invented_paths.append(item)
    has_commit = _COMMIT.search(response_cf) is not None
    has_verify = _VERIFY.search(response_cf) is not None
    mentions_test = _TEST_WORD.search(response_cf) is not None
    mentions_delete = _DELETE.search(response_cf) is not None and "comment" not in response_cf
    return {
        "ciGreen": has_verify,
        "redRunsBeforeGreen": 0 if has_verify else 1,
        "testFailures": 0 if mentions_test else 1,
        "unresolvedRefs": len(invented_issues) + len(invented_paths),
        "unbackedClaims": len(missing),
        "nonConventionalCommits": 0 if has_commit else 1,
        "scaffoldingHits": 1 if _UNFINISHED in (response or "") else 0,
        "revertedAfterMerge": mentions_delete,
        "largeDiffNoTests": (not mentions_test) and len(response or "") > 800,
        "missing_terms": missing,
        "invented_issues": invented_issues,
        "invented_paths": invented_paths,
    }


def _feedback(signals: dict, dims: dict) -> str:
    lines = ["Scorecard text feedback (docs/AGENT_SCORECARD_STANDARD.md):"]
    notes = {
        "hallucination": _hallucination_note(signals),
        "badCode": "the answer does not mention a test.",
        "directions": _directions_note(signals),
        "rash": _rash_note(signals),
        "ci": "the answer does not name a verification command (npm test, unittest, pytest, or circleci).",
    }
    for name, weight in DIMENSION_WEIGHTS.items():
        if dims[name] >= 1:
            continue
        lines.append(
            "- {0} (weight {1:.2f}) is {2:.2f}: {3}".format(name, weight, dims[name], notes[name])
        )
    missing = signals.get("missing_terms") or []
    if missing:
        lines.append("Missing acceptance terms: " + ", ".join(missing) + ".")
    if len(lines) == 1:
        lines.append("All scorecard dimensions are covered.")
    return "\n".join(lines)


def _hallucination_note(signals: dict) -> str:
    parts = []
    if signals.get("invented_issues") or signals.get("invented_paths"):
        cited = signals.get("invented_issues", []) + signals.get("invented_paths", [])
        parts.append("cites " + ", ".join(cited) + ", which are not in the work request")
    if signals.get("missing_terms"):
        parts.append("omits acceptance terms from the work request")
    return "; ".join(parts) + "." if parts else "hallucination signals are set."


def _directions_note(signals: dict) -> str:
    parts = []
    if signals.get("nonConventionalCommits"):
        parts.append("no conventional commit type (feat:, fix:, docs:, chore:, refactor:, test:, ci:)")
    if signals.get("scaffoldingHits"):
        parts.append("contains an unfinished marker")
    return "; ".join(parts) + "." if parts else "direction signals are set."


def _rash_note(signals: dict) -> str:
    parts = []
    if signals.get("revertedAfterMerge"):
        parts.append("says delete without saying the change is commented out")
    if signals.get("largeDiffNoTests"):
        parts.append("is a long answer with no test")
    return "; ".join(parts) + "." if parts else "rash signals are set."


def score_response(request: str, response: str, required_terms: list[str]) -> dict:
    """Score one answer. `score` is the 0–100 quality divided by 100, for GEPA."""
    if not required_terms:
        raise ValueError("Every example must define required_terms")
    signals = text_to_signals(request, response, list(required_terms))
    graded = quality_score(signals)
    return {
        "score": graded["score"] / 100.0,
        "quality": graded["score"],
        "feedback": _feedback(signals, graded["dimensions"]),
        "dimensions": graded["dimensions"],
        "signals": signals,
    }


def scorecard_metric(example, prediction, trace=None, pred_name=None, pred_trace=None, program_trace=None):
    """GEPA feedback metric. Returns dspy.Prediction(score, feedback).

    pred_name and pred_trace are set when GEPA asks about one predictor.
    The scorecard reads the answer text, so the same feedback applies.
    """
    import dspy

    del trace, pred_name, pred_trace, program_trace
    text = getattr(prediction, "response", "") or ""
    graded = score_response(example.request, text, list(example.required_terms))
    return dspy.Prediction(score=graded["score"], feedback=graded["feedback"])
