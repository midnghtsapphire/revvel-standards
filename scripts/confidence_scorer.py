#!/usr/bin/env python3
"""Deterministic confidence scorer (stdlib only, no LLM, no network).

Standard: docs/standards/confidence-scorer.md

Usage:
    python3 scripts/confidence_scorer.py options.json [--json]
    cat options.json | python3 scripts/confidence_scorer.py --json
"""
import argparse
import json
import sys

VERSION = "1.0.0"

# Fixed weights (sum = 100). Each signal is normalised to 0..1 first.
WEIGHTS = {
    "evidence": 40,          # combined evidence strength across sources
    "source_agreement": 20,  # how much independent sources agree
    "reversibility": 15,     # 1 = fully reversible
    "cost": 10,              # inverted: 0 cost -> full points
    "risk": 15,              # inverted: 0 risk -> full points
}

# Per-source weights inside the evidence signal (sum = 1.0).
EVIDENCE_SOURCES = {
    "web": 0.30,
    "google_drive": 0.25,
    "seo_sem": 0.25,
    "social": 0.20,
}

# A raw count of this size or larger counts as full strength (1.0).
EVIDENCE_COUNT_SATURATION = 10

THRESHOLD = 70.0
MARGIN = 10.0
OWNER = "Audrey"
ACTION_FLAGS = ("destructive", "sends_message", "spends_money")


class InputError(ValueError):
    """Raised when the input JSON does not match the expected shape."""


def _unit(value, name, oid):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise InputError("option %r: %s must be a number in 0..1" % (oid, name))
    if value != value or value < 0 or value > 1:
        raise InputError("option %r: %s must be in 0..1, got %r" % (oid, name, value))
    return float(value)


