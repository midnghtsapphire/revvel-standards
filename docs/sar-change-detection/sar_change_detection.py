#!/usr/bin/env python3
"""
Bitemporal / multi-year SAR backscatter change detection.

Simulates (or accepts) monthly backscatter time series for C-band (5.5 GHz)
and P-band (435 MHz) over a multi-year window, detects a persistent step change
such as ground disturbance or concrete capping, and checks whether the signal
settled into a stable new baseline afterwards.

Detection model (per band), for every candidate change time tau:

    y(t) = a + b*sin(2*pi*t) + c*cos(2*pi*t) + d*H(t - tau) + noise

where t is in years and H is the unit step. The tau that minimises the
residual sum of squares is the change point and d is the step in dB.
Significance uses the sup-F statistic against the no-step model. Because tau
is chosen by scanning, the plain F table overstates significance; the default
threshold (10.0) sits above the 5% critical value for a single-break sup-F test
with 15% trimming (about 8.85, Andrews 1993).

Stability: residual variance (sigma^2) after the step is compared with the
pre-event variance using the large-sample normal approximation for the log of
a variance ratio, ln(s2_post / s2_pre) ~ N(0, 2/(n_pre-1) + 2/(n_post-1)), so
the test tightens or loosens with sample size. The post-event linear trend is
also checked for drift.

All series produced by --simulate are synthetic. Real data should be
calibrated sigma0 (dB) on a consistent geometry (same orbit/track, incidence).

Usage:
    python3 sar_change_detection.py --out results.json --plot sar.png
    python3 sar_change_detection.py --event-year 2016.5 --step-db 4 --seed 7
"""

import argparse
import json
import math
import sys
from dataclasses import dataclass
from typing import Any, Optional, Sequence

import numpy as np

BANDS = {
    "C": {"frequency_ghz": 5.5, "base_db": -9.0, "seasonal_amp_db": 1.2, "noise_sd_db": 0.8},
    "P": {"frequency_ghz": 0.435, "base_db": -14.0, "seasonal_amp_db": 0.3, "noise_sd_db": 0.6},
}

SUP_F_THRESHOLD = 10.0
MIN_STEP_DB = 1.5
TRIM_FRACTION = 0.15
# One-sided z for the log variance ratio (~1% false 'unstable' rate on stationary noise).
VARIANCE_Z_LIMIT = 2.33
MAX_POST_DRIFT_DB_PER_YEAR = 0.15


@dataclass
class StepResult:
    detected: bool
    change_time: Optional[float]
    step_db: Optional[float]
    sup_f: float
    pre_mean_db: Optional[float]
    post_mean_db: Optional[float]
    pre_variance: Optional[float]
    post_variance: Optional[float]
    variance_ratio: Optional[float]
    variance_z: Optional[float]
    post_drift_db_per_year: Optional[float]
    stable_baseline: Optional[bool]


def simulate_band(
    band: str,
    start_year: float,
    years: int,
    event_year: Optional[float],
    step_db: float,
    rng: np.random.Generator,
    samples_per_year: int = 12,
) -> tuple[np.ndarray, np.ndarray]:
    """Synthetic monthly backscatter (dB) with seasonality, speckle-like noise and an optional step."""
    p = BANDS[band]
    n = years * samples_per_year
    t = start_year + np.arange(n) / samples_per_year
    y = p["base_db"] + p["seasonal_amp_db"] * np.sin(2 * np.pi * t) + rng.normal(0.0, p["noise_sd_db"], n)
    if event_year is not None:
        y = y + step_db * (t >= event_year)
    return t, y


def _design(t: np.ndarray, step: Optional[np.ndarray] = None) -> np.ndarray:
    cols = [np.ones_like(t), np.sin(2 * np.pi * t), np.cos(2 * np.pi * t)]
    if step is not None:
        cols.append(step)
    return np.column_stack(cols)


