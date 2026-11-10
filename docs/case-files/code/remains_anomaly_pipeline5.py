
#!/usr/bin/env python3
"""
REMAINS ANOMALY PIPELINE (v0.1)
===============================
Goal: rank candidate locations where buried human remains (or a deep burial/
trapped-person site) are LIKELY, using only data that already exists:

  LAYER A  Multi-temporal lidar (USGS 3DEP, OpenTopography, drone surveys)
           -> grave signature: dig mound (+) followed by decay subsidence (-)
  LAYER B  Sentinel-2 NDVI anomaly  -> "cadaver decomposition island"
  LAYER C  Report fusion (NamUs / police / social) -> geoparsed density
  LAYER D  Soil nitrate field probes -> decomposition N-pulse hotspot
  LAYER E  CONFIRMATION ONLY: on-site sampling -> qPCR (human mtDNA HV1)

Layer E is physics. Nothing remote detects DNA itself; this pipeline finds
WHERE to dig, then the lab confirms. Treat every layer as if freshly acquired:
'ingest' re-reads raw sources each run.

Deps: rasterio numpy scipy pandas scikit-learn geopandas(optional)
All raster ops degrade gracefully to a synthetic demo scene if no data present.
"""

import numpy as np, pandas as pd, os, json, math, re, sys

# ---------------------------------------------------------------- CONFIG ---
CFG = {
    "cell_size": 1.0,            # meters, target analysis grid
    "lod_percentile": 95,        # level-of-detection percentile for DoD
    "mound_max_years": 2.0,      # mound must appear within this of burial
    "sink_window": (2.0, 10.0),  # subsidence expected in this year window
    "ndvi_baseline_years": 3,    # years of Sentinel history for baseline
    "nitrate_threshold_mgkg": 40,  # screening trigger (site-calibrate!)
    "w_lidar": 0.40, "w_ndvi": 0.15, "w_reports": 0.15, "w_nitrate": 0.30,
    "qpcr_loq_copies_per_g": 1e3,  # below = report "insufficient human DNA"
}

# ------------------------------------------------------------- LAYER A -----
def level_of_detection(dod_flat, pct=95):
    """Robust DoD uncertainty via MAD: LoD = z * sigma, sigma = 1.4826*MAD."""
    med = np.nanmedian(dod_flat)
    sigma = 1.4826 * np.nanmedian(np.abs(dod_flat - med))
    z = {90: 1.64, 95: 1.96, 99: 2.58}[pct]
    return z * sigma

def dem_of_difference(dem_old, dem_new, res):
    dod = (dem_new - dem_old)
    lod = level_of_detection(dod[~np.isnan(dod)], CFG["lod_percentile"])
    dod[np.abs(dod) < lod] = 0.0
    return dod, lod

def grave_signature_score(epochs, years, res):
    """
    epochs: list of DEM arrays (oldest -> newest), co-registered, same grid.
    Burial timeline (forensic geomorphology, published):
      t0..t0+2y : dig mound / spoil  -> positive DoD patch
      t0+2..10y : decay subsidence, sinkhole -> negative DoD patch
      overlap of early (+) and later (-) in same neighborhood = candidate.
    """
    from scipy.ndimage import uniform_filter, maximum_filter
    n = len(epochs)
    pos_score = np.zeros_like(epochs[0]); neg_score = np.zeros_like(epochs[0])
    for i in range(n - 1):
        dod, lod = dem_of_difference(epochs[i], epochs[i+1], res)
        dt = years[i+1] - years[i]
        pos = np.clip(dod, 0, None); neg = np.clip(-dod, 0, None)
        # dig/backfill credit in ANY interval (burial date unknown per-cell);
        # the decay phase is what gets windowed, not the dig
        pos_score += pos
        # subsidence credit weighted more in the expected decay window
        w = 1.0 if CFG["sink_window"][0] <= dt <= CFG["sink_window"][1] else 0.5
        neg_score += neg * w
    radius = int(round(1.5 / res))           # grave-sized neighborhood (mound+sink co-locate)
    if radius < 1: radius = 1
    pos_n = uniform_filter(pos_score, size=2*radius+1)
    neg_n = uniform_filter(neg_score, size=2*radius+1)
    score = np.sqrt(np.clip(pos_n * neg_n, 0, None))  # clip: FP dust can make prod < 0
    return score / (score.max() + 1e-9)

# ------------------------------------------------------------- LAYER B -----
def ndvi_anomaly(ndvi_now, ndvi_history_stack):
    """
    Decomposition islands often show an early N-driven green flush then stress.
    Robust anomaly = current NDVI minus pixel-wise seasonal baseline median.
    """
    baseline = np.nanmedian(ndvi_history_stack, axis=0)
    z = (ndvi_now - baseline) / (np.nanstd(ndvi_history_stack, axis=0) + 1e-6)
    return np.clip(np.abs(z), 0, 6) / 6.0

