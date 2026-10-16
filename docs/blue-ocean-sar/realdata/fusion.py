#!/usr/bin/env python3
"""Combine real per-site layer values into a ranked, fully traceable site table.

Replaces the "SFAI probability" in ryverly_recon_app-v6.py (docs/case-files),
which multiplied typed-in anomaly scores by invented post-mortem-interval
"decay" curves and pushed the sum through a sigmoid labelled as a probability.

What it does:
  1. Reads a JSON config naming the layers, their source files and the weight
     YOU give each. There are no built-in weights and no time-decay curves;
     if you want weights that depend on elapsed time, set them in the config.
  2. Gets one raw value per site per layer from:
       table    - a CSV keyed by site ID (any tool's output you tabulated)
       features - a JSON list of point features with lat/lon, e.g.
                  dem_terrain.py "depressions" or "patches",
                  s2_change.py "loss_clusters" / "ponds", or a GeoJSON
                  FeatureCollection; the nearest feature within
                  max_distance_m supplies the value
       raster   - a GeoTIFF sampled at the site (needs numpy and rasterio),
                  e.g. dem_terrain.py *_lrm.tif / *_dod.tif, s2_change.py dndvi.tif
  3. Normalises each layer across the sites (robust z = (v - median) / (1.4826
     MAD), or rank percentile in [0, 1]); "direction": "lower" flips the sign
     so that more-anomalous is always higher; "transform": "abs" uses |v|.
  4. score = sum(weight * normalised) / sum(weight), over all layers
     ("missing": "zero", a missing value contributes 0) or over the layers the
     site has ("missing": "renormalise").

Every output site lists, for every layer, the raw value, where it came from,
the normalised value, the weight and the contribution, so the score can be
recomputed by hand.

The score is a relative ranking of THESE sites under THESE weights. It is not
a probability and does not say that anything is buried anywhere.

Config example (paths are relative to the config file):
  {
    "sites": "sites.csv",
    "missing": "zero",
    "layers": [
      {"name": "dtm_depression_m", "type": "features", "file": "td.json", "path": "depressions",
       "field": "max_depth_m", "max_distance_m": 5, "fill_value": 0, "weight": 2},
      {"name": "s2_ndvi_loss_z", "type": "features", "file": "out/change_summary.json",
       "path": "loss_clusters", "field": "mean_z", "max_distance_m": 15, "fill_value": 0,
       "direction": "lower", "weight": 1},
      {"name": "dod_m", "type": "raster", "file": "change_dod.tif", "buffer_m": 1, "stat": "min",
       "direction": "lower", "weight": 1, "normalise": "rank_pct"}
    ]
  }
sites.csv has columns site_id, lat, lon (lat/lon are needed only for features and raster layers).

  python fusion.py --config fusion_config.json --out ranked_sites.json --csv ranked_sites.csv
"""

import argparse
import csv
import hashlib
import json
import math
import os
import statistics
import sys

SCORE_KIND = ("relative ranking of the listed sites under the configured weights; not a probability and not "
              "evidence that anything is at any site")
NORMALISERS = ("robust_z", "rank_pct")
LAYER_TYPES = ("table", "features", "raster")


class ConfigError(ValueError):
    pass


# --------------------------------------------------------------------------- reading

