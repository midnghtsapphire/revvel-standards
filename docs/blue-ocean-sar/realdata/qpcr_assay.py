#!/usr/bin/env python3
"""qPCR assay validation (standard curve, LOD95, LOQ) and quantification of unknowns.

This module is the assay-side companion to qpcr_interpret.py. That script
applies Ct cutoffs that the lab already validated; this one derives those
limits from a dilution series and turns sample Cts into copies per gram of
soil with an interval. It is standard library only (no numpy): every model
here has two parameters, so the linear algebra is 2x2 and written out.

Standard curve (MIQE, Bustin et al. 2009, Clin Chem 55:611-622)
  Ordinary least squares over every detected standard well:
      Ct = slope * log10(copies) + intercept
  n wells, x = log10(copies), Sxx = sum (x - xbar)^2,
  s = sqrt(SSE / (n - 2))                         residual SD (Ct)
  SE(slope) = s / sqrt(Sxx)
  SE(intercept) = s * sqrt(1/n + xbar^2 / Sxx)
  R^2 = 1 - SSE / SST
  efficiency E = 10^(-1/slope) - 1                (1.0 = perfect doubling)
  SE(E) by the delta method: dE/dslope = 10^(-1/slope) * ln(10) / slope^2
  Flags (any flag = curve failed, samples are INCONCLUSIVE):
      E outside 0.90-1.10, R^2 < 0.98, slope >= 0.

LOD95 (Forootan et al. 2017, Biomol Detect Quantif 12:1-6;
       Klymus et al. 2020, Environmental DNA 2:271-282)
  Each standard well is a Bernoulli trial (amplified or not). Fit
      P(detect) = F(b0 + b1 * log10(copies))
  with F = logistic (default) or probit, by maximum likelihood using Fisher
  scoring (IRLS) with step halving. LOD95 is the concentration where the
  fitted curve crosses 0.95:
      log10 LOD95 = (F^-1(0.95) - b0) / b1
  95% CI by the delta method on the log10 scale from the inverse Fisher
  information, then back-transformed (so it is asymmetric in copies).
  Edge cases, reported instead of a fake number:
      never_detected   no standard well amplified
      not_reached      detection never reaches 95% inside the tested range
                       (the fitted crossing is above the top standard, or
                       the slope is not positive)
      below_range      every well amplified, LOD95 is below the lowest
                       standard; the lowest standard is used as a
                       conservative upper bound
      separation       detection jumps from <95% to 100% between two levels
                       with no overlap, so the MLE does not exist (Albert &
                       Anderson 1984, Biometrika 71:1-10); the lowest level
                       from which every level is fully detected is used as a
                       conservative upper bound

LOQ (Klymus et al. 2020; CV formula from Forootan et al. 2017)
  For each standard level, back-calculate copies for every detected well
  from the curve, x_i = (Ct_i - intercept) / slope, and take the SD of x_i
  on the natural-log scale, sd_ln = ln(10) * SD(x_i). Because copies grow
  exponentially with cycles, back-calculated copies are log-normal, so
      CV = sqrt(exp(sd_ln^2) - 1)
  which equals Forootan's sqrt((1+E)^(SD_Ct^2 * ln(1+E)) - 1) with E taken
  from the fitted slope. The arithmetic CV of the back-calculated copies is
  reported next to it for comparison. LOQ is the lowest standard such that
  it and every higher standard has CV <= 35%, at least 3 detected wells and
  a detection rate >= 95%. LOQ is never allowed below LOD95: the value used
  for calls is max(LOQ, LOD95).

Quantifying unknowns
  Mean Ct of the m detected replicates, y0, gives
      x0 = (y0 - intercept) / slope
  with the classical inverse-prediction interval (Draper & Smith, Applied
  Regression Analysis, 3rd ed., sec. 3.2):
      SE(x0) = s/|slope| * sqrt(1/m + 1/n + (y0 - ybar)^2 / (slope^2 Sxx))
      x0 +/- t(0.975, n-2) * SE(x0)
  Copies per gram of soil (all inputs explicit, nothing hidden):
      copies/g = copies/reaction * (elution_ul / template_ul) * dilution / soil_g
  No extraction-recovery correction is applied; copies/g is a lower bound on
  what was in the soil if recovery is below 100%.

Per-sample call, in this order (first match wins):
  INCONCLUSIVE               run invalid (NTC or extraction blank amplified,
                             standard curve failed, LOD95 not established,
                             no IPC reference, positive control failed), IPC
                             delayed by more than --ipc-shift cycles (default
                             2.0, the qpcr_interpret.py default; the prototype
                             used 1.5), too few replicates, or replicates
                             discordant at a quantifiable level. Never a
                             negative.
  NOT_DETECTED               no replicate amplified. Presence below LOD95
                             cannot be excluded.
  DETECTED_BELOW_LOD         amplified, but the estimate is below LOD95: a
                             real amplification at a level the assay picks up
                             less than 95% of the time. Not quantifiable.
  DETECTED_NOT_QUANTIFIABLE  estimate between LOD95 and LOQ.
  QUANTIFIED                 estimate >= LOQ, reported with its 95% PI.

Every result is an assay interpretation of amplification of one target. It
is not an identification: no sequencing or profile comparison was done.

Usage
  python3 qpcr_assay.py validate standards.csv
  python3 qpcr_assay.py quantify --standards standards.csv samples.csv \\
      --elution-ul 100 --template-ul 2 --soil-g 0.25

standards.csv columns: copies, ct   (ct blank / Undetermined = not amplified)
samples.csv: the qpcr_interpret.py plate format, sample_id, role, target, ct
  with role unknown | ntc | positive | extraction_blank, target human | ipc.

Exit codes: 0 = assay valid / run valid, 1 = analysis ran but QC failed,
2 = bad input.
"""

