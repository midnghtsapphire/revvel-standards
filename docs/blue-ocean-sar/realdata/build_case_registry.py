#!/usr/bin/env python3
"""Ingest every case file (CSV, JSON, SQLite, Python registries) into one
ordered registry, keep every claimed value with the file it came from, and
attach real-data checks.

Nothing is merged silently. Where versions disagree, every value is kept and
the disagreement is reported. "Correcting" means attaching a measured value
next to the claimed one (for example Copernicus elevation at a claimed
coordinate), not picking a winner by guessing.

Outputs (in --out-dir):
  claims.csv          one row per claimed value: case, field, value, label, source file
  coordinates.csv     distinct coordinates per case, grouped within 100 m, with
                      every label/source that names them and the real
                      Copernicus elevation there
  case_summary.json   per case: coordinate spread, confidence and depth values
                      claimed, and their sources
  case_registry.sqlite all of the above as tables

Example:
  python build_case_registry.py --in /path/to/uploads --in extracted_zips/ --out-dir registry/ --elevation
"""

import argparse
import ast
import csv
import json
import math
import os
import re
import shutil
import sqlite3
import sys
import tempfile
from collections import defaultdict

CASES = {
    "shtuka": "SHTUKA-2018-BC", "shaffer": "SHAFFER-2006-OH", "lindeman": "LINDEMAN-2026-MO",
    "farber": "FARBER-2015-PA", "tamaqua": "FARBER-2015-PA", "steppach": "STEPPACH-2015-AR",
    "toman": "TOMAN-2025-QC", "landry": "LANDRY-2020-TX", "maddux": "MADDUX-2008-CO",
    "chapman": "CHAPMAN-2006-OH", "fraysure": "FRAYSURE-1997-KY", "sunpeaks": "SHTUKA-2018-BC",
    "sun peaks": "SHTUKA-2018-BC",
}
CASE_ID_RE = re.compile(r"\b([A-Z]+)-(19|20)\d\d-[A-Z]{2}\b")

LATLON_KEYS = [("latitude", "longitude"), ("lat", "lon"), ("center_latitude", "center_longitude"),
               ("approx_latitude", "approx_longitude")]
GPS_STR_KEYS = ("gps", "gps_coords", "gps_location", "primary_coordinates", "gps_center", "target_coords")
LABEL_KEYS = ("target_id", "target_name", "depression_id", "anchor_id", "location_name", "target_sector",
              "name", "location", "primary_location", "geotiff_filename", "stage", "catchment_name",
              "structure_name", "subject_name", "subject")


def norm_case(text, filename=""):
    m = CASE_ID_RE.search(text or "")
    if m:
        return m.group(0)
    hits = {cid for k, cid in CASES.items() if k in (text or "").lower()}
    if len(hits) == 1:
        return hits.pop()
    hits = {cid for k, cid in CASES.items() if k in filename.lower()}
    return hits.pop() if len(hits) == 1 else None


def _num(v):
    try:
        x = float(str(v).replace("%", "").strip())
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def parse_gps(v):
    """Accept (lat, lon), [lat, lon], {'lat':..,'lon':..}, '50.88, -119.88',
    '50.8782° N, 119.9075° W' and '39.9985° N, -83.0064° W' (sign kept once)."""
    if isinstance(v, dict):
        la = _num(v.get("lat", v.get("latitude")))
        lo = _num(v.get("lon", v.get("longitude")))
        return (la, lo) if la is not None and lo is not None else None
    if isinstance(v, (list, tuple)) and len(v) >= 2:
        la, lo = _num(v[0]), _num(v[1])
        return (la, lo) if la is not None and lo is not None else None
    if not isinstance(v, str):
        return None
    nums = re.findall(r"-?\d+(?:\.\d+)?", v)
    if len(nums) < 2:
        return None
    la, lo = float(nums[0]), float(nums[1])
    if re.search(r"\d\s*°?\s*S\b", v) and la > 0:
        la = -la
    if re.search(r"\d\s*°?\s*W\b", v) and lo > 0:
        lo = -lo
    return la, lo


