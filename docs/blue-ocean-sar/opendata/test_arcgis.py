"""Tests for arcgis.py: URL validation, where-clause safety, paging, esri->GeoJSON."""

import io
import json
import os
import sys
import unittest
import urllib.parse
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import arcgis  # noqa: E402
from _fakenet import FakeOpener, fixture_json  # noqa: E402

CULV = "https://services3.arcgis.com/AbC123xyz/arcgis/rest/services/Culverts/FeatureServer/0"
DRAIN = "https://gis.example.gov/arcgis/rest/services/Hydro/Drainage/MapServer/3"
FIELDS = fixture_json("arcgis_culverts_layer.json")["fields"]


def _run(argv, opener):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = arcgis.main(argv + ["--retries", "0"], opener=opener)
    return code, (json.loads(out.getvalue()) if out.getvalue() else None), err.getvalue()


def _q(url):
    return dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(url).query))


class UrlValidation(unittest.TestCase):
    def test_accepts_layer_urls(self):
        for u in (CULV, DRAIN, DRAIN + "/", "https://maps.example.org/server/arcgis/rest/services/A/B/FeatureServer/12",
                  "https://services.arcgis.com/Org9/ArcGIS/rest/services/Name/FeatureServer/0"):
            arcgis.validate_layer_url(u)

    def test_rejects(self):
        for u in ("http://gis.example.gov/arcgis/rest/services/H/D/MapServer/3",
                  "https://gis.example.gov/arcgis/rest/services/H/D/MapServer",
                  "https://gis.example.gov/arcgis/rest/services/H/D/MapServer/3/query",
                  "https://gis.example.gov/arcgis/rest/services/H/D/ImageServer/3",
                  "https://gis.example.gov/arcgis/rest/services/H/D/MapServer/3?token=abc",
                  "https://u" + ":p@gis.example.gov/arcgis/rest/services/H/D/MapServer/3",
                  "https://gis.example.gov:8443/arcgis/rest/services/H/D/MapServer/3",
                  "https://gis.example.gov/arcgis/rest/services/../../x/MapServer/3",
                  "https://gis.example.gov/other/path/MapServer/3",
                  "https://services1.arcgis.com/Org/arcgis/rest/services/Name/MapServer/0"):
            with self.assertRaises(ValueError, msg=u):
                arcgis.validate_layer_url(u)


class Where(unittest.TestCase):
    def test_eq_like_date(self):
        w = arcgis.build_where([("STATUS", "Active")], [("ROAD_NAME", "Broad%")],
                               [("INSPECTED", "2023-01-01", "2023-12-31")], fields=FIELDS)
        self.assertEqual(w, "STATUS = 'Active' AND ROAD_NAME LIKE 'Broad%' AND "
                            "INSPECTED >= TIMESTAMP '2023-01-01 00:00:00' AND "
                            "INSPECTED <= TIMESTAMP '2023-12-31 23:59:59'")

    def test_numeric_field(self):
        self.assertEqual(arcgis.build_where([("DIAM_IN", "24")], fields=FIELDS), "DIAM_IN = 24")

    def test_quote_injection_is_escaped_into_one_literal(self):
        w = arcgis.build_where([("STATUS", "x' OR '1'='1")], fields=FIELDS)
        self.assertEqual(w, "STATUS = 'x'' OR ''1''=''1'")
        body = w[len("STATUS = "):]
        self.assertTrue(body.startswith("'") and body.endswith("'"))
        self.assertEqual(body[1:-1].replace("''", ""), "x OR 1=1")

    def test_injection_rejected(self):
        bad = [
            dict(eq=[("STATUS = 'a' OR 1", "1")]),          # field name is not an identifier
            dict(eq=[("NOT_A_FIELD", "1")]),                # unknown field
            dict(eq=[("DIAM_IN", "1 OR 1=1")]),             # non-number into numeric field
            dict(eq=[("DIAM_IN", "1; DROP TABLE x")]),
            dict(eq=[("STATUS", "a\x00b")]),                # control char
            dict(like=[("DIAM_IN", "1%")]),                 # LIKE on numeric
            dict(date_ranges=[("STATUS", "2023-01-01", "2023-02-01")]),
            dict(date_ranges=[("INSPECTED", "2023-01-01' OR '1'='1", "2023-02-01")]),
            dict(date_ranges=[("INSPECTED", "2023-03-01", "2023-02-01")]),
            dict(raw="1=1 OR 2=2"),
            dict(raw="STATUS='x'"),
        ]
        for kw in bad:
            with self.assertRaises(arcgis.WhereError, msg=kw):
                arcgis.build_where(fields=FIELDS, **kw)

    def test_raw_1_eq_1_and_default(self):
        self.assertEqual(arcgis.build_where(raw="1=1"), "1=1")
        self.assertEqual(arcgis.build_where(raw=" 1 = 1 "), "1=1")
        self.assertEqual(arcgis.build_where(), "1=1")

    def test_cli_rejects_injection_before_query(self):
        op = FakeOpener().add("GET", CULV + "?", (200, fixture_json("arcgis_culverts_layer.json")))
        code, _, err = _run([CULV, "--where", "1=1 OR STATUS<>''"], op)
        self.assertEqual(code, 2)
        self.assertEqual(len(op.requests), 1)  # metadata only; no /query sent
        code, _, _ = _run([CULV, "--eq", "DIAM_IN=1 OR 1=1"], op)
        self.assertEqual(code, 2)
        self.assertFalse(any("/query" in r["url"] for r in op.requests))


