#!/usr/bin/env python3
"""Case dossier built only from the outputs of the tools in this folder.

The uploaded case dossiers (banded section headers, case-ID strip, coloured
status chips, navy/teal tables, a running header and footer) are liked for
their look, but the numbers in them were made up. This generator keeps the
look and fills it from files the real tools wrote. It never computes a search
number of its own: every value in a section is copied from the named file, and
a value the file does not contain is printed as "not provided". The only
things the dossier computes are SHA-256 hashes of files and the lon/lat to x/y
projection of the overview map.

Inputs (all optional except --case; each becomes a section):

  --case case.json            case header: case_id (required), subject,
                              ipp {lat, lon} (or ipp_lat / ipp_lon), dates
                              {label: value}, analyst, title, agency
  --search-theory r.json      search_theory.py --out JSON
  --optimal plan.json         optimal_search.py --out JSON
  --lpb DIR|summary.json      lost_person_behavior.py --out DIR (summary.json, rings.geojson)
  --lps DIR                   lost_person_sim.py simulate/update --out DIR
                              (summary.json or update_summary.json, contours.geojson,
                              containment_rings.geojson, segments.csv)
  --burial DIR                burial_signature.py or microtopo.py --out-dir DIR
  --microtopo DIR             (manifest.json, ledger.csv); both flags repeat
  --evidence ranked.csv       evidence_scoring.py rank --out CSV
  --qpcr result.json          qpcr_interpret.py --out JSON
  --drift DIR|summary.json    drift_envelope.py --out-dir DIR (summary.json, envelope.csv)

Status chip per section:
  COMPUTED  the section was filled from the tool's output file
  MISSING   no output for that tool was given
  FLAGGED   the tool's own output reports a limit, warning, failed control,
            non-converged calibration, residual mass, or a recorded SHA-256
            that no longer matches the file; the reasons are listed in the
            section, each pointing at the field that triggered it

Output: one self-contained HTML file (inline CSS from dossier_style.css, inline
SVG, no scripts, no external fonts) with print CSS: @page margins and margin
boxes for the running header and footer (case ID, page x of y, generation
time, a "not validated" notice). If reportlab is importable a PDF with the
same content, header and footer is also written; otherwise print the HTML to
PDF from a browser.

  python dossier.py --case case.json --search-theory r.json --optimal plan.json --out dossier.html

Exit codes: 0 written; 2 bad arguments or an input that cannot be read or is
not the expected tool output.
"""

import argparse
import csv
import datetime as dt
import hashlib
import html
import json
import math
import os
import sys
from xml.sax.saxutils import escape as xml_escape

HERE = os.path.dirname(os.path.abspath(__file__))
CSS_PATH = os.path.join(HERE, "dossier_style.css")

NP = "not provided"
NOT_VALIDATED = ("NOT VALIDATED: planning and screening outputs copied from tool files. "
                 "Not evidence; every location needs ground verification.")
MAX_ROWS = 30

STATUS_COMPUTED, STATUS_MISSING, STATUS_FLAGGED = "COMPUTED", "MISSING", "FLAGGED"
CHIP_COLOURS = {STATUS_COMPUTED: "#1e8449", STATUS_FLAGGED: "#b9770e", STATUS_MISSING: "#7f8c8d"}

# Section band colours, one per tool (navy, steel, teal, royal, blue, slate, plum, olive, burgundy).
BANDS = {
    "lpb": "#1b2a4a", "lps": "#008080", "search_theory": "#094971", "optimal": "#002060",
    "drift": "#2980b9", "terrain": "#5b3a29", "evidence": "#2f3c50", "qpcr": "#5b2c6f",
}

# Caveats copied from each tool's module docstring, for outputs that do not
# carry their own note. test_dossier checks every one still appears in the
# module it is attributed to, so a reworded docstring fails the test instead
# of leaving a stale quote here.
DOC_CAVEATS = {
    "evidence_scoring.py": [
        "This gate is stricter than \"anything not E/F\": the tool never promotes a clue to a geography "
        "driver on its own judgement.",
        "The source axis leads because the schema says physical/instrumented (A-tier) evidence outranks all "
        "witness/OSINT.",
    ],
    "qpcr_interpret.py": [
        "\"Detected\" is the lab's call about DNA in the tube. It does not by itself identify a person; that "
        "needs a profile comparison done by the lab.",
        "There are no built-in \"scores\": every call is a rule applied to the plate, and the rules are "
        "printed with the result.",
    ],
    "search_theory.py": [
        "These are planning numbers. POA starts as a judgement (or a lost-person-behaviour prior); the update "
        "only redistributes it.",
    ],
    "optimal_search.py": [
        "Planning numbers only: the result is as good as the POA and sweep widths fed in.",
    ],
    "microtopo.py": [
        "A change in a DEM is a change in the terrain surface. It says nothing about what caused it "
        "(construction, ploughing, erosion, vegetation misclassified as ground, a different processing chain). "
        "Every result needs ground checking.",
    ],
    "burial_signature.py": [
        "A terrain change is not evidence of a burial; every candidate needs ground verification.",
    ],
}


class InputError(Exception):
    """An input file is missing, unreadable or not the expected tool output."""


class _Missing:
    def __repr__(self):
        return NP


MISSING = _Missing()


# ------------------------------------------------------------------ reading


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_json(path, what):
    if not os.path.isfile(path):
        raise InputError(f"{what}: {path} is not a file")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as e:
        raise InputError(f"{what}: cannot read {path}: {e}") from None


