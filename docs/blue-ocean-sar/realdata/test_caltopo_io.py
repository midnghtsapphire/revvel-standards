"""Tests for caltopo_io.py (read-only CalTopo / SARTopo GeoJSON round trip).

Uses fixtures/caltopo_export_synthetic.json, a SYNTHETIC file shaped like a
CalTopo export. Expected lengths are computed independently from the same
equirectangular formula (exact for east-west and north-south lines) and
cross-checked against haversine distances.
"""

import csv
import json
import math
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import caltopo_io as ct  # noqa: E402
import optimal_search  # noqa: E402
import search_theory  # noqa: E402

FIXTURE = os.path.join(HERE, "fixtures", "caltopo_export_synthetic.json")
R = ct.EARTH_MEAN_RADIUS_KM
LAT_C = 45.005
KX = R * math.cos(math.radians(LAT_C)) * math.pi / 180  # km per degree of longitude at the segment centroid
KY = R * math.pi / 180  # km per degree of latitude
W_A = 0.01 * KX
H = 0.01 * KY
AREA_A = W_A * H
AREA_B = AREA_A - (0.004 * KX) * (0.004 * KY)
W = 0.03


def _write(path, text):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
    return path


def _segments_csv(path, area_a=AREA_A, area_b=AREA_B):
    return _write(path, "name,area_km2,poa,sweep_width_km,speed_kmh\n"
                        f"A,{area_a!r},0.5,0.03,2.0\nB,{area_b!r},0.3,0.03,2.0\nROW,,0.2,,\n")


class GeometryTest(unittest.TestCase):
    def test_length_inside_square_and_hole(self):
        sq = [[(0, 0), (2, 0), (2, 2), (0, 2)]]
        self.assertAlmostEqual(ct.length_inside([(-1, 1), (3, 1)], sq), 2.0, places=12)
        self.assertAlmostEqual(ct.length_inside([(-1, -1), (3, 3)], sq), 2 * math.sqrt(2), places=12)
        self.assertEqual(ct.length_inside([(3, 3), (4, 4)], sq), 0.0)
        holed = sq + [[(0.5, 0.5), (1.5, 0.5), (1.5, 1.5), (0.5, 1.5)]]
        self.assertAlmostEqual(ct.length_inside([(-1, 1), (3, 1)], holed), 1.0, places=12)
        # a track that wanders in and out several times
        self.assertAlmostEqual(ct.length_inside([(-1, 1), (1, 1), (1, 3), (1.5, 1), (1.5, -1)], sq),
                               1.0 + 1.0 + math.hypot(0.5, 2) * 0.5 + 1.0, places=9)

    def test_area_with_hole(self):
        outer = [(0, 0), (2, 0), (2, 2), (0, 2)]
        hole = [(0.5, 0.5), (1.5, 0.5), (1.5, 1.5), (0.5, 1.5)]
        self.assertAlmostEqual(ct.area_km2([[outer, hole]]), 3.0)

    def test_equirectangular_matches_haversine(self):
        proj = ct.LocalProjection(45.0, -120.0, use_pyproj=False)
        a, b = (-120.0, 45.0), (-119.99, 45.01)
        (x1, y1), (x2, y2) = proj(a), proj(b)
        self.assertLess(abs(math.hypot(x2 - x1, y2 - y1) / ct.haversine_km(a, b) - 1), 0.002)
        self.assertIn("equirectangular", proj.method)


class ImportTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.res = ct.coverage(ct.load_features(FIXTURE), W, use_pyproj=False, path=FIXTURE)

    def test_segments_tracks_and_markers(self):
        segs = {s["name"]: s for s in self.res["segments"]}
        self.assertEqual(sorted(segs), ["A", "B"])  # B recovered from 'segment=B' despite the CalTopo rename
        self.assertAlmostEqual(segs["A"]["area_km2"], AREA_A, places=9)
        self.assertAlmostEqual(segs["B"]["area_km2"], AREA_B, places=9)
        passes = {(p["name"], p["track"]): p for p in self.res["passes"]}
        self.assertEqual(sorted(passes), [("A", "Team 1 track"), ("A", "Team 2 track"), ("B", "Team 1 track")])
        self.assertAlmostEqual(passes[("A", "Team 1 track")]["ttl_km"], W_A, places=9)
        self.assertAlmostEqual(passes[("A", "Team 2 track")]["ttl_km"], H, places=9)  # MultiLineString joined
        self.assertAlmostEqual(passes[("B", "Team 1 track")]["ttl_km"], 0.006 * KX, places=9)  # hole excluded
        self.assertEqual(passes[("A", "Team 2 track")]["sweep_width_km"], 0.05)  # per-track W
        self.assertEqual(passes[("A", "Team 1 track")]["sweep_width_km"], W)
        c_a = (W_A * W + H * 0.05) / AREA_A
        self.assertAlmostEqual(segs["A"]["coverage"], c_a, places=9)
        self.assertAlmostEqual(segs["A"]["pod"], 1 - math.exp(-c_a), places=9)
        p = passes[("B", "Team 1 track")]
        self.assertAlmostEqual(p["pod_model"], 1 - math.exp(-p["ttl_km"] * W / AREA_B), places=12)
        # the line assignment (a plan) is not a track
        self.assertNotIn("Line assignment 103", [t["track"] for t in self.res["tracks"]])
        marks = {m["title"]: m["segments"] for m in self.res["markers"]}
        self.assertEqual(marks, {"Clue 1": ["A"], "ICP": []})

    def test_passes_csv_feeds_search_theory_with_same_pod(self):
        passes = os.path.join(self.tmp.name, "passes.csv")
        ct.write_passes_csv(passes, self.res["passes"])
        with open(passes, newline="", encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        self.assertNotIn("pod", rows[0])  # a pod column would override search_theory's model
        segs = search_theory.read_segments(_segments_csv(os.path.join(self.tmp.name, "segs.csv")))
        out = search_theory.run(segs, rows)
        want = {s["name"]: s["pod"] for s in self.res["segments"]}
        for name, pod in out["cumulative_pod"].items():
            self.assertAlmostEqual(pod, want[name], places=9)
        self.assertAlmostEqual(sum(out["final_poa"].values()), 1.0, places=9)
        self.assertEqual(search_theory.main([os.path.join(self.tmp.name, "segs.csv"), "--passes", passes,
                                             "--out", os.path.join(self.tmp.name, "st.json")]), 0)

    def test_write_pod_column(self):
        passes = os.path.join(self.tmp.name, "passes.csv")
        ct.write_passes_csv(passes, self.res["passes"], write_pod=True)
        with open(passes, newline="", encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        self.assertAlmostEqual(float(rows[0]["pod"]), float(rows[0]["pod_model"]), places=12)

    def test_segments_csv_checks(self):
        ok = _segments_csv(os.path.join(self.tmp.name, "ok.csv"))
        self.assertEqual(ct.check_against_segments_csv(self.res["passes"], ok), [])
        off = _segments_csv(os.path.join(self.tmp.name, "off.csv"), area_a=AREA_A * 1.1)
        warns = ct.check_against_segments_csv(self.res["passes"], off)
        self.assertEqual(len(warns), 1)
        self.assertIn("A:", warns[0])
        only_a = _write(os.path.join(self.tmp.name, "a.csv"), f"name,area_km2,poa\nA,{AREA_A!r},0.8\nROW,,0.2\n")
        with self.assertRaises(ct.InputError):
            ct.check_against_segments_csv(self.res["passes"], only_a)

    def test_cli_import(self):
        passes = os.path.join(self.tmp.name, "p.csv")
        summ = os.path.join(self.tmp.name, "cov.json")
        rc = ct.main(["import", FIXTURE, "--sweep-width-km", str(W), "--passes-out", passes,
                      "--summary-out", summ, "--segments-csv", _segments_csv(os.path.join(self.tmp.name, "s.csv"))])
        self.assertEqual(rc, 0)
        with open(summ, encoding="utf-8") as fh:
            s = json.load(fh)
        self.assertEqual(s["warnings"], [])
        self.assertTrue(os.path.isfile(passes))

    def test_cli_no_coverage_exits_3_and_writes_nothing(self):
        far = {"type": "FeatureCollection", "features": [
            {"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [0.01, 0], [0.01, 0.01],
                                                                                 [0, 0]]]},
             "properties": {"class": "Assignment", "title": "Z 1", "description": "segment=Z"}},
            {"type": "Feature", "geometry": {"type": "LineString", "coordinates": [[1, 1], [1.01, 1]]},
             "properties": {"class": "Shape", "title": "elsewhere"}}]}
        path = _write(os.path.join(self.tmp.name, "far.json"), json.dumps(far))
        passes = os.path.join(self.tmp.name, "p.csv")
        self.assertEqual(ct.main(["import", path, "--sweep-width-km", "0.03", "--passes-out", passes]), 3)
        self.assertFalse(os.path.exists(passes))

    def test_cli_bad_inputs_exit_2(self):
        passes = os.path.join(self.tmp.name, "p.csv")
        self.assertEqual(ct.main(["import", FIXTURE, "--sweep-width-km", "0", "--passes-out", passes]), 2)
        self.assertEqual(ct.main(["import", os.path.join(self.tmp.name, "nope.json"), "--sweep-width-km", "0.03",
                                  "--passes-out", passes]), 2)
        self.assertEqual(ct.main([]), 2)

    def test_api_wrapper_shape(self):
        with open(FIXTURE, encoding="utf-8") as fh:
            fc = json.load(fh)
        wrapped = _write(os.path.join(self.tmp.name, "w.json"), json.dumps({"result": {"state": fc}}))
        self.assertEqual(len(ct.load_features(wrapped)), len(fc["features"]))


class ExportTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        d = self.tmp.name
        with open(FIXTURE, encoding="utf-8") as fh:
            fc = json.load(fh)
        polys = []
        for f in fc["features"]:
            if f["geometry"]["type"] == "Polygon":
                name = ct.segment_name(f["properties"], "?")
                polys.append({"type": "Feature", "geometry": f["geometry"], "properties": {"name": name}})
        self.polys = _write(os.path.join(d, "polys.geojson"),
                            json.dumps({"type": "FeatureCollection", "features": polys}))
        self.segs_csv = _segments_csv(os.path.join(d, "segs.csv"))
        self.segs = search_theory.read_segments(self.segs_csv)

    def _export(self, **kw):
        polygons = ct.read_segment_polygons(ct.load_features(self.polys), self.polys)
        return ct.export_features(polygons, self.segs, **kw)

    def test_assignment_properties(self):
        fc = self._export(start_number=101)
        self.assertEqual(fc["type"], "FeatureCollection")
        by = {f["properties"]["segment"]: f["properties"] for f in fc["features"]}
        # PSR = W v POA / A: A = 0.03*2*0.5/AREA_A, B = 0.03*2*0.3/AREA_B -> A ranks first
        self.assertEqual(by["A"]["number"], "101")
        self.assertEqual(by["B"]["number"], "102")
        for k in ("class", "title", "description", "stroke", "fill", "stroke-opacity", "fill-opacity", "letter"):
            self.assertIn(k, by["A"])
        self.assertEqual(by["A"]["class"], "Assignment")
        self.assertEqual(by["A"]["title"], "A 101")
        self.assertEqual(by["A"]["stroke"], "#FF0000")  # highest POA is red
        self.assertGreater(by["A"]["fill-opacity"], by["B"]["fill-opacity"])
        desc = by["A"]["description"]
        self.assertTrue(desc.startswith("segment=A\n"))
        for word in ("POA 0.5000", "POD", "PSR", "Effort", "Assignment 101"):
            self.assertIn(word, desc)
        self.assertAlmostEqual(by["A"]["psr"], 0.03 * 2.0 * 0.5 / AREA_A, places=9)
        self.assertNotIn("ROW", by)

    def test_shape_class_and_result_and_optimal(self):
        result = search_theory.run(search_theory.read_segments(self.segs_csv),
                                   [{"name": "A", "pod": "0.4"}])
        optimal = optimal_search.run(search_theory.read_segments(self.segs_csv), 5.0)
        fc = self._export(result=result, optimal=optimal, feature_class="Shape")
        by = {f["properties"]["segment"]: f["properties"] for f in fc["features"]}
        self.assertEqual(by["A"]["class"], "Shape")
        self.assertNotIn("number", by["A"])
        self.assertAlmostEqual(by["A"]["poa"], result["final_poa"]["A"], places=12)
        self.assertAlmostEqual(by["A"]["pod_achieved"], 0.4, places=12)
        opt = {r["name"]: r for r in optimal["optimal"]["segments"]}
        self.assertAlmostEqual(by["B"]["pod_planned"], opt["B"]["pod"], places=12)
        self.assertAlmostEqual(by["B"]["effort_km"], opt["B"]["effort_km"], places=12)
        self.assertIn("(initial 0.5000)", by["A"]["description"])

    def test_round_trip_export_then_import(self):
        out = os.path.join(self.tmp.name, "caltopo.geojson")
        self.assertEqual(ct.main(["export", "--polygons", self.polys, "--segments", self.segs_csv,
                                  "--start-number", "7", "--out", out]), 0)
        with open(FIXTURE, encoding="utf-8") as fh:
            fc = json.load(fh)
        with open(out, encoding="utf-8") as fh:
            exported = json.load(fh)
        # simulate CalTopo: keep only its own keys, then add the team tracks from the field
        keep = {"class", "title", "description", "stroke", "fill", "stroke-opacity", "fill-opacity", "letter",
                "number"}
        for f in exported["features"]:
            f["properties"] = {k: v for k, v in f["properties"].items() if k in keep}
            f["properties"]["letter"] = "renamed"
        exported["features"] += [f for f in fc["features"] if f["geometry"]["type"] != "Polygon"]
        back = _write(os.path.join(self.tmp.name, "back.json"), json.dumps(exported))
        res = ct.coverage(ct.load_features(back), W, use_pyproj=False)
        self.assertEqual(sorted(s["name"] for s in res["segments"]), ["A", "B"])
        self.assertEqual(ct.check_against_segments_csv(res["passes"], self.segs_csv), [])

    def test_export_mismatch_is_an_error(self):
        only_a = _write(os.path.join(self.tmp.name, "a.csv"), f"name,area_km2,poa\nA,{AREA_A!r},0.8\nROW,,0.2\n")
        rc = ct.main(["export", "--polygons", self.polys, "--segments", only_a,
                      "--out", os.path.join(self.tmp.name, "x.geojson")])
        self.assertEqual(rc, 2)  # polygon B has no segment row
        bad = _write(os.path.join(self.tmp.name, "bad.csv"), f"name,area_km2,poa\nA,{AREA_A!r},0.8\nB,1,0.8\n")
        self.assertEqual(ct.main(["export", "--polygons", self.polys, "--segments", bad,
                                  "--out", os.path.join(self.tmp.name, "y.geojson")]), 2)  # POA sums to 1.6

    def test_lost_person_sim_segments_csv_format(self):
        lps = _write(os.path.join(self.tmp.name, "lps.csv"),
                     f"name,area_km2,poa\nA,{AREA_A!r},0.6\nB,{AREA_B!r},0.1\nROW,,0.3\n")
        polygons = ct.read_segment_polygons(ct.load_features(self.polys), self.polys)
        fc = ct.export_features(polygons, search_theory.read_segments(lps))
        by = {f["properties"]["segment"]: f["properties"] for f in fc["features"]}
        self.assertIsNone(by["A"]["psr"])  # no W or v in that file: PSR is n/a, ranking falls back to Pden
        self.assertIn("PSR n/a", by["A"]["description"])
        self.assertEqual(by["A"]["number"], "1")


if __name__ == "__main__":
    unittest.main()
