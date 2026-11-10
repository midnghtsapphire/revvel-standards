#!/usr/bin/env python3
"""Bayesian evidence fusion: every layer is a likelihood ratio with an interval (SYSTEM_REVIEW upgrade B1).

Each evidence layer says, for every cell or segment j,

    LR_j = P(observation in j | person or remains in j) / P(observation in j | not in j)

with a 90% interval on the numbers that produce it. The layers are combined
with the prior by Bayes' rule, and the interval is carried through by Monte
Carlo, so the output is a posterior probability per unit with a median and a
90% interval, and a Rest Of World (ROW) term that keeps the probability that
the person is outside the modelled area.

Why likelihood ratios and not weights
-------------------------------------
# CANDID NOTE ON THE OLD WEIGHTS.
# The uploaded prototypes fused layers with hand-set weights. The clearest case
# is master_sensor_wave_search_script_v2.py:
#     fused = 0.45*dielectric + 0.25*lipid + 0.20*stress + 0.10*penetration
# Those weights were written by an AI assistant when the prototype was
# drafted. They were not fitted to any case, not taken from any detection
# trial and not elicited from any expert. Nothing in the repository supports
# 0.45 rather than 0.30 or 0.60. A weighted sum of scores also has no
# probabilistic meaning: it cannot be combined with a lost-person prior or
# with search POD, it counts two correlated sensors twice, and changing a
# weight reorders the sites without any new evidence. fusion.py already
# refuses built-in weights and calls its output a ranking, not a probability.
#
# This module replaces weights with likelihood ratios because an LR is what a
# detection trial actually measures (sensitivity and false-positive rate, or a
# calibrated score-to-LR table), and Bayes' rule, not taste, says how to
# combine it. This module ships NO LR values. Every layer must name the source
# of its numbers and give an interval. Where no trial exists, enter a wide
# interval and say so in "source"; the width then shows in the output instead
# of being hidden inside a weight.

Model
-----
Units are mutually exclusive locations: the cells of a raster (or the
segments of a segments CSV) plus ROW. If layer k observes each unit
separately, and the observations are independent given the person's location,
then

    P(unit j | all evidence)  proportional to  prior_j * prod_k LR_k(j),   LR(ROW) = 1

because every factor P(e_i | absent) for the units the person is not in
cancels in the normaliser. Equivalently, posterior odds(j vs ROW) = prior
odds(j vs ROW) * prod_k LR_k(j). The sum runs in log space.

Layer models ("model" in a layer spec; all estimates are {"value", "low", "high"},
read as a median and a 90% interval):

* ``bins``     raw value -> LR by a lookup table. "edges" (increasing) split the
               value line into len(edges)+1 bins; "lr" gives one estimate per bin.
* ``logistic`` logit P(present | x) = intercept + slope * x, fitted on data with
               "training_prevalence" pi. LR(x) = odds(x) / (pi / (1 - pi)).
* ``detector`` raw 1 = hit, 0 = miss, empty = not covered. "sensitivity" and
               "false_positive_rate" give LR(hit) = s / f, LR(miss) = (1 - s) / (1 - f).
* ``pod``      raw value = POD achieved by an unsuccessful search of the unit.
               LR = 1 - POD (a miss with no false alarms). This equals
               search_theory.bayes_update; the tests check it. "pod_factor"
               (median normally 1) scales the POD for its uncertainty.

A missing raw value (empty cell, NaN, raster nodata) means "not observed" and
contributes LR = 1.

Uncertainty. Each estimate's interval is read as a 90% interval of a
split-normal in log space (log LR, or logit for probabilities), so an
asymmetric interval stays asymmetric. One standard-normal draw per estimate
per Monte Carlo draw is shared by every unit, because a calibration error is
systematic, not independent cell to cell. The posterior is computed for each
draw; the report gives the point estimate (all estimates at their median
values), and the Monte Carlo median and 5th and 95th percentiles per unit.
Coefficients of a logistic model are drawn independently (their covariance
is rarely published); that is an approximation and is stated in the output.

Dependency groups. Layers in the same "group" are not independent (for
example two bands of one instrument, or two tips from one witness), so they
are never multiplied together. Per group, "combine" is:

* ``strongest`` (default) the member LR furthest from 1 in log terms, per unit;
* ``max`` / ``min``  the largest / smallest member LR per unit;
* ``joint``     only the layer named in "use_layer" counts: a combined LR the
                user measured for the group as a whole.

Admiralty grades (POLICY CHOICE). A layer may carry an Admiralty code (e.g.
"B2", graded as in evidence_scoring.py). A grade policy maps the code to an
exponent w in [0, 1] and the layer's LR becomes LR**w, which shrinks it toward 1.
The exponent is a policy choice, not a measurement. No policy is applied
unless one is given: with none, grades are recorded and a warning says they
were not used. ``--grade-policy example`` uses EXAMPLE_GRADE_POLICY below, an
illustrative monotone rule written by the author of this module. Replace it
with your agency's rule before relying on it.

Benchmark. ``score`` ranks a fused map against known outcomes (found
locations): the rank of the true unit, the probability mass of units that
would be searched before it in descending order, and the log score log p_true.
``load_sarenv`` reads a SAREnv scenario (Groentved et al., Drones 9(9) 628,
2025; github.com/namurproject/SAREnv, MIT) so its maps can be scored the same way.

Config (paths relative to the config file):

  {
    "prior": {"type": "segments", "file": "segments.csv"},
    "prior": {"type": "raster", "file": "probability.tif", "row_prior": 0.05},
    "prior": {"type": "sarenv", "dir": "sarenv_dataset/1", "row_prior": 0.05},
    "values": "values.csv",                    # segments: name + one column per layer
    "groups": {"gpr": {"combine": "strongest"}},
    "grade_policy": null | "example" | {"source": {...}, "credibility": {...}, "name": "..."},
    "monte_carlo": {"draws": 2000, "seed": 0},
    "layers": [
      {"name": "dog_alert", "model": "detector", "column": "dog_alert",
       "sensitivity": {"value": 0.7, "low": 0.5, "high": 0.85},
       "false_positive_rate": {"value": 0.1, "low": 0.04, "high": 0.2},
       "source": "cadaver-dog proficiency trials, team X, 2025 (n=40)", "group": "scent",
       "admiralty": "B2"},
      {"name": "search_1", "model": "pod", "column": "pod_round1",
       "pod_factor": {"value": 1.0, "low": 0.8, "high": 1.1}, "source": "debrief, sweep width USCG 2004"}
    ]
  }

Raster layers name a GeoTIFF in "file" on exactly the prior's grid (same
shape, transform and CRS); nothing is resampled silently.

Outputs: a JSON report, an optional segments CSV (name, area_km2, poa plus
sweep_width_km / speed_kmh passed through, plus interval columns) that
search_theory.py and optimal_search.py read directly, and an optional
GeoTIFF (bands: point posterior, MC median, p05, p95; ROW in the tags).
Pre-fusion pod/ttl_km columns are NOT passed through: the search they record
is already in the posterior, and passing them on would apply it twice.

  python evidence_fusion.py fuse --config fusion.json --out fused.json [--csv fused_segments.csv] [--tif fused.tif]
  python evidence_fusion.py score --map fused_segments.csv --found found.csv [--baseline prior_segments.csv]
  python evidence_fusion.py score --map fused.tif --found found_xy.csv
  python evidence_fusion.py score --sarenv sarenv_dataset/1 --found victims_xy.csv

Exit codes: 0 done; 2 bad input or configuration; 3 a needed package
(numpy, or rasterio for GeoTIFF) is missing.

Planning numbers. The posterior is only as good as the LRs fed in, and an LR
with no trial behind it is a judgement however it is written.
"""

