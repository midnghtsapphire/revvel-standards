#!/usr/bin/env python3
"""
run_county.py - real-data county pipeline driver.

Flow (all of it, no stubs):
  1. tile AOI -> grid of tiles (origin_xy each)
  2. per tile: ingest_epochs (USGS 3DEP EPT via PDAL / OpenTopography DEM) -> rasters
  3. labels_from_sites_csv per tile (censoring respected)
  4. calibrate on labeled tiles (blocked CV, one global group space)
  5. county_sweep -> deduped ranked candidates (world coords)
  6. export: candidates.csv + per-tile probability GeoTIFFs

Usage:
  python run_county.py config.json
  python run_county.py --demo        # offline synthetic integration test

config.json:
{
  "bbox": [min_e, min_n, max_e, max_n],       // projected CRS, meters
  "tile_m": 1000,
  "res": 1.0,
  "crs": "EPSG:XXXXX",
  "years": [2018, 2020, 2023, 2026],
  "epochs": [                                // one entry per year
     {"year": 2018, "ept_url": "https://s3-us-west-2.amazonaws.com/usgs-entwine/<proj>", "bounds_m": [..]},
     {"year": 2021, "bbox": [lon0, lat0, lon1, lat1], "demtype": "AW3D30", "api_key": null}
  ],
  "sites_csv": "known_sites.csv",            // cols: easting,northing,burial_year
  "model_type": "gbm",
  "out_dir": "county_run"
}
"""
import sys, os, json, math
import numpy as np, pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from remains_anomaly_pipeline import (ingest_epochs, labels_from_sites_csv,
    feature_dataframe, block_groups, calibrate_probability, county_sweep,
    probability_raster, slope_degrees, grave_signature_score, ndvi_anomaly,
    report_density, nitrate_hotspot, fuse, change_confidence_raster,
    _gistar_z_stratified, make_tile)

# --------------------------------------------------------------- tiling ----
def tile_aoi(bbox, tile_m, res):
    """AOI bbox -> tile list with origins + cell counts (last tile ragged)."""
    min_e, min_n, max_e, max_n = bbox
    tiles = []
    n_e = math.ceil((max_e - min_e) / tile_m); n_n = math.ceil((max_n - min_n) / tile_m)
    for i in range(n_n):
        for j in range(n_e):
            o_e, o_n = min_e + j*tile_m, min_n + i*tile_m
            cols = int(min(tile_m, max_e - o_e) / res)
            rows = int(min(tile_m, max_n - o_n) / res)
            tiles.append({"name": f"T{i:02d}-{j:02d}", "origin_xy": (o_e, o_n),
                          "shape": (rows, cols), "res": res})
    return tiles

# ---------------------------------------------------------- tile build -----
def build_tile(tile, cfg):
    """Real data: per-tile EPT bounds from tile extent, or OpenTopometry bbox.
    Returns dict ready for county_sweep."""
    epochs = []
    for e in cfg["epochs"]:
        e2 = dict(e)
        if "bounds_m" in e2:  # EPT: shift source bounds to this tile's extent
            if e2.get("per_tile_bounds"):
                x0, y0 = tile["origin_xy"]; rows, cols = tile["shape"]
                e2["bounds_m"] = (x0, y0, x0 + cols*tile["res"], y0 + rows*tile["res"])
                e2["out"] = f'/tmp/{tile["name"]}_{e2["year"]}.tif'
        epochs.append(e2)
    dems, years, res = ingest_epochs(epochs)
    # co-register to tile grid if sources disagree: reproject/resample step
    # belongs here in production (rasterio.warp) - sources must share CRS/grid.
    rasters = compute_tile_rasters(dems, years, res, tile)
    return {"name": tile["name"], "origin_xy": tile["origin_xy"], "dems": dems,
            "years": years, "res": res, "rasters": rasters}

def compute_tile_rasters(dems, years, res, tile):
    """Layers A-D + conf + z for one tile. ndvi/reports/nitrate plug in here
    from real sources (Copernicus, NamUs, probe grid) - pass via tile dict."""
    slope = slope_degrees(dems[-1], res)
    lidar = grave_signature_score(dems, years, res)
    ndvi = tile.get("ndvi_raster") or np.zeros_like(lidar)
    reports = tile.get("report_pts") and report_density(tile["report_pts"], lidar.shape, res) or np.zeros_like(lidar)
    nit = tile.get("nitrate_samples") and nitrate_hotspot(tile["nitrate_samples"], lidar.shape, res) or np.zeros_like(lidar)
    total = fuse(lidar, ndvi, reports, nit)
    cconf, _ = change_confidence_raster(dems, years, res)
    z = _gistar_z_stratified(total, slope, res, max(3*res, 5.0))
    return {"lidar": lidar, "ndvi": ndvi, "reports": reports, "nitrate": nit,
            "slope": np.radians(slope), "change_conf": cconf,
            "gistar_z": np.nan_to_num(z)}

# ------------------------------------------------------------- training ----
def train_from_sites(sites_csv, labeled_tiles, feats, model_type):
    """labeled_tiles: [{origin_xy, res, rasters, shape, years}...] that intersect
    the sites CSV. Groups globally offset so blocked CV spans tiles."""
    dfs = []; gmax = 0
    for t in labeled_tiles:
        lab, censored = labels_from_sites_csv(sites_csv, t["shape"], t["res"],
                                              t["origin_xy"], t["years"])
        if lab.sum() == 0: continue
        g = block_groups(t["shape"], 25) + gmax
        gmax = g.max() + 1
        dfs.append(feature_dataframe(t["rasters"], lab, groups=g, seed=5))
        for e, n, y in censored:
            print(f"  [censored] site at ({e},{n}) buried {y}: pre-window, excluded from training")
    if not dfs: raise SystemExit("No labeled cells - cannot calibrate.")
    df = pd.concat(dfs, ignore_index=True)
    model, metrics = calibrate_probability(df, feats, model_type=model_type)
    return model, metrics