def valid_latlon(p):
    return p and -90 <= p[0] <= 90 and -180 <= p[1] <= 180 and not (p[0] == 0 and p[1] == 0)


def classify_numeric(key):
    k = key.lower()
    if re.search(r"confidence|probability|match_score|match_pct|model_match|edna_match", k):
        return "confidence_pct"
    if re.search(r"elevation_ft", k):
        return "elevation_ft"
    if re.search(r"elevation(_z_max)?_m$|^elevation_m$|ground_elevation_m", k):
        return "elevation_m"
    if re.search(r"depth", k) and not re.search(r"_cm|inch|pct", k):
        return "depth_m"
    return None


# Original: nested dicts lost their parent's case_id, so their claims were
# dropped unless the file name named the case.
# def records_from_obj(obj, path=()):
#     """Yield every dict inside a JSON-like object, with a path label."""
#     if isinstance(obj, dict):
#         yield path, obj
#         for k, v in obj.items():
#             yield from records_from_obj(v, path + (str(k),))
#     elif isinstance(obj, list):
#         for i, v in enumerate(obj):
#             yield from records_from_obj(v, path + (str(i),))
def records_from_obj(obj, path=(), case_id=None):
    """Yield every dict inside a JSON-like object, with a path label. A dict
    without its own case_id inherits the nearest enclosing one (a parent's
    case_id field, or a key that is a case id)."""
    if isinstance(obj, dict):
        own = obj.get("case_id")
        if isinstance(own, str) and own:
            case_id = own
        elif case_id:
            obj = dict(obj, case_id=case_id)
        yield path, obj
        for k, v in obj.items():
            child = str(k) if CASE_ID_RE.fullmatch(str(k)) else case_id
            yield from records_from_obj(v, path + (str(k),), child)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from records_from_obj(v, path + (str(i),), case_id)


def records_from_py(text):
    """Literal dicts inside a Python file, found with ast (the file is never run)."""
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return
    for node in ast.walk(tree):
        if isinstance(node, ast.Dict):
            try:
                d = ast.literal_eval(node)
            except Exception:
                continue
            # registry dicts keyed by case id: {'SHTUKA-2018-BC': {...}}
            if all(isinstance(k, str) and CASE_ID_RE.fullmatch(k) for k in d) and d:
                for cid, rec in d.items():
                    if isinstance(rec, dict):
                        yield (cid,), dict(rec, case_id=cid)
            elif any(k in d for k in ("gps", "case_id", "lat", "latitude")):
                yield (), d


def read_sqlite(path):
    tmp = tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False)
    tmp.close()
    shutil.copy(path, tmp.name)
    try:
        con = sqlite3.connect(tmp.name)
        con.row_factory = sqlite3.Row
        for (t,) in con.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%'"):
            for row in con.execute(f'select * from "{t}"'):
                yield (t,), dict(row)
        con.close()
    except sqlite3.DatabaseError:
        return
    finally:
        os.unlink(tmp.name)


def iter_records(path):
    name = os.path.basename(path)
    low = name.lower()
    with open(path, "rb") as f:
        head = f.read(16)
    if head.startswith(b"SQLite format 3"):
        yield from read_sqlite(path)
    elif low.endswith(".csv"):
        with open(path, newline="", encoding="utf-8", errors="replace") as f:
            for i, row in enumerate(csv.DictReader(f)):
                yield (f"row{i + 2}",), row
    elif low.endswith(".json"):
        try:
            with open(path, encoding="utf-8") as f:
                obj = json.loads(f.read().replace("NaN", "null"))
        except Exception:
            return
        yield from records_from_obj(obj)
    elif low.endswith(".py"):
        with open(path, encoding="utf-8", errors="replace") as f:
            yield from records_from_py(f.read())


