"""Tests for columbus_records.py. No network: every test injects a fake getter or opener."""

import contextlib
import io
import json
import pathlib
import tempfile
import unittest
import urllib.error
import urllib.parse
import urllib.request

import columbus_records as cr

STAMP = "2026-10-16T00:00:00.000000Z"
FIELDS = [
    {"name": "OBJECTID", "type": "esriFieldTypeOID"},
    {"name": "SITE_ADDRESS", "type": "esriFieldTypeString"},
    {"name": "ISSUED_DATE", "type": "esriFieldTypeDate"},
]
MS_2005 = 1104537600000  # 2005-01-01T00:00:00Z
MS_1990 = 631152000000  # 1990-01-01T00:00:00Z


def rows(n, date=MS_2005):
    return [{"OBJECTID": i + 1, "SITE_ADDRESS": "1546 N HIGH ST", "ISSUED_DATE": date} for i in range(n)]


def response(url, payload, status=200):
    body = payload if isinstance(payload, bytes) else json.dumps(payload).encode("utf-8")
    return {"url": url, "final_url": url, "status": status, "retrieved_utc": STAMP, "body": body}


class FakeArcGIS:
    """Minimal ArcGIS MapServer emulation for metadata, count and paginated query requests."""

    def __init__(self, fields=None, data=None, max_record_count=2, count=None, supports_pagination=True,
                 send_flag=True, overrides=None):
        self.fields = FIELDS if fields is None else fields
        self.data = rows(5) if data is None else data
        self.mrc = max_record_count
        self.count = count
        self.supports_pagination = supports_pagination
        self.send_flag = send_flag
        self.overrides = overrides or {}
        self.calls = []

    def metadata(self):
        meta = {"name": "Permits", "objectIdField": "OBJECTID", "fields": self.fields,
                "advancedQueryCapabilities": {"supportsPagination": self.supports_pagination}}
        if self.mrc is not None:
            meta["maxRecordCount"] = self.mrc
        return meta

    def __call__(self, url):
        self.calls.append(url)
        parts = urllib.parse.urlsplit(url)
        query = dict(urllib.parse.parse_qsl(parts.query))
        kind = cr._kind_of(url)
        if kind in self.overrides:
            return response(url, self.overrides[kind])
        if kind == "metadata":
            return response(url, self.metadata())
        if kind == "count":
            return response(url, {"count": len(self.data) if self.count is None else self.count})
        offset = int(query.get("resultOffset", 0))
        size = min(int(query["resultRecordCount"]), self.mrc or 10 ** 9)
        batch = self.data[offset:offset + size]
        payload = {"objectIdFieldName": "OBJECTID", "features": [{"attributes": r} for r in batch]}
        if self.send_flag:
            payload["exceededTransferLimit"] = offset + size < len(self.data)
        return response(url, payload)

    def where(self):
        for url in self.calls:
            query = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(url).query))
            if "where" in query:
                return query["where"]
        return None


class FakeHTTPResponse:
    def __init__(self, body, url, status=200):
        self.body, self.url, self.status = body, url, status

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def geturl(self):
        return self.url

    def getcode(self):
        return self.status

    def read(self, n=-1):
        return self.body if n is None or n < 0 else self.body[:n]


class FakeOpener:
    """Each item is an exception to raise or a (body, final_url, status) tuple."""

    def __init__(self, items):
        self.items = list(items)
        self.requests = []

    def open(self, request, timeout=None):
        self.requests.append(request.full_url)
        item = self.items.pop(0)
        if isinstance(item, BaseException):
            raise item
        body, final_url, status = item
        return FakeHTTPResponse(body, final_url or request.full_url, status)


def collect(fake, **kwargs):
    params = dict(layer="building", number=1546, street="HIGH", start=2000, end=2010, getter=fake)
    params.update(kwargs)
    return cr.collect(**params)