def load_csv(path, what):
    if not os.path.isfile(path):
        raise InputError(f"{what}: {path} is not a file")
    try:
        with open(path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            return list(reader.fieldnames or []), rows
    except (OSError, UnicodeDecodeError, csv.Error) as e:
        raise InputError(f"{what}: cannot read {path}: {e}") from None


def get(obj, *keys):
    """obj[k1][k2]...; MISSING when any step is absent or not a container."""
    for k in keys:
        if isinstance(obj, dict) and k in obj:
            obj = obj[k]
        elif isinstance(obj, list) and isinstance(k, int) and -len(obj) <= k < len(obj):
            obj = obj[k]
        else:
            return MISSING
    return obj


def v(x):
    """A value as text, verbatim: strings as written, everything else as JSON writes it."""
    if x is MISSING:
        return NP
    if isinstance(x, str):
        return x
    try:
        return json.dumps(x, ensure_ascii=False, allow_nan=True)
    except (TypeError, ValueError):
        return str(x)


def _require_dict(data, path, what, keys):
    if not isinstance(data, dict) or not any(k in data for k in keys):
        raise InputError(f"{what}: {path} does not look like {what} output (expected one of {sorted(keys)})")


def _resolve(path, names, what):
    """A directory or a file; for a directory, the first of names inside it."""
    if os.path.isdir(path):
        for n in names:
            p = os.path.join(path, n)
            if os.path.isfile(p):
                return p
        raise InputError(f"{what}: {path} contains none of {names}")
    if os.path.isfile(path):
        return path
    raise InputError(f"{what}: {path} does not exist")


# ------------------------------------------------------------------ model


def new_section(key, title, tool, flag):
    return {"key": key, "title": title, "tool": tool, "flag": flag, "band": BANDS[key],
            "status": STATUS_MISSING, "flags": [], "inputs": [], "facts": [], "tables": [],
            "caveats": [], "files": [], "map": [], "message": ""}


def missing_section(key, title, tool, flag):
    s = new_section(key, title, tool, flag)
    s["message"] = f"No output from {tool} was supplied ({flag}). Nothing is shown for this tool."
    return s


def finish(s):
    s["status"] = STATUS_FLAGGED if s["flags"] else STATUS_COMPUTED
    return s


def read_file(s, role, path):
    s["files"].append((role, os.path.abspath(path)))


def facts(s, rows):
    s["facts"].extend((label, v(val)) for label, val in rows)


def add_table(s, title, columns, rows, note="", source=None, max_rows=MAX_ROWS):
    rows = [[v(c) for c in r] for r in rows]
    if max_rows and len(rows) > max_rows:
        extra = f"Showing the first {max_rows} of {len(rows)} rows"
        extra += f"; all rows are in {source}." if source else "."
        note = (note + " " + extra).strip()
        rows = rows[:max_rows]
    s["tables"].append({"title": title, "columns": list(columns), "rows": rows, "note": note})


def dict_rows(items, cols):
    if not isinstance(items, list):
        return []
    return [[get(it, c) if isinstance(it, dict) else MISSING for c in cols] for it in items]


def caveat(s, origin, text):
    if text is MISSING or text in (None, ""):
        return
    s["caveats"].append((origin, v(text)))


def doc_caveats(s, module):
    for t in DOC_CAVEATS.get(module, []):
        s["caveats"].append((f"{module} module documentation", t))


def _num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def check_recorded(path, recorded):
    """Compare a tool-recorded sha256 with the file as it is now."""
    if not isinstance(recorded, str) or not recorded:
        return "not recorded by tool"
    if not isinstance(path, str) or not os.path.isfile(path):
        return "file not available here; not re-checked"
    return "match" if sha256_file(path) == recorded else "MISMATCH"


# ------------------------------------------------------------------ case header


def read_case(path):
    data = load_json(path, "case header")
    if not isinstance(data, dict):
        raise InputError(f"case header: {path} must be a JSON object")
    cid = data.get("case_id")
    if not isinstance(cid, (str, int)) or str(cid).strip() == "":
        raise InputError(f"case header: {path} needs a non-empty case_id")
    ipp = data.get("ipp") if isinstance(data.get("ipp"), dict) else {}
    lat = ipp.get("lat", data.get("ipp_lat"))
    lon = ipp.get("lon", data.get("ipp_lon"))
    for name, val in (("IPP lat", lat), ("IPP lon", lon)):
        if val is not None and not _num(val):
            raise InputError(f"case header: {name} must be a number, got {val!r}")
    if lat is not None and not -90 <= lat <= 90 or lon is not None and not -180 <= lon <= 180:
        raise InputError("case header: IPP lat/lon out of range")
    dates = data.get("dates")
    if dates is not None and not isinstance(dates, (dict, list)):
        raise InputError("case header: dates must be an object {label: value} or a list")

    def txt(k):
        x = data.get(k)
        return NP if x is None or x == "" else v(x)

    return {"case_id": str(cid), "subject": txt("subject"), "title": txt("title"), "analyst": txt("analyst"),
            "agency": txt("agency"), "classification": txt("classification"),
            "ipp_lat": lat, "ipp_lon": lon, "dates": dates, "path": os.path.abspath(path)}


# ------------------------------------------------------------------ sections


def sec_search_theory(path, max_rows):
    s = new_section("search_theory", "Search theory: coverage, POD and Bayesian POA", "search_theory.py",
                    "--search-theory")
    d = load_json(path, "search_theory.py")
    _require_dict(d, path, "search_theory.py", {"tasking_before", "rounds", "final_poa", "cumulative_pos"})
    read_file(s, "search_theory.py result JSON", path)
    s["inputs"].append(("segments CSV", "not recorded in the result JSON", None, "not recorded by tool"))
    facts(s, [("Cumulative probability of success (cumulative_pos)", get(d, "cumulative_pos"))])
    cols = ["rank", "name", "poa", "area_km2", "pden", "psr"]
    add_table(s, "Tasking before search (tasking_before)", cols, dict_rows(get(d, "tasking_before"), cols),
              max_rows=max_rows)
    rounds = get(d, "rounds")
    add_table(s, "Search rounds (rounds)", ["round", "probability_of_success", "pod"],
              dict_rows(rounds, ["round", "probability_of_success", "pod"]), max_rows=max_rows)
    final, cum = get(d, "final_poa"), get(d, "cumulative_pod")
    if isinstance(final, dict):
        rows = [[n, p, get(cum, n)] for n, p in final.items()]
        add_table(s, "Posterior POA and cumulative POD (final_poa, cumulative_pod)",
                  ["segment", "final_poa", "cumulative_pod"], rows, max_rows=max_rows)
    add_table(s, "Tasking after search (tasking_after)", cols, dict_rows(get(d, "tasking_after"), cols),
              max_rows=max_rows)
    caveat(s, "result JSON: note", get(d, "note"))
    doc_caveats(s, "search_theory.py")
    return finish(s)


def sec_optimal(path, max_rows):
    s = new_section("optimal", "Optimal allocation of search effort", "optimal_search.py", "--optimal")
    d = load_json(path, "optimal_search.py")
    _require_dict(d, path, "optimal_search.py", {"optimal", "naive_plans", "uniformly_optimal"})
    read_file(s, "optimal_search.py result JSON", path)
    s["inputs"].append(("segments CSV", "not recorded in the result JSON", None, "not recorded by tool"))
    facts(s, [
        ("Effort unit (optimal.unit)", get(d, "optimal", "unit")),
        ("Effort budget (optimal.budget)", get(d, "optimal", "budget")),
        ("Lagrange multiplier (optimal.lambda)", get(d, "optimal", "lambda")),
        ("Optimal POS (optimal.total_pos)", get(d, "optimal", "total_pos")),
        ("Uniformly optimal plan POS (uniformly_optimal.total_pos)", get(d, "uniformly_optimal", "total_pos")),
        ("Increments nested (uniformly_optimal.nested)", get(d, "uniformly_optimal", "nested")),
        ("Sequential re-plan POS (sequential_replan.total_pos)", get(d, "sequential_replan", "total_pos")),
    ])
    cols = ["name", "poa", "effort_km", "effort_hours", "coverage", "pod", "pos", "funded"]
    add_table(s, "Optimal plan by segment (optimal.segments)", cols, dict_rows(get(d, "optimal", "segments"), cols),
              max_rows=max_rows)
    naive = get(d, "naive_plans")
    if isinstance(naive, dict):
        add_table(s, "Naive plans on the same budget (naive_plans)", ["plan", "total_pos", "optimal_gain"],
                  [[k, get(p, "total_pos"), get(p, "optimal_gain")] for k, p in naive.items()], max_rows=max_rows)
    cols = ["increment", "cumulative_budget", "cumulative_pos"]
    add_table(s, "Uniformly optimal increments (uniformly_optimal.increments)", cols,
              dict_rows(get(d, "uniformly_optimal", "increments"), cols), max_rows=max_rows)
    cols = ["increment", "lambda", "probability_of_success", "cumulative_pos"]
    add_table(s, "Sequential re-plan on the posterior (sequential_replan.increments)", cols,
              dict_rows(get(d, "sequential_replan", "increments"), cols), max_rows=max_rows)
    if get(d, "uniformly_optimal", "nested") is False:
        s["flags"].append("uniformly_optimal.nested is false: the tool found an increment that takes effort "
                          "back, so the nested (uniformly optimal) property did not hold for this input.")
    caveat(s, "result JSON: note", get(d, "note"))
    doc_caveats(s, "optimal_search.py")
    return finish(s)


def _rings_layer(gj, colour, label_key, origin):
    layers = []
    for f in get(gj, "features") if isinstance(get(gj, "features"), list) else []:
        g, props = get(f, "geometry"), get(f, "properties")
        if not isinstance(g, dict):
            continue
        lab = v(get(props, label_key)) if isinstance(props, dict) else ""
        if g.get("type") == "Polygon" and isinstance(g.get("coordinates"), list):
            layers.append({"kind": "polygon", "rings": [g["coordinates"][0]] if g["coordinates"] else [],
                           "colour": colour, "label": lab, "origin": origin})
        elif g.get("type") == "MultiPolygon" and isinstance(g.get("coordinates"), list):
            layers.append({"kind": "polygon", "rings": [p[0] for p in g["coordinates"] if p],
                           "colour": colour, "label": lab, "origin": origin})
    return layers


def sec_lpb(path, max_rows):
    s = new_section("lpb", "Lost-person behaviour rings (2003 UK handbook)", "lost_person_behavior.py", "--lpb")
    rings_gj = None
    if os.path.isdir(path):
        summ_path = _resolve(path, ["summary.json"], "lost_person_behavior.py")
        rp = os.path.join(path, "rings.geojson")
        if os.path.isfile(rp):
            rings_gj = load_json(rp, "lost_person_behavior.py rings")
            read_file(s, "lost_person_behavior.py rings.geojson", rp)
    else:
        summ_path = _resolve(path, [], "lost_person_behavior.py")
    d = load_json(summ_path, "lost_person_behavior.py")
    if isinstance(d, dict) and d.get("type") == "FeatureCollection":
        rings_gj, d = d, {}
        read_file(s, "lost_person_behavior.py rings.geojson", summ_path)
    else:
        _require_dict(d, summ_path, "lost_person_behavior.py", {"category", "rings", "printed_tables"})
        read_file(s, "lost_person_behavior.py summary.json", summ_path)
    s["inputs"].append(("handbook data", "lpb_mpb2003.json (citation below)", None, "not recorded by tool"))
    facts(s, [
        ("Category (category)", get(d, "category")), ("Title (title)", get(d, "title")),
        ("Dataset (dataset)", get(d, "dataset")), ("Sample size n (sample_size)", get(d, "sample_size")),
        ("Rings table page (rings_page)", get(d, "rings_page")), ("IPP lat (ipp.lat)", get(d, "ipp", "lat")),
        ("IPP lon (ipp.lon)", get(d, "ipp", "lon")), ("Error (error)", get(d, "error")),
    ])
    rel = get(d, "find", "relative_to_rings")
    if rel is not MISSING:
        facts(s, [("Find lat/lon (find.lat, find.lon)", [get(d, "find", "lat"), get(d, "find", "lon")]),
                  ("Find distance km (find.relative_to_rings.distance_km)", get(rel, "distance_km")),
                  ("Find inside ring % (inside_ring_percent)", get(rel, "inside_ring_percent")),
                  ("Find CDF (cdf_piecewise_linear)", get(rel, "cdf_piecewise_linear"))])
    cols = ["percent", "km", "miles", "interpolated", "page", "n", "dataset"]
    rings = get(d, "rings")
    if not isinstance(rings, list) and rings_gj is not None:
        rings = [f.get("properties") for f in get(rings_gj, "features") or []
                 if isinstance(f, dict) and isinstance(f.get("properties"), dict) and "percent" in f["properties"]]
    add_table(s, "Distance-from-IPP rings (rings)", cols, dict_rows(rings, cols), max_rows=max_rows)
    wf = get(d, "where_found", "percent")
    if isinstance(wf, dict):
        add_table(s, "Where found, % as printed (where_found.percent)", ["where", "percent"],
                  [[k, x] for k, x in wf.items()], note=f"Page {v(get(d, 'where_found', 'page'))}.",
                  max_rows=max_rows)
    if rings_gj is not None:
        s["map"].extend(_rings_layer(rings_gj, "#5dade2", "label", "LPB ring"))
    for k in ("note", "planning_prior", "citation"):
        caveat(s, f"summary.json: {k}", get(d, k))
    if rings_gj is not None:
        caveat(s, "rings.geojson: note", get(rings_gj, "note"))
    cat = get(d, "category")
    for f in get(d, "transcription_flags") if isinstance(get(d, "transcription_flags"), list) else []:
        pg = get(f, "page") if get(f, "page") is not MISSING else get(f, "pages")
        caveat(s, f"summary.json: transcription_flags (page {v(pg)})", get(f, "issue"))
        if isinstance(f, dict) and f.get("category") is not None and f.get("category") == cat:
            s["flags"].append(f"transcription_flags has a flag for this category (page {v(get(f, 'page'))}).")
    if get(d, "error") is not MISSING:
        s["flags"].append(f"summary.json error: {v(get(d, 'error'))}")
    if get(d, "zero_radius_rings") not in (MISSING, [], None):
        s["flags"].append(f"zero_radius_rings = {v(get(d, 'zero_radius_rings'))}")
    return finish(s)


def _sim_inputs(s, inputs):
    dems = get(inputs, "dem")
    for p in dems if isinstance(dems, list) else []:
        s["inputs"].append(("DEM (inputs.dem)", v(p), None, "not recorded by tool"))
    if get(inputs, "synthetic_terrain") is True:
        s["inputs"].append(("terrain", "synthetic (inputs.synthetic_terrain = true)", None, ""))
    lf = get(inputs, "linear_features_and_barriers")
    if isinstance(lf, dict):
        for k, paths in lf.items():
            s["inputs"].append((f"{k} (inputs.linear_features_and_barriers)", v(paths), None, "not recorded by tool"))
    for k in ("segments", "prior", "searched"):
        if isinstance(get(inputs, k), str):
            s["inputs"].append((f"{k} (inputs.{k})", get(inputs, k), None, "not recorded by tool"))


def _sim_summary(s, d, max_rows):
    inp, cal, dia = get(d, "inputs"), get(d, "calibration"), get(d, "diagnostics")
    _sim_inputs(s, inp)
    facts(s, [
        ("Category (inputs.category)", get(inp, "category")),
        ("Elapsed hours (inputs.elapsed_hours)", get(inp, "elapsed_hours")),
        ("IPP lat, lon (inputs.ipp)", [get(inp, "ipp", "lat"), get(inp, "ipp", "lon")]),
        ("Grid res m / CRS / radius km (inputs.grid)",
         [get(inp, "grid", "res_m"), get(inp, "grid", "crs"), get(inp, "grid", "radius_km")]),
        ("Agents / seed (inputs.params)", [get(inp, "params", "n_agents"), get(inp, "params", "seed")]),
        ("Calibrated (calibration.calibrated)", get(cal, "calibrated")),
        ("Converged (calibration.converged)", get(cal, "converged")),
        ("Walk scale k, hours (calibration.walk_scale_hours)", get(cal, "walk_scale_hours")),
        ("Calibration target (calibration.target)", get(cal, "target")),
        ("Calibration message (calibration.message)", get(cal, "message")),
        ("LPB table used (calibration.lpb_table)", get(cal, "lpb_table")),
        ("Agents at grid edge (diagnostics.fraction_at_grid_edge)", get(dia, "fraction_at_grid_edge")),
        ("Still walking at elapsed (diagnostics.fraction_still_walking_at_elapsed)",
         get(dia, "fraction_still_walking_at_elapsed")),
        ("Budget capped at max walk (calibration.fraction_budget_capped_at_max_walk_hours)",
         get(cal, "fraction_budget_capped_at_max_walk_hours")),
        ("Probability total (probability_total)", get(d, "probability_total")),
        ("Model (model)", get(d, "model")),
    ])
    q = get(cal, "quantiles")
    if isinstance(q, dict):
        cols = ["lpb_km", "sim_km", "residual_km", "relative", "lpb_interpolated"]
        add_table(s, "Calibration against the LPB table (calibration.quantiles)", ["percent"] + cols,
                  [[p] + [get(r, c) for c in cols] for p, r in q.items()],
                  note=f"Tolerance (calibration.tolerance): {v(get(cal, 'tolerance'))}.", max_rows=max_rows)
    sd = get(d, "simulated_distance_km_at_elapsed")
    if isinstance(sd, dict):
        add_table(s, "Simulated straight-line distance at the elapsed time, km", ["percent", "km"],
                  [[p, x] for p, x in sd.items()], max_rows=max_rows)
    sc = get(dia, "strategy_counts")
    if isinstance(sc, dict):
        add_table(s, "Behaviour mixture actually drawn (diagnostics.strategy_counts)", ["behaviour", "agents"],
                  [[k, x] for k, x in sc.items()], max_rows=max_rows)
    for a in get(d, "assumptions") if isinstance(get(d, "assumptions"), list) else []:
        caveat(s, "summary.json: assumptions", a)
    for k in ("note", "citation"):
        caveat(s, f"summary.json: {k}", get(d, k))
    if get(cal, "calibrated") is True and get(cal, "converged") is False:
        s["flags"].append(f"calibration.converged is false: {v(get(cal, 'message'))}")
    edge = get(dia, "fraction_at_grid_edge")
    if _num(edge) and edge > 0:
        s["flags"].append(f"diagnostics.fraction_at_grid_edge = {v(edge)}: some agents ended on the grid edge, "
                          "so the grid radius truncates the simulated distribution.")
    capped = get(cal, "fraction_budget_capped_at_max_walk_hours")
    if _num(capped) and capped > 0:
        s["flags"].append(f"calibration.fraction_budget_capped_at_max_walk_hours = {v(capped)}.")
    if get(dia, "elapsed_walk_capped_by_max_walk_hours") is True:
        s["flags"].append("diagnostics.elapsed_walk_capped_by_max_walk_hours is true.")


def _sim_update(s, d, max_rows):
    _sim_inputs(s, get(d, "inputs"))
    facts(s, [
        ("P(success) this round (probability_of_success_this_round)", get(d, "probability_of_success_this_round")),
        ("Cleared cells (cleared_cells)", get(d, "cleared_cells")),
        ("Posterior total (posterior_total)", get(d, "posterior_total")),
        ("Formula (formula)", get(d, "formula")),
    ])
    cols = ["name", "pod", "cells"]
    add_table(s, "Searches applied (inputs.searches)", cols, dict_rows(get(d, "inputs", "searches"), cols),
              max_rows=max_rows)
    caveat(s, "update_summary.json: note", get(d, "note"))


def sec_lps(path, max_rows):
    s = new_section("lps", "Lost-person simulation (agent-based probability map)", "lost_person_sim.py", "--lps")
    if not os.path.isdir(path):
        raise InputError(f"lost_person_sim.py: {path} is not an output directory")
    sp = os.path.join(path, "summary.json")
    up = os.path.join(path, "update_summary.json")
    if not os.path.isfile(sp) and not os.path.isfile(up):
        raise InputError(f"lost_person_sim.py: {path} has neither summary.json nor update_summary.json")
    if os.path.isfile(sp):
        d = load_json(sp, "lost_person_sim.py summary")
        _require_dict(d, sp, "lost_person_sim.py", {"calibration", "inputs", "diagnostics"})
        read_file(s, "lost_person_sim.py summary.json", sp)
        _sim_summary(s, d, max_rows)
    if os.path.isfile(up):
        d = load_json(up, "lost_person_sim.py update summary")
        _require_dict(d, up, "lost_person_sim.py update", {"probability_of_success_this_round", "posterior_total"})
        read_file(s, "lost_person_sim.py update_summary.json", up)
        _sim_update(s, d, max_rows)
    cp = os.path.join(path, "contours.geojson")
    if os.path.isfile(cp):
        gj = load_json(cp, "lost_person_sim.py contours")
        read_file(s, "lost_person_sim.py contours.geojson", cp)
        cols = ["level", "label", "mass", "area_km2", "cells"]
        feats = get(gj, "features") if isinstance(get(gj, "features"), list) else []
        add_table(s, "Cumulative-probability regions (contours.geojson)", cols,
                  dict_rows([get(f, "properties") for f in feats], cols), max_rows=max_rows)
        s["map"].extend(_rings_layer(gj, "#48c9b0", "label", "simulation contour"))
    rp = os.path.join(path, "containment_rings.geojson")
    if os.path.isfile(rp):
        read_file(s, "lost_person_sim.py containment_rings.geojson", rp)
        load_json(rp, "lost_person_sim.py containment rings")
    gp = os.path.join(path, "segments.csv")
    if os.path.isfile(gp):
        cols, rows = load_csv(gp, "lost_person_sim.py segments")
        read_file(s, "lost_person_sim.py segments.csv", gp)
        add_table(s, "Segment POA from the probability map (segments.csv)", cols,
                  [[r.get(c, MISSING) for c in cols] for r in rows], source="segments.csv", max_rows=max_rows)
    for name in ("probability.tif", "posterior.tif"):
        if os.path.isfile(os.path.join(path, name)):
            read_file(s, f"lost_person_sim.py {name} (hashed, not read)", os.path.join(path, name))
    return finish(s)


BURIAL_LEDGER = ["id", "type", "label", "centroid_lat", "centroid_lon", "area_m2", "peak_score", "min_q",
                 "p_mound", "p_sink", "mound_interval", "sink_interval", "p_calibrated_max", "depth_max_m",
                 "length_m", "distance_m", "bearing_deg_true"]
MICRO_LEDGER = ["id", "type", "centroid_lat", "centroid_lon", "area_m2", "mean_dz_m", "max_dz_m", "volume_m3",
                "mean_lrm_m", "min_svf", "distance_m", "bearing_deg_true"]


def _manifest_inputs(obj, prefix, out):
    """Flatten manifest['inputs'] to (item, value, recorded sha256)."""
    if isinstance(obj, dict):
        if "path" in obj:
            out.append((prefix + ".path", obj["path"], obj.get("sha256")))
            for k, x in obj.items():
                if k in ("path", "sha256"):
                    continue
                if k.endswith("_sha256"):
                    continue
                if k == "sigma_raster" and isinstance(x, str):
                    out.append((f"{prefix}.{k}", x, obj.get("sigma_raster_sha256")))
                elif not isinstance(x, (dict, list)):
                    out.append((f"{prefix}.{k}", x, None))
                else:
                    _manifest_inputs(x, f"{prefix}.{k}", out)
        else:
            for k, x in obj.items():
                _manifest_inputs(x, f"{prefix}.{k}" if prefix else k, out)
    elif isinstance(obj, list):
        for i, x in enumerate(obj):
            _manifest_inputs(x, f"{prefix}[{i}]", out)
    else:
        out.append((prefix, obj, None))


def sec_terrain(path, max_rows, flag):
    if not os.path.isdir(path):
        raise InputError(f"{flag}: {path} is not an output directory")
    mp = os.path.join(path, "manifest.json")
    man = load_json(mp, f"{flag} manifest")
    _require_dict(man, mp, "burial_signature.py / microtopo.py manifest", {"tool", "outputs_sha256", "results"})
    tool_name = v(get(man, "tool"))
    module = "burial_signature.py" if tool_name.startswith("burial_signature") else (
        "microtopo.py" if tool_name.startswith("microtopo") else tool_name)
    title = ("Burial-timeline screening (DEM stack)" if module == "burial_signature.py"
             else "Micro-topographic change (two DEMs)")
    s = new_section("terrain", title, module, flag)
    read_file(s, f"{module} manifest.json", mp)
    rows = []
    _manifest_inputs(get(man, "inputs"), "inputs", rows)
    for item, val, sha in rows:
        if sha is not None:
            check = check_recorded(val, sha)
            if check == "MISMATCH":
                s["flags"].append(f"{item}: recorded sha256 does not match the file at {v(val)}.")
        else:
            check = "not recorded by tool" if item.endswith(".path") else ""
        s["inputs"].append((item, v(val), sha, check))
    res = get(man, "results")
    facts(s, [("Tool / version (tool, version)", [get(man, "tool"), get(man, "version")]),
              ("Created UTC (created_utc)", get(man, "created_utc")), ("Status (status)", get(man, "status")),
              ("Label (label)", get(man, "label")), ("Grid (grid)", get(man, "grid"))])
    if isinstance(res, dict):
        facts(s, [(f"{k} (results.{k})", x) for k, x in res.items() if not isinstance(x, (dict, list))])
        if isinstance(res.get("reference_point"), dict):
            facts(s, [("Reference point (results.reference_point)", res["reference_point"])])
    cols = ["pair", "sigma_used_median_m", "lod_median_m", "cells_rise_above_lod", "cells_drop_below_lod"]
    if isinstance(get(res, "pairs"), list):
        add_table(s, "Epoch pairs (results.pairs)", cols, dict_rows(get(res, "pairs"), cols), max_rows=max_rows)
    lp = os.path.join(path, "ledger.csv")
    if os.path.isfile(lp):
        lcols, lrows = load_csv(lp, f"{module} ledger")
        read_file(s, f"{module} ledger.csv", lp)
        want = BURIAL_LEDGER if module == "burial_signature.py" else MICRO_LEDGER
        show = [c for c in want if c in lcols] or lcols
        add_table(s, "Anomaly ledger (ledger.csv)", show, [[r.get(c, MISSING) for c in show] for r in lrows],
                  note="Selected columns; the ledger has more.", source="ledger.csv", max_rows=max_rows)
        pts = []
        for r in lrows:
            try:
                pts.append((float(r["centroid_lon"]), float(r["centroid_lat"]), r.get("id", "")))
            except (KeyError, TypeError, ValueError):
                continue
        if pts:
            s["map"].append({"kind": "points", "points": pts, "colour": "#f5b041", "label": "ledger centroids",
                             "origin": module})
    outs = get(man, "outputs_sha256")
    if isinstance(outs, dict):
        trows = []
        for name, rec in sorted(outs.items()):
            fp = os.path.join(path, os.path.basename(str(name)))
            check = check_recorded(fp, rec)
            if check == "MISMATCH":
                s["flags"].append(f"outputs_sha256: {name} changed after the tool wrote the manifest.")
            trows.append([name, rec, check])
        add_table(s, "Output files: recorded sha256 re-checked (outputs_sha256)", ["file", "recorded sha256", "now"],
                  trows, max_rows=0)
    st = get(man, "status")
    if st is not MISSING and st not in ("complete",):
        s["flags"].append(f"manifest status = {v(st)}")
    cal = get(res, "calibration")
    if isinstance(cal, dict):
        caveat(s, "manifest: results.calibration.status", cal.get("status"))
    caveat(s, "manifest: label", get(man, "label"))
    caveat(s, "manifest: note", get(man, "note"))
    doc_caveats(s, module)
    return finish(s)


def sec_evidence(path, max_rows):
    s = new_section("evidence", "Evidence scoring (Admiralty two-axis)", "evidence_scoring.py", "--evidence")
    cols, rows = load_csv(path, "evidence_scoring.py")
    if not {"rank", "code", "geography_role"} <= set(cols):
        raise InputError(f"evidence_scoring.py: {path} lacks the rank, code and geography_role columns of a "
                         "ranked CSV")
    read_file(s, "evidence_scoring.py ranked CSV", path)
    s["inputs"].append(("clue source", "not recorded in the ranked CSV", None, "not recorded by tool"))
    add_table(s, "Ranked clues (as written by the tool)", cols, [[r.get(c, MISSING) for c in cols] for r in rows],
              source=os.path.basename(path), max_rows=max_rows)
    vo = [r.get("code", "") for r in rows if r.get("geography_role") == "verify-only"]
    if vo:
        s["flags"].append(f"{len(vo)} clue(s) with geography_role verify-only (codes {', '.join(vo)}): the tool "
                          "routes these to investigators; they never set search geography.")
    doc_caveats(s, "evidence_scoring.py")
    return finish(s)


def sec_qpcr(path, max_rows):
    s = new_section("qpcr", "qPCR plate interpretation (human mtDNA)", "qpcr_interpret.py", "--qpcr")
    d = load_json(path, "qpcr_interpret.py")
    _require_dict(d, path, "qpcr_interpret.py", {"run_valid", "samples", "rules"})
    read_file(s, "qpcr_interpret.py result JSON", path)
    s["inputs"].append(("plate CSV", "not recorded in the result JSON", None, "not recorded by tool"))
    facts(s, [("Run valid (run_valid)", get(d, "run_valid")), ("Run problems (run_problems)", get(d, "run_problems"))])
    rules = get(d, "rules")
    if isinstance(rules, dict):
        add_table(s, "Rules applied (rules)", ["rule", "value"], [[k, x] for k, x in rules.items()], max_rows=0)
    cols = ["sample_id", "call", "mean_ct", "human_ct", "ipc_ct"]
    add_table(s, "Calls per sample (samples)", cols, dict_rows(get(d, "samples"), cols), max_rows=max_rows)
    if get(d, "run_valid") is False:
        s["flags"].append(f"run_valid is false: {v(get(d, 'run_problems'))}")
    for smp in get(d, "samples") if isinstance(get(d, "samples"), list) else []:
        if get(smp, "call") in ("INHIBITED", "INCONCLUSIVE", "RUN_INVALID"):
            s["flags"].append(f"sample {v(get(smp, 'sample_id'))}: call {v(get(smp, 'call'))}")
    doc_caveats(s, "qpcr_interpret.py")
    return finish(s)


def sec_drift(path, max_rows):
    s = new_section("drift", "Riverine drift envelope", "drift_envelope.py", "--drift")
    sp = _resolve(path, ["summary.json"], "drift_envelope.py")
    d = load_json(sp, "drift_envelope.py")
    _require_dict(d, sp, "drift_envelope.py", {"model", "top_cells", "rejected_naive_estimate"})
    read_file(s, "drift_envelope.py summary.json", sp)
    ep = os.path.join(os.path.dirname(sp), "envelope.csv")
    if os.path.isfile(ep):
        read_file(s, "drift_envelope.py envelope.csv (hashed, not read)", ep)
    mi = get(d, "measured_inputs")
    if isinstance(mi, dict):
        for k, x in mi.items():
            s["inputs"].append((f"measured_inputs.{k}", v(x), None, ""))
    if get(d, "case") not in (MISSING, None):
        s["inputs"].append(("case (case)", v(get(d, "case")), None, "not recorded by tool"))
    facts(s, [
        ("LKP (lkp)", get(d, "lkp")),
        ("Decay / median m (model.decay, model.median_m)", [get(d, "model", "decay"), get(d, "model", "median_m")]),
        ("Reach m / cell m (model.reach_m, model.cell_m)", [get(d, "model", "reach_m"), get(d, "model", "cell_m")]),
        ("Prior mass beyond reach (model.prior_mass_beyond_reach)", get(d, "model", "prior_mass_beyond_reach")),
        ("Mass within (mass_within)", get(d, "mass_within")),
        ("Refloat band / timing (refloat)", [get(d, "refloat", "band"), get(d, "refloat", "timing")]),
        ("Naive velocity x time estimate (rejected_naive_estimate.status)",
         get(d, "rejected_naive_estimate", "status")),
        ("Naive estimate used for envelope (rejected_naive_estimate.used_for_envelope)",
         get(d, "rejected_naive_estimate", "used_for_envelope")),
        ("Warnings (warnings)", get(d, "warnings")),
    ])
    cols = ["rank", "cell", "start_m", "end_m", "probability", "cumulative", "search_priority", "features"]
    add_table(s, "Top cells by search priority (top_cells)", cols, dict_rows(get(d, "top_cells"), cols),
              max_rows=max_rows)
    cols = ["name", "type", "distance_m", "multiplier", "multiplier_source"]
    add_table(s, "Snag features (features)", cols, dict_rows(get(d, "features"), cols), max_rows=max_rows)
    lkp = get(d, "lkp")
    if _num(get(lkp, "lat")) and _num(get(lkp, "lon")):
        s["map"].append({"kind": "points", "points": [(lkp["lon"], lkp["lat"], "LKP")], "colour": "#ec7063",
                         "label": "drift LKP", "origin": "drift_envelope.py"})
    for a in get(d, "assumptions") if isinstance(get(d, "assumptions"), list) else []:
        caveat(s, "summary.json: assumptions", a)
    caveat(s, "summary.json: geometry.note", get(d, "geometry", "note"))
    caveat(s, "summary.json: refloat.label", get(d, "refloat", "label"))
    caveat(s, "summary.json: rejected_naive_estimate.label", get(d, "rejected_naive_estimate", "label"))
    reasons = get(d, "rejected_naive_estimate", "reasons")
    for r in reasons if isinstance(reasons, list) else []:
        caveat(s, "summary.json: rejected_naive_estimate.reasons", r)
    for w in get(d, "warnings") if isinstance(get(d, "warnings"), list) else []:
        s["flags"].append(f"warning: {v(w)}")
    pm = get(d, "model", "prior_mass_beyond_reach")
    if _num(pm) and pm > 0:
        # Replaced (SYSTEM_REVIEW C3): drift_envelope no longer renormalises the
        # in-reach cells; it keeps the beyond-reach mass in its own row.
        # s["flags"].append(f"model.prior_mass_beyond_reach = {v(pm)}: that much prior mass lies past the modelled "
        #                   "reach and the in-reach cells were renormalised.")
        s["flags"].append(f"model.prior_mass_beyond_reach = {v(pm)}: that much prior mass lies past the modelled "
                          "reach (kept as the beyond_reach row, not spread over the cells).")
    return finish(s)


# ------------------------------------------------------------------ assembly


def build_model(a, generated_utc):
    case = read_case(a.case)
    mr = a.max_rows
    plan = [
        ("lpb", "Lost-person behaviour rings (2003 UK handbook)", "lost_person_behavior.py", "--lpb", a.lpb, sec_lpb),
        ("lps", "Lost-person simulation (agent-based probability map)", "lost_person_sim.py", "--lps", a.lps, sec_lps),
        ("search_theory", "Search theory: coverage, POD and Bayesian POA", "search_theory.py", "--search-theory",
         a.search_theory, sec_search_theory),
        ("optimal", "Optimal allocation of search effort", "optimal_search.py", "--optimal", a.optimal, sec_optimal),
        ("drift", "Riverine drift envelope", "drift_envelope.py", "--drift", a.drift, sec_drift),
    ]
    sections = []
    for key, title, tool, flag, path, fn in plan:
        sections.append(fn(path, mr) if path else missing_section(key, title, tool, flag))
    terr = [(p, "--burial") for p in a.burial or []] + [(p, "--microtopo") for p in a.microtopo or []]
    if terr:
        sections.extend(sec_terrain(p, mr, f) for p, f in terr)
    else:
        sections.append(missing_section("terrain", "Terrain change (burial timeline / micro-topography)",
                                        "burial_signature.py / microtopo.py", "--burial / --microtopo"))
    for key, title, tool, flag, path, fn in [
        ("evidence", "Evidence scoring (Admiralty two-axis)", "evidence_scoring.py", "--evidence", a.evidence,
         sec_evidence),
        ("qpcr", "qPCR plate interpretation (human mtDNA)", "qpcr_interpret.py", "--qpcr", a.qpcr, sec_qpcr),
    ]:
        sections.append(fn(path, mr) if path else missing_section(key, title, tool, flag))
    for i, s in enumerate(sections, 1):
        s["number"] = i
    prov = [("case header", case["path"])]
    for s in sections:
        prov.extend((f"section {s['number']}: {role}", p) for role, p in s["files"])
    hashes = {}
    for _, p in prov:
        if p not in hashes:
            hashes[p] = sha256_file(p)
    for s in sections:
        s["file_rows"] = [(role, p, hashes[p]) for role, p in s["files"]]
    provenance = [{"role": r, "path": p, "sha256": hashes[p], "bytes": os.path.getsize(p)} for r, p in prov]
    return {"case": case, "sections": sections, "provenance": provenance, "generated_utc": generated_utc}


# ------------------------------------------------------------------ map


def map_layers(model):
    """Geometry from the tool outputs, plus the case IPP; empty when no tool output has geometry."""
    layers = []
    c = model["case"]
    for s in model["sections"]:
        layers.extend(s["map"])
    if not layers:
        return []
    if _num(c["ipp_lat"]) and _num(c["ipp_lon"]):
        layers.append({"kind": "points", "points": [(c["ipp_lon"], c["ipp_lat"], "IPP")], "colour": "#ffffff",
                       "label": "case IPP", "origin": "case header"})
    return layers


def project(layers, width=680.0, height=400.0, pad=24.0):
    """Equirectangular projection fitted to the layers; returns (fn, km per px) or (None, None)."""
    pts = []
    for L in layers:
        if L["kind"] == "points":
            pts.extend((p[0], p[1]) for p in L["points"])
        else:
            for ring in L["rings"]:
                pts.extend((p[0], p[1]) for p in ring if isinstance(p, (list, tuple)) and len(p) >= 2)
    pts = [(x, y) for x, y in pts if _num(x) and _num(y)]
    if not pts:
        return None, None
    lons, lats = [p[0] for p in pts], [p[1] for p in pts]
    lat0 = (min(lats) + max(lats)) / 2.0
    k = max(math.cos(math.radians(lat0)), 1e-6)
    x0, x1 = min(lons) * k, max(lons) * k
    y0, y1 = min(lats), max(lats)
    span = max(x1 - x0, y1 - y0, 1e-5)
    scale = min((width - 2 * pad) / span, (height - 2 * pad) / span) if span else 1.0
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0

    def fn(lon, lat):
        return width / 2.0 + (lon * k - cx) * scale, height / 2.0 - (lat - cy) * scale

    return fn, 111.32 / scale


def svg_map(model):
    layers = map_layers(model)
    if not layers:
        return ""
    w, h = 680.0, 400.0
    fn, km_px = project(layers, w, h)
    if fn is None:
        return ""
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" role="img" '
           'aria-label="Overview map of tool geometries">']
    for L in layers:
        col = html.escape(L["colour"], quote=True)
        if L["kind"] == "polygon":
            for ring in L["rings"]:
                xy = [fn(p[0], p[1]) for p in ring if isinstance(p, (list, tuple)) and len(p) >= 2
                      and _num(p[0]) and _num(p[1])]
                if len(xy) < 3:
                    continue
                pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in xy)
                out.append(f'<polygon points="{pts}" fill="{col}" fill-opacity="0.08" stroke="{col}" '
                           f'stroke-width="1"><title>{html.escape(L["label"])}</title></polygon>')
        else:
            for lon, lat, lab in L["points"]:
                if not (_num(lon) and _num(lat)):
                    continue
                x, y = fn(lon, lat)
                out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{col}" stroke="#0f172a">'
                           f'<title>{html.escape(str(lab))}</title></circle>')
                out.append(f'<text x="{x + 6:.1f}" y="{y - 5:.1f}" fill="{col}" font-size="10" '
                           f'font-family="Arial, sans-serif">{html.escape(str(lab))}</text>')
    bar_km = _nice(km_px * 120)
    bar_px = bar_km / km_px
    out.append(f'<line x1="20" y1="{h - 18:.0f}" x2="{20 + bar_px:.1f}" y2="{h - 18:.0f}" stroke="#ffffff" '
               'stroke-width="2"/>')
    out.append(f'<text x="20" y="{h - 24:.0f}" fill="#ffffff" font-size="10" font-family="Arial, sans-serif">'
               f'{bar_km:g} km</text>')
    out.append(f'<text x="{w - 20:.0f}" y="22" fill="#ffffff" font-size="12" font-family="Arial, sans-serif" '
               'text-anchor="end">N &#8593;</text>')
    legend = sorted({(L["colour"], L["origin"]) for L in layers})
    for i, (col, origin) in enumerate(legend):
        y = 20 + 14 * i
        out.append(f'<rect x="14" y="{y - 8}" width="10" height="10" fill="{html.escape(col, quote=True)}"/>'
                   f'<text x="30" y="{y + 1}" fill="#dfe6ee" font-size="10" font-family="Arial, sans-serif">'
                   f'{html.escape(origin)}</text>')
    out.append("</svg>")
    return "".join(out)