import argparse
import csv
import json
import math
import statistics
import sys
from collections import defaultdict

import qpcr_interpret as qi

DISCLAIMER = ("Assay interpretation of qPCR amplification of one target; not an identification. "
              "No sequencing or profile comparison was performed.")

EFF_RANGE = (0.90, 1.10)
R2_MIN = 0.98
CV_MAX = 0.35
DETECT_P = 0.95


def _sig(x, n=4):
    return None if x is None else float(f"{x:.{n}g}")


# ----------------------------------------------------------- distributions --

def _betacf(a, b, x):
    """Continued fraction for the incomplete beta (Numerical Recipes 6.4)."""
    tiny = 1e-300
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c, d = 1.0, 1.0 - qab * x / qap
    d = 1.0 / (d if abs(d) > tiny else tiny)
    h = d
    for m in range(1, 400):
        m2 = 2 * m
        for aa in (m * (b - m) * x / ((qam + m2) * (a + m2)),
                   -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))):
            d = 1.0 + aa * d
            d = 1.0 / (d if abs(d) > tiny else tiny)
            c = 1.0 + aa / c
            c = c if abs(c) > tiny else tiny
            h *= d * c
        if abs(d * c - 1.0) < 1e-15:
            break
    return h


def _betainc(a, b, x):
    """Regularized incomplete beta I_x(a, b)."""
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    bt = math.exp(math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
                  + a * math.log(x) + b * math.log1p(-x))
    if x < (a + 1.0) / (a + b + 2.0):
        return bt * _betacf(a, b, x) / a
    return 1.0 - bt * _betacf(b, a, 1.0 - x) / b


def t_cdf(t, df):
    tail = 0.5 * _betainc(df / 2.0, 0.5, df / (df + t * t))
    return 1.0 - tail if t > 0 else tail


def t_ppf(p, df):
    """Student-t quantile by bisection on t_cdf (|error| < 1e-10)."""
    if not 0.0 < p < 1.0 or df <= 0:
        raise ValueError("t_ppf needs 0 < p < 1 and df > 0")
    if p < 0.5:
        return -t_ppf(1.0 - p, df)
    lo, hi = 0.0, 1.0
    while t_cdf(hi, df) < p:
        hi *= 2.0
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if t_cdf(mid, df) < p:
            lo = mid
        else:
            hi = mid
        if hi - lo < 1e-12:
            break
    return 0.5 * (lo + hi)


_NORM = statistics.NormalDist()


def _sigmoid(e):
    if e >= 0:
        z = math.exp(-e)
        return 1.0 / (1.0 + z)
    z = math.exp(e)
    return z / (1.0 + z)


def _link_cdf(link, e):
    return _sigmoid(e) if link == "logit" else _NORM.cdf(e)


