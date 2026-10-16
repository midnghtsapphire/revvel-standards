#!/usr/bin/env python3
"""Search-theory calculator: coverage, POD, PSR tasking and Bayesian POA updating.

Built from the uploaded WiSAR field checklist and calculator workbook
(docs/case-files/general/wisar_field_operational_checklist.pdf and
wisar_bayesian_search_calculator.xlsx). It does the same arithmetic as the
workbook, from a segments file, and adds the parts the workbook leaves out:

  * a Rest Of World (ROW) segment, so probability that the person is outside
    every mapped segment is not silently spread over the segments;
  * cumulative POD over several passes of the same segment;
  * checks that POA sums to 1, areas are positive and POD stays in [0, 1].

Formulas (random-search / exponential detection model):
  Z   = TTL * W                 swept area
  C   = Z / A                   coverage
  POD = 1 - exp(-C)
  POS = POA * POD
  Pden = POA / A
  PSR = W * V * Pden            probability-of-success rate, for tasking
  after an unsuccessful pass:   POA_i' = POA_i * (1 - POD_i) / (1 - sum POS)

Segments CSV columns: name, area_km2, poa, and optionally ttl_km, sweep_width_km,
speed_kmh, pod (a measured or assigned POD that overrides the coverage model).
A row named ROW (case-insensitive) is the rest-of-world segment; it has no area
and is never searched.

  python search_theory.py segments.csv --out result.json
  python search_theory.py segments.csv --passes passes.csv --out result.json

passes.csv: name, ttl_km, sweep_width_km (or name, pod) - one row per pass, in
order. Each pass updates POA; POD per segment accumulates.

Sweep width from an average-detection-distance trial: W = factor * ADD. The
workbook uses factor 2; set --add-factor if your team uses another rule.

These are planning numbers. POA starts as a judgement (or a lost-person-behaviour
prior); the update only redistributes it.
"""

import argparse
import csv
import json
import math
import sys

ROW_NAMES = {"row", "rest of world", "rest_of_world"}


def coverage_pod(ttl_km, sweep_width_km, area_km2):
    """Return (swept area, coverage, POD) for one pass."""
    if area_km2 <= 0:
        raise ValueError("area must be positive")
    if ttl_km < 0 or sweep_width_km < 0:
        raise ValueError("track length and sweep width cannot be negative")
    z = ttl_km * sweep_width_km
    c = z / area_km2
    return z, c, 1.0 - math.exp(-c)


def sweep_width_from_add(add_km, factor=2.0):
    if add_km <= 0 or factor <= 0:
        raise ValueError("ADD and factor must be positive")
    return factor * add_km


def cumulative_pod(pods):
    """POD after several independent passes: 1 - prod(1 - POD_k)."""
    miss = 1.0
    for p in pods:
        if not 0.0 <= p <= 1.0:
            raise ValueError(f"POD {p} outside [0, 1]")
        miss *= 1.0 - p
    return 1.0 - miss


def _is_row(name):
    return name.strip().lower() in ROW_NAMES


def check_poa(segments, tol=1e-6):
    total = sum(s["poa"] for s in segments)
    if any(s["poa"] < 0 for s in segments):
        raise ValueError("POA cannot be negative")
    if abs(total - 1.0) > tol:
        raise ValueError(f"POA sums to {total:.6f}, not 1 (add a ROW segment for the remainder)")


def bayes_update(segments, pods):
    """One unsuccessful search round. segments: list of dicts with name, poa.
    pods: {name: POD achieved this round}. Returns new list with poa updated,
    plus the probability of success that round (sum of POS)."""
    check_poa(segments)
    for name in pods:
        if not any(s["name"] == name for s in segments):
            raise ValueError(f"POD given for unknown segment {name!r}")
        if _is_row(name):
            raise ValueError("the ROW segment cannot be searched")
    pos_total = 0.0
    unfound = []
    for s in segments:
        pod = pods.get(s["name"], 0.0)
        if not 0.0 <= pod <= 1.0:
            raise ValueError(f"POD {pod} outside [0, 1] for {s['name']}")
        pos_total += s["poa"] * pod
        unfound.append(s["poa"] * (1.0 - pod))
    remaining = 1.0 - pos_total
    if remaining <= 0:
        raise ValueError("every segment was searched with POD 1; nothing left to redistribute")
    out = []
    for s, u in zip(segments, unfound):
        out.append(dict(s, poa_before=s["poa"], poa=u / remaining))
    return out, pos_total