class WhereClauseTests(unittest.TestCase):
    def test_injection_attempts_rejected(self):
        for street in ["HIGH' OR '1'='1", "HIGH%", "HIGH_ST", "HIGH;--", "HIGH)", "H", "X" * 41,
                       "HIGH\nST", "", "HİGH", "ﬀ STREET", None, 42]:
            with self.subTest(street=street), self.assertRaises(cr.InputError):
                cr.normalise_street(street)
        for number in [0, 100000, -1, 1.5, "1546", True, None]:
            with self.subTest(number=number), self.assertRaises(cr.InputError):
                cr.validate_number(number)

    def test_rejected_before_any_request(self):
        fake = FakeArcGIS()
        with self.assertRaises(cr.InputError):
            collect(fake, street="HIGH' OR 1=1 --")
        with self.assertRaises(cr.InputError):
            collect(fake, start=2010, end=2000)
        self.assertEqual(fake.calls, [])

    def test_lowercase_street_is_normalised(self):
        self.assertEqual(cr.normalise_street(" n high "), "N HIGH")

    def test_quote_doubling(self):
        self.assertEqual(cr.sql_quote("O'BRIEN"), "'O''BRIEN'")

    def test_unsafe_field_name_from_metadata_rejected(self):
        fields = [{"name": "OBJECTID", "type": "esriFieldTypeOID"},
                  {"name": "ADDRESS) OR (1=1", "type": "esriFieldTypeString"}]
        with self.assertRaises(cr.SchemaError):
            collect(FakeArcGIS(fields=fields))
        with self.assertRaises(cr.SchemaError):
            cr.build_where("A B", 1, "HIGH", 2000, 2001, None)
        with self.assertRaises(cr.SchemaError):
            cr.build_where("ADDR", 1, "HIGH", 2000, 2001,
                           {"applied": True, "field": "X;DROP", "kind": "date"})

    def test_where_clause_exact(self):
        fake = FakeArcGIS()
        result = collect(fake)
        expected = ("UPPER(SITE_ADDRESS) LIKE '%1546%HIGH%' AND ISSUED_DATE >= DATE '2000-01-01' "
                    "AND ISSUED_DATE < DATE '2011-01-01'")
        self.assertEqual(result["where"], expected)
        self.assertEqual(fake.where(), expected)

    def test_layer_spec(self):
        self.assertEqual(cr.parse_layer_spec("permits=7"), ("permits", 7))
        for bad in ["permits", "Permits=7", "p=-1", "p=7/../../x", "p=1e3", "p=10000", "../x=1"]:
            with self.subTest(bad=bad), self.assertRaises(Exception):
                cr.parse_layer_spec(bad)

    def test_custom_layer_stays_on_mapserver_path(self):
        fake = FakeArcGIS()
        collect(fake, layer="permits", layers={"permits": 7})
        self.assertTrue(all(u.startswith(cr.BASE + "/7") for u in fake.calls))
        for url in fake.calls:
            cr.check_url(url)