def _rss(x: np.ndarray, y: np.ndarray) -> tuple[float, np.ndarray]:
    coef, *_ = np.linalg.lstsq(x, y, rcond=None)
    resid = y - x @ coef
    return float(resid @ resid), coef


def detect_step(
    t: Sequence[float],
    y: Sequence[float],
    sup_f_threshold: float = SUP_F_THRESHOLD,
    min_step_db: float = MIN_STEP_DB,
    trim: float = TRIM_FRACTION,
) -> StepResult:
    t = np.asarray(t, dtype=float)
    y = np.asarray(y, dtype=float)
    n = len(t)
    if n != len(y) or n < 24:
        raise ValueError("need matching t and y with at least 24 samples")
    if not np.all(np.diff(t) > 0):
        raise ValueError("t must be strictly increasing")

    rss0, _ = _rss(_design(t), y)
    lo, hi = max(int(n * trim), 6), min(int(n * (1 - trim)), n - 6)
    best = (math.inf, -1, None)
    for k in range(lo, hi + 1):
        rss1, coef = _rss(_design(t, (np.arange(n) >= k).astype(float)), y)
        if rss1 < best[0]:
            best = (rss1, k, coef)
    rss1, k, coef = best
    dof = n - 4
    sup_f = ((rss0 - rss1) / 1.0) / (rss1 / dof) if rss1 > 0 else math.inf
    step = float(coef[3])
    detected = sup_f >= sup_f_threshold and abs(step) >= min_step_db
    if not detected:
        return StepResult(False, None, None, round(sup_f, 3), None, None, None, None, None, None, None, None)

    resid = y - _design(t, (np.arange(n) >= k).astype(float)) @ coef
    pre_var = float(np.var(resid[:k], ddof=1))
    post_var = float(np.var(resid[k:], ddof=1))
    drift = float(np.polyfit(t[k:], resid[k:], 1)[0])
    ratio = post_var / pre_var if pre_var > 0 else math.inf
    z = math.log(ratio) / math.sqrt(2.0 / (k - 1) + 2.0 / (n - k - 1)) if math.isfinite(ratio) else math.inf
    stable = z <= VARIANCE_Z_LIMIT and abs(drift) <= MAX_POST_DRIFT_DB_PER_YEAR
    return StepResult(
        detected=True,
        change_time=round(float(t[k]), 4),
        step_db=round(step, 3),
        sup_f=round(sup_f, 3),
        pre_mean_db=round(float(np.mean(y[:k])), 3),
        post_mean_db=round(float(np.mean(y[k:])), 3),
        pre_variance=round(pre_var, 4),
        post_variance=round(post_var, 4),
        variance_ratio=round(ratio, 3),
        variance_z=round(z, 3),
        post_drift_db_per_year=round(drift, 4),
        stable_baseline=stable,
    )


def analyze(
    start_year: float = 2005.0,
    years: int = 20,
    event_year: Optional[float] = 2013.5,
    step_db: float = 4.0,
    seed: int = 42,
) -> dict[str, Any]:
    if years < 3:
        raise ValueError("years must be >= 3")
    rng = np.random.default_rng(seed)
    out: dict[str, Any] = {
        "model": "seasonal + step regression, sup-F change detection",
        "synthetic": True,
        "parameters": {
            "start_year": start_year,
            "years": years,
            "true_event_year": event_year,
            "true_step_db": step_db if event_year is not None else 0.0,
            "seed": seed,
            "sup_f_threshold": SUP_F_THRESHOLD,
            "min_step_db": MIN_STEP_DB,
            "variance_z_limit": VARIANCE_Z_LIMIT,
            "max_post_drift_db_per_year": MAX_POST_DRIFT_DB_PER_YEAR,
        },
        "bands": {},
    }
    for band, props in BANDS.items():
        t, y = simulate_band(band, start_year, years, event_year, step_db, rng)
        res = detect_step(t, y)
        out["bands"][band] = {
            "frequency_ghz": props["frequency_ghz"],
            "result": res.__dict__,
            "series": {
                "t_year": [round(v, 4) for v in t.tolist()],
                "backscatter_db": [round(v, 3) for v in y.tolist()],
            },
        }
    return out


