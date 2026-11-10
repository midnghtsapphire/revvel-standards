#!/usr/bin/env python3
"""River refloat timing from accumulated degree-days (SYSTEM_REVIEW B2).

Given a daily water-temperature series and the incident date, computes
accumulated degree-days (ADD) since the incident and, for each day, the
probability that a submerged body has refloated by the end of that day.

LABEL: the primary model rests on a **preprint, not peer-reviewed**.

Primary model: Delhez et al., "Key parameters to improve prediction of the
drift and resurfacing of human bodies following drowning in rivers",
EGUsphere preprint egusphere-2026-5071 (posted 31 Aug 2026, in review for
NHESS). 50 fatal drownings in urban rivers. What its abstract reports, and
what this tool takes from it:

* resurfacing at about **97 degC-days** of ADD  -> ``--add-median`` default
  with ``--preset egusphere-2026-5071``;
* floatability limited below about **7 degC**    -> ``--min-temp-c`` default
  with the preset: a day whose mean water temperature is below it adds 0;
* victims over 65 almost **four times** more likely to remain afloat -> a
  warning with ``--over-65`` (refloat timing assumes the body sank); no number
  is changed, because the abstract gives odds, not a timing shift.

Not verified (the full text was unreachable from the build environment, only
the abstract via search): whether 97 is a median, mean or threshold; its
spread; the ADD base temperature; whether the 7 degC cut was applied when the
97 was derived. Therefore:

* the spread is a **required** user parameter (``--add-log-sd``, or
  ``--add-iqr Q1 Q3`` which is converted with sigma = ln(Q3/Q1)/1.349); the
  tool refuses (exit 2) without it. It is not invented here;
* the refloat ADD is modelled as log-normal with median ``--add-median``. The
  distribution family is an assumption of this tool, recorded in the output;
* ADD uses base 0 degC (``--base-temp-c``), the forensic convention of
  Megyesi et al. 2005, on daily means.

Comparison model (older work, shown alongside, never used for the window):
the Liege WOLF drift code (``wolfhece`` 2.2.84, ``drowning_class.py``, Delhez
group; the model of Delhez et al. 2023, Water Resources Research,
doi:10.1029/2022WR034358) draws the resurfacing ADD as
``5250 / T_w * Beta(4, 4)``, its comment citing Heaton 2011 (the UK
waterways submersion-interval paper is Heaton et al. 2010, J Forensic Sci
55(2):302-307) "considering a TADS between 14 and 15 as maximum expansion".
Here ``T_w`` is the mean daily water temperature from the incident to the
last day. This is a code default, not a validated distribution.

Inputs:
  --csv FILE with columns date (or datetime) and temp_c (or water_temp_c or
      value); sub-daily rows are averaged per calendar date;
  --usgs-site SITE --start --end, or --usgs-file saved_iv.json: USGS NWIS IV
      parameter 00010 (water temperature, degC), read with usgs_gauges.py;
      daily means use the gauge's local date.
Single missing days are linearly interpolated and flagged; a gap longer than
``--max-gap-days`` (default 2) is refused. ``--extend-days N --extend-temp-c T``
projects past the last observation with a constant, user-stated temperature
(flagged per row).

Outputs (``--out-dir``): ``refloat_daily.csv`` and ``refloat.json``. The JSON
has the per-day CDF, the date window (dates where P first reaches p10/p50/p90)
and a ``drift_envelope`` block with elapsed hours at those quantiles, for
drift_envelope.py to consume later.

Exit codes: 0 distribution computed; 2 input error (missing spread, no data,
bad CSV, gap too long, incident outside the series).

Example:
  python refloat_timing.py --csv temps.csv --incident 2026-05-27 \\
      --preset egusphere-2026-5071 --add-iqr 60 150 --out-dir out/refloat
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

LABEL = "preprint, not peer-reviewed"
PRESETS = {
    "egusphere-2026-5071": {
        "add_median": 97.0,
        "min_temp_c": 7.0,
        "citation": ("Delhez et al. (2026) Key parameters to improve prediction of the drift and resurfacing of "
                     "human bodies following drowning in rivers. EGUsphere preprint egusphere-2026-5071, in review "
                     "for NHESS. https://egusphere.copernicus.org/preprints/2026/egusphere-2026-5071/"),
        "verified_from": "abstract only (full text unreachable from the build environment)",
        "unverified": ["statistic type of the 97 degC-day value (median/mean/threshold)",
                       "spread of the refloat ADD", "ADD base temperature",
                       "whether the ~7 degC cut was applied when 97 was derived"],
        "over_65_note": ("Preprint abstract: victims over 65 were almost four times more likely to remain afloat. "
                         "Refloat timing assumes the body sank; search the surface and downstream first."),
    }
}
COMPARISON = {
    "name": "wolfhece 2.2.84 code default (Delhez group, model of Delhez et al. 2023 WRR)",
    "formula": "ADD_resurface = 5250 / T_w * Beta(4, 4)",
    "note": ("Code default citing Heaton 2011 (TADS 14-15 as maximum expansion); not a validated distribution. "
             "Shown for comparison only."),
}
QUANTILES = (0.1, 0.5, 0.9)


class InputError(ValueError):
    pass


# ---------------------------------------------------------------- arithmetic

def daily_contribution(temp_c: float, base_temp_c: float = 0.0, min_temp_c: float | None = None) -> float:
    """Degree-days one day adds: 0 below min_temp_c, else max(T - base, 0)."""
    if min_temp_c is not None and temp_c < min_temp_c:
        return 0.0
    return max(temp_c - base_temp_c, 0.0)


def accumulate(temps, base_temp_c=0.0, min_temp_c=None, first_day_fraction=1.0):
    """Running ADD at the end of each day; the incident day counts
    ``first_day_fraction`` of a day."""
    out, total = [], 0.0
    for i, t in enumerate(temps):
        c = daily_contribution(t, base_temp_c, min_temp_c) * (first_day_fraction if i == 0 else 1.0)
        total += c
        out.append((c, total))
    return out


def lognormal_cdf(x: float, median: float, sigma: float) -> float:
    if x <= 0:
        return 0.0
    return 0.5 * (1.0 + math.erf((math.log(x) - math.log(median)) / (sigma * math.sqrt(2.0))))


def beta44_cdf(x: float) -> float:
    """Regularised incomplete beta I_x(4, 4)."""
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    return sum(math.comb(7, j) * x ** j * (1 - x) ** (7 - j) for j in range(4, 8))


def comparison_cdf(add: float, mean_temp_c: float) -> float | None:
    if mean_temp_c <= 0:
        return None
    return beta44_cdf(add / (5250.0 / mean_temp_c))


def sigma_from_iqr(q1: float, q3: float) -> float:
    if not 0 < q1 < q3:
        raise InputError("--add-iqr needs 0 < Q1 < Q3")
    return math.log(q3 / q1) / (2 * 0.6744897501960817)


# ---------------------------------------------------------------- series input

def _mean_by_date(pairs):
    acc: dict = {}
    for d, v in pairs:
        acc.setdefault(d, []).append(v)
    return {d: sum(v) / len(v) for d, v in sorted(acc.items())}


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise InputError(f"{path}: no rows")
    cols = {c.lower().strip(): c for c in rows[0]}
    dcol = next((cols[c] for c in ("date", "datetime") if c in cols), None)
    tcol = next((cols[c] for c in ("temp_c", "water_temp_c", "value") if c in cols), None)
    if not dcol or not tcol:
        raise InputError(f"{path}: need a date/datetime column and a temp_c/water_temp_c/value column")
    pairs = []
    for i, r in enumerate(rows, 2):
        raw_t = (r[tcol] or "").strip()
        if raw_t == "":
            continue
        try:
            pairs.append((dt.date.fromisoformat(r[dcol].strip()[:10]), float(raw_t)))
        except ValueError as e:
            raise InputError(f"{path}:{i}: {e}") from e
    if not pairs:
        raise InputError(f"{path}: no temperature values")
    return _mean_by_date(pairs)


def from_usgs(doc):
    """Daily mean water temperature from a parsed NWIS IV document (00010)."""
    import usgs_gauges as ug
    series = [s for s in ug.parse_iv(doc) if s.parameter_code == "00010" and s.values()]
    if not series:
        raise InputError("NWIS response has no water-temperature (00010) values")
    s = max(series, key=lambda x: len(x.values()))
    pairs = [(dt.date.fromisoformat(p.datetime[:10]), p.value) for p in s.points if p.value is not None]
    return _mean_by_date(pairs), {"site": s.site, "site_name": s.site_name, "method_id": s.method_id,
                                  "unit": s.unit, "n_points": len(s.points)}


def daily_series(by_date: dict, incident: dt.date, max_gap_days=2, extend_days=0, extend_temp_c=None):
    """Contiguous rows from the incident date: [(date, temp, source)], with
    source 'observed', 'interpolated' or 'assumed'."""
    days = sorted(d for d in by_date if d >= incident)
    if not days or days[0] != incident:
        raise InputError(f"no temperature for the incident date {incident} (series covers "
                         f"{min(by_date)} to {max(by_date)})" if by_date else "empty series")
    rows = [(days[0], by_date[days[0]], "observed")]
    for d in days[1:]:
        prev_d, prev_t, _ = rows[-1]
        gap = (d - prev_d).days - 1
        if gap > max_gap_days:
            raise InputError(f"{gap} missing days after {prev_d} (limit --max-gap-days {max_gap_days})")
        for k in range(1, gap + 1):
            rows.append((prev_d + dt.timedelta(days=k), prev_t + (by_date[d] - prev_t) * k / (gap + 1),
                         "interpolated"))
        rows.append((d, by_date[d], "observed"))
    if extend_days:
        if extend_temp_c is None:
            raise InputError("--extend-days needs --extend-temp-c")
        last = rows[-1][0]
        rows += [(last + dt.timedelta(days=k), float(extend_temp_c), "assumed") for k in range(1, extend_days + 1)]
    return rows


# ---------------------------------------------------------------- model

def refloat_table(rows, add_median, sigma, base_temp_c=0.0, min_temp_c=None, first_day_fraction=1.0):
    temps = [t for _, t, _ in rows]
    acc = accumulate(temps, base_temp_c, min_temp_c, first_day_fraction)
    mean_t = sum(temps) / len(temps)
    out = []
    for i, ((d, t, src), (c, add)) in enumerate(zip(rows, acc)):
        comp = comparison_cdf(add, mean_t)
        out.append({
            "date": d.isoformat(), "day": i, "elapsed_hours_end_of_day": round((i + first_day_fraction) * 24, 2),
            "temp_c": round(t, 3), "source": src, "add_contribution": round(c, 4), "add": round(add, 4),
            "p_refloated": lognormal_cdf(add, add_median, sigma),
            "p_refloated_comparison": comp,
        })
    return out, mean_t


def window(table, quantiles=QUANTILES, key="p_refloated"):
    res = {}
    for q in quantiles:
        hit = next((r for r in table if r[key] is not None and r[key] >= q), None)
        res[f"p{int(round(q * 100))}"] = (
            {"date": hit["date"], "elapsed_hours": hit["elapsed_hours_end_of_day"], "add": hit["add"]}
            if hit else None)
    return res


def build_report(table, mean_t, args_info, source_info):
    w = window(table)
    last = table[-1]
    return {
        "label": LABEL,
        "model": args_info,
        "comparison_model": dict(COMPARISON, mean_temp_c=round(mean_t, 3), window=window(
            table, key="p_refloated_comparison")),
        "source": source_info,
        "window": w,
        "window_reached": {k: v is not None for k, v in w.items()},
        "p_refloated_at_last_day": last["p_refloated"],
        "last_day": last["date"],
        "per_day": table,
        "drift_envelope": {
            "schema": "refloat_timing/1",
            "label": LABEL,
            "incident_date": table[0]["date"],
            "elapsed_hours_at_quantile": {k: (v["elapsed_hours"] if v else None) for k, v in w.items()},
            "cdf": [{"elapsed_hours": r["elapsed_hours_end_of_day"], "p_refloated": r["p_refloated"]}
                    for r in table],
            "note": ("Probability a submerged body has refloated by each elapsed time. Assumes the body sank; "
                     "a body that never sank is outside this model."),
        },
    }


# ---------------------------------------------------------------- CLI

def build_parser():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--csv")
    src.add_argument("--usgs-site")
    src.add_argument("--usgs-file", help="saved NWIS IV JSON response")
    ap.add_argument("--start", help="NWIS startDT (with --usgs-site)")
    ap.add_argument("--end", help="NWIS endDT (with --usgs-site)")
    ap.add_argument("--incident", required=True, help="incident date YYYY-MM-DD")
    ap.add_argument("--preset", choices=sorted(PRESETS))
    ap.add_argument("--add-median", type=float, help="median refloat ADD (degC-days); preset gives 97")
    ap.add_argument("--add-log-sd", type=float, help="log-normal sigma of refloat ADD (required unless --add-iqr)")
    ap.add_argument("--add-iqr", type=float, nargs=2, metavar=("Q1", "Q3"), help="refloat ADD quartiles")
    ap.add_argument("--min-temp-c", type=float, help="days below this add 0; preset gives 7")
    ap.add_argument("--base-temp-c", type=float, default=0.0)
    ap.add_argument("--first-day-fraction", type=float, default=1.0,
                    help="share of the incident day after the incident (0-1)")
    ap.add_argument("--max-gap-days", type=int, default=2)
    ap.add_argument("--extend-days", type=int, default=0)
    ap.add_argument("--extend-temp-c", type=float)
    ap.add_argument("--over-65", action="store_true", help="victim over 65: adds the stay-afloat warning")
    ap.add_argument("--out-dir", required=True)
    return ap


def run(a):
    preset = PRESETS.get(a.preset, {})
    median = a.add_median if a.add_median is not None else preset.get("add_median")
    if median is None or median <= 0:
        raise InputError("state --add-median (or use --preset)")
    if a.add_log_sd is not None and a.add_iqr:
        raise InputError("give --add-log-sd or --add-iqr, not both")
    if a.add_iqr:
        sigma, sigma_src = sigma_from_iqr(*a.add_iqr), f"from --add-iqr {a.add_iqr[0]} {a.add_iqr[1]}"
    elif a.add_log_sd is not None:
        sigma, sigma_src = a.add_log_sd, "--add-log-sd"
    else:
        raise InputError("the spread of the refloat ADD was not verifiable from the preprint and is not invented "
                         "here: state --add-log-sd or --add-iqr Q1 Q3")
    if sigma <= 0:
        raise InputError("--add-log-sd must be > 0")
    if not 0 < a.first_day_fraction <= 1:
        raise InputError("--first-day-fraction must be in (0, 1]")
    min_t = a.min_temp_c if a.min_temp_c is not None else preset.get("min_temp_c")
    incident = dt.date.fromisoformat(a.incident)

    if a.csv:
        by_date, info = read_csv(a.csv), {"kind": "csv", "path": a.csv}
    else:
        import usgs_gauges as ug
        if a.usgs_file:
            with open(a.usgs_file, encoding="utf-8") as f:
                doc = json.load(f)
            info = {"kind": "usgs_nwis_iv", "from_file": a.usgs_file}
        else:
            if not (a.start and a.end):
                raise InputError("--usgs-site needs --start and --end")
            try:
                doc = ug.fetch_iv(a.usgs_site, a.start, a.end, params=("00010",))
            except Exception as e:
                raise InputError(f"NWIS fetch failed: {e}") from e
            info = {"kind": "usgs_nwis_iv", "live": True,
                    "url": ug.build_iv_url(a.usgs_site, a.start, a.end, ("00010",))}
        by_date, meta = from_usgs(doc)
        info.update(meta)

    rows = daily_series(by_date, incident, a.max_gap_days, a.extend_days, a.extend_temp_c)
    table, mean_t = refloat_table(rows, median, sigma, a.base_temp_c, min_t, a.first_day_fraction)
    model = {
        "family": "log-normal refloat ADD (assumption of this tool)",
        "add_median": median, "add_median_source": "--add-median" if a.add_median is not None else a.preset,
        "add_log_sd": sigma, "add_log_sd_source": sigma_src,
        "min_temp_c": min_t, "base_temp_c": a.base_temp_c, "first_day_fraction": a.first_day_fraction,
        "preset": a.preset, "citation": preset.get("citation"),
        "verified_from": preset.get("verified_from"), "unverified": preset.get("unverified"),
        "interpolated_days": [r["date"] for r in table if r["source"] == "interpolated"],
        "assumed_days": [r["date"] for r in table if r["source"] == "assumed"],
    }
    rep = build_report(table, mean_t, model, info)
    warnings = []
    if a.over_65:
        warnings.append(PRESETS["egusphere-2026-5071"]["over_65_note"])
    if min_t is not None and all(r["temp_c"] < min_t for r in table):
        warnings.append(f"Every day is below {min_t} degC: no ADD accrues and refloat is not expected in this window.")
    rep["warnings"] = warnings
    return rep


def main(argv=None):
    a = build_parser().parse_args(argv)
    try:
        rep = run(a)
    except (InputError, OSError, json.JSONDecodeError) as e:
        print(f"refloat_timing: {e}", file=sys.stderr)
        return 2
    os.makedirs(a.out_dir, exist_ok=True)
    with open(os.path.join(a.out_dir, "refloat.json"), "w", encoding="utf-8") as f:
        json.dump(rep, f, indent=2)
    with open(os.path.join(a.out_dir, "refloat_daily.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rep["per_day"][0]))
        w.writeheader()
        w.writerows(rep["per_day"])
    print(f"[{LABEL}] window: " + json.dumps(rep["window"]))
    for msg in rep["warnings"]:
        print(f"WARNING: {msg}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
