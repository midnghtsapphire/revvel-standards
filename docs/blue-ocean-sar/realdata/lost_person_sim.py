#!/usr/bin/env python3
"""Terrain-aware Monte Carlo probability map for a lost person (agent-based).

N simulated people (agents) leave the initial planning point (IPP) and move
over a real elevation model. Their final positions, smoothed with a kernel,
give a probability-of-area raster. The walking-time scale is fitted so that
the simulated straight-line distances match the lost-person-behaviour (LPB)
distance table for the subject category (lost_person_behavior.py,
lpb_mpb2003.json: Perkins, Roberts & Feeney, Missing Person Behaviour, 2003).

The approach follows agent-based lost-person models in SAR research:
Hashimoto, Heintzman, Koester & Abaid (2022), "An agent-based model reveals
lost person behavior based on data from wilderness search and rescue",
Proc. R. Soc. A 478:20210724 (strategies: random walking, route travelling,
direction travelling/sampling, staying put); Koester (2008), Lost Person
Behavior, dbS Productions (reorientation strategies, drainage following);
Syrotuck (1976) Analysis of Lost Person Behavior.

Model (every number below is a parameter; defaults are ASSUMPTIONS, recorded
in summary.json under ``assumptions``):

  Speed (Tobler 1993, "Three presentations on geographical analysis and
  modeling", NCGIA TR 93-1):
      v = 6 exp(-3.5 |tan(theta) + 0.05|) km/h
  theta is the slope along the direction of travel (uphill positive). The
  peak, 6 km/h, is at tan(theta) = -0.05, i.e. -2.86 degrees (gently
  downhill). Off roads/trails v is multiplied by ``off_path_factor`` (Tobler
  uses 0.6). tan(theta) is the directional derivative of a lightly smoothed
  DEM: dz/ds = dz/dE cos(h) + dz/dN sin(h).

  Movement: correlated random walk on a continuous position over the DEM
  grid. Each agent draws ONE behaviour from the mixture (weights are
  parameters):
      random_walk         heading diffuses: h += N(0, turn_sd^2 dt)
      route_following     follows the nearest road/trail/stream within
                          route_attract_m; otherwise random walk
      direction_sampling  out-and-back legs from the IPP on random bearings,
                          then commits to one bearing (direction travelling)
      downhill            steers down the smoothed DEM gradient
                          (drainage following); random walk on flats
      stay_put            never moves
  Steering toward a target bearing: h += (1 - exp(-dt/steer_tau)) wrap(target - h).

  Barriers: cells of the barrier mask, DEM nodata and the grid edge are
  impassable. A step is sampled every <= 0.4 cell along its length and is
  refused (agent turns away) if any sample is impassable, or if it changes
  cell diagonally between two impassable cells that touch at a corner.
  Samples are < 1 cell apart, so every move is between 8-neighbour cells and
  no agent crosses a barrier whose cells connect even diagonally.

  Note: agents keep walking in the simulation after their own budget runs
  out; only positions up to t_i are used.

  Time: agent i walks for
      t_i = min(k * E_i,  elapsed_h * (1 - r_i),  max_walk_hours)
  E_i ~ LogNormal(0, budget_sigma) is a relative walking budget (how long
  this person keeps moving before stopping for good), r_i ~ Beta with mean
  rest_fraction is the share of elapsed time spent resting/stopped.

  Calibration: k (hours) is fitted by bisection so that the simulated median
  straight-line distance from the IPP (long-time limit, no elapsed-time
  cap) equals the LPB 50% distance. The residual at the 25/50/75/95%
  quantiles (LPB values interpolated between the printed 10% rows by
  lost_person_behavior.rings) is reported. A category with no printed
  distance table is refused calibration; give --walk-scale-hours instead.

  Shape check (KS-style): the median is the only fitted number, so the
  other quantiles are tested too. D = max over p in 25/50/75/95 of
  |F_sim(q_table(p)) - p/100|, where F_sim is the empirical CDF of the
  simulated long-time distances. It is a Kolmogorov-Smirnov statistic
  evaluated only at the table's quantile points (so it can only be <= the
  full KS statistic). It passes when D <= --ks-tol. The default tolerance is
  1.36 / sqrt(n), the 5% KS critical value for the table's own sample size n
  (a difference smaller than the table's sampling noise is not evidence of a
  misfit); 0.10 when the table gives no n. A small table therefore gives a
  weak check, and the summary says so.

  User distance tables (--distance-table JSON) replace the 2003 UK table for
  calibration, e.g. the owner's licensed ISRID / Lost Person Behavior (Koester
  2008) figures. This repository ships no ISRID numbers (licensed data); the
  only bundled table, distance_table.example.json, is FICTIONAL and for tests.
  Format (every field except n/ecoregion/region is required)::

      {"schema": "distance_table/1", "fictional": false,
       "source": "citation", "licence": "who may use these numbers and how",
       "data_period": "incident years, e.g. 1990-2008", "region": "...",
       "entries": [{"category": "hiker", "terrain": "mountainous",
                    "ecoregion": "temperate", "n": 120,
                    "km": {"25": 1.1, "50": 2.0, "75": 3.6, "95": 7.9}}]}

  --category picks the entry (case-insensitive); --table-terrain picks among
  entries for the same category by terrain or ecoregion. The data age
  (2003 UK for the bundled table, data_period for a user table) is printed
  next to every table ring and in summary.json.

  Candid provenance note: the request for this option came from an
  AI-generated system review (SYSTEM_REVIEW.md, upgrade R4), which describes
  ISRID as "about 300,000 incidents". That figure was not checked here and
  should not be quoted from this code; use the count your licensed source
  states.

  Probability raster: counts of final positions per cell, Gaussian kernel
  (sigma = kernel_sigma_m) applied separately inside each 4-connected
  passable region (each region keeps its share of agents, so smoothing does
  not leak across a barrier), impassable cells 0, normalised to sum 1.
  Cumulative-mass contours: smallest set of highest-probability cells
  holding 50/75/95% of the mass. Segment POA: sum of cell probability whose
  centre lies in each polygon; ROW = 1 - sum(POA) (mass outside all
  polygons), written as a CSV that search_theory.py reads directly.

  Bayesian update after an unsuccessful search of polygons with POD:
      P'(cell) = P(cell) * prod_j (1 - POD_j [cell in polygon j]) / normaliser
  Cells searched with POD = 1 ("cleared") are exactly 0 afterwards.

Grid: dem_terrain.load_grid reprojects the DEM onto a square UTM grid
centred on the IPP (default 30 m cells). Distances are planar UTM metres.
A flat synthetic grid (synthetic_flat_terrain) exists for tests only; the
CLI always requires a DEM file.

CLI::

    python lost_person_sim.py simulate --lat 54.45 --lon -3.21 --category hikers --hours 12 \\
        --dem dtm.tif --out OUT [--trails trails.geojson] [--roads roads.geojson] \\
        [--streams streams.geojson] [--barriers lakes.geojson] [--segments segs.geojson]
    python lost_person_sim.py update --prior OUT/probability.tif --searched searched.geojson \\
        --out OUT2 [--segments segs.geojson]

searched.geojson: Polygon features with property ``pod`` in [0, 1] or
``cleared: true`` (POD 1). Vector inputs are GeoJSON in WGS84 lon/lat
(RFC 7946). Feature/barrier inputs may also be GeoTIFF masks (nonzero = on).

Exit codes: 0 done; 2 bad input (unknown category, missing DEM, bad
arguments, bad distance table, missing numpy/scipy/rasterio); 3 the category
has no distance table and no --walk-scale-hours was given (nothing written);
4 calibration did not reach the table median (outputs written and flagged);
5 the median converged but the KS-style shape check failed (outputs written
and flagged).

This is a planning prior for sizing and weighting a search, not a
prediction of where a particular person is.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import sys
from dataclasses import asdict, dataclass, field

import lost_person_behavior as lpb

try:
    import numpy as np
    import rasterio
    from rasterio import features as rio_features
    from rasterio.transform import from_origin
    from rasterio.warp import Resampling, reproject, transform_geom
    from rasterio.warp import transform as warp_transform
    from scipy import ndimage

    HAVE_DEPS = True
    RASTER_ERRORS = (rasterio.errors.RasterioError,)
except ImportError:  # the CLI argument checks still work; simulation needs the deps
    np = None
    HAVE_DEPS = False
    RASTER_ERRORS = ()

STRATEGIES = ("random_walk", "route_following", "direction_sampling", "downhill", "stay_put")
DEFAULT_WEIGHTS = {
    "random_walk": 0.35,
    "route_following": 0.25,
    "direction_sampling": 0.15,
    "downhill": 0.15,
    "stay_put": 0.10,
}
CALIBRATION_PERCENTILES = (25, 50, 75, 95)
CONTOUR_LEVELS = (0.50, 0.75, 0.95)
TOBLER_PEAK_KMH = 6.0
SAMPLE_SPACING_CELLS = 0.4

ASSUMPTIONS = (
    "Behaviour mixture weights are assumptions, not fitted: Hashimoto et al. 2022 report that mixtures of "
    "random walking, route travelling, direction travelling and staying put reproduce LPB distance "
    "distributions, but no single weight set is published for every category or terrain.",
    "Tobler's hiking function describes a fit, rested walker on a path; off_path_factor (0.6) is Tobler's own "
    "off-path multiplier. Children, the elderly, injured or despondent subjects move differently; the "
    "calibration rescales walking time to absorb part of that, not the shape of the speed curve.",
    "Calibration fits ONE scalar (walking-time scale k) to the LPB median; the 25/75/95% residuals show how well "
    "the remaining shape matches. LPB tables are small samples (n printed) from 2003 UK / older US data.",
    "The map at the elapsed time assumes the subject has rested for rest_fraction of it and stops for good after "
    "k*E_i hours of walking; the LPB distances are where subjects were eventually found.",
    "Downhill following uses the gradient of a lightly smoothed DEM; closed depressions are not filled, so an "
    "agent in a pit wanders (random walk) until it leaves.",
    "Barriers are only what you supply (plus DEM nodata and the grid edge). Cliffs, rivers, fences and "
    "vegetation not in the barrier mask are crossable.",
)
PRIOR_NOTE = (
    "Planning prior from an agent-based simulation calibrated to lost-person-behaviour statistics. It sizes and "
    "weights a search area; it does not predict where this person is. Blend with investigation and scenario "
    "analysis."
)


class MissingDependencyError(RuntimeError):
    """numpy, scipy or rasterio is not importable."""


class CalibrationError(ValueError):
    """Calibration cannot run (no distance table) or cannot reach the target."""


def _require_deps():
    if not HAVE_DEPS:
        raise MissingDependencyError("lost_person_sim needs numpy, scipy and rasterio "
                                     "(pip install numpy scipy rasterio)")


# ---------------------------------------------------------------------------
# parameters and terrain
# ---------------------------------------------------------------------------


@dataclass
class SimParams:
    """Every tunable number in the model; defaults are documented assumptions."""

    n_agents: int = 5000
    seed: int = 0
    weights: dict = field(default_factory=lambda: dict(DEFAULT_WEIGHTS))
    rest_fraction: float = 0.5  # share of elapsed time resting/stopped (mean of a Beta)
    rest_concentration: float = 10.0  # Beta a+b; higher = less spread between agents
    budget_sigma: float = 0.75  # log-sd of the per-agent walking budget E_i
    turn_sd: float = 2.5  # rad per sqrt(hour) heading diffusion for random walkers
    steer_tau_hours: float = 0.05  # time constant for steering toward a target bearing
    off_path_factor: float = 0.6  # Tobler off-path multiplier
    speed_factor: float = 1.0  # overall multiplier on Tobler speed
    route_attract_m: float = 300.0  # how far away a route-follower notices a linear feature
    leg_hours: float = 0.5  # direction sampling: walking time per outbound leg
    n_legs: int = 3  # direction sampling: out-and-back legs before committing to a bearing
    downhill_min_slope: float = 0.02  # tan(slope) below which downhill walkers random-walk
    dem_smooth_m: float | None = None  # Gaussian sigma for the gradient DEM (default 1 cell)
    step_cells: float = 2.0  # longest step (at 6 km/h) in cells; sets the time step
    max_walk_hours: float = 24.0  # simulated walking time; longer budgets are capped here
    max_checkpoints: int = 800  # stored positions per agent (time resolution of the fit)
    kernel_sigma_m: float | None = None  # kernel smoothing sigma (default 2 cells)

    def validate(self):
        if self.n_agents < 10:
            raise ValueError("n_agents must be >= 10")
        if not 0.0 <= self.rest_fraction < 1.0:
            raise ValueError("rest_fraction must be in [0, 1)")
        for k in ("rest_concentration", "turn_sd", "steer_tau_hours", "off_path_factor", "speed_factor",
                  "leg_hours", "step_cells", "max_walk_hours"):
            if not getattr(self, k) > 0:
                raise ValueError(f"{k} must be > 0")
        if self.budget_sigma < 0 or self.route_attract_m < 0 or self.n_legs < 1:
            raise ValueError("budget_sigma and route_attract_m must be >= 0, n_legs >= 1")
        if self.step_cells > 5:
            raise ValueError("step_cells must be <= 5")
        self.weights = normalise_weights(self.weights)


def normalise_weights(weights):
    """Check strategy names, drop nothing, rescale to sum 1."""
    w = {s: float(weights.get(s, 0.0)) for s in STRATEGIES}
    unknown = set(weights) - set(STRATEGIES)
    if unknown:
        raise ValueError(f"unknown strategy {sorted(unknown)}; known: {', '.join(STRATEGIES)}")
    if any(v < 0 for v in w.values()) or sum(w.values()) <= 0:
        raise ValueError("strategy weights must be >= 0 with a positive sum")
    total = sum(w.values())
    return {s: v / total for s, v in w.items()}


def parse_weights(text):
    """'random_walk=0.4,stay_put=0.1' -> dict (strategies not named keep their default)."""
    w = dict(DEFAULT_WEIGHTS)
    for part in filter(None, (p.strip() for p in text.split(","))):
        if "=" not in part:
            raise ValueError(f"weight {part!r} is not name=value")
        k, v = part.split("=", 1)
        w[k.strip()] = float(v)
    return normalise_weights(w)


@dataclass
class Terrain:
    """A square metric grid around the IPP with elevation and masks."""

    z: object  # 2-D float array (NaN = nodata)
    res: float
    transform: object
    crs: object
    lat: float
    lon: float
    sources: list
    synthetic: bool = False
    barrier: object = None
    paths: object = None  # roads + trails (full walking speed)
    streams: object = None
    feature_sources: dict = field(default_factory=dict)

    @property
    def shape(self):
        return self.z.shape

    @property
    def ipp_rc(self):
        """IPP as continuous (row, col); integer part is the cell."""
        (x,), (y,) = warp_transform("EPSG:4326", self.crs, [self.lon], [self.lat])
        t = self.transform
        return float((y - t.f) / t.e), float((x - t.c) / t.a)

    @property
    def nodata(self):
        return np.isnan(self.z)

    def impassable(self):
        m = self.nodata.copy()
        if self.barrier is not None:
            m |= self.barrier
        return m


def make_terrain(z, transform, crs, lat, lon, sources, synthetic=False):
    _require_deps()
    z = np.asarray(z, dtype="f8")
    res = abs(transform.a)
    if abs(abs(transform.e) - res) > 1e-6 * res or transform.b or transform.d:
        raise ValueError("grid cells must be square and north-up")
    t = Terrain(z=z, res=res, transform=transform, crs=crs, lat=lat, lon=lon, sources=list(sources),
                synthetic=synthetic)
    r, c = t.ipp_rc
    if not (0 <= r < z.shape[0] and 0 <= c < z.shape[1]):
        raise ValueError("IPP is outside the elevation grid")
    if np.isnan(z[int(r), int(c)]):
        raise ValueError("no elevation data at the IPP")
    t.barrier = np.zeros(z.shape, bool)
    t.paths = np.zeros(z.shape, bool)
    t.streams = np.zeros(z.shape, bool)
    return t


def _grid_transform(lat, lon, n, res_m):
    import dem_terrain

    crs = dem_terrain.utm_crs(lat, lon)
    (cx,), (cy,) = warp_transform("EPSG:4326", crs, [lon], [lat])
    return from_origin(cx - n * res_m / 2, cy + n * res_m / 2, res_m, res_m), crs


def synthetic_flat_terrain(lat, lon, half_cells, res_m, elevation=100.0, slope_east=0.0):
    """TESTS ONLY: a (2*half_cells+1)^2 UTM grid with a plane z = elevation + slope_east * x.

    Labelled ``synthetic`` in every output. The CLI never uses this.
    """
    _require_deps()
    n = 2 * int(half_cells) + 1
    t, crs = _grid_transform(lat, lon, n, res_m)
    x = (np.arange(n) - n // 2) * res_m
    z = elevation + slope_east * np.tile(x, (n, 1))
    return make_terrain(z, t, crs, lat, lon, ["synthetic flat grid (tests only)"], synthetic=True)


def load_terrain(dem_path, lat, lon, radius_m, res_m):
    """Reproject a DEM GeoTIFF onto a square UTM grid centred on the IPP (dem_terrain.load_grid)."""
    _require_deps()
    import dem_terrain

    if not os.path.isfile(dem_path):
        raise ValueError(f"DEM not found: {dem_path}")
    n_cells = (2 * radius_m / res_m) ** 2
    if n_cells > 16e6:
        raise ValueError(f"grid would have {n_cells:.3g} cells; increase --res-m or reduce --radius-km")
    dem_terrain._setup_gdal()
    z, t, crs = dem_terrain.load_grid(lat, lon, radius_m, res_m, [dem_path])
    if np.isnan(z).all():
        raise ValueError(f"{dem_path} has no elevation data around the IPP")
    return make_terrain(z, t, crs, lat, lon, [os.path.abspath(dem_path)])


# ---------------------------------------------------------------------------
# vector / raster inputs
# ---------------------------------------------------------------------------


def read_geojson_features(path):
    """List of (geometry, properties) from a FeatureCollection, Feature or bare geometry (WGS84 lon/lat)."""
    with open(path, encoding="utf-8") as fh:
        gj = json.load(fh)
    if gj.get("type") == "FeatureCollection":
        feats = gj.get("features") or []
    elif gj.get("type") == "Feature":
        feats = [gj]
    else:
        feats = [{"type": "Feature", "geometry": gj, "properties": {}}]
    out = [(f["geometry"], f.get("properties") or {}) for f in feats if f.get("geometry")]
    if not out:
        raise ValueError(f"{path}: no geometries")
    return out


def _check_types(geoms, allowed, path):
    for g in geoms:
        if g["type"] not in allowed:
            raise ValueError(f"{path}: geometry type {g['type']} not allowed here ({', '.join(allowed)})")


def rasterize_geoms(geoms, shape, transform, crs, all_touched):
    """Boolean mask of the grid covered by WGS84 geometries."""
    if not geoms:
        return np.zeros(shape, bool)
    shapes = [(transform_geom("EPSG:4326", crs, g), 1) for g in geoms]
    arr = rio_features.rasterize(shapes, out_shape=shape, transform=transform, fill=0, all_touched=all_touched,
                                 dtype="uint8")
    return arr.astype(bool)


def raster_mask(path, terrain):
    """Nonzero cells of a GeoTIFF, nearest-neighbour onto the terrain grid."""
    out = np.zeros(terrain.shape, dtype="f8")
    with rasterio.open(path) as src:
        reproject(source=rasterio.band(src, 1), destination=out, dst_transform=terrain.transform,
                  dst_crs=terrain.crs, dst_nodata=0, resampling=Resampling.nearest)
    return np.nan_to_num(out) != 0


def _is_raster(path):
    return path.lower().endswith((".tif", ".tiff", ".vrt"))


def load_mask(path, terrain, allowed):
    """A mask from a GeoTIFF or a GeoJSON of the allowed geometry types (lines all-touched)."""
    if not os.path.isfile(path):
        raise ValueError(f"file not found: {path}")
    if _is_raster(path):
        return raster_mask(path, terrain)
    geoms = [g for g, _ in read_geojson_features(path)]
    _check_types(geoms, allowed, path)
    return rasterize_geoms(geoms, terrain.shape, terrain.transform, terrain.crs, all_touched=True)


LINE_TYPES = ("LineString", "MultiLineString")
POLY_TYPES = ("Polygon", "MultiPolygon")


def add_inputs(terrain, roads=(), trails=(), streams=(), barriers=()):
    """Burn linear features and barriers into the terrain masks; records the source files."""
    for kind, paths in (("roads", roads), ("trails", trails), ("streams", streams), ("barriers", barriers)):
        for p in paths or ():
            m = load_mask(p, terrain, LINE_TYPES + POLY_TYPES if kind == "barriers" else LINE_TYPES)
            if kind == "barriers":
                terrain.barrier |= m
            elif kind == "streams":
                terrain.streams |= m
            else:
                terrain.paths |= m
            terrain.feature_sources.setdefault(kind, []).append(os.path.abspath(p))
    r, c = terrain.ipp_rc
    if terrain.barrier[int(r), int(c)]:
        raise ValueError("the IPP lies on a barrier cell")
    return terrain


# ---------------------------------------------------------------------------
# movement
# ---------------------------------------------------------------------------


def tobler_kmh(tan_slope):
    """Tobler's hiking function: v = 6 exp(-3.5 |tan(theta) + 0.05|) km/h (uphill tan > 0)."""
    if HAVE_DEPS and not isinstance(tan_slope, (int, float)):
        return TOBLER_PEAK_KMH * np.exp(-3.5 * np.abs(np.asarray(tan_slope) + 0.05))
    return TOBLER_PEAK_KMH * math.exp(-3.5 * abs(tan_slope + 0.05))