def _link_pdf(link, e):
    if link == "logit":
        s = _sigmoid(e)
        return s * (1.0 - s)
    return _NORM.pdf(e)


def _link_quantile(link, p):
    return math.log(p / (1.0 - p)) if link == "logit" else _NORM.inv_cdf(p)


# -------------------------------------------------------------- loading ----

def load_standards(path):
    """Rows of (copies, ct or None). ct blank / Undetermined / 0 = not amplified."""
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise ValueError(f"{path}: no rows")
    cols = {k.strip().lower(): k for k in rows[0] if k is not None}
    if not {"copies", "ct"} <= set(cols):
        raise ValueError(f"{path}: needs columns copies, ct (got {sorted(cols)})")
    out = []
    for i, r in enumerate(rows, start=2):
        raw = (r[cols["copies"]] or "").strip()
        try:
            copies = float(raw)
        except ValueError:
            raise ValueError(f"line {i}: copies {raw!r} is not a number") from None
        if not math.isfinite(copies) or copies <= 0:
            raise ValueError(f"line {i}: copies must be a finite number > 0, got {raw!r}")
        try:
            ct = qi._ct(r[cols["ct"]])
        except ValueError as e:
            raise ValueError(f"line {i}: {e}") from None
        out.append((copies, ct))
    return out


def _levels(standards, max_ct):
    """{copies: [ct or None, ...]} with Ct above max_ct counted as not amplified."""
    lv = defaultdict(list)
    for copies, ct in standards:
        lv[copies].append(ct if ct is not None and ct <= max_ct else None)
    return dict(sorted(lv.items()))


# -------------------------------------------------------- standard curve ---

def fit_standard_curve(standards, min_copies=None, max_ct=40.0):
    """OLS of Ct on log10(copies) over every detected standard well."""
    pts = [(math.log10(c), ct) for c, cts in _levels(standards, max_ct).items()
           if min_copies is None or c >= min_copies for ct in cts if ct is not None]
    levels = sorted({x for x, _ in pts})
    if len(levels) < 3 or len(pts) < 4:
        raise ValueError("standard curve needs at least 3 detected levels and 4 detected wells")
    n = len(pts)
    xbar = sum(x for x, _ in pts) / n
    ybar = sum(y for _, y in pts) / n
    sxx = sum((x - xbar) ** 2 for x, _ in pts)
    sxy = sum((x - xbar) * (y - ybar) for x, y in pts)
    sst = sum((y - ybar) ** 2 for _, y in pts)
    slope = sxy / sxx
    intercept = ybar - slope * xbar
    sse = sum((y - intercept - slope * x) ** 2 for x, y in pts)
    s = math.sqrt(sse / (n - 2))
    r2 = 1.0 - sse / sst if sst > 0 else 0.0
    se_slope = s / math.sqrt(sxx)
    flags = []
    eff = se_eff = None
    if slope < 0:
        eff = 10 ** (-1.0 / slope) - 1.0
        se_eff = 10 ** (-1.0 / slope) * math.log(10) / slope ** 2 * se_slope
        if not EFF_RANGE[0] <= eff <= EFF_RANGE[1]:
            flags.append(f"efficiency {eff:.3f} outside {EFF_RANGE[0]:.2f}-{EFF_RANGE[1]:.2f}")
    else:
        flags.append("slope is not negative: Ct does not fall as copies rise")
    if r2 < R2_MIN:
        flags.append(f"R^2 {r2:.4f} below {R2_MIN}")
    return {
        "slope": slope, "intercept": intercept, "r2": r2,
        "se_slope": se_slope, "se_intercept": s * math.sqrt(1.0 / n + xbar ** 2 / sxx),
        "efficiency": eff, "se_efficiency": se_eff, "residual_sd_ct": s,
        "n_wells": n, "n_levels": len(levels), "df": n - 2,
        "xbar": xbar, "ybar": ybar, "sxx": sxx,
        "levels_used_copies": [_sig(10 ** x, 6) for x in levels],
        "flags": flags, "passed": not flags,
    }


