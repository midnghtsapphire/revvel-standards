"""Probability-weighted downstream drift envelope for riverine recovery.

Implements ``docs/case-files/general/drift_modeling_note.md``: the output is a
probability curve along the river from the last known point (LKP), decaying
with distance, with spikes at snag features. It is **not** a single distance.

Changes for SYSTEM_REVIEW C3 (2026-10-16)
-----------------------------------------
The review found the output byte-identical at 1 h and 240 h, cleared cells set
to 0, and mass beyond the reach renormalised into it (about doubling the
in-reach numbers). Now:

* **Elapsed time sets the median** (``median_from_time``). The CLI refuses to
  run (exit 2) unless you give ``--elapsed-hours`` or state a median for the
  case with ``--median-mi``. Two documented, overridable models:

  - ``sqrt_time`` (default): ``median = ref_median x (t / ref_hours) ^ exponent``
    with ``ref_median`` 0.5 mi at ``ref_hours`` 24 h and ``exponent`` 0.5
    (``--ref-median-mi``, ``--ref-hours``, ``--time-exponent``). The 0.5 mi at
    24 h anchor is the old fixed default; the square-root growth is a
    dispersive-spread **assumption**, not a fit to recoveries. At 1 h the median
    is ~164 m, at 240 h ~1.58 mi.
  - ``velocity`` (opt-in): ``median = transport_fraction x v x t``, with ``v``
    from ``--mean-velocity-mps``, or from gauge discharge divided by a cross-section
    **measured at this reach** (``--discharge-cfs`` with ``--xsec-ft2``).
    ``--transport-fraction`` (the share of mean velocity a submerged body
    achieves on average, snag time included) has **no default**: you must
    state it. This only sets the median of the decaying curve; the naive
    single-distance figure stays rejected.

  ``--median-mi`` overrides both and is recorded as user-stated.
* **Cleared cells use a POD**, applied with the Bayesian update from
  ``search_theory.bayes_update``: ``P_i' = P_i (1 - POD_i) / (1 - sum P_j POD_j)``
  over all cells **and** the beyond-reach bucket. ``--cleared start:end[:pod]``;
  the default POD is ``--cleared-pod 0.8``, an explicit **assumption**
  reported in ``summary.json``. A POD of 1 is used only if you state it.
* **Mass beyond the reach is kept** in a ``beyond_reach`` bucket (last CSV row,
  ``summary.model.beyond_reach``); in-reach cells are no longer renormalised.
* **Columns.** ``prior_mass`` (before search), ``pod``, ``posterior_mass``
  (after the update; cells plus beyond_reach sum to 1) and
  ``prior_share_within_reach`` (posterior_mass divided by the in-reach total:
  the share *conditional on the body being inside the modelled reach*, i.e.
  the planning prior for the next search within the reach). ``cumulative``
  and ``mass_within`` are now unconditional (cumulative posterior_mass).
* **DEPRECATED ``probability`` column.** Kept, equal to
  ``prior_share_within_reach``, only because ``dossier.py`` reads
  ``top_cells[].probability`` from ``summary.json``. Do not read it as the
  probability that the body is in the cell: use ``posterior_mass``. It will be
  removed once dossier.py reads ``prior_share_within_reach``. With
  ``--cleared-pod 1`` it reproduces the old ``probability`` values exactly.

Model
-----
The reach downstream of the LKP (chainage 0) is cut into cells (default 100 m).
For each cell::

    weight = near_field_decay_mass(cell) x snag_multiplier(cell)
    prior_mass = (1 - beyond_reach_mass) x weight / sum(weights)
    posterior_mass = prior_mass x (1 - POD) / norm     (POD = 0 unless cleared; norm includes beyond_reach)
    prior_share_within_reach = posterior_mass / sum(in-reach posterior_mass)
    search_priority = posterior_mass x accessibility / sum(...)

Previous model (SYSTEM_REVIEW C3: replaced, kept for the record)::

    probability = weight / sum(weights)                 (cleared cells set to 0 first)
    search_priority = probability x accessibility / sum(...)

* ``near_field_decay_mass`` is the exact integral of the decay density over
  the cell (exponential, or half-normal), so cell size does not bias it.
  Both are parameterised by their **median distance**; the default median is
  0.5 mi (804.7 m), i.e. about half the un-truncated mass lies within the first
  half mile. **That is an assumption, not a measurement.** Change it with
  ``--median-mi``. Mass beyond the modelled reach is reported (``prior mass
  beyond reach``) and the in-reach cells are renormalised to sum to 1.
  [SYSTEM_REVIEW C3: superseded: the median now follows elapsed time, and the
  beyond-reach mass is kept as its own bucket, not renormalised in.]
* ``snag_multiplier`` comes from features you map from imagery/NHD (type and
  downstream distance). The default multipliers below are **assumptions**
  chosen to express "bodies hang up here", not measured hang-up rates. Where
  several features share a cell, the largest multiplier is used.
* ``accessibility`` (0-1, default 1) changes where to search first. It does
  not change where the body is, so it only enters ``search_priority`` and the
  rank, not ``probability`` or its cumulative sum.
* cleared cells (searched with a detection probability treated as 1) are set
  to 0 and everything is renormalised. [SYSTEM_REVIEW C3: superseded by the
  per-cell POD update above.]

The naive ``velocity = Q / A; distance = velocity x time`` estimate is
computed only to show it, flagged ``REJECTED`` with the reasons from the note.
It never feeds the envelope.

The refloat note from water temperature gives qualitative bands only. It is a
rough bracket, not a clock.

Optional: a river centreline (GeoJSON LineString, coordinates ``[lon, lat]``,
first vertex at the LKP, drawn downstream) maps chainage to lat/lon and writes
GeoJSON and KML of the ranked cells and features. Without it, cells are
chainage-only.

CLI::

    python drift_envelope.py --case sar_case_records.json --case-id OKANOGAN-2026-05-27 \\
        --elapsed-hours 25 --out-dir out/okanogan
    python drift_envelope.py --lat 48.93 --lon -119.42 --water-temp-c 20 --elapsed-hours 25 \\
        --feature strainer_logjam:650:Logjam-1 --feature bend_inside:1400 \\
        --access 2000:2600:0.3 --cleared 0:200 --cleared 200:400:0.5 --centreline reach.geojson --out-dir out/x
    python drift_envelope.py --median-mi 0.8 --out-dir out/y        # median stated for the case

Writes ``envelope.csv`` and ``summary.json`` always; ``envelope.geojson`` and
``envelope.kml`` when a centreline is given.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import sys
from dataclasses import dataclass
from xml.sax.saxutils import escape

import search_theory  # SYSTEM_REVIEW C3: reuse its Bayesian POD update

M_PER_MI = 1609.344
FT_PER_MI = 5280.0
EARTH_R_M = 6371008.8

DEFAULT_REACH_M = 3 * M_PER_MI
DEFAULT_CELL_M = 100.0
DEFAULT_MEDIAN_M = 0.5 * M_PER_MI
# SYSTEM_REVIEW C3: elapsed-time model. ASSUMPTIONS, overridable on the command line.
DEFAULT_REF_HOURS = 24.0  # the old fixed 0.5 mi median is read as the median at 24 h
DEFAULT_TIME_EXPONENT = 0.5  # square-root (dispersive) growth of the median with time
TIME_MODELS = ("sqrt_time", "velocity")
# Default POD for a cleared range. An explicit assumption, never 1.0 unless the user states it.
DEFAULT_CLEARED_POD = 0.8
FT_TO_M = 0.3048
BEYOND_REACH = "beyond_reach"

# ASSUMPTIONS, not measurements. Relative weight of a cell holding the feature
# versus the same cell without it. Override per feature or with --multiplier.
DEFAULT_MULTIPLIERS = {
    "strainer_logjam": 6.0,
    "bend_inside": 3.0,
    "bridge_piling": 3.0,
    "undercut_bank": 2.5,
    "eddy": 2.0,
}
TYPE_ALIASES = {"strainer": "strainer_logjam", "logjam": "strainer_logjam", "log_jam": "strainer_logjam"}

# The cross-section bracket that reproduces the note's "45-250 miles" for
# ~5,200 cfs over ~25 h. Illustrative only: it exists to show the trap.
NAIVE_XSEC_FT2 = (350.0, 2000.0)
NAIVE_REJECTION_REASONS = [
    "Discharge is not local velocity: the gauge flow is upstream; below the confluence the channel widens and slows, "
    "and a small cross-section inflates velocity.",
    "Bodies are not floats: a drowned body is usually negatively buoyant at first, travels near the bed at a fraction "
    "of surface velocity, and only intermittently.",
    "Snagging dominates: in flood-stage, debris-laden water the likely outcome is early entrapment on the first "
    "strainer, undercut bank, piling or bend.",
    "The anchor argues local: a physical item recovered at the last-seen point implies a contained entry.",
]

# Qualitative refloat bands by water temperature. Band edges are assumptions;
# the wording is deliberately coarse. Rough bracket, not a clock.
REFLOAT_BANDS = [
    (
        None,
        7.0,
        "cold",
        "Refloat slow: weeks to months, and very cold deep water may prevent it.",
        "Subsurface emphasis (sonar, dive teams) on snag cells; surface refloat is not expected soon.",
    ),
    (
        7.0,
        15.0,
        "cool",
        "Refloat slower: expect weeks rather than days.",
        "Subsurface emphasis first; add surface and shoreline checks later in the bracket.",
    ),
    (
        15.0,
        18.0,
        "mild",
        "Between the cool and warm bands: on the order of a week or more.",
        "Subsurface on snag cells now; plan surface and shoreline passes.",
    ),
    (
        18.0,
        None,
        "warm",
        "Refloat faster: days rather than weeks (the case-file band is ~18-22 C).",
        "Keep subsurface search on snag cells, and add surface/shoreline emphasis after the first few days.",
    ),
]


class EnvelopeError(ValueError):
    pass


# ---------------------------------------------------------------------------
# Decay
# ---------------------------------------------------------------------------


def decay_cdf(x: float, kind: str, median_m: float) -> float:
    """CDF of the near-field decay at distance ``x`` metres (x >= 0)."""
    if median_m <= 0:
        raise EnvelopeError("median distance must be > 0")
    x = max(0.0, x)
    if kind == "exponential":
        lam = math.log(2.0) / median_m
        return 1.0 - math.exp(-lam * x)
    if kind == "half_normal":
        # median of a half-normal is sigma * sqrt(2) * erfinv(0.5) = 0.67449 sigma
        sigma = median_m / 0.6744897501960817
        return math.erf(x / (sigma * math.sqrt(2.0)))
    raise EnvelopeError(f"unknown decay {kind!r}; use exponential or half_normal")


def decay_pdf(x: float, kind: str, median_m: float) -> float:
    if kind == "exponential":
        lam = math.log(2.0) / median_m
        return lam * math.exp(-lam * x)
    sigma = median_m / 0.6744897501960817
    return math.sqrt(2.0 / math.pi) / sigma * math.exp(-0.5 * (x / sigma) ** 2)


def median_from_time(
    elapsed_hours,
    model: str = "sqrt_time",
    ref_median_m: float = DEFAULT_MEDIAN_M,
    ref_hours: float = DEFAULT_REF_HOURS,
    exponent: float = DEFAULT_TIME_EXPONENT,
    mean_velocity_mps=None,
    transport_fraction=None,
):
    """Median travel distance (m) after ``elapsed_hours`` (SYSTEM_REVIEW C3).

    ``sqrt_time``: ``ref_median_m x (t / ref_hours) ** exponent``.
    ``velocity``: ``transport_fraction x mean_velocity_mps x t``; both inputs
    are required (no default fraction). Returns ``(median_m, detail)``.
    """
    if elapsed_hours is None:
        raise EnvelopeError("elapsed hours are needed to scale the median (or state --median-mi for the case)")
    t = float(elapsed_hours)
    if not t > 0 or math.isinf(t):
        raise EnvelopeError(f"elapsed hours must be > 0, got {elapsed_hours}")
    if model == "sqrt_time":
        if not ref_median_m > 0 or not ref_hours > 0 or not exponent > 0:
            raise EnvelopeError("ref median, ref hours and time exponent must be > 0")
        m = ref_median_m * (t / ref_hours) ** exponent
        return m, {
            "model": "sqrt_time",
            "formula": "median = ref_median_m * (elapsed_hours / ref_hours) ** exponent",
            "elapsed_hours": t,
            "ref_median_m": ref_median_m,
            "ref_hours": ref_hours,
            "exponent": exponent,
            "assumption": "Anchor (0.5 mi at 24 h by default) and square-root growth are assumptions, not fitted.",
        }
    if model == "velocity":
        if mean_velocity_mps is None:
            raise EnvelopeError(
                "time model 'velocity' needs --mean-velocity-mps, or --discharge-cfs with --xsec-ft2 measured at "
                "this reach"
            )
        if transport_fraction is None:
            raise EnvelopeError("time model 'velocity' needs --transport-fraction (no default: state it)")
        if not mean_velocity_mps > 0:
            raise EnvelopeError("mean velocity must be > 0")
        if not 0 < transport_fraction <= 1:
            raise EnvelopeError("transport fraction must be in (0, 1]")
        m = transport_fraction * mean_velocity_mps * t * 3600.0
        return m, {
            "model": "velocity",
            "formula": "median = transport_fraction * mean_velocity_mps * elapsed_hours * 3600",
            "elapsed_hours": t,
            "mean_velocity_mps": mean_velocity_mps,
            "transport_fraction": transport_fraction,
            "assumption": "The transport fraction is user-stated; it is not measured by this tool.",
        }
    raise EnvelopeError(f"unknown time model {model!r}; use {' or '.join(TIME_MODELS)}")


# ---------------------------------------------------------------------------
# Inputs
# ---------------------------------------------------------------------------


@dataclass
class Feature:
    type: str
    distance_m: float
    multiplier: float
    name: str
    multiplier_source: str


def make_feature(ftype: str, distance_m: float, multiplier=None, name=None, overrides=None) -> Feature:
    t = TYPE_ALIASES.get(ftype.strip().lower(), ftype.strip().lower())
    table = dict(DEFAULT_MULTIPLIERS)
    table.update(overrides or {})
    if t not in table:
        raise EnvelopeError(f"unknown feature type {ftype!r}; known: {', '.join(sorted(table))}")
    if distance_m < 0:
        raise EnvelopeError(f"feature {name or t}: distance must be >= 0 (downstream of LKP)")
    if multiplier is None:
        m, src = table[t], ("override" if t in (overrides or {}) else "default assumption")
    else:
        m, src = float(multiplier), "per-feature input"
    if m <= 0:
        raise EnvelopeError(f"feature {name or t}: multiplier must be > 0")
    return Feature(t, float(distance_m), float(m), name or f"{t}@{distance_m:.0f}m", src)


def _range_hits(start, end, lo, hi) -> bool:
    """True if cell [start, end) midpoint lies in [lo, hi]."""
    mid = 0.5 * (start + end)
    return lo <= mid <= hi


# ---------------------------------------------------------------------------
# Envelope
# ---------------------------------------------------------------------------


def build_envelope(
    reach_m: float = DEFAULT_REACH_M,
    cell_m: float = DEFAULT_CELL_M,
    decay: str = "exponential",
    median_m: float = DEFAULT_MEDIAN_M,
    features=(),
    accessibility=(),
    cleared=(),
    cleared_pod: float = DEFAULT_CLEARED_POD,
) -> dict:
    """Return ``{"cells": [...], "beyond_reach": {...}, "prior_mass_beyond_reach": float, "warnings": [...]}``.

    ``features``: iterable of ``Feature``. ``accessibility``: iterable of
    ``(start_m, end_m, factor)``. ``cleared``: iterable of ``(start_m, end_m)``
    or ``(start_m, end_m, pod)``; a pair uses ``cleared_pod``.
    A range applies to cells whose midpoint lies inside it.
    """
    if reach_m <= 0 or cell_m <= 0:
        raise EnvelopeError("reach and cell size must be > 0")
    if cell_m > reach_m:
        raise EnvelopeError("cell size larger than the reach")
    warnings = []
    n = int(math.ceil(reach_m / cell_m - 1e-9))
    cells = []
    for i in range(n):
        a, b = i * cell_m, min((i + 1) * cell_m, reach_m)
        cells.append(
            {
                "cell": i,
                "start_m": a,
                "end_m": b,
                "mid_m": 0.5 * (a + b),
                "base_decay": decay_cdf(b, decay, median_m) - decay_cdf(a, decay, median_m),
                "snag_multiplier": 1.0,
                "features": [],
                "accessibility": 1.0,
                "cleared": False,
                "pod": 0.0,
            }
        )
    for f in features:
        if f.distance_m >= reach_m:
            warnings.append(f"feature {f.name} at {f.distance_m:.0f} m is beyond the modelled reach; ignored")
            continue
        c = cells[min(int(f.distance_m // cell_m), n - 1)]
        c["features"].append(f.name)
        c["snag_multiplier"] = max(c["snag_multiplier"], f.multiplier)
    for lo, hi, fac in accessibility:
        if not 0 <= fac <= 1:
            raise EnvelopeError(f"accessibility factor must be in [0, 1], got {fac}")
        for c in cells:
            if _range_hits(c["start_m"], c["end_m"], lo, hi):
                c["accessibility"] = fac
    # for lo, hi in cleared:  # SYSTEM_REVIEW C3: a cleared range now carries a POD
    for rng in cleared:
        if len(rng) == 2:
            (lo, hi), pod = rng, cleared_pod
        elif len(rng) == 3:
            lo, hi, pod = rng
        else:
            raise EnvelopeError(f"cleared range {rng!r} must be (start_m, end_m) or (start_m, end_m, pod)")
        if pod is None or not 0.0 <= float(pod) <= 1.0:
            raise EnvelopeError(f"cleared POD must be in [0, 1], got {pod}")
        hit = False
        for c in cells:
            if _range_hits(c["start_m"], c["end_m"], lo, hi):
                c["cleared"] = hit = True
                # Two passes over the same cell combine as independent passes: 1 - (1-a)(1-b).
                c["pod"] = search_theory.cumulative_pod([c["pod"], float(pod)])
        if not hit:
            warnings.append(f"cleared range {lo}-{hi} m matched no cell midpoint")

    # SYSTEM_REVIEW C3: cleared cells were set to 0 (a search treated as certain) and mass beyond the reach was
    # renormalised in, roughly doubling in-reach numbers. Lesson: a search lowers probability by its POD, and
    # mass the model cannot place must stay visible as its own bucket.
    # weights = [0.0 if c["cleared"] else c["base_decay"] * c["snag_multiplier"] for c in cells]
    # tot = sum(weights)
    # if tot <= 0:
    #     raise EnvelopeError("every cell is cleared or zero: extend the reach downstream")
    # cum = 0.0
    # for c, w in zip(cells, weights):
    #     c["probability"] = w / tot
    #     cum += c["probability"]
    #     c["cumulative"] = cum
    # pri = [c["probability"] * c["accessibility"] for c in cells]
    beyond_prior = 1.0 - decay_cdf(reach_m, decay, median_m)
    weights = [c["base_decay"] * c["snag_multiplier"] for c in cells]
    tot = sum(weights)
    if tot <= 0:
        raise EnvelopeError("no prior mass inside the reach: the median is far beyond it; extend the reach")
    # Snag multipliers move mass within the reach; they do not change how much lies beyond it.
    for c, w in zip(cells, weights):
        c["prior_mass"] = (1.0 - beyond_prior) * w / tot
    segs = [{"name": f"cell{c['cell']}", "poa": c["prior_mass"]} for c in cells]
    segs.append({"name": "ROW", "poa": beyond_prior})  # beyond the reach: never searched here
    pods = {f"cell{c['cell']}": c["pod"] for c in cells if c["cleared"]}
    try:
        posterior, pos_total = search_theory.bayes_update(segs, pods)
    except ValueError as exc:
        raise EnvelopeError(f"POD update failed: {exc}; extend the reach downstream or lower a POD") from None
    for c, s_ in zip(cells, posterior):
        c["posterior_mass"] = s_["poa"]
    beyond_post = posterior[-1]["poa"]
    in_reach = sum(c["posterior_mass"] for c in cells)
    cum = 0.0
    for c in cells:
        c["prior_share_within_reach"] = c["posterior_mass"] / in_reach if in_reach > 0 else 0.0
        # DEPRECATED alias kept for dossier.py (reads top_cells[].probability); see the module docstring.
        c["probability"] = c["prior_share_within_reach"]
        cum += c["posterior_mass"]
        c["cumulative"] = cum
    if in_reach <= 0:
        warnings.append("every in-reach cell was searched with POD 1: all remaining mass is beyond the reach")
    if beyond_post > 0.25:
        warnings.append(
            f"{beyond_post:.2f} of the mass lies beyond the {reach_m:.0f} m reach (median {median_m:.0f} m): "
            "extend the reach downstream"
        )
    pri = [c["posterior_mass"] * c["accessibility"] for c in cells]
    ptot = sum(pri)
    if ptot <= 0:
        warnings.append("all remaining cells have accessibility 0; search_priority is 0 everywhere")
    for c, p in zip(cells, pri):
        c["search_priority"] = p / ptot if ptot > 0 else 0.0
    order = sorted((c for c in cells if c["search_priority"] > 0), key=lambda c: (-c["search_priority"], c["start_m"]))
    for c in cells:
        c["rank"] = None
    for r, c in enumerate(order, 1):
        c["rank"] = r
    # return {
    #     "cells": cells,
    #     "prior_mass_beyond_reach": 1.0 - decay_cdf(reach_m, decay, median_m),
    #     "warnings": warnings,
    # }  # SYSTEM_REVIEW C3: keep a beyond-reach bucket and the POD update's results
    return {
        "cells": cells,
        "beyond_reach": {
            "cell": BEYOND_REACH,
            "start_m": reach_m,
            "end_m": None,
            "prior_mass": beyond_prior,
            "pod": 0.0,
            "posterior_mass": beyond_post,
            "searched": False,
            "note": "Mass past the modelled reach. Not renormalised into the cells; extend the reach to resolve it.",
        },
        "prior_mass_beyond_reach": beyond_prior,
        "posterior_mass_beyond_reach": beyond_post,
        "probability_of_detection_so_far": pos_total,
        "renormalised_within_reach": False,
        "warnings": warnings,
    }


def mass_within(cells: list, distance_m: float) -> float:
    """Probability mass from the LKP to ``distance_m``, linear within a cell.

    Unconditional (posterior_mass): mass beyond the reach is not in any cell, so
    at the reach end this is 1 - posterior_mass_beyond_reach (SYSTEM_REVIEW C3)."""
    s = 0.0
    for c in cells:
        if c["end_m"] <= distance_m:
            # s += c["probability"]  # SYSTEM_REVIEW C3: within-reach share overstated the mass
            s += c["posterior_mass"]
        elif c["start_m"] < distance_m:
            # s += c["probability"] * (distance_m - c["start_m"]) / (c["end_m"] - c["start_m"])
            s += c["posterior_mass"] * (distance_m - c["start_m"]) / (c["end_m"] - c["start_m"])
    return min(1.0, s)


# ---------------------------------------------------------------------------
# Naive estimate (shown, rejected) and refloat note
# ---------------------------------------------------------------------------


def naive_estimate(discharge_cfs, elapsed_hours, xsec_ft2=NAIVE_XSEC_FT2) -> dict:
    out = {
        "status": "REJECTED",
        "used_for_envelope": False,
        "label": "rejected naive estimate (velocity x time)",
        "reasons": NAIVE_REJECTION_REASONS,
        "inputs": {"discharge_cfs": discharge_cfs, "elapsed_hours": elapsed_hours, "cross_section_ft2": list(xsec_ft2)},
    }
    if discharge_cfs is None or elapsed_hours is None:
        out["distance_mi_low"] = out["distance_mi_high"] = None
        out["note"] = "not computed: needs discharge and elapsed hours"
        return out
    lo_a, hi_a = sorted(xsec_ft2)
    d = [discharge_cfs / a * elapsed_hours * 3600.0 / FT_PER_MI for a in (hi_a, lo_a)]
    out.update(
        velocity_ft_s_low=discharge_cfs / hi_a,
        velocity_ft_s_high=discharge_cfs / lo_a,
        distance_mi_low=d[0],
        distance_mi_high=d[1],
        note="Cross-section bracket is illustrative. Do not search on this number.",
    )
    return out


def refloat_note(water_temp_c) -> dict:
    base = {"label": "ROUGH qualitative bracket from water temperature, not a clock", "water_temp_c": water_temp_c}
    if water_temp_c is None:
        return dict(base, band="unknown", timing="No water temperature given.", emphasis="Get the temperature first.")
    for lo, hi, band, timing, emph in REFLOAT_BANDS:
        if (lo is None or water_temp_c >= lo) and (hi is None or water_temp_c < hi):
            return dict(base, band=band, timing=timing, emphasis=emph, band_edges_are_assumptions=True)
    raise AssertionError("refloat bands do not cover the temperature")


# ---------------------------------------------------------------------------
# Centreline
# ---------------------------------------------------------------------------


def haversine_m(lon1, lat1, lon2, lat2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_R_M * math.asin(min(1.0, math.sqrt(h)))


class Centreline:
    """Chainage along a [lon, lat] polyline. Chainage 0 is the first vertex."""

    def __init__(self, coords):
        pts = [(float(c[0]), float(c[1])) for c in coords]
        if len(pts) < 2:
            raise EnvelopeError("centreline needs at least two vertices")
        for lon, lat in pts:
            if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                raise EnvelopeError(f"centreline vertex out of range (expects [lon, lat]): {lon}, {lat}")
        self.pts = pts
        self.chain = [0.0]
        for (a, b), (c, d) in zip(pts, pts[1:]):
            self.chain.append(self.chain[-1] + haversine_m(a, b, c, d))
        self.length_m = self.chain[-1]

    @classmethod
    def from_geojson(cls, doc):
        if doc.get("type") == "FeatureCollection":
            for f in doc.get("features", []):
                if (f.get("geometry") or {}).get("type") == "LineString":
                    return cls(f["geometry"]["coordinates"])
            raise EnvelopeError("FeatureCollection has no LineString")
        if doc.get("type") == "Feature":
            doc = doc.get("geometry") or {}
        if doc.get("type") != "LineString":
            raise EnvelopeError(f"centreline must be a LineString, got {doc.get('type')!r}")
        return cls(doc["coordinates"])

    def point_at(self, ch: float):
        """(lon, lat) at chainage ``ch``; None if beyond the line."""
        if ch < 0 or ch > self.length_m + 1e-6:
            return None
        for i in range(1, len(self.chain)):
            if ch <= self.chain[i] or i == len(self.chain) - 1:
                seg = self.chain[i] - self.chain[i - 1]
                t = 0.0 if seg == 0 else (ch - self.chain[i - 1]) / seg
                (x0, y0), (x1, y1) = self.pts[i - 1], self.pts[i]
                return (x0 + t * (x1 - x0), y0 + t * (y1 - y0))
        return None

    def slice(self, a: float, b: float):
        b = min(b, self.length_m)
        if a >= b:
            return None
        out = [self.point_at(a)]
        out += [p for p, c in zip(self.pts, self.chain) if a < c < b]
        out.append(self.point_at(b))
        return out


def attach_geometry(env: dict, line: Centreline, features=(), lkp=None) -> None:
    cells = env["cells"]
    for c in cells:
        mid = line.point_at(c["mid_m"])
        c["lon"], c["lat"] = mid if mid else (None, None)
        c["geometry"] = line.slice(c["start_m"], c["end_m"])
    if cells[-1]["end_m"] > line.length_m + 1:
        env["warnings"].append(
            f"centreline is {line.length_m:.0f} m long, shorter than the {cells[-1]['end_m']:.0f} m reach; "
            "cells beyond it have no coordinates"
        )
    env["feature_points"] = []
    for f in features:
        p = line.point_at(f.distance_m)
        env["feature_points"].append({"name": f.name, "type": f.type, "distance_m": f.distance_m, "lonlat": p})
    if lkp is not None:
        d = haversine_m(lkp[1], lkp[0], line.pts[0][0], line.pts[0][1])
        env["lkp_to_line_start_m"] = d
        if d > 250:
            env["warnings"].append(f"centreline starts {d:.0f} m from the LKP; chainage 0 should be at the LKP")


def to_geojson(env: dict, lkp=None) -> dict:
    feats = []
    for c in env["cells"]:
        if not c.get("geometry"):
            continue
        # props = {k: c[k] for k in ("cell", "start_m", "end_m", "probability", "cumulative",
        #                            "search_priority", "rank")}
        props = {  # SYSTEM_REVIEW C3: honest columns; "probability" kept as a deprecated alias
            k: c[k]
            for k in ("cell", "start_m", "end_m", "prior_mass", "pod", "posterior_mass", "prior_share_within_reach",
                      "probability", "cumulative", "search_priority", "rank")
        }
        props["features"] = ", ".join(c["features"])
        feats.append(
            {"type": "Feature", "geometry": {"type": "LineString", "coordinates": c["geometry"]}, "properties": props}
        )
    for f in env.get("feature_points", []):
        if f["lonlat"]:
            feats.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": list(f["lonlat"])},
                    "properties": {
                        "kind": "snag_feature",
                        "name": f["name"],
                        "type": f["type"],
                        "distance_m": f["distance_m"],
                    },
                }
            )
    if lkp is not None:
        feats.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lkp[1], lkp[0]]},
                "properties": {"kind": "LKP"},
            }
        )
    return {"type": "FeatureCollection", "features": feats}


def to_kml(env: dict, lkp=None, title="Drift envelope") -> str:
    parts = ['<?xml version="1.0" encoding="UTF-8"?>', '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>']
    parts.append(f"<name>{escape(title)}</name>")
    for c in sorted((c for c in env["cells"] if c.get("geometry")), key=lambda c: (c["rank"] is None, c["rank"] or 0)):
        coords = " ".join(f"{x:.6f},{y:.6f},0" for x, y in c["geometry"])
        # name = f"rank {c['rank']} p={c['probability']:.3f}" if c["rank"] else f"cleared/0 cell {c['cell']}"
        name = (  # SYSTEM_REVIEW C3: show the unconditional posterior mass
            f"rank {c['rank']} p={c['posterior_mass']:.3f}" if c["rank"] else f"zero priority cell {c['cell']}"
        )
        desc = f"{c['start_m']:.0f}-{c['end_m']:.0f} m; features: {', '.join(c['features']) or 'none'}"
        parts.append(
            f"<Placemark><name>{escape(name)}</name><description>{escape(desc)}</description>"
            f"<LineString><coordinates>{coords}</coordinates></LineString></Placemark>"
        )
    for f in env.get("feature_points", []):
        if f["lonlat"]:
            parts.append(
                f"<Placemark><name>{escape(f['name'])}</name><description>{escape(f['type'])}</description>"
                f"<Point><coordinates>{f['lonlat'][0]:.6f},{f['lonlat'][1]:.6f},0</coordinates></Point></Placemark>"
            )
    if lkp is not None:
        parts.append(
            "<Placemark><name>LKP</name><Point>"
            f"<coordinates>{lkp[1]:.6f},{lkp[0]:.6f},0</coordinates></Point></Placemark>"
        )
    parts.append("</Document></kml>")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

CSV_FIELDS = [
    "cell",
    "start_m",
    "end_m",
    "start_mi",
    "end_mi",
    "base_decay",
    "snag_multiplier",
    "features",
    "accessibility",
    "cleared",
    # SYSTEM_REVIEW C3: new columns; "probability" is a DEPRECATED alias of prior_share_within_reach.
    "pod",
    "prior_mass",
    "posterior_mass",
    "prior_share_within_reach",
    "probability",
    "cumulative",
    "search_priority",
    "rank",
    "lat",
    "lon",
]


# def write_csv(cells, path):  # SYSTEM_REVIEW C3: a beyond-reach row follows the cells
def write_csv(cells, path, beyond=None):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        w.writeheader()
        for c in cells:
            row = {k: c.get(k) for k in CSV_FIELDS}
            row["start_mi"] = round(c["start_m"] / M_PER_MI, 4)
            row["end_mi"] = round(c["end_m"] / M_PER_MI, 4)
            row["features"] = "; ".join(c["features"])
            # for k in ("base_decay", "probability", "cumulative", "search_priority"):
            for k in ("base_decay", "pod", "prior_mass", "posterior_mass", "prior_share_within_reach", "probability",
                      "cumulative", "search_priority"):
                row[k] = f"{c[k]:.6f}"
            w.writerow(row)
        if beyond is not None:
            w.writerow(
                {
                    "cell": BEYOND_REACH,
                    "start_m": beyond["start_m"],
                    "start_mi": round(beyond["start_m"] / M_PER_MI, 4),
                    "features": "mass past the modelled reach (not searched, not renormalised)",
                    "pod": f"{beyond['pod']:.6f}",
                    "prior_mass": f"{beyond['prior_mass']:.6f}",
                    "posterior_mass": f"{beyond['posterior_mass']:.6f}",
                    "cumulative": f"{(cells[-1]['cumulative'] if cells else 0.0) + beyond['posterior_mass']:.6f}",
                }
            )


def _parse_feature(s: str, overrides) -> Feature:
    parts = s.split(":")
    if len(parts) < 2:
        raise EnvelopeError(f"--feature wants type:distance_m[:multiplier][:name], got {s!r}")
    mult, name = None, None
    for extra in parts[2:]:
        try:
            mult = float(extra)
        except ValueError:
            name = extra
    return make_feature(parts[0], float(parts[1]), mult, name, overrides)


def _parse_cleared(items):
    """``start:end`` or ``start:end:pod`` (SYSTEM_REVIEW C3)."""
    out = []
    for s in items or []:
        p = [float(x) for x in s.split(":")]
        if len(p) not in (2, 3):
            raise EnvelopeError(f"--cleared {s!r} wants start_m:end_m[:pod]")
        out.append(tuple(p))
    return out


def _parse_ranges(items, n):
    out = []
    for s in items or []:
        p = [float(x) for x in s.split(":")]
        if len(p) != n:
            raise EnvelopeError(f"range {s!r} needs {n} colon-separated numbers")
        out.append(tuple(p))
    return out


def _load_case(path, case_id):
    with open(path, encoding="utf-8") as f:
        doc = json.load(f)
    cases = doc.get("cases", [doc]) if isinstance(doc, dict) else doc
    for c in cases:
        if case_id is None or c.get("case_id") == case_id:
            return c
    raise EnvelopeError(f"no case {case_id!r} in {path}")


def run(a) -> dict:
    overrides = {}
    for s in a.multiplier or []:
        k, v = s.split("=")
        overrides[TYPE_ALIASES.get(k, k)] = float(v)
    lat, lon, q, temp, case_info = a.lat, a.lon, a.discharge_cfs, a.water_temp_c, None
    if a.case:
        case = _load_case(a.case, a.case_id)
        inc, an = case.get("incident", {}), case.get("analysis", {})
        lat = lat if lat is not None else inc.get("lat")
        lon = lon if lon is not None else inc.get("lon")
        q = q if q is not None else an.get("discharge_cfs")
        temp = temp if temp is not None else an.get("water_temp_c")
        case_info = {
            "case_id": case.get("case_id"),
            "governing_gauge": an.get("governing_gauge"),
            "snag_zones_named_in_case_unlocated": an.get("snag_zones_ranked", []),
        }
    features = [_parse_feature(s, overrides) for s in a.feature or []]
    if a.features_json:
        with open(a.features_json, encoding="utf-8") as f:
            for d in json.load(f):
                features.append(
                    make_feature(d["type"], float(d["distance_m"]), d.get("multiplier"), d.get("name"), overrides)
                )
    reach_m = a.reach_m if a.reach_m else a.reach_mi * M_PER_MI
    # SYSTEM_REVIEW C3: a fixed 0.5 mi median made the output byte-identical at 1 h and 240 h, so --elapsed-hours
    # was decoration. Lesson: an input that changes nothing should fail a test; the median now follows time
    # unless the user states one for the case.
    if a.median_mi is not None:
        if not a.median_mi > 0:
            raise EnvelopeError("--median-mi must be > 0")
        median_m = a.median_mi * M_PER_MI
        median_detail = {"model": "user_stated", "median_mi": a.median_mi, "elapsed_hours": a.elapsed_hours,
                         "note": "Median stated by the user for this case; elapsed time not used to scale it."}
    else:
        if a.elapsed_hours is None:
            raise EnvelopeError(
                "refusing to run: give --elapsed-hours (the median then follows the time model) or state the "
                "case's median with --median-mi. A fixed default median ignored elapsed time (SYSTEM_REVIEW C3)."
            )
        v = a.mean_velocity_mps
        v_source = "user-stated mean velocity" if v is not None else None
        if v is None and a.time_model == "velocity" and q is not None and a.xsec_ft2 is not None:
            if not a.xsec_ft2 > 0:
                raise EnvelopeError("--xsec-ft2 must be > 0")
            v = q / a.xsec_ft2 * FT_TO_M
            v_source = f"discharge {q} cfs / measured cross-section {a.xsec_ft2} ft2"
        median_m, median_detail = median_from_time(
            a.elapsed_hours,
            a.time_model,
            ref_median_m=a.ref_median_mi * M_PER_MI,
            ref_hours=a.ref_hours,
            exponent=a.time_exponent,
            mean_velocity_mps=v,
            transport_fraction=a.transport_fraction,
        )
        if v_source and a.time_model == "velocity":
            median_detail["velocity_source"] = v_source
    if not 0.0 <= a.cleared_pod <= 1.0:
        raise EnvelopeError("--cleared-pod must be in [0, 1]")
    cleared = _parse_cleared(a.cleared)
    env = build_envelope(
        reach_m=reach_m,
        cell_m=a.cell_m,
        decay=a.decay,
        # median_m=a.median_mi * M_PER_MI,  # SYSTEM_REVIEW C3: fixed median ignored elapsed time
        median_m=median_m,
        features=features,
        accessibility=_parse_ranges(a.access, 3),
        # cleared=_parse_ranges(a.cleared, 2),  # SYSTEM_REVIEW C3: ranges may carry a POD
        cleared=cleared,
        cleared_pod=a.cleared_pod,
    )
    lkp = (lat, lon) if lat is not None and lon is not None else None
    line = None
    if a.centreline:
        with open(a.centreline, encoding="utf-8") as f:
            line = Centreline.from_geojson(json.load(f))
        attach_geometry(env, line, features, lkp)
    cells = env["cells"]
    top = sorted((c for c in cells if c["rank"]), key=lambda c: c["rank"])[: a.top]
    marks = [("0.5 mi", 0.5 * M_PER_MI), ("1 mi", M_PER_MI), ("3 mi", 3 * M_PER_MI)]
    summary = {
        "case": case_info,
        "lkp": {"lat": lat, "lon": lon, "chainage_m": 0.0},
        "geometry": (
            {"centreline": a.centreline, "length_m": line.length_m}
            if line
            else {"centreline": None, "note": "No centreline given: cells are chainage-only (no lat/lon)."}
        ),
        # SYSTEM_REVIEW C3: median from elapsed time; beyond-reach bucket kept, not renormalised in.
        # "model": {
        #     "decay": a.decay,
        #     "median_m": a.median_mi * M_PER_MI,
        #     "reach_m": reach_m,
        #     "cell_m": a.cell_m,
        #     "prior_mass_beyond_reach": env["prior_mass_beyond_reach"],
        #     "renormalised_within_reach": True,
        # },
        "model": {
            "decay": a.decay,
            "median_m": median_m,
            "median_from": median_detail,
            "reach_m": reach_m,
            "cell_m": a.cell_m,
            "prior_mass_beyond_reach": env["prior_mass_beyond_reach"],
            "posterior_mass_beyond_reach": env["posterior_mass_beyond_reach"],
            "beyond_reach": env["beyond_reach"],
            "renormalised_within_reach": False,
            "cleared_pod_default": a.cleared_pod,
            "probability_of_detection_so_far": env["probability_of_detection_so_far"],
            "columns": {
                "prior_mass": "before any search; cells + beyond_reach sum to 1",
                "posterior_mass": "after the POD update; cells + beyond_reach sum to 1",
                "prior_share_within_reach": "posterior_mass / in-reach total: conditional on being in the reach",
                "probability": "DEPRECATED alias of prior_share_within_reach, kept for dossier.py",
                "cumulative": "cumulative posterior_mass from the LKP (unconditional)",
            },
        },
        "mass_within": {k: (mass_within(cells, d) if d <= reach_m + 1e-6 else None) for k, d in marks},
        "top_cells": [
            {
                k: c.get(k)
                for k in (
                    "rank",
                    "cell",
                    "start_m",
                    "end_m",
                    "prior_mass",
                    "pod",
                    "posterior_mass",
                    "prior_share_within_reach",
                    "probability",  # DEPRECATED alias (SYSTEM_REVIEW C3), read by dossier.py
                    "cumulative",
                    "search_priority",
                    "features",
                )
            }
            for c in top
        ],
        "features": [f.__dict__ for f in features],
        "accessibility": _parse_ranges(a.access, 3),
        # "cleared": _parse_ranges(a.cleared, 2),  # SYSTEM_REVIEW C3
        "cleared": [
            {"start_m": r[0], "end_m": r[1], "pod": r[2] if len(r) == 3 else a.cleared_pod,
             "pod_source": "per-range input" if len(r) == 3 else "--cleared-pod (default 0.8 is an assumption)"}
            for r in cleared
        ],
        "refloat": refloat_note(temp),
        "rejected_naive_estimate": naive_estimate(q, a.elapsed_hours, tuple(a.naive_xsec_ft2)),
        # "assumptions": [
        #     f"Near-field decay {a.decay} with median {a.median_mi} mi (default 0.5 mi): an assumption, not measured.",
        #     "Snag multipliers: defaults are assumptions expressing relative hang-up likelihood, not measured rates.",
        #     "No snag feature locations unless given: map them from current imagery/NHD.",
        #     "Refloat bands and their temperature edges are rough assumptions.",
        #     "Cleared cells are treated as searched with detection probability 1.",
        # ],  # SYSTEM_REVIEW C3: median from time, POD not 1, beyond-reach kept
        "assumptions": [
            f"Near-field decay {a.decay} with median {median_m / M_PER_MI:.3f} mi from "
            f"{median_detail['model']}: an assumption, not measured.",
            "Snag multipliers: defaults are assumptions expressing relative hang-up likelihood, not measured rates.",
            "Snag multipliers move mass within the reach; they do not change the mass beyond it.",
            "No snag feature locations unless given: map them from current imagery/NHD.",
            "Refloat bands and their temperature edges are rough assumptions.",
            f"Cleared cells use POD {a.cleared_pod} unless a range gives its own (the default 0.8 is an assumption); "
            "updated with P' = P(1 - POD) / (1 - sum P*POD), beyond_reach included.",
            "Mass beyond the reach is kept as its own bucket, not renormalised into the cells.",
        ],
        "measured_inputs": {"lkp_lat_lon": lkp, "discharge_cfs": q, "water_temp_c": temp},
        "warnings": env["warnings"],
    }
    os.makedirs(a.out_dir, exist_ok=True)
    # write_csv(cells, os.path.join(a.out_dir, "envelope.csv"))  # SYSTEM_REVIEW C3: beyond-reach row
    write_csv(cells, os.path.join(a.out_dir, "envelope.csv"), env["beyond_reach"])
    if line:
        with open(os.path.join(a.out_dir, "envelope.geojson"), "w", encoding="utf-8") as f:
            json.dump(to_geojson(env, lkp), f)
        with open(os.path.join(a.out_dir, "envelope.kml"), "w", encoding="utf-8") as f:
            f.write(to_kml(env, lkp))
    with open(os.path.join(a.out_dir, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    return summary


def build_parser():
    ap = argparse.ArgumentParser(description="Probability-weighted drift envelope (not a single distance)")
    ap.add_argument("--case", help="case JSON (sar_case_records.json shape)")
    ap.add_argument("--case-id")
    ap.add_argument("--lat", type=float)
    ap.add_argument("--lon", type=float)
    ap.add_argument(
        "--discharge-cfs",
        type=float,
        # help="governing-gauge discharge (only used for the rejected naive figure)"  # SYSTEM_REVIEW C3
        help="governing-gauge discharge: the rejected naive figure, and the 'velocity' time model with --xsec-ft2",
    )
    ap.add_argument("--water-temp-c", type=float)
    ap.add_argument("--reach-mi", type=float, default=3.0)
    ap.add_argument("--reach-m", type=float)
    ap.add_argument("--cell-m", type=float, default=DEFAULT_CELL_M)
    ap.add_argument("--decay", choices=["exponential", "half_normal"], default="exponential")
    # ap.add_argument("--median-mi", type=float, default=0.5, help="median of the near-field decay (assumption)")
    ap.add_argument(  # SYSTEM_REVIEW C3: no fixed default; it ignored elapsed time
        "--median-mi", type=float, help="state the case's median travel distance; overrides the time model"
    )
    ap.add_argument("--time-model", choices=TIME_MODELS, default="sqrt_time", help="how the median grows with time")
    ap.add_argument("--ref-median-mi", type=float, default=DEFAULT_MEDIAN_M / M_PER_MI,
                    help="sqrt_time: median at --ref-hours (assumption, default 0.5)")
    ap.add_argument("--ref-hours", type=float, default=DEFAULT_REF_HOURS, help="sqrt_time: reference time (24)")
    ap.add_argument("--time-exponent", type=float, default=DEFAULT_TIME_EXPONENT,
                    help="sqrt_time: growth exponent (0.5)")
    ap.add_argument("--mean-velocity-mps", type=float, help="velocity model: mean channel velocity at this reach")
    ap.add_argument("--xsec-ft2", type=float, help="velocity model: cross-section measured at this reach (ft2)")
    ap.add_argument("--transport-fraction", type=float,
                    help="velocity model: share of mean velocity the body achieves (required; no default)")
    ap.add_argument("--feature", action="append", help="type:distance_m[:multiplier][:name]; repeatable")
    ap.add_argument("--features-json", help="JSON list of {type, distance_m, multiplier?, name?}")
    ap.add_argument("--multiplier", action="append", help="override a default, e.g. eddy=1.5")
    ap.add_argument("--access", action="append", help="start_m:end_m:factor (0-1); repeatable")
    # ap.add_argument("--cleared", action="append", help="start_m:end_m; repeatable")
    # ap.add_argument("--elapsed-hours", type=float, help="for the rejected naive figure only")
    ap.add_argument("--cleared", action="append", help="start_m:end_m[:pod]; repeatable (SYSTEM_REVIEW C3)")
    ap.add_argument("--cleared-pod", type=float, default=DEFAULT_CLEARED_POD,
                    help="POD for a cleared range without its own (assumption, default 0.8)")
    ap.add_argument("--elapsed-hours", type=float,
                    help="hours since entry: scales the median (required unless --median-mi)")
    ap.add_argument("--naive-xsec-ft2", type=float, nargs=2, default=list(NAIVE_XSEC_FT2))
    ap.add_argument("--centreline", help="GeoJSON LineString, [lon, lat], first vertex at the LKP")
    ap.add_argument("--top", type=int, default=10)
    ap.add_argument("--out-dir", default=".")
    return ap


def main(argv=None) -> int:
    a = build_parser().parse_args(argv)
    try:
        s = run(a)
    except (EnvelopeError, OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    # print(f"envelope: {a.decay}, median {a.median_mi} mi, reach {s['model']['reach_m']:.0f} m, cell {a.cell_m:g} m")
    print(
        f"envelope: {a.decay}, median {s['model']['median_m'] / M_PER_MI:.3f} mi "
        f"({s['model']['median_from']['model']}), reach {s['model']['reach_m']:.0f} m, cell {a.cell_m:g} m"
    )
    if not s["geometry"]["centreline"]:
        print("geometry: " + s["geometry"]["note"])
    for k, v in s["mass_within"].items():
        print(f"  mass within {k}: {'n/a' if v is None else f'{v:.3f}'}")
    # print(f"  prior mass beyond reach (before renormalising): {s['model']['prior_mass_beyond_reach']:.3f}")
    # print("top cells (rank, metres, probability, features):")
    # SYSTEM_REVIEW C3: beyond-reach is kept, and cells show unconditional posterior mass
    print(
        f"  beyond reach (kept, not renormalised): prior {s['model']['prior_mass_beyond_reach']:.3f}, "
        f"after search {s['model']['posterior_mass_beyond_reach']:.3f}"
    )
    print("top cells (rank, metres, posterior mass, share within reach, features):")
    for c in s["top_cells"]:
        print(
            # f"  {c['rank']:>3}  {c['start_m']:>6.0f}-{c['end_m']:<6.0f} p={c['probability']:.4f}  "
            f"  {c['rank']:>3}  {c['start_m']:>6.0f}-{c['end_m']:<6.0f} p={c['posterior_mass']:.4f} "
            f"share={c['prior_share_within_reach']:.4f}  "
            + ", ".join(c["features"])
        )
    n = s["rejected_naive_estimate"]
    if n.get("distance_mi_low") is not None:
        print(
            f"REJECTED naive velocity x time: {n['distance_mi_low']:.0f}-{n['distance_mi_high']:.0f} mi "
            "(not used; see summary.json for why)"
        )
    r = s["refloat"]
    print(f"refloat ({r['label']}): band={r['band']}: {r['timing']} {r['emphasis']}")
    for w in s["warnings"]:
        print(f"warning: {w}")
    print(f"wrote {a.out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