def _wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


@dataclass
class SimResult:
    terrain: Terrain
    params: SimParams
    strategy: object  # int index into STRATEGIES per agent
    budget: object  # E_i (0 for stay_put)
    rest: object  # r_i
    ck_pos: object  # (C, N, 2) float32 row, col
    ck_dt_hours: float
    dt_hours: float
    n_steps: int
    blocked_steps: int
    ipp_rc: tuple

    @property
    def ck_dist_km(self):
        r0, c0 = self.ipp_rc
        d = np.hypot(self.ck_pos[..., 0] - r0, self.ck_pos[..., 1] - c0)
        return d * (self.terrain.res / 1000.0)


class _Mover:
    """Vectorised state of all agents and the per-strategy steering rules."""

    DIRS = np.linspace(-np.pi, np.pi, 16, endpoint=False) if HAVE_DEPS else None

    def __init__(self, terrain, params, rng, strategy):
        self.t, self.p, self.rng, self.strategy = terrain, params, rng, strategy
        n = len(strategy)
        self.r0, self.c0 = terrain.ipp_rc
        self.r = np.full(n, self.r0)
        self.c = np.full(n, self.c0)
        self.h = rng.uniform(-np.pi, np.pi, n)
        self.blocked_mask = terrain.impassable()
        self.rows, self.cols = terrain.shape
        zf = np.where(terrain.nodata, np.nanmean(terrain.z), terrain.z)
        sigma = (params.dem_smooth_m or terrain.res) / terrain.res
        zs = ndimage.gaussian_filter(zf, sigma) if sigma > 0 else zf
        g_row, g_col = np.gradient(zs, terrain.res)
        self.dz_east, self.dz_north = g_col, -g_row
        feat = terrain.paths | terrain.streams
        self.has_feat = bool(feat.any())
        if self.has_feat:
            d, (nr, nc) = ndimage.distance_transform_edt(~feat, return_indices=True)
            self.feat_dist, self.feat_nr, self.feat_nc = d, nr, nc
        idx = {s: i for i, s in enumerate(STRATEGIES)}
        self.is_ = {s: strategy == idx[s] for s in STRATEGIES}
        self.ds_bearing = rng.uniform(-np.pi, np.pi, n)
        self.ds_left = np.full(n, params.leg_hours)
        self.ds_phase = np.zeros(n, int)  # 0 out, 1 back, 2 committed
        self.ds_legs = np.zeros(n, int)

    def cells(self, r, c):
        return np.clip(r.astype(int), 0, self.rows - 1), np.clip(c.astype(int), 0, self.cols - 1)

    def targets(self, ir, ic, dt):
        tgt = np.full(len(self.r), np.nan)
        self._downhill(tgt, ir, ic)
        self._route(tgt, ir, ic)
        self._direction_sampling(tgt, dt)
        return tgt

    def _downhill(self, tgt, ir, ic):
        sel = self.is_["downhill"]
        ge, gn = self.dz_east[ir, ic], self.dz_north[ir, ic]
        steep = sel & (np.hypot(ge, gn) > self.p.downhill_min_slope)
        tgt[steep] = np.arctan2(-gn[steep], -ge[steep])

    def _route(self, tgt, ir, ic):
        if not self.has_feat:
            return
        sel = self.is_["route_following"]
        d = self.feat_dist[ir, ic]
        near = sel & (d <= 1.5)
        far = sel & ~near & (d * self.t.res <= self.p.route_attract_m)
        if far.any():
            dr = self.feat_nr[ir[far], ic[far]] - ir[far]
            dc = self.feat_nc[ir[far], ic[far]] - ic[far]
            tgt[far] = np.arctan2(-dr, dc)
        k = np.nonzero(near)[0]
        if k.size:
            a = self.DIRS[None, :]
            rr = self.r[k, None] - 2.0 * np.sin(a)
            cc = self.c[k, None] + 2.0 * np.cos(a)
            inb = (rr >= 0) & (rr < self.rows) & (cc >= 0) & (cc < self.cols)
            ri, ci = self.cells(rr, cc)
            ok = inb & (self.feat_dist[ri, ci] <= 1.0) & ~self.blocked_mask[ri, ci]
            score = np.cos(a - self.h[k, None]) + self.rng.normal(0, 0.3, ok.shape)
            score[~ok] = -np.inf
            best = np.argmax(score, axis=1)
            has = ok.any(axis=1)
            tgt[k[has]] = self.DIRS[best[has]]

    def _direction_sampling(self, tgt, dt):
        sel = self.is_["direction_sampling"]
        if not sel.any():
            return
        out = sel & (self.ds_phase == 0)
        self.ds_left[out] -= dt
        turn = out & (self.ds_left <= 0)
        self.ds_phase[turn] = 1
        back = sel & (self.ds_phase == 1)
        home = back & (np.hypot(self.r - self.r0, self.c - self.c0) < 2.0)
        self.ds_legs[home] += 1
        commit = home & (self.ds_legs >= self.p.n_legs)
        again = home & ~commit
        self.ds_bearing[home] = self.rng.uniform(-np.pi, np.pi, int(home.sum()))
        self.ds_phase[commit] = 2
        self.ds_phase[again] = 0
        self.ds_left[again] = self.p.leg_hours
        back = sel & (self.ds_phase == 1)
        going = sel & (self.ds_phase != 1)
        tgt[going] = self.ds_bearing[going]
        tgt[back] = np.arctan2(self.r[back] - self.r0, self.c0 - self.c[back])

    def step(self, dt, n_samples):
        p = self.p
        ir, ic = self.cells(self.r, self.c)
        tgt = self.targets(ir, ic, dt)
        has = ~np.isnan(tgt)
        noise = self.rng.normal(0.0, p.turn_sd * math.sqrt(dt), len(self.r))
        gain = 1.0 - math.exp(-dt / p.steer_tau_hours)
        self.h[has] += gain * _wrap(tgt[has] - self.h[has]) + 0.35 * noise[has]
        self.h[~has] += noise[~has]
        tan = self.dz_east[ir, ic] * np.cos(self.h) + self.dz_north[ir, ic] * np.sin(self.h)
        v = tobler_kmh(tan) * p.speed_factor * np.where(self.t.paths[ir, ic], 1.0, p.off_path_factor)
        v[self.is_["stay_put"]] = 0.0
        step = v * 1000.0 * dt / self.t.res
        dr, dc = -step * np.sin(self.h), step * np.cos(self.h)
        frac = np.arange(1, n_samples + 1) / n_samples
        rr = self.r[:, None] + dr[:, None] * frac
        cc = self.c[:, None] + dc[:, None] * frac
        inb = (rr >= 0) & (rr < self.rows) & (cc >= 0) & (cc < self.cols)
        ri, ci = self.cells(rr, cc)
        bad = (~inb | self.blocked_mask[ri, ci]).any(axis=1)
        # a diagonal cell change between two barrier cells that touch at a corner is a crossing too
        pr = np.concatenate([ir[:, None], ri[:, :-1]], axis=1)
        pc = np.concatenate([ic[:, None], ci[:, :-1]], axis=1)
        diag = (pr != ri) & (pc != ci)
        bad |= (diag & self.blocked_mask[pr, ci] & self.blocked_mask[ri, pc]).any(axis=1)
        bad &= step > 0
        ok = ~bad
        self.r[ok] += dr[ok]
        self.c[ok] += dc[ok]
        nb = int(bad.sum())
        if nb:
            self.h[bad] += np.pi + self.rng.uniform(-np.pi / 2, np.pi / 2, nb)
        return nb