def tasking_table(segments):
    """PSR ranking. Segments need area_km2, poa, sweep_width_km, speed_kmh."""
    rows = []
    for s in segments:
        if _is_row(s["name"]):
            continue
        pden = s["poa"] / s["area_km2"]
        w, v = s.get("sweep_width_km"), s.get("speed_kmh")
        psr = w * v * pden if w is not None and v is not None else None
        rows.append({"name": s["name"], "poa": s["poa"], "area_km2": s["area_km2"], "pden": pden, "psr": psr})
    rows.sort(key=lambda r: (r["psr"] is None, -(r["psr"] or 0), -r["pden"]))
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return rows


def _num(row, key, required=False):
    v = (row.get(key) or "").strip()
    if v == "":
        if required:
            raise ValueError(f"missing {key} in row {row}")
        return None
    return float(v)


def read_segments(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise ValueError("no segments")
    segs = []
    for r in rows:
        name = (r.get("name") or "").strip()
        if not name:
            raise ValueError("every segment needs a name")
        s = {"name": name, "poa": _num(r, "poa", True)}
        if not _is_row(name):
            s["area_km2"] = _num(r, "area_km2", True)
            if s["area_km2"] <= 0:
                raise ValueError(f"{name}: area must be positive")
            for k in ("ttl_km", "sweep_width_km", "speed_kmh", "pod"):
                s[k] = _num(r, k)
        segs.append(s)
    if len({s["name"] for s in segs}) != len(segs):
        raise ValueError("segment names must be unique")
    return segs


def pass_pod(seg, row, add_factor):
    if row.get("pod") not in (None, ""):
        return float(row["pod"])
    w = row.get("sweep_width_km")
    if w in (None, "") and row.get("add_km") not in (None, ""):
        w = sweep_width_from_add(float(row["add_km"]), add_factor)
    if w in (None, "") or row.get("ttl_km") in (None, ""):
        raise ValueError(f"pass for {seg['name']} needs pod, or ttl_km with sweep_width_km or add_km")
    return coverage_pod(float(row["ttl_km"]), float(w), seg["area_km2"])[2]


def run(segments, passes=None, add_factor=2.0):
    check_poa(segments)
    by_name = {s["name"]: s for s in segments}
    first = {}
    for s in segments:
        if _is_row(s["name"]):
            continue
        if s.get("pod") is not None:
            first[s["name"]] = s["pod"]
        elif s.get("ttl_km") is not None and s.get("sweep_width_km") is not None:
            z, c, pod = coverage_pod(s["ttl_km"], s["sweep_width_km"], s["area_km2"])
            s.update(swept_km2=z, coverage=c)
            first[s["name"]] = pod
    rounds = [first] if first else []
    for p in passes or []:
        name = p["name"].strip()
        if name not in by_name:
            raise ValueError(f"pass for unknown segment {name!r}")
        if _is_row(name):
            # SYSTEM_REVIEW M3: a ROW pass reached pass_pod and crashed with KeyError('area_km2'), a traceback
            # instead of a clear refusal. Lesson: check what a segment is before using fields it may not have.
            raise ValueError(f"pass for {name!r}: the ROW segment cannot be searched")
        rounds.append({name: pass_pod(by_name[name], p, add_factor)})
    history, cum = [], {}
    current = [dict(s) for s in segments]
    for i, pods in enumerate(rounds, 1):
        current, pos = bayes_update(current, pods)
        for n, pod in pods.items():
            cum.setdefault(n, []).append(pod)
        history.append({"round": i, "pod": pods, "probability_of_success": pos,
                        "poa": {s["name"]: s["poa"] for s in current}})
    return {
        "tasking_before": tasking_table(segments),
        "rounds": history,
        "final_poa": {s["name"]: s["poa"] for s in current},
        "cumulative_pod": {n: cumulative_pod(v) for n, v in cum.items()},
        "cumulative_pos": 1.0 - math.prod(1.0 - h["probability_of_success"] for h in history),
        "tasking_after": tasking_table(current),
        "note": "Planning numbers from the exponential detection model. Initial POA is an input judgement.",
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("segments")
    ap.add_argument("--passes")
    ap.add_argument("--add-factor", type=float, default=2.0)
    ap.add_argument("--out")
    a = ap.parse_args(argv)
    try:
        segs = read_segments(a.segments)
        passes = None
        if a.passes:
            with open(a.passes, newline="", encoding="utf-8") as f:
                passes = list(csv.DictReader(f))
        res = run(segs, passes, a.add_factor)
    # SYSTEM_REVIEW M3: bad input that surfaced as KeyError escaped as a traceback; it now exits 2 like the rest.
    # except (OSError, ValueError) as e:
    except (OSError, ValueError, KeyError) as e:
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