def _nice(x):
    if not _num(x) or x <= 0:
        return 1.0
    e = 10 ** math.floor(math.log10(x))
    for m in (1, 2, 5, 10):
        if m * e >= x:
            return m * e
    return 10 * e


# ------------------------------------------------------------------ HTML


def css_string(text):
    """A CSS string literal; everything but plain characters is hex-escaped, so input cannot close it."""
    out = []
    for ch in text:
        if ch.isalnum() and ord(ch) < 128 or ch in " -_.,:/()|":
            out.append(ch)
        else:
            out.append(f"\\{ord(ch):06X}")
    return '"' + "".join(out) + '"'


def page_css(model):
    cid = model["case"]["case_id"]
    return ("\n@page {\n"
            f"  @top-left {{ content: {css_string('CASE DOSSIER  |  CASE ID: ' + cid)}; }}\n"
            f"  @top-right {{ content: {css_string('NOT VALIDATED')}; }}\n"
            f"  @bottom-left {{ content: {css_string('Case ' + cid + '  |  generated ' + model['generated_utc'])}; }}\n"
            f"  @bottom-center {{ content: {css_string('Not validated: tool outputs only, not evidence')}; }}\n"
            '  @bottom-right { content: "Page " counter(page) " of " counter(pages); }\n'
            "}\n")