def inverse_predict(curve, mean_ct, m, level=0.95):
    """log10(copies) and its prediction interval for the mean Ct of m replicates."""
    b, a, s = curve["slope"], curve["intercept"], curve["residual_sd_ct"]
    x0 = (mean_ct - a) / b
    se = s / abs(b) * math.sqrt(1.0 / m + 1.0 / curve["n_wells"]
                                + (mean_ct - curve["ybar"]) ** 2 / (b * b * curve["sxx"]))
    t = t_ppf(0.5 + level / 2.0, curve["df"])
    return x0, x0 - t * se, x0 + t * se


# ------------------------------------------------------------------ LOD ---

def _loglik(link, b0, b1, data):
    ll = 0.0
    for x, n, k in data:
        p = min(max(_link_cdf(link, b0 + b1 * x), 1e-15), 1 - 1e-15)
        ll += k * math.log(p) + (n - k) * math.log(1.0 - p)
    return ll


def _fisher(link, b0, b1, data):
    """Weighted sums for one IRLS step: (S0, S1, S2, T0, T1)."""
    s0 = s1 = s2 = t0 = t1 = 0.0
    for x, n, k in data:
        e = b0 + b1 * x
        p = min(max(_link_cdf(link, e), 1e-15), 1 - 1e-15)
        d = max(_link_pdf(link, e), 1e-300)
        w = n * d * d / (p * (1.0 - p))
        z = e + (k / n - p) / d
        s0, s1, s2 = s0 + w, s1 + w * x, s2 + w * x * x
        t0, t1 = t0 + w * z, t1 + w * x * z
    return s0, s1, s2, t0, t1


def fit_detection(data, link="logit", max_iter=200):
    """ML fit of P(detect) = F(b0 + b1 x). data: [(x, n_wells, n_detected)].
    Returns b0, b1, covariance, log-likelihood, iterations, converged."""
    n_tot = sum(n for _, n, _ in data)
    rate = min(max(sum(k for _, _, k in data) / n_tot, 0.01), 0.99)
    b0, b1 = _link_quantile(link, rate), 0.0
    ll = _loglik(link, b0, b1, data)
    converged = False
    it = 0
    for it in range(1, max_iter + 1):
        s0, s1, s2, t0, t1 = _fisher(link, b0, b1, data)
        det = s0 * s2 - s1 * s1
        if det <= 0:
            break
        nb1 = (s0 * t1 - s1 * t0) / det
        nb0 = (t0 - nb1 * s1) / s0
        new_ll = _loglik(link, nb0, nb1, data)
        halvings = 0
        while new_ll < ll - 1e-12 and halvings < 40:
            nb0, nb1 = (b0 + nb0) / 2.0, (b1 + nb1) / 2.0
            new_ll = _loglik(link, nb0, nb1, data)
            halvings += 1
        step = max(abs(nb0 - b0), abs(nb1 - b1))
        b0, b1, ll = nb0, nb1, new_ll
        if step < 1e-10:
            converged = True
            break
    s0, s1, s2, _, _ = _fisher(link, b0, b1, data)
    det = s0 * s2 - s1 * s1
    cov = [[s2 / det, -s1 / det], [-s1 / det, s0 / det]] if det > 0 else None
    return {"b0": b0, "b1": b1, "cov": cov, "loglik": ll, "iterations": it, "converged": converged}


def _lod_edge_cases(data, link):
    """Status dict when the MLE does not exist, else None."""
    det_x = [x for x, n, k in data if k > 0]
    miss_x = [x for x, n, k in data if k < n]
    base = {"link": link, "p": DETECT_P}
    if not det_x:
        return dict(base, status="never_detected", lod95_copies=None, lod_for_calls=None,
                    note="no standard well amplified")
    if not miss_x:
        low = 10 ** min(x for x, _, _ in data)
        return dict(base, status="below_range", lod95_copies=None, lod_for_calls=low,
                    note="every standard well amplified; LOD95 is below the lowest standard, "
                         "which is used as a conservative upper bound")
    if max(miss_x) <= min(det_x):
        # lowest level from which every level up to the top is fully detected
        upper = None
        for x, n, k in reversed(data):
            if k < n:
                break
            upper = x
        if upper is None:
            return dict(base, status="not_reached", lod95_copies=None, lod_for_calls=None,
                        note="the top standard is not fully detected and no lower level overlaps it")
        lower = max(x for x in miss_x if x < upper)
        return dict(base, status="separation", lod95_copies=None, lod_for_calls=10 ** upper,
                    bracket_copies=[_sig(10 ** lower), _sig(10 ** upper)],
                    note="detection jumps to 100% with no overlap between levels, so the logistic "
                         "MLE does not exist; LOD95 lies in the bracket and its upper end is used. "
                         "Add replicates at intermediate concentrations to estimate it.")
    return None


