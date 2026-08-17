#!/usr/bin/env python3
"""Probabilistic AI response validation for the Python-CUDA layer (WR-16972).

Traditional code treats outputs as deterministic. LLM pipelines do not: the
model may hallucinate, ignore formatting, or reshape JSON on every call.
This module implements the five-layer "Probabilistic Orchestration" guardrail
stack used by the DRAGNET fleet:

  1. Prompt Validation Layer   — defensive constraints + grounding rules
  2. Structural Validation     — JSON parse + schema/type/regex checks
  3. Self-Correction Loop      — feed validator errors back to the model
  4. Factuality / Heuristics   — range, cross-ref, confidence scoring
  5. Graceful Degradation      — safe fallback when retries are exhausted

CUDA framing (docs/controller/README.md): the fleet controller is a grid
scheduler; each AI call is a warp. This module is the warp-level gate —
results only leave the SM after every layer passes (or a documented fallback
is returned). It never crashes the caller on a malformed model reply.

Stdlib only. Optional Pydantic is used when installed; pure-Python schema
checks always run so CI stays keyless and dependency-free.

Usage:
  python scripts/python_cuda/probabilistic_validator.py --self-test
  python scripts/python_cuda/probabilistic_validator.py \\
      --validate-json '{"price": 45.99, "in_stock": true}' \\
      --schema-json '{"type":"object","required":["price","in_stock"],
                      "properties":{"price":{"type":"number","minimum":0},
                                    "in_stock":{"type":"boolean"}}}'
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Mapping, Optional, Sequence

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_MAX_RETRIES = 3
DEFAULT_CONFIDENCE_THRESHOLD = 0.55
DEFAULT_FALLBACK_MESSAGE = (
    "We couldn't verify this information in real-time. "
    "Please check the original source directly."
)

# Grounding / refusal tokens models are instructed to emit.
INSUFFICIENT_DATA_TOKEN = "INSUFFICIENT_DATA"
NULL_TOKEN = "NULL"

# Common date formats we accept when a field is typed "date".
_DATE_RX = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_ISO_DT_RX = re.compile(
    r"^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$"
)

# Patterns that often signal hallucination / non-grounded inventiveness.
_HALLUCINATION_MARKERS = (
    re.compile(r"\bas an ai\b", re.I),
    re.compile(r"\bi (?:don't|do not) have (?:access|real[- ]time)\b", re.I),
    re.compile(r"\bi made (?:this|that) up\b", re.I),
    re.compile(r"\bcannot (?:verify|confirm)\b", re.I),
)

JSONType = Any
Schema = Mapping[str, Any]
Caller = Callable[[str, Sequence[Mapping[str, str]]], str]


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class ValidationResult:
    """Outcome of structural (+ optional semantic) validation."""

    ok: bool
    data: Optional[JSONType] = None
    errors: list[str] = field(default_factory=list)
    layer: str = "structural"
    raw: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ConfidenceScore:
    """Factuality / heuristic score for a validated payload."""

    score: float
    band: str
    reasons: list[str] = field(default_factory=list)
    checks: dict[str, bool] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class FallbackResult:
    """Safe degraded response when validation/retries fail."""

    message: str
    reason: str
    errors: list[str] = field(default_factory=list)
    degraded: bool = True

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class OrchestrationResult:
    """End-to-end result of the probabilistic orchestration loop."""

    ok: bool
    data: Optional[JSONType] = None
    attempts: int = 0
    validation: Optional[ValidationResult] = None
    confidence: Optional[ConfidenceScore] = None
    fallback: Optional[FallbackResult] = None
    anomalies: list[dict[str, Any]] = field(default_factory=list)
    latency_ms: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "data": self.data,
            "attempts": self.attempts,
            "validation": self.validation.to_dict() if self.validation else None,
            "confidence": self.confidence.to_dict() if self.confidence else None,
            "fallback": self.fallback.to_dict() if self.fallback else None,
            "anomalies": list(self.anomalies),
            "latency_ms": self.latency_ms,
        }


@dataclass
class AnomalyLog:
    """In-memory anomaly ledger (also JSON-serialisable for metrics)."""

    entries: list[dict[str, Any]] = field(default_factory=list)

    def record(
        self,
        kind: str,
        detail: str,
        *,
        attempt: int = 0,
        extra: Optional[Mapping[str, Any]] = None,
    ) -> dict[str, Any]:
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "kind": kind,
            "detail": detail,
            "attempt": attempt,
        }
        if extra:
            entry.update(dict(extra))
        self.entries.append(entry)
        return entry

    def metrics(self) -> dict[str, Any]:
        by_kind: dict[str, int] = {}
        for e in self.entries:
            by_kind[e["kind"]] = by_kind.get(e["kind"], 0) + 1
        return {
            "total_anomalies": len(self.entries),
            "by_kind": by_kind,
        }

    def to_list(self) -> list[dict[str, Any]]:
        return list(self.entries)


# ---------------------------------------------------------------------------
# Layer 1 — Prompt Validation (defensive prompting)
# ---------------------------------------------------------------------------

def build_defensive_prompt(
    task: str,
    *,
    context: str = "",
    output_schema: Optional[Schema] = None,
    extra_constraints: Optional[Sequence[str]] = None,
    require_json: bool = True,
    grounding: bool = True,
) -> str:
    """Compose a prompt that anticipates common model failure modes.

    Explicit constraints beat vague asks. Grounding rules keep the model from
    inventing facts when context is empty. Schema hints push structured output.
    """
    parts: list[str] = [task.strip()]

    if context.strip():
        parts.append("CONTEXT (authoritative — use only this):")
        parts.append(context.strip())
    elif grounding:
        parts.append(
            "CONTEXT: (none provided). If you cannot answer from the task alone, "
            f"output '{INSUFFICIENT_DATA_TOKEN}'."
        )

    constraints: list[str] = []
    if require_json:
        constraints.append(
            "Return ONLY valid JSON. No markdown fences, no commentary, no preamble."
        )
    if grounding:
        constraints.append(
            f"Only use the provided context. If the context does not contain the "
            f"answer, output '{INSUFFICIENT_DATA_TOKEN}' (as a JSON string or "
            f'{{"status": "{INSUFFICIENT_DATA_TOKEN}"}}). Do not invent facts.'
        )
        constraints.append(
            f"If a required scalar field is absent from context, use '{NULL_TOKEN}' "
            "or JSON null — never guess."
        )
    if output_schema:
        constraints.append(
            "Conform exactly to this JSON schema (types, required keys, enums): "
            + json.dumps(output_schema, separators=(",", ":"))
        )
    if extra_constraints:
        constraints.extend(str(c).strip() for c in extra_constraints if str(c).strip())

    if constraints:
        parts.append("CONSTRAINTS:")
        for i, c in enumerate(constraints, 1):
            parts.append(f"  {i}. {c}")

    parts.append("Do not explain your answer.")
    return "\n".join(parts)


def build_correction_prompt(
    original_prompt: str,
    previous_output: str,
    errors: Sequence[str],
) -> str:
    """Layer 3 helper: turn validator failures into corrective feedback."""
    err_block = "\n".join(f"- {e}" for e in errors) or "- (unspecified structural error)"
    return (
        f"{original_prompt}\n\n"
        "CORRECTION REQUIRED:\n"
        "You generated an invalid response. Fix every error below and return "
        "ONLY corrected valid JSON. Do not apologise.\n"
        f"Previous output:\n{previous_output}\n\n"
        f"Errors:\n{err_block}"
    )


# ---------------------------------------------------------------------------
# Layer 2 — Structural Validation
# ---------------------------------------------------------------------------

def extract_json_payload(text: str) -> JSONType:
    """Parse JSON from raw model text, tolerating accidental markdown fences.

    Raises ValueError when nothing parseable is found. Callers treat that as a
    structural failure and enter the self-correction loop — never crash.
    """
    raw = (text or "").strip()
    if not raw:
        raise ValueError("empty model response")

    # Explicit insufficient-data short-circuit (allowed string form).
    if raw == INSUFFICIENT_DATA_TOKEN:
        return {"status": INSUFFICIENT_DATA_TOKEN}

    # Fenced blocks first.
    for match in re.finditer(r"```(?:json)?\s*([\s\S]*?)\s*```", raw, re.I):
        candidate = match.group(1).strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Last-ditch: outermost object or array slice.
    for open_c, close_c in (("{", "}"), ("[", "]")):
        start = raw.find(open_c)
        end = raw.rfind(close_c)
        if start != -1 and end > start:
            try:
                return json.loads(raw[start:end + 1])
            except json.JSONDecodeError:
                continue

    raise ValueError("response did not include valid JSON")


def _type_name(value: Any) -> str:
    # bool is a subclass of int in Python — check it before int.
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return type(value).__name__


def _matches_type(value: Any, expected: str) -> bool:
    expected = expected.lower().strip()
    # JSON Schema multi-type: "string|null" or ["string","null"]
    if "|" in expected:
        return any(_matches_type(value, part) for part in expected.split("|"))
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "string":
        return isinstance(value, str)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "array":
        return isinstance(value, list)
    if expected == "object":
        return isinstance(value, dict)
    if expected == "null":
        return value is None
    if expected == "date":
        return isinstance(value, str) and bool(_DATE_RX.match(value))
    if expected in ("datetime", "date-time"):
        return isinstance(value, str) and bool(_ISO_DT_RX.match(value))
    return True  # unknown type tag — don't hard-fail


def validate_against_schema(data: JSONType, schema: Schema, path: str = "$") -> list[str]:
    """Lightweight JSON-Schema-ish validator (stdlib, no $ref resolution).

    Supports: type, required, properties, items, enum, minimum, maximum,
    minLength, maxLength, pattern, const, additionalProperties (bool).
    """
    errors: list[str] = []
    if not isinstance(schema, Mapping):
        return [f"{path}: schema must be an object"]

    expected_type = schema.get("type")
    if expected_type is not None:
        types = expected_type if isinstance(expected_type, list) else [expected_type]
        if not any(_matches_type(data, str(t)) for t in types):
            errors.append(
                f"{path}: expected type {expected_type}, got {_type_name(data)}"
            )
            # Type mismatch makes further property checks noisy — stop this branch.
            return errors

    if "const" in schema and data != schema["const"]:
        errors.append(f"{path}: expected const {schema['const']!r}, got {data!r}")

    if "enum" in schema:
        allowed = list(schema["enum"])
        if data not in allowed:
            errors.append(f"{path}: value {data!r} not in enum {allowed!r}")

    if isinstance(data, (int, float)) and not isinstance(data, bool):
        if "minimum" in schema and data < schema["minimum"]:
            errors.append(f"{path}: {data} < minimum {schema['minimum']}")
        if "maximum" in schema and data > schema["maximum"]:
            errors.append(f"{path}: {data} > maximum {schema['maximum']}")

    if isinstance(data, str):
        if "minLength" in schema and len(data) < int(schema["minLength"]):
            errors.append(f"{path}: string shorter than minLength {schema['minLength']}")
        if "maxLength" in schema and len(data) > int(schema["maxLength"]):
            errors.append(f"{path}: string longer than maxLength {schema['maxLength']}")
        if "pattern" in schema:
            try:
                rx = re.compile(str(schema["pattern"]))
            except re.error as exc:
                errors.append(f"{path}: invalid schema pattern: {exc}")
            else:
                if not rx.search(data):
                    errors.append(
                        f"{path}: string does not match pattern {schema['pattern']!r}"
                    )

    if isinstance(data, list) and "items" in schema and isinstance(schema["items"], Mapping):
        for i, item in enumerate(data):
            errors.extend(validate_against_schema(item, schema["items"], f"{path}[{i}]"))

    if isinstance(data, dict):
        required = schema.get("required") or []
        for key in required:
            if key not in data:
                errors.append(f"{path}: missing required field '{key}'")
        props = schema.get("properties") or {}
        if isinstance(props, Mapping):
            for key, sub in props.items():
                if key in data and isinstance(sub, Mapping):
                    errors.extend(
                        validate_against_schema(data[key], sub, f"{path}.{key}")
                    )
        if schema.get("additionalProperties") is False:
            allowed_keys = set(props.keys()) if isinstance(props, Mapping) else set()
            for key in data:
                if key not in allowed_keys:
                    errors.append(f"{path}: unexpected field '{key}'")

    return errors


def _try_pydantic(data: JSONType, model: Any) -> list[str]:
    """If a Pydantic model class is supplied, validate with it."""
    try:
        # Pydantic v2
        if hasattr(model, "model_validate"):
            model.model_validate(data)
            return []
        # Pydantic v1
        if hasattr(model, "parse_obj"):
            model.parse_obj(data)
            return []
    except Exception as exc:  # noqa: BLE001 — surface message to correction loop
        return [f"pydantic: {exc}"]
    return [f"pydantic: unsupported model type {type(model)!r}"]


# ---------------------------------------------------------------------------
# Layer 4 — Factuality / Heuristic confidence
# ---------------------------------------------------------------------------

def band_for(score: float) -> str:
    if score >= 0.85:
        return "HIGH"
    if score >= 0.55:
        return "MEDIUM"
    if score >= 0.30:
        return "LOW"
    return "REJECT"


def score_factuality(
    data: JSONType,
    *,
    context: str = "",
    heuristics: Optional[Mapping[str, Any]] = None,
    self_confidence: Optional[float] = None,
) -> ConfidenceScore:
    """Programmatic sanity checks. Correct JSON ≠ true data.

    heuristics keys (all optional):
      - numeric_ranges: {field: (lo, hi)} for dotted paths
      - cross_ref: {field: expected_number} with optional cross_ref_tolerance (default 0.10)
      - required_context_tokens: list[str] that must appear in str(data) or context
      - forbid_markers: bool (default True) — scan for hallucination phrases
    """
    heuristics = dict(heuristics or {})
    reasons: list[str] = []
    checks: dict[str, bool] = {}
    score = 1.0

    # Hallucination phrase scan on the serialised payload.
    blob = json.dumps(data, ensure_ascii=False) if not isinstance(data, str) else data
    if heuristics.get("forbid_markers", True):
        hit = next((rx.pattern for rx in _HALLUCINATION_MARKERS if rx.search(blob)), None)
        checks["no_hallucination_markers"] = hit is None
        if hit:
            score -= 0.35
            reasons.append(f"hallucination marker matched: {hit}")

    # Insufficient-data is honest, not high-confidence truth.
    if (
        data == INSUFFICIENT_DATA_TOKEN
        or (isinstance(data, dict) and data.get("status") == INSUFFICIENT_DATA_TOKEN)
    ):
        checks["grounded_refusal"] = True
        reasons.append("model reported INSUFFICIENT_DATA (grounded refusal)")
        return ConfidenceScore(0.40, band_for(0.40), reasons, checks)

    # Numeric range gates.
    ranges = heuristics.get("numeric_ranges") or {}
    if isinstance(ranges, Mapping) and isinstance(data, Mapping):
        for path, bounds in ranges.items():
            try:
                lo, hi = bounds
            except (TypeError, ValueError):
                continue
            val = _dig(data, str(path))
            ok = isinstance(val, (int, float)) and not isinstance(val, bool) and lo <= val <= hi
            checks[f"range:{path}"] = bool(ok)
            if val is None:
                score -= 0.15
                reasons.append(f"missing numeric field '{path}' for range check")
            elif not ok:
                score -= 0.40
                reasons.append(f"field '{path}'={val!r} outside [{lo}, {hi}]")

    # Cross-reference within relative tolerance (e.g. stock price vs prior close).
    xref = heuristics.get("cross_ref") or {}
    tol = float(heuristics.get("cross_ref_tolerance", 0.10))
    if isinstance(xref, Mapping) and isinstance(data, Mapping):
        for path, expected in xref.items():
            val = _dig(data, str(path))
            if not isinstance(val, (int, float)) or isinstance(val, bool):
                checks[f"xref:{path}"] = False
                score -= 0.25
                reasons.append(f"cross-ref field '{path}' not numeric")
                continue
            try:
                exp = float(expected)
            except (TypeError, ValueError):
                continue
            if exp == 0:
                ok = abs(val) <= tol
            else:
                ok = abs(val - exp) / abs(exp) <= tol
            checks[f"xref:{path}"] = ok
            if not ok:
                score -= 0.45
                reasons.append(
                    f"cross-ref '{path}'={val} diverges >{tol:.0%} from expected {exp}"
                )

    # Tokens that must be present in the authoritative context.
    tokens = heuristics.get("required_context_tokens") or []
    ctx_blob = context.lower()
    for tok in tokens:
        present = str(tok).lower() in ctx_blob
        checks[f"token:{tok}"] = present
        if not present:
            score -= 0.10
            reasons.append(f"expected grounding token missing: {tok}")

    # Optional model self-rating (0..1) — never trust alone, only dampen.
    if self_confidence is not None:
        try:
            sc = float(self_confidence)
        except (TypeError, ValueError):
            sc = 0.0
        sc = max(0.0, min(1.0, sc))
        checks["self_confidence_present"] = True
        # Self-report may dampen, but must never raise, the heuristic score.
        score = min(score, 0.70 * score + 0.30 * sc)
        reasons.append(f"blended model self-confidence={sc:.2f}")

    if not reasons:
        reasons.append("all factuality heuristics passed")

    score = max(0.0, min(1.0, round(score, 3)))
    return ConfidenceScore(score, band_for(score), reasons, checks)


def _dig(obj: Mapping[str, Any], path: str) -> Any:
    cur: Any = obj
    for part in path.split("."):
        if not isinstance(cur, Mapping) or part not in cur:
            return None
        cur = cur[part]
    return cur


# ---------------------------------------------------------------------------
# Layer 5 — Graceful degradation
# ---------------------------------------------------------------------------

def make_fallback(
    reason: str,
    errors: Optional[Sequence[str]] = None,
    *,
    message: str = DEFAULT_FALLBACK_MESSAGE,
    source_hint: str = "",
) -> FallbackResult:
    msg = message
    if source_hint:
        msg = (
            f"We couldn't verify this information in real-time. "
            f"Please check {source_hint} directly."
        )
    return FallbackResult(message=msg, reason=reason, errors=list(errors or []))


# ---------------------------------------------------------------------------
# Orchestrator — ties the five layers together
# ---------------------------------------------------------------------------

class AIResponseValidator:
    """Enterprise guardrail runner for a single probabilistic AI call site."""

    def __init__(
        self,
        *,
        schema: Optional[Schema] = None,
        pydantic_model: Any = None,
        max_retries: int = DEFAULT_MAX_RETRIES,
        confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
        heuristics: Optional[Mapping[str, Any]] = None,
        fallback_message: str = DEFAULT_FALLBACK_MESSAGE,
        source_hint: str = "",
        anomaly_log: Optional[AnomalyLog] = None,
    ) -> None:
        if max_retries < 0:
            raise ValueError("max_retries must be >= 0")
        if not 0.0 <= confidence_threshold <= 1.0:
            raise ValueError("confidence_threshold must be in [0, 1]")
        self.schema = schema
        self.pydantic_model = pydantic_model
        self.max_retries = max_retries
        self.confidence_threshold = confidence_threshold
        self.heuristics = dict(heuristics or {})
        self.fallback_message = fallback_message
        self.source_hint = source_hint
        self.log = anomaly_log or AnomalyLog()

    # -- single-shot structural validate ------------------------------------

    def validate_structured(
        self,
        response: str,
        *,
        schema: Optional[Schema] = None,
        pydantic_model: Any = None,
    ) -> ValidationResult:
        schema = schema if schema is not None else self.schema
        pydantic_model = pydantic_model if pydantic_model is not None else self.pydantic_model
        errors: list[str] = []
        data: Optional[JSONType] = None
        try:
            data = extract_json_payload(response)
        except ValueError as exc:
            self.log.record("parse_error", str(exc))
            return ValidationResult(False, None, [str(exc)], "structural", response)

        if schema is not None:
            errors.extend(validate_against_schema(data, schema))
        if pydantic_model is not None:
            errors.extend(_try_pydantic(data, pydantic_model))

        ok = not errors
        if not ok:
            self.log.record("schema_error", "; ".join(errors))
        return ValidationResult(ok, data if ok else data, errors, "structural", response)

    def check_factuality(
        self,
        data: JSONType,
        *,
        context: str = "",
        heuristics: Optional[Mapping[str, Any]] = None,
        self_confidence: Optional[float] = None,
    ) -> ConfidenceScore:
        merged = dict(self.heuristics)
        if heuristics:
            merged.update(heuristics)
        # Pull self-confidence off payload when present.
        if self_confidence is None and isinstance(data, Mapping) and "confidence" in data:
            try:
                self_confidence = float(data["confidence"])  # type: ignore[arg-type]
            except (TypeError, ValueError):
                self_confidence = None
        score = score_factuality(
            data,
            context=context,
            heuristics=merged,
            self_confidence=self_confidence,
        )
        if score.score < self.confidence_threshold:
            self.log.record(
                "low_confidence",
                f"score={score.score} band={score.band}",
                extra={"reasons": score.reasons},
            )
        return score

    def self_correct_messages(
        self,
        original_prompt: str,
        previous_output: str,
        errors: Sequence[str],
    ) -> list[dict[str, str]]:
        """Build chat messages for a correction attempt (OpenAI-style)."""
        return [
            {
                "role": "user",
                "content": build_correction_prompt(
                    original_prompt, previous_output, errors
                ),
            }
        ]

    # -- full orchestration loop --------------------------------------------

    def run(
        self,
        prompt: str,
        call_model: Caller,
        *,
        context: str = "",
        system: str = "",
    ) -> OrchestrationResult:
        """Call `call_model(prompt, messages)` with validate → correct → fallback.

        `call_model` is injected so tests stay offline and production can wire
        OpenRouter / CUDA pipeline clients without this module importing them.
        Signature: (user_prompt: str, messages: list[dict]) -> str
        """
        t0 = time.perf_counter()
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        last_validation: Optional[ValidationResult] = None
        last_confidence: Optional[ConfidenceScore] = None
        attempts = 0
        # attempts counted as model calls; max_retries is extra correction tries
        max_calls = self.max_retries + 1

        while attempts < max_calls:
            attempts += 1
            try:
                raw = call_model(prompt if attempts == 1 else messages[-1]["content"], messages)
            except Exception as exc:  # noqa: BLE001 — model transport is flaky by nature
                self.log.record("model_error", str(exc), attempt=attempts)
                last_validation = ValidationResult(
                    False, None, [f"model call failed: {exc}"], "transport", None
                )
                # Feed the failure forward as a correction if retries remain.
                if attempts >= max_calls:
                    break
                correction = build_correction_prompt(
                    prompt, "", [f"model call failed: {exc}"]
                )
                # A transport error means the model never replied, so there is
                # no assistant turn to answer. Merge the retry content into the
                # trailing user turn instead of appending a second consecutive
                # user message, which strict chat APIs reject with a 400.
                if messages and messages[-1]["role"] == "user":
                    messages[-1] = {"role": "user", "content": correction}
                else:
                    messages.append({"role": "user", "content": correction})
                continue

            validation = self.validate_structured(raw)
            last_validation = validation
            if not validation.ok:
                self.log.record(
                    "retry_scheduled",
                    f"structural failure on attempt {attempts}",
                    attempt=attempts,
                    extra={"errors": validation.errors},
                )
                if attempts >= max_calls:
                    break
                messages.append({"role": "assistant", "content": raw})
                messages.append(
                    {
                        "role": "user",
                        "content": build_correction_prompt(
                            prompt, raw, validation.errors
                        ),
                    }
                )
                continue

            conf = self.check_factuality(validation.data, context=context)
            last_confidence = conf
            if conf.score < self.confidence_threshold:
                self.log.record(
                    "retry_scheduled",
                    f"low confidence {conf.score} on attempt {attempts}",
                    attempt=attempts,
                )
                if attempts >= max_calls:
                    # Exhausted — degrade rather than return untrusted data.
                    break
                messages.append({"role": "assistant", "content": raw})
                messages.append(
                    {
                        "role": "user",
                        "content": build_correction_prompt(
                            prompt,
                            raw,
                            [
                                f"confidence {conf.score} below threshold "
                                f"{self.confidence_threshold}: "
                                + "; ".join(conf.reasons)
                            ],
                        ),
                    }
                )
                continue

            # Success path.
            elapsed = (time.perf_counter() - t0) * 1000.0
            return OrchestrationResult(
                ok=True,
                data=validation.data,
                attempts=attempts,
                validation=validation,
                confidence=conf,
                fallback=None,
                anomalies=self.log.to_list(),
                latency_ms=round(elapsed, 3),
            )

        # Exhausted retries → graceful degradation (never raise to UI).
        errors = list(last_validation.errors) if last_validation else ["exhausted retries"]
        if last_confidence and last_confidence.score < self.confidence_threshold:
            reason = "factuality_threshold"
            errors = errors + last_confidence.reasons
        elif last_validation and not last_validation.ok:
            reason = "structural_validation"
        else:
            reason = "retries_exhausted"

        fb = make_fallback(
            reason,
            errors,
            message=self.fallback_message,
            source_hint=self.source_hint,
        )
        self.log.record("fallback", reason, attempt=attempts, extra={"errors": errors})
        # Redact the invalid parsed payload and raw model reply so they are not
        # serialized by to_dict() and leaked to the caller.  Keep only the error
        # list and layer label for diagnostic purposes; full diagnostics are
        # preserved internally via the anomaly log.
        redacted_validation = (
            ValidationResult(
                ok=False,
                data=None,
                errors=list(last_validation.errors),
                layer=last_validation.layer,
                raw=None,
            )
            if last_validation is not None
            else None
        )
        elapsed = (time.perf_counter() - t0) * 1000.0
        return OrchestrationResult(
            ok=False,
            data=None,
            attempts=attempts,
            validation=redacted_validation,
            confidence=last_confidence,
            fallback=fb,
            anomalies=self.log.to_list(),
            latency_ms=round(elapsed, 3),
        )


# ---------------------------------------------------------------------------
# CLI + self-test
# ---------------------------------------------------------------------------

def _cli_validate(args: argparse.Namespace) -> int:
    schema = json.loads(args.schema_json) if args.schema_json else None
    validator = AIResponseValidator(schema=schema)
    result = validator.validate_structured(args.validate_json)
    payload = result.to_dict()
    confidence_ok = True
    if result.ok and args.heuristics_json:
        conf = validator.check_factuality(
            result.data, heuristics=json.loads(args.heuristics_json)
        )
        payload["confidence"] = conf.to_dict()
        confidence_ok = conf.score >= validator.confidence_threshold
        if not confidence_ok:
            payload["ok"] = False
            payload["errors"] = list(payload.get("errors", [])) + conf.reasons
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if result.ok and confidence_ok else 2


def _self_test() -> int:
    """Offline contract checks. Exit 0 only when every check passes."""
    checks: list[tuple[str, bool, str]] = []

    def check(name: str, cond: bool, detail: str = "") -> None:
        checks.append((name, bool(cond), detail))

    # --- Layer 1: defensive prompt -----------------------------------------
    prompt = build_defensive_prompt(
        "Extract the price and stock flag.",
        context="The widget costs $12.50 and is in stock.",
        output_schema={
            "type": "object",
            "required": ["price", "in_stock"],
            "properties": {
                "price": {"type": "number"},
                "in_stock": {"type": "boolean"},
            },
        },
        extra_constraints=["Dates must be YYYY-MM-DD when present."],
    )
    check("defensive_prompt_has_constraints", "CONSTRAINTS:" in prompt)
    check("defensive_prompt_grounds", "Only use the provided context" in prompt)
    check("defensive_prompt_schema", '"price"' in prompt and "in_stock" in prompt)
    check("defensive_prompt_no_explain", "Do not explain" in prompt)

    empty_ctx = build_defensive_prompt("Summarise findings.", context="")
    check(
        "empty_context_forces_insufficient",
        INSUFFICIENT_DATA_TOKEN in empty_ctx,
    )

    # --- Layer 2: structural -----------------------------------------------
    good = '{"price": 45.99, "in_stock": true}'
    bad_types = '{"price": "forty-five dollars", "in_stock": "yes"}'
    fenced = "Sure!\n```json\n{\"price\": 10, \"in_stock\": false}\n```\n"
    schema = {
        "type": "object",
        "required": ["price", "in_stock"],
        "properties": {
            "price": {"type": "number", "minimum": 0},
            "in_stock": {"type": "boolean"},
        },
        "additionalProperties": False,
    }
    v = AIResponseValidator(schema=schema)
    r_good = v.validate_structured(good)
    check("valid_json_passes", r_good.ok and r_good.data["price"] == 45.99, str(r_good.errors))
    r_bad = v.validate_structured(bad_types)
    check("type_mismatch_fails", (not r_bad.ok) and any("price" in e for e in r_bad.errors))
    r_fence = v.validate_structured(fenced)
    check("markdown_fence_stripped", r_fence.ok and r_fence.data["price"] == 10)

    r_empty = v.validate_structured("   ")
    check("empty_response_fails", not r_empty.ok)

    r_noise = v.validate_structured("I cannot help with that.")
    check("non_json_fails", not r_noise.ok)

    # Regex / date field
    date_schema = {
        "type": "object",
        "required": ["event_date"],
        "properties": {
            "event_date": {"type": "date"},
            "code": {"type": "string", "pattern": r"^[A-Z]{3}-\d{4}$"},
        },
    }
    v_date = AIResponseValidator(schema=date_schema)
    check(
        "date_format_accepts_iso",
        v_date.validate_structured('{"event_date":"2026-08-05","code":"ABC-1234"}').ok,
    )
    check(
        "date_format_rejects_us",
        not v_date.validate_structured('{"event_date":"08/05/2026","code":"ABC-1234"}').ok,
    )
    check(
        "pattern_rejects_bad_code",
        not v_date.validate_structured('{"event_date":"2026-08-05","code":"nope"}').ok,
    )

    # Required + additionalProperties
    check(
        "missing_required_fails",
        not v.validate_structured('{"price": 1}').ok,
    )
    check(
        "unexpected_field_fails",
        not v.validate_structured(
            '{"price": 1, "in_stock": true, "extra": 1}'
        ).ok,
    )

    # --- Layer 3: self-correction loop -------------------------------------
    # First call returns bad types; second call returns good JSON.
    calls: list[str] = []

    def flaky_model(_prompt: str, _messages: Sequence[Mapping[str, str]]) -> str:
        calls.append(_prompt)
        if len(calls) == 1:
            return bad_types
        return good

    orch = AIResponseValidator(schema=schema, max_retries=2)
    result = orch.run(
        build_defensive_prompt("Extract price.", output_schema=schema),
        flaky_model,
    )
    check("self_correct_recovers", result.ok is True, str(result.to_dict()))
    check("self_correct_two_attempts", result.attempts == 2, f"attempts={result.attempts}")
    check(
        "self_correct_prompt_mentions_error",
        any("invalid response" in c.lower() or "Error" in c or "error" in c for c in calls[1:]),
    )

    # Exhausted retries → fallback, never exception.
    def always_bad(_p: str, _m: Sequence[Mapping[str, str]]) -> str:
        return "not-json-at-all"

    hint = "https://docs.revvel.local/source"
    orch2 = AIResponseValidator(schema=schema, max_retries=1, source_hint=hint)
    degraded = orch2.run("give json", always_bad)
    check("fallback_on_exhaustion", degraded.ok is False and degraded.fallback is not None)
    check(
        "fallback_message_safe",
        degraded.fallback is not None
        and degraded.fallback.message.endswith("directly.")
        and hint in degraded.fallback.message
        and degraded.fallback.degraded is True,
    )
    check("fallback_no_data_leak", degraded.data is None)

    # Model transport exception is also degraded, not raised.
    def boom(_p: str, _m: Sequence[Mapping[str, str]]) -> str:
        raise RuntimeError("upstream 503")

    orch3 = AIResponseValidator(schema=schema, max_retries=0)
    try:
        crashed = orch3.run("x", boom)
        check("transport_error_degrades", crashed.ok is False and crashed.fallback is not None)
    except Exception as exc:  # noqa: BLE001
        check("transport_error_degrades", False, f"raised {exc!r}")

    # Transport-error retries must never send consecutive user turns —
    # strict chat APIs (Anthropic/OpenAI) reject those with a 400.
    seen_messages: list[list[Mapping[str, str]]] = []

    def flaky(_p: str, msgs: Sequence[Mapping[str, str]]) -> str:
        seen_messages.append([dict(m) for m in msgs])
        raise RuntimeError("upstream 503")

    orch3b = AIResponseValidator(schema=schema, max_retries=2)
    orch3b.run("x", flaky)
    no_consecutive_users = all(
        not any(
            a["role"] == "user" and b["role"] == "user"
            for a, b in zip(msgs, msgs[1:])
        )
        for msgs in seen_messages
    )
    check(
        "transport_retry_no_consecutive_user_turns",
        len(seen_messages) == 3 and no_consecutive_users,
        f"calls={len(seen_messages)} roles={[[m['role'] for m in msgs] for msgs in seen_messages]}",
    )

    # --- Layer 4: factuality -----------------------------------------------
    conf_ok = score_factuality(
        {"price": 100.0, "ticker": "AAPL"},
        heuristics={
            "numeric_ranges": {"price": (1, 1000)},
            "cross_ref": {"price": 105.0},
            "cross_ref_tolerance": 0.10,
        },
    )
    check("factuality_in_band", conf_ok.score >= 0.55 and conf_ok.band in ("HIGH", "MEDIUM"), str(conf_ok))

    conf_hallucinated_price = score_factuality(
        {"price": 5000.0, "ticker": "AAPL"},
        heuristics={
            "numeric_ranges": {"price": (1, 1000)},
            "cross_ref": {"price": 190.0},
            "cross_ref_tolerance": 0.10,
        },
    )
    check(
        "factuality_flags_apple_at_5000",
        conf_hallucinated_price.score < 0.55
        and conf_hallucinated_price.band in ("LOW", "REJECT"),
        str(conf_hallucinated_price),
    )

    conf_marker = score_factuality(
        {"summary": "As an AI I cannot verify this claim."},
    )
    check("factuality_marker_penalty", conf_marker.score < 1.0)

    # Low confidence triggers fallback even when JSON is valid.
    def high_price_model(_p: str, _m: Sequence[Mapping[str, str]]) -> str:
        return '{"price": 5000.0, "in_stock": true}'

    orch4 = AIResponseValidator(
        schema=schema,
        max_retries=0,
        confidence_threshold=0.55,
        heuristics={
            "numeric_ranges": {"price": (0, 1000)},
            "cross_ref": {"price": 50.0},
        },
    )
    low = orch4.run("price please", high_price_model)
    check("low_confidence_falls_back", low.ok is False and low.fallback is not None)
    check(
        "low_confidence_reason",
        low.fallback is not None and low.fallback.reason == "factuality_threshold",
    )

    # --- Layer 5 + metrics -------------------------------------------------
    check("anomaly_log_populated", orch2.log.metrics()["total_anomalies"] >= 1)
    check(
        "metrics_by_kind",
        "fallback" in orch2.log.metrics()["by_kind"]
        or "parse_error" in orch2.log.metrics()["by_kind"],
    )

    # Correction prompt builder unit check.
    cp = build_correction_prompt("orig", '{"a":1}', ["a must be string"])
    check("correction_prompt_includes_error", "a must be string" in cp)
    check("correction_prompt_includes_prior", '{"a":1}' in cp)

    # Enum + const
    enum_schema = {
        "type": "object",
        "properties": {"status": {"type": "string", "enum": ["ok", "err"]}},
        "required": ["status"],
    }
    check(
        "enum_rejects_unknown",
        not AIResponseValidator(schema=enum_schema)
        .validate_structured('{"status":"maybe"}')
        .ok,
    )

    # INSUFFICIENT_DATA short path
    ins = extract_json_payload(INSUFFICIENT_DATA_TOKEN)
    check("insufficient_data_token_parses", ins == {"status": INSUFFICIENT_DATA_TOKEN})

    # Constructor guards
    try:
        AIResponseValidator(max_retries=-1)
        check("rejects_negative_retries", False)
    except ValueError:
        check("rejects_negative_retries", True)

    try:
        AIResponseValidator(confidence_threshold=1.5)
        check("rejects_bad_threshold", False)
    except ValueError:
        check("rejects_bad_threshold", True)

    # Successful first-try path (no retries burned).
    def good_model(_p: str, _m: Sequence[Mapping[str, str]]) -> str:
        return good

    orch5 = AIResponseValidator(schema=schema, max_retries=3)
    first = orch5.run("go", good_model)
    check("first_try_success", first.ok and first.attempts == 1)
    check("first_try_has_confidence", first.confidence is not None and first.confidence.score >= 0.55)
    check("latency_non_negative", first.latency_ms >= 0.0)

    # --- report ------------------------------------------------------------
    passed = sum(1 for _, ok, _ in checks if ok)
    for name, ok, detail in checks:
        status = "PASS" if ok else "FAIL"
        extra = f" — {detail}" if detail and not ok else ""
        print(f"  [{status}] {name}{extra}")
    print(f"probabilistic_validator self-test: {passed}/{len(checks)} passed")
    return 0 if passed == len(checks) else 1


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(
        description="Probabilistic AI response validator (Python-CUDA layer)"
    )
    ap.add_argument(
        "--self-test",
        action="store_true",
        help="run offline unit checks; exit != 0 on failure",
    )
    ap.add_argument(
        "--validate-json",
        dest="validate_json",
        help="raw model response text (or JSON string) to validate",
    )
    ap.add_argument(
        "--schema-json",
        dest="schema_json",
        help="JSON schema object as a string",
    )
    ap.add_argument(
        "--heuristics-json",
        dest="heuristics_json",
        help="optional factuality heuristics JSON",
    )
    args = ap.parse_args(list(argv) if argv is not None else None)

    if args.self_test:
        return _self_test()
    if args.validate_json is not None:
        return _cli_validate(args)
    ap.print_help()
    return 64


if __name__ == "__main__":
    sys.exit(main())
