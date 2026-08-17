"""WR-4483 M1 pipeline — steps 1-7 only (no critic gate, no sensitivity).

1 STRUCTURE  2 GENERATE  3 VOTE  4 COMPARE  5 AGGREGATE  6 SOLVE  7 CHECK
Then emit the M1 report skeleton (ranked alts, weights, CR, dispersion, cost).
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

from .ahp_math import (
    Matrix,
    consistency,
    geometric_mean_aggregate,
    mean_dispersion,
    per_cell_cv,
    priority_vector,
    reciprocal_close,
    synthesize_alternative_scores,
    top_n,
    vote_aggregate,
)
from .config import (
    CR_SOFT_THRESHOLD,
    DEFAULT_ALTERNATIVE_COUNT,
    DEFAULT_CRITERIA_COUNT,
    DEFAULT_JUDGE_COUNT,
    select_judges,
)
from .judges import JudgeClient, parse_json_object
from .ledger import FailureLedger


SYSTEM_STRUCTURE = (
    "You are the STRUCTURE guide for an Analytic Hierarchy Process (AHP) run. "
    "Reply with ONLY a JSON object: "
    '{"depth":2,"k_judges":3,"n_criteria":5,"n_alternatives":4,"notes":"..."} '
    "No fabricated market stats. Prefer the defaults unless the goal clearly needs otherwise."
)

SYSTEM_GENERATE = (
    "You are one heterogeneous AHP judge (your model family is your identity, not a persona). "
    "Propose criteria and alternatives for the goal. Reply ONLY JSON: "
    '{"criteria":["..."],"alternatives":["..."]}. '
    "No scores yet. No fabricated quantitative claims."
)

SYSTEM_VOTE = (
    "You are one heterogeneous AHP judge. Score each item from 1 (weak) to 9 (essential) "
    "for the stated goal. Reply ONLY JSON: {\"scores\":{\"item\":int}}. "
    "Do not invent external statistics."
)

SYSTEM_COMPARE = (
    "You are one heterogeneous AHP judge. Build a pairwise comparison matrix on the Saaty "
    "1/9..9 scale for the listed items (rows vs columns, same order). "
    "Reply ONLY JSON: {\"labels\":[...],\"matrix\":[[...],...]}. "
    "Diagonal must be 1. Matrix must be reciprocal (a_ji = 1/a_ij). "
    "No commentary outside JSON."
)


@dataclass
class PipelineInput:
    goal: str
    criteria: list[str] | None = None
    alternatives: list[str] | None = None
    k_judges: int = DEFAULT_JUDGE_COUNT
    n_criteria: int = DEFAULT_CRITERIA_COUNT
    n_alternatives: int = DEFAULT_ALTERNATIVE_COUNT
    task_ref: str | None = None
    ledger_path: str | Path | None = None
    mock: bool | None = None


@dataclass
class PipelineResult:
    report: dict[str, Any]
    ledger_path: str
    families_invoked: list[str]
    mock_mode: bool


def _slug(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower()).strip("-")
    return s or "item"


def _canon_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip())


def _merge_unique(lists: Sequence[Sequence[str]]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for group in lists:
        for raw in group:
            name = _canon_name(str(raw))
            key = name.lower()
            if not name or key in seen:
                continue
            seen.add(key)
            out.append(name)
    return out


def run_pipeline(inp: PipelineInput) -> PipelineResult:
    if not inp.goal or not str(inp.goal).strip():
        raise ValueError("goal is required")

    ledger = FailureLedger(inp.ledger_path, repo=os.environ.get("AHP_REPO", "midnghtsapphire/revvel-standards"))
    judges = list(select_judges(inp.k_judges))
    client = JudgeClient(
        ledger,
        mock=inp.mock,
        task_ref=inp.task_ref or "WR-4483-M1",
    )

    steps: dict[str, Any] = {}

    # ── 1. STRUCTURE ────────────────────────────────────────────────────────
    guide = judges[0]
    struct_user = (
        f"GOAL: {inp.goal}\n"
        f"OPTIONAL_CRITERIA_PROVIDED: {bool(inp.criteria)}\n"
        f"OPTIONAL_ALTERNATIVES_PROVIDED: {bool(inp.alternatives)}\n"
        f"DEFAULTS: k_judges={inp.k_judges}, n_criteria={inp.n_criteria}, "
        f"n_alternatives={inp.n_alternatives}"
    )
    struct_res = client.complete(
        guide, step="STRUCTURE", system=SYSTEM_STRUCTURE, user=struct_user
    )
    if not struct_res.ok or not struct_res.response:
        raise RuntimeError(f"STRUCTURE failed: {struct_res.error}")
    try:
        struct = parse_json_object(struct_res.response.text)
    except ValueError:
        struct = {
            "depth": 2,
            "k_judges": inp.k_judges,
            "n_criteria": inp.n_criteria,
            "n_alternatives": inp.n_alternatives,
            "notes": "structure parse fallback to operator defaults (not fabricated market data)",
        }
    k_judges = int(struct.get("k_judges") or inp.k_judges)
    n_criteria = int(struct.get("n_criteria") or inp.n_criteria)
    n_alternatives = int(struct.get("n_alternatives") or inp.n_alternatives)
    # M1 clamps: panel size fixed to available distinct families.
    k_judges = max(3, min(k_judges, len(judges)))
    n_criteria = max(2, min(n_criteria, 9))
    n_alternatives = max(2, min(n_alternatives, 9))
    judges = judges[:k_judges]
    steps["STRUCTURE"] = {
        "depth": int(struct.get("depth") or 2),
        "k_judges": k_judges,
        "n_criteria": n_criteria,
        "n_alternatives": n_alternatives,
        "notes": struct.get("notes"),
        "guide_family": guide.family,
        "guide_model": struct_res.response.model,
    }

    # ── 2. GENERATE ─────────────────────────────────────────────────────────
    if inp.criteria and inp.alternatives:
        criteria_pool = [_canon_name(c) for c in inp.criteria]
        alt_pool = [_canon_name(a) for a in inp.alternatives]
        gen_log = {"skipped": True, "reason": "operator-provided criteria and alternatives"}
    else:
        crit_lists: list[list[str]] = []
        alt_lists: list[list[str]] = []
        gen_details = []
        for j in judges:
            user = f"GOAL: {inp.goal}\nPropose at least {n_criteria} criteria and {n_alternatives} alternatives."
            res = client.complete(j, step="GENERATE", system=SYSTEM_GENERATE, user=user)
            if not res.ok or not res.response:
                raise RuntimeError(f"GENERATE failed for {j.id}: {res.error}")
            try:
                payload = parse_json_object(res.response.text)
            except ValueError as exc:
                raise RuntimeError(f"GENERATE JSON parse failed for {j.id}: {exc}") from exc
            crit_lists.append([str(x) for x in payload.get("criteria") or []])
            alt_lists.append([str(x) for x in payload.get("alternatives") or []])
            gen_details.append(
                {
                    "judge": j.id,
                    "family": j.family,
                    "model": res.response.model,
                    "n_criteria": len(crit_lists[-1]),
                    "n_alternatives": len(alt_lists[-1]),
                }
            )
        criteria_pool = _merge_unique(
            ([_canon_name(c) for c in inp.criteria], *crit_lists)
            if inp.criteria
            else crit_lists
        )
        alt_pool = _merge_unique(
            ([_canon_name(a) for a in inp.alternatives], *alt_lists)
            if inp.alternatives
            else alt_lists
        )
        gen_log = {"skipped": False, "judges": gen_details}
    if len(criteria_pool) < 2:
        raise RuntimeError("GENERATE produced fewer than 2 criteria")
    if len(alt_pool) < 2:
        raise RuntimeError("GENERATE produced fewer than 2 alternatives")
    steps["GENERATE"] = {
        **gen_log,
        "criteria_pool": criteria_pool,
        "alternatives_pool": alt_pool,
    }

    # ── 3. VOTE ─────────────────────────────────────────────────────────────
    crit_score_maps: list[dict[str, float]] = []
    alt_score_maps: list[dict[str, float]] = []
    for j in judges:
        c_user = (
            f"GOAL: {inp.goal}\nVote importance of each criterion.\nITEMS:\n"
            + "\n".join(criteria_pool)
        )
        a_user = (
            f"GOAL: {inp.goal}\nVote suitability of each alternative.\nITEMS:\n"
            + "\n".join(alt_pool)
        )
        c_res = client.complete(j, step="VOTE", system=SYSTEM_VOTE, user=c_user)
        a_res = client.complete(j, step="VOTE", system=SYSTEM_VOTE, user=a_user)
        if not c_res.ok or not c_res.response or not a_res.ok or not a_res.response:
            raise RuntimeError(f"VOTE failed for {j.id}")
        c_payload = parse_json_object(c_res.response.text)
        a_payload = parse_json_object(a_res.response.text)
        crit_score_maps.append(
            {_canon_name(k): float(v) for k, v in (c_payload.get("scores") or {}).items()}
        )
        alt_score_maps.append(
            {_canon_name(k): float(v) for k, v in (a_payload.get("scores") or {}).items()}
        )
    crit_totals = vote_aggregate(crit_score_maps)
    alt_totals = vote_aggregate(alt_score_maps)
    # Keep only pool members (ignore any judge-invented extras at vote time)
    crit_totals = {k: crit_totals.get(k, 0.0) for k in criteria_pool}
    alt_totals = {k: alt_totals.get(k, 0.0) for k in alt_pool}
    criteria = top_n(crit_totals, n_criteria)
    alternatives = top_n(alt_totals, n_alternatives)
    steps["VOTE"] = {
        "criteria_totals": crit_totals,
        "alternative_totals": alt_totals,
        "selected_criteria": criteria,
        "selected_alternatives": alternatives,
    }

    # ── 4. COMPARE ──────────────────────────────────────────────────────────
    criteria_matrices: list[Matrix] = []
    # For each criterion, each judge supplies an alternatives pairwise matrix.
    alt_matrices_by_criterion: list[list[Matrix]] = [[] for _ in criteria]

    def _matrix_from_response(text: str, labels: list[str]) -> Matrix:
        payload = parse_json_object(text)
        raw = payload.get("matrix")
        if not isinstance(raw, list) or not raw:
            raise ValueError("missing matrix")
        n = len(labels)
        mat: Matrix = [[1.0] * n for _ in range(n)]
        for i in range(n):
            row = raw[i] if i < len(raw) else []
            for j in range(n):
                if i == j:
                    mat[i][j] = 1.0
                elif j < len(row):
                    mat[i][j] = float(row[j])
        return reciprocal_close(mat)

    for j in judges:
        c_user = (
            f"GOAL: {inp.goal}\nPairwise-compare criteria importance.\nITEMS:\n"
            + "\n".join(criteria)
        )
        c_res = client.complete(j, step="COMPARE", system=SYSTEM_COMPARE, user=c_user)
        if not c_res.ok or not c_res.response:
            raise RuntimeError(f"COMPARE(criteria) failed for {j.id}")
        criteria_matrices.append(_matrix_from_response(c_res.response.text, criteria))

        for ci, cname in enumerate(criteria):
            a_user = (
                f"GOAL: {inp.goal}\nCriterion: {cname}\n"
                f"Pairwise-compare alternatives on this criterion only.\nITEMS:\n"
                + "\n".join(alternatives)
            )
            a_res = client.complete(j, step="COMPARE", system=SYSTEM_COMPARE, user=a_user)
            if not a_res.ok or not a_res.response:
                raise RuntimeError(f"COMPARE(alts|{cname}) failed for {j.id}")
            alt_matrices_by_criterion[ci].append(
                _matrix_from_response(a_res.response.text, alternatives)
            )

    steps["COMPARE"] = {
        "n_criteria_matrices": len(criteria_matrices),
        "n_alt_matrix_groups": len(alt_matrices_by_criterion),
        "judges": [j.id for j in judges],
    }

    # ── 5. AGGREGATE ────────────────────────────────────────────────────────
    agg_criteria = geometric_mean_aggregate(criteria_matrices)
    agg_alts = [geometric_mean_aggregate(group) for group in alt_matrices_by_criterion]
    steps["AGGREGATE"] = {
        "method": "element-wise geometric mean across judges",
        "criteria_matrix_order": len(agg_criteria),
        "alt_matrix_orders": [len(m) for m in agg_alts],
    }

    # ── 6. SOLVE ────────────────────────────────────────────────────────────
    criteria_weights = priority_vector(agg_criteria)
    alt_priorities_per_criterion = [priority_vector(m) for m in agg_alts]
    global_scores = synthesize_alternative_scores(
        criteria_weights, alt_priorities_per_criterion
    )
    ranking = sorted(
        [
            {"alternative": alternatives[i], "score": global_scores[i], "rank": 0}
            for i in range(len(alternatives))
        ],
        key=lambda r: (-r["score"], r["alternative"]),
    )
    for idx, row in enumerate(ranking, start=1):
        row["rank"] = idx
    steps["SOLVE"] = {
        "criteria_weights": {
            criteria[i]: criteria_weights[i] for i in range(len(criteria))
        },
        "alternative_priorities_given_criterion": {
            criteria[ci]: {
                alternatives[ai]: alt_priorities_per_criterion[ci][ai]
                for ai in range(len(alternatives))
            }
            for ci in range(len(criteria))
        },
        "global_scores": {
            alternatives[i]: global_scores[i] for i in range(len(alternatives))
        },
    }

    # ── 7. CHECK ────────────────────────────────────────────────────────────
    crit_cons = consistency(agg_criteria, criteria_weights)
    alt_cons = [consistency(m) for m in agg_alts]
    crit_cv = per_cell_cv(criteria_matrices)
    alt_cvs = [per_cell_cv(group) for group in alt_matrices_by_criterion]
    steps["CHECK"] = {
        "criteria_consistency": {
            "lambda_max": crit_cons.lambda_max,
            "ci": crit_cons.ci,
            "ri": crit_cons.ri,
            "cr": crit_cons.cr,
            "ri_source": crit_cons.ri_source,
            "cr_soft_threshold": CR_SOFT_THRESHOLD,
            "cr_below_soft_threshold": crit_cons.cr < CR_SOFT_THRESHOLD,
            "note": (
                "CR measures internal consistency of the aggregated matrix, "
                "NOT correctness (WR-4483 R3). Dispersion is reported separately."
            ),
        },
        "alternative_consistency_by_criterion": {
            criteria[i]: {
                "cr": alt_cons[i].cr,
                "ci": alt_cons[i].ci,
                "lambda_max": alt_cons[i].lambda_max,
            }
            for i in range(len(criteria))
        },
        "dispersion": {
            "method": "per-cell coefficient of variation across judges",
            "criteria_mean_offdiag_cv": mean_dispersion(crit_cv),
            "criteria_per_cell_cv": crit_cv,
            "alternatives_mean_offdiag_cv_by_criterion": {
                criteria[i]: mean_dispersion(alt_cvs[i]) for i in range(len(criteria))
            },
        },
    }

    # ── Family assertion (ledger) ───────────────────────────────────────────
    families = list(client.families_used) or [j.family for j in judges]
    ledger.assert_distinct_families(families, minimum=2, task_ref=client.task_ref)

    # ── Cost line (no fabricated totals) ────────────────────────────────────
    if client.mock:
        cost_line = {
            "mode": "mock",
            "total_usd": 0.0,
            "currency": "USD",
            "confidence": "HIGH",
            "note": (
                "Mock/offline judges used; metered model spend is exactly 0. "
                "Not an estimate of live OpenRouter cost."
            ),
        }
    elif client.cost_known:
        cost_line = {
            "mode": "metered-or-priced",
            "total_usd": round(client.total_cost_usd, 6),
            "currency": "USD",
            "confidence": "MEDIUM",
            "note": (
                "Sum of provider total_cost when present, else list-price estimate "
                "from a sparse local table. Unknown-price models are excluded and "
                "flip cost_known=false."
            ),
            "models_used": client.models_used,
        }
    else:
        cost_line = {
            "mode": "partial",
            "total_usd_known_portion": round(client.total_cost_usd, 6),
            "currency": "USD",
            "confidence": "LOW",
            "note": (
                "At least one judge call had unknown pricing; known-portion sum is "
                "reported only. No invented fill-in for missing prices (WR-4482)."
            ),
            "models_used": client.models_used,
        }

    report = {
        "wr": "WR-4483",
        "milestone": "M1",
        "scope": "steps-1-7-only",
        "goal": inp.goal,
        "ranked_alternatives": ranking,
        "best_alternative": ranking[0]["alternative"] if ranking else None,
        "criteria_weights": steps["SOLVE"]["criteria_weights"],
        "consistency_ratio": {
            "criteria_cr": crit_cons.cr,
            "criteria_ci": crit_cons.ci,
            "criteria_lambda_max": crit_cons.lambda_max,
            "ri": crit_cons.ri,
            "ri_source": crit_cons.ri_source,
            "soft_threshold": CR_SOFT_THRESHOLD,
            "below_soft_threshold": crit_cons.cr < CR_SOFT_THRESHOLD,
        },
        "dispersion": steps["CHECK"]["dispersion"],
        "cost": cost_line,
        "judges": [
            {
                "id": j.id,
                "family": j.family,
                "primary_model": j.primary_model,
            }
            for j in judges
        ],
        "families_invoked": families,
        "families_asserted_ge_2": len(set(families)) >= 2,
        "mock_mode": client.mock,
        "ledger_path": str(ledger.path),
        "steps": steps,
        "deferred_to_m2": ["critic_gate", "sensitivity"],
        "deferred_to_m3": ["rest_api_wrapper", "pricing_decision"],
        "evidence_notes": [
            "CR is consistency, not correctness (WR-4483 R3).",
            "Dispersion (per-cell CV) is reported separately from CR.",
            "No critic gate or sensitivity in M1.",
            "No fabricated external market statistics in template text.",
        ],
    }

    ledger.append(
        agent="ensemble-ahp",
        class_="other",
        trigger="run-complete",
        summary=(
            f"M1 complete goal_slug={_slug(inp.goal)[:40]} "
            f"best={report['best_alternative']} "
            f"cr={crit_cons.cr:.4f} "
            f"families={len(set(families))} "
            f"cost_mode={cost_line['mode']}"
        ),
        lane="text",
        service="ensemble-ahp",
        task_ref=client.task_ref,
    )

    return PipelineResult(
        report=report,
        ledger_path=str(ledger.path),
        families_invoked=families,
        mock_mode=bool(client.mock),
    )
