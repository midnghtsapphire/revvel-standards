"""Lost-person-behaviour (LPB) distance rings from the 2003 UK handbook.

Source: Perkins, Roberts and Feeney, "Missing Person Behaviour - An Aid to the
Search Manager", 1st edition, June 2003. The numbers live in
``lpb_mpb2003.json`` next to this file, transcribed as printed with a page
number on every table.

What it does:

- lists the handbook categories and their printed distance-from-IPP tables
  (10% steps, km and miles, as printed);
- draws those distances as geodesic circles (WGS84) around an IPP and writes
  them as GeoJSON and KML;
- optionally builds a probability-of-area grid from the ring distribution;
- returns the where-found percentages, outcomes and behaviour notes.

The rings and the grid are a planning prior for sizing a search area. They do
not predict where a particular person is. They are 2003 UK figures (plus
US/Canadian tables the handbook adapted from Hill and Koester); other regions
and eras differ.

CLI::

    python lost_person_behavior.py --list
    python lost_person_behavior.py --category hikers --lat 54.5 --lon -3.1 --out DIR
    python lost_person_behavior.py --category misc_adults --lat .. --lon .. --out DIR --find LAT LON --grid

Exit codes: 0 rings written; 2 unknown category or bad arguments; 3 the
handbook prints no distance table for the category (summary.json is still
written, rings are not).
"""

from __future__ import annotations

import argparse
import copy
import json
import math
import os
import sys
import xml.etree.ElementTree as ET

DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lpb_mpb2003.json")

KM_PER_MILE = 1.609344
EARTH_MEAN_RADIUS_KM = 6371.0088
WGS84_A = 6378137.0
WGS84_F = 1 / 298.257223563
WGS84_B = WGS84_A * (1 - WGS84_F)

FIXED_NOTE = (
    "These are 2003 UK statistics (Perkins, Roberts & Feeney, Missing Person Behaviour, June 2003; the "
    "'source_studies' tables are US/Canadian data the handbook adapted from Hill 1997 and Koester 2000). "
    "Other regions, terrain, seasons and eras differ. Small samples (n is printed with each table)."
)
PRIOR_NOTE = (
    "Planning prior only: the rings and grid describe how far past subjects in this category were found from "
    "the IPP. They size and weight a search area; they do not predict where this person is. Blend with "
    "investigation, terrain, barriers and scenario analysis (handbook pp. 4-5)."
)
DATASET_KEYS = ("uk_study", "source_studies")

_DATA = None


class UnknownCategoryError(KeyError):
    """The name is not a handbook category or alias."""


class NoDistanceTableError(ValueError):
    """The handbook prints no distance table for this category/dataset."""


# ---------------------------------------------------------------------------
# data access
# ---------------------------------------------------------------------------


def load_data(path=None):
    """Load the transcription JSON (cached for the default path)."""
    global _DATA
    if path is not None:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    if _DATA is None:
        with open(DATA_PATH, encoding="utf-8") as fh:
            _DATA = json.load(fh)
    return _DATA


def _norm(name):
    return str(name).strip().lower().replace("-", "_").replace(" ", "_").replace("'", "")


def resolve_category(name, data=None):
    """Return the canonical category key for a key or alias (case/hyphen insensitive)."""
    data = data or load_data()
    want = _norm(name)
    for key, entry in data["categories"].items():
        if want == _norm(key) or want in (_norm(a) for a in entry.get("aliases", [])):
            return key
    raise UnknownCategoryError(f"unknown category {name!r}; known: {', '.join(data['categories'])}")


def list_categories(data=None):
    """One row per category: key, title, pages, and which distance tables exist (with n)."""
    data = data or load_data()
    rows = []
    for key, entry in data["categories"].items():
        tables = {ds: (t["n"] if t else None) for ds, t in entry["distance"].items()}
        rows.append(
            {
                "key": key,
                "title": entry["title"],
                "pages": entry["pages"],
                "aliases": entry.get("aliases", []),
                "distance_tables_n": tables,
            }
        )
    return rows


