"""Tests for dossier.py: every section is filled from real tool output, values are copied verbatim."""

import contextlib
import csv
import hashlib
import html
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import dossier  # noqa: E402
import drift_envelope as de  # noqa: E402
import evidence_scoring as es  # noqa: E402
import lost_person_behavior as lpb  # noqa: E402
import optimal_search as os_  # noqa: E402
import qpcr_interpret as qp  # noqa: E402
import search_theory as st  # noqa: E402

try:
    import numpy  # noqa: F401
    import rasterio  # noqa: F401
    import scipy  # noqa: F401
    HAS_GEO = True
except ImportError:
    HAS_GEO = False

HERE = os.path.dirname(os.path.abspath(__file__))
GEN = "2026-10-16T12:00:00Z"
# WiSAR calculator workbook: name, area km2, TTL km, sweep width km, POA, speed km/h.
WORKBOOK = [
    ("A", 2.5, 12, 0.15, 0.35, 1.5),
    ("B", 1.2, 18, 0.08, 0.25, 1.2),
    ("C", 0.8, 10, 0.12, 0.20, 2.0),
    ("D", 3.0, 15, 0.05, 0.10, 1.0),
    ("E", 1.5, 8, 0.20, 0.10, 1.8),
]
SECTION_NUMBER = {"lpb": 1, "lps": 2, "search_theory": 3, "optimal": 4, "drift": 5, "terrain": 6,
                  "evidence": 7, "qpcr": 8}


def quiet(fn, *a, **k):
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        return fn(*a, **k)


def ev(x):
    """How a source value must appear in the HTML: verbatim text (strings as written, numbers as the
    JSON file writes them, i.e. full repr), HTML-escaped. Independent of dossier.v on purpose."""
    return html.escape(x if isinstance(x, str) else json.dumps(x, ensure_ascii=False), quote=True)


def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f)
    return path


def write_workbook_csv(path, row_poa=0.0):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["name", "area_km2", "poa", "ttl_km", "sweep_width_km", "speed_kmh"])
        for n, a, ttl, sw, poa, v in WORKBOOK:
            w.writerow([n, a, repr(poa * (1 - row_poa)), ttl, sw, v])
        if row_poa:
            w.writerow(["ROW", "", repr(row_poa), "", "", ""])
    return path


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.d = self.tmp.name
        self.case = write_json(self.p("case.json"), {
            "case_id": "SAR-2026-0042", "subject": "Jane Doe", "ipp": {"lat": 54.5, "lon": -3.1},
            "dates": {"last seen": "2026-10-01T14:00Z", "reported": "2026-10-02"}, "analyst": "R. Analyst"})

    def p(self, *parts):
        return os.path.join(self.d, *parts)

    def render(self, *extra, expect=0, case=None):
        out = self.p("dossier.html")
        rc = quiet(dossier.main, ["--case", case or self.case, "--out", out, "--no-pdf", "--generated-utc", GEN,
                                  *extra])
        self.assertEqual(rc, expect)
        if expect:
            return None
        with open(out, encoding="utf-8") as f:
            return f.read()

    def section(self, page, key):
        n = SECTION_NUMBER[key]
        start = page.index(f'id="sec-{n}"')
        end = page.find("<section", start + 1)
        return page[start:end if end > 0 else len(page)]

    def assertStatus(self, page, key, status):
        sec = self.section(page, key)
        self.assertIn(f'<span class="chip chip-{status}">{status}</span>', sec)