import argparse
import csv
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import search_theory as st  # noqa: E402
import evidence_scoring as es  # noqa: E402

try:
    import numpy as np
except ImportError:  # pragma: no cover - reported at run time
    np = None

try:
    import rasterio
    from rasterio.transform import Affine
except ImportError:  # pragma: no cover - optional
    rasterio = None
    Affine = None

Z90 = 1.6448536269514722  # standard-normal 95th percentile: a 90% interval is +-Z90 sigma
MODELS = ("bins", "logistic", "detector", "pod")
COMBINES = ("strongest", "max", "min", "joint")
EPS = 1e-12

# POLICY CHOICE, NOT A MEASUREMENT. Written by the author of this module (an AI
# assistant) as an illustrative monotone rule: w = source weight * credibility
# weight, and E/F sources or credibility 5/6 get w = 0 (LR forced to 1), which
# matches evidence_scoring.geography_gate ("never sets search geography").
# No study supports these particular numbers. Replace them with your own rule.
EXAMPLE_GRADE_POLICY = {
    "name": "example_multiplicative_v1 (illustrative policy, not measured)",
    "source": {"A": 1.0, "B": 0.8, "C": 0.5, "D": 0.25, "E": 0.0, "F": 0.0},
    "credibility": {"1": 1.0, "2": 0.8, "3": 0.5, "4": 0.25, "5": 0.0, "6": 0.0},
}


class FusionError(ValueError):
    """Bad configuration or input."""


class MissingDependencyError(RuntimeError):
    """numpy (always) or rasterio (GeoTIFF) is not importable."""


def _need_numpy():
    if np is None:
        raise MissingDependencyError("evidence_fusion needs numpy (pip install numpy)")


def _need_rasterio():
    if rasterio is None:
        raise MissingDependencyError("GeoTIFF input/output needs rasterio (pip install rasterio)")


# --------------------------------------------------------------------------- estimates


def _estimate(spec, key, layer, prob=False, positive=False):
    """Validate {"value", "low", "high"} and return it as floats."""
    e = spec.get(key)
    if not isinstance(e, dict) or not all(k in e for k in ("value", "low", "high")):
        raise FusionError(f"layer {layer!r}: {key} must be an object with value, low and high (a 90% interval)")
    try:
        v, lo, hi = (float(e["value"]), float(e["low"]), float(e["high"]))
    except (TypeError, ValueError):
        raise FusionError(f"layer {layer!r}: {key} value/low/high must be numbers") from None
    if not all(math.isfinite(x) for x in (v, lo, hi)):
        raise FusionError(f"layer {layer!r}: {key} must be finite")
    if not lo <= v <= hi:
        raise FusionError(f"layer {layer!r}: {key} needs low <= value <= high, got {lo}, {v}, {hi}")
    if prob and not (0.0 <= lo and hi <= 1.0):
        raise FusionError(f"layer {layer!r}: {key} is a probability and must lie in [0, 1]")
    if positive and lo <= 0:
        raise FusionError(f"layer {layer!r}: {key} must be > 0 (an LR of 0 would make a unit impossible)")
    return {"value": v, "low": lo, "high": hi}


def _split_normal(centre, low, high, z):
    """Value at standard-normal z of a split-normal whose 5th/95th percentiles are low/high."""
    s_lo = (centre - low) / Z90
    s_hi = (high - centre) / Z90
    return centre + np.where(z < 0, z * s_lo, z * s_hi)


def _logit(p):
    p = np.clip(p, EPS, 1.0 - EPS)
    return np.log(p) - np.log1p(-p)


def _expit(x):
    return 1.0 / (1.0 + np.exp(-x))


def _draw_log(est, z):
    """Draws of a positive estimate, sampled in log space."""
    return _split_normal(math.log(est["value"]), math.log(est["low"]), math.log(est["high"]), z)


def _draw_prob(est, z):
    """Draws of a probability estimate, sampled on the logit scale."""
    c, lo, hi = (float(_logit(est[k])) for k in ("value", "low", "high"))
    return _expit(_split_normal(c, lo, hi, z))


def _draw_linear(est, z):
    return _split_normal(est["value"], est["low"], est["high"], z)


# --------------------------------------------------------------------------- layers


