"""Prosecution gates: deterministic cross-examination of a hypothesis.

A hypothesis is a claim about one corpus word, e.g.
    {"word": "KU-RO", "role": "transaction-term", "claim": "means 'total'"}

Gates return (passed, score_0_to_1, note). The deterministic verdict is the
mean gate score; the LLM prosecutor can argue but cannot override the gates.
"""

from __future__ import annotations

from dataclasses import dataclass

from gorila_ge.corpus import Inscription

from . import stats

ROLES = ("transaction-term", "commodity", "toponym", "anthroponym", "unknown")


@dataclass
class GateResult:
    name: str
    passed: bool
    score: float
    note: str


def gate_attestation(pack: dict) -> GateResult:
    """A claim about a word attested once is unfalsifiable: fail."""
    n = pack["occurrences"]
    if n == 0:
        return GateResult("attestation", False, 0.0, "word not in corpus")
    if n == 1:
        return GateResult("attestation", False, 0.1, "hapax legomenon")
    score = min(1.0, n / 20)
    return GateResult("attestation", True, score, f"{n} occurrences")


def gate_cross_site(pack: dict, hypothesis: dict) -> GateResult:
    """Toponyms concentrate at few sites; function words spread widely."""
    sites = pack["sites"]
    nsites = len(sites)
    role = hypothesis.get("role", "unknown")
    if role == "transaction-term":
        ok = nsites >= 2
        return GateResult(
            "cross-site", ok, min(1.0, nsites / 4),
            f"attested at {nsites} site(s); a structural term should travel",
        )
    if role == "toponym":
        total = sum(sites.values()) or 1
        top = max(sites.values()) if sites else 0
        conc = top / total
        return GateResult(
            "cross-site", conc >= 0.6, conc,
            f"concentration {conc:.2f} at dominant site (toponyms localize)",
        )
    return GateResult("cross-site", True, 0.5, f"{nsites} site(s); neutral for role={role}")


def gate_numeral_affinity(pack: dict, hypothesis: dict) -> GateResult:
    """Transaction terms and commodities should be followed by numerals."""
    followed = pack["followed_by"]
    total = sum(followed.values()) or 1
    numish = (followed.get("num", 0) + followed.get("frac", 0)) / total
    role = hypothesis.get("role", "unknown")
    if role in ("transaction-term", "commodity"):
        return GateResult(
            "numeral-affinity", numish >= 0.5, numish,
            f"{numish:.0%} of occurrences immediately precede a numeral",
        )
    return GateResult("numeral-affinity", True, 0.5, f"{numish:.0%}; neutral for role={role}")


def gate_arithmetic(corpus: dict[str, Inscription], hypothesis: dict) -> GateResult:
    """For 'total'-type claims: audit the sums. The killer gate."""
    claim = (hypothesis.get("claim") or "").lower()
    if "total" not in claim and "sum" not in claim:
        return GateResult("arithmetic", True, 0.5, "not a totaling claim; gate neutral")
    checks = stats.kuro_checks(corpus, hypothesis["word"])
    if not checks:
        return GateResult("arithmetic", False, 0.0, "no auditable documents found")
    clean = [c for c in checks if not c.damaged]
    sample = clean or checks
    exact = sum(1 for c in sample if c.ok)
    near = sum(1 for c in sample if c.near)
    rate = near / len(sample)
    worst = max(sample, key=lambda c: abs(c.discrepancy))
    return GateResult(
        "arithmetic",
        rate >= 0.5,
        rate,
        f"{exact}/{len(sample)} audited documents sum exactly, "
        f"{near}/{len(sample)} within one unit (fraction-sign tolerance) "
        f"(worst: {worst.inscription} off by {worst.discrepancy:+g}; "
        f"{len(checks) - len(clean)} damaged docs excluded)",
    )


def prosecute(corpus: dict[str, Inscription], hypothesis: dict, pack: dict) -> dict:
    gates = [
        gate_attestation(pack),
        gate_cross_site(pack, hypothesis),
        gate_numeral_affinity(pack, hypothesis),
        gate_arithmetic(corpus, hypothesis),
    ]
    score = sum(g.score for g in gates) / len(gates)
    failed = [g for g in gates if not g.passed]
    grade = "A" if score >= 0.75 and not failed else "B" if score >= 0.5 else "C"
    return {
        "gates": [g.__dict__ for g in gates],
        "score": round(score, 3),
        "failed_gates": [g.name for g in failed],
        "grade": grade,
    }