def e(x):
    return html.escape(str(x), quote=True)


def chip(status):
    return f'<span class="chip chip-{e(status)}">{e(status)}</span>'


def cell(x):
    t = str(x)
    if t == NP:
        return f'<span class="np">{NP}</span>'
    if len(t) == 64 and all(c in "0123456789abcdef" for c in t):
        return f"<code>{e(t)}</code>"
    if t == "MISMATCH":
        return '<span class="bad">MISMATCH</span>'
    if t == "match":
        return '<span class="ok">match</span>'
    return e(t)


def _sha_cell(sha, check):
    if sha:
        return sha
    return NP if str(check).startswith("not recorded") else ""


def html_table(columns, rows, cls=""):
    head = "".join(f"<th>{e(c)}</th>" for c in columns)
    body = "".join("<tr>" + "".join(f"<td>{cell(c)}</td>" for c in r) + "</tr>" for r in rows)
    if not rows:
        body = f'<tr><td colspan="{max(len(columns), 1)}"><span class="np">{NP}</span></td></tr>'
    return (f'<div class="table-wrap"><table class="{e(cls)}"><thead><tr>{head}</tr></thead>'
            f"<tbody>{body}</tbody></table></div>")


def html_section(s, case):
    p = [f'<section class="sec" id="sec-{s["number"]}" style="--band:{e(s["band"])}">',
         f'<div class="band"><span class="title">{s["number"]}. {e(s["title"])}</span>'
         f'<span class="tool">{e(s["tool"])} {chip(s["status"])}</span></div>',
         f'<div class="caseline"><span>CASE ID: {e(case["case_id"])}</span>'
         f'<span>SOURCE: {e(s["tool"])} ({e(s["flag"])})</span><span>STATUS: {e(s["status"])}</span></div>',
         '<div class="sec-body">']
    if s["status"] == STATUS_MISSING:
        p.append(f'<p class="missing">{e(s["message"])}</p></div></section>')
        return "".join(p)
    if s["flags"]:
        p.append('<div class="flags"><strong>FLAGGED by the tool output:</strong><ul>'
                 + "".join(f"<li>{e(f)}</li>" for f in s["flags"]) + "</ul></div>")
    p.append("<h3>Source files and tool inputs</h3>")
    p.append(html_table(["file read by the dossier", "path", "sha256 (computed now)"],
                        [list(r) for r in s["file_rows"]]))
    if s["inputs"]:
        p.append(html_table(["tool input", "value", "sha256 recorded by tool", "re-check"],
                            [[i, val, _sha_cell(sha, chk), chk] for i, val, sha, chk in s["inputs"]]))
    if s["facts"]:
        p.append("<h3>Key numbers (verbatim from the file)</h3>")
        p.append(html_table(["field", "value"], s["facts"], "facts"))
    for t in s["tables"]:
        p.append(f"<h3>{e(t['title'])}</h3>")
        p.append(html_table(t["columns"], t["rows"]))
        if t["note"]:
            p.append(f'<p class="tnote">{e(t["note"])}</p>')
    if s["caveats"]:
        p.append('<div class="caveats"><strong>The tool\'s own caveats and labels</strong><ul>'
                 + "".join(f'<li>{e(t)} <span class="origin">({e(o)})</span></li>' for o, t in s["caveats"])
                 + "</ul></div>")
    p.append("</div></section>")
    return "".join(p)


