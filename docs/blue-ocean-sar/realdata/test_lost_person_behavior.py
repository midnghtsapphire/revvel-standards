"""Tests for lost_person_behavior.py and the lpb_mpb2003.json transcription.

Standard library only, except the probability-grid tests, which need numpy and
are skipped when it is missing. Literal values below were read from the
handbook text (Perkins, Roberts & Feeney, Missing Person Behaviour, June 2003);
the printed page is in each comment.
"""

import importlib.util
import json
import math
import os
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import lost_person_behavior as lpb  # noqa: E402

HAS_NUMPY = importlib.util.find_spec("numpy") is not None
SCRIPT = os.path.join(HERE, "lost_person_behavior.py")


class TranscriptionTest(unittest.TestCase):
    def setUp(self):
        with open(lpb.DATA_PATH, encoding="utf-8") as fh:
            self.data = json.load(fh)
        self.c = self.data["categories"]

    def test_citation_present(self):
        cite = self.data["source"]["citation"]
        self.assertIn("Perkins", cite)
        self.assertIn("June 2003", cite)

    def test_children_1_6_hill_table(self):
        t = self.c["children_1_6"]["distance"]["source_studies"]
        self.assertEqual(t["page"], 6)
        self.assertEqual(t["n"], 12)  # p6 "Statistics (n = 12)"
        self.assertEqual(t["km"][4], 0.95)  # p6 "50% 0.95 0.60"
        self.assertEqual(t["miles"][4], 0.60)
        self.assertEqual(t["km"][9], 2.65)  # p6 "100% 2.65 1.66"

    def test_hikers_uk(self):
        t = self.c["hikers"]["distance"]["uk_study"]
        self.assertEqual((t["page"], t["n"]), (23, 72))  # p23 "Distance from IPP (n = 72)"
        self.assertEqual(t["km"][4], 2.95)  # p23 "50% - 2.95 1.83"
        self.assertEqual(t["miles"][4], 1.83)
        self.assertEqual(t["km"][9], 25.30)  # p23 "100% - 25.30 15.71"
        self.assertEqual(self.c["hikers"]["where_found"]["percent"]["Open Ground"], 33)  # p23 "Open Ground 33%"
        self.assertEqual(self.c["hikers"]["outcomes"]["fatalities_pct"], 11)  # p23 "Fatalities 11%"

    def test_hikers_hill(self):
        t = self.c["hikers"]["distance"]["source_studies"]
        self.assertEqual((t["page"], t["n"]), (22, 24))  # p22 "Statistics (n = 24)"
        self.assertEqual(t["km"][8], 10.87)  # p22 "90% 10.87 6.80"
        self.assertEqual(t["miles"][9], 15.0)  # p22 "100% 24.00 15.0"

    def test_despondents_uk(self):
        e = self.c["despondents"]
        t = e["distance"]["uk_study"]
        self.assertEqual((t["page"], t["n"]), (13, 181))  # p13 "Distance from IPP (n = 181)"
        self.assertEqual(t["km"][8], 10.40)  # p13 "90% - 10.40 6.46"
        self.assertEqual(t["km"][9], 132.00)  # p13 "100% - 132.00 81.97"
        o = e["outcomes"]
        self.assertEqual((o["fatalities_pct"], o["injured_pct"], o["unhurt_pct"], o["no_trace_pct"]), (34, 12, 45, 9))
        self.assertEqual(e["where_found"]["n"], 160)  # p13 "Where found (n = 160)"
        self.assertEqual(e["where_found"]["percent"]["Water / Water's Edge"], 18)  # p13 "Water / Water's Edge 18%"

    def test_alzheimers_both_tables(self):
        e = self.c["alzheimers"]
        self.assertEqual(e["distance"]["source_studies"]["n"], 87)  # p18 "Statistics (n = 87)"
        self.assertEqual(e["distance"]["source_studies"]["km"][9], 3.20)  # p18 "100% 3.20 2.00"
        self.assertEqual(e["distance"]["uk_study"]["km"][9], 84.00)  # p19 "100% - 84.00 52.16"
        self.assertEqual(e["distance"]["uk_study"]["n"], 37)  # p19 "Distance from IPP (n = 37)"
        self.assertEqual(e["outcomes"]["n"], 38)  # p19 "Outcomes (n = 38)"
        texts = [s["text"] for s in e["other_statistics"]]
        self.assertIn("96% are found within 1.5 miles of IPP", texts)  # p18

    def test_misc_adults_uk(self):
        t = self.c["misc_adults"]["distance"]["uk_study"]
        self.assertEqual((t["page"], t["n"]), (21, 25))  # p21 "Distance from IPP (n = 25)"
        self.assertEqual(t["km"], [0.10, 0.25, 0.50, 0.95, 1.00, 2.70, 4.00, 4.75, 7.00, 10.00])  # p21
        self.assertEqual(self.c["misc_adults"]["outcomes"]["no_trace_pct"], 17)  # p21 "No Trace 17%"

    def test_psychotic_printed_inconsistency_kept(self):
        t = self.c["psychological_illness"]["distance"]["source_studies"]
        self.assertEqual((t["km"][8], t["miles"][8]), (6.00, 4.80))  # p14 "90% 6.00 4.80" (as printed)
        flagged = [
            f
            for f in self.data["transcription_flags"]
            if f.get("category") == "psychological_illness" and f["page"] == 14
        ]
        self.assertTrue(flagged)

    def test_hunters_no_uk_and_organised_groups(self):
        self.assertIsNone(self.c["hunters"]["distance"]["uk_study"])  # p25 "(no equivalent category)"
        self.assertEqual(self.c["hunters"]["distance"]["source_studies"]["km"][9], 19.31)  # p24 "100% 19.31 12.07"
        self.assertEqual(self.c["organised_groups"]["distance"]["uk_study"]["km"][4], 3.50)  # p27 "50% - 3.50 2.17"
        self.assertEqual(self.c["dementia_general"]["distance"]["uk_study"]["km"][9], 15.50)  # p28 "100% - 15.50"

    def test_no_invented_tables(self):
        for key in ("fishermen", "climbers", "skiers"):
            self.assertEqual(self.c[key]["distance"], {"source_studies": None, "uk_study": None})
            self.assertIsNone(self.c[key]["where_found"])

    def test_every_table_has_page_and_ten_rows(self):
        for key, e in self.c.items():
            for ds, t in e["distance"].items():
                if t is None:
                    continue
                self.assertIn(t["page"], e["pages"], (key, ds))
                self.assertEqual(t["percent"], [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
                self.assertEqual(len(t["km"]), 10)
                self.assertEqual(len(t["miles"]), 10)
            for blk in ("outcomes", "where_found"):
                if e.get(blk):
                    self.assertIn(e[blk]["page"], e["pages"], (key, blk))


class RingsTest(unittest.TestCase):
    def test_monotonic_all_tables(self):
        for row in lpb.list_categories():
            for ds, n in row["distance_tables_n"].items():
                if n is None:
                    continue
                rs = lpb.rings(row["key"], ds)
                kms = [r["km"] for r in rs]
                mis = [r["miles"] for r in rs]
                self.assertEqual(kms, sorted(kms), (row["key"], ds))
                self.assertEqual(mis, sorted(mis), (row["key"], ds))

    def test_alias_and_default_dataset(self):
        self.assertEqual(lpb.resolve_category("Walkers"), "hikers")
        self.assertEqual(lpb.rings("hikers")[0]["dataset"], "uk_study")
        self.assertEqual(lpb.rings("hunters")[0]["dataset"], "source_studies")

    def test_interpolated_quartiles(self):
        rs = lpb.rings("hikers", "uk_study", [25, 50, 75, 95])
        self.assertEqual([r["interpolated"] for r in rs], [True, False, True, True])
        self.assertAlmostEqual(rs[0]["km"], 1.25)  # between 20% 1.00 and 30% 1.50
        self.assertEqual(rs[1]["km"], 2.95)
        self.assertAlmostEqual(rs[3]["km"], (7.00 + 25.30) / 2)

    def test_unknown_and_missing(self):
        with self.assertRaises(lpb.UnknownCategoryError):
            lpb.rings("astronauts")
        with self.assertRaises(lpb.NoDistanceTableError):
            lpb.rings("fishermen")


class GeodesyTest(unittest.TestCase):
    def test_circle_radius_50km_mid_latitude(self):
        lat, lon = 45.0, 7.0
        ring = lpb.geodesic_circle(lat, lon, 50.0, n_vertices=72)
        self.assertEqual(ring[0], ring[-1])
        for x, y in ring[:-1]:
            hv = lpb.haversine_km(lat, lon, y, x)
            self.assertLess(abs(hv - 50.0) / 50.0, 0.005)
            self.assertAlmostEqual(lpb.vincenty_inverse_km(lat, lon, y, x), 50.0, places=5)

    def test_haversine_known(self):
        # 1 degree of latitude on the mean sphere
        self.assertAlmostEqual(lpb.haversine_km(0, 0, 1, 0), math.radians(1) * lpb.EARTH_MEAN_RADIUS_KM, places=6)


class OutputTest(unittest.TestCase):
    def test_geojson_well_formed(self):
        gj = lpb.rings_geojson("children_7_12", 54.0, -2.0, "uk_study")
        self.assertEqual(gj["type"], "FeatureCollection")
        self.assertEqual(gj["zero_radius_rings"], [10, 20])  # p9 "10% 0.00", "20% 0.00"
        polys = [f for f in gj["features"] if f["geometry"]["type"] == "Polygon"]
        self.assertEqual(len(polys), 8)
        for f in polys:
            ring = f["geometry"]["coordinates"][0]
            self.assertEqual(ring[0], ring[-1])
            self.assertGreaterEqual(len(ring), 4)
            for x, y in ring:
                self.assertTrue(-180 <= x <= 180 and -90 <= y <= 90)
            self.assertIn("label", f["properties"])
        json.loads(json.dumps(gj))

    def test_kml_well_formed(self):
        text = lpb.rings_kml("hikers", 54.5, -3.1, find={"lat": 54.51, "lon": -3.1, "label": "test"})
        root = ET.fromstring(text.encode("utf-8"))
        ns = {"k": "http://www.opengis.net/kml/2.2"}
        self.assertEqual(root.tag, "{http://www.opengis.net/kml/2.2}kml")
        marks = root.findall(".//k:Placemark", ns)
        self.assertEqual(len(marks), 1 + 10 + 1)
        names = [m.find("k:name", ns).text for m in marks]
        self.assertTrue(any("50%" in n and "2.95 km" in n for n in names))

    def test_locate(self):
        # due north 2.0 km: UK hikers 40% ring is 2.00 km, 50% is 2.95 km (p23)
        la, lo = lpb.vincenty_direct(54.5, -3.1, 0.0, 2500.0)
        loc = lpb.locate("hikers", 54.5, -3.1, la, lo)
        self.assertEqual(loc["inside_ring_percent"], 50)
        self.assertEqual(loc["outside_ring_percent"], 40)
        self.assertAlmostEqual(loc["cdf_piecewise_linear"], 0.4 + 0.1 * 0.5 / 0.95, places=3)


@unittest.skipUnless(HAS_NUMPY, "numpy not installed")
class GridTest(unittest.TestCase):
    def test_sum_equals_ring_coverage(self):
        for pct in (50, 90, 95, 100):
            g = lpb.probability_grid("hikers", 54.5, -3.1, nx=60, ny=60, max_percentile=pct)
            self.assertAlmostEqual(g["total"], pct / 100.0, places=6)

    def test_point_mass_from_zero_rows(self):
        g = lpb.probability_grid("despondents", 54.5, -3.1, nx=40, ny=40, dataset="uk_study", max_percentile=90)
        self.assertAlmostEqual(g["point_mass_at_ipp"], 0.10)  # p13 "10% - 0.00"
        self.assertAlmostEqual(g["total"], 0.90, places=6)

    def test_half_plane_bbox_is_about_half(self):
        # bbox east of the IPP clips every band, so this exercises the area-density path, not mass conservation
        lat, lon = 54.5, -3.1
        full = lpb.probability_grid("hikers", lat, lon, nx=10, ny=10)
        min_lon, min_lat, max_lon, max_lat = full["bbox"]
        east = lpb.probability_grid(
            "hikers", lat, lon, bbox=(lon, min_lat, max_lon, max_lat), nx=200, ny=400, supersample=2
        )
        self.assertAlmostEqual(east["total"], 0.5, delta=0.01)

    def test_ipp_cell_highest_density(self):
        g = lpb.probability_grid("misc_adults", 50.0, 0.0, nx=41, ny=41)
        import numpy as np

        p = np.asarray(g["probability"])
        self.assertEqual(np.unravel_index(int(p.argmax()), p.shape), (20, 20))


class CliTest(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run([sys.executable, SCRIPT, *args], capture_output=True, text=True)

    def test_unknown_category_exits_nonzero(self):
        with tempfile.TemporaryDirectory() as d:
            r = self.run_cli("--category", "astronauts", "--lat", "54", "--lon", "-3", "--out", d)
            self.assertEqual(r.returncode, 2)
            self.assertIn("unknown category", r.stderr)
            self.assertEqual(os.listdir(d), [])

    def test_no_table_exits_3(self):
        with tempfile.TemporaryDirectory() as d:
            r = self.run_cli("--category", "skiers", "--lat", "54", "--lon", "-3", "--out", d)
            self.assertEqual(r.returncode, 3)
            self.assertEqual(os.listdir(d), ["summary.json"])

    def test_hikers_outputs(self):
        with tempfile.TemporaryDirectory() as d:
            r = self.run_cli("--category", "hikers", "--lat", "54.5", "--lon", "-3.1", "--out", d)
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertEqual(sorted(os.listdir(d)), ["rings.geojson", "rings.kml", "summary.json"])
            with open(os.path.join(d, "summary.json"), encoding="utf-8") as fh:
                s = json.load(fh)
            self.assertIn("Perkins", s["citation"])
            self.assertIn("2003 UK statistics", s["note"])
            self.assertIn("other regions", s["note"].lower())
            self.assertEqual((s["sample_size"], s["rings_page"]), (72, 23))
            self.assertEqual(s["category_pages"], [22, 23])
            with open(os.path.join(d, "rings.geojson"), encoding="utf-8") as fh:
                self.assertEqual(json.load(fh)["type"], "FeatureCollection")
            ET.parse(os.path.join(d, "rings.kml"))


if __name__ == "__main__":
    unittest.main()
