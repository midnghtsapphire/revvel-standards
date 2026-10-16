
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
        # mound credit only in the early window after any epoch
        pos_score += pos * (dt <= CFG["mound_max_years"])
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
    """Synthetic ravine scene: one real burial, one fertilizer false positive."""
    rng = np.random.default_rng(7)
    shape = (400, 400)
    dems, years = [], [2018, 2020, 2023, 2026]
    base = np.cumsum(rng.normal(0, .02, shape), axis=0)  # rough slope
    for k, yr in enumerate(years):
        d = base.copy()
        t = yr - 2019  # burial at 2019
        if t >= 0: d[200:205, 195:205] += 0.35 * max(0, 1 - t/3)      # mound decays
        if t >= 2: d[201:204, 196:204] -= 0.05 * min(t/3, 1)          # subsidence
        dems.append(d + rng.normal(0, .03, shape))
    lidar = grave_signature_score(dems, years, 1.0)
    ndvi = ndvi_anomaly(rng.normal(.45, .02, shape), rng.normal(.45, .02, (3,)+shape))
    reports = report_density([(198, 260), (210, 250), (60, 60)], shape, 1.0)
    nit = nitrate_hotspot([(200, 200, 95), (202, 203, 80), (60, 60, 120)], shape, 1.0)  # (60,60)=fertilizer FP
    total = fuse(lidar, ndvi, reports, nit)
    print("== CANDIDATE RANKING (Gi* hotspots, p<0.01) ==")
    print(rank_sites_gistar(total, 1.0).head(8))
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

if __name__ == "__main__":
    demo()