def extract_claims(path, display_name):
    claims = []
    for where, rec in iter_records(path):
        flat = json.dumps(rec, default=str)
        cid = rec.get("case_id") if isinstance(rec.get("case_id"), str) else None
        cid = cid or norm_case(flat, display_name)
        if not cid:
            continue
        label = next((str(rec[k]) for k in LABEL_KEYS if k in rec and rec[k] not in (None, "")), "")
        src = f"{display_name}:{'/'.join(where)}"
        coord = None
        for a, b in LATLON_KEYS:
            if a in rec and b in rec:
                p = (_num(rec[a]), _num(rec[b]))
                if p[0] is not None and p[1] is not None:
                    coord = p
                    break
        if coord is None:
            for k in GPS_STR_KEYS:
                if k in rec:
                    coord = parse_gps(rec[k])
                    if coord:
                        break
        if coord and valid_latlon(coord):
            claims.append({"case_id": cid, "field": "coordinate", "value": f"{coord[0]:.6f},{coord[1]:.6f}",
                           "label": label, "source": src})
        for k, v in rec.items():
            kind = classify_numeric(str(k))
            x = _num(v)
            if kind and x is not None:
                if kind == "confidence_pct" and x <= 1.0:
                    x *= 100.0
                if kind == "elevation_ft":
                    kind, x = "elevation_m", x * 0.3048
                claims.append({"case_id": cid, "field": kind, "value": round(x, 4), "label": label,
                               "source": f"{src}#{k}"})
        for k in ("status", "case_status"):
            if isinstance(rec.get(k), str) and rec[k].strip():
                claims.append({"case_id": cid, "field": "status", "value": rec[k].strip(), "label": label,
                               "source": f"{src}#{k}"})
    return claims