def render_html(model, css):
    c = model["case"]
    secs = model["sections"]
    dates = c["dates"]
    if isinstance(dates, dict):
        date_rows = [[f"Date: {k}", v(x)] for k, x in dates.items()]
    elif isinstance(dates, list):
        date_rows = [["Dates", v(dates)]]
    else:
        date_rows = [["Dates", NP]]
    ipp = NP if c["ipp_lat"] is None or c["ipp_lon"] is None else f"{v(c['ipp_lat'])}, {v(c['ipp_lon'])}"
    header_rows = [["Case ID", c["case_id"]], ["Subject", c["subject"]], ["Title", c["title"]],
                   ["IPP lat, lon (case header)", ipp], *date_rows, ["Analyst", c["analyst"]],
                   ["Agency", c["agency"]], ["Classification", c["classification"]]]
    summary_rows = "".join(
        f'<tr><td>{s["number"]}</td><td>{e(s["title"])}</td><td><code>{e(s["tool"])}</code></td>'
        f'<td>{chip(s["status"])}</td><td>{e("; ".join(s["flags"]) if s["flags"] else (s["message"] or ""))}</td></tr>'
        for s in secs)
    smap = svg_map(model)
    map_html = (f'<h2>Overview map</h2><figure class="map">{smap}<figcaption>Schematic only: equirectangular '
                "projection of the geometries in the tool outputs listed in the legend; not for navigation."
                "</figcaption></figure>") if smap else ""
    prov_rows = [[p["role"], p["path"], p["bytes"], p["sha256"]] for p in model["provenance"]]
    run = (f"<span>CASE DOSSIER | CASE ID: {e(c['case_id'])}</span>"
           f"<span>Generated {e(model['generated_utc'])}</span><span>NOT VALIDATED</span>")
    return "".join([
        "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">",
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        f"<title>Case dossier {e(c['case_id'])}</title>",
        f"<style>\n{css}\n{page_css(model)}</style></head><body>",
        f'<header class="run top">{run}</header><main>',
        f"<h1>Case dossier: {e(c['subject'])}</h1>",
        f'<p class="subtitle">Case ID: {e(c["case_id"])} | built only from tool output files</p>',
        f'<div class="directive"><strong>HOW TO READ THIS DOSSIER:</strong> every number below is copied from the '
        "named tool's output file. Nothing is estimated by the dossier itself; a field the file does not contain "
        f"is shown as <em>{NP}</em>. Chips: COMPUTED = filled from the tool's output; MISSING = no output given; "
        "FLAGGED = the tool's output reports a limit, warning, failed control or residual, or a recorded hash no "
        f"longer matches. {e(NOT_VALIDATED)}</div>",
        "<h2>Case header</h2>", html_table(["field", "value"], header_rows, "facts"),
        "<h2>Section status</h2>",
        '<div class="table-wrap"><table><thead><tr><th>#</th><th>section</th><th>tool</th><th>status</th>'
        f"<th>reason</th></tr></thead><tbody>{summary_rows}</tbody></table></div>",
        map_html,
        "".join(html_section(s, c) for s in secs),
        '<section class="appendix"><h2>Appendix A. Provenance: every file this dossier read</h2>',
        "<p>SHA-256 computed by dossier.py when this dossier was generated. A section's own table of tool-recorded "
        "hashes (where the tool records them) is re-checked against the files as they are now.</p>",
        html_table(["role", "path", "bytes", "sha256"], prov_rows),
        f'<p class="tnote">Generated {e(model["generated_utc"])} by dossier.py. {e(NOT_VALIDATED)}</p></section>',
        f'</main><footer class="run bottom"><span>Case {e(c["case_id"])} | generated {e(model["generated_utc"])}'
        f"</span><span>{e(NOT_VALIDATED)}</span></footer></body></html>\n",
    ])