class Layer:
    """One evidence layer: a validated spec plus raw values per unit (NaN = not observed)."""

    def __init__(self, spec, index):
        if not isinstance(spec, dict):
            raise FusionError(f"layer {index}: expected an object")
        self.name = spec.get("name")
        if not isinstance(self.name, str) or not self.name.strip():
            raise FusionError(f"layer {index}: name is required")
        self.model = spec.get("model")
        if self.model not in MODELS:
            raise FusionError(f"layer {self.name!r}: model must be one of {MODELS}")
        src = spec.get("source")
        if not isinstance(src, str) or not src.strip():
            # RVS-VERIFY-001: a number with no named source is exactly what the 0.45/0.25 weights were.
            raise FusionError(f"layer {self.name!r}: 'source' must say where its numbers come from")
        self.source = src.strip()
        self.group = spec.get("group") or f"__own__{self.name}"
        self.grade = spec.get("admiralty")
        if self.grade is not None:
            g = str(self.grade).strip().upper()
            if len(g) != 2:
                raise FusionError(f"layer {self.name!r}: admiralty must be a code like 'B2'")
            try:
                self.grade = es.normalise_source(g[0]) + es.normalise_credibility(g[1])
            except es.ScoringError as exc:
                raise FusionError(f"layer {self.name!r}: {exc}") from None
        self.spec = spec
        self.raw = None
        n = self.model
        if n == "bins":
            edges = spec.get("edges")
            lrs = spec.get("lr")
            if not isinstance(edges, list) or not edges or not isinstance(lrs, list):
                raise FusionError(f"layer {self.name!r}: bins needs 'edges' (list) and 'lr' (list)")
            self.edges = [float(e) for e in edges]
            if any(b <= a for a, b in zip(self.edges, self.edges[1:])):
                raise FusionError(f"layer {self.name!r}: edges must be strictly increasing")
            if len(lrs) != len(self.edges) + 1:
                raise FusionError(f"layer {self.name!r}: {len(self.edges)} edges need {len(self.edges) + 1} lr entries")
            self.lr = [_estimate({"lr": e}, "lr", self.name, positive=True) for e in lrs]
            self.n_z = 1
        elif n == "logistic":
            self.intercept = _estimate(spec, "intercept", self.name)
            self.slope = _estimate(spec, "slope", self.name)
            pi = spec.get("training_prevalence")
            if not isinstance(pi, (int, float)) or not 0.0 < pi < 1.0:
                raise FusionError(f"layer {self.name!r}: training_prevalence must be in (0, 1)")
            self.log_prior_odds = math.log(pi / (1.0 - pi))
            self.n_z = 2
        elif n == "detector":
            self.sens = _estimate(spec, "sensitivity", self.name, prob=True)
            self.fpr = _estimate(spec, "false_positive_rate", self.name, prob=True)
            if self.fpr["low"] <= 0.0:
                raise FusionError(f"layer {self.name!r}: false_positive_rate must be > 0 (no detector has none)")
            self.n_z = 2
        else:  # pod
            self.pod_factor = _estimate(spec, "pod_factor", self.name, positive=True)
            self.n_z = 1

    def set_raw(self, values):
        v = np.asarray(values, dtype="f8").ravel()
        if self.model == "detector":
            ok = np.isnan(v) | (v == 0.0) | (v == 1.0)
            if not ok.all():
                raise FusionError(f"layer {self.name!r}: detector values must be 1 (hit), 0 (miss) or empty")
        if self.model == "pod":
            bad = ~np.isnan(v) & ((v < 0.0) | (v > 1.0))
            if bad.any():
                raise FusionError(f"layer {self.name!r}: POD values must lie in [0, 1]")
        self.raw = v

    def log_lr(self, z, sl=slice(None)):
        """log LR, shape (draws, units in sl). z: (draws, n_z) standard-normal draws (zeros = point estimate)."""
        x = self.raw[sl]
        miss = np.isnan(x)
        d = z.shape[0]
        if self.model == "bins":
            centre = np.array([math.log(e["value"]) for e in self.lr])
            lo = np.array([math.log(e["low"]) for e in self.lr])
            hi = np.array([math.log(e["high"]) for e in self.lr])
            table = _split_normal(centre[None, :], lo[None, :], hi[None, :], z[:, :1])  # (D, bins)
            idx = np.searchsorted(np.array(self.edges), np.where(miss, 0.0, x), side="right")
            out = table[:, idx]
        elif self.model == "logistic":
            b0 = _draw_linear(self.intercept, z[:, 0])[:, None]
            b1 = _draw_linear(self.slope, z[:, 1])[:, None]
            out = b0 + b1 * np.where(miss, 0.0, x)[None, :] - self.log_prior_odds
        elif self.model == "detector":
            s = _draw_prob(self.sens, z[:, 0])[:, None]
            f = _draw_prob(self.fpr, z[:, 1])[:, None]
            hit = np.log(s) - np.log(f)
            with np.errstate(divide="ignore"):
                mis = np.log1p(-s) - np.log1p(-f)
            out = np.where((x == 1.0)[None, :], hit, mis)
        else:
            fac = np.exp(_draw_log(self.pod_factor, z[:, 0]))[:, None]
            pod = np.clip(np.where(miss, 0.0, x)[None, :] * fac, 0.0, 1.0)
            with np.errstate(divide="ignore"):
                out = np.log1p(-pod)
        out = np.broadcast_to(out, (d, x.size)).copy()
        out[:, miss] = 0.0
        return out

    def describe(self):
        d = {k: v for k, v in self.spec.items() if k not in ("values",)}
        d["observed_units"] = int((~np.isnan(self.raw)).sum()) if self.raw is not None else 0
        return d


# --------------------------------------------------------------------------- grade policy