def estimate_lod(standards, link="logit", max_ct=40.0, level=0.95):
    lv = _levels(standards, max_ct)
    data = [(math.log10(c), len(cts), sum(ct is not None for ct in cts)) for c, cts in lv.items()]
    table = [{"copies": _sig(10 ** x, 6), "wells": n, "detected": k, "rate": round(k / n, 4)}
             for x, n, k in data]
    edge = _lod_edge_cases(data, link)
    if edge is not None:
        edge["detection_table"] = table
        return edge
    fit = fit_detection(data, link)
    b0, b1, cov = fit["b0"], fit["b1"], fit["cov"]
    for row, (x, _, _) in zip(table, data):
        row["fitted_rate"] = round(_link_cdf(link, b0 + b1 * x), 4)
    out = {"link": link, "p": DETECT_P, "b0": b0, "b1": b1, "loglik": fit["loglik"],
           "converged": fit["converged"], "iterations": fit["iterations"], "detection_table": table}
    xmin, xmax = data[0][0], data[-1][0]
    if b1 <= 0 or not fit["converged"] or cov is None:
        return dict(out, status="not_reached", lod95_copies=None, lod_for_calls=None,
                    note="fitted detection probability does not rise with concentration")
    q = _link_quantile(link, DETECT_P)
    xs = (q - b0) / b1
    g0, g1 = -1.0 / b1, -xs / b1
    var = g0 * g0 * cov[0][0] + 2 * g0 * g1 * cov[0][1] + g1 * g1 * cov[1][1]
    z = _NORM.inv_cdf(0.5 + level / 2.0)
    half = z * math.sqrt(max(var, 0.0))
    out.update(lod95_copies=10 ** xs, ci95_copies=[10 ** (xs - half), 10 ** (xs + half)],
               se_log10=math.sqrt(max(var, 0.0)))
    if xs > xmax:
        return dict(out, status="not_reached", lod_for_calls=None,
                    note=f"assay never reaches {DETECT_P:.0%} detection inside the tested range "
                         f"(fitted crossing {10 ** xs:.4g} copies is above the top standard)")
    if xs < xmin:
        return dict(out, status="extrapolated_below_range", lod_for_calls=10 ** xs,
                    note="LOD95 is extrapolated below the lowest standard; add lower standards")
    return dict(out, status="ok", lod_for_calls=10 ** xs, note="")


# ------------------------------------------------------------------ LOQ ---

def cv_from_ct_sd(sd_ct, efficiency):
    """Forootan et al. 2017: CV of copies from Ct SD for exponential amplification."""
    return math.sqrt((1.0 + efficiency) ** (sd_ct ** 2 * math.log(1.0 + efficiency)) - 1.0)


def estimate_loq(standards, curve, cv_max=CV_MAX, max_ct=40.0, min_detected=3):
    a, b = curve["intercept"], curve["slope"]
    rows = []
    for copies, cts in _levels(standards, max_ct).items():
        det = [c for c in cts if c is not None]
        row = {"copies": _sig(copies, 6), "wells": len(cts), "detected": len(det),
               "rate": round(len(det) / len(cts), 4), "cv": None, "cv_arithmetic": None,
               "sd_ct": None, "mean_back_calculated": None, "passes": False}
        if len(det) >= 2 and b < 0:
            x = [(c - a) / b for c in det]
            q = [10 ** v for v in x]
            sd_ln = math.log(10) * statistics.stdev(x)
            row.update(cv=round(math.sqrt(math.expm1(sd_ln ** 2)), 4),
                       cv_arithmetic=round(statistics.stdev(q) / statistics.mean(q), 4),
                       sd_ct=round(statistics.stdev(det), 4),
                       mean_back_calculated=_sig(statistics.mean(q)))
            row["passes"] = (len(det) >= min_detected and row["rate"] >= DETECT_P
                             and row["cv"] <= cv_max)
        rows.append(row)
    loq = None
    for row in reversed(rows):
        if not row["passes"]:
            break
        loq = row["copies"]
    return {"loq_copies": loq, "cv_max": cv_max, "cv_curve": rows,
            "rule": "lowest standard from which every higher standard also has CV <= cv_max, "
                    f">= {min_detected} detected wells and detection rate >= {DETECT_P:.0%}"}