# ------------------------------------------------------------------ PDF (reportlab)


def reportlab_available():
    try:
        import reportlab  # noqa: F401
    except ImportError:
        return False
    return True


def _pdf_fonts():
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    base = "/usr/share/fonts/truetype/dejavu"
    reg, bold = os.path.join(base, "DejaVuSans.ttf"), os.path.join(base, "DejaVuSans-Bold.ttf")
    if os.path.isfile(reg) and os.path.isfile(bold):
        try:
            pdfmetrics.registerFont(TTFont("DossierSans", reg))
            pdfmetrics.registerFont(TTFont("DossierSans-Bold", bold))
            return "DossierSans", "DossierSans-Bold"
        except Exception:  # a broken font file: fall back to the built-in Helvetica
            pass
    return "Helvetica", "Helvetica-Bold"


def render_pdf(model, out_path):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.platypus import (KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
                                    PageBreak)

    font, bold = _pdf_fonts()
    navy, teal, grey, row = (colors.HexColor(x) for x in ("#1b2a4a", "#008080", "#7f8c8d", "#f4f6f9"))
    c = model["case"]
    st = {
        "body": ParagraphStyle("b", fontName=font, fontSize=8.5, leading=11),
        "cell": ParagraphStyle("c", fontName=font, fontSize=7.2, leading=9, splitLongWords=1),
        "head": ParagraphStyle("h", fontName=bold, fontSize=7.4, leading=9, textColor=colors.white),
        "h1": ParagraphStyle("h1", fontName=bold, fontSize=18, leading=22, textColor=navy),
        "sub": ParagraphStyle("s", fontName=bold, fontSize=9, leading=12, textColor=teal),
        "h2": ParagraphStyle("h2", fontName=bold, fontSize=12, leading=15, textColor=navy, spaceBefore=8),
        "h3": ParagraphStyle("h3", fontName=bold, fontSize=9.5, leading=12, textColor=navy, spaceBefore=6),
        "band": ParagraphStyle("bd", fontName=bold, fontSize=10.5, leading=13, textColor=colors.white),
        "note": ParagraphStyle("n", fontName=font, fontSize=7, leading=9, textColor=grey),
    }

    def P(text, style="cell"):
        return Paragraph(xml_escape(str(text)), st[style])

    width = letter[0] - 30 * mm

    def table(columns, rows, col_widths=None):
        data = [[P(x, "head") for x in columns]] + [[P(x) for x in r] for r in rows]
        if not rows:
            data.append([P(NP)] + [P("") for _ in columns[1:]])
        t = Table(data, colWidths=col_widths or [width / max(len(columns), 1)] * len(columns), repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), navy), ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, row]),
            ("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor("#d9d9d9")),
            ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        return t

    def box(lines, bg, edge):
        t = Table([[P(x, "body")] for x in lines], colWidths=[width])
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                               ("LINEBEFORE", (0, 0), (0, -1), 3, colors.HexColor(edge)),
                               ("TOPPADDING", (0, 0), (-1, -1), 1.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
                               ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
        return t

    def band(s):
        chip_t = Table([[P(s["status"], "head")]], colWidths=[22 * mm])
        chip_t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(CHIP_COLOURS[s["status"]])),
                                    ("ALIGN", (0, 0), (-1, -1), "CENTER")]))
        top = Table([[Paragraph(xml_escape(f"{s['number']}. {s['title']}".upper()), st["band"]),
                      P(s["tool"], "head"), chip_t]], colWidths=[width - 72 * mm, 48 * mm, 24 * mm])
        top.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(s["band"])),
                                 ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
        strip = Table([[P(f"CASE ID: {c['case_id']}", "head"), P(f"SOURCE: {s['tool']} ({s['flag']})", "head"),
                        P(f"STATUS: {s['status']}", "head")]], colWidths=[width / 3] * 3)
        strip.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0f172a"))]))
        return [Spacer(1, 8), top, strip, Spacer(1, 4)]

    story = [Paragraph(xml_escape(f"CASE DOSSIER: {c['subject']}".upper()), st["h1"]),
             Paragraph(xml_escape(f"CASE ID: {c['case_id']} | BUILT ONLY FROM TOOL OUTPUT FILES"), st["sub"]),
             Spacer(1, 6),
             P("Every number below is copied from the named tool's output file; a field the file does not contain "
               f"is shown as '{NP}'. {NOT_VALIDATED}", "body"),
             Paragraph("Case header", st["h2"])]
    ipp = NP if c["ipp_lat"] is None or c["ipp_lon"] is None else f"{v(c['ipp_lat'])}, {v(c['ipp_lon'])}"
    dates = c["dates"]
    drows = ([[f"Date: {k}", v(x)] for k, x in dates.items()] if isinstance(dates, dict)
             else [["Dates", v(dates) if dates is not None else NP]])
    story.append(table(["field", "value"], [["Case ID", c["case_id"]], ["Subject", c["subject"]],
                                            ["Title", c["title"]], ["IPP lat, lon (case header)", ipp], *drows,
                                            ["Analyst", c["analyst"]], ["Agency", c["agency"]]],
                       [width * 0.35, width * 0.65]))
    story.append(Paragraph("Section status", st["h2"]))
    story.append(table(["#", "section", "tool", "status", "reason"],
                       [[s["number"], s["title"], s["tool"], s["status"],
                         "; ".join(s["flags"]) if s["flags"] else s["message"]] for s in model["sections"]],
                       [8 * mm, width * 0.3, width * 0.2, 20 * mm, width * 0.5 - 28 * mm]))
    drawing = _pdf_map(model, width)
    if drawing is not None:
        story += [Paragraph("Overview map", st["h2"]), drawing,
                  P("Schematic only: equirectangular projection of tool geometries; not for navigation.", "note")]
    for s in model["sections"]:
        story += band(s)
        if s["status"] == STATUS_MISSING:
            story.append(P(s["message"], "body"))
            continue
        if s["flags"]:
            story.append(box(["FLAGGED by the tool output:"] + [f"- {f}" for f in s["flags"]], "#fdf2e3", "#b9770e"))
        story.append(Paragraph("Source files and tool inputs", st["h3"]))
        story.append(table(["file read by the dossier", "path", "sha256 (computed now)"],
                           [list(r) for r in s["file_rows"]], [width * 0.25, width * 0.4, width * 0.35]))
        if s["inputs"]:
            story.append(table(["tool input", "value", "sha256 recorded by tool", "re-check"],
                               [[i, val, _sha_cell(sha, chk), chk] for i, val, sha, chk in s["inputs"]],
                               [width * 0.22, width * 0.33, width * 0.3, width * 0.15]))
        if s["facts"]:
            story += [Paragraph("Key numbers (verbatim from the file)", st["h3"]),
                      table(["field", "value"], s["facts"], [width * 0.42, width * 0.58])]
        for t in s["tables"]:
            block = [Paragraph(xml_escape(t["title"]), st["h3"]), table(t["columns"], t["rows"])]
            if t["note"]:
                block.append(P(t["note"], "note"))
            story.append(KeepTogether(block) if len(t["rows"]) <= 12 else block[0])
            if len(t["rows"]) > 12:
                story += block[1:]
        if s["caveats"]:
            story.append(Spacer(1, 4))
            story.append(box(["The tool's own caveats and labels"] + [f"- {txt}  ({o})" for o, txt in s["caveats"]],
                             "#f4f6f9", "#008080"))
    story += [PageBreak(), Paragraph("Appendix A. Provenance: every file this dossier read", st["h2"]),
              table(["role", "path", "bytes", "sha256"],
                    [[p["role"], p["path"], p["bytes"], p["sha256"]] for p in model["provenance"]],
                    [width * 0.22, width * 0.33, width * 0.08, width * 0.37])]

    class NumberedCanvas(rl_canvas.Canvas):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._saved = []

        def showPage(self):
            self._saved.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            n = len(self._saved)
            for state in self._saved:
                self.__dict__.update(state)
                self._decorate(n)
                super().showPage()
            super().save()

        def _decorate(self, n):
            w, h = letter
            self.setFont(bold, 7.5)
            self.setFillColor(grey)
            self.drawString(15 * mm, h - 12 * mm, f"CASE DOSSIER  |  CASE ID: {c['case_id']}"[:110])
            self.setFillColor(colors.HexColor("#b9770e"))
            self.drawRightString(w - 15 * mm, h - 12 * mm, "NOT VALIDATED")
            self.setStrokeColor(teal)
            self.setLineWidth(1.2)
            self.line(15 * mm, h - 14 * mm, w - 15 * mm, h - 14 * mm)
            self.setStrokeColor(colors.HexColor("#d9d9d9"))
            self.setLineWidth(0.5)
            self.line(15 * mm, 16 * mm, w - 15 * mm, 16 * mm)
            self.setFont(font, 6.8)
            self.setFillColor(grey)
            self.drawString(15 * mm, 11 * mm, f"Case {c['case_id']}  |  generated {model['generated_utc']}"[:90])
            self.drawCentredString(w / 2, 7 * mm, "Not validated: tool outputs only, not evidence")
            self.setFont(bold, 7.5)
            self.setFillColor(navy)
            self.drawRightString(w - 15 * mm, 11 * mm, f"Page {self._pageNumber} of {n}")

    doc = SimpleDocTemplate(out_path, pagesize=letter, leftMargin=15 * mm, rightMargin=15 * mm,
                            topMargin=20 * mm, bottomMargin=22 * mm, title=f"Case dossier {c['case_id']}",
                            author="dossier.py")
    doc.build(story, canvasmaker=NumberedCanvas)