def resolve_grade_policy(policy):
    """None -> None; 'example' -> EXAMPLE_GRADE_POLICY; dict -> validated copy."""
    if policy in (None, "", "none"):
        return None
    if policy == "example":
        return EXAMPLE_GRADE_POLICY
    if not isinstance(policy, dict):
        raise FusionError("grade_policy must be null, 'example' or an object with source and credibility tables")
    src, cred = policy.get("source"), policy.get("credibility")
    if not isinstance(src, dict) or not isinstance(cred, dict):
        raise FusionError("grade_policy needs 'source' (A-F) and 'credibility' (1-6) tables")
    if sorted(src) != list(es.SOURCES) or sorted(str(k) for k in cred) != list(es.CREDIBILITIES):
        raise FusionError("grade_policy tables must cover every grade A-F and 1-6")
    out = {"name": str(policy.get("name") or "user policy"),
           "source": {k: float(v) for k, v in src.items()},
           "credibility": {str(k): float(v) for k, v in cred.items()}}
    for v in list(out["source"].values()) + list(out["credibility"].values()):
        if not 0.0 <= v <= 1.0:
            raise FusionError("grade_policy weights must lie in [0, 1] (they may only shrink an LR toward 1)")
    return out


def grade_weight(code, policy):
    if code is None or policy is None:
        return 1.0
    return policy["source"][code[0]] * policy["credibility"][code[1]]


# --------------------------------------------------------------------------- priors


class Prior:
    """Probability per unit (cells flattened row-major, or segments) plus ROW; units sum to 1 - row."""

    def __init__(self, prob, row, kind, names=None, shape=None, transform=None, crs=None, segments=None):
        self.prob = np.asarray(prob, dtype="f8").ravel()
        self.row = float(row)
        self.kind = kind
        self.names = names
        self.shape = shape
        self.transform = transform
        self.crs = crs
        self.segments = segments
        if (self.prob < 0).any() or not np.isfinite(self.prob).all():
            raise FusionError("prior probabilities must be finite and >= 0")
        if not 0.0 <= self.row <= 1.0:
            raise FusionError("ROW prior must lie in [0, 1]")
        if abs(self.prob.sum() + self.row - 1.0) > 1e-6:
            raise FusionError(f"prior sums to {self.prob.sum() + self.row:.6f} including ROW, not 1")

    @property
    def n(self):
        return self.prob.size


def prior_from_segments(segments):
    """From search_theory.read_segments output (POA sums to 1; a ROW row is optional)."""
    st.check_poa(segments)
    units = [s for s in segments if not st._is_row(s["name"])]
    rows = [s for s in segments if st._is_row(s["name"])]
    if not units:
        raise FusionError("the segments file has no searchable segment")
    row = sum(s["poa"] for s in rows)
    return Prior([s["poa"] for s in units], row, "segments", names=[s["name"] for s in units], segments=units)


def _grid_prior(arr, row_prior, kind, transform, crs, warnings):
    a = np.array(arr, dtype="f8")
    a[~np.isfinite(a)] = 0.0
    if (a < 0).any():
        raise FusionError("the prior raster has negative values")
    s = float(a.sum())
    if s <= 0:
        raise FusionError("the prior raster has no probability")
    if row_prior is None:
        if s > 1.0 + 1e-6:
            raise FusionError(f"the prior raster sums to {s:.6f} > 1; give row_prior to set the ROW share")
        row = max(0.0, 1.0 - s)
    else:
        row = float(row_prior)
        if not 0.0 <= row < 1.0:
            raise FusionError("row_prior must lie in [0, 1)")
    if row == 0.0:
        warnings.append("ROW prior is 0: the fusion assumes the person cannot be outside the raster. "
                        "Set row_prior to keep that possibility.")
    a *= (1.0 - row) / s
    return Prior(a, row, kind, shape=a.shape, transform=transform, crs=crs)


def prior_from_geotiff(path, row_prior, warnings):
    _need_rasterio()
    with rasterio.open(path) as src:
        a = src.read(1, masked=True).filled(np.nan)
        return _grid_prior(a, row_prior, "raster", src.transform, src.crs, warnings)


def load_sarenv(directory):
    """Read a SAREnv master scenario: <dir>/heatmap.npy and <dir>/features.geojson.

    Written from SAREnv's sarenv/core/loading.py (DatasetLoader), read on 2026-10-16, not from a downloaded
    dataset, so check it against real files before relying on it. In that loader:
      * features.geojson top-level keys "center_point" (lon, lat), "meter_per_bin", "bounds"
        (minx, miny, maxx, maxy in the projected UTM CRS), "climate", "environment_type", "features";
      * the CRS is not stored: it is the UTM zone of center_point (EPSG:326zz north, 327zz south);
      * heatmap.npy row = (y - miny) / meter_per_bin, col = (x - minx) / meter_per_bin, so row 0 is the
        SOUTH edge (not north-up like a GeoTIFF);
      * per-size scenarios (small, medium, ...) are circular clips of the master map whose radii come from
        sarenv's own tables; they are not reproduced here;
      * victim locations are not stored in the dataset: SAREnv draws them with LostPersonLocationGenerator.
        Export those draws (projected x, y) to CSV to score against.
    """
    _need_numpy()
    hp = os.path.join(directory, "heatmap.npy")
    fp = os.path.join(directory, "features.geojson")
    heat = np.load(hp, allow_pickle=False)
    with open(fp, encoding="utf-8") as f:
        meta = json.load(f)
    for k in ("center_point", "meter_per_bin", "bounds"):
        if k not in meta:
            raise FusionError(f"{fp}: missing {k!r} (not a SAREnv features.geojson?)")
    if heat.ndim != 2:
        raise FusionError(f"{hp}: heatmap must be 2-D")
    lon, lat = (float(v) for v in meta["center_point"])
    zone = int((lon + 180) / 6) + 1
    crs = f"EPSG:{326 if lat >= 0 else 327}{zone:02d}"
    mpb = float(meta["meter_per_bin"])
    minx, miny, maxx, maxy = (float(v) for v in meta["bounds"])
    return {"heatmap_south_up": heat, "meter_per_bin": mpb, "bounds": (minx, miny, maxx, maxy),
            "center_point_lonlat": (lon, lat), "crs": crs, "climate": meta.get("climate"),
            "environment_type": meta.get("environment_type"), "directory": directory}


