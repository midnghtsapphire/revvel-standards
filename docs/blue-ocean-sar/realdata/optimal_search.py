#!/usr/bin/env python3
"""Optimal allocation of search effort (Koopman / Stone) for the exponential detection model.

search_theory.py scores a plan someone already chose. This module chooses the
plan: given a fixed effort budget, how much track to put in each segment so the
probability of success (POS) is as high as it can be. It uses the same segments
CSV, the same Rest Of World (ROW) convention and the same Bayesian update.

Model (random search, exponential detection function):
  z_i                 effort in segment i: track length km (or hours, z = v t)
  r_i = W_i / A_i     detection rate per km of track      (W_i v_i / A_i per hour)
  POD_i = 1 - exp(-r_i z_i)        coverage C_i = W_i * track_km_i / A_i
  POS   = sum_i POA_i * POD_i

Problem (Stone, Theory of Optimal Search, ch. 2):
  maximise  sum_i POA_i (1 - exp(-r_i z_i))   subject to  sum_i z_i = Z,  z_i >= 0

POS is concave in z, so the KKT conditions are necessary and sufficient. With
Lagrange multiplier lambda, the marginal gain POA_i r_i exp(-r_i z_i) equals
lambda in every funded segment and is <= lambda in every unfunded one:

  z_i = max(0, ln(POA_i r_i / lambda) / r_i)          ("water-filling")

sum_i z_i(lambda) is decreasing in lambda, so lambda is the unique root of
sum_i z_i(lambda) = Z. Rather than bisect, the root is found exactly: sort
segments by g_i = POA_i r_i (largest first); for the funded set S (the top k),

  ln lambda = (sum_S ln(g_i) / r_i - Z) / sum_S (1 / r_i)

and k is the smallest with lambda >= g_{k+1}. This is the bisection's limit,
computed in closed form (in log space, so very large budgets do not underflow).

Uniform optimality: for the exponential model the optimal plan for budget Z is
nested inside the optimal plan for any larger budget, so effort can be released
in k increments, each one the difference between successive optima, and the
search is optimal at every stage. Equivalently, re-planning after each
unsuccessful increment on the Bayesian posterior POA (search_theory.bayes_update)
gives the same increments and the same cumulative POS as the one-shot optimum.
Both are computed so the claim is checked, not assumed.

Naive plans reported for comparison (same budget, same model):
  equal            Z split equally over the searchable segments
  poa_proportional z_i proportional to POA_i
  greedy_psr       segments ranked by PSR = POA_i r_i (W v POA / A); each gets
                   one coverage-1.0 pass (z = 1 / r_i) in rank order, cycling
                   until the budget is spent

Segments CSV: name, area_km2, poa, sweep_width_km, optional speed_kmh (needed
for --effort-hours). A row named ROW is the rest-of-world segment and never
receives effort. POA must sum to 1.

  python optimal_search.py segments.csv --effort-km 40 --increments 4 --out result.json
  python optimal_search.py segments.csv --effort-hours 24 --out result.json

Planning numbers only: the result is as good as the POA and sweep widths fed in.
"""

import argparse
import json
import math
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import search_theory as st  # noqa: E402

UNITS = ("km", "hours")


def _check_budget(budget):
    if not isinstance(budget, (int, float)) or math.isnan(budget) or math.isinf(budget):
        raise ValueError("effort budget must be a finite number")
    if budget < 0:
        raise ValueError("effort budget cannot be negative")


def detection_rates(segments, unit="km"):
    """Return {name: r_i}, detection rate per unit of effort, for every non-ROW segment.

    km: r = W / A. hours: r = W * v / A (needs speed_kmh)."""
    if unit not in UNITS:
        raise ValueError(f"unit must be one of {UNITS}")
    rates = {}
    for s in segments:
        if st._is_row(s["name"]):
            continue
        w = s.get("sweep_width_km")
        if w is None:
            raise ValueError(f"{s['name']}: sweep_width_km is required")
        if w < 0:
            raise ValueError(f"{s['name']}: sweep width cannot be negative")
        if s.get("area_km2") is None or s["area_km2"] <= 0:
            raise ValueError(f"{s['name']}: area must be positive")
        r = w / s["area_km2"]
        if unit == "hours":
            v = s.get("speed_kmh")
            if v is None or v <= 0:
                raise ValueError(f"{s['name']}: positive speed_kmh is required for effort in hours")
            r *= v
        rates[s["name"]] = r
    return rates