def _pdf_map(model, width):
    from reportlab.graphics.shapes import Circle, Drawing, Line, Polygon, Rect, String
    from reportlab.lib import colors
    layers = map_layers(model)
    if not layers:
        return None
    h = width * 400.0 / 680.0
    fn, km_px = project(layers, width, h)
    if fn is None:
        return None
    d = Drawing(width, h)
    d.add(Rect(0, 0, width, h, fillColor=colors.HexColor("#0f172a"), strokeColor=None))
    for L in layers:
        col = colors.HexColor(L["colour"])
        if L["kind"] == "polygon":
            for ring in L["rings"]:
                xy = [fn(p[0], p[1]) for p in ring if isinstance(p, (list, tuple)) and len(p) >= 2
                      and _num(p[0]) and _num(p[1])]
                if len(xy) >= 3:
                    d.add(Polygon([q for x, y in xy for q in (x, h - y)], fillColor=None, strokeColor=col,
                                  strokeWidth=0.8))
        else:
            for lon, lat, lab in L["points"]:
                if _num(lon) and _num(lat):
                    x, y = fn(lon, lat)
                    d.add(Circle(x, h - y, 3, fillColor=col, strokeColor=None))
                    d.add(String(x + 5, h - y + 4, str(lab)[:30], fontSize=7, fillColor=col))
    bar_km = _nice(km_px * 120)
    d.add(Line(14, 12, 14 + bar_km / km_px, 12, strokeColor=colors.white, strokeWidth=1.5))
    d.add(String(14, 16, f"{bar_km:g} km", fontSize=7, fillColor=colors.white))
    return d


