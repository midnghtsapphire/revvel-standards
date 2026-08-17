"""Calibrated confidence scorer for the fraud-signal verification fleet.

Design rules (these are the guardrails, not decoration):
  1. A claim's confidence is CAPPED by its best supporting source tier.
  2. A claim's confidence is CAPPED by its adjudication stage (alleged < charged < convicted).
  3. Corroboration adds, contradiction subtracts — both bounded.
  4. Provenance (how the fact reached the public) discounts the support.
  5. Fraud-verdict claims about named people are REFUSED, not scored.

Pure-stdlib. `load_config` reads YAML if PyYAML is present; otherwise pass a
config dict directly (tests do this) so the scorer never hard-depends on yaml.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import re

# Phrases that indicate a request to adjudicate fraud/guilt of a named person.
REFUSAL_PATTERNS = [
    r"\bcommitted fraud\b",
    r"\bis (?:a )?(?:fraud|criminal|guilty)\b",
    r"\bis guilty of\b",
    r"\bdefrauded\b",
]


@dataclass
class ClaimScore:
    claim_id: str
    confidence: float
    band: str
    refused: bool
    rationale: list[str] = field(default_factory=list)
    tier_cap: Optional[float] = None
    stage_cap: Optional[float] = None


def is_refused(text: str) -> bool:
    t = text.lower()
    return any(re.search(p, t) for p in REFUSAL_PATTERNS)


def band_for(conf: float) -> str:
    # Note: REFUSED/UNKNOWABLE is set explicitly on the refusal/unscored paths via the
    # `refused` flag — never inferred from conf==0 here. A scored claim driven to 0 by
    # contradiction is UNSUBSTANTIATED, not refused.
    if conf >= 0.85:
        return "SUBSTANTIATED"
    if conf >= 0.55:
        return "SUPPORTED"
    if conf >= 0.30:
        return "WEAK"
    return "UNSUBSTANTIATED"


def score_claim(claim: dict, sources: dict, cfg: dict) -> ClaimScore:
    cid = claim["id"]

    # Rule 5: hard refusal gate.
    if claim.get("stage") == "refused" or is_refused(claim["text"]) or cid in cfg.get("_refused_ids", []):
        return ClaimScore(cid, 0.0, "REFUSED/UNKNOWABLE", True,
                          ["Refused: request adjudicates fraud/guilt of a named person; "
                           "no adjudicated record supports a verdict. System reports evidentiary "
                           "strength only, never a fraud verdict."])

    rationale: list[str] = []
    tiers = cfg["tiers"]
    ceilings = cfg["adjudication_ceilings"]
    prov = cfg["provenance"]

    supporting = claim.get("supporting", [])
    if not supporting:
        return ClaimScore(cid, 0.0, "UNSUBSTANTIATED", False,
                          ["No supporting sources provided."])

    # Guard: arbitrary/pasted JSON may reference source ids that don't exist.
    # Fail safe to UNSUBSTANTIATED with an explanation rather than KeyError.
    unknown = [s["source"] for s in supporting if s["source"] not in sources]
    if unknown:
        return ClaimScore(cid, 0.0, "UNSUBSTANTIATED", False,
                          [f"Unknown source id(s): {unknown}. Cannot score; add them to sources[]."])

    # Rule 1: best supporting tier sets the base + the cap.
    def tier_of(s):
        return sources[s["source"]]["tier"]

    best = max(supporting, key=tier_of)
    best_tier = tier_of(best)
    tier_cap = tiers[best_tier]["weight"]
    base = tier_cap * prov.get(best.get("provenance", "anonymous_report"), 0.25)
    rationale.append(
        f"Best source tier {best_tier} ({tiers[best_tier]['name']}, cap {tier_cap:.2f}); "
        f"provenance '{best.get('provenance')}' x{prov.get(best.get('provenance', 'anonymous_report'), 0.25):.2f} -> base {base:.2f}.")

    # Rule 3: corroboration from OTHER independent sources at >= best_tier.
    corr = [s for s in supporting
            if s["source"] != best["source"] and tier_of(s) >= best_tier - 1]
    cbonus = min(len(corr) * cfg["corroboration"]["per_source_bonus"],
                 cfg["corroboration"]["max_bonus"])
    if cbonus:
        rationale.append(f"+{cbonus:.2f} corroboration ({len(corr)} independent source(s)).")

    contra = claim.get("contradicting", [])
    cpen = min(len(contra) * cfg["contradiction"]["per_source_penalty"],
               cfg["contradiction"]["max_penalty"])
    if cpen:
        rationale.append(f"-{cpen:.2f} contradiction ({len(contra)} conflicting source(s)).")

    conf = base + cbonus - cpen

    # Rule 1: cannot exceed tier cap.
    if conf > tier_cap:
        conf = tier_cap
        rationale.append(f"Capped at tier ceiling {tier_cap:.2f}.")

    # Rule 2: cannot exceed adjudication-stage ceiling.
    stage = claim.get("stage", "alleged")
    stage_cap = ceilings.get(stage, 0.45)
    if conf > stage_cap:
        conf = stage_cap
        rationale.append(f"Capped at adjudication ceiling for stage '{stage}' = {stage_cap:.2f}.")

    conf = max(0.0, round(conf, 3))
    return ClaimScore(cid, conf, band_for(conf), False, rationale, tier_cap, stage_cap)


def score_case(case: dict, cfg: dict) -> list[ClaimScore]:
    sources = {s["id"]: s for s in case["sources"]}
    cfg = dict(cfg)
    cfg["_refused_ids"] = case.get("refused_claims", [])
    return [score_claim(c, sources, cfg) for c in case["claims"]]


def load_config(path: str) -> dict:
    try:
        import yaml  # optional dependency
    except ModuleNotFoundError as e:
        raise ModuleNotFoundError(
            "load_config() needs PyYAML: `pip install pyyaml`. Alternatively, build the "
            "config dict yourself and pass it straight to score_case()/score_claim() — "
            "the scorer itself has no yaml dependency.") from e
    with open(path) as f:
        raw = yaml.safe_load(f)
    return {
        "tiers": {int(k): v for k, v in raw["tiers"].items()},
        "adjudication_ceilings": raw["adjudication_ceilings"],
        "corroboration": raw["corroboration"],
        "contradiction": raw["contradiction"],
        "provenance": raw["provenance"],
    }