# ------------------------------------------------------------- LAYER C -----
def report_density(points_xy, shape, res, bandwidth_m=200.0):
    """Kernel density of geoparsed case locations -> normalized raster."""
    from scipy.ndimage import gaussian_filter
    k = np.zeros(shape)
    if len(points_xy) == 0: return k
    for x, y in points_xy:
        ix, iy = int(x/res), int(y/res)
        if 0 <= iy < shape[0] and 0 <= ix < shape[1]: k[iy, ix] += 1
    k = gaussian_filter(k, sigma=max(1, bandwidth_m/res))
    return k / (k.max() + 1e-9)

# ------------------------------------------------------------- LAYER D -----
def nitrate_hotspot(samples, shape, res, power=2.0):
    """
    IDW interpolation of field-probe nitrate (mg/kg). Decomposition releases
    a nitrogen pulse: NH4 first, then NO3 as it nitrifies. Spike = hotspot.
    NOTE: nonspecific (fertilizer, septic, livestock) -> only a layer, never proof.
    """
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]] * res
    out = np.zeros(shape)
    wsum = np.zeros(shape)
    for x, y, val in samples:
        d2 = (xx-x)**2 + (yy-y)**2
        w = 1.0 / (d2 + 1.0)**(power/2)
        out += w*val; wsum += w
    out /= (wsum + 1e-9)
    return np.clip(out / CFG["nitrate_threshold_mgkg"], 0, 3) / 3.0

# -------------------------------------------------------------- FUSION -----
def fuse(lidar, ndvi, reports, nitrate):
    s = (CFG["w_lidar"]*lidar + CFG["w_ndvi"]*ndvi +
         CFG["w_reports"]*reports + CFG["w_nitrate"]*nitrate)
    return s / s.max()

def rank_sites(score, res, min_sep_m=5.0, top_n=25):
    """Greedy NMS peak picking -> candidate list with dig priority."""
    from scipy.ndimage import maximum_filter
    mf = maximum_filter(score, size=int(min_sep_m/res))
    peaks = np.argwhere((score == mf) & (score > 0.35))
    ranked = sorted(peaks, key=lambda p: score[p[0], p[1]], reverse=True)
    out = []
    for i, j in ranked[:top_n]:
        out.append({"row": int(i), "col": int(j),
                    "easting": float(j*res), "northing": float(i*res),
                    "score": round(float(score[i, j]), 3)})
    return pd.DataFrame(out)

# ----------------------------------------------------- LAYER E (CONFIRM) ---
def qpcr_quantify(ct_unknown, std_curve, ct_ipc_sample, ct_ipc_control,
                  dna_ng_per_g_soil):
    """
    std_curve: (slope, intercept) of Ct = slope*log10(copies)+intercept.
    Returns dict with copies/g soil, inhibition flag, and an interpretive call.
    Use human-mtDNA HV1 MINI-amplicons (<=160 bp) - published sets exist in
    the forensic literature (e.g., mini-primer sets for degraded samples).
    IPC = internal positive control (spiked plasmid); dCt>1.5 => inhibition.
    """
    slope, intercept = std_curve
    log_copies = (ct_unknown - intercept) / slope
    copies_per_reaction = 10 ** log_copies
    copies_per_g = copies_per_reaction * (50 / max(dna_ng_per_g_soil, 1e-9))  # scale by extraction
    inhibited = (ct_ipc_sample - ct_ipc_control) > 1.5
    if inhibited:
        call = "INHIBITED (humic acids) - dilute 1:10 and re-run"
    elif copies_per_g >= CFG["qpcr_loq_copies_per_g"]:
        call = "CONSISTENT WITH DECOMPOSITION-DERIVED HUMAN DNA - collect profile (mtDNA sequencing + STR if intact)"
    elif copies_per_g > 0:
        call = "HUMAN DNA PRESENT BELOW QUANTIFICATION THRESHOLD - resample deeper/wider"
    else:
        call = "NO DETECTABLE HUMAN mtDNA"
    return {"copies_per_g_soil": copies_per_g, "inhibited": inhibited, "call": call}

# -------------------------------------------------------------- SOURCES ----
SOURCES = {
    "lidar_usgs_3dep": "USGS 3DEP lidar (pdal readers.usgs or OpenTopography API) - historical epochs + fresh drone survey",
    "ndvi_sentinel2": "Copernicus Data Space - S2 L2A, same season, 3+ year baseline",
    "reports": "NamUs API / police CAD export / geoparsed tips CSV",
    "nitrate": "Field probes: ion-selective electrode or colorimetric test kits, 10-20 cores per candidate",
    "lab": "Soil DNA kit with humic removal; qPCR HV1 miniamplicons; Sanger/NGS confirm",
}