class GeoJsonPaging(unittest.TestCase):
    def test_geojson_paging_with_offset(self):
        op = FakeOpener()
        op.add("GET", CULV + "?", (200, fixture_json("arcgis_culverts_layer.json")))
        op.add("GET", CULV + "/query", (200, fixture_json("arcgis_culverts_geojson_p1.json")),
               (200, fixture_json("arcgis_culverts_geojson_p2.json")))
        code, fc, err = _run([CULV, "--eq", "STATUS=Active", "--bbox", "-83.1,39.9,-82.9,40.05"], op)
        self.assertEqual(code, 0, err)
        self.assertEqual(len(fc["features"]), 3)
        self.assertEqual(fc["properties"]["pages"], 2)
        q1, q2 = _q(op.requests[1]["url"]), _q(op.requests[2]["url"])
        self.assertEqual(q1["f"], "geojson")
        self.assertEqual(q1["where"], "STATUS = 'Active'")
        self.assertEqual(q1["resultOffset"], "0")
        self.assertEqual(q1["resultRecordCount"], "2")
        self.assertEqual(q2["resultOffset"], "2")
        self.assertEqual(q1["geometry"], "-83.1,39.9,-82.9,40.05")
        self.assertEqual(q1["geometryType"], "esriGeometryEnvelope")
        self.assertEqual(q1["inSR"], "4326")
        self.assertEqual(q1["outSR"], "4326")

    def test_info(self):
        op = FakeOpener().add("GET", CULV + "?", (200, fixture_json("arcgis_culverts_layer.json")))
        code, info, _ = _run([CULV, "--info"], op)
        self.assertEqual(code, 0)
        self.assertTrue(info["supports_geojson"])
        self.assertTrue(info["supports_pagination"])
        self.assertEqual(info["max_record_count"], 2)
        self.assertIn("INSPECTED", [f["name"] for f in info["fields"]])

    def test_redirect_to_other_host_refused(self):
        op = FakeOpener().add("GET", CULV + "?", (302, b"", {"Location": "https://evil.example.net/x"}))
        code, _, _ = _run([CULV, "--info"], op)
        self.assertEqual(code, 2)

    def test_service_error_exit_3(self):
        op = FakeOpener()
        op.add("GET", CULV + "?", (200, fixture_json("arcgis_culverts_layer.json")))
        op.add("GET", CULV + "/query", (200, {"error": {"code": 400, "message": "Invalid query", "details": []}}))
        code, _, err = _run([CULV], op)
        self.assertEqual(code, 3)
        self.assertIn("Invalid query", err)


class EsriConversion(unittest.TestCase):
    def test_esri_json_paging_and_conversion(self):
        op = FakeOpener()
        op.add("GET", DRAIN + "?", (200, fixture_json("arcgis_parcels_layer.json")))
        op.add("GET", DRAIN + "/query", (200, fixture_json("arcgis_parcels_esri_p1.json")),
               (200, fixture_json("arcgis_parcels_esri_p2.json")))
        code, fc, err = _run([DRAIN, "--where", "1=1"], op)
        self.assertEqual(code, 0, err)
        self.assertEqual(_q(op.requests[1]["url"])["f"], "json")
        self.assertEqual(fc["properties"]["format_used"], "esri-json converted")
        feats = {f["id"]: f for f in fc["features"]}
        self.assertEqual(sorted(feats), [10, 11, 12, 13, 14, 15])
        poly = feats[10]["geometry"]
        self.assertEqual(poly["type"], "Polygon")
        self.assertEqual(len(poly["coordinates"]), 2)              # outer + hole
        self.assertGreater(arcgis._ring_area2(poly["coordinates"][0]), 0)  # RFC 7946: outer CCW
        self.assertLess(arcgis._ring_area2(poly["coordinates"][1]), 0)     # hole CW
        self.assertEqual(feats[11]["geometry"]["type"], "MultiPolygon")
        self.assertEqual(len(feats[11]["geometry"]["coordinates"]), 2)
        self.assertEqual(feats[12]["geometry"]["type"], "LineString")
        self.assertEqual(feats[13]["geometry"]["type"], "MultiLineString")
        self.assertEqual(feats[14]["geometry"], {"type": "Point", "coordinates": [-83.0, 39.9]})
        self.assertIsNone(feats[15]["geometry"])
        self.assertEqual(feats[10]["properties"]["NAME"], "Pond with island")

    def test_multipoint_and_envelope(self):
        g = arcgis.esri_geometry_to_geojson({"points": [[1, 2], [3, 4, 5]]})
        self.assertEqual(g, {"type": "MultiPoint", "coordinates": [[1, 2], [3, 4]]})
        g = arcgis.esri_geometry_to_geojson({"xmin": 0, "ymin": 0, "xmax": 1, "ymax": 1})
        self.assertEqual(g["type"], "Polygon")

    def test_truncation_noted_without_pagination(self):
        info = fixture_json("arcgis_parcels_layer.json")
        info["advancedQueryCapabilities"]["supportsPagination"] = False
        op = FakeOpener()
        op.add("GET", DRAIN + "?", (200, info))
        op.add("GET", DRAIN + "/query", (200, fixture_json("arcgis_parcels_esri_p1.json")))
        code, fc, _ = _run([DRAIN], op)
        self.assertEqual(code, 0)
        self.assertEqual(len(op.requests), 2)
        self.assertTrue(any("truncated" in n for n in fc["properties"]["notes"]))
        self.assertNotIn("resultOffset", _q(op.requests[1]["url"]))


if __name__ == "__main__":
    unittest.main()