def simulate(terrain, params=None):
    """Run every agent for params.max_walk_hours of walking and store checkpointed positions."""
    _require_deps()
    params = params or SimParams()
    params.validate()
    rng = np.random.default_rng(params.seed)
    n = params.n_agents
    w = np.array([params.weights[s] for s in STRATEGIES])
    strategy = rng.choice(len(STRATEGIES), size=n, p=w)
    budget = rng.lognormal(0.0, params.budget_sigma, n) if params.budget_sigma > 0 else np.ones(n)
    budget[strategy == STRATEGIES.index("stay_put")] = 0.0
    if params.rest_fraction > 0:
        a = params.rest_fraction * params.rest_concentration
        b = (1 - params.rest_fraction) * params.rest_concentration
        rest = rng.beta(a, b, n)
    else:
        rest = np.zeros(n)
    dt = params.step_cells * terrain.res / (TOBLER_PEAK_KMH * 1000.0 * params.speed_factor)
    n_steps = int(math.ceil(params.max_walk_hours / dt))
    every = max(1, int(math.ceil(n_steps / params.max_checkpoints)))
    n_ck = n_steps // every + 1
    n_samples = int(math.ceil(params.step_cells / SAMPLE_SPACING_CELLS))
    mover = _Mover(terrain, params, rng, strategy)
    ck = np.empty((n_ck, n, 2), dtype="f4")
    ck[0, :, 0], ck[0, :, 1] = mover.r, mover.c
    blocked = 0
    for s in range(1, (n_ck - 1) * every + 1):
        blocked += mover.step(dt, n_samples)
        if s % every == 0:
            ck[s // every, :, 0], ck[s // every, :, 1] = mover.r, mover.c
    return SimResult(terrain=terrain, params=params, strategy=strategy, budget=budget, rest=rest, ck_pos=ck,
                     ck_dt_hours=every * dt, dt_hours=dt, n_steps=(n_ck - 1) * every, blocked_steps=blocked,
                     ipp_rc=(mover.r0, mover.c0))


def _ck_index(sim, hours):
    idx = np.floor(np.asarray(hours) / sim.ck_dt_hours + 1e-9).astype(int)
    return np.clip(idx, 0, sim.ck_pos.shape[0] - 1)


def walked_hours(sim, k, elapsed_hours=None):
    """t_i = min(k E_i, elapsed (1 - r_i), simulated hours)."""
    t = k * sim.budget
    if elapsed_hours is not None:
        t = np.minimum(t, elapsed_hours * (1.0 - sim.rest))
    return np.minimum(t, sim.n_steps * sim.dt_hours)


def final_positions(sim, k, elapsed_hours=None):
    """(rows, cols, hours walked) of every agent; positions are stored checkpoints (never past a barrier)."""
    t = walked_hours(sim, k, elapsed_hours)
    i = _ck_index(sim, t)
    a = np.arange(sim.ck_pos.shape[1])
    return sim.ck_pos[i, a, 0].astype("f8"), sim.ck_pos[i, a, 1].astype("f8"), t


# ---------------------------------------------------------------------------
# calibration
# ---------------------------------------------------------------------------


def lpb_targets(category, dataset="auto"):
    """LPB distance quantiles (km) at 25/50/75/95% with the table's page, n and dataset."""
    key = lpb.resolve_category(category)
    try:
        rs = lpb.rings(key, dataset, list(CALIBRATION_PERCENTILES))
    except lpb.NoDistanceTableError as exc:
        raise CalibrationError(f"calibration refused: {exc}; pass --walk-scale-hours to run uncalibrated") from exc
    return {
        "category": key,
        "dataset": rs[0]["dataset"],
        "page": rs[0]["page"],
        "n": rs[0]["n"],
        "source": rs[0]["source"],
        "km": {r["percent"]: r["km"] for r in rs},
        "interpolated": {r["percent"]: r["interpolated"] for r in rs},
        "data_age": LPB_DATA_AGE.get(rs[0]["dataset"], "2003 UK handbook"),
        "label": "LPB table",
    }


# Data age shown next to every table ring. These are publication / study dates, not incident dates.
LPB_DATA_AGE = {
    "uk_study": "2003 UK",
    "source_studies": "US/Canada 1997-2000, via 2003 UK handbook",
}
DISTANCE_TABLE_SCHEMA = "distance_table/1"
DEFAULT_KS_TOL_NO_N = 0.10
KS_C_ALPHA_05 = 1.36  # large-sample 5% critical value of the one-sample KS statistic, times sqrt(n)


class DistanceTableError(ValueError):
    """A --distance-table file is malformed or has no entry for the category/terrain."""


def _table_text(obj, key, path, where="table"):
    v = obj.get(key)
    if not isinstance(v, str) or not v.strip():
        raise DistanceTableError(f"{path}: {where} needs a non-empty '{key}' string")
    return v.strip()


def load_distance_table(path):
    """Read and check a user distance table (see the module docstring for the format)."""
    try:
        with open(path, encoding="utf-8") as fh:
            tab = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        raise DistanceTableError(f"{path}: cannot read distance table: {exc}") from exc
    if not isinstance(tab, dict):
        raise DistanceTableError(f"{path}: top level must be a JSON object")
    if tab.get("schema") != DISTANCE_TABLE_SCHEMA:
        raise DistanceTableError(f"{path}: schema must be {DISTANCE_TABLE_SCHEMA!r}")
    for k in ("source", "licence", "data_period"):
        _table_text(tab, k, path)
    if not isinstance(tab.get("fictional"), bool):
        raise DistanceTableError(f"{path}: 'fictional' must be true or false (say which it is)")
    entries = tab.get("entries")
    if not isinstance(entries, list) or not entries:
        raise DistanceTableError(f"{path}: 'entries' must be a non-empty list")
    for i, e in enumerate(entries):
        where = f"entry {i}"
        if not isinstance(e, dict):
            raise DistanceTableError(f"{path}: {where} is not an object")
        _table_text(e, "category", path, where)
        _table_text(e, "terrain", path, where)
        km = e.get("km")
        if not isinstance(km, dict):
            raise DistanceTableError(f"{path}: {where} needs 'km' with keys 25, 50, 75, 95")
        vals = []
        for p in CALIBRATION_PERCENTILES:
            v = km.get(str(p), km.get(p))
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or v <= 0:
                raise DistanceTableError(f"{path}: {where} km[{p}] must be a positive number")
            vals.append(float(v))
        if any(b < a for a, b in zip(vals, vals[1:])):
            raise DistanceTableError(f"{path}: {where} quantiles must not decrease: {vals}")
        n = e.get("n")
        if n is not None and (isinstance(n, bool) or not isinstance(n, int) or n < 1):
            raise DistanceTableError(f"{path}: {where} n must be a positive integer when given")
    return tab


def table_targets(tab, category, terrain=None, path=None):
    """Targets (same shape as lpb_targets) from a user distance table entry."""
    cat = category.strip().lower()
    hits = [e for e in tab["entries"] if e["category"].strip().lower() == cat]
    if not hits:
        known = sorted({e["category"] for e in tab["entries"]})
        raise DistanceTableError(f"{path}: no entry for category {category!r}; table has {known}")
    if terrain:
        t = terrain.strip().lower()
        hits = [e for e in hits if t in (e["terrain"].strip().lower(), str(e.get("ecoregion", "")).strip().lower())]
        if not hits:
            raise DistanceTableError(f"{path}: no {category!r} entry for terrain/ecoregion {terrain!r}")
    if len(hits) > 1:
        opts = sorted({e["terrain"] for e in hits})
        raise DistanceTableError(f"{path}: {len(hits)} entries for {category!r}; pick one with --table-terrain "
                                 f"({opts})")
    e = hits[0]
    km = {p: float(e["km"].get(str(p), e["km"].get(p))) for p in CALIBRATION_PERCENTILES}
    label = "FICTIONAL example table" if tab["fictional"] else "user distance table"
    return {
        "category": e["category"],
        "dataset": "user_table",
        "page": None,
        "n": e.get("n"),
        "source": tab["source"],
        "licence": tab["licence"],
        "fictional": tab["fictional"],
        "terrain": e["terrain"],
        "ecoregion": e.get("ecoregion"),
        "region": tab.get("region"),
        "table_path": os.path.abspath(path) if path else None,
        "km": km,
        "interpolated": {p: False for p in CALIBRATION_PERCENTILES},
        "data_age": tab["data_period"] + (" (FICTIONAL)" if tab["fictional"] else ""),
        "label": label,
    }


def ks_check(dist_km, targets, ks_tol=None):
    """KS-style distance between the simulated distance CDF and the table quantiles (see module docstring)."""
    d = np.asarray(dist_km, dtype="f8")
    n = targets.get("n")
    auto = ks_tol is None
    tol = (KS_C_ALPHA_05 / math.sqrt(n) if n else DEFAULT_KS_TOL_NO_N) if auto else float(ks_tol)
    if not tol > 0:
        raise ValueError("KS tolerance must be > 0")
    points, worst, at = {}, -1.0, None
    for p in CALIBRATION_PERCENTILES:
        q = targets["km"][p]
        f = float(np.mean(d <= q))
        gap = abs(f - p / 100.0)
        points[p] = {"table_km": q, "sim_cdf_at_table_km": round(f, 4), "abs_gap": round(gap, 4)}
        if gap > worst:
            worst, at = gap, p
    out = {
        "statistic": round(worst, 4),
        "at_percent": at,
        "tolerance": round(tol, 4),
        "tolerance_rule": ("auto: 1.36/sqrt(n) for the table's n" if auto and n else
                           f"auto: {DEFAULT_KS_TOL_NO_N} (table gives no n)" if auto else "user --ks-tol"),
        "pass": bool(worst <= tol),
        "points": points,
        "method": "max |F_sim(q_table(p)) - p| over p = 25/50/75/95%; KS evaluated at the table quantiles only",
    }
    if tol > 0.25:
        out["warning"] = (f"tolerance {tol:.2f} is wide because the table is small (n={n}); the check can only "
                          "catch gross misfits")
    return out


def calibrate(sim, targets, tol=0.05, iterations=80, ks_tol=None):
    """Bisection on log(k) so the simulated median distance (no elapsed cap) equals the LPB 50% distance."""
    d_ck = sim.ck_dist_km
    a = np.arange(d_ck.shape[1])
    target = targets["km"][50]

    def dist(k):
        return d_ck[_ck_index(sim, walked_hours(sim, k)), a]

    moving = sim.budget[sim.budget > 0]
    if moving.size == 0:
        raise CalibrationError("every agent is stay_put; nothing to calibrate")
    t_sim = sim.n_steps * sim.dt_hours
    lo, hi = 1e-4, t_sim / float(moving.min())
    med_hi = float(np.median(dist(hi)))
    reachable = med_hi >= target
    if not reachable:
        k = hi
    elif float(np.median(dist(lo))) >= target:
        k = lo
    else:
        for _ in range(iterations):
            mid = math.sqrt(lo * hi)
            if float(np.median(dist(mid))) < target:
                lo = mid
            else:
                hi = mid
        k = hi
    d = dist(k)
    sim_q = {p: float(np.quantile(d, p / 100.0)) for p in CALIBRATION_PERCENTILES}
    floor_km = 0.5 * sim.terrain.res / 1000.0
    resid = {
        p: {
            "lpb_km": targets["km"][p],
            "sim_km": round(sim_q[p], 4),
            "residual_km": round(sim_q[p] - targets["km"][p], 4),
            "relative": round((sim_q[p] - targets["km"][p]) / targets["km"][p], 4) if targets["km"][p] else None,
            "lpb_interpolated": targets["interpolated"][p],
        }
        for p in CALIBRATION_PERCENTILES
    }
    capped = float(np.mean((k * sim.budget) > t_sim))
    converged = reachable and abs(sim_q[50] - target) <= tol * target + floor_km
    # "lpb_km" / "lpb_table" keep their names (dossier.py reads them) but hold whichever table calibrated the run.
    table_keys = ("category", "dataset", "page", "n", "source", "data_age", "licence", "fictional", "terrain",
                  "ecoregion", "region", "table_path")
    return {
        "calibrated": True,
        "converged": bool(converged),
        "walk_scale_hours": k,
        # Replaced: the target is no longer always the LPB table; a --distance-table entry can replace it.
        # "target": "LPB 50% straight-line distance (long-time limit, no elapsed-time cap)",
        "target": (f"{targets.get('label', 'LPB table')} ({targets.get('data_age', '2003 UK')}) 50% straight-line "
                   "distance (long-time limit, no elapsed-time cap)"),
        "tolerance": {"relative": tol, "plus_km": floor_km},
        "quantiles": resid,
        "ks": ks_check(d, targets, ks_tol),
        "fraction_budget_capped_at_max_walk_hours": round(capped, 4),
        # Replaced: data age, licence and terrain of the table now travel with the result.
        # "lpb_table": {k2: targets[k2] for k2 in ("category", "dataset", "page", "n", "source")},
        "lpb_table": {k2: targets.get(k2) for k2 in table_keys if k2 in targets},
        "message": None if converged else (
            f"simulated median reaches only {med_hi:.3f} km of {target} km within max_walk_hours={t_sim:.3g}; "
            "increase --max-walk-hours, --radius-km or check barriers" if not reachable
            else "median not within tolerance (grid too coarse or too few agents)"),
    }


# ---------------------------------------------------------------------------
# rasters, contours, rings, segments
# ---------------------------------------------------------------------------


def probability_raster(terrain, rows, cols, kernel_sigma_m=None):
    """Normalised (sum 1) kernel-smoothed density of final positions; impassable cells are 0.

    The kernel is applied separately inside each connected passable region and
    each region keeps exactly its share of agents, so smoothing never moves
    probability across a barrier that separates regions.
    """
    counts = np.zeros(terrain.shape, dtype="f8")
    ir = np.clip(rows.astype(int), 0, terrain.shape[0] - 1)
    ic = np.clip(cols.astype(int), 0, terrain.shape[1] - 1)
    np.add.at(counts, (ir, ic), 1.0)
    passable = ~terrain.impassable()
    counts[~passable] = 0.0
    if counts.sum() <= 0:
        raise ValueError("no agent ended on a passable cell")
    sigma = (kernel_sigma_m if kernel_sigma_m is not None else 2 * terrain.res) / terrain.res
    if sigma <= 0:
        return counts / counts.sum()
    regions, _ = ndimage.label(passable)  # 4-connected, matching the agents' corner rule
    p = np.zeros(terrain.shape, dtype="f8")
    for lab in np.unique(regions[counts > 0]):
        m = regions == lab
        sm = ndimage.gaussian_filter(np.where(m, counts, 0.0), sigma, mode="constant")
        sm[~m] = 0.0
        s = sm.sum()
        p += sm * (counts[m].sum() / s) if s > 0 else np.where(m, counts, 0.0)
    return p / p.sum()


def hdr_masks(prob, levels=CONTOUR_LEVELS):
    """Smallest highest-probability cell sets holding each cumulative mass level."""
    flat = prob.ravel()
    order = np.argsort(flat)[::-1]
    cum = np.cumsum(flat[order])
    out = {}
    for lev in levels:
        i = min(int(np.searchsorted(cum, lev - 1e-12)), flat.size - 1)
        m = np.zeros(flat.size, bool)
        m[order[: i + 1]] = True
        out[lev] = m.reshape(prob.shape)
    return out


def contours_geojson(terrain, prob, inputs, levels=CONTOUR_LEVELS):
    feats = []
    cell_km2 = (terrain.res / 1000.0) ** 2
    for lev, m in hdr_masks(prob, levels).items():
        geoms = [transform_geom(terrain.crs, "EPSG:4326", g)
                 for g, v in rio_features.shapes(m.astype("uint8"), mask=m, transform=terrain.transform) if v]
        if not geoms:
            continue
        polys = [g["coordinates"] for g in geoms if g["type"] == "Polygon"]
        feats.append({
            "type": "Feature",
            "geometry": {"type": "MultiPolygon", "coordinates": polys},
            "properties": {
                "level": lev,
                "label": f"{int(lev * 100)}% cumulative probability region",
                "mass": round(float(prob[m].sum()), 6),
                "area_km2": round(float(m.sum()) * cell_km2, 4),
                "cells": int(m.sum()),
            },
        })
    return {"type": "FeatureCollection", "name": "cumulative_mass_contours", "features": feats,
            "inputs": inputs, "note": PRIOR_NOTE}


def containment_rings(terrain, dist_km, targets, inputs, n_vertices=96):
    """Simulated containment radii at the elapsed time (and the LPB rings, for comparison) as GeoJSON."""
    feats = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [terrain.lon, terrain.lat]},
              "properties": {"name": "IPP", "label": "Initial planning point (IPP)"}}]
    rings = []
    tsrc = "user_table" if targets and targets.get("dataset") == "user_table" else "lpb_table"
    for p in CALIBRATION_PERCENTILES:
        km = float(np.quantile(dist_km, p / 100.0))
        rings.append(("simulation", p, km))
        if targets:
            rings.append((tsrc, p, float(targets["km"][p])))
    age = (targets or {}).get("data_age", "2003 UK")
    tlabel = (targets or {}).get("label", "LPB table")
    for src, p, km in rings:
        # Replaced: the table ring label now carries the data age (e.g. "2003 UK") so old figures are visible.
        # props = {"source": src, "percent": p, "km": round(km, 4),
        #          "label": f"{'simulated' if src == 'simulation' else 'LPB table'} {p}%: {km:.3g} km"}
        if src == "simulation":
            label = f"simulated {p}%: {km:.3g} km" + (f" (calibrated to {age} table)" if targets else "")
        else:
            label = f"{tlabel} {p}%: {km:.3g} km ({age})"
        props = {"source": src, "percent": p, "km": round(km, 4), "label": label}
        if src != "simulation" or targets:
            props["data_age"] = age
        if km <= 0:
            props["zero_radius"] = True
            feats.append({"type": "Feature", "geometry": None, "properties": props})
            continue
        ring = lpb.geodesic_circle(terrain.lat, terrain.lon, km, n_vertices)
        feats.append({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[list(x) for x in ring]]},
                      "properties": props})
    return {"type": "FeatureCollection", "name": "containment_rings", "features": feats, "inputs": inputs,
            "note": PRIOR_NOTE}