# ------------------------------------------------------------------ CLI


def _parser():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--case", required=True, help="case header JSON")
    ap.add_argument("--search-theory", help="search_theory.py result JSON")
    ap.add_argument("--optimal", help="optimal_search.py result JSON")
    ap.add_argument("--lpb", help="lost_person_behavior.py out dir or summary.json / rings.geojson")
    ap.add_argument("--lps", help="lost_person_sim.py out dir")
    ap.add_argument("--burial", action="append", help="burial_signature.py out dir (repeatable)")
    ap.add_argument("--microtopo", action="append", help="microtopo.py out dir (repeatable)")
    ap.add_argument("--evidence", help="evidence_scoring.py ranked CSV")
    ap.add_argument("--qpcr", help="qpcr_interpret.py result JSON")
    ap.add_argument("--drift", help="drift_envelope.py out dir or summary.json")
    ap.add_argument("--out", required=True, help="output HTML path")
    ap.add_argument("--pdf", help="PDF path (default: --out with .pdf, when reportlab is importable)")
    ap.add_argument("--no-pdf", action="store_true", help="do not write a PDF")
    ap.add_argument("--max-rows", type=int, default=MAX_ROWS, help="rows shown per table (0 = all)")
    ap.add_argument("--generated-utc", help="override the generation timestamp (for reproducible output)")
    return ap


def main(argv=None):
    a = _parser().parse_args(argv)
    if a.max_rows < 0:
        print("error: --max-rows cannot be negative", file=sys.stderr)
        return 2
    gen = a.generated_utc or dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        with open(CSS_PATH, encoding="utf-8") as f:
            css = f.read()
        model = build_model(a, gen)
    except InputError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except OSError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    page = render_html(model, css)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(page)
    counts = {}
    for s in model["sections"]:
        counts[s["status"]] = counts.get(s["status"], 0) + 1
    print(f"wrote {a.out} ({', '.join(f'{k} {n}' for k, n in sorted(counts.items()))})")
    if a.no_pdf:
        return 0
    if reportlab_available():
        pdf = a.pdf or os.path.splitext(a.out)[0] + ".pdf"
        render_pdf(model, pdf)
        print(f"wrote {pdf}")
    else:
        print("reportlab is not importable: no PDF written; print the HTML to PDF from a browser")
    return 0


if __name__ == "__main__":
    sys.exit(main())