class YearFilterTests(unittest.TestCase):
    def test_named_date_field(self):
        result = collect(FakeArcGIS())
        self.assertEqual(result["year_filter"]["field"], "ISSUED_DATE")
        self.assertEqual(result["year_filter"]["kind"], "date")
        self.assertTrue(result["year_filter_applied"])
        self.assertTrue(result["complete"])

    def test_single_unnamed_date_field_used(self):
        fields = FIELDS[:2] + [{"name": "STAMP_DT", "type": "esriFieldTypeDate"}]
        result = collect(FakeArcGIS(fields=fields))
        self.assertEqual(result["year_filter"]["field"], "STAMP_DT")
        self.assertIn("STAMP_DT >= DATE '2000-01-01'", result["where"])

    def test_year_integer_field(self):
        fields = FIELDS[:2] + [{"name": "PERMIT_YEAR", "type": "esriFieldTypeSmallInteger"}]
        data = [{"OBJECTID": 1, "SITE_ADDRESS": "1546 N HIGH ST", "PERMIT_YEAR": 2004}]
        result = collect(FakeArcGIS(fields=fields, data=data))
        self.assertEqual(result["year_filter"]["kind"], "year_integer")
        self.assertTrue(result["where"].endswith("AND PERMIT_YEAR >= 2000 AND PERMIT_YEAR <= 2010"))
        self.assertTrue(result["complete"])

    def test_string_year_field_not_used(self):
        fields = FIELDS[:2] + [{"name": "YEAR", "type": "esriFieldTypeString"}]
        result = collect(FakeArcGIS(fields=fields, data=[]))
        self.assertFalse(result["year_filter"]["applied"])
        self.assertNotIn("YEAR", result["where"])

    def test_no_filter_recorded(self):
        fields = FIELDS[:2]
        result = collect(FakeArcGIS(fields=fields, data=[]))
        self.assertFalse(result["year_filter_applied"])
        self.assertIn("no year filter applied", result["year_filter"]["reason"])
        self.assertEqual(result["where"], "UPPER(SITE_ADDRESS) LIKE '%1546%HIGH%'")

    def test_ambiguous_date_fields(self):
        fields = FIELDS[:2] + [{"name": "A_DT", "type": "esriFieldTypeDate"},
                               {"name": "B_DT", "type": "esriFieldTypeDate"}]
        result = collect(FakeArcGIS(fields=fields, data=[]))
        self.assertFalse(result["year_filter"]["applied"])
        self.assertIn("ambiguous", result["year_filter"]["reason"])

    def test_rows_outside_range_flagged(self):
        result = collect(FakeArcGIS(data=rows(1, date=MS_1990)))
        self.assertEqual(result["year_check"]["outside_range"], 1)
        self.assertFalse(result["complete"])


class PaginationTests(unittest.TestCase):
    def query_calls(self, fake):
        return [dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(u).query)) for u in fake.calls
                if cr._kind_of(u) == "query"]

    def test_pages_follow_max_record_count(self):
        fake = FakeArcGIS(data=rows(5), max_record_count=2)
        result = collect(fake)
        queries = self.query_calls(fake)
        self.assertEqual([q["resultOffset"] for q in queries], ["0", "2", "4"])
        self.assertEqual({q["resultRecordCount"] for q in queries}, {"2"})
        self.assertEqual(result["record_count"], 5)
        self.assertEqual(result["server_count"], 5)
        self.assertFalse(result["truncated"])
        self.assertTrue(result["complete"])
        self.assertEqual([p["kind"] for p in result["pages"]], ["metadata", "count", "query", "query", "query"])

    def test_max_records_truncates(self):
        fake = FakeArcGIS(data=rows(5), max_record_count=2)
        result = collect(fake, max_records=3)
        self.assertEqual(result["record_count"], 3)
        self.assertEqual(self.query_calls(fake)[-1]["resultRecordCount"], "1")
        self.assertTrue(result["truncated"])
        self.assertFalse(result["complete"])
        self.assertTrue(any("max_records=3" in i for i in result["issues"]))

    def test_count_shortfall_truncates(self):
        result = collect(FakeArcGIS(data=rows(5), count=9))
        self.assertTrue(result["truncated"])
        self.assertTrue(any("5 of 9" in i for i in result["issues"]))

    def test_empty_page_with_exceeded_flag(self):
        fake = FakeArcGIS(overrides={"query": {"features": [], "exceededTransferLimit": True}}, data=rows(3))
        result = collect(fake)
        self.assertTrue(result["truncated"])
        self.assertEqual(len(self.query_calls(fake)), 1)

    def test_no_pagination_support(self):
        fake = FakeArcGIS(data=rows(5), supports_pagination=False)
        result = collect(fake)
        self.assertNotIn("resultOffset", self.query_calls(fake)[0])
        self.assertTrue(result["truncated"])
        self.assertEqual(result["record_count"], 2)

    def test_missing_flag_full_page_keeps_going(self):
        fake = FakeArcGIS(data=rows(4), max_record_count=2, send_flag=False)
        result = collect(fake)
        self.assertEqual(len(self.query_calls(fake)), 3)  # last one returns empty
        self.assertTrue(result["complete"])

    def test_missing_max_record_count_uses_fallback(self):
        result = collect(FakeArcGIS(data=rows(3), max_record_count=None))
        self.assertEqual(result["page_size"], cr.FALLBACK_PAGE_SIZE)
        self.assertIn("fallback", result["page_size_source"])

    def test_missing_count_is_incomplete(self):
        result = collect(FakeArcGIS(overrides={"count": {"nope": 1}}))
        self.assertIsNone(result["server_count"])
        self.assertFalse(result["complete"])

    def test_error_payload_raises(self):
        with self.assertRaises(cr.ArcGISError):
            collect(FakeArcGIS(overrides={"query": {"error": {"code": 400, "message": "Invalid query"}}}))