def haversine_m(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def group_coords(points, radius_m=100.0):
    """Greedy grouping of (lat, lon, claim) within radius_m of a group's first point."""
    groups = []
    for p in points:
        for g in groups:
            if haversine_m(g["center"], p[:2]) <= radius_m:
                g["members"].append(p)
                break
        else:
            groups.append({"center": p[:2], "members": [p]})
    return groups


def cop30_elevation(lat, lon):
    import dem_terrain as dt
    dt._setup_gdal()
    z, _, _ = dt.load_grid(lat, lon, 15, 30, dt.cop30_sources(lat, lon, 15))
    v = z[z.shape[0] // 2, z.shape[1] // 2]
    return None if math.isnan(v) else float(v)


def build(inputs, out_dir, elevation=False, log=print):
    os.makedirs(out_dir, exist_ok=True)
    claims = []
    files = []
    seen_disp = set()
    for root in inputs:
        for dirpath, _, names in os.walk(root):
            for n in sorted(names):
                p = os.path.join(dirpath, n)
                if os.path.getsize(p) > 50_000_000:
                    continue
                # Original: basename only, so same-named files from different folders
                # or --in roots shared one source name (and one claimed-elevation key).
                # disp = re.sub(r"^[0-9a-f]{8}-", "", n)
                rel = os.path.relpath(dirpath, root)
                disp = re.sub(r"^[0-9a-f]{8}-", "", n)
                disp = disp if rel == "." else os.path.join(rel, disp)
                if disp in seen_disp:
                    disp = os.path.abspath(p)
                seen_disp.add(disp)
                c = extract_claims(p, disp)
                if c:
                    files.append((disp, len(c)))
                claims.extend(c)
    # identical claim from identical-content duplicate files is still one row per file: keep, it shows repetition

    coord_rows = []
    summary = {}
    by_case = defaultdict(list)
    for c in claims:
        by_case[c["case_id"]].append(c)
    elev_cache = {}
    for cid in sorted(by_case):
        cl = by_case[cid]
        pts = []
        for c in cl:
            if c["field"] == "coordinate":
                la, lo = map(float, c["value"].split(","))
                pts.append((la, lo, c))
        groups = group_coords(pts)
        for gi, g in enumerate(groups, 1):
            labels = sorted({m[2]["label"] for m in g["members"] if m[2]["label"]})
            sources = sorted({m[2]["source"].split(":")[0] for m in g["members"]})
            elev = None
            if elevation:
                key = (round(g["center"][0], 4), round(g["center"][1], 4))
                if key not in elev_cache:
                    try:
                        elev_cache[key] = cop30_elevation(*g["center"])
                    except Exception as e:
                        log(f"elevation {cid} {key}: {e}")
                        elev_cache[key] = None
                elev = elev_cache[key]
            coord_rows.append({
                "case_id": cid, "group": gi, "lat": round(g["center"][0], 6), "lon": round(g["center"][1], 6),
                "n_claims": len(g["members"]), "n_files": len(sources),
                "labels": " | ".join(labels)[:500], "files": " | ".join(sources)[:800],
                "copernicus_elevation_m": None if elev is None else round(elev, 1),
            })
        far = max((haversine_m(a["center"], b["center"]) for a in groups for b in groups), default=0.0)
        num = defaultdict(list)
        for c in cl:
            if c["field"] in ("confidence_pct", "depth_m", "elevation_m"):
                num[c["field"]].append(c["value"])
        summary[cid] = {
            "claims": len(cl),
            "files": len({c["source"].split(":")[0] for c in cl}),
            "coordinate_groups": len(groups),
            "max_distance_between_groups_km": round(far / 1000, 2),
            **{f"{k}_values": sorted(set(v)) for k, v in num.items()},
            "statuses": sorted({c["value"] for c in cl if c["field"] == "status"}),
        }
    # claimed elevation vs real elevation at the same coordinate (same record)
    elev_checks = []
    if elevation:
        rec_coord = {}
        for c in claims:
            if c["field"] == "coordinate":
                rec_coord[c["source"]] = c["value"]
        for c in claims:
            if c["field"] != "elevation_m":
                continue
            base = c["source"].split("#")[0]
            if base in rec_coord:
                la, lo = map(float, rec_coord[base].split(","))
                key = (round(la, 4), round(lo, 4))
                if key not in elev_cache:
                    try:
                        elev_cache[key] = cop30_elevation(la, lo)
                    except Exception:
                        elev_cache[key] = None
                real = elev_cache[key]
                elev_checks.append({"case_id": c["case_id"], "label": c["label"], "lat": la, "lon": lo,
                                    "claimed_elevation_m": round(c["value"], 1),
                                    "copernicus_elevation_m": None if real is None else round(real, 1),
                                    "difference_m": None if real is None else round(c["value"] - real, 1),
                                    "source": c["source"]})

    def write_csv(name, rows):
        if not rows:
            return
        with open(os.path.join(out_dir, name), "w", newline="") as f:
            w = csv.DictWriter(f, list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)

    write_csv("claims.csv", claims)
    write_csv("coordinates.csv", coord_rows)
    write_csv("elevation_checks.csv", elev_checks)
    with open(os.path.join(out_dir, "case_summary.json"), "w") as f:
        json.dump({"files_with_case_data": files, "cases": summary}, f, indent=1)
    db = os.path.join(out_dir, "case_registry.sqlite")
    if os.path.exists(db):
        os.unlink(db)
    con = sqlite3.connect(db)
    for name, rows in (("claims", claims), ("coordinates", coord_rows), ("elevation_checks", elev_checks)):
        if rows:
            cols = list(rows[0].keys())
            con.execute(f'create table {name} ({", ".join(chr(34) + c + chr(34) for c in cols)})')
            con.executemany(f"insert into {name} values ({', '.join('?' for _ in cols)})",
                            [[r[c] for c in cols] for r in rows])
    con.commit()
    con.close()
    return claims, coord_rows, summary, elev_checks


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--in", dest="inputs", action="append", required=True, help="folder(s) to ingest")
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--elevation", action="store_true", help="look up Copernicus GLO-30 elevation at each coordinate")
    a = ap.parse_args(argv)
    claims, coords, summary, checks = build(a.inputs, a.out_dir, a.elevation, log=lambda s: print(s, file=sys.stderr))
    print(f"{len(claims)} claims, {len(coords)} coordinate groups, {len(summary)} cases -> {a.out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