def _searchable(segments, rates):
    """Names of segments that can usefully receive effort (POA > 0, rate > 0)."""
    return [s["name"] for s in segments if s["name"] in rates and s["poa"] > 0 and rates[s["name"]] > 0]


def _prepare(segments, budget, unit):
    st.check_poa(segments)
    _check_budget(budget)
    rates = detection_rates(segments, unit)
    names = _searchable(segments, rates)
    if not names:
        raise ValueError("no segment has POA > 0 and sweep width > 0; nothing to allocate effort to")
    return rates, names


def solve_lambda(poa, rates, budget):
    """Exact water-filling. poa, rates: {name: value} for searchable segments.
    Returns (effort {name: z}, lambda, ln lambda)."""
    g = {n: poa[n] * rates[n] for n in poa}
    order = sorted(g, key=lambda n: -g[n])
    s_log, s_inv = 0.0, 0.0
    log_lam = math.log(g[order[0]])
    k = len(order)
    for i, n in enumerate(order):
        s_log += math.log(g[n]) / rates[n]
        s_inv += 1.0 / rates[n]
        log_lam = (s_log - budget) / s_inv
        if i + 1 == len(order) or log_lam >= math.log(g[order[i + 1]]):
            k = i + 1
            break
    funded = order[:k]
    effort = {n: 0.0 for n in poa}
    for n in funded:
        effort[n] = max(0.0, (math.log(g[n]) - log_lam) / rates[n])
    # Remove floating-point drift so the budget is met to the last bit we can.
    if budget > 0:
        drift = budget - math.fsum(effort.values())
        biggest = max(funded, key=lambda n: effort[n])
        effort[biggest] = max(0.0, effort[biggest] + drift)
    return effort, math.exp(log_lam), log_lam


def evaluate_plan(segments, effort, unit="km"):
    """Score an allocation {name: effort}. Returns (rows, total POS). ROW rows get 0."""
    rates = detection_rates(segments, unit)
    rows, total = [], 0.0
    for s in segments:
        name = s["name"]
        z = effort.get(name, 0.0)
        if z < 0:
            raise ValueError(f"{name}: effort cannot be negative")
        if st._is_row(name):
            if z:
                raise ValueError("the ROW segment cannot receive effort")
            rows.append({"name": name, "poa": s["poa"], "effort_km": 0.0, "effort_hours": 0.0,
                         "coverage": 0.0, "pod": 0.0, "pos": 0.0})
            continue
        r = rates[name]
        v = s.get("speed_kmh")
        if unit == "km":
            km, hours = z, (z / v if v else None)
        else:
            km, hours = z * v, z
        coverage = r * z
        pod = 1.0 - math.exp(-coverage)
        pos = s["poa"] * pod
        total += pos
        rows.append({"name": name, "poa": s["poa"], "effort_km": km, "effort_hours": hours,
                     "coverage": coverage, "pod": pod, "pos": pos,
                     "marginal_gain": s["poa"] * r * math.exp(-coverage)})
    return rows, total


def optimal_allocation(segments, budget, unit="km"):
    """Stone's optimal one-shot plan for a budget in km of track (or hours)."""
    rates, names = _prepare(segments, budget, unit)
    poa = {s["name"]: s["poa"] for s in segments if s["name"] in names}
    effort, lam, _ = solve_lambda(poa, {n: rates[n] for n in names}, budget)
    rows, total = evaluate_plan(segments, effort, unit)
    for r in rows:
        r["funded"] = effort.get(r["name"], 0.0) > 0
    return {"unit": unit, "budget": budget, "lambda": lam, "effort": effort,
            "segments": rows, "total_pos": total}


def equal_plan(segments, budget, unit="km"):
    _, names = _prepare(segments, budget, unit)
    return {n: budget / len(names) for n in names}


def poa_proportional_plan(segments, budget, unit="km"):
    _, names = _prepare(segments, budget, unit)
    poa = {s["name"]: s["poa"] for s in segments}
    total = math.fsum(poa[n] for n in names)
    return {n: budget * poa[n] / total for n in names}


def greedy_psr_plan(segments, budget, unit="km"):
    """Rank by PSR = POA * r; give each a coverage-1.0 pass (1/r) in rank order,
    cycling until the budget runs out."""
    rates, names = _prepare(segments, budget, unit)
    poa = {s["name"]: s["poa"] for s in segments}
    order = sorted(names, key=lambda n: -poa[n] * rates[n])
    cycle = math.fsum(1.0 / rates[n] for n in order)
    full = math.floor(budget / cycle)
    effort = {n: full / rates[n] for n in order}
    left = budget - full * cycle
    for n in order:
        step = min(left, 1.0 / rates[n])
        effort[n] += step
        left -= step
        if left <= 0:
            break
    return effort