# ------------------------------------------------------------- validate ---

def validate(standards, link="logit", cv_max=CV_MAX, curve_min_copies=None, max_ct=40.0):
    curve = fit_standard_curve(standards, curve_min_copies, max_ct)
    lod = estimate_lod(standards, link, max_ct)
    loq = estimate_loq(standards, curve, cv_max, max_ct)
    problems = [f"standard curve: {f}" for f in curve["flags"]]
    if lod["lod_for_calls"] is None:
        problems.append(f"LOD95 not established ({lod['status']}): {lod.get('note', '')}")
    loq_eff = loq["loq_copies"]
    if loq_eff is not None and lod["lod_for_calls"] is not None and loq_eff < lod["lod_for_calls"]:
        loq_eff = lod["lod_for_calls"]
        loq["note"] = "LOQ standard is below LOD95; LOD95 is used as the LOQ for calls"
    pub = {k: v for k, v in curve.items() if k not in ("xbar", "ybar", "sxx")}
    return {
        "interpretation": DISCLAIMER,
        "validation_ok": not problems, "problems": problems,
        "standard_curve": pub, "lod": lod, "loq": loq,
        "limits_for_calls": {"lod95_copies_per_reaction": _sig(lod["lod_for_calls"]),
                             "loq_copies_per_reaction": _sig(loq_eff)},
        "_curve": curve,
    }


# ------------------------------------------------------------- quantify ---

def copies_per_gram(copies_per_reaction, elution_ul, template_ul, soil_g, dilution=1.0):
    """copies/g soil = copies/rxn * (elution_ul / template_ul) * dilution / soil_g."""
    for name, v in (("elution_ul", elution_ul), ("template_ul", template_ul),
                    ("soil_g", soil_g), ("dilution", dilution)):
        if not (isinstance(v, (int, float)) and math.isfinite(v) and v > 0):
            raise ValueError(f"{name} must be a finite number > 0, got {v!r}")
    if template_ul > elution_ul:
        raise ValueError(f"template_ul ({template_ul}) cannot exceed elution_ul ({elution_ul})")
    if dilution < 1:
        raise ValueError("dilution is a dilution factor (>= 1, e.g. 10 for 1:10)")
    return copies_per_reaction * (elution_ul / template_ul) * dilution / soil_g


def _run_problems(by, roles, max_ct, ipc_ref_ct):
    problems = []
    for sid, role in roles.items():
        hum = by[sid]["human"]
        if role in ("ntc", "extraction_blank") and any(c is not None and c <= max_ct for c in hum):
            problems.append(f"{role} {sid} amplified the target (contamination)")
        if role == "positive" and not any(c is not None and c <= max_ct for c in hum):
            problems.append(f"positive control {sid} did not amplify")
    if not any(r == "ntc" for r in roles.values()):
        problems.append("no NTC on plate")
    ref = ipc_ref_ct
    if ref is None:
        ntc_ipc = [c for sid, r in roles.items() if r == "ntc" for c in by[sid]["ipc"] if c is not None]
        ref = statistics.mean(ntc_ipc) if ntc_ipc else None
    if ref is None:
        problems.append("no IPC reference (no NTC IPC amplified and no --ipc-ref-ct): inhibition cannot be checked")
    return problems, ref


def _ipc_reason(ipc, ctx):
    if ctx["ipc_ref"] is None:
        return None
    up = [c for c in ipc if c is not None]
    if not ipc:
        return "no IPC well for this sample: inhibition cannot be checked"
    if not up:
        return "IPC did not amplify (complete inhibition): dilute the extract and re-run"
    shift = statistics.mean(up) - ctx["ipc_ref"]
    if shift > ctx["ipc_shift"]:
        return f"IPC delayed {shift:.2f} cycles > {ctx['ipc_shift']} (inhibition): dilute 1:10 and re-run"
    return None


def _quant(det, ctx):
    x0, lo, hi = inverse_predict(ctx["curve"], statistics.mean(det), len(det))
    f = ctx["factor"]
    return {"estimate": 10 ** x0, "pi95": [10 ** lo, 10 ** hi], "per_g": 10 ** x0 * f,
            "per_g_pi95": [10 ** lo * f, 10 ** hi * f]}