def category_info(name, data=None):
    """Full transcribed record for a category (a copy)."""
    data = data or load_data()
    return copy.deepcopy(data["categories"][resolve_category(name, data)])


def choose_dataset(name, dataset="auto", data=None):
    """Pick a distance table key. ``auto`` prefers the UK study, then the source studies."""
    entry = category_info(name, data)
    if dataset == "auto":
        for ds in DATASET_KEYS:
            if entry["distance"].get(ds):
                return ds
        raise NoDistanceTableError(f"handbook prints no distance table for {entry['title']!r} (pages {entry['pages']})")
    if dataset not in DATASET_KEYS:
        raise ValueError(f"dataset must be auto, {' or '.join(DATASET_KEYS)}")
    if not entry["distance"].get(dataset):
        raise NoDistanceTableError(f"no {dataset} distance table for {entry['title']!r} (pages {entry['pages']})")
    return dataset


def distance_table(name, dataset="auto", data=None):
    """The printed distance table (percent, km, miles, n, page, source) plus the dataset key."""
    ds = choose_dataset(name, dataset, data)
    table = category_info(name, data)["distance"][ds]
    table["dataset"] = ds
    return table


def _interp(x, xs, ys):
    """Linear interpolation of y at x on ascending xs (xs may repeat)."""
    if x <= xs[0]:
        return ys[0]
    for i in range(1, len(xs)):
        if x <= xs[i]:
            x0, x1, y0, y1 = xs[i - 1], xs[i], ys[i - 1], ys[i]
            if x1 == x0:
                return y1
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return ys[-1]


def rings(name, dataset="auto", percentiles=None, data=None):
    """Distance rings for a category.

    With ``percentiles`` None, returns exactly the printed rows (10%..100%).
    Otherwise returns the requested percentiles; any that is not a printed row
    is linearly interpolated between the printed rows (0% at 0 km) and marked
    ``interpolated: True``. km and miles come from their own printed columns.
    """
    t = distance_table(name, dataset, data)
    pcts = [0.0] + [float(p) for p in t["percent"]]
    kms = [0.0] + list(t["km"])
    mis = [0.0] + list(t["miles"])
    wanted = t["percent"] if percentiles is None else percentiles
    out = []
    for p in wanted:
        p = float(p)
        if not 0 < p <= 100:
            raise ValueError(f"percentile {p} outside (0, 100]")
        printed = p in [float(x) for x in t["percent"]]
        if printed:
            i = [float(x) for x in t["percent"]].index(p)
            km, mi = t["km"][i], t["miles"][i]
        else:
            km, mi = _interp(p, pcts, kms), _interp(p, pcts, mis)
        out.append(
            {
                "percent": int(p) if p.is_integer() else p,
                "km": round(km, 4),
                "miles": round(mi, 4),
                "interpolated": not printed,
                "page": t["page"],
                "n": t["n"],
                "dataset": t["dataset"],
                "source": t["source"],
            }
        )
    for i in range(1, len(out)):
        if out[i]["percent"] > out[i - 1]["percent"] and out[i]["km"] < out[i - 1]["km"]:
            raise ValueError(f"non-monotonic rings in {name}: {out[i - 1]} then {out[i]}")
    return out


def where_found(name, data=None):
    """UK where-found percentages (dict with page, n, percent) or None if not printed."""
    return category_info(name, data).get("where_found")


def outcomes(name, data=None):
    """UK outcome percentages (survivability) or None."""
    return category_info(name, data).get("outcomes")


def behaviour(name, data=None):
    """Characteristics / where / how notes and the other printed statistics, with pages."""
    e = category_info(name, data)
    return {k: e.get(k) for k in ("characteristics", "where", "how", "other_statistics", "uk_study_note") if e.get(k)}


# ---------------------------------------------------------------------------
# geodesy
# ---------------------------------------------------------------------------