def _ring_area(coords):
    s = 0.0
    for (x1, y1), (x2, y2) in zip(coords, coords[1:]):
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def polygon_area_km2(geom_wgs84, crs):
    g = transform_geom("EPSG:4326", crs, geom_wgs84)
    polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    area = 0.0
    for poly in polys:
        coords = [[tuple(p[:2]) for p in ring] for ring in poly]
        area += _ring_area(coords[0]) - sum(_ring_area(h) for h in coords[1:])
    return area / 1e6


def read_polygons(path, kind="segments"):
    """[(name, geometry, properties)] from a GeoJSON of Polygon/MultiPolygon features (unique names)."""
    feats = read_geojson_features(path)
    _check_types([g for g, _ in feats], POLY_TYPES, path)
    out, seen = [], set()
    for i, (g, props) in enumerate(feats, 1):
        name = str(props.get("name") or props.get("id") or f"{kind}_{i}").strip()
        if name.lower() in ("row", "rest of world", "rest_of_world"):
            raise ValueError(f"{path}: {name!r} is reserved for the rest-of-world segment")
        if name in seen:
            raise ValueError(f"{path}: duplicate name {name!r}")
        seen.add(name)
        out.append((name, g, props))
    return out


def segment_poa(grid_shape, transform, crs, prob, polygons):
    """POA per polygon (cells by centre; a cell in several polygons counts for the first) plus ROW."""
    label = np.zeros(grid_shape, dtype="i4")
    rows = []
    for i, (name, g, _) in enumerate(polygons, 1):
        m = rasterize_geoms([g], grid_shape, transform, crs, all_touched=False)
        overlap = int((m & (label > 0)).sum())
        label[m & (label == 0)] = i
        rows.append({"name": name, "area_km2": polygon_area_km2(g, crs), "cells": int((label == i).sum()),
                     "overlap_cells_assigned_elsewhere": overlap})
    for i, r in enumerate(rows, 1):
        r["poa"] = float(prob[label == i].sum())
    row_poa = max(0.0, 1.0 - sum(r["poa"] for r in rows))
    rows.append({"name": "ROW", "area_km2": None, "cells": int((label == 0).sum()), "poa": row_poa,
                 "overlap_cells_assigned_elsewhere": 0})
    return rows