def demo():
    """Synthetic ravine scene: 4 planted graves (diff ages) + fertilizer FP.
    Runs the full stack incl. calibrated probability layer."""
    rng = np.random.default_rng(7)
    shape = (400, 400)
    dems, years = [], [2018, 2020, 2023, 2026]
    base = np.cumsum(rng.normal(0, .02, shape), axis=0)
    for yr in years:
        dems.append(base.copy() + rng.normal(0, .03, shape))
    positives = [(120, 300, 2016), (200, 200, 2019), (300, 120, 2021), (90, 90, 2023)]
    for r, c, by in positives:
        plant_grave(dems, years, by, r, c)
    # Detectable iff some epoch pair straddles the burial (mound in record):
    detectable = [(r, c, by) for r, c, by in positives if by > years[0]]
    censored   = [(r, c, by) for r, c, by in positives if by <= years[0]]
    slope = slope_degrees(dems[-1], 1.0)
    lidar = grave_signature_score(dems, years, 1.0)
    ndvi = ndvi_anomaly(rng.normal(.45, .02, shape), rng.normal(.45, .02, (3,)+shape))
    reports = report_density([(198, 260), (210, 250), (60, 60)], shape, 1.0)
    nit_samples = [(c, r, 95) for r, c, _ in positives] + [(60, 60, 120), (250, 250, 110)]
    nit = nitrate_hotspot(nit_samples, shape, 1.0)          # last two = false positives
    total = fuse(lidar, ndvi, reports, nit)
    cconf, lod_max = change_confidence_raster(dems, years, 1.0)
    z_strat = _gistar_z_stratified(total, slope, 1.0, 5.0)
    lab = labels_raster(shape, [(r, c) for r, c, _ in detectable])
    rasters = {"lidar": lidar, "ndvi": ndvi, "reports": reports, "nitrate": nit,
               "slope": np.radians(slope), "change_conf": cconf, "gistar_z": np.nan_to_num(z_strat)}
    feats = list(rasters.keys())
    df = feature_dataframe(rasters, lab, groups=block_groups(shape, 25))
    model, metrics = calibrate_probability(df, feats)
    prob = probability_raster(model, rasters, feats)
    print(f"max epoch LoD: {lod_max:.3f} m")
    print("== CALIBRATION (out-of-fold) =="); print(metrics)
    print("== TOP CANDIDATES (ranked by calibrated P(grave)) ==")
    flat = prob.copy(); flat[lab == 1] = np.nan   # hide training graves: show generalization
    from scipy.ndimage import maximum_filter
    mf = maximum_filter(np.nan_to_num(flat), size=5)
    peaks = np.argwhere(np.isclose(np.nan_to_num(flat), mf) & (flat > 0.5) & (cconf > 0.2))
    ranked = sorted(peaks, key=lambda p: flat[p[0], p[1]], reverse=True)[:8]
    for i, j in ranked:
        print(f"  ({j:3d},{i:3d})  P(grave)={flat[i,j]:.2f}  z={np.nan_to_num(z_strat)[i,j]:5.2f}  "
              f"conf={cconf[i,j]:.2f}  nitrate_fp_here={(60<=i<=66 and 60<=j<=66) or (246<=i<=254 and 246<=j<=254)}")
    print("\n  generalization check at planted graves:")
    for r, c, by in positives:
        tag = "CENSORED (buried before first lidar epoch: lidar timeline blind, need reports/dogs)" if (r, c, by) in censored else "detectable"
        print(f"  {by} burial at ({c},{r}): P(grave)={prob[r,c]:.2f}   [{tag}]")
    print("\n== qPCR CONFIRM MODULE ==")
    print(qpcr_quantify(ct_unknown=28.4, std_curve=(-3.32, 37.9),
                        ct_ipc_sample=24.9, ct_ipc_control=24.6, dna_ng_per_g_soil=12.0))
    print("\nSOURCES:"); [print(f"  {k}: {v}") for k, v in SOURCES.items()]



# ------------------------------------------------- REAL DATA INGESTION -----
def fetch_dem_opentopography(bbox, demtype="AW3D30", api_key=None):
    """Free global DEM via OpenTopography globaldem API (no key needed for
    low-volume use; get a free key at portal.opentopography.org).
    bbox = (minlon, minlat, maxlon, maxlat). Returns (array, res) via rasterio."""
    import requests, rasterio, io
    minlon, minlat, maxlon, maxlat = bbox
    url = ("https://portal.opentopography.org/API/globaldem"
           f"?demtype={demtype}&west={minlon}&south={minlat}"
           f"&east={maxlon}&north={maxlat}&outputFormat=GTiff"
           f"&API_Key={api_key or ''}")
    r = requests.get(url, timeout=120); r.raise_for_status()
    with rasterio.open(io.BytesIO(r.content)) as ds:
        return ds.read(1).astype(float), abs(ds.res[0])

