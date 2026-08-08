"""Pure AHP mathematics for WR-4483 steps 5-7 (no I/O, no LLM calls).

Steps covered:
  5. AGGREGATE — element-wise geometric mean across judges
  6. SOLVE     — column-normalize + row-mean priority vector; lambda_max
  7. CHECK     — CI, CR (Saaty RI), per-cell coefficient of variation

All outputs are derived from the input matrices. No placeholder / template
numbers are invented (WR-4482 claim hygiene + WR-4483 acceptance).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, Sequence

from .config import SAATY_MAX, SAATY_MIN, SAATY_RI


Matrix = list[list[float]]


def _validate_square(matrix: Matrix, name: str = "matrix") -> int:
    if not matrix:
        raise ValueError(f"{name} must be non-empty")
    n = len(matrix)
    for i, row in enumerate(matrix):
        if len(row) != n:
            raise ValueError(f"{name} row {i} length {len(row)} != {n}")
    return n


def clamp_saaty(value: float) -> float:
    """Clamp a pairwise judgment onto the closed Saaty scale [1/9, 9]."""
    if value <= 0:
        raise ValueError(f"pairwise value must be positive, got {value}")
    return max(SAATY_MIN, min(SAATY_MAX, float(value)))


def reciprocal_close(matrix: Matrix) -> Matrix:
    """Enforce a_ji = 1/a_ij and a_ii = 1 (repairs mild judge noise)."""
    n = _validate_square(matrix)
    out: Matrix = [[1.0] * n for _ in range(n)]
    for i in range(n):
        out[i][i] = 1.0
        for j in range(i + 1, n):
            a = clamp_saaty(matrix[i][j])
            out[i][j] = a
            out[j][i] = 1.0 / a
    return out


def geometric_mean_aggregate(matrices: Sequence[Matrix]) -> Matrix:
    """Element-wise geometric mean: A(i,j) = (prod_k A_k(i,j)) ^ (1/k)."""
    if not matrices:
        raise ValueError("need at least one pairwise matrix to aggregate")
    n = _validate_square(matrices[0], "matrices[0]")
    k = len(matrices)
    for idx, m in enumerate(matrices):
        if _validate_square(m, f"matrices[{idx}]") != n:
            raise ValueError("all judge matrices must share the same order")
    out: Matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            prod = 1.0
            for m in matrices:
                prod *= clamp_saaty(m[i][j]) if i != j else 1.0
            out[i][j] = prod ** (1.0 / k)
    return reciprocal_close(out)


def normalize_columns(matrix: Matrix) -> Matrix:
    n = _validate_square(matrix)
    col_sums = [sum(matrix[i][j] for i in range(n)) for j in range(n)]
    out: Matrix = [[0.0] * n for _ in range(n)]
    for j in range(n):
        s = col_sums[j]
        if s <= 0:
            raise ValueError(f"column {j} sum must be positive")
        for i in range(n):
            out[i][j] = matrix[i][j] / s
    return out


def priority_vector(matrix: Matrix) -> list[float]:
    """w_i = mean of normalized row i (classic AHP approximation)."""
    normed = normalize_columns(matrix)
    n = len(normed)
    weights = [sum(normed[i][j] for j in range(n)) / n for i in range(n)]
    total = sum(weights)
    if total <= 0:
        raise ValueError("priority vector sum must be positive")
    return [w / total for w in weights]


def lambda_max(matrix: Matrix, weights: Sequence[float]) -> float:
    n = _validate_square(matrix)
    if len(weights) != n:
        raise ValueError("weights length must match matrix order")
    # Avoid division by near-zero weights.
    ratios: list[float] = []
    for i in range(n):
        aw_i = sum(matrix[i][j] * weights[j] for j in range(n))
        if weights[i] <= 0:
            raise ValueError(f"weight[{i}] must be positive")
        ratios.append(aw_i / weights[i])
    return sum(ratios) / n


@dataclass(frozen=True)
class ConsistencyResult:
    n: int
    lambda_max: float
    ci: float
    ri: float
    cr: float
    ri_source: str


def consistency(matrix: Matrix, weights: Sequence[float] | None = None) -> ConsistencyResult:
    """CI = (lambda_max - n)/(n-1); CR = CI/RI. RI from Saaty (1980)."""
    n = _validate_square(matrix)
    w = list(weights) if weights is not None else priority_vector(matrix)
    lmax = lambda_max(matrix, w)
    if n <= 2:
        ci = 0.0
    else:
        ci = (lmax - n) / (n - 1)
    ri = SAATY_RI.get(n)
    if ri is None:
        raise ValueError(f"no Saaty RI tabulated for n={n}; supported 1..15")
    cr = 0.0 if ri == 0.0 else ci / ri
    return ConsistencyResult(
        n=n,
        lambda_max=lmax,
        ci=ci,
        ri=ri,
        cr=cr,
        ri_source="Saaty 1980 Analytic Hierarchy Process (standard RI table)",
    )


def coefficient_of_variation(values: Iterable[float]) -> float | None:
    """Population CV = stdev/mean. None when mean==0 (undefined)."""
    xs = [float(v) for v in values]
    if not xs:
        return None
    mean = sum(xs) / len(xs)
    if mean == 0.0:
        return None
    var = sum((x - mean) ** 2 for x in xs) / len(xs)
    return math.sqrt(var) / abs(mean)


def per_cell_cv(matrices: Sequence[Matrix]) -> Matrix:
    """Per-cell coefficient of variation across judges (dispersion, R3).

    Diagonal is always 0.0 (all judges set a_ii = 1). Upper/lower triangle
    use the judges' raw a_ij values (already reciprocal-closed preferred).
    """
    if not matrices:
        raise ValueError("need judge matrices for dispersion")
    n = _validate_square(matrices[0], "matrices[0]")
    for idx, m in enumerate(matrices):
        if _validate_square(m, f"matrices[{idx}]") != n:
            raise ValueError("all judge matrices must share the same order")
    out: Matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                out[i][j] = 0.0
                continue
            cell_vals = [m[i][j] for m in matrices]
            cv = coefficient_of_variation(cell_vals)
            out[i][j] = 0.0 if cv is None else cv
    return out


def mean_dispersion(cv_matrix: Matrix) -> float:
    """Mean off-diagonal CV — single scalar summary of inter-judge spread."""
    n = _validate_square(cv_matrix)
    vals = [cv_matrix[i][j] for i in range(n) for j in range(n) if i != j]
    if not vals:
        return 0.0
    return sum(vals) / len(vals)


def vote_aggregate(scores_by_judge: Sequence[dict[str, float]]) -> dict[str, float]:
    """S_i = sum_k s_ik across judges (WR-4483 step 3)."""
    totals: dict[str, float] = {}
    for scores in scores_by_judge:
        for name, score in scores.items():
            totals[name] = totals.get(name, 0.0) + float(score)
    return totals


def top_n(totals: dict[str, float], n: int) -> list[str]:
    ranked = sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))
    return [name for name, _ in ranked[:n]]


def synthesize_alternative_scores(
    criteria_weights: Sequence[float],
    alt_priority_given_criterion: Sequence[Sequence[float]],
) -> list[float]:
    """Global alt score = sum_i (w_i * alt_priority_i)."""
    if not criteria_weights:
        raise ValueError("criteria_weights required")
    n_crit = len(criteria_weights)
    if len(alt_priority_given_criterion) != n_crit:
        raise ValueError("one alt-priority vector required per criterion")
    n_alt = len(alt_priority_given_criterion[0])
    scores = [0.0] * n_alt
    for i in range(n_crit):
        vec = alt_priority_given_criterion[i]
        if len(vec) != n_alt:
            raise ValueError("alt priority vectors must share length")
        for a in range(n_alt):
            scores[a] += criteria_weights[i] * vec[a]
    return scores