def _concordance_reason(cts, det, est, ctx):
    loq = ctx["loq"]
    if loq is None or est < loq:
        return None  # low-copy scatter and dropouts are expected (Poisson sampling)
    if len(det) >= 2 and max(det) - min(det) > ctx["max_spread"]:
        return (f"replicate Ct spread {max(det) - min(det):.2f} > {ctx['max_spread']} "
                "at a quantifiable level (replicates discordant)")
    if len(det) < len(cts):
        return (f"{len(cts) - len(det)} of {len(cts)} replicates failed at a quantifiable level "
                "(replicates discordant: pipetting or contamination)")
    return None


def _lims_text(ctx):
    lod, f = ctx["lod"], ctx["factor"]
    return f"LOD95 = {lod:.4g} copies/reaction (~{lod * f:.4g} copies/g soil)"


def classify_sample(sid, by_target, ctx):
    cts, ipc = by_target["human"], by_target["ipc"]
    det = [c for c in cts if c is not None and c <= ctx["max_ct"]]
    res = {"sample_id": sid, "target_ct": cts, "ipc_ct": ipc, "detected_replicates": len(det),
           "replicates": len(cts), "mean_ct": round(statistics.mean(det), 3) if det else None,
           "note": DISCLAIMER}
    reasons = [f"run invalid: {p}" for p in ctx["run_problems"]]
    if not reasons:
        r = _ipc_reason(ipc, ctx)
        reasons += [r] if r else []
        if len(cts) < ctx["min_reps"]:
            reasons.append(f"{len(cts)} target replicate(s) < {ctx['min_reps']} required")
        q = _quant(det, ctx) if det else None
        if q is not None:
            r = _concordance_reason(cts, det, q["estimate"], ctx)
            reasons += [r] if r else []
    if reasons:
        return dict(res, call="INCONCLUSIVE", reasons=reasons,
                    call_text="inconclusive: this is NOT a negative; fix the cause and re-run")
    if not det:
        return dict(res, call="NOT_DETECTED", reasons=[],
                    call_text=f"not detected (cannot exclude presence below LOD; {_lims_text(ctx)})")
    if q["estimate"] < ctx["lod"]:
        return dict(res, call="DETECTED_BELOW_LOD", reasons=[],
                    call_text=("amplified at an estimated level below LOD95, where the assay detects "
                               f"less than 95% of the time; not quantifiable; confirm by re-test ({_lims_text(ctx)})"))
    if ctx["loq"] is None or q["estimate"] < ctx["loq"]:
        loq_txt = "no LOQ established" if ctx["loq"] is None else f"LOQ = {ctx['loq']:.4g} copies/reaction"
        return dict(res, call="DETECTED_NOT_QUANTIFIABLE", reasons=[],
                    call_text=f"detected, not quantifiable ({loq_txt})")
    res["copies_per_reaction"] = {"estimate": _sig(q["estimate"]), "pi95": [_sig(v) for v in q["pi95"]]}
    res["copies_per_g_soil"] = {"estimate": _sig(q["per_g"]), "pi95": [_sig(v) for v in q["per_g_pi95"]]}
    return dict(res, call="QUANTIFIED", reasons=[],
                call_text=(f"quantified: {q['per_g']:.3g} copies/g soil "
                           f"(95% PI {q['per_g_pi95'][0]:.3g}-{q['per_g_pi95'][1]:.3g})"))


