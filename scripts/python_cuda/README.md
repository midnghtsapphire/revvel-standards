# Python-CUDA layer — Probabilistic AI Response Validation

**WR:** [#16972](https://github.com/midnghtsapphire/revvel-standards/issues/16972)
**Skill:** [`skills/probabilistic-orchestration`](../../skills/probabilistic-orchestration/SKILL.md)
**Module:** `scripts/python_cuda/probabilistic_validator.py`

## Why this exists

AI outputs are **not** database rows. The same prompt can return different shapes,
types, or invented facts on every call. This package is the warp-level gate in the
fleet’s CUDA-inspired controller model (`docs/controller/README.md`):

| CUDA analogy | Fleet |
| --- | --- |
| Grid scheduler | Fleet controller |
| Thread block | Orchestrator / pipeline |
| Warp / thread | Single AI call |
| **Warp-level gate (this)** | Validate → correct → score → fallback |

Nothing leaves the SM until the five layers below pass — or a documented safe
fallback is returned. Callers never see an uncaught exception from a bad model
reply.

## Five layers

### 1. Prompt validation (defensive prompting)

```python
from scripts.python_cuda.probabilistic_validator import build_defensive_prompt

prompt = build_defensive_prompt(
    "Extract the purchase date and total.",
    context=raw_receipt_text,
    output_schema={
        "type": "object",
        "required": ["date", "total"],
        "properties": {
            "date": {"type": "date"},          # YYYY-MM-DD only
            "total": {"type": "number", "minimum": 0},
        },
    },
    extra_constraints=["Currency is USD. Do not convert."],
)
```

The builder always injects:

- **Explicit constraints** (JSON-only, schema, custom rules)
- **Grounding rules** (`INSUFFICIENT_DATA` / `NULL` instead of invention)
- **No-explanation** closer so parsers see pure structure

### 2. Structural validation

```python
from scripts.python_cuda.probabilistic_validator import AIResponseValidator

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
result = v.validate_structured(model_text)
# result.ok / result.data / result.errors
```

Handles markdown fences, outermost `{...}` recovery, type/enum/range/pattern
checks, and optional Pydantic models when installed. Stdlib path needs no pip.

### 3. Self-correction loop

```python
def call_openrouter(prompt, messages) -> str:
    ...  # your client; tests inject fakes

orch = AIResponseValidator(schema=schema, max_retries=2)
out = orch.run(prompt, call_openrouter)
# out.ok, out.data, out.attempts, out.fallback
```

On structural or low-confidence failure the validator appends a correction
turn (“You generated an invalid response. Error: …”) and retries. The retry
budget is `max_retries` correction attempts beyond the first call; total model
calls = `max_retries + 1` (default `max_retries=3` → up to 4 calls).

### 4. Factuality / heuristics

```python
out = AIResponseValidator(
    schema=schema,
    confidence_threshold=0.55,
    heuristics={
        "numeric_ranges": {"price": (0, 1000)},
        "cross_ref": {"price": yesterday_close},
        "cross_ref_tolerance": 0.10,  # ±10%
    },
).run(prompt, call_model)
```

Correct JSON is not enough — Apple at $5,000 fails the cross-ref and falls back.

### 5. Graceful degradation

When retries are exhausted:

```json
{
  "ok": false,
  "fallback": {
    "degraded": true,
    "reason": "structural_validation",
    "message": "We couldn't verify this information in real-time. Please check https://source.example directly."
  }
}
```

## CLI

```bash
# Offline contract suite (also run from npm test)
python3 scripts/python_cuda/probabilistic_validator.py --self-test

# Ad-hoc validate
python3 scripts/python_cuda/probabilistic_validator.py \
  --validate-json '{"price": 45.99, "in_stock": true}' \
  --schema-json '{"type":"object","required":["price","in_stock"],"properties":{"price":{"type":"number"},"in_stock":{"type":"boolean"}}}'
```

## Tests

- Python: `--self-test` (edge cases: bad types, fences, dates, patterns,
  exhausted retries, transport errors, hallucination markers, cross-ref).
- Node harness: `tests/probabilistic-ai-validator.test.js` shells out to
  `--self-test` so `npm test` gates the module.

## Design rules (do not weaken)

1. **Never treat AI output as deterministic.** Always validate format *and*
   semantics before downstream use.
2. **Errors are feedback, not crashes.** Route validator failures into the
   correction loop; only the final fallback is user-visible.
3. **Cap retries** (money + latency). Default `max_retries=3`.
4. **Log anomalies.** `AnomalyLog.metrics()` feeds accuracy dashboards.
5. **Stdlib-first.** Optional Pydantic is a bonus, not a hard dependency.
