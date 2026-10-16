#!/usr/bin/env python3
"""Interpret a real qPCR plate export for a human-mtDNA assay (Layer E).

Input: CSV exported from the instrument (or typed from the lab report) with
columns:
  sample_id, role, target, ct
    role   = unknown | ntc | positive | extraction_blank
    target = human (the human mtDNA assay) | ipc (internal positive control)
    ct     = number, or Undetermined / blank for no amplification

The lab's validated numbers go in as arguments (LOD95 Ct, LOQ Ct, positive
control window, IPC shift). There are no built-in "scores": every call is a
rule applied to the plate, and the rules are printed with the result.

Calls per sample:
  RUN_INVALID              controls failed, nothing on the plate can be read
  INHIBITED                IPC delayed by more than --ipc-shift cycles
  NOT_DETECTED             no human replicate amplified at or before LOD95 Ct
  INCONCLUSIVE             some replicates up, or replicate spread too wide
  DETECTED_BELOW_LOQ       detected but too low to quantify
  DETECTED                 detected and quantifiable

"Detected" is the lab's call about DNA in the tube. It does not by itself
identify a person; that needs a profile comparison done by the lab.
"""

import argparse
import csv
import json
import statistics
import sys
from collections import defaultdict


def _ct(v):
    try:
        x = float(v)
        return x if x > 0 else None
    except (TypeError, ValueError):
        return None


def load(path):
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))
    need = {"sample_id", "role", "target", "ct"}
    if not rows or not need <= set(rows[0]):
        raise ValueError(f"CSV needs columns {sorted(need)}")
    for r in rows:
        r["role"] = r["role"].strip().lower()
        r["target"] = r["target"].strip().lower()
        r["ct"] = _ct(r["ct"])
    return rows


def interpret(rows, lod95_ct, loq_ct, pos_min, pos_max, ipc_shift=2.0, min_reps=2, max_spread=1.5, ntc_cutoff=40.0):
    by = defaultdict(lambda: defaultdict(list))
    roles = {}
    for r in rows:
        by[r["sample_id"]][r["target"]].append(r["ct"])
        roles[r["sample_id"]] = r["role"]

    problems = []
    for sid, role in roles.items():
        hum = by[sid]["human"]
        if role in ("ntc", "extraction_blank") and any(c is not None and c <= ntc_cutoff for c in hum):
            problems.append(f"{role} {sid} amplified human target (contamination)")
        if role == "positive" and not any(c is not None and pos_min <= c <= pos_max for c in hum):
            problems.append(f"positive control {sid} outside Ct {pos_min}-{pos_max}: {hum}")
    if not any(r == "ntc" for r in roles.values()):
        problems.append("no NTC on plate")
    if not any(r == "positive" for r in roles.values()):
        problems.append("no positive control on plate")

    ref_ipc = [c for sid, role in roles.items() if role == "ntc" for c in by[sid]["ipc"] if c is not None]
    ipc_ref = statistics.mean(ref_ipc) if ref_ipc else None

    results = []
    for sid, role in roles.items():
        if role != "unknown":
            continue
        hum = by[sid]["human"]
        ipc = [c for c in by[sid]["ipc"] if c is not None]
        res = {"sample_id": sid, "human_ct": hum, "ipc_ct": by[sid]["ipc"]}
        if problems:
            res["call"] = "RUN_INVALID"
        elif ipc_ref is not None and (not ipc or statistics.mean(ipc) - ipc_ref > ipc_shift):
            res["call"] = "INHIBITED"
        else:
            up = [c for c in hum if c is not None and c <= lod95_ct]
            if not up:
                res["call"] = "NOT_DETECTED"
            elif len(up) < min_reps or (len(up) > 1 and max(up) - min(up) > max_spread):
                res["call"] = "INCONCLUSIVE"
            else:
                res["mean_ct"] = round(statistics.mean(up), 2)
                res["call"] = "DETECTED" if res["mean_ct"] <= loq_ct else "DETECTED_BELOW_LOQ"
        results.append(res)

    return {
        "run_valid": not problems,
        "run_problems": problems,
        "rules": {"lod95_ct": lod95_ct, "loq_ct": loq_ct, "positive_window": [pos_min, pos_max],
                  "ipc_reference_ct": ipc_ref, "ipc_max_shift": ipc_shift, "min_replicates_up": min_reps,
                  "max_replicate_spread": max_spread, "ntc_cutoff_ct": ntc_cutoff},
        "samples": results,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("plate_csv")
    ap.add_argument("--lod95-ct", type=float, required=True, help="Ct at the assay's validated LOD95")
    ap.add_argument("--loq-ct", type=float, required=True, help="Ct at the validated LOQ")
    ap.add_argument("--pos-ct", type=float, nargs=2, required=True, metavar=("MIN", "MAX"))
    ap.add_argument("--ipc-shift", type=float, default=2.0)
    ap.add_argument("--min-reps", type=int, default=2)
    ap.add_argument("--max-spread", type=float, default=1.5)
    ap.add_argument("--out", help="write JSON result here")
    a = ap.parse_args(argv)
    res = interpret(load(a.plate_csv), a.lod95_ct, a.loq_ct, a.pos_ct[0], a.pos_ct[1],
                    a.ipc_shift, a.min_reps, a.max_spread)
    text = json.dumps(res, indent=2)
    if a.out:
        with open(a.out, "w") as f:
            f.write(text)
    print(text)
    return 0 if res["run_valid"] else 2


if __name__ == "__main__":
    sys.exit(main())