def write_segments_csv(path, rows):
    """name, area_km2, poa - the columns search_theory.read_segments expects (ROW has no area)."""
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["name", "area_km2", "poa"])
        for r in rows:
            w.writerow([r["name"], "" if r["area_km2"] is None else repr(r["area_km2"]), repr(r["poa"])])


def bayes_update_raster(prob, searches):
    """P' = P prod(1 - POD_j in polygon j) / normaliser. searches: [(bool mask, pod)].

    Returns (posterior, probability of success of this round, cleared-cell mask).
    """
    miss = np.ones(prob.shape, dtype="f8")
    for m, pod in searches:
        if not 0.0 <= pod <= 1.0:
            raise ValueError(f"POD {pod} outside [0, 1]")
        miss[m] *= 1.0 - pod
    unfound = prob * miss
    remaining = float(unfound.sum())
    if remaining <= 0:
        raise ValueError("every cell with probability was cleared; nothing left to redistribute")
    post = unfound / remaining
    cleared = miss == 0.0
    post[cleared] = 0.0
    return post, 1.0 - remaining / float(prob.sum()), cleared


def searched_from_geojson(path, grid_shape, transform, crs):
    out = []
    for name, g, props in read_polygons(path, "search"):
        if props.get("cleared") is True:
            pod = 1.0
        elif props.get("pod") is not None:
            pod = float(props["pod"])
        else:
            raise ValueError(f"{path}: {name} needs a pod property or cleared: true")
        if not 0.0 <= pod <= 1.0:
            raise ValueError(f"{path}: {name} POD {pod} outside [0, 1]")
        out.append((name, rasterize_geoms([g], grid_shape, transform, crs, all_touched=False), pod))
    return out


