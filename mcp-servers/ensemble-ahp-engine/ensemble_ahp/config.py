"""Judge lane configuration for WR-4483 M1.

Three judges, each a distinct model FAMILY (R1 / F1 fix from WR-4483).
Primary models route through OpenRouter; tier-2 is the keyless Perplexity
lane per WR-4481 (402 -> immediate failover; 429 -> one backoff then failover).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

# Saaty fundamental scale bounds
SAATY_MIN = 1 / 9
SAATY_MAX = 9.0

# Random Index (Saaty) for consistency ratio — n = matrix order
# Source: Saaty, T.L. (1980). The Analytic Hierarchy Process. McGraw-Hill.
# Confidence: HIGH (standard published RI table; n=1..15 commonly cited).
SAATY_RI: dict[int, float] = {
    1: 0.0,
    2: 0.0,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
    11: 1.51,
    12: 1.48,
    13: 1.56,
    14: 1.57,
    15: 1.59,
}

DEFAULT_JUDGE_COUNT = 3
DEFAULT_CRITERIA_COUNT = 5
DEFAULT_ALTERNATIVE_COUNT = 4
CR_SOFT_THRESHOLD = 0.10  # reported, not enforced as "correctness" (R3)

BACKOFF_429_SECONDS = 30.0
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# Keyless Perplexity public bridge (same family used by scripts/llm.js).
# Used only as tier-2 failover; never silently substitutes diversity.
PERPLEXITY_KEYLESS_HINT = "perplexity/sonar (keyless-bridge)"


@dataclass(frozen=True)
class JudgeLane:
    """One heterogeneous judge: family is the diversity unit, not persona."""

    id: str
    family: str
    primary_model: str
    fallback_model: str
    # OpenRouter free-tier / keyless-oriented fallback when primary returns 402/429
    keyless_model: str = "openrouter/auto"


# M1 default panel — three DISTINCT families (asserted in ledger).
# Model IDs follow OpenRouter vendor/model convention (MODEL_CONFIG.md).
DEFAULT_JUDGES: tuple[JudgeLane, ...] = (
    JudgeLane(
        id="judge-anthropic",
        family="anthropic",
        primary_model="anthropic/claude-opus-4.7",
        fallback_model="anthropic/claude-haiku-4.5",
        keyless_model="openrouter/free",
    ),
    JudgeLane(
        id="judge-openai",
        family="openai",
        primary_model="openai/gpt-4o-mini",
        fallback_model="openai/gpt-4o-mini",
        keyless_model="openrouter/free",
    ),
    JudgeLane(
        id="judge-google",
        family="google",
        primary_model="google/gemini-2.5-flash",
        fallback_model="google/gemini-2.5-flash",
        keyless_model="openrouter/free",
    ),
)


def select_judges(k: int = DEFAULT_JUDGE_COUNT) -> Sequence[JudgeLane]:
    """Return the first k default judges (minimum 3 for M1 acceptance)."""
    if k < 3:
        raise ValueError("WR-4483 M1 requires at least 3 judges (distinct families).")
    if k > len(DEFAULT_JUDGES):
        # M1 ships exactly three family lanes; expanding the panel is M2+.
        raise ValueError(
            f"M1 ships {len(DEFAULT_JUDGES)} judge families; requested k={k}."
        )
    return DEFAULT_JUDGES[:k]