# ---------------------------------------------------------------- export ---
def write_geotiff(path, array, origin_xy, res, crs="EPSG:UNKNOWN"):
    """Probability/Confidence raster with georeferencing. Falls back to .npy +
    worldfile if rasterio is unavailable."""
    try:
        import rasterio
        from rasterio.transform import from_origin
        tr = from_origin(origin_xy[0], origin_xy[1] + array.shape[0]*res, res, res)
        with rasterio.open(path, "w", driver="GTiff", height=array.shape[0],
                           width=array.shape[1], count=1, dtype="float32",
                           crs=crs, transform=tr) as ds:
            ds.write(array.astype("float32"), 1)
        return path
    except ImportError:
        np.save(path.replace(".tif", ".npy"), array)
        with open(path.replace(".tif", ".pgw"), "w") as f:
            f.write(f"{res}\n0\n0\n{-res}\n{origin_xy[0]}\n{origin_xy[1] + array.shape[0]*res}\n")
        return path.replace(".tif", ".npy")

# ------------------------------------------------------------------ run ----
def run(cfg):
    out = cfg["out_dir"]; os.makedirs(out, exist_ok=True)
    tiles = tile_aoi(cfg["bbox"], cfg["tile_m"], cfg["res"])
    print(f"AOI tiled into {len(tiles)} tiles")
    built = [build_tile(t, cfg) for t in tiles]
    # labeled = tiles intersecting sites CSV
    sites = pd.read_csv(cfg["sites_csv"])
    def intersects(t):
        x0, y0 = t["origin_xy"]; x1 = x0 + t["shape"][1]*t["res"]; y1 = y0 + t["shape"][0]*t["res"]
        return ((sites.easting >= x0) & (sites.easting < x1) &
                (sites.northing >= y0) & (sites.northing < y1)).any()
    labeled = [t for t in built if intersects(t)]
    print(f"calibration tiles: {[t['name'] for t in labeled]}")
    feats = list(built[0]["rasters"].keys())
    model, metrics = train_from_sites(cfg["sites_csv"], labeled, feats, cfg.get("model_type", "gbm"))
    print("blocked-CV:", metrics)
    ranked = county_sweep(built, model, feats)
    ranked.to_csv(os.path.join(out, "candidates.csv"), index=False)
    for t in built:
        p = probability_raster(model, t["rasters"], feats)
        write_geotiff(os.path.join(out, f"prob_{t['name']}.tif"), p,
                      t["origin_xy"], t["res"], cfg.get("crs", "EPSG:UNKNOWN"))
    print(f"wrote {os.path.join(out, 'candidates.csv')} + prob_*.tif for {len(built)} tiles")
    return ranked

def demo():
    """Offline integration test of the full plumbing with synthetic tiles."""
    import tempfile
    out = "/mnt/agents/output/demo_run"; os.makedirs(out, exist_ok=True)
    cfg = {"bbox": [0, 0, 600, 600], "tile_m": 300, "res": 1.0,
           "crs": "EPSG:32613", "years": [2018, 2020, 2023, 2026],
           "model_type": "gbm", "out_dir": out}
    demo_tiles = {
        "T00-00": make_tile(11, graves=[(100,100,2019),(200,220,2021),(150,260,2023)]),
        "T00-01": make_tile(22, graves=[(120,180,2020)]),
        "T01-00": make_tile(33, graves=[]),
        "T01-01": make_tile(44, graves=[(80,250,2022),(210,90,2023)]),
    }
    origins = {"T00-00": (0,0), "T00-01": (300,0), "T01-00": (0,300), "T01-01": (300,300)}
    # real sites CSV in world coords, incl. one censored pre-window site
    sites = [(100,100,2019),(220,200,2021),(260,150,2023),
             (480,120,2020),(550,380,2022),(390,510,2023),(150,150,2010)]
    csv_path = os.path.join(out, "known_sites.csv")
    pd.DataFrame(sites, columns=["easting","northing","burial_year"]).to_csv(csv_path, index=False)
    cfg["sites_csv"] = csv_path
    # pre-built rasters bypass build_tile in demo (no network)
    built = [{"name": n, "origin_xy": origins[n], "dems": t[0], "years": cfg["years"],
              "res": 1.0, "rasters": t[1], "shape": t[2].shape} for n, t in demo_tiles.items()]
    labeled = [b for b in built if b["name"] == "T00-00"]
    feats = list(built[0]["rasters"].keys())
    model, metrics = train_from_sites(csv_path, labeled, feats, cfg["model_type"])
    print("blocked-CV:", metrics)
    ranked = county_sweep(built, model, feats)
    ranked.to_csv(os.path.join(out, "candidates.csv"), index=False)
    for b in built:
        p = probability_raster(model, b["rasters"], feats)
        write_geotiff(os.path.join(out, f"prob_{b['name']}.tif"), p, b["origin_xy"], 1.0, cfg["crs"])
    print("== RANKED CANDIDATES (world coords, expect hits near (480,120),(550,380),(390,510); no hits in T01-00) ==")
    print(ranked.to_string(index=False) if len(ranked) else "NONE")
    print("outputs in", out)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        demo()
    elif len(sys.argv) > 1:
        run(json.load(open(sys.argv[1])))
    else:
        print(__doc__)