def _float(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None


def _read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def read_sites(path, id_col="site_id"):
    sites = {}
    for i, r in enumerate(_read_csv(path), start=2):
        sid = (r.get(id_col) or "").strip()
        if not sid:
            raise ConfigError(f"{path}: line {i} has no {id_col}")
        if sid in sites:
            raise ConfigError(f"{path}: duplicate site {sid!r}")
        sites[sid] = {"lat": _float(r.get("lat")), "lon": _float(r.get("lon"))}
    if not sites:
        raise ConfigError(f"{path}: no sites")
    return sites


def haversine_m(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371008.8 * math.asin(math.sqrt(a))


def _dig(obj, path):
    for part in [p for p in (path or "").split(".") if p]:
        obj = obj[int(part)] if isinstance(obj, list) else obj[part]
    return obj


def _load_features(layer):
    with open(layer["_file"], encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and data.get("type") == "FeatureCollection":
        out = []
        for i, ft in enumerate(data.get("features", [])):
            g = ft.get("geometry") or {}
            if g.get("type") != "Point":
                continue
            props = ft.get("properties") or {}
            out.append((i, g["coordinates"][1], g["coordinates"][0], props.get(layer["field"])))
        return out
    try:
        items = _dig(data, layer.get("path"))
    except (KeyError, IndexError, TypeError, ValueError):
        raise ConfigError(f"layer {layer['name']}: path {layer.get('path')!r} not found in {layer['file']}") from None
    if not isinstance(items, list):
        raise ConfigError(f"layer {layer['name']}: {layer.get('path')!r} in {layer['file']} is not a list")
    return [(i, _float(it.get("lat")), _float(it.get("lon")), it.get(layer["field"])) for i, it in enumerate(items)]


def values_table(layer, site_ids, sites):
    rows = _read_csv(layer["_file"])
    key, col = layer.get("key", "site_id"), layer["column"]
    if rows and (key not in rows[0] or col not in rows[0]):
        raise ConfigError(f"layer {layer['name']}: {layer['file']} needs columns {key!r} and {col!r}")
    by = {}
    for i, r in enumerate(rows, start=2):
        sid = (r.get(key) or "").strip()
        if sid in by:
            raise ConfigError(f"layer {layer['name']}: site {sid!r} appears twice in {layer['file']}")
        by[sid] = (_float(r.get(col)), i)
    out = {}
    for sid in site_ids:
        v, line = by.get(sid, (None, None))
        out[sid] = (v, {"file": layer["file"], "column": col, "csv_line": line})
    return out


def values_features(layer, site_ids, sites):
    feats = _load_features(layer)
    maxd = layer["max_distance_m"]
    fill = layer.get("fill_value")
    out = {}
    for sid in site_ids:
        s = sites.get(sid) or {}
        if s.get("lat") is None or s.get("lon") is None:
            raise ConfigError(f"layer {layer['name']}: site {sid!r} has no lat/lon in the sites file")
        best = None
        for idx, la, lo, val in feats:
            if la is None or lo is None:
                continue
            d = haversine_m(s["lat"], s["lon"], la, lo)
            if d <= maxd and (best is None or d < best[0]):
                best = (d, idx, val)
        src = {"file": layer["file"], "path": layer.get("path"), "field": layer["field"], "max_distance_m": maxd}
        if best is not None:
            src.update({"feature_index": best[1], "distance_m": round(best[0], 3)})
            out[sid] = (_float(best[2]), src)
        elif fill is not None:
            src["filled"] = f"no feature within {maxd} m; fill_value used"
            out[sid] = (float(fill), src)
        else:
            src["missing"] = f"no feature within {maxd} m"
            out[sid] = (None, src)
    return out


def values_raster(layer, site_ids, sites):
    try:
        import numpy as np
        import rasterio
        from rasterio.warp import transform as warp
    except ImportError:
        raise ConfigError(f"layer {layer['name']}: raster layers need numpy and rasterio") from None
    buf, stat = float(layer.get("buffer_m", 0.0)), layer.get("stat", "mean")
    if stat not in ("mean", "median", "min", "max"):
        raise ConfigError(f"layer {layer['name']}: stat must be mean, median, min or max")
    out = {}
    with rasterio.open(layer["_file"]) as src:
        arr = src.read(1, masked=True).astype("f8").filled(np.nan)
        res = abs(src.transform.a)
        per_px = res * 111320.0 if src.crs and src.crs.is_geographic else res
        k = int(math.ceil(buf / per_px)) if buf > 0 else 0
        for sid in site_ids:
            s = sites.get(sid) or {}
            if s.get("lat") is None or s.get("lon") is None:
                raise ConfigError(f"layer {layer['name']}: site {sid!r} has no lat/lon in the sites file")
            (x,), (y,) = warp("EPSG:4326", src.crs, [s["lon"]], [s["lat"]])
            r, c = src.index(x, y)
            meta = {"file": layer["file"], "row": int(r), "col": int(c), "buffer_m": buf, "stat": stat}
            if not (0 <= r < arr.shape[0] and 0 <= c < arr.shape[1]):
                out[sid] = (None, dict(meta, missing="site outside raster"))
                continue
            win = arr[max(0, r - k):r + k + 1, max(0, c - k):c + k + 1]
            win = win[np.isfinite(win)]
            v = None if win.size == 0 else float(getattr(np, stat)(win))
            out[sid] = (v, dict(meta, cells=int(win.size)))
    return out


READERS = {"table": values_table, "features": values_features, "raster": values_raster}


# --------------------------------------------------------------------------- normalising

def _rank_pct(vals):
    """Average-rank percentile in [0, 1]; a single value gets 0.5."""
    n = len(vals)
    if n == 1:
        return [0.5]
    order = sorted(range(n), key=lambda i: vals[i])
    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j + 1 < n and vals[order[j + 1]] == vals[order[i]]:
            j += 1
        avg = (i + j) / 2.0
        for k in range(i, j + 1):
            ranks[order[k]] = avg / (n - 1)
        i = j + 1
    return ranks


def normalise(values, method="robust_z", clip_z=None):
    """values: list of floats. Returns (normalised list, stats dict)."""
    if method == "rank_pct":
        return _rank_pct(values), {"method": "rank_pct", "n": len(values)}
    med = statistics.median(values)
    mad = statistics.median([abs(v - med) for v in values])
    scale, how = 1.4826 * mad, "1.4826*MAD"
    if scale == 0:
        scale, how = 1.2533 * statistics.fmean([abs(v - med) for v in values]), "1.2533*mean absolute deviation"
    if scale == 0:
        return [0.0] * len(values), {"method": "robust_z", "median": med, "scale": 0.0, "n": len(values),
                                     "scale_method": "all values equal; every z set to 0"}
    z = [(v - med) / scale for v in values]
    if clip_z is not None:
        z = [max(-clip_z, min(clip_z, x)) for x in z]
    return z, {"method": "robust_z", "median": med, "scale": scale, "scale_method": how, "n": len(values),
               "clip_z": clip_z}


# --------------------------------------------------------------------------- config + fusion

def load_config(path):
    with open(path, "rb") as f:
        raw = f.read()
    try:
        cfg = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise ConfigError(f"{path}: not valid JSON ({e})") from None
    base = os.path.dirname(os.path.abspath(path))
    layers = cfg.get("layers")
    if not isinstance(layers, list) or not layers:
        raise ConfigError("config needs a non-empty \"layers\" list")
    if cfg.get("missing", "zero") not in ("zero", "renormalise"):
        raise ConfigError("\"missing\" must be \"zero\" or \"renormalise\"")
    names = set()
    for L in layers:
        _check_layer(L, cfg, names)
        L["_file"] = os.path.join(base, L["file"])
    if cfg.get("sites"):
        cfg["_sites_file"] = os.path.join(base, cfg["sites"])
    cfg["_sha256"] = hashlib.sha256(raw).hexdigest()
    cfg["_path"] = path
    return cfg


def _check_layer(L, cfg, names):
    name = L.get("name")
    if not name or name in names:
        raise ConfigError(f"every layer needs a unique name (got {name!r})")
    names.add(name)
    if L.get("type") not in LAYER_TYPES:
        raise ConfigError(f"layer {name}: type must be one of {', '.join(LAYER_TYPES)}")
    if not L.get("file"):
        raise ConfigError(f"layer {name}: needs \"file\"")
    w = L.get("weight")
    if isinstance(w, bool) or not isinstance(w, (int, float)) or not math.isfinite(w) or w < 0:
        raise ConfigError(f"layer {name}: \"weight\" must be a number >= 0 set in the config (got {w!r}); "
                          "use \"direction\": \"lower\" rather than a negative weight")
    L.setdefault("normalise", cfg.get("normalise", "robust_z"))
    if L["normalise"] not in NORMALISERS:
        raise ConfigError(f"layer {name}: normalise must be one of {', '.join(NORMALISERS)}")
    if L.setdefault("direction", "higher") not in ("higher", "lower"):
        raise ConfigError(f"layer {name}: direction must be \"higher\" or \"lower\"")
    if L.get("transform") not in (None, "abs"):
        raise ConfigError(f"layer {name}: transform must be \"abs\" or absent")
    if L["type"] == "table" and not L.get("column"):
        raise ConfigError(f"layer {name}: table layers need \"column\"")
    if L["type"] == "features" and (not L.get("field") or not isinstance(L.get("max_distance_m"), (int, float))):
        raise ConfigError(f"layer {name}: features layers need \"field\" and a numeric \"max_distance_m\"")


def _site_ids(cfg, sites):
    if sites:
        return list(sites)
    ids = []
    for L in cfg["layers"]:
        if L["type"] != "table":
            raise ConfigError("features and raster layers need a \"sites\" file with lat/lon")
        for r in _read_csv(L["_file"]):
            sid = (r.get(L.get("key", "site_id")) or "").strip()
            if sid and sid not in ids:
                ids.append(sid)
    if not ids:
        raise ConfigError("no sites found")
    return ids


def fuse(cfg):
    sites = read_sites(cfg["_sites_file"], cfg.get("site_id_column", "site_id")) if cfg.get("_sites_file") else {}
    ids = _site_ids(cfg, sites)
    missing_policy = cfg.get("missing", "zero")
    per_site = {sid: {"site_id": sid, **({k: sites[sid][k] for k in ("lat", "lon")} if sid in sites else {}),
                      "layers": {}, "missing_layers": []} for sid in ids}
    layer_meta = []
    for L in cfg["layers"]:
        raw = READERS[L["type"]](L, ids, sites)
        have = [sid for sid in ids if raw[sid][0] is not None]
        prepared = {}
        for sid in have:
            v = raw[sid][0]
            v = abs(v) if L.get("transform") == "abs" else v
            prepared[sid] = -v if L["direction"] == "lower" else v
        if have:
            normed, stats = normalise([prepared[s] for s in have], L["normalise"], L.get("clip_z"))
            nmap = dict(zip(have, normed))
        else:
            nmap, stats = {}, {"method": L["normalise"], "n": 0, "note": "no site has a value for this layer"}
        layer_meta.append({"name": L["name"], "type": L["type"], "file": L["file"], "weight": L["weight"],
                           "direction": L["direction"], "transform": L.get("transform"), "normalise": L["normalise"],
                           "sites_with_value": len(have), "stats": stats})
        for sid in ids:
            n = nmap.get(sid)
            entry = {"raw_value": raw[sid][0], "source": raw[sid][1], "normalised": n, "weight": L["weight"],
                     "contribution": (L["weight"] * n) if n is not None else None}
            per_site[sid]["layers"][L["name"]] = entry
            if n is None:
                per_site[sid]["missing_layers"].append(L["name"])
    for s in per_site.values():
        _score(s, missing_policy)
    ranked = sorted(per_site.values(), key=lambda s: (s["score"] is None, -(s["score"] or 0.0), s["site_id"]))
    for i, s in enumerate(ranked, start=1):
        s["rank"] = i if s["score"] is not None else None
    return {
        "tool": "fusion.py", "score_kind": SCORE_KIND,
        "score_formula": "sum(weight * normalised) / sum(weight)"
                         + (" over all layers; a missing layer contributes 0" if missing_policy == "zero"
                            else " over the layers the site has a value for"),
        "config_file": cfg["_path"], "config_sha256": cfg["_sha256"], "missing_policy": missing_policy,
        "layers": layer_meta, "sites": ranked,
    }


def _score(site, policy):
    num = den = 0.0
    for e in site["layers"].values():
        if e["normalised"] is None:
            if policy == "zero":
                den += e["weight"]
            continue
        num += e["contribution"]
        den += e["weight"]
    site["weight_total"] = den
    site["score"] = (num / den) if den > 0 else None


def write_csv(result, path):
    names = [L["name"] for L in result["layers"]]
    cols = ["rank", "site_id", "lat", "lon", "score"]
    for n in names:
        cols += [f"{n}_raw", f"{n}_normalised", f"{n}_weight", f"{n}_contribution"]
    cols.append("missing_layers")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for s in result["sites"]:
            row = [s["rank"], s["site_id"], s.get("lat"), s.get("lon"), s["score"]]
            for n in names:
                e = s["layers"][n]
                row += [e["raw_value"], e["normalised"], e["weight"], e["contribution"]]
            row.append(";".join(s["missing_layers"]))
            w.writerow(row)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", required=True, help="fusion config JSON (layers, files, weights)")
    ap.add_argument("--out", required=True, help="ranked sites JSON")
    ap.add_argument("--csv", help="also write a flat CSV")
    a = ap.parse_args(argv)
    try:
        res = fuse(load_config(a.config))
    except (OSError, ConfigError) as e:
        print(f"fusion: {e}", file=sys.stderr)
        return 2
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(res, f, indent=2)
        f.write("\n")
    if a.csv:
        write_csv(res, a.csv)
    scored = sum(1 for s in res["sites"] if s["score"] is not None)
    print(f"fusion: ranked {scored} of {len(res['sites'])} sites over {len(res['layers'])} layers -> {a.out}",
          file=sys.stderr)
    return 0 if scored else 2


if __name__ == "__main__":
    sys.exit(main())