def _evidence_strength(value, name, oid):
    """Accepts a strength in 0..1 (float) or a non-negative integer count."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise InputError("option %r: evidence.%s must be a number" % (oid, name))
    if value != value or value < 0:
        raise InputError("option %r: evidence.%s must be >= 0" % (oid, name))
    if isinstance(value, int):
        return min(value, EVIDENCE_COUNT_SATURATION) / float(EVIDENCE_COUNT_SATURATION)
    if value > 1:
        raise InputError("option %r: evidence.%s float strength must be <= 1 (use an int for counts)" % (oid, name))
    return float(value)


def _validate(opt, index):
    if not isinstance(opt, dict):
        raise InputError("option #%d must be an object" % index)
    oid = opt.get("id")
    if not isinstance(oid, str) or not oid:
        raise InputError("option #%d: id must be a non-empty string" % index)
    title = opt.get("title", "")
    if not isinstance(title, str):
        raise InputError("option %r: title must be a string" % oid)
    ev = opt.get("evidence", {})
    if not isinstance(ev, dict):
        raise InputError("option %r: evidence must be an object" % oid)
    unknown = sorted(set(ev) - set(EVIDENCE_SOURCES))
    if unknown:
        raise InputError("option %r: unknown evidence source(s): %s" % (oid, ", ".join(unknown)))
    flags = opt.get("flags", {})
    if not isinstance(flags, dict):
        raise InputError("option %r: flags must be an object" % oid)
    for k, v in flags.items():
        if k not in ACTION_FLAGS:
            raise InputError("option %r: unknown flag %r" % (oid, k))
        if not isinstance(v, bool):
            raise InputError("option %r: flag %s must be true/false" % (oid, k))
    for key in ("source_agreement", "reversibility", "cost", "risk"):
        if key not in opt:
            raise InputError("option %r: missing %s" % (oid, key))
    subs = opt.get("sub_choices", [])
    if not isinstance(subs, list):
        raise InputError("option %r: sub_choices must be a list" % oid)
    return oid, title, ev, flags, subs


def score_option(opt, index=0):
    oid, title, ev, flags, subs = _validate(opt, index)
    evidence = 0.0
    evidence_detail = {}
    for src in sorted(EVIDENCE_SOURCES):
        s = _evidence_strength(ev.get(src, 0), src, oid)
        evidence_detail[src] = round(s, 4)
        evidence += EVIDENCE_SOURCES[src] * s
    norm = {
        "evidence": evidence,
        "source_agreement": _unit(opt["source_agreement"], "source_agreement", oid),
        "reversibility": _unit(opt["reversibility"], "reversibility", oid),
        "cost": 1.0 - _unit(opt["cost"], "cost", oid),
        "risk": 1.0 - _unit(opt["risk"], "risk", oid),
    }
    breakdown = {}
    total = 0.0
    for sig in sorted(WEIGHTS):
        pts = round(WEIGHTS[sig] * norm[sig], 2)
        breakdown[sig] = {"normalized": round(norm[sig], 4), "weight": WEIGHTS[sig], "points": pts}
        total += pts
    raised = [f for f in ACTION_FLAGS if flags.get(f)]
    return {
        "id": oid,
        "title": title,
        "score": round(total, 2),
        "breakdown": breakdown,
        "evidence_sources": evidence_detail,
        "flags": raised,
        "needs_owner": bool(raised),
        "_subs": subs,
    }


def _rationale(r, rank, runner_up_score):
    strongest = max(sorted(r["breakdown"]), key=lambda k: r["breakdown"][k]["points"] / r["breakdown"][k]["weight"])
    weakest = min(sorted(r["breakdown"]), key=lambda k: r["breakdown"][k]["points"] / r["breakdown"][k]["weight"])
    parts = ["Ranked #%d with %.2f/100." % (rank, r["score"]),
             "Strongest signal: %s; weakest: %s." % (strongest, weakest)]
    if r["score"] >= THRESHOLD:
        parts.append("At or above the %.0f threshold." % THRESHOLD)
    else:
        parts.append("Below the %.0f threshold." % THRESHOLD)
    if rank == 1 and runner_up_score is not None:
        parts.append("Lead over runner-up: %.2f (needs %.0f)." % (r["score"] - runner_up_score, MARGIN))
    if r["needs_owner"]:
        parts.append("Flagged %s, so %s must approve regardless of score." % (", ".join(r["flags"]), OWNER))
    return " ".join(parts)


def evaluate(options, threshold=THRESHOLD, margin=MARGIN, _depth=0):
    if not isinstance(options, list) or not options:
        raise InputError("input must be a non-empty JSON list of options")
    if _depth > 20:
        raise InputError("sub_choices nested too deeply (max 20)")
    scored = [score_option(o, i) for i, o in enumerate(options)]
    ids = [r["id"] for r in scored]
    if len(set(ids)) != len(ids):
        raise InputError("duplicate option ids")
    scored.sort(key=lambda r: (-r["score"], r["id"]))
    top = scored[0]
    runner = scored[1]["score"] if len(scored) > 1 else None
    lead = round(top["score"] - runner, 2) if runner is not None else None
    ranked = []
    for i, r in enumerate(scored, 1):
        subs = r.pop("_subs")
        r["rank"] = i
        r["rationale"] = _rationale(r, i, runner if i == 1 else None)
        if i == 1 and subs:
            r["sub_decision"] = evaluate(subs, threshold, margin, _depth + 1)
        ranked.append(r)
    if top["needs_owner"]:
        decision = "ask_owner"
        reason = "Top option is flagged %s; %s must approve." % (", ".join(top["flags"]), OWNER)
    elif top["score"] < threshold:
        decision = "gather_more_evidence_or_escalate"
        reason = "Top score %.2f is below threshold %.0f." % (top["score"], threshold)
    elif lead is not None and lead < margin:
        decision = "gather_more_evidence_or_escalate"
        reason = "Lead %.2f over runner-up is below margin %.0f." % (lead, margin)
    else:
        decision = "proceed"
        reason = "Top score %.2f meets threshold %.0f with a clear lead." % (top["score"], threshold)
    return {
        "version": VERSION,
        "threshold": threshold,
        "margin": margin,
        "decision": decision,
        "decision_reason": reason,
        "top_id": top["id"],
        "lead_over_runner_up": lead,
        # True when the chosen option, or the chosen path through its sub-choices, is flagged.
        "needs_owner": top["needs_owner"] or bool(top.get("sub_decision", {}).get("needs_owner")),
        "ranked": ranked,
    }


def render_text(result, indent=""):
    lines = ["%sDecision: %s (%s)" % (indent, result["decision"], result["decision_reason"]),
             "%sneeds_owner: %s" % (indent, "true" if result["needs_owner"] else "false")]
    for r in result["ranked"]:
        lines.append("%s#%d %s  %.2f  %s" % (indent, r["rank"], r["id"], r["score"], r["title"]))
        for sig in sorted(r["breakdown"]):
            b = r["breakdown"][sig]
            lines.append("%s    %-16s %6.2f / %d" % (indent, sig, b["points"], b["weight"]))
        lines.append("%s    %s" % (indent, r["rationale"]))
        if "sub_decision" in r:
            lines.append("%s    Sub-choices:" % indent)
            lines.append(render_text(r["sub_decision"], indent + "      "))
    return "\n".join(lines)


def main(argv=None):
    p = argparse.ArgumentParser(description="Deterministic confidence scorer")
    p.add_argument("file", nargs="?", help="JSON file (default: stdin)")
    p.add_argument("--json", action="store_true", help="emit JSON")
    a = p.parse_args(argv)
    try:
        if a.file and a.file != "-":
            with open(a.file, "r", encoding="utf-8") as fh:
                raw = fh.read()
        else:
            raw = sys.stdin.read()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise InputError("invalid JSON: %s" % e)
        result = evaluate(data)
    except (InputError, OSError) as e:
        sys.stderr.write("error: %s\n" % e)
        return 2
    if a.json:
        sys.stdout.write(json.dumps(result, sort_keys=True, indent=2, ensure_ascii=True) + "\n")
    else:
        sys.stdout.write(render_text(result) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