# ---------------------------------------------------------------------------
# orchestration and outputs
# ---------------------------------------------------------------------------


def write_geotiff(path, arr, transform, crs, inputs, description):
    with rasterio.open(path, "w", driver="GTiff", height=arr.shape[0], width=arr.shape[1], count=1,
                       dtype="float32", crs=crs, transform=transform, nodata=None, compress="deflate") as dst:
        dst.write(arr.astype("float32"), 1)
        dst.update_tags(inputs=json.dumps(inputs, sort_keys=True), description=description, note=PRIOR_NOTE)


def _write_json(path, obj):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, indent=2, ensure_ascii=False, default=str)
        fh.write("\n")


def run(terrain, category, elapsed_hours, params=None, dataset="auto", walk_scale_hours=None, calib_tol=0.05,
        table=None, ks_tol=None):
    """Simulate, calibrate (unless walk_scale_hours is given) and build the probability raster.

    ``table``: targets from table_targets (a user distance table); it replaces the 2003 UK LPB table.
    Returns dict with prob, dist_km, calibration, sim, targets.
    """
    if not elapsed_hours > 0:
        raise ValueError("elapsed hours must be > 0")
    # Replaced: a user table's category need not be an LPB category (ISRID uses its own names).
    # key = lpb.resolve_category(category)
    key = table["category"] if table else lpb.resolve_category(category)
    targets = table
    if walk_scale_hours is None and targets is None:
        targets = lpb_targets(key, dataset)  # raises CalibrationError when no table
    sim = simulate(terrain, params)
    if walk_scale_hours is None:
        calib = calibrate(sim, targets, tol=calib_tol, ks_tol=ks_tol)
        k = calib["walk_scale_hours"]
    else:
        if not walk_scale_hours > 0:
            raise ValueError("walk scale hours must be > 0")
        k = float(walk_scale_hours)
        calib = {"calibrated": False, "converged": None, "walk_scale_hours": k,
                 "message": "walking-time scale given by the user; not calibrated to a distance table"}
        if targets is None:
            try:
                targets = lpb_targets(key, dataset)
            except CalibrationError:
                targets = None
    rows, cols, t = final_positions(sim, k, elapsed_hours)
    r0, c0 = sim.ipp_rc
    dist_km = np.hypot(rows - r0, cols - c0) * terrain.res / 1000.0
    prob = probability_raster(terrain, rows, cols, sim.params.kernel_sigma_m)
    edge = (rows < 1) | (cols < 1) | (rows >= terrain.shape[0] - 1) | (cols >= terrain.shape[1] - 1)
    t_sim = sim.n_steps * sim.dt_hours
    diag = {
        "agents": int(len(rows)),
        "strategy_counts": {s: int((sim.strategy == i).sum()) for i, s in enumerate(STRATEGIES)},
        "time_step_hours": sim.dt_hours,
        "checkpoint_hours": sim.ck_dt_hours,
        "simulated_walk_hours": t_sim,
        "blocked_steps": int(sim.blocked_steps),
        "fraction_at_grid_edge": round(float(edge.mean()), 4),
        "fraction_still_walking_at_elapsed": round(float(np.mean(k * sim.budget > t + 1e-9)), 4),
        "mean_hours_walked": round(float(t.mean()), 4),
        "elapsed_walk_capped_by_max_walk_hours": bool(elapsed_hours * (1 - sim.rest.min()) > t_sim),
    }
    return {"key": key, "prob": prob, "dist_km": dist_km, "calibration": calib, "sim": sim, "targets": targets,
            "diagnostics": diag, "walk_scale_hours": k}


