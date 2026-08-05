"""Reasoning / judge agent.

Takes the scored claims from the fleet and assembles a case-level verdict that
is deliberately NOT a fraud verdict. It reports, per claim:
  - what is substantiated
  - what is unsubstantiated
  - what is unknowable from public sources
  - every refusal, with rationale

It resolves contradictions by letting the scorer's contradiction penalty stand,
and it computes a single case-level "evidentiary integrity" readout that can
never round up to 'fraud confirmed'.
"""
from __future__ import annotations
from confidence import score_case, load_config, ClaimScore


VERDICT_LANGUAGE = {
    "SUBSTANTIATED": "substantiated by primary/adjudicated record",
    "SUPPORTED": "supported but not adjudicated",
    "WEAK": "weakly supported; treat as unverified",
    "UNSUBSTANTIATED": "asserted but unsubstantiated in provided sources",
    "REFUSED/UNKNOWABLE": "refused or unknowable from public sources",
}


def adjudicate(case: dict, cfg: dict) -> dict:
    scores: list[ClaimScore] = score_case(case, cfg)
    claim_text = {c["id"]: c["text"] for c in case["claims"]}
    claim_notes = {c["id"]: c.get("notes", "") for c in case["claims"]}

    claim_out = []
    for s in scores:
        claim_out.append({
            "id": s.claim_id,
            "text": claim_text[s.claim_id],
            "confidence": s.confidence,
            "band": s.band,
            "verdict": VERDICT_LANGUAGE[s.band],
            "refused": s.refused,
            "rationale": s.rationale,
            "analyst_note": claim_notes[s.claim_id],
        })

    scored = [s for s in scores if not s.refused]
    integrity = round(sum(s.confidence for s in scored) / len(scored), 3) if scored else 0.0

    return {
        "case_id": case["case_id"],
        "title": case["title"],
        "scope_note": case["scope_note"],
        "claims": claim_out,
        "refused_count": sum(1 for s in scores if s.refused),
        "case_evidentiary_integrity": integrity,
        "headline_finding": _headline(claim_out),
        "disclaimer": "This output scores the evidentiary strength of public claims. "
                      "It is NOT a finding of fraud, guilt, or wrongdoing by any person.",
    }


def _headline(claims: list[dict]) -> str:
    best = max((c for c in claims if not c["refused"]),
               key=lambda c: c["confidence"], default=None)
    if not best:
        return "No claim could be scored; all refused or unsourced."
    # "scored", not "verified" — a low-band best item is not verified, just the strongest.
    return (f"Strongest scored item ({best['band']}): '{best['text']}' "
            f"at {best['confidence']:.0%} confidence. "
            f"{sum(1 for c in claims if c['refused'])} claim(s) refused.")


if __name__ == "__main__":
    import json, os, sys
    cfg = load_config(os.path.join(os.path.dirname(__file__), "..", "config", "source_tiers.yaml"))
    seed = sys.argv[1] if len(sys.argv) > 1 else \
        os.path.join(os.path.dirname(__file__), "..", "data", "seed", "newsom_case.json")
    with open(seed) as f:
        case = json.load(f)
    print(json.dumps(adjudicate(case, cfg), indent=2))