NAIVE_PLANS = {"equal": equal_plan, "poa_proportional": poa_proportional_plan, "greedy_psr": greedy_psr_plan}


def compare_plans(segments, budget, unit="km"):
    """Optimal total POS against each naive plan on the same budget."""
    best = optimal_allocation(segments, budget, unit)["total_pos"]
    out = {}
    for name, fn in NAIVE_PLANS.items():
        effort = fn(segments, budget, unit)
        rows, total = evaluate_plan(segments, effort, unit)
        out[name] = {"effort": effort, "total_pos": total, "optimal_gain": best - total,
                     "segments": rows}
    return out


def _check_increments(increments):
    if not isinstance(increments, int) or isinstance(increments, bool) or increments < 1:
        raise ValueError("increments must be a positive integer")


def uniformly_optimal_plan(segments, budget, increments, unit="km"):
    """Split the budget into equal increments. Increment j is the difference
    between the optimal plans for budgets j*Z/k and (j-1)*Z/k."""
    _check_increments(increments)
    _prepare(segments, budget, unit)
    steps, prev = [], {}
    nested = True
    for j in range(1, increments + 1):
        cum_budget = budget * j / increments
        opt = optimal_allocation(segments, cum_budget, unit)
        inc = {n: z - prev.get(n, 0.0) for n, z in opt["effort"].items()}
        if any(v < -1e-9 * max(1.0, budget) for v in inc.values()):
            nested = False
        steps.append({"increment": j, "cumulative_budget": cum_budget, "effort": inc,
                      "cumulative_effort": opt["effort"], "cumulative_pos": opt["total_pos"]})
        prev = opt["effort"]
    return {"increments": steps, "nested": nested, "total_pos": steps[-1]["cumulative_pos"]}


def sequential_replan(segments, budget, increments, unit="km"):
    """Search in increments; after each unsuccessful increment, Bayes-update POA
    (search_theory.bayes_update) and allocate the next increment optimally on the
    posterior."""
    _check_increments(increments)
    rates, _ = _prepare(segments, budget, unit)
    step = budget / increments
    current = [dict(s) for s in segments]
    total_effort, history, miss = {}, [], 1.0
    for j in range(1, increments + 1):
        names = _searchable(current, rates)
        poa = {s["name"]: s["poa"] for s in current if s["name"] in names}
        effort, lam, _ = solve_lambda(poa, {n: rates[n] for n in names}, step)
        pods = {n: 1.0 - math.exp(-rates[n] * z) for n, z in effort.items()}
        current, pos = st.bayes_update(current, pods)
        miss *= 1.0 - pos
        for n, z in effort.items():
            total_effort[n] = total_effort.get(n, 0.0) + z
        history.append({"increment": j, "effort": effort, "lambda": lam, "pod": pods,
                        "probability_of_success": pos, "cumulative_pos": 1.0 - miss,
                        "poa_after": {s["name"]: s["poa"] for s in current}})
    return {"increments": history, "total_effort": total_effort, "total_pos": 1.0 - miss,
            "final_poa": {s["name"]: s["poa"] for s in current}}


def run(segments, budget, increments=1, unit="km"):
    opt = optimal_allocation(segments, budget, unit)
    naive = compare_plans(segments, budget, unit)
    return {
        "optimal": opt,
        "naive_plans": {k: {"total_pos": v["total_pos"], "optimal_gain": v["optimal_gain"],
                            "effort": v["effort"]} for k, v in naive.items()},
        "uniformly_optimal": uniformly_optimal_plan(segments, budget, increments, unit),
        "sequential_replan": sequential_replan(segments, budget, increments, unit),
        "tasking_before": st.tasking_table(segments),
        "note": ("Optimal for the exponential detection model given these POA and sweep widths. "
                 "Initial POA is an input judgement; ROW never receives effort."),
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("segments")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--effort-km", type=float, help="total track length budget, km")
    g.add_argument("--effort-hours", type=float, help="total searcher-hours budget (needs speed_kmh)")
    ap.add_argument("--increments", type=int, default=1)
    ap.add_argument("--out")
    a = ap.parse_args(argv)
    try:
        segs = st.read_segments(a.segments)
        if a.effort_km is not None:
            res = run(segs, a.effort_km, a.increments, "km")
        else:
            res = run(segs, a.effort_hours, a.increments, "hours")
    except (OSError, ValueError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    text = json.dumps(res, indent=2)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(text + "\n")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