def sarenv_world_to_cell(scn, x, y):
    """(row, col) in the NORTH-UP grid used here, from projected x, y; None if outside the map."""
    minx, miny = scn["bounds"][0], scn["bounds"][1]
    h, w = scn["heatmap_south_up"].shape
    c = int(math.floor((x - minx) / scn["meter_per_bin"]))
    r_south = int(math.floor((y - miny) / scn["meter_per_bin"]))
    if not (0 <= c < w and 0 <= r_south < h):
        return None
    return (h - 1 - r_south, c)


def prior_from_sarenv(scn, row_prior, warnings):
    north_up = np.flipud(np.asarray(scn["heatmap_south_up"], dtype="f8"))
    h = north_up.shape[0]
    mpb = scn["meter_per_bin"]
    minx, miny = scn["bounds"][0], scn["bounds"][1]
    tr = (mpb, 0.0, minx, 0.0, -mpb, miny + h * mpb)
    if Affine is not None:
        tr = Affine(*tr)
    return _grid_prior(north_up, row_prior, "sarenv", tr, scn["crs"], warnings)


# --------------------------------------------------------------------------- loading values


def _float_or_nan(v):
    if v is None:
        return float("nan")
    s = str(v).strip()
    if s == "":
        return float("nan")
    try:
        return float(s)
    except ValueError:
        raise FusionError(f"value {v!r} is not a number") from None


def read_values_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    out = {}
    for r in rows:
        name = (r.get("name") or "").strip()
        if not name:
            raise FusionError(f"{path}: every row needs a name")
        if name in out:
            raise FusionError(f"{path}: duplicate name {name!r}")
        out[name] = r
    return out


def attach_values(layers, prior, values_rows=None, base_dir="."):
    """Give every layer one raw value per prior unit."""
    for lay in layers:
        spec = lay.spec
        if prior.kind == "segments":
            if isinstance(spec.get("values"), dict):
                vals = spec["values"]
                unknown = set(vals) - set(prior.names)
                if unknown:
                    raise FusionError(f"layer {lay.name!r}: values for unknown segments {sorted(unknown)}")
                lay.set_raw([_float_or_nan(vals.get(n)) for n in prior.names])
                continue
            col = spec.get("column", lay.name)
            if values_rows is None:
                raise FusionError(f"layer {lay.name!r}: no values (give 'values' in the layer or a values CSV)")
            unknown = {n for n in values_rows if n not in prior.names and not st._is_row(n)}
            if unknown:
                raise FusionError(f"values CSV names unknown segments {sorted(unknown)}")
            if not any(col in r for r in values_rows.values()):
                raise FusionError(f"layer {lay.name!r}: values CSV has no column {col!r}")
            lay.set_raw([_float_or_nan(values_rows.get(n, {}).get(col)) for n in prior.names])
        else:
            if "array" in spec:  # API use and tests
                arr = np.asarray(spec["array"], dtype="f8")
            else:
                f = spec.get("file")
                if not f:
                    raise FusionError(f"layer {lay.name!r}: raster layers need 'file' (a GeoTIFF on the prior grid)")
                arr = read_layer_geotiff(os.path.join(base_dir, f), prior)
            if arr.shape != prior.shape:
                raise FusionError(f"layer {lay.name!r}: shape {arr.shape} != prior grid {prior.shape}")
            lay.set_raw(arr)


def read_layer_geotiff(path, prior):
    _need_rasterio()
    with rasterio.open(path) as src:
        if (src.height, src.width) != tuple(prior.shape):
            raise FusionError(f"{path}: grid {src.height}x{src.width} != prior {prior.shape}; resample it first")
        if prior.transform is not None and not np.allclose(tuple(src.transform)[:6], tuple(prior.transform)[:6]):
            raise FusionError(f"{path}: transform differs from the prior grid; resample it first")
        if prior.crs is not None and src.crs is not None and str(src.crs) != str(prior.crs):
            if rasterio.crs.CRS.from_user_input(prior.crs) != src.crs:
                raise FusionError(f"{path}: CRS {src.crs} != prior {prior.crs}")
        return src.read(1, masked=True).filled(np.nan).astype("f8")


# --------------------------------------------------------------------------- fusion


def _check_groups(layers, groups):
    groups = dict(groups or {})
    members = {}
    for lay in layers:
        members.setdefault(lay.group, []).append(lay)
    names = [lay.name for lay in layers]
    if len(set(names)) != len(names):
        raise FusionError("layer names must be unique")
    for g, cfg in groups.items():
        if g not in members:
            raise FusionError(f"group {g!r} is configured but no layer uses it")
        if not isinstance(cfg, dict):
            raise FusionError(f"group {g!r}: expected an object")
        c = cfg.get("combine", "strongest")
        if c not in COMBINES:
            raise FusionError(f"group {g!r}: combine must be one of {COMBINES}")
        if c == "joint" and cfg.get("use_layer") not in [m.name for m in members[g]]:
            raise FusionError(f"group {g!r}: combine 'joint' needs use_layer naming a member layer")
    return members, groups


def _combine(arrs, how, member_names=None, use_layer=None):
    if len(arrs) == 1:
        return arrs[0]
    stack = np.stack(arrs)  # (members, D, n)
    if how == "max":
        return stack.max(axis=0)
    if how == "min":
        return stack.min(axis=0)
    if how == "joint":
        return arrs[member_names.index(use_layer)]
    # strongest: the member furthest from LR = 1. -inf (POD 1) is the strongest of all.
    pick = np.argmax(np.abs(stack), axis=0)
    return np.take_along_axis(stack, pick[None], axis=0)[0]