def fetch_lidar_dtm_3dep(bounds_m, ept_url, out_tif, resolution=1.0):
    """USGS 3DEP lidar as Entwine Point Tiles (EPT), public on AWS:
       bucket listing -> pick project URL, e.g.
       https://s3-us-west-2.amazonaws.com/usgs-entwine/...
       Requires the 'pdal' CLI. Builds a bare-earth DTM (ground class only).
    bounds_m: (minx, miny, maxx, maxy) in the EPT CRS."""
    import json, subprocess, tempfile
    minx, miny, maxx, maxy = bounds_m
    pl = {"pipeline": [
        {"type": "readers.ept", "filename": ept_url,
         "bounds": f"([{minx},{maxx}],[{miny},{maxy}])"},
        {"type": "filters.range", "limits": "Classification[2:2]"},   # ground only
        {"type": "writers.gdal", "filename": out_tif, "resolution": resolution,
         "output_type": "mean", "nodata": -9999}]}
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(pl, f); pipe = f.name
    subprocess.run(["pdal", "pipeline", pipe], check=True)
    import rasterio
    with rasterio.open(out_tif) as ds:
        arr = ds.read(1).astype(float); arr[arr == -9999] = np.nan
        return arr, abs(ds.res[0])

def ingest_epochs(sites):
    """sites: list of dicts with either {'bbox': lonlat4, 'demtype': ...}
    or {'bounds_m': ..., 'ept_url': ...}. Returns (epochs, years, res)."""
    epochs, years = [], []
    for s in sites:
        if "ept_url" in s:
            a, res = fetch_lidar_dtm_3dep(s["bounds_m"], s["ept_url"], s.get("out", "epoch.tif"),
                                          s.get("resolution", 1.0))
        else:
            a, res = fetch_dem_opentopography(s["bbox"], s.get("demtype", "AW3D30"),
                                              s.get("api_key"))
        epochs.append(a); years.append(s["year"])
    return epochs, years, res


# --------------------------------------------- GETIS-ORD Gi* HOTSPOTS ------
def _gistar_z(x, res, bandwidth_m):
    from scipy.ndimage import uniform_filter, convolve
    r = max(1, int(round(bandwidth_m / res)))
    k = np.ones((2*r+1, 2*r+1))
    Sw = convolve(np.ones_like(x), k, mode="nearest")          # sum of weights
    local = convolve(x, k, mode="nearest")                     # incl. self (Gi*)
    n = x.size
    xbar = x.mean()
    s = np.sqrt(max((x**2).mean() - xbar**2, 1e-12))
    num = local - xbar * Sw
    den = s * np.sqrt((n * Sw - Sw**2) / (n - 1.0))
    with np.errstate(invalid="ignore", divide="ignore"):
        z = num / den
    z = np.nan_to_num(z)
    z[:r, :] = z[-r:, :] = z[:, :r] = z[:, -r:] = np.nan   # border cells: partial neighborhood -> invalid Gi*
    return z

def rank_sites_gistar(score, res, z_thresh=2.576, min_sep_m=5.0, top_n=25):
    """Gi* hotspot peaks (p < 0.01), greedily non-maximum suppressed."""
    z = _gistar_z(score, res, max(3*res, min_sep_m))
    from scipy.ndimage import maximum_filter
    mf = maximum_filter(z, size=max(1, int(min_sep_m / res)))
    peaks = np.argwhere((z == mf) & (z > z_thresh))
    ranked = sorted(peaks, key=lambda p: z[p[0], p[1]], reverse=True)
    out = [{"row": int(i), "col": int(j), "easting": float(j*res),
            "northing": float(i*res), "gistar_z": round(float(z[i, j]), 2),
            "score": round(float(score[i, j]), 3)} for i, j in ranked[:top_n]]
    return pd.DataFrame(out)



# ------------------------------------- SLOPE STRATIFICATION + CONFIDENCE ---
def slope_degrees(dem, res):
    gy, gx = np.gradient(dem, res)
    return np.degrees(np.arctan(np.hypot(gx, gy)))