def _inputs_record(a, key, terrain, params):
    return {
        "ipp": {"lat": a.lat, "lon": a.lon},
        "category": key,
        "dataset": a.dataset,
        "elapsed_hours": a.hours,
        "dem": terrain.sources,
        "synthetic_terrain": terrain.synthetic,
        "grid": {"res_m": terrain.res, "shape": list(terrain.shape), "crs": terrain.crs.to_string()},
        "linear_features_and_barriers": terrain.feature_sources,
        "segments": os.path.abspath(a.segments) if a.segments else None,
        "walk_scale_hours_given": a.walk_scale_hours,
        "distance_table": os.path.abspath(a.distance_table) if a.distance_table else None,
        "table_terrain": a.table_terrain,
        "params": asdict(params),
    }


def _params_from_args(a):
    weights = parse_weights(a.weights) if a.weights else dict(DEFAULT_WEIGHTS)
    p = SimParams(n_agents=a.agents, seed=a.seed, weights=weights,
                  rest_fraction=a.rest_fraction, off_path_factor=a.off_path_factor, speed_factor=a.speed_factor,
                  max_walk_hours=a.max_walk_hours, kernel_sigma_m=a.kernel_m, budget_sigma=a.budget_sigma,
                  turn_sd=a.turn_sd, route_attract_m=a.route_attract_m)
    p.validate()
    return p


def _check_files(paths):
    for p in paths:
        if p and not os.path.isfile(p):
            raise ValueError(f"file not found: {p}")


def _cmd_simulate(a):
    table = None
    try:
        if a.distance_table:
            _check_files([a.distance_table])
            table = table_targets(load_distance_table(a.distance_table), a.category, a.table_terrain,
                                  a.distance_table)
            key = table["category"]
        else:
            if a.table_terrain:
                raise ValueError("--table-terrain needs --distance-table")
            key = lpb.resolve_category(a.category)
        if a.ks_tol is not None and not a.ks_tol > 0:
            raise ValueError("--ks-tol must be > 0")
        if not (-90 < a.lat < 90 and -180 <= a.lon <= 180):
            raise ValueError(f"IPP out of range: {a.lat}, {a.lon}")
        if not a.hours > 0:
            raise ValueError("--hours must be > 0")
        if not a.dem:
            raise ValueError("--dem is required: terrain-aware simulation needs an elevation GeoTIFF")
        _check_files([a.dem, a.segments, *(a.roads or []), *(a.trails or []), *(a.streams or []),
                      *(a.barriers or [])])
        _require_deps()
        params = _params_from_args(a)
        # Replaced: a user distance table supplies the targets instead of the 2003 UK LPB table.
        # targets = None if a.walk_scale_hours is not None else lpb_targets(key, a.dataset)
        targets = table if table else (None if a.walk_scale_hours is not None else lpb_targets(key, a.dataset))
    except CalibrationError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 3
    except (lpb.UnknownCategoryError, ValueError, MissingDependencyError) as exc:
        print(f"error: {exc.args[0] if exc.args else exc}", file=sys.stderr)
        return 2
    try:
        radius_km = a.radius_km
        if radius_km is None:
            if targets is None:
                raise ValueError("--radius-km is required with --walk-scale-hours")
            radius_km = min(max(1.3 * targets["km"][95], 1.0), 40.0)
        terrain = load_terrain(a.dem, a.lat, a.lon, radius_km * 1000.0, a.res_m)
        add_inputs(terrain, a.roads, a.trails, a.streams, a.barriers)
        polygons = read_polygons(a.segments) if a.segments else None
        res = run(terrain, key, a.hours, params, a.dataset, a.walk_scale_hours, a.calib_tol, table=table,
                  ks_tol=a.ks_tol)
    except (ValueError, CalibrationError, OSError, *RASTER_ERRORS) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    inputs = _inputs_record(a, key, terrain, params)
    inputs["grid"]["radius_km"] = radius_km
    _write_outputs(a.out, terrain, res, inputs, polygons)
    cal = res["calibration"]
    print(f"{key}: k = {cal['walk_scale_hours']:.4g} h walking scale "
          f"({'calibrated' if cal['calibrated'] else 'user-given'}); wrote {a.out}")
    tg = res["targets"]
    if tg and tg.get("fictional"):
        print("warning: the distance table is marked FICTIONAL; do not use this map on a real search",
              file=sys.stderr)
    if cal["calibrated"]:
        age = tg.get("data_age", "2003 UK")
        tname = "table" if tg.get("dataset") == "user_table" else "LPB"
        for p, q in cal["quantiles"].items():
            # Replaced: the table column now names the data age next to each ring distance.
            # print(f"  {p:>3}%  LPB {q['lpb_km']:>8.3f} km   sim {q['sim_km']:>8.3f} km   "
            #       f"residual {q['residual_km']:+.3f}")
            print(f"  {p:>3}%  {tname} {q['lpb_km']:>8.3f} km ({age})   sim {q['sim_km']:>8.3f} km   "
                  f"residual {q['residual_km']:+.3f}")
        ks = cal["ks"]
        print(f"  KS-style D = {ks['statistic']:.3f} at {ks['at_percent']}% (tolerance {ks['tolerance']:.3f}): "
              f"{'PASS' if ks['pass'] else 'FAIL'}" + (f"; {ks['warning']}" if ks.get("warning") else ""))
    if cal["calibrated"] and not cal["converged"]:
        print(f"error: calibration did not converge: {cal['message']}", file=sys.stderr)
        return 4
    if cal["calibrated"] and not cal["ks"]["pass"]:
        print("error: simulated distance distribution does not match the table shape (KS-style check failed); "
              "outputs written and flagged", file=sys.stderr)
        return 5
    return 0