def _total_log_lr(members, groups, policy, zs, sl):
    total = None
    for g, lays in members.items():
        cfg = groups.get(g, {})
        arrs = []
        for lay in lays:
            w = grade_weight(lay.grade, policy)
            a = lay.log_lr(zs[lay.name], sl)
            # A grade weight of 0 means "ignore this layer" (log LR 0), even where the LR is 0 (0 * -inf is nan).
            arrs.append(w * a if w > 0 else np.zeros_like(a))
        c = _combine(arrs, cfg.get("combine", "strongest"), [lay.name for lay in lays], cfg.get("use_layer"))
        total = c if total is None else total + c
    return total


def _chunks(n, draws, budget):
    step = max(1, int(budget // max(1, draws)))
    for a in range(0, n, step):
        yield slice(a, min(n, a + step))


def fuse(prior, layers, groups=None, grade_policy=None, draws=2000, seed=0, budget=4_000_000):
    """Return dict with point posterior, MC median/p05/p95 per unit and for ROW, and notes.

    budget = draws * units held in memory at once (two passes over the units, so any grid size works).
    """
    _need_numpy()
    if draws < 0:
        raise FusionError("draws cannot be negative")
    policy = resolve_grade_policy(grade_policy)
    members, groups = _check_groups(layers, groups)
    warnings = []
    for lay in layers:
        if lay.raw is None or lay.raw.size != prior.n:
            raise FusionError(f"layer {lay.name!r}: needs one raw value per unit ({prior.n})")
    graded = [lay.name for lay in layers if lay.grade]
    if graded and policy is None:
        warnings.append(f"layers {graded} carry Admiralty grades but no grade policy was given, so the grades "
                        "were NOT applied. Pass a grade policy to shrink LRs by grade (a policy choice).")
    with np.errstate(divide="ignore"):
        log_prior = np.log(prior.prob)
        log_row = math.log(prior.row) if prior.row > 0 else -math.inf

    def posterior(zs, d):
        lognorm = np.full(d, log_row)
        for sl in _chunks(prior.n, d, budget):
            lw = log_prior[sl][None, :] + _total_log_lr(members, groups, policy, zs, sl)
            lognorm = np.logaddexp(lognorm, _logsumexp(lw))
        if not np.isfinite(lognorm).all():
            raise FusionError("every unit and ROW has zero posterior weight (an LR of 0 everywhere the prior is)")
        return lognorm

    z0 = {lay.name: np.zeros((1, lay.n_z)) for lay in layers}
    ln0 = posterior(z0, 1)
    point = np.empty(prior.n)
    for sl in _chunks(prior.n, 1, budget):
        point[sl] = np.exp(log_prior[sl] + _total_log_lr(members, groups, policy, z0, sl)[0] - ln0[0])
    row_point = math.exp(log_row - ln0[0]) if prior.row > 0 else 0.0
    out = {"point": point, "row_point": row_point, "draws": draws, "seed": seed,
           "grade_policy": policy, "warnings": warnings}
    if draws > 0:
        rng = np.random.default_rng(seed)
        zs = {lay.name: rng.standard_normal((draws, lay.n_z)) for lay in layers}
        lnd = posterior(zs, draws)
        q = np.empty((3, prior.n))
        for sl in _chunks(prior.n, draws, budget):
            p = np.exp(log_prior[sl][None, :] + _total_log_lr(members, groups, policy, zs, sl) - lnd[:, None])
            q[:, sl] = np.quantile(p, [0.5, 0.05, 0.95], axis=0)
        rowd = np.exp(log_row - lnd) if prior.row > 0 else np.zeros(draws)
        out.update(median=q[0], p05=q[1], p95=q[2],
                   row_median=float(np.median(rowd)), row_p05=float(np.quantile(rowd, 0.05)),
                   row_p95=float(np.quantile(rowd, 0.95)))
    if any(lay.model == "logistic" for lay in layers):
        warnings.append("logistic coefficients were drawn independently (covariance not given); "
                        "the interval may be too wide or too narrow")
    return out


def _logsumexp(a):
    m = np.max(a, axis=1)
    m_safe = np.where(np.isfinite(m), m, 0.0)
    with np.errstate(divide="ignore"):
        return m_safe + np.log(np.sum(np.exp(a - m_safe[:, None]), axis=1))


# --------------------------------------------------------------------------- benchmark


def score_map(prob, row_prob, found):
    """Score a map against known outcomes.

    prob: per-unit probabilities (any shape, flattened); row_prob: ROW probability.
    found: list of flat unit indices, or None for a find outside the modelled area (ROW).

    Per find:
      rank            expected position of the true unit when units are searched in descending probability
                      (ties broken at random: 1 + #greater + (#tied - 1) / 2). ROW ranks after every unit.
      cum_prob_before probability mass searched before reaching the true unit (greater units plus half the
                      other tied units). Lower is better.
      log_score       ln p_true (higher is better); None, with impossible = True, if the map gave it 0.
    """
    _need_numpy()
    p = np.asarray(prob, dtype="f8").ravel()
    rows = []
    for f in found:
        if f is None:
            pt = float(row_prob)
            rank = float(p.size + 1)
            before = float(p.sum())
            unit = "ROW"
        else:
            f = int(f)
            if not 0 <= f < p.size:
                raise FusionError(f"found index {f} is outside the map")
            pt = float(p[f])
            greater = p > pt
            tied = int((p == pt).sum()) - 1
            rank = 1.0 + int(greater.sum()) + tied / 2.0
            before = float(p[greater].sum()) + 0.5 * tied * pt
            unit = f
        rows.append({"unit": unit, "p_true": pt, "rank": rank, "n_units": int(p.size),
                     "cum_prob_before": before, "log_score": math.log(pt) if pt > 0 else None,
                     "impossible": pt <= 0})
    n = len(rows)
    finite = [r["log_score"] for r in rows if r["log_score"] is not None]
    return {
        "finds": rows,
        "n_finds": n,
        "mean_rank": sum(r["rank"] for r in rows) / n if n else None,
        "mean_cum_prob_before": sum(r["cum_prob_before"] for r in rows) / n if n else None,
        "mean_log_score": (sum(finite) / n) if n and len(finite) == n else None,
        "any_impossible": any(r["impossible"] for r in rows),
        "note": "mean_log_score is None when any find had probability 0 (a log score of minus infinity).",
    }


def read_found(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise FusionError(f"{path}: no found locations")
    return rows


def found_to_units(rows, prior=None, names=None, scn=None):
    """Map found rows (name | row,col | x,y) to flat indices, None for ROW/outside."""
    out = []
    for r in rows:
        if names is not None and (r.get("name") or "").strip():
            n = r["name"].strip()
            if st._is_row(n):
                out.append(None)
            elif n in names:
                out.append(names.index(n))
            else:
                raise FusionError(f"found segment {n!r} is not in the map")
            continue
        shape = prior.shape if prior is not None else scn["heatmap_south_up"].shape
        if (r.get("row") or "").strip() and (r.get("col") or "").strip():
            rc = (int(r["row"]), int(r["col"]))
            inside = 0 <= rc[0] < shape[0] and 0 <= rc[1] < shape[1]
        elif (r.get("x") or "").strip() and (r.get("y") or "").strip():
            x, y = float(r["x"]), float(r["y"])
            if scn is not None:
                rc = sarenv_world_to_cell(scn, x, y)
            else:
                t = prior.transform
                col = math.floor((x - t[2]) / t[0]) if t[1] == 0 else None
                row = math.floor((y - t[5]) / t[4]) if t[3] == 0 else None
                if col is None or row is None:
                    raise FusionError("rotated grids are not supported for x, y finds; give row, col")
                rc = (row, col)
            inside = rc is not None and 0 <= rc[0] < shape[0] and 0 <= rc[1] < shape[1]
        else:
            raise FusionError("each found row needs name, or row and col, or x and y (map CRS)")
        out.append(rc[0] * shape[1] + rc[1] if inside else None)
    return out


# --------------------------------------------------------------------------- config and outputs


def load_config(path):
    with open(path, encoding="utf-8") as f:
        try:
            cfg = json.load(f)
        except json.JSONDecodeError as exc:
            raise FusionError(f"{path}: not valid JSON ({exc})") from None
    if not isinstance(cfg, dict):
        raise FusionError("config must be a JSON object")
    return cfg


def build(cfg, base_dir="."):
    """Return (prior, layers, warnings) from a config dict."""
    _need_numpy()
    warnings = []
    pspec = cfg.get("prior")
    if not isinstance(pspec, dict):
        raise FusionError("config needs 'prior'")
    kind = pspec.get("type")
    if kind == "segments":
        prior = prior_from_segments(st.read_segments(os.path.join(base_dir, pspec["file"])))
    elif kind == "raster":
        prior = prior_from_geotiff(os.path.join(base_dir, pspec["file"]), pspec.get("row_prior"), warnings)
    elif kind == "sarenv":
        prior = prior_from_sarenv(load_sarenv(os.path.join(base_dir, pspec["dir"])), pspec.get("row_prior"),
                                  warnings)
    else:
        raise FusionError("prior.type must be segments, raster or sarenv")
    specs = cfg.get("layers")
    if not isinstance(specs, list) or not specs:
        raise FusionError("config needs a non-empty 'layers' list")
    layers = [Layer(s, i) for i, s in enumerate(specs)]
    vrows = read_values_csv(os.path.join(base_dir, cfg["values"])) if cfg.get("values") else None
    attach_values(layers, prior, vrows, base_dir)
    return prior, layers, warnings


def report(prior, layers, res, groups, top_k=50):
    unit_rows = []
    order = np.argsort(-res["point"], kind="stable")
    idx = order if prior.kind == "segments" else order[:top_k]
    for i in idx:
        r = {"prior": float(prior.prob[i]), "posterior": float(res["point"][i])}
        if prior.kind == "segments":
            r = {"name": prior.names[i], **r}
        else:
            rr, cc = divmod(int(i), prior.shape[1])
            r = {"row": rr, "col": cc, **r}
            if prior.transform is not None:
                t = tuple(prior.transform)
                r["x"] = t[2] + (cc + 0.5) * t[0] + (rr + 0.5) * t[1]
                r["y"] = t[5] + (cc + 0.5) * t[3] + (rr + 0.5) * t[4]
        if "median" in res:
            r.update(median=float(res["median"][i]), p05=float(res["p05"][i]), p95=float(res["p95"][i]))
        unit_rows.append(r)
    row = {"prior": prior.row, "posterior": res["row_point"]}
    if "median" in res:
        row.update(median=res["row_median"], p05=res["row_p05"], p95=res["row_p95"])
    return {
        "kind": "posterior probability of location given the listed likelihood-ratio layers",
        "prior_kind": prior.kind,
        "n_units": prior.n,
        "units": unit_rows,
        "units_listed": "all" if prior.kind == "segments" else f"top {len(unit_rows)} by posterior",
        "row": row,
        "layers": [lay.describe() for lay in layers],
        "groups": groups or {},
        "grade_policy": res["grade_policy"],
        "grade_policy_is_policy_choice": res["grade_policy"] is not None,
        "monte_carlo": {"draws": res["draws"], "seed": res["seed"],
                        "interval": "90% (5th-95th percentile); estimate intervals read as 90% split-normal "
                                    "in log/logit space, one draw per estimate shared by all units"},
        "warnings": res["warnings"],
        "note": "Planning numbers. The posterior is only as good as the likelihood ratios; check each layer's "
                "source. LR(ROW) = 1 for every layer.",
    }


def write_segments_csv(path, prior, res):
    """name, area_km2, poa (+ sweep_width_km, speed_kmh, interval columns); search_theory/optimal_search read it."""
    has = {k: any(s.get(k) is not None for s in prior.segments) for k in ("sweep_width_km", "speed_kmh")}
    extra = [k for k, v in has.items() if v]
    ivl = ["poa_median", "poa_p05", "poa_p95"] if "median" in res else []
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["name", "area_km2", "poa"] + extra + ivl)
        for i, s in enumerate(prior.segments):
            iv = [repr(float(res[k][i])) for k in ("median", "p05", "p95")] if ivl else []
            w.writerow([s["name"], repr(s["area_km2"]), repr(float(res["point"][i]))]
                       + ["" if s.get(k) is None else repr(s[k]) for k in extra] + iv)
        iv = [repr(res[k]) for k in ("row_median", "row_p05", "row_p95")] if ivl else []
        w.writerow(["ROW", "", repr(res["row_point"])] + [""] * len(extra) + iv)


def write_geotiff(path, prior, res):
    _need_rasterio()
    if prior.transform is None:
        raise FusionError("the prior has no georeferencing; GeoTIFF output needs a raster or SAREnv prior")
    bands = [res["point"]] + ([res["median"], res["p05"], res["p95"]] if "median" in res else [])
    h, w = prior.shape
    with rasterio.open(path, "w", driver="GTiff", height=h, width=w, count=len(bands), dtype="float64",
                       crs=prior.crs, transform=prior.transform, compress="deflate") as dst:
        for k, b in enumerate(bands, 1):
            dst.write(np.asarray(b).reshape(h, w), k)
        dst.update_tags(row_probability=repr(res["row_point"]),
                        bands="point,median,p05,p95" if len(bands) > 1 else "point",
                        note="posterior from evidence_fusion.py; cells sum to 1 - row_probability")


def map_from_geotiff(path):
    _need_rasterio()
    with rasterio.open(path) as src:
        a = src.read(1).astype("f8")
        tags = src.tags()
        if "row_probability" not in tags:
            raise FusionError(f"{path}: no row_probability tag (not written by evidence_fusion.py?)")
        prior = Prior(a, float(tags["row_probability"]), "raster", shape=a.shape, transform=src.transform,
                      crs=src.crs)
    return prior


# --------------------------------------------------------------------------- CLI


def _write_json(path, obj):
    text = json.dumps(obj, indent=2, default=str)
    if path:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text + "\n")
    else:
        print(text)


def cmd_fuse(a):
    cfg = load_config(a.config)
    base = os.path.dirname(os.path.abspath(a.config))
    prior, layers, warnings = build(cfg, base)
    mc = cfg.get("monte_carlo") or {}
    draws = a.draws if a.draws is not None else int(mc.get("draws", 2000))
    seed = a.seed if a.seed is not None else int(mc.get("seed", 0))
    policy = a.grade_policy
    if policy is None:
        policy = cfg.get("grade_policy")
        if isinstance(policy, str) and policy.endswith(".json"):
            policy = os.path.join(base, policy)
    if isinstance(policy, str) and policy.endswith(".json"):
        with open(policy, encoding="utf-8") as f:
            policy = json.load(f)
    res = fuse(prior, layers, cfg.get("groups"), policy, draws, seed)
    res["warnings"] = warnings + res["warnings"]
    rep = report(prior, layers, res, cfg.get("groups"), a.top_k)
    if a.csv:
        if prior.kind != "segments":
            raise FusionError("--csv needs a segments prior (for a raster, use lost_person_sim segment POA)")
        write_segments_csv(a.csv, prior, res)
        rep["segments_csv"] = a.csv
    if a.tif:
        write_geotiff(a.tif, prior, res)
        rep["geotiff"] = a.tif
    _write_json(a.out, rep)
    return 0


def _load_map(path):
    if path.lower().endswith((".tif", ".tiff")):
        return map_from_geotiff(path)
    return prior_from_segments(st.read_segments(path))


def cmd_score(a):
    found_rows = read_found(a.found)
    if a.sarenv:
        scn = load_sarenv(a.sarenv)
        m = prior_from_sarenv(scn, 0.0, [])
        idx = found_to_units(found_rows, scn=scn)
    else:
        m = _load_map(a.map)
        idx = found_to_units(found_rows, prior=m, names=m.names)
    out = {"map": a.sarenv or a.map, "score": score_map(m.prob, m.row, idx)}
    if a.baseline:
        b = _load_map(a.baseline)
        if b.n != m.n:
            raise FusionError("baseline and map have different units")
        bs = score_map(b.prob, b.row, idx)
        out["baseline"] = {"map": a.baseline, "score": bs}
        if out["score"]["mean_log_score"] is not None and bs["mean_log_score"] is not None:
            out["log_score_gain_over_baseline"] = out["score"]["mean_log_score"] - bs["mean_log_score"]
    _write_json(a.out, out)
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("fuse", help="fuse LR layers with a prior")
    f.add_argument("--config", required=True)
    f.add_argument("--out")
    f.add_argument("--csv", help="segments CSV for search_theory.py / optimal_search.py")
    f.add_argument("--tif", help="posterior GeoTIFF (raster or SAREnv prior)")
    f.add_argument("--draws", type=int)
    f.add_argument("--seed", type=int)
    f.add_argument("--grade-policy", help="'example', 'none' or a JSON file (a policy choice)")
    f.add_argument("--top-k", type=int, default=50, help="raster cells listed in the JSON")
    s = sub.add_parser("score", help="benchmark a map against found locations")
    g = s.add_mutually_exclusive_group(required=True)
    g.add_argument("--map", help="fused segments CSV or fused GeoTIFF")
    g.add_argument("--sarenv", help="SAREnv scenario directory (heatmap.npy + features.geojson)")
    s.add_argument("--found", required=True, help="CSV: name, or row,col, or x,y in the map CRS")
    s.add_argument("--baseline", help="map to compare against (e.g. the prior)")
    s.add_argument("--out")
    try:
        a = ap.parse_args(argv)
    except SystemExit as e:
        return 2 if e.code else 0
    try:
        return cmd_fuse(a) if a.cmd == "fuse" else cmd_score(a)
    except MissingDependencyError as e:
        print(f"error: {e}", file=sys.stderr)
        return 3
    except (OSError, ValueError, KeyError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