def _gistar_z_stratified(x, slope, res, bandwidth_m, edges=(10.0, 25.0)):
    """Gi* computed per slope class so terrain itself can't become the hotspot.
    Neighborhood sums use convolve over stratum-masked arrays; global stats
    (xbar, s, n) are stratum-internal."""
    from scipy.ndimage import convolve
    r = max(1, int(round(bandwidth_m / res)))
    k = np.ones((2*r+1, 2*r+1))
    z = np.full_like(x, np.nan, dtype=float)
    labels = np.digitize(slope, edges)          # 0=flat, 1=moderate, 2=steep
    for cls in range(len(edges) + 1):
        m = (labels == cls)
        if m.sum() < 100: continue
        xm = np.where(m, x, 0.0)
        n = m.sum()
        xbar = x[m].mean()
        s = np.sqrt(max((x[m]**2).mean() - xbar**2, 1e-12))
        Sw = convolve(m.astype(float), k, mode="nearest")
        local = convolve(xm, k, mode="nearest")
        num = local - xbar * Sw
        den = s * np.sqrt((n * Sw - Sw**2) / (n - 1.0))
        with np.errstate(invalid="ignore", divide="ignore"):
            zc = num / den
        z[m] = np.nan_to_num(zc)[m]
    rr = r
    z[:rr, :] = z[-rr:, :] = z[:, :rr] = z[:, -rr:] = np.nan
    return z

def change_confidence_raster(epochs, years, res):
    """Propagate DoD uncertainty -> P(change) per cell per epoch pair using
    the normal tail of |dod|/sigma (sigma = LoD/1.96). Geometric-mean of the
    mound-phase and sink-phase confidences = 'we are X% sure the grave
    TIMELINE happened here', independent of raw magnitude. Returns (conf, lod_max)."""
    from math import erf
    Phi = lambda v: 0.5 * (1.0 + np.vectorize(erf)(v / np.sqrt(2.0)))
    pos_conf = np.zeros_like(epochs[0]); neg_conf = np.zeros_like(epochs[0])
    lod_max = 0.0
    for i in range(len(epochs) - 1):
        dod, lod = dem_of_difference(epochs[i], epochs[i+1], res)
        lod_max = max(lod_max, lod)
        sigma = max(lod / 1.96, 1e-6)
        p_change = 1.0 - 2.0 * (1.0 - Phi(np.abs(dod) / sigma))
        conf = np.clip(p_change, 0.0, 1.0)
        dt = years[i+1] - years[i]
        pos_conf += conf * (dod > 0)
        w = 1.0 if CFG["sink_window"][0] <= dt <= CFG["sink_window"][1] else 0.5
        neg_conf += conf * (dod < 0) * w
    n_pairs = len(epochs) - 1.0
    conf = np.sqrt(np.clip((pos_conf / n_pairs) * (neg_conf / n_pairs), 0, 1.0))
    return conf, lod_max

def rank_sites_gistar(score, res, z_thresh=2.576, min_sep_m=5.0, top_n=25,
                      slope=None, change_conf=None):
    """Stratified Gi* (if slope given) x change confidence (if given).
    Final column = z * conf: statistically significant AND measured above noise."""
    z = _gistar_z_stratified(score, slope, res, max(3*res, min_sep_m)) if slope is not None         else _gistar_z(score, res, max(3*res, min_sep_m))
    final = z if change_conf is None else z * change_conf
    from scipy.ndimage import maximum_filter
    mf = maximum_filter(np.nan_to_num(final, nan=-np.inf),
                        size=max(1, int(min_sep_m / res)))
    peaks = np.argwhere(np.isclose(np.nan_to_num(final, nan=-np.inf), mf) & (final > z_thresh))
    ranked = sorted(peaks, key=lambda p: final[p[0], p[1]], reverse=True)
    rows = []
    for i, j in ranked[:top_n]:
        rows.append({"row": int(i), "col": int(j), "easting": float(j*res),
                     "northing": float(i*res),
                     "gistar_z": round(float(z[i, j]), 2),
                     "change_conf": None if change_conf is None else round(float(change_conf[i, j]), 3),
                     "final": round(float(final[i, j]), 2),
                     "score": round(float(score[i, j]), 3)})
    return pd.DataFrame(rows)



# ------------------------------------------- CALIBRATED PROBABILITY LAYER ---
def plant_grave(dems, years, burial_year, row, col,
                mound_m=0.30, sink_m=0.06, radius=2):
    """Synthetic ground-truth generator for calibration development:
    add mound->sink timeline to the DEM stack at (row, col)."""
    for dem, yr in zip(dems, years):
        t = yr - burial_year
        if t >= 0:
            yy, xx = np.mgrid[-radius:radius+1, -radius:radius+1]
            g = np.exp(-(xx**2 + yy**2) / (2 * (radius/2.0)**2))
            dem[row-radius:row+radius+1, col-radius:col+radius+1] += mound_m * max(0, 1 - t/3.0) * g
        if t >= 2:
            yy, xx = np.mgrid[-radius+1:radius, -radius+1:radius]
            g = np.exp(-(xx**2 + yy**2) / (2 * (radius/3.0)**2))
            dem[row-radius+1:row+radius, col-radius+1:col+radius] -= sink_m * min(t/3.0, 1.0) * g