class HeaderOnly(Base):
    def test_only_case_header_every_section_missing(self):
        page = self.render()
        chips = re.findall(r'class="chip chip-(\w+)"', page)
        self.assertTrue(chips)
        self.assertEqual(set(chips), {"MISSING"})
        for key in SECTION_NUMBER:
            self.assertStatus(page, key, "MISSING")
            self.assertIn("No output from", self.section(page, key))
        self.assertIn("SAR-2026-0042", page)
        self.assertIn("Jane Doe", page)
        self.assertIn("2026-10-01T14:00Z", page)
        self.assertNotIn("<script", page.lower())
        self.assertNotIn("http://", page.replace('xmlns="http://www.w3.org/2000/svg"', ""))
        self.assertNotIn("https://", page)

    def test_missing_header_fields_render_not_provided(self):
        case = write_json(self.p("bare.json"), {"case_id": "BARE-1"})
        page = self.render(case=case)
        facts = page[page.index("<h2>Case header</h2>"):page.index("<h2>Section status</h2>")]
        self.assertGreaterEqual(facts.count(dossier.NP), 5)

    def test_footer_and_running_header(self):
        page = self.render()
        self.assertIn('@bottom-right { content: "Page " counter(page) " of " counter(pages); }', page)
        self.assertIn("@top-left { content: ", page)
        self.assertIn(dossier.css_string("CASE DOSSIER  |  CASE ID: SAR-2026-0042"), page)
        self.assertIn(dossier.css_string("Case SAR-2026-0042  |  generated " + GEN), page)
        self.assertIn(dossier.css_string("Not validated: tool outputs only, not evidence"), page)
        footer = page[page.index('<footer class="run bottom">'):]
        self.assertIn("SAR-2026-0042", footer)
        self.assertIn(GEN, footer)
        self.assertIn("NOT VALIDATED", footer)
        self.assertIn("@page", page)
        self.assertIn("size: letter", page)


