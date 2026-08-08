"""Python-CUDA layer: probabilistic AI response validation for the fleet.

CUDA framing (see docs/controller/README.md): each AI call is a warp/thread.
This package is the warp-level validation gate — structured outputs, self-
correction retries, factuality heuristics, and graceful degradation — so
non-deterministic model replies never poison downstream blocks.
"""

from .probabilistic_validator import (  # noqa: F401
    AIResponseValidator,
    AnomalyLog,
    ConfidenceScore,
    FallbackResult,
    OrchestrationResult,
    ValidationResult,
    build_defensive_prompt,
    build_correction_prompt,
    DEFAULT_FALLBACK_MESSAGE,
)

__all__ = [
    "AIResponseValidator",
    "AnomalyLog",
    "ConfidenceScore",
    "FallbackResult",
    "OrchestrationResult",
    "ValidationResult",
    "build_defensive_prompt",
    "build_correction_prompt",
    "DEFAULT_FALLBACK_MESSAGE",
]