class FetchTests(unittest.TestCase):
    URL = cr.BASE + "/5?f=json"

    def test_allow_list(self):
        for url in ["http://gis.columbus.gov" + cr.BASE_PATH + "/5", "https://evil.example" + cr.BASE_PATH + "/5",
                    "https://gis.columbus.gov/arcgis/rest/services/Other/MapServer/5",
                    cr.BASE + "/../../Other/MapServer", cr.BASE + "/%2e%2e/x", "https://gis.columbus.gov:8443"
                    + cr.BASE_PATH, "https://user@gis.columbus.gov" + cr.BASE_PATH, cr.BASE + "Evil/5"]:
            with self.subTest(url=url), self.assertRaises(cr.UnapprovedURL):
                cr.fetch(url, opener=FakeOpener([]))
        cr.check_url(cr.BASE + "?f=json")

    def test_success_returns_raw_bytes(self):
        body = b'{ "b" : 1,\n "a":[2 ,3] }'
        result = cr.fetch(self.URL, opener=FakeOpener([(body, None, 200)]))
        self.assertEqual(result["body"], body)
        self.assertEqual(result["sha256"], cr.digest(body))
        self.assertEqual(result["status"], 200)
        self.assertTrue(result["retrieved_utc"].endswith("Z"))

    def test_redirect_to_other_host_rejected(self):
        opener = FakeOpener([(b"{}", "https://evil.example/x", 200)])
        with self.assertRaises(cr.UnapprovedURL):
            cr.fetch(self.URL, opener=opener, sleep=lambda s: None)
        self.assertEqual(len(opener.requests), 1)  # not retried

    def test_redirect_handler_refuses_before_following(self):
        handler = cr.AllowListRedirectHandler()
        req = urllib.request.Request(self.URL)
        with self.assertRaises(cr.UnapprovedURL):
            handler.redirect_request(req, None, 302, "Found", {}, "https://evil.example/steal")
        new = handler.redirect_request(req, None, 302, "Found", {}, cr.BASE + "/22?f=json")
        self.assertEqual(new.full_url, cr.BASE + "/22?f=json")

    def test_oversized_rejected(self):
        opener = FakeOpener([(b"x" * 101, None, 200)])
        with self.assertRaises(cr.ResponseTooLarge):
            cr.fetch(self.URL, opener=opener, max_bytes=100)
        self.assertEqual(len(opener.requests), 1)

    def test_retry_with_backoff(self):
        sleeps = []
        opener = FakeOpener([urllib.error.URLError("down"), urllib.error.HTTPError(self.URL, 503, "x", None, None),
                             (b"{}", None, 200)])
        result = cr.fetch(self.URL, opener=opener, sleep=sleeps.append)
        self.assertEqual(sleeps, [1, 2])
        self.assertEqual(result["attempts"], 3)

    def test_retries_exhausted_and_4xx_not_retried(self):
        opener = FakeOpener([TimeoutError()] * 3)
        with self.assertRaises(TimeoutError):
            cr.fetch(self.URL, opener=opener, sleep=lambda s: None)
        opener = FakeOpener([urllib.error.HTTPError(self.URL, 404, "x", None, None)])
        with self.assertRaises(urllib.error.HTTPError):
            cr.fetch(self.URL, opener=opener, sleep=lambda s: None)
        self.assertEqual(len(opener.requests), 1)

    def test_non_2xx_status_from_opener_raises(self):
        opener = FakeOpener([(b"{}", None, 500)] * 3)
        with self.assertRaises(urllib.error.HTTPError):
            cr.fetch(self.URL, opener=opener, sleep=lambda s: None)

    def test_list_layers(self):
        service = {"layers": [{"id": 22, "name": "Engineering", "type": "Feature Layer"},
                              {"id": 5, "name": "Building", "type": "Feature Layer"}],
                   "tables": [{"id": 40, "name": "Permits table"}]}
        body = json.dumps(service).encode()
        seen = []

        def getter(url):
            seen.append(url)
            return response(url, body)
        info = cr.list_layers(getter)
        self.assertEqual(seen, [cr.BASE + "?f=json"])
        self.assertEqual([(x["id"], x["kind"]) for x in info["layers"]], [(5, "layer"), (22, "layer"), (40, "table")])
        self.assertEqual(info["sha256"], cr.digest(body))


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def run_ok(self, fake=None, **kwargs):
        report = cr.run(self.tmp.name, getter=fake or FakeArcGIS(), **kwargs)
        return report, pathlib.Path(report["run_dir"])

    def manifest(self, run_dir):
        return json.loads((run_dir / cr.MANIFEST).read_text())

    def write_manifest(self, run_dir, manifest):
        (run_dir / cr.MANIFEST).write_text(json.dumps(manifest))

    def test_raw_bytes_preserved_and_hashes_match(self):
        odd = b'{"features" :[{"attributes":{"OBJECTID":1,"SITE_ADDRESS":"1546 N HIGH ST","ISSUED_DATE":' \
              + str(MS_2005).encode() + b'}}],  "exceededTransferLimit":false}\r\n'
        fake = FakeArcGIS(data=rows(1), overrides={"query": odd})
        report, run_dir = self.run_ok(fake, layers={"building": 5})
        self.assertTrue(report["complete"], report)
        manifest = self.manifest(run_dir)
        raw = [e for e in manifest["files"] if e["role"] == "raw_response"]
        self.assertEqual([e["kind"] for e in raw], ["metadata", "count", "query"])
        self.assertEqual((run_dir / raw[2]["name"]).read_bytes(), odd)
        for entry in manifest["files"]:
            self.assertEqual(cr.digest((run_dir / entry["name"]).read_bytes()), entry["sha256"])
        for entry in raw:
            self.assertTrue(entry["url"].startswith(cr.BASE))
            self.assertEqual(entry["status"], 200)
            self.assertEqual(entry["retrieved_utc"], STAMP)
        summary = json.loads((run_dir / report["layers"][0]["summary_file"]).read_text())
        self.assertEqual(summary["pages"][2]["sha256"], cr.digest(odd))
        self.assertEqual(summary["pages"][2]["file"], raw[2]["name"])
        self.assertEqual(cr.verify(run_dir), [])
        self.assertEqual(cr.verify(run_dir, expect_head=report["chain_head"]), [])

    def test_chain_is_running_hash(self):
        _, run_dir = self.run_ok()
        manifest = self.manifest(run_dir)
        chain = cr.GENESIS
        for entry in manifest["files"]:
            chain = cr.hashlib.sha256((chain + entry["sha256"]).encode()).hexdigest()
            self.assertEqual(entry["chain"], chain)
        self.assertEqual(manifest["chain_head"], chain)
        self.assertEqual(manifest["file_count"], 2 * 6)  # 2 layers x (metadata, count, 3 pages, summary)

    def test_verify_detects_tampering(self):
        _, run_dir = self.run_ok()
        name = self.manifest(run_dir)["files"][2]["name"]
        path = run_dir / name
        path.write_bytes(path.read_bytes() + b" ")
        failures = cr.verify(run_dir)
        self.assertIn(f"{name}: sha256 mismatch", failures)

    def test_verify_detects_file_deletion(self):
        _, run_dir = self.run_ok()
        name = self.manifest(run_dir)["files"][1]["name"]
        (run_dir / name).unlink()
        self.assertIn(f"{name}: missing", cr.verify(run_dir))

    def test_verify_detects_entry_deletion(self):
        _, run_dir = self.run_ok()
        manifest = self.manifest(run_dir)
        removed = manifest["files"].pop(3)
        self.write_manifest(run_dir, manifest)
        failures = cr.verify(run_dir)
        self.assertTrue(any("hash chain breaks" in f for f in failures), failures)
        self.assertIn(f"{removed['name']}: present on disk but not in manifest", failures)

    def test_verify_detects_deletion_with_rewritten_chain_via_expect_head(self):
        report, run_dir = self.run_ok()
        manifest = self.manifest(run_dir)
        removed = manifest["files"].pop()
        (run_dir / removed["name"]).unlink()
        chain = cr.GENESIS  # attacker recomputes everything consistently
        for seq, entry in enumerate(manifest["files"], 1):
            chain = cr.chain_step(chain, entry["sha256"])
            entry.update(seq=seq, chain=chain)
        manifest.update(chain_head=chain, file_count=len(manifest["files"]))
        self.write_manifest(run_dir, manifest)
        self.assertEqual(cr.verify(run_dir), [])  # undetectable without an external anchor
        self.assertIn("recomputed chain does not match --expect-head",
                      cr.verify(run_dir, expect_head=report["chain_head"]))

    def test_verify_detects_reordering(self):
        _, run_dir = self.run_ok()
        manifest = self.manifest(run_dir)
        files = manifest["files"]
        files[1], files[2] = files[2], files[1]
        self.write_manifest(run_dir, manifest)
        failures = cr.verify(run_dir)
        self.assertTrue(any("hash chain breaks at position 2" in f for f in failures), failures)
        self.assertTrue(any("reordered" in f for f in failures), failures)

    def test_verify_detects_reordering_even_with_seq_renumbered(self):
        _, run_dir = self.run_ok()
        manifest = self.manifest(run_dir)
        files = manifest["files"]
        files[1], files[2] = files[2], files[1]
        for seq, entry in enumerate(files, 1):
            entry["seq"] = seq
        self.write_manifest(run_dir, manifest)
        self.assertTrue(any("hash chain breaks" in f for f in cr.verify(run_dir)))

    def test_verify_unreadable_manifest(self):
        _, run_dir = self.run_ok()
        (run_dir / cr.MANIFEST).write_text("{not json")
        self.assertEqual(len(cr.verify(run_dir)), 1)

    def test_error_payload_preserved_and_run_incomplete(self):
        fake = FakeArcGIS(overrides={"count": {"error": {"code": 400, "message": "Unable to complete operation."}}})
        report, run_dir = self.run_ok(fake, layers={"building": 5})
        self.assertFalse(report["complete"])
        self.assertEqual(report["errors"][0]["error_type"], "ArcGISError")
        manifest = self.manifest(run_dir)
        self.assertEqual([e["kind"] for e in manifest["files"]], ["metadata", "count"])
        self.assertIn(b"Unable to complete", (run_dir / manifest["files"][1]["name"]).read_bytes())
        self.assertEqual(cr.verify(run_dir), [])

    def test_redirect_and_oversize_recorded_as_layer_errors(self):
        def opener_getter(items):
            opener = FakeOpener(items)
            return lambda url: cr.fetch(url, opener=opener, sleep=lambda s: None, max_bytes=50)
        report, _ = self.run_ok(opener_getter([(b"{}", "https://evil.example/", 200)]), layers={"building": 5})
        self.assertEqual(report["errors"][0]["error_type"], "UnapprovedURL")
        report, _ = self.run_ok(opener_getter([(b"{" + b" " * 60 + b"}", None, 200)]), layers={"building": 5})
        self.assertEqual(report["errors"][0]["error_type"], "ResponseTooLarge")
        self.assertFalse(report["complete"])

    def test_getter_hash_mismatch_rejected(self):
        def lying(url):
            out = response(url, b"{}")
            out["sha256"] = "0" * 64
            return out
        report, _ = self.run_ok(lying, layers={"building": 5})
        self.assertIn("does not match", report["errors"][0]["message"])


class ExitCodeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def main(self, argv, getter=None):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = cr.main(argv, getter=getter)
        return code, out.getvalue(), err.getvalue()

    def test_complete_is_zero_then_verify_zero(self):
        code, out, _ = self.main(["--output", self.tmp.name], FakeArcGIS())
        self.assertEqual(code, cr.EXIT_OK)
        report = json.loads(out)
        code, out, _ = self.main(["--verify", report["run_dir"], "--expect-head", report["chain_head"]])
        self.assertEqual(code, cr.EXIT_OK)
        result = json.loads(out)
        self.assertTrue(result["verified"])
        self.assertTrue(result["run_complete"])
        self.assertEqual(result["file_count"], 12)

    def test_truncated_is_one(self):
        code, out, _ = self.main(["--output", self.tmp.name, "--max-records", "3"], FakeArcGIS())
        self.assertEqual(code, cr.EXIT_INCOMPLETE)
        self.assertTrue(json.loads(out)["layers"][0]["truncated"])

    def test_layer_error_is_one(self):
        fake = FakeArcGIS(overrides={"metadata": {"error": {"code": 500}}})
        code, _, _ = self.main(["--output", self.tmp.name], fake)
        self.assertEqual(code, cr.EXIT_INCOMPLETE)

    def test_verify_failure_is_one(self):
        _, out, _ = self.main(["--output", self.tmp.name], FakeArcGIS())
        run_dir = pathlib.Path(json.loads(out)["run_dir"])
        next(p for p in run_dir.iterdir() if p.name != cr.MANIFEST).write_bytes(b"tampered")
        code, out, _ = self.main(["--verify", str(run_dir)])
        self.assertEqual(code, cr.EXIT_INCOMPLETE)
        self.assertFalse(json.loads(out)["verified"])

    def test_bad_input_is_two_and_no_request(self):
        fake = FakeArcGIS()
        for argv in (["--street", "HIGH' OR '1'='1"], ["--number", "0"], ["--start", "2011", "--end", "2010"],
                     ["--max-records", "0"], ["--layer", "a=1", "--layer", "a=2"], ["--case", "../x"]):
            with self.subTest(argv=argv):
                code, _, err = self.main(["--output", self.tmp.name] + argv, fake)
                self.assertEqual(code, cr.EXIT_BAD_INPUT)
                self.assertIn("error:", err)
        self.assertEqual(fake.calls, [])
        code, _, _ = self.main(["--verify", self.tmp.name, "--expect-head", "xyz"])
        self.assertEqual(code, cr.EXIT_BAD_INPUT)

    def test_argparse_errors_are_two(self):
        for argv in (["--number", "12abc"], ["--layer", "bad"]):
            with self.subTest(argv=argv), self.assertRaises(SystemExit) as ctx, \
                    contextlib.redirect_stderr(io.StringIO()):
                cr.main(argv, getter=FakeArcGIS())
            self.assertEqual(ctx.exception.code, 2)

    def test_list_layers_exit_codes(self):
        body = json.dumps({"layers": [{"id": 5, "name": "Building"}]}).encode()
        code, out, _ = self.main(["--list-layers"], lambda url: response(url, body))
        self.assertEqual(code, cr.EXIT_OK)
        self.assertEqual(json.loads(out)["layers"][0]["id"], 5)
        code, _, _ = self.main(["--list-layers"], lambda url: response(url, {"error": {"code": 499}}))
        self.assertEqual(code, cr.EXIT_INCOMPLETE)

    def test_custom_layers_via_cli(self):
        fake = FakeArcGIS()
        code, out, _ = self.main(["--output", self.tmp.name, "--layer", "permits=7"], fake)
        self.assertEqual(code, cr.EXIT_OK)
        self.assertEqual([x["layer"] for x in json.loads(out)["layers"]], ["permits"])
        self.assertTrue(all(u.startswith(cr.BASE + "/7") for u in fake.calls))


if __name__ == "__main__":
    unittest.main()