def quantify(standards, plate_rows, elution_ul, template_ul, soil_g, dilution=1.0, link="logit",
             cv_max=CV_MAX, curve_min_copies=None, ipc_shift=2.0, ipc_ref_ct=None,
             max_spread=1.5, min_reps=2, max_ct=40.0):
    factor = copies_per_gram(1.0, elution_ul, template_ul, soil_g, dilution)
    val = validate(standards, link, cv_max, curve_min_copies, max_ct)
    by = defaultdict(lambda: defaultdict(list))
    roles = {}
    for r in plate_rows:
        by[r["sample_id"]][r["target"]].append(r["ct"])
        if roles.setdefault(r["sample_id"], r["role"]) != r["role"]:
            raise ValueError(f"sample {r['sample_id']} has rows with roles {roles[r['sample_id']]!r} and {r['role']!r}")
    problems, ipc_ref = _run_problems(by, roles, max_ct, ipc_ref_ct)
    problems = [f"assay validation: {p}" for p in val["problems"]] + problems
    warnings = [] if any(r == "extraction_blank" for r in roles.values()) else [
        "no extraction blank on plate: contamination during extraction is not checked"]
    lims = val["limits_for_calls"]
    ctx = {"curve": val["_curve"], "lod": lims["lod95_copies_per_reaction"],
           "loq": lims["loq_copies_per_reaction"], "factor": factor, "ipc_ref": ipc_ref,
           "ipc_shift": ipc_shift, "max_spread": max_spread, "min_reps": min_reps,
           "max_ct": max_ct, "run_problems": problems}
    samples = [classify_sample(sid, by[sid], ctx) for sid, role in roles.items() if role == "unknown"]
    per_g = {k.replace("per_reaction", "per_g_soil"): _sig(v * factor) if v is not None else None
             for k, v in lims.items()}
    val.pop("_curve")
    return {
        "interpretation": DISCLAIMER,
        "run_valid": not problems, "run_problems": problems, "warnings": warnings,
        "assay": val, "limits_per_g_soil": per_g,
        "conversion": {"formula": "copies/g = copies/reaction * (elution_ul / template_ul) * dilution / soil_g",
                       "elution_ul": elution_ul, "template_ul": template_ul, "soil_g": soil_g,
                       "dilution": dilution, "factor": factor,
                       "note": "no extraction-recovery correction; copies/g is a lower bound if recovery < 100%"},
        "rules": {"ipc_reference_ct": ipc_ref, "ipc_max_shift": ipc_shift, "max_replicate_spread": max_spread,
                  "min_replicates": min_reps, "max_ct": max_ct, "cv_max": cv_max, "detection_link": link},
        "samples": samples,
    }


# ------------------------------------------------------------------ CLI ---

def _emit(res, out):
    text = json.dumps(res, indent=2)
    if out:
        with open(out, "w") as f:
            f.write(text)
    print(text)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--link", choices=("logit", "probit"), default="logit")
    common.add_argument("--cv-max", type=float, default=CV_MAX, help="LOQ CV threshold (Klymus 2020: 0.35)")
    common.add_argument("--curve-min-copies", type=float, help="fit the curve only on standards >= this")
    common.add_argument("--max-ct", type=float, default=40.0, help="Ct above this counts as not amplified")
    common.add_argument("--out", help="write JSON result here")
    v = sub.add_parser("validate", parents=[common], help="standard curve, LOD95, LOQ")
    v.add_argument("standards_csv")
    q = sub.add_parser("quantify", parents=[common], help="call and quantify unknowns on a plate")
    q.add_argument("samples_csv")
    q.add_argument("--standards", required=True)
    q.add_argument("--elution-ul", type=float, required=True, help="DNA extract elution volume (ul)")
    q.add_argument("--template-ul", type=float, required=True, help="extract volume per reaction (ul)")
    q.add_argument("--soil-g", type=float, required=True, help="soil mass extracted (g)")
    q.add_argument("--dilution", type=float, default=1.0, help="extract dilution factor before qPCR")
    q.add_argument("--ipc-shift", type=float, default=2.0)
    q.add_argument("--ipc-ref-ct", type=float, help="IPC reference Ct (default: mean NTC IPC Ct)")
    q.add_argument("--max-spread", type=float, default=1.5)
    q.add_argument("--min-reps", type=int, default=2)
    a = ap.parse_args(argv)
    try:
        standards = load_standards(a.standards_csv if a.cmd == "validate" else a.standards)
        if a.cmd == "validate":
            res = validate(standards, a.link, a.cv_max, a.curve_min_copies, a.max_ct)
            res.pop("_curve")
            ok = res["validation_ok"]
        else:
            res = quantify(standards, qi.load(a.samples_csv), a.elution_ul, a.template_ul, a.soil_g,
                           a.dilution, a.link, a.cv_max, a.curve_min_copies, a.ipc_shift, a.ipc_ref_ct,
                           a.max_spread, a.min_reps, a.max_ct)
            ok = res["run_valid"]
    except (OSError, ValueError, KeyError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    _emit(res, a.out)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