def labels_raster(shape, positives, radius=2):
    lab = np.zeros(shape, dtype=int)
    for r, c in positives:
        lab[max(0,r-radius):r+radius+1, max(0,c-radius):c+radius+1] = 1
    return lab

def block_groups(shape, block_size=25):
    """Spatial block ids for grouped CV - random folds leak via spatial
    autocorrelation (grave cells neighbor other grave cells)."""
    r, c = np.indices(shape)
    return (r // block_size * (shape[1] // block_size + 1) + c // block_size).ravel()

def feature_dataframe(rasters, labels, max_negatives=4000, seed=0, groups=None):
    """Stack named rasters into a cell-level dataframe, balancing negatives."""
    rng = np.random.default_rng(seed)
    cols = {k: np.asarray(v).ravel() for k, v in rasters.items()}
    cols["label"] = labels.ravel()
    if groups is not None: cols["group"] = groups
    df = pd.DataFrame(cols).dropna()
    pos = df[df.label == 1]; neg = df[df.label == 0]
    if len(neg) > max_negatives:
        neg = neg.iloc[rng.choice(len(neg), max_negatives, replace=False)]
    return pd.concat([pos, neg]).sample(frac=1.0, random_state=seed).reset_index(drop=True)

# ----------------------------------------- MODEL CHOICE + COUNTY SWEEP -----
def make_base(model_type):
    if model_type == "logistic":
        from sklearn.linear_model import LogisticRegression
        return LogisticRegression(max_iter=5000, class_weight="balanced")
    from sklearn.ensemble import HistGradientBoostingClassifier
    return HistGradientBoostingClassifier(max_iter=200, learning_rate=0.08,
                                          class_weight="balanced", random_state=0)

def calibrate_probability(df, feature_cols, method="sigmoid", n_splits=5,
                          model_type="logistic"):
    """Now supports model_type='gbm'. Same blocked-CV honesty rules apply."""
    from sklearn.model_selection import StratifiedKFold, StratifiedGroupKFold, cross_val_predict
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
    X, y = df[feature_cols].values, df["label"].values
    base = make_base(model_type)
    if "group" in df.columns:
        cv = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=0)
        split_kw = {"groups": df["group"].values}
    else:
        cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=0)
        split_kw = {}
    oof = cross_val_predict(CalibratedClassifierCV(base, cv=3, method=method),
                            X, y, cv=cv, method="predict_proba", **split_kw)[:, 1]
    metrics = {"n_pos": int(y.sum()), "n_neg": int((1-y).sum()),
               "brier": round(float(brier_score_loss(y, oof)), 4),
               "log_loss": round(float(log_loss(y, oof)), 4),
               "auc": round(float(roc_auc_score(y, oof)), 3)}
    model = CalibratedClassifierCV(make_base(model_type), cv=5, method=method).fit(X, y)
    return model, metrics

def candidates_from_prob(prob, cconf, res, origin_xy, p_thresh=0.5, conf_thresh=0.2,
                         min_sep_m=5.0, top_n=50):
    """NMS peaks on calibrated probability, reported in world coordinates."""
    from scipy.ndimage import maximum_filter
    mf = maximum_filter(prob, size=max(1, int(min_sep_m / res)))
    # Layer-alignment tolerance: prob peaks are driven by SMOOTH layers (nitrate
    # IDW, gaussian fusion), change_conf by HARD-THRESHOLDED DoD - their maxima
    # can sit 1-2 cells apart (found in integration: exact-cell gate dropped a
    # real grave with P=0.96). Gate on neighborhood-max confidence instead.
    cc_gate = maximum_filter(cconf, size=max(3, int(min_sep_m / res)))
    peaks = np.argwhere(np.isclose(prob, mf) & (prob > p_thresh) & (cc_gate > conf_thresh))

    ranked = sorted(peaks, key=lambda p: prob[p[0], p[1]], reverse=True)
    rows = []
    for i, j in ranked[:top_n]:
        rows.append({"easting": round(origin_xy[0] + j*res, 1),
                     "northing": round(origin_xy[1] + i*res, 1),
                     "P_grave": round(float(prob[i, j]), 3),
                     "change_conf": round(float(cc_gate[i, j]), 3)})  # neighborhood-max: what the gate used
    return pd.DataFrame(rows)

def dedupe_candidates(df, min_sep_m=10.0):
    """Greedy spatial dedupe across tiles (graves near tile edges double-count)."""
    keep = []
    for _, row in df.sort_values("P_grave", ascending=False).iterrows():
        if all(math.hypot(row.easting - k.easting, row.northing - k.northing) >= min_sep_m
               for k in keep):
            keep.append(row)
    return pd.DataFrame(keep).reset_index(drop=True)