def haversine_km(lat1, lon1, lat2, lon2, radius_km=EARTH_MEAN_RADIUS_KM):
    """Great-circle distance on a sphere of the IUGG mean radius."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * radius_km * math.asin(min(1.0, math.sqrt(h)))


def vincenty_direct(lat, lon, azimuth_deg, distance_m):
    """WGS84 direct geodesic problem (Vincenty 1975). Returns (lat, lon) in degrees."""
    a, b, f = WGS84_A, WGS84_B, WGS84_F
    alpha1 = math.radians(azimuth_deg)
    sin_a1, cos_a1 = math.sin(alpha1), math.cos(alpha1)
    tan_u1 = (1 - f) * math.tan(math.radians(lat))
    cos_u1 = 1 / math.sqrt(1 + tan_u1 * tan_u1)
    sin_u1 = tan_u1 * cos_u1
    sigma1 = math.atan2(tan_u1, cos_a1)
    sin_alpha = cos_u1 * sin_a1
    cos2_alpha = 1 - sin_alpha * sin_alpha
    u2 = cos2_alpha * (a * a - b * b) / (b * b)
    big_a = 1 + u2 / 16384 * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)))
    big_b = u2 / 1024 * (256 + u2 * (-128 + u2 * (74 - 47 * u2)))
    sigma = distance_m / (b * big_a)
    for _ in range(200):
        cos_2sm = math.cos(2 * sigma1 + sigma)
        sin_s, cos_s = math.sin(sigma), math.cos(sigma)
        d_sigma = (
            big_b
            * sin_s
            * (
                cos_2sm
                + big_b
                / 4
                * (
                    cos_s * (-1 + 2 * cos_2sm * cos_2sm)
                    - big_b / 6 * cos_2sm * (-3 + 4 * sin_s * sin_s) * (-3 + 4 * cos_2sm * cos_2sm)
                )
            )
        )
        new_sigma = distance_m / (b * big_a) + d_sigma
        if abs(new_sigma - sigma) < 1e-12:
            sigma = new_sigma
            break
        sigma = new_sigma
    cos_2sm = math.cos(2 * sigma1 + sigma)
    sin_s, cos_s = math.sin(sigma), math.cos(sigma)
    tmp = sin_u1 * sin_s - cos_u1 * cos_s * cos_a1
    lat2 = math.atan2(sin_u1 * cos_s + cos_u1 * sin_s * cos_a1, (1 - f) * math.sqrt(sin_alpha**2 + tmp * tmp))
    lam = math.atan2(sin_s * sin_a1, cos_u1 * cos_s - sin_u1 * sin_s * cos_a1)
    c = f / 16 * cos2_alpha * (4 + f * (4 - 3 * cos2_alpha))
    big_l = lam - (1 - c) * f * sin_alpha * (sigma + c * sin_s * (cos_2sm + c * cos_s * (-1 + 2 * cos_2sm**2)))
    lon2 = (math.radians(lon) + big_l + 3 * math.pi) % (2 * math.pi) - math.pi
    return math.degrees(lat2), math.degrees(lon2)


def vincenty_inverse_km(lat1, lon1, lat2, lon2):
    """WGS84 inverse geodesic distance in km (Vincenty); falls back to haversine if it fails to converge."""
    a, b, f = WGS84_A, WGS84_B, WGS84_F
    if lat1 == lat2 and lon1 == lon2:
        return 0.0
    big_l = math.radians(lon2 - lon1)
    u1 = math.atan((1 - f) * math.tan(math.radians(lat1)))
    u2 = math.atan((1 - f) * math.tan(math.radians(lat2)))
    sin_u1, cos_u1, sin_u2, cos_u2 = math.sin(u1), math.cos(u1), math.sin(u2), math.cos(u2)
    lam = big_l
    for _ in range(200):
        sin_l, cos_l = math.sin(lam), math.cos(lam)
        sin_s = math.hypot(cos_u2 * sin_l, cos_u1 * sin_u2 - sin_u1 * cos_u2 * cos_l)
        if sin_s == 0:
            return 0.0
        cos_s = sin_u1 * sin_u2 + cos_u1 * cos_u2 * cos_l
        sigma = math.atan2(sin_s, cos_s)
        sin_alpha = cos_u1 * cos_u2 * sin_l / sin_s
        cos2_alpha = 1 - sin_alpha**2
        cos_2sm = cos_s - 2 * sin_u1 * sin_u2 / cos2_alpha if cos2_alpha else 0.0
        c = f / 16 * cos2_alpha * (4 + f * (4 - 3 * cos2_alpha))
        lam_prev = lam
        lam = big_l + (1 - c) * f * sin_alpha * (sigma + c * sin_s * (cos_2sm + c * cos_s * (-1 + 2 * cos_2sm**2)))
        if abs(lam - lam_prev) < 1e-12:
            break
    else:
        return haversine_km(lat1, lon1, lat2, lon2)
    u_sq = cos2_alpha * (a * a - b * b) / (b * b)
    big_a = 1 + u_sq / 16384 * (4096 + u_sq * (-768 + u_sq * (320 - 175 * u_sq)))
    big_b = u_sq / 1024 * (256 + u_sq * (-128 + u_sq * (74 - 47 * u_sq)))
    d_sigma = (
        big_b
        * sin_s
        * (
            cos_2sm
            + big_b
            / 4
            * (cos_s * (-1 + 2 * cos_2sm**2) - big_b / 6 * cos_2sm * (-3 + 4 * sin_s**2) * (-3 + 4 * cos_2sm**2))
        )
    )
    return b * big_a * (sigma - d_sigma) / 1000.0


def geodesic_circle(lat, lon, radius_km, n_vertices=128):
    """Closed ring of (lon, lat) vertices at ``radius_km`` geodesic distance (WGS84) from (lat, lon)."""
    if radius_km <= 0:
        raise ValueError("radius must be > 0")
    pts = []
    for i in range(n_vertices):
        la, lo = vincenty_direct(lat, lon, 360.0 * i / n_vertices, radius_km * 1000.0)
        pts.append((lo, la))
    pts.append(pts[0])
    return pts


def _check_ipp(lat, lon):
    if not (-90 < lat < 90 and -180 <= lon <= 180):
        raise ValueError(f"IPP out of range: {lat}, {lon}")


# ---------------------------------------------------------------------------
# outputs
# ---------------------------------------------------------------------------


def _label(ring, title):
    tag = " (interpolated)" if ring["interpolated"] else ""
    return f"{title} {ring['percent']}%{tag}: {ring['km']:g} km / {ring['miles']:g} mi"


def rings_geojson(name, lat, lon, dataset="auto", percentiles=None, n_vertices=128, data=None):
    """FeatureCollection: IPP point plus one Polygon per ring with radius > 0.

    Zero-radius rings (printed 0.00 km, i.e. found at the IPP) are listed in
    the collection's ``zero_radius_rings`` instead of drawn.
    """
    _check_ipp(lat, lon)
    key = resolve_category(name, data)
    title = category_info(key, data)["title"]
    rs = rings(key, dataset, percentiles, data)
    feats = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {"name": "IPP", "label": "Initial planning point (IPP)"},
        }
    ]
    zero = []
    for r in rs:
        if r["km"] <= 0:
            zero.append(r["percent"])
            continue
        props = dict(r)
        props.update({"category": key, "label": _label(r, title)})
        feats.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[list(p) for p in geodesic_circle(lat, lon, r["km"], n_vertices)]],
                },
                "properties": props,
            }
        )
    return {
        "type": "FeatureCollection",
        "name": f"lpb_{key}",
        "features": feats,
        "zero_radius_rings": zero,
        "note": PRIOR_NOTE,
        "citation": (data or load_data())["source"]["citation"],
    }


def rings_kml(name, lat, lon, dataset="auto", percentiles=None, n_vertices=128, data=None, find=None):
    """KML document with the IPP, one labelled outline per ring and an optional find point."""
    gj = rings_geojson(name, lat, lon, dataset, percentiles, n_vertices, data)
    ns = "http://www.opengis.net/kml/2.2"
    ET.register_namespace("", ns)
    kml = ET.Element(f"{{{ns}}}kml")
    doc = ET.SubElement(kml, f"{{{ns}}}Document")
    ET.SubElement(doc, f"{{{ns}}}name").text = gj["name"]
    ET.SubElement(doc, f"{{{ns}}}description").text = f"{PRIOR_NOTE} {FIXED_NOTE}"
    style = ET.SubElement(doc, f"{{{ns}}}Style", id="ring")
    ls = ET.SubElement(style, f"{{{ns}}}LineStyle")
    ET.SubElement(ls, f"{{{ns}}}color").text = "ff0055ff"
    ET.SubElement(ls, f"{{{ns}}}width").text = "2"
    ps = ET.SubElement(style, f"{{{ns}}}PolyStyle")
    ET.SubElement(ps, f"{{{ns}}}fill").text = "0"

    def point(nm, desc, la, lo):
        pm = ET.SubElement(doc, f"{{{ns}}}Placemark")
        ET.SubElement(pm, f"{{{ns}}}name").text = nm
        ET.SubElement(pm, f"{{{ns}}}description").text = desc
        pt = ET.SubElement(pm, f"{{{ns}}}Point")
        ET.SubElement(pt, f"{{{ns}}}coordinates").text = f"{lo:.7f},{la:.7f},0"

    point("IPP", "Initial planning point", lat, lon)
    for f in gj["features"][1:]:
        p = f["properties"]
        pm = ET.SubElement(doc, f"{{{ns}}}Placemark")
        ET.SubElement(pm, f"{{{ns}}}name").text = p["label"]
        ET.SubElement(pm, f"{{{ns}}}description").text = f"{p['source']}, n={p['n']}, page {p['page']}" + (
            " - interpolated between printed rows" if p["interpolated"] else ""
        )
        ET.SubElement(pm, f"{{{ns}}}styleUrl").text = "#ring"
        poly = ET.SubElement(pm, f"{{{ns}}}Polygon")
        ET.SubElement(poly, f"{{{ns}}}tessellate").text = "1"
        outer = ET.SubElement(ET.SubElement(poly, f"{{{ns}}}outerBoundaryIs"), f"{{{ns}}}LinearRing")
        coords = f["geometry"]["coordinates"][0]
        ET.SubElement(outer, f"{{{ns}}}coordinates").text = " ".join(f"{x:.7f},{y:.7f},0" for x, y in coords)
    if find is not None:
        point(find.get("label", "find"), find.get("description", ""), find["lat"], find["lon"])
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(kml, encoding="unicode")


def _knots(table, extra_percentiles=()):
    """CDF knots (km, fraction) from 0 at the IPP through each printed row, plus interpolated extras."""
    pcts = [0.0] + [float(p) for p in table["percent"]]
    kms = [0.0] + [float(k) for k in table["km"]]
    pts = {(p, k) for p, k in zip(pcts, kms)}
    for p in extra_percentiles:
        pts.add((float(p), _interp(float(p), pcts, kms)))
    return [(k, p / 100.0) for p, k in sorted(pts)]


def locate(name, lat, lon, find_lat, find_lon, dataset="auto", data=None):
    """Where a point falls relative to the printed rings.

    Returns the WGS84 distance, the smallest printed ring that contains it, the
    largest printed ring it is outside of, and the piecewise-linear CDF value.
    """
    t = distance_table(name, dataset, data)
    d = vincenty_inverse_km(lat, lon, find_lat, find_lon)
    inside = next((p for p, k in zip(t["percent"], t["km"]) if d <= k), None)
    outside = [p for p, k in zip(t["percent"], t["km"]) if d > k]
    knots = _knots(t)
    cdf = _interp(d, [k for k, _ in knots], [p for _, p in knots]) if d <= knots[-1][0] else 1.0
    return {
        "distance_km": round(d, 3),
        "distance_miles": round(d / KM_PER_MILE, 3),
        "haversine_km": round(haversine_km(lat, lon, find_lat, find_lon), 3),
        "inside_ring_percent": inside,
        "outside_ring_percent": max(outside) if outside else None,
        "cdf_piecewise_linear": round(cdf, 4),
        "dataset": t["dataset"],
        "page": t["page"],
        "n": t["n"],
    }


def probability_grid(
    name,
    lat,
    lon,
    bbox=None,
    nx=100,
    ny=100,
    dataset="auto",
    max_percentile=100.0,
    supersample=4,
    data=None,
):
    """Probability-of-area (POA) grid from the ring distribution. Needs numpy.

    Model: knots at 0 km (0%) and at each printed row; any ``max_percentile``
    not printed is added as an interpolated knot (linear in distance). Each band
    between consecutive knots carries its probability mass spread uniformly by
    (spherical) area. A band of zero width at 0 km (rows printed as 0.00) is a
    point mass put in the cell containing the IPP; a zero-width band further
    out adds its mass to the band that ends at that radius. Mass beyond
    ``max_percentile`` is dropped, so a bbox that contains the whole
    ``max_percentile`` ring sums to max_percentile/100.

    When a band lies wholly inside the bbox its mass is conserved exactly and
    spread over the sampled subcells; a band clipped by the bbox keeps only the
    sampled share. ``bbox`` = (min_lon, min_lat, max_lon, max_lat); default is
    the square around the max_percentile ring plus 2%.

    This is a planning prior, not a location prediction.
    """
    import numpy as np

    _check_ipp(lat, lon)
    t = distance_table(name, dataset, data)
    if not 0 < max_percentile <= 100:
        raise ValueError("max_percentile must be in (0, 100]")
    knots = [(k, p) for k, p in _knots(t, [max_percentile]) if p <= max_percentile / 100.0 + 1e-12]
    r_max = knots[-1][0]
    if bbox is None:
        pad = max(r_max * 1.02, 0.05)
        dlat = math.degrees(pad / EARTH_MEAN_RADIUS_KM)
        dlon = dlat / max(math.cos(math.radians(lat)), 1e-6)
        bbox = (lon - dlon, lat - dlat, lon + dlon, lat + dlat)
    min_lon, min_lat, max_lon, max_lat = bbox
    if not (min_lon < max_lon and min_lat < max_lat):
        raise ValueError("bbox must be (min_lon, min_lat, max_lon, max_lat)")

    # bands: (r_in, r_out, mass)
    point_mass, bands = 0.0, []
    for (r0, p0), (r1, p1) in zip(knots, knots[1:]):
        m = p1 - p0
        if m <= 0:
            continue
        if r1 <= r0:
            if r1 == 0:
                point_mass += m
            elif bands:
                bands[-1][2] += m
            else:
                point_mass += m
        else:
            bands.append([r0, r1, m])

    R = EARTH_MEAN_RADIUS_KM
    s = int(supersample)
    lon_e = np.linspace(min_lon, max_lon, nx * s + 1)
    lat_e = np.linspace(min_lat, max_lat, ny * s + 1)
    lon_c = np.radians((lon_e[:-1] + lon_e[1:]) / 2)
    lat_c = np.radians((lat_e[:-1] + lat_e[1:]) / 2)
    sub_area = (R**2) * np.radians(lon_e[1] - lon_e[0]) * np.abs(np.diff(np.sin(np.radians(lat_e))))  # per row
    LON, LAT = np.meshgrid(lon_c, lat_c)
    p1, l1 = math.radians(lat), math.radians(lon)
    h = np.sin((LAT - p1) / 2) ** 2 + math.cos(p1) * np.cos(LAT) * np.sin((LON - l1) / 2) ** 2
    dist = 2 * R * np.arcsin(np.minimum(1.0, np.sqrt(h)))
    area = np.repeat(sub_area[:, None], nx * s, axis=1)

    # nearest distance from IPP to the bbox edges, to tell whether a band is wholly inside
    inside_ipp = min_lon <= lon <= max_lon and min_lat <= lat <= max_lat
    if inside_ipp:
        edge = min(
            math.radians(max_lat - lat) * R,
            math.radians(lat - min_lat) * R,
            R * math.asin(min(1.0, math.cos(p1) * math.sin(math.radians(max_lon - lon)))),
            R * math.asin(min(1.0, math.cos(p1) * math.sin(math.radians(lon - min_lon)))),
        )
    else:
        edge = -1.0

    sub = np.zeros_like(dist)
    for r0, r1, m in bands:
        sel = (dist > r0) & (dist <= r1)
        sampled = float(area[sel].sum())
        cap = 2 * math.pi * R**2 * ((1 - math.cos(r1 / R)) - (1 - math.cos(r0 / R)))
        if r1 <= edge:  # wholly inside: conserve mass
            if sampled > 0:
                sub[sel] += m * area[sel] / sampled
            else:  # band thinner than a subcell: put it on the nearest sampled ring of subcells
                k = np.unravel_index(np.argmin(np.abs(dist - (r0 + r1) / 2)), dist.shape)
                sub[k] += m
        elif sampled > 0:
            sub[sel] += m * area[sel] / cap
    if point_mass and inside_ipp:
        k = np.unravel_index(np.argmin(dist), dist.shape)
        sub[k] += point_mass

    grid = sub.reshape(ny, s, nx, s).sum(axis=(1, 3))
    return {
        "bbox": [min_lon, min_lat, max_lon, max_lat],
        "nx": nx,
        "ny": ny,
        "lon_edges": [float(x) for x in np.linspace(min_lon, max_lon, nx + 1)],
        "lat_edges": [float(x) for x in np.linspace(min_lat, max_lat, ny + 1)],
        "probability": grid,
        "total": float(grid.sum()),
        "max_percentile": max_percentile,
        "max_radius_km": r_max,
        "point_mass_at_ipp": point_mass,
        "dataset": t["dataset"],
        "page": t["page"],
        "n": t["n"],
        "note": PRIOR_NOTE,
    }


def grid_geojson(grid, min_probability=0.0):
    """Grid cells as GeoJSON polygons with a ``probability`` property (cells below the threshold skipped)."""
    feats = []
    lo, la = grid["lon_edges"], grid["lat_edges"]
    for j in range(grid["ny"]):
        for i in range(grid["nx"]):
            pr = float(grid["probability"][j][i])
            if pr <= min_probability:
                continue
            ring = [[lo[i], la[j]], [lo[i + 1], la[j]], [lo[i + 1], la[j + 1]], [lo[i], la[j + 1]], [lo[i], la[j]]]
            feats.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": [ring]},
                    "properties": {"probability": pr, "row": j, "col": i},
                }
            )
    return {"type": "FeatureCollection", "features": feats, "total": grid["total"], "note": grid["note"]}


def build_summary(name, lat, lon, dataset="auto", percentiles=None, find=None, data=None):
    """summary.json content: citation, page refs, n, rings, outcomes, where-found, notes."""
    d = data or load_data()
    key = resolve_category(name, d)
    e = category_info(key, d)
    summary = {
        "category": key,
        "title": e["title"],
        "category_pages": e["pages"],
        "ipp": {"lat": lat, "lon": lon},
        "citation": d["source"]["citation"],
        "note": FIXED_NOTE,
        "planning_prior": PRIOR_NOTE,
        "printed_tables": {ds: e["distance"][ds] for ds in DATASET_KEYS},
        "outcomes": e.get("outcomes"),
        "where_found": e.get("where_found"),
        "behaviour": behaviour(key, d),
        "transcription_flags": [f for f in d["transcription_flags"] if f.get("category") in (None, key)],
    }
    try:
        rs = rings(key, dataset, percentiles, d)
    except NoDistanceTableError as exc:
        summary.update({"rings": None, "dataset": None, "error": str(exc)})
        return summary
    summary.update(
        {
            "dataset": rs[0]["dataset"],
            "sample_size": rs[0]["n"],
            "rings_page": rs[0]["page"],
            "rings": rs,
            "zero_radius_rings": [r["percent"] for r in rs if r["km"] <= 0],
        }
    )
    if find is not None:
        summary["find"] = dict(find)
        summary["find"]["relative_to_rings"] = locate(key, lat, lon, find["lat"], find["lon"], dataset, d)
        other = [ds for ds in DATASET_KEYS if ds != summary["dataset"]][0]
        if e["distance"].get(other):
            summary["find"]["relative_to_other_table"] = locate(key, lat, lon, find["lat"], find["lon"], other, d)
    return summary


def _write_json(path, obj):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--list", action="store_true", help="list categories and exit")
    ap.add_argument("--category")
    ap.add_argument("--lat", type=float)
    ap.add_argument("--lon", type=float)
    ap.add_argument("--out", help="output directory")
    ap.add_argument("--dataset", default="auto", choices=["auto", *DATASET_KEYS])
    ap.add_argument("--percentiles", help="comma list, e.g. 25,50,75,95 (non-printed ones are interpolated)")
    ap.add_argument("--vertices", type=int, default=128)
    ap.add_argument("--find", nargs=2, type=float, metavar=("LAT", "LON"), help="report which ring holds a point")
    ap.add_argument("--find-label", default="find")
    ap.add_argument("--grid", action="store_true", help="also write grid.geojson (needs numpy)")
    ap.add_argument("--grid-cells", type=int, default=80)
    ap.add_argument("--grid-max-percentile", type=float, default=100.0)
    a = ap.parse_args(argv)

    if a.list:
        for row in list_categories():
            print(f"{row['key']:24s} pages {row['pages']}  n={row['distance_tables_n']}  {row['title']}")
        return 0
    if a.category is None or a.lat is None or a.lon is None or not a.out:
        ap.print_usage(sys.stderr)
        print("error: --category, --lat, --lon and --out are required", file=sys.stderr)
        return 2
    try:
        key = resolve_category(a.category)
        _check_ipp(a.lat, a.lon)
        pcts = [float(x) for x in a.percentiles.split(",")] if a.percentiles else None
    except (UnknownCategoryError, ValueError) as exc:
        print(f"error: {exc.args[0] if exc.args else exc}", file=sys.stderr)
        return 2

    os.makedirs(a.out, exist_ok=True)
    find = {"lat": a.find[0], "lon": a.find[1], "label": a.find_label} if a.find else None
    try:
        summary = build_summary(key, a.lat, a.lon, a.dataset, pcts, find)
    except (NoDistanceTableError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    if summary["rings"] is None:
        _write_json(os.path.join(a.out, "summary.json"), summary)
        print(f"error: {summary['error']}; wrote summary.json only", file=sys.stderr)
        return 3

    gj = rings_geojson(key, a.lat, a.lon, a.dataset, pcts, a.vertices)
    _write_json(os.path.join(a.out, "rings.geojson"), gj)
    with open(os.path.join(a.out, "rings.kml"), "w", encoding="utf-8") as fh:
        fh.write(rings_kml(key, a.lat, a.lon, a.dataset, pcts, a.vertices, find=find))
    if a.grid:
        g = probability_grid(
            key, a.lat, a.lon, nx=a.grid_cells, ny=a.grid_cells, dataset=a.dataset, max_percentile=a.grid_max_percentile
        )
        _write_json(os.path.join(a.out, "grid.geojson"), grid_geojson(g))
        summary["grid"] = {k: g[k] for k in ("bbox", "nx", "ny", "total", "max_percentile", "max_radius_km")}
    _write_json(os.path.join(a.out, "summary.json"), summary)

    print(f"{summary['title']} ({summary['dataset']}, n={summary['sample_size']}, page {summary['rings_page']})")
    for r in summary["rings"]:
        print(
            f"  {r['percent']:>5}%  {r['km']:>8g} km  {r['miles']:>8g} mi"
            + ("  (interpolated)" if r["interpolated"] else "")
        )
    if find:
        loc = summary["find"]["relative_to_rings"]
        print(f"  find: {loc['distance_km']} km from IPP, inside {loc['inside_ring_percent']}% ring")
    print(f"wrote {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