def plot(data: dict[str, Any], path: str) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    bands = data["bands"]
    fig, axes = plt.subplots(len(bands), 1, figsize=(11, 3.4 * len(bands)), sharex=True)
    true_evt = data["parameters"]["true_event_year"]
    for ax, (band, info) in zip(np.atleast_1d(axes), bands.items()):
        t = info["series"]["t_year"]
        y = info["series"]["backscatter_db"]
        ax.plot(t, y, lw=1, color="#3b6ea5", label=f"{band}-band ({info['frequency_ghz']} GHz)")
        r = info["result"]
        if r["detected"]:
            ax.axvline(r["change_time"], color="#c0392b", lw=2, label=f"detected step {r['step_db']:+.2f} dB")
            ax.hlines([r["pre_mean_db"]], t[0], r["change_time"], colors="#555", linestyles="dotted")
            ax.hlines([r["post_mean_db"]], r["change_time"], t[-1], colors="#555", linestyles="dotted")
        if true_evt is not None:
            ax.axvline(true_evt, color="#888", ls="--", lw=1, label="true event (simulated)")
        ax.set_ylabel("sigma0 (dB)")
        ax.grid(alpha=0.3)
        ax.legend(loc="upper left", fontsize=8)
    np.atleast_1d(axes)[-1].set_xlabel("year")
    fig.suptitle("SAR backscatter time series with detected step changes (synthetic)")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def print_summary(data: dict[str, Any]) -> None:
    p = data["parameters"]
    print(f"\nSAR change detection | {p['years']} yr from {p['start_year']} | "
          f"true event {p['true_event_year']} ({p['true_step_db']:+} dB) | synthetic\n")
    print(f"{'band':>5} {'detected':>9} {'year':>9} {'step dB':>8} {'sup-F':>8} "
          f"{'var pre':>8} {'var post':>8} {'ratio':>6} {'drift':>7} {'stable':>7}")
    print("-" * 86)
    for band, info in data["bands"].items():
        r = info["result"]
        if r["detected"]:
            print(f"{band:>5} {'yes':>9} {r['change_time']:>9.2f} {r['step_db']:>+8.2f} {r['sup_f']:>8.1f} "
                  f"{r['pre_variance']:>8.3f} {r['post_variance']:>8.3f} {r['variance_ratio']:>6.2f} "
                  f"{r['post_drift_db_per_year']:>+7.3f} {str(r['stable_baseline']):>7}")
        else:
            print(f"{band:>5} {'no':>9} {'-':>9} {'-':>8} {r['sup_f']:>8.1f}")
    print()


def main(argv: Optional[Sequence[str]] = None) -> dict[str, Any]:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--start-year", type=float, default=2005.0)
    ap.add_argument("--years", type=int, default=20)
    ap.add_argument("--event-year", type=float, default=2013.5, help="simulated event time (decimal year)")
    ap.add_argument("--no-event", action="store_true", help="simulate with no change (false-alarm check)")
    ap.add_argument("--step-db", type=float, default=4.0)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--plot", help="write a PNG time-series plot to this path")
    ap.add_argument("--out", help="write JSON here instead of stdout")
    ap.add_argument("--no-table", action="store_true")
    args = ap.parse_args(argv)

    try:
        data = analyze(args.start_year, args.years, None if args.no_event else args.event_year, args.step_db, args.seed)
    except ValueError as e:
        ap.error(str(e))
    if not args.no_table:
        print_summary(data)
    if args.plot:
        plot(data, args.plot)
        print(f"plot written to {args.plot}")
    payload = json.dumps(data, indent=2)
    if args.out:
        with open(args.out, "w") as f:
            f.write(payload + "\n")
        print(f"JSON written to {args.out}")
    else:
        print(payload)
    return data


if __name__ == "__main__":
    main(sys.argv[1:])