def county_sweep(tiles, model, feats):
    """tiles: list of dicts {origin_xy, dems, years, rasters_extra}. One calibrated
    model propagates to every tile -> single deduped, ranked county list."""
    out = []
    for t in tiles:
        res = t.get("res", 1.0)
        rasters = t["rasters"]
        prob = probability_raster(model, rasters, feats)
        df = candidates_from_prob(prob, rasters["change_conf"], res, t["origin_xy"])
        df["tile"] = t.get("name", "?"); out.append(df)
    merged = pd.concat(out, ignore_index=True) if out else pd.DataFrame()
    return dedupe_candidates(merged) if len(merged) else merged

def probability_raster(model, rasters, feature_cols):
    """Predicted P(grave | features) for every valid cell."""
    fill = {k: np.nanmean(v) for k, v in rasters.items()}
    X = np.column_stack([np.nan_to_num(np.asarray(rasters[c]).ravel(), nan=fill[c]) for c in feature_cols])
    p = model.predict_proba(X)[:, 1]
    return p.reshape(next(iter(rasters.values())).shape)



# ------------------------------------------- REAL-SITE RECALIBRATION -------
def labels_from_sites_csv(path, shape, res, origin_xy, years, radius=2):
    """Labeled real sites: CSV cols = easting, northing, burial_year[, type].
    Returns (labels, censored_list). Sites buried before the first lidar
    epoch are censored, NOT negatives - they are outside the method's window."""
    df = pd.read_csv(path)
    lab = np.zeros(shape, dtype=int); censored = []
    for _, s in df.iterrows():
        r = int((s.northing - origin_xy[1]) / res); c = int((s.easting - origin_xy[0]) / res)
        if not (0 <= r < shape[0] and 0 <= c < shape[1]): continue
        if s.burial_year <= years[0]:
            censored.append((s.easting, s.northing, s.burial_year)); continue
        lab[max(0,r-radius):r+radius+1, max(0,c-radius):c+radius+1] = 1
    return lab, censored

# ------------------------------------------------- LOD EXPERIMENT --------
def demo_lod_experiment():
    """Does drone-grade lidar close the gap for weak/old burials?
    Compares 3DEP-like noise (sigma=0.03 m) vs drone (sigma=0.012 m)."""
    shape = (400, 400); years = [2018, 2020, 2023, 2026]
    rng = np.random.default_rng(7)
    base = np.cumsum(rng.normal(0, .02, shape), axis=0)
    sites = [(120, 300, 2021), (200, 200, 2019), (90, 90, 2023)]   # the three detectable graves
    print("== LOD EXPERIMENT: 3DEP-grade vs drone-grade lidar ==")
    print(f"{'noise sigma':>11} {'max LoD':>8} {'P(2019)':>8} {'P(2021)':>8} {'P(2023)':>8} {'AUC(blocked)':>13}")
    for sigma, tag in [(0.030, "3DEP"), (0.012, "drone")]:
        dems = [base.copy() + rng.normal(0, sigma, shape) for _ in years]
        for r, c, by in sites: plant_grave(dems, years, by, r, c)
        slope = slope_degrees(dems[-1], 1.0)
        lidar = grave_signature_score(dems, years, 1.0)
        ndvi = ndvi_anomaly(rng.normal(.45, .02, shape), rng.normal(.45, .02, (3,)+shape))
        reports = report_density([(198, 260), (210, 250)], shape, 1.0)
        nit = nitrate_hotspot([(c, r, 95) for r, c, _ in sites] + [(250, 250, 110)], shape, 1.0)
        total = fuse(lidar, ndvi, reports, nit)
        cconf, lod_max = change_confidence_raster(dems, years, 1.0)
        z_strat = _gistar_z_stratified(total, slope, 1.0, 5.0)
        lab = labels_raster(shape, [(r, c) for r, c, _ in sites])
        rasters = {"lidar": lidar, "ndvi": ndvi, "reports": reports, "nitrate": nit,
                   "slope": np.radians(slope), "change_conf": cconf,
                   "gistar_z": np.nan_to_num(z_strat)}
        df = feature_dataframe(rasters, lab, groups=block_groups(shape, 25), seed=1)
        model, metrics = calibrate_probability(df, list(rasters.keys()))
        prob = probability_raster(model, rasters, list(rasters.keys()))
        ps = [prob[r, c] for r, c, _ in sites]
        print(f"{sigma:>11.3f} {lod_max:>8.3f} {ps[1]:>8.2f} {ps[0]:>8.2f} {ps[2]:>8.2f} {metrics['auc']:>13.3f}   <- {tag}")