def _write_outputs(out, terrain, res, inputs, polygons):
    os.makedirs(out, exist_ok=True)
    prob = res["prob"]
    write_geotiff(os.path.join(out, "probability.tif"), prob, terrain.transform, terrain.crs, inputs,
                  "probability of the subject's position per cell at the elapsed time (sums to 1)")
    _write_json(os.path.join(out, "containment_rings.geojson"),
                containment_rings(terrain, res["dist_km"], res["targets"], inputs))
    _write_json(os.path.join(out, "contours.geojson"), contours_geojson(terrain, prob, inputs))
    summary = {
        "inputs": inputs,
        "calibration": res["calibration"],
        "diagnostics": res["diagnostics"],
        "simulated_distance_km_at_elapsed": {
            p: round(float(np.quantile(res["dist_km"], p / 100.0)), 4) for p in CALIBRATION_PERCENTILES},
        "probability_total": float(prob.sum()),
        "assumptions": list(ASSUMPTIONS),
        "model": "Tobler v = 6 exp(-3.5 |tan(theta) + 0.05|) km/h; correlated random walk with behaviour mixture",
        # Replaced: the citation is the user table's source when one calibrated the run.
        # "citation": lpb.load_data()["source"]["citation"],
        "citation": (res["targets"]["source"] if res["targets"] and res["targets"].get("dataset") == "user_table"
                     else lpb.load_data()["source"]["citation"]),
        "distance_table_data_age": res["targets"].get("data_age") if res["targets"] else None,
        "note": PRIOR_NOTE,
        "outputs": ["probability.tif", "containment_rings.geojson", "contours.geojson"],
    }
    if polygons:
        rows = segment_poa(terrain.shape, terrain.transform, terrain.crs, prob, polygons)
        write_segments_csv(os.path.join(out, "segments.csv"), rows)
        summary["segments"] = rows
        summary["outputs"].append("segments.csv")
    _write_json(os.path.join(out, "summary.json"), summary)


def _cmd_update(a):
    try:
        _check_files([a.prior, a.searched, a.segments])
        _require_deps()
        with rasterio.open(a.prior) as src:
            prior = src.read(1).astype("f8")
            tr, crs, tags = src.transform, src.crs, src.tags()
        if not np.isfinite(prior).all() or (prior < 0).any():
            raise ValueError("prior raster has negative or non-finite cells")
        total = prior.sum()
        if abs(total - 1.0) > 1e-3:
            raise ValueError(f"prior raster sums to {total:.6f}, not 1")
        prior /= total
        searched = searched_from_geojson(a.searched, prior.shape, tr, crs)
        post, pos, cleared = bayes_update_raster(prior, [(m, pod) for _, m, pod in searched])
        polygons = read_polygons(a.segments) if a.segments else None
    except (ValueError, OSError, MissingDependencyError, *RASTER_ERRORS) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    os.makedirs(a.out, exist_ok=True)
    inputs = {"prior": os.path.abspath(a.prior), "prior_inputs": json.loads(tags.get("inputs", "null")),
              "searched": os.path.abspath(a.searched),
              "searches": [{"name": n, "pod": pod, "cells": int(m.sum())} for n, m, pod in searched]}
    write_geotiff(os.path.join(a.out, "posterior.tif"), post, tr, crs, inputs,
                  "posterior probability per cell after an unsuccessful search (sums to 1)")
    summary = {"inputs": inputs, "probability_of_success_this_round": pos, "cleared_cells": int(cleared.sum()),
               "posterior_total": float(post.sum()),
               "formula": "P' = P * prod_j (1 - POD_j in polygon j) / normaliser; POD 1 cells stay 0",
               "note": PRIOR_NOTE, "outputs": ["posterior.tif"]}
    if polygons:
        rows = segment_poa(post.shape, tr, crs, post, polygons)
        write_segments_csv(os.path.join(a.out, "segments.csv"), rows)
        summary["segments"] = rows
        summary["outputs"].append("segments.csv")
    _write_json(os.path.join(a.out, "update_summary.json"), summary)
    print(f"P(success this round) = {pos:.4f}; {int(cleared.sum())} cells cleared; wrote {a.out}")
    return 0


def _parser():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd")
    s = sub.add_parser("simulate", help="agent-based probability map from an IPP")
    s.add_argument("--lat", type=float, required=True)
    s.add_argument("--lon", type=float, required=True)
    s.add_argument("--category", required=True, help="LPB category key or alias (lost_person_behavior.py --list)")
    s.add_argument("--hours", type=float, required=True, help="elapsed hours since the subject left the IPP")
    s.add_argument("--dem", help="elevation GeoTIFF (required)")
    s.add_argument("--out", required=True)
    s.add_argument("--dataset", default="auto", choices=["auto", *lpb.DATASET_KEYS])
    s.add_argument("--res-m", type=float, default=30.0)
    s.add_argument("--radius-km", type=float, help="grid half-width (default 1.3 x the LPB 95%% distance)")
    s.add_argument("--roads", action="append", help="GeoJSON lines or GeoTIFF mask (repeatable)")
    s.add_argument("--trails", action="append")
    s.add_argument("--streams", action="append")
    s.add_argument("--barriers", action="append", help="GeoJSON lines/polygons or GeoTIFF mask (repeatable)")
    s.add_argument("--segments", help="GeoJSON polygons; writes segments.csv for search_theory.py")
    s.add_argument("--agents", type=int, default=5000)
    s.add_argument("--seed", type=int, default=0)
    s.add_argument("--weights", help="e.g. random_walk=0.35,route_following=0.25,direction_sampling=0.15,"
                                     "downhill=0.15,stay_put=0.1")
    s.add_argument("--rest-fraction", type=float, default=0.5)
    s.add_argument("--off-path-factor", type=float, default=0.6)
    s.add_argument("--speed-factor", type=float, default=1.0)
    s.add_argument("--budget-sigma", type=float, default=0.75)
    s.add_argument("--turn-sd", type=float, default=2.5)
    s.add_argument("--route-attract-m", type=float, default=300.0)
    s.add_argument("--max-walk-hours", type=float, default=24.0)
    s.add_argument("--kernel-m", type=float, help="kernel smoothing sigma in metres (default 2 cells)")
    s.add_argument("--walk-scale-hours", type=float, help="skip calibration and use this walking-time scale k")
    s.add_argument("--calib-tol", type=float, default=0.05)
    s.add_argument("--distance-table", help="JSON distance table (e.g. your licensed ISRID figures) that replaces "
                                            "the 2003 UK LPB table for calibration")
    s.add_argument("--table-terrain", help="terrain or ecoregion of the --distance-table entry to use")
    s.add_argument("--ks-tol", type=float, help="tolerance for the KS-style shape check "
                                                "(default 1.36/sqrt(n) of the table, 0.10 without n)")
    u = sub.add_parser("update", help="Bayesian update of a probability raster after unsuccessful searches")
    u.add_argument("--prior", required=True, help="probability.tif (or posterior.tif) to update")
    u.add_argument("--searched", required=True, help="GeoJSON polygons with pod or cleared: true")
    u.add_argument("--segments", help="GeoJSON polygons; writes updated segments.csv")
    u.add_argument("--out", required=True)
    return ap


def main(argv=None):
    ap = _parser()
    try:
        a = ap.parse_args(argv)
    except SystemExit as exc:  # argparse error -> 2, --help -> 0
        return int(exc.code or 0)
    if a.cmd == "simulate":
        return _cmd_simulate(a)
    if a.cmd == "update":
        return _cmd_update(a)
    ap.print_usage(sys.stderr)
    print("error: choose a subcommand: simulate or update", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