class RealTools(Base):
    """Each section from files the real modules wrote."""

    def test_workbook_through_search_theory_and_optimal_cli(self):
        segs = write_workbook_csv(self.p("segments.csv"), row_poa=0.1)
        r_st, r_os = self.p("st.json"), self.p("plan.json")
        self.assertEqual(quiet(st.main, [segs, "--out", r_st]), 0)
        self.assertEqual(quiet(os_.main, [segs, "--effort-km", "40", "--increments", "4", "--out", r_os]), 0)
        page = self.render("--search-theory", r_st, "--optimal", r_os)
        with open(r_st, encoding="utf-8") as f:
            res = json.load(f)
        sec = self.section(page, "search_theory")
        self.assertStatus(page, "search_theory", "COMPUTED")
        self.assertIn(ev(res["cumulative_pos"]), sec)
        for name, poa in res["final_poa"].items():
            self.assertIn(f"<td>{ev(name)}</td><td>{ev(poa)}</td>", sec)
        for name, pod in res["cumulative_pod"].items():
            self.assertIn(ev(pod), sec)
        for row in res["tasking_before"]:
            self.assertIn(ev(row["pden"]), sec)
        self.assertIn(ev(res["note"]), sec)
        with open(r_os, encoding="utf-8") as f:
            plan = json.load(f)
        sec = self.section(page, "optimal")
        self.assertStatus(page, "optimal", "COMPUTED")
        self.assertIn(ev(plan["optimal"]["lambda"]), sec)
        self.assertIn(ev(plan["optimal"]["total_pos"]), sec)
        self.assertIn(ev(plan["sequential_replan"]["total_pos"]), sec)
        for k, nv in plan["naive_plans"].items():
            self.assertIn(f"<td>{ev(k)}</td><td>{ev(nv['total_pos'])}</td><td>{ev(nv['optimal_gain'])}</td>", sec)
        for row in plan["optimal"]["segments"]:
            self.assertIn(ev(row["effort_km"]), sec)
        self.assertIn("not recorded in the result JSON", sec)

    def test_search_theory_run_values(self):
        segs = [{"name": n, "area_km2": a, "ttl_km": t, "sweep_width_km": w, "poa": p}
                for n, a, t, w, p, _ in WORKBOOK]
        res = st.run(segs)
        page = self.render("--search-theory", write_json(self.p("r.json"), res))
        sec = self.section(page, "search_theory")
        self.assertIn(ev(res["rounds"][0]["probability_of_success"]), sec)
        self.assertIn(ev(res["cumulative_pos"]), sec)

    def test_optimal_non_nested_is_flagged(self):
        plan = os_.run([{"name": n, "area_km2": a, "sweep_width_km": w, "poa": p, "speed_kmh": v}
                        for n, a, _, w, p, v in WORKBOOK], 25, 3)
        self.assertTrue(plan["uniformly_optimal"]["nested"])
        page = self.render("--optimal", write_json(self.p("ok.json"), plan))
        self.assertStatus(page, "optimal", "COMPUTED")
        plan["uniformly_optimal"]["nested"] = False
        page = self.render("--optimal", write_json(self.p("bad.json"), plan))
        self.assertStatus(page, "optimal", "FLAGGED")
        self.assertIn("uniformly_optimal.nested is false", self.section(page, "optimal"))

    def test_lpb_rings_from_cli(self):
        out = self.p("lpb")
        self.assertEqual(quiet(lpb.main, ["--category", "hikers", "--lat", "54.5", "--lon", "-3.1", "--out", out,
                                          "--find", "54.51", "-3.09"]), 0)
        page = self.render("--lpb", out)
        with open(os.path.join(out, "summary.json"), encoding="utf-8") as f:
            summ = json.load(f)
        sec = self.section(page, "lpb")
        self.assertStatus(page, "lpb", "COMPUTED")
        for r in summ["rings"]:
            self.assertIn(f"<td>{ev(r['percent'])}</td><td>{ev(r['km'])}</td><td>{ev(r['miles'])}</td>", sec)
        self.assertIn(ev(summ["find"]["relative_to_rings"]["cdf_piecewise_linear"]), sec)
        self.assertIn(ev(summ["planning_prior"]), sec)
        self.assertIn(ev(summ["citation"]), sec)
        self.assertIn("<svg", page)
        self.assertIn("LPB ring", page)

    def test_drift_from_cli_flags_mass_beyond_reach(self):
        out = self.p("drift")
        rc = quiet(de.main, ["--lat", "48.93", "--lon", "-119.42", "--water-temp-c", "20", "--discharge-cfs", "5200",
                             "--elapsed-hours", "25", "--feature", "strainer_logjam:650:Logjam-1",
                             "--feature", "bend_inside:9999", "--out-dir", out])
        self.assertEqual(rc, 0)
        page = self.render("--drift", out)
        with open(os.path.join(out, "summary.json"), encoding="utf-8") as f:
            summ = json.load(f)
        sec = self.section(page, "drift")
        self.assertStatus(page, "drift", "FLAGGED")
        self.assertIn(ev(summ["model"]["prior_mass_beyond_reach"]), sec)
        self.assertTrue(summ["warnings"])
        for w in summ["warnings"]:
            self.assertIn(ev("warning: " + w), sec)
        for c in summ["top_cells"]:
            self.assertIn(ev(c["probability"]), sec)
        self.assertIn("REJECTED", sec)
        self.assertIn(ev(summ["refloat"]["label"]), sec)

    def test_evidence_ranked_csv(self):
        clues = self.p("clues.csv")
        with open(clues, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["description", "source_reliability", "information_credibility", "is_physical_anchor"])
            w.writerow(["Phone ping, tower 3", "A", "2", "true"])
            w.writerow(["Witness: red jacket <near> bridge", "C", "3", "false"])
        ranked = self.p("ranked.csv")
        self.assertEqual(quiet(es.main, ["rank", "--csv", clues, "--out", ranked]), 0)
        page = self.render("--evidence", ranked)
        sec = self.section(page, "evidence")
        self.assertStatus(page, "evidence", "COMPUTED")
        with open(ranked, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                self.assertIn(ev(r["gate_reason"]), sec)
                self.assertIn(ev(r["description"]), sec)
        self.assertNotIn("<near>", sec)
        with open(clues, "a", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(["Anonymous tip", "F", "6", "false"])
        self.assertEqual(quiet(es.main, ["rank", "--csv", clues, "--out", ranked]), 0)
        page = self.render("--evidence", ranked)
        self.assertStatus(page, "evidence", "FLAGGED")
        self.assertIn("verify-only", self.section(page, "evidence"))

    def test_qpcr_valid_and_invalid_plates(self):
        plate = self.p("plate.csv")
        rows = [("S1", "unknown", "human", "30.1"), ("S1", "unknown", "human", "30.4"), ("S1", "unknown", "ipc", "27"),
                ("NTC", "ntc", "human", "Undetermined"), ("NTC", "ntc", "ipc", "27.1"),
                ("POS", "positive", "human", "24.0"), ("POS", "positive", "ipc", "27.0")]

        def run(rs):
            with open(plate, "w", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow(["sample_id", "role", "target", "ct"])
                w.writerows(rs)
            res = qp.interpret(qp.load(plate), 36, 33, 23, 26)
            return res, self.render("--qpcr", write_json(self.p("q.json"), res))

        res, page = run(rows)
        sec = self.section(page, "qpcr")
        self.assertStatus(page, "qpcr", "COMPUTED")
        self.assertEqual(res["samples"][0]["call"], "DETECTED")
        self.assertIn(f"<td>S1</td><td>DETECTED</td><td>{ev(res['samples'][0]['mean_ct'])}</td>", sec)
        self.assertIn(ev(res["rules"]["ipc_reference_ct"]), sec)
        self.assertIn("does not by itself identify a person", sec)
        res, page = run([r for r in rows if r[1] != "ntc"])
        self.assertFalse(res["run_valid"])
        self.assertStatus(page, "qpcr", "FLAGGED")
        self.assertIn("RUN_INVALID", self.section(page, "qpcr"))


class FixtureFormats(Base):
    """Minimal files in the formats lost_person_sim.py and burial_signature.py / microtopo.py write."""

    def lps_dir(self, converged=True, edge=0.0):
        out = self.p("sim")
        os.makedirs(out)
        summary = {
            "inputs": {"ipp": {"lat": 54.5, "lon": -3.1}, "category": "children_1_6", "dataset": "auto",
                       "elapsed_hours": 3.0, "dem": ["/data/dem.tif"], "synthetic_terrain": False,
                       "grid": {"res_m": 30.0, "shape": [120, 120], "crs": "EPSG:32630", "radius_km": 1.8},
                       "linear_features_and_barriers": {"barriers": ["/data/river.geojson"]},
                       "segments": "/data/segs.geojson", "params": {"n_agents": 400, "seed": 0}},
            "calibration": {"calibrated": True, "converged": converged, "walk_scale_hours": 0.3080661409423895,
                            "target": "LPB 50% straight-line distance", "message": None if converged else "median "
                            "not within tolerance (grid too coarse or too few agents)",
                            "tolerance": {"relative": 0.05, "plus_km": 0.015},
                            "quantiles": {"50": {"lpb_km": 0.65, "sim_km": 0.6541, "residual_km": 0.0041,
                                                 "relative": 0.0063, "lpb_interpolated": False}},
                            "fraction_budget_capped_at_max_walk_hours": 0.0},
            "diagnostics": {"agents": 400, "strategy_counts": {"random_walk": 121, "stay_put": 50},
                            "fraction_at_grid_edge": edge, "fraction_still_walking_at_elapsed": 0.025,
                            "elapsed_walk_capped_by_max_walk_hours": False},
            "simulated_distance_km_at_elapsed": {"50": 0.6559, "95": 1.805},
            "probability_total": 0.9999999999999998,
            "assumptions": ["Behaviour mixture weights are assumptions, not fitted."],
            "model": "Tobler v = 6 exp(-3.5 |tan(theta) + 0.05|) km/h",
            "citation": "Perkins, Roberts & Feeney (2003)",
            "note": "Planning prior; it does not predict where this person is.",
        }
        write_json(os.path.join(out, "summary.json"), summary)
        ring = [[-3.11, 54.49], [-3.09, 54.49], [-3.09, 54.51], [-3.11, 54.51], [-3.11, 54.49]]
        write_json(os.path.join(out, "contours.geojson"), {"type": "FeatureCollection", "features": [
            {"type": "Feature", "geometry": {"type": "MultiPolygon", "coordinates": [[ring]]},
             "properties": {"level": 0.5, "label": "50% cumulative probability region", "mass": 0.500195,
                            "area_km2": 1.0395, "cells": 1155}}]})
        with open(os.path.join(out, "segments.csv"), "w", encoding="utf-8") as f:
            f.write("name,area_km2,poa\nwest,0.3024,0.17677768246294517\nROW,,0.8232223175370548\n")
        return out, summary

    def test_lps_section_values(self):
        out, summ = self.lps_dir()
        page = self.render("--lps", out)
        sec = self.section(page, "lps")
        self.assertStatus(page, "lps", "COMPUTED")
        self.assertIn(ev(summ["calibration"]["walk_scale_hours"]), sec)
        self.assertIn(ev(summ["probability_total"]), sec)
        self.assertIn("0.17677768246294517", sec)
        self.assertIn("0.500195", sec)
        self.assertIn("/data/dem.tif", sec)
        self.assertIn(ev(summ["assumptions"][0]), sec)
        self.assertIn("simulation contour", page)

    def test_lps_non_converged_and_edge_flagged(self):
        out, _ = self.lps_dir(converged=False, edge=0.0525)
        sec = self.section(self.render("--lps", out), "lps")
        self.assertIn("chip-FLAGGED", sec)
        self.assertIn("calibration.converged is false", sec)
        self.assertIn("fraction_at_grid_edge = 0.0525", sec)

    def terrain_dir(self):
        out = self.p("site")
        os.makedirs(out)
        epoch = self.p("e2012.tif")
        with open(epoch, "wb") as f:
            f.write(b"not really a tif, only hashed")
        with open(os.path.join(out, "ledger.csv"), "w", encoding="utf-8") as f:
            f.write("id,kind,type,label,centroid_lat,centroid_lon,area_m2,peak_score,min_q,p_mound,p_sink\n"
                    "B001,burial_timeline,burial_compact,\"screening index, not a probability of a grave\","
                    "30.9135801,-92.9997331,19.0,1.0,1.07e-34,1.0,1.0\n")
        man = {"tool": "burial_signature.py", "version": "1.0.0", "created_utc": "2026-10-16T19:43:40Z",
               "status": "complete", "label": "screening index, not a probability of a grave",
               "inputs": {"epochs": [{"path": epoch, "year": 2012.0, "sha256": hashlib.sha256(
                   b"not really a tif, only hashed").hexdigest(), "sigma_m": 0.1}], "sites": None},
               "results": {"n_candidates": 1, "n_voids": 0, "timeline_evaluable": True, "calibration": None,
                           "pairs": [{"pair": "2012-2015", "sigma_used_median_m": 0.1414, "lod_median_m": 0.2772,
                                      "cells_rise_above_lod": 6, "cells_drop_below_lod": 0}]},
               "note": "The burial-timeline index ranks places where the ground rose and later settled.",
               "outputs_sha256": {"ledger.csv": dossier.sha256_file(os.path.join(out, "ledger.csv"))}}
        write_json(os.path.join(out, "manifest.json"), man)
        return out, epoch

    def test_terrain_hashes_rechecked(self):
        out, epoch = self.terrain_dir()
        page = self.render("--burial", out)
        sec = self.section(page, "terrain")
        self.assertStatus(page, "terrain", "COMPUTED")
        self.assertIn("1.07e-34", sec)
        self.assertIn("screening index, not a probability of a grave", sec)
        self.assertEqual(sec.count('<span class="ok">match</span>'), 2)
        with open(epoch, "ab") as f:
            f.write(b"x")
        with open(os.path.join(out, "ledger.csv"), "a", encoding="utf-8") as f:
            f.write("\n")
        sec = self.section(self.render("--burial", out), "terrain")
        self.assertIn("chip-FLAGGED", sec)
        self.assertEqual(sec.count('<span class="bad">MISMATCH</span>'), 2)
        self.assertIn("changed after the tool wrote the manifest", sec)

    def test_two_terrain_dirs_two_sections(self):
        out, _ = self.terrain_dir()
        second = self.p("site2")
        shutil.copytree(out, second)
        page = self.render("--burial", out, "--microtopo", second)
        self.assertEqual(page.count("SOURCE: burial_signature.py (--burial)"), 1)
        self.assertEqual(page.count("SOURCE: burial_signature.py (--microtopo)"), 1)

    def test_missing_fields_render_not_provided(self):
        page = self.render("--search-theory", write_json(self.p("r.json"), {"cumulative_pos": 0.25}))
        sec = self.section(page, "search_theory")
        self.assertStatus(page, "search_theory", "COMPUTED")
        self.assertIn("<td>0.25</td>", sec)
        self.assertGreaterEqual(sec.count(f'<span class="np">{dossier.NP}</span>'), 2)


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class RealTerrainTools(Base):
    def test_burial_and_microtopo_cli_outputs(self):
        import burial_signature as bs
        import microtopo as mt
        import test_burial_signature as tbs
        argv = []
        for z, y in zip(tbs.make_stack(), tbs.YEARS):
            path = self.p(f"e{y}.tif")
            tbs._write(path, z)
            argv += ["--epoch", path, str(y)]
        self.assertEqual(quiet(bs.main, argv + ["--out-dir", self.p("burial")]), 0)
        self.assertEqual(quiet(mt.main, ["--baseline", self.p("e2012.tif"), "--recent", self.p("e2022.tif"),
                                         "--out-dir", self.p("micro")]), 0)
        page = self.render("--burial", self.p("burial"), "--microtopo", self.p("micro"))
        with open(self.p("burial", "manifest.json"), encoding="utf-8") as f:
            man = json.load(f)
        start = page.index("SOURCE: burial_signature.py")
        sec = page[start:page.index("<section", start)]
        self.assertIn(ev(man["results"]["n_candidates"]), sec)
        for e in man["inputs"]["epochs"]:
            self.assertIn(e["sha256"], sec)
        self.assertNotIn("MISMATCH", sec)
        with open(self.p("burial", "ledger.csv"), newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                self.assertIn(f"<td>{ev(r['id'])}</td>", sec)
                self.assertIn(ev(r["min_q"]), sec)
        self.assertIn("SOURCE: microtopo.py (--microtopo)", page)
        with open(self.p("micro", "manifest.json"), encoding="utf-8") as f:
            mman = json.load(f)
        self.assertIn(ev(mman["results"]["lod_m"]), page)


class Escaping(Base):
    def test_malicious_subject_case_id_and_segment_name(self):
        evil_case = 'X"; } body { display:none } @import url(//evil/) /*'
        case = write_json(self.p("evil.json"), {
            "case_id": evil_case, "subject": "<script>alert('x')</script>",
            "analyst": "<img src=x onerror=alert(1)>", "dates": {"<b>": "</td></tr></table>"}})
        res = {"cumulative_pos": 0.1, "final_poa": {"<svg onload=alert(1)>": 0.5}, "note": "</style><script>"}
        page = self.render("--search-theory", write_json(self.p("r.json"), res), case=case)
        low = page.lower()
        self.assertNotIn("<script", low)
        self.assertNotIn("<img", low)
        self.assertNotIn("<svg onload", low)
        self.assertNotIn("</style><", low.split("</head>")[1])
        self.assertIn("&lt;script&gt;alert(&#x27;x&#x27;)&lt;/script&gt;", page)
        self.assertIn("&lt;svg onload=alert(1)&gt;", page)
        style = page[page.index("<style>"):page.index("</style>")]
        self.assertNotIn(evil_case, style)
        self.assertNotIn("@import", style)
        self.assertIn(dossier.css_string("CASE DOSSIER  |  CASE ID: " + evil_case), style)
        self.assertEqual(page.count("</style>"), 1)
        self.assertEqual(page.count("<table"), page.count("</table>"))


class Provenance(Base):
    def test_appendix_sha256_matches_files(self):
        segs = write_workbook_csv(self.p("segments.csv"))
        r_st = self.p("st.json")
        self.assertEqual(quiet(st.main, [segs, "--out", r_st]), 0)
        page = self.render("--search-theory", r_st)
        app = page[page.index('<section class="appendix">'):]
        rows = re.findall(r"<tr><td>([^<]*)</td><td>([^<]*)</td><td>(\d+)</td><td><code>([0-9a-f]{64})</code></td>",
                          app)
        paths = {html.unescape(p): sha for _, p, _, sha in rows}
        self.assertEqual(set(paths), {os.path.abspath(self.case), os.path.abspath(r_st)})
        for path, sha in paths.items():
            with open(path, "rb") as f:
                self.assertEqual(hashlib.sha256(f.read()).hexdigest(), sha)
            self.assertIn(f"<td>{os.path.getsize(path)}</td>", app)


class Pdf(Base):
    @unittest.skipUnless(dossier.reportlab_available(), "reportlab not importable")
    def test_pdf_written_with_header_and_footer(self):
        out, pdf = self.p("d.html"), self.p("d.pdf")
        rc = quiet(dossier.main, ["--case", self.case, "--out", out, "--pdf", pdf, "--generated-utc", GEN])
        self.assertEqual(rc, 0)
        with open(pdf, "rb") as f:
            self.assertEqual(f.read(5), b"%PDF-")
        if shutil.which("pdftotext"):
            text = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True).stdout
            self.assertIn("CASE ID: SAR-2026-0042", text)
            self.assertIn("NOT VALIDATED", text)
            self.assertIn(GEN, text)
            self.assertRegex(text, r"Page 1 of \d+")
            self.assertIn("MISSING", text)

    def test_no_pdf_flag(self):
        out = self.p("d.html")
        self.assertEqual(quiet(dossier.main, ["--case", self.case, "--out", out, "--no-pdf"]), 0)
        self.assertFalse(os.path.exists(self.p("d.pdf")))


class BadInput(Base):
    def assertExit2(self, *argv):
        out = self.p("never.html")
        rc = quiet(dossier.main, [*argv, "--out", out, "--no-pdf"])
        self.assertEqual(rc, 2, argv)
        self.assertFalse(os.path.exists(out))

    def test_bad_inputs_exit_2(self):
        with open(self.p("broken.json"), "w") as f:
            f.write("{not json")
        no_id = write_json(self.p("noid.json"), {"subject": "x"})
        bad_ipp = write_json(self.p("ipp.json"), {"case_id": "C", "ipp": {"lat": "north", "lon": 1}})
        far_ipp = write_json(self.p("far.json"), {"case_id": "C", "ipp": {"lat": 95, "lon": 1}})
        qpcr = write_json(self.p("q.json"), {"run_valid": True, "samples": []})
        wrong_csv = self.p("wrong.csv")
        with open(wrong_csv, "w") as f:
            f.write("a,b\n1,2\n")
        self.assertExit2("--case", self.p("nope.json"))
        self.assertExit2("--case", self.p("broken.json"))
        self.assertExit2("--case", no_id)
        self.assertExit2("--case", bad_ipp)
        self.assertExit2("--case", far_ipp)
        self.assertExit2("--case", write_json(self.p("list.json"), [1, 2]))
        self.assertExit2("--case", self.case, "--search-theory", qpcr)
        self.assertExit2("--case", self.case, "--search-theory", self.p("missing.json"))
        self.assertExit2("--case", self.case, "--optimal", self.p("broken.json"))
        self.assertExit2("--case", self.case, "--lps", self.d)
        self.assertExit2("--case", self.case, "--lps", self.p("missing_dir"))
        self.assertExit2("--case", self.case, "--burial", self.d)
        self.assertExit2("--case", self.case, "--evidence", wrong_csv)
        self.assertExit2("--case", self.case, "--qpcr", self.case)
        self.assertExit2("--case", self.case, "--drift", self.d)
        self.assertExit2("--case", self.case, "--lpb", qpcr)
        self.assertExit2("--case", self.case, "--max-rows", "-1")

    def test_argparse_errors_exit_2(self):
        with self.assertRaises(SystemExit) as cm:
            quiet(dossier.main, ["--out", self.p("x.html")])
        self.assertEqual(cm.exception.code, 2)

    def test_cli_subprocess_exit_2(self):
        r = subprocess.run([sys.executable, os.path.join(HERE, "dossier.py"), "--case", self.p("nope.json"),
                            "--out", self.p("x.html")], capture_output=True, text=True)
        self.assertEqual(r.returncode, 2)
        self.assertIn("error:", r.stderr)


class Housekeeping(unittest.TestCase):
    def test_quoted_caveats_still_in_their_modules(self):
        for module, quotes in dossier.DOC_CAVEATS.items():
            with open(os.path.join(HERE, module), encoding="utf-8") as f:
                src = " ".join(f.read().split())
            for q in quotes:
                self.assertIn(" ".join(q.split()), src, f"{module}: {q[:50]}")

    def test_css_string_escapes_everything_but_plain_text(self):
        s = dossier.css_string('a"b\\c;}{\n<')
        self.assertTrue(s.startswith('"') and s.endswith('"'))
        self.assertNotIn('"', s[1:-1])
        for ch in ";{}<\n":
            self.assertNotIn(ch, s)

    def test_max_rows_truncation_is_stated(self):
        sec = dossier.new_section("evidence", "t", "tool", "--x")
        dossier.add_table(sec, "t", ["a"], [[i] for i in range(50)], source="f.csv", max_rows=10)
        self.assertEqual(len(sec["tables"][0]["rows"]), 10)
        self.assertIn("first 10 of 50 rows; all rows are in f.csv", sec["tables"][0]["note"])


if __name__ == "__main__":
    unittest.main()