def make_tile(seed, shape=(300, 300), graves=(), years=(2018, 2020, 2023, 2026), sigma=0.03):
    """One synthetic county tile with planted graves -> (dems, rasters, labels)."""
    rng = np.random.default_rng(seed)
    base = np.cumsum(rng.normal(0, .02, shape), axis=0)   # terrain must persist across epochs
    dems = [base.copy() + rng.normal(0, sigma, shape) for _ in years]
    for r, c, by in graves: plant_grave(dems, list(years), by, r, c)
    slope = slope_degrees(dems[-1], 1.0)
    lidar = grave_signature_score(dems, list(years), 1.0)
    ndvi = ndvi_anomaly(rng.normal(.45, .02, shape), rng.normal(.45, .02, (3,)+shape))
    reports = report_density([(g[1], g[0]) for g in graves], shape, 1.0)
    nit = nitrate_hotspot([(g[1], g[0], 95) for g in graves], shape, 1.0)   # (x=col, y=row)
    total = fuse(lidar, ndvi, reports, nit)
    cconf, _ = change_confidence_raster(dems, list(years), 1.0)
    z_strat = _gistar_z_stratified(total, slope, 1.0, 5.0)
    rasters = {"lidar": lidar, "ndvi": ndvi, "reports": reports, "nitrate": nit,
               "slope": np.radians(slope), "change_conf": cconf,
               "gistar_z": np.nan_to_num(z_strat)}
    lab = labels_raster(shape, [(g[0], g[1]) for g in graves if g[2] > years[0]])
    return dems, rasters, lab

def demo_county_sweep():
    """Calibrate on tile A, propagate to tiles B-D, merge world-ranked list."""
    print("== COUNTY SWEEP (calibrate A, predict B-D) + MODEL COMPARISON ==")
    years = [2018, 2020, 2023, 2026]
    A = make_tile(11, graves=[(100, 100, 2019), (200, 220, 2021), (150, 260, 2023)])
    B = make_tile(22, graves=[(120, 180, 2020)])
    C = make_tile(33, graves=[])
    D = make_tile(44, graves=[(80, 250, 2022), (210, 90, 2023)])
    feats = list(A[1].keys())
    dfA = feature_dataframe(A[1], A[2], groups=block_groups(A[2].shape, 25), seed=3)
    for mt in ("logistic", "gbm"):
        model, metrics = calibrate_probability(dfA, feats, model_type=mt)
        print(f"  [{mt:>8}] blocked-CV {metrics}")
    model, _ = calibrate_probability(dfA, feats, model_type="gbm")
    tiles = [{"name": n, "origin_xy": o, "dems": t[0], "years": years, "rasters": t[1]}
             for t, o, n in [(A, (0, 0), "A"), (B, (300, 0), "B"), (C, (0, 300), "C"), (D, (300, 300), "D")]]
    ranked = county_sweep(tiles, model, feats)
    print(f"  merged candidates: {len(ranked)} (2 planted in B/D should top the list, C should be empty)")
    print(ranked.head(8).to_string(index=False) if len(ranked) else "  none - check thresholds")



# ------------------------------------------- SITE-LEVEL OPERATING CURVE ----
def detection_curve(prob, cconf, sites, res, conf_thresh=0.2,
                    p_grid=None, hit_radius_m=5.0):
    """Site-level sweep of the P gate. A site HITS if any cell within
    hit_radius_m passes both gates; a connected passed-region with no site
    inside hit_radius_m is a FALSE ALARM. Returns DataFrame with
    precision/recall/F1 per threshold - the honest operating curve, because
    cell-level AUC hides the NMS/dedupe behavior a search team actually sees."""
    from scipy.ndimage import maximum_filter, label
    r = max(1, int(round(hit_radius_m / res)))
    cc_gate = maximum_filter(cconf, size=max(3, 2*r + 1))
    if p_grid is None:
        p_grid = np.round(np.linspace(0.05, 0.95, 19), 2)
    rows = []
    for pt in p_grid:
        passed = (prob > pt) & (cc_gate > conf_thresh)
        hits = sum(passed[max(0,i-r):i+r+1, max(0,j-r):j+r+1].any() for i, j in sites)
        lab, n_reg = label(passed)
        fa = 0
        for k in range(1, n_reg + 1):
            ys, xs = np.where(lab == k)
            if not any(((np.abs(ys - i) <= r) & (np.abs(xs - j) <= r)).any() for i, j in sites):
                fa += 1
        prec = hits / (hits + fa) if (hits + fa) else 1.0
        rec = hits / len(sites) if sites else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
        rows.append({"p_thresh": pt, "hits": hits, "sites": len(sites),
                     "false_alarms": fa, "precision": round(prec, 3),
                     "recall": round(rec, 3), "f1": round(f1, 3)})
    return pd.DataFrame(rows)

def best_threshold(curve):
    row = curve.loc[curve.f1.idxmax()]
    return float(row.p_thresh), row

if __name__ == "__main__":
    demo()
    print()
    demo_lod_experiment()
    print()
    demo_county_sweep()
