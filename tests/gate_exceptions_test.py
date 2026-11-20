"""Tests for scripts/gate_exceptions.py. HTTP is mocked; all rows below are SYNTHETIC, DEV-ONLY
test data (not the real table and never used for any finding, ledger or result)."""
import datetime as dt
import importlib
import io
import json
import os
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
ge = importlib.import_module("gate_exceptions")
D = dt.date
TODAY = D(2026, 11, 19)


def row(check, match, scope="midnghtsapphire/*", enabled=1, expires=None):
    return {"check_id": check, "result_match": match, "scope": scope, "enabled": enabled,
            "reason": "DEV-ONLY synthetic", "owner": "dev", "created": D(2026, 11, 19),
            "expires": expires, "wr_link": "https://example.invalid/wr"}


ROWS = [  # DEV-ONLY synthetic rows shaped like the seed rows
    row("Devin Review", "Bugfinder incomplete"),
    row("Gitar", "quota-paused", expires=D(2026, 12, 1)),
    row("cubic", "line limit reached"),
    row("GitHub Actions", "billing-lock"),
]
REPO = "midnghtsapphire/linear-a"


def d(check, result, **kw):
    kw.setdefault("findings", 0)
    kw.setdefault("rows", ROWS)
    kw.setdefault("today", TODAY)
    return ge.decide(check, result, REPO, **kw)[0]


class DecideTests(unittest.TestCase):
    def test_seed_shaped_rows_are_non_blocking(self):
        self.assertEqual(d("Devin Review", "Analysis failed: Bugfinder incomplete"), ge.NON_BLOCKING)
        self.assertEqual(d("Gitar", "Automatic reviews are paused because your team used its quota"), ge.NON_BLOCKING)
        self.assertEqual(d("cubic · AI code reviewer", "AI review line limit reached"), ge.NON_BLOCKING)
        self.assertEqual(d("validate-markdown-structures", "startup_failure"), ge.BLOCKING)  # check_id is 'GitHub Actions'
        self.assertEqual(d("GitHub Actions", "startup_failure"), ge.NON_BLOCKING)
        self.assertEqual(d("GitHub Actions", "failure", duration_seconds=2), ge.NON_BLOCKING)

    def test_long_actions_failure_still_blocks(self):
        self.assertEqual(d("GitHub Actions", "failure", duration_seconds=45), ge.BLOCKING)

    def test_real_findings_always_block(self):
        self.assertEqual(d("Devin Review", "Bugfinder incomplete", findings=1), ge.BLOCKING)
        self.assertEqual(d("Devin Review", "Bugfinder incomplete", findings=None), ge.BLOCKING)

    def test_real_test_failure_always_blocks(self):
        self.assertEqual(d("Devin Review", "Bugfinder incomplete", test_failure=True), ge.BLOCKING)
        rows = ROWS + [row("CircleCI", "failed")]
        self.assertEqual(d("CircleCI", "failed", rows=rows), ge.BLOCKING)
        self.assertEqual(d("run_all.sh", "decipher_smoke exit 2", rows=[row("run_all.sh", "decipher_smoke")]), ge.BLOCKING)

    def test_unrelated_result_of_exempted_check_blocks(self):
        self.assertEqual(d("Devin Review", "Found SQL injection in foo.py"), ge.BLOCKING)

    def test_disabled_row_is_ignored(self):
        self.assertEqual(d("cubic", "line limit reached", rows=[row("cubic", "line limit reached", enabled=0)]), ge.BLOCKING)
        self.assertEqual(d("cubic", "line limit reached", rows=[row("cubic", "line limit reached", enabled=None)]), ge.BLOCKING)

    def test_expired_row_is_ignored(self):
        gitar = "Automatic reviews are paused (quota)"
        self.assertEqual(d("Gitar", gitar, today=D(2026, 11, 30)), ge.NON_BLOCKING)
        self.assertEqual(d("Gitar", gitar, today=D(2026, 12, 1)), ge.BLOCKING)

    def test_table_cannot_switch_off_a_whole_check(self):
        for bad in ("", "*", "  ", "%", "??", "a*"):
            self.assertEqual(d("Devin Review", "any failure at all", rows=[row("Devin Review", bad)]), ge.BLOCKING, bad)

    def test_scope(self):
        self.assertEqual(d("cubic", "line limit reached", rows=[row("cubic", "line limit reached", scope="other/*")]), ge.BLOCKING)
        self.assertEqual(d("cubic", "line limit reached", rows=[row("cubic", "line limit reached", scope="*")]), ge.NON_BLOCKING)
        self.assertEqual(d("cubic", "line limit reached", rows=[row("cubic", "line limit reached", scope="")]), ge.BLOCKING)

    def test_empty_result_blocks(self):
        self.assertEqual(d("Devin Review", ""), ge.BLOCKING)


def page(check, match, scope, enabled, expires=None):
    def rt(s): return {"rich_text": [{"plain_text": s}]}
    return {"properties": {
        "check_id": {"title": [{"plain_text": check}]}, "result_match": rt(match), "scope": rt(scope),
        "enabled": {"number": enabled}, "reason": rt("DEV-ONLY"), "owner": rt("dev"),
        "created": {"date": {"start": "2026-11-19"}},
        "expires": {"date": {"start": expires} if expires else None}, "wr_link": {"url": None}}}


class FakeResp(io.BytesIO):
    def __enter__(self): return self
    def __exit__(self, *a): return False


class NotionTests(unittest.TestCase):
    ENV = {"NOTION_TOKEN": "secret-dev-token-xyz", "NOTION_GATE_EXCEPTIONS_DB_ID": "dbid"}

    def test_reads_rows_and_paginates(self):
        pages = [
            {"results": [page("cubic", "line limit reached", "*", 1)], "has_more": True, "next_cursor": "c2"},
            {"results": [page("Gitar", "quota-paused", "*", 1, "2026-12-01")], "has_more": False},
        ]
        seen = []
        def fake(req, timeout=0):
            seen.append(req)
            return FakeResp(json.dumps(pages[len(seen) - 1]).encode())
        with mock.patch.dict(os.environ, self.ENV), mock.patch("urllib.request.urlopen", fake):
            rows = ge.load_rows()
        self.assertEqual([r["check_id"] for r in rows], ["cubic", "Gitar"])
        self.assertEqual(rows[1]["expires"], D(2026, 12, 1))
        self.assertEqual(len(seen), 2)
        self.assertIn("databases/dbid/query", seen[0].full_url)
        self.assertEqual(json.loads(seen[1].data)["start_cursor"], "c2")

    def test_fails_closed_when_unreachable_and_never_logs_secrets(self):
        err = io.StringIO()
        with mock.patch.dict(os.environ, self.ENV), \
             mock.patch("urllib.request.urlopen", side_effect=urllib.error.URLError("boom")), \
             mock.patch("sys.stderr", err):
            verdict, _ = ge.decide("cubic", "line limit reached", REPO, findings=0, today=TODAY)
        self.assertEqual(verdict, ge.BLOCKING)
        self.assertIn("failing closed", err.getvalue())
        self.assertNotIn("secret-dev-token-xyz", err.getvalue())

    def test_fails_closed_on_http_error(self):
        err = io.StringIO()
        e = urllib.error.HTTPError("u", 401, "Unauthorized", {}, io.BytesIO(b"{}"))
        with mock.patch.dict(os.environ, self.ENV), mock.patch("urllib.request.urlopen", side_effect=e), \
             mock.patch("sys.stderr", err):
            self.assertEqual(ge.load_rows(), [])
        self.assertIn("HTTP 401", err.getvalue())
        self.assertNotIn("secret-dev-token-xyz", err.getvalue())

    def test_fails_closed_without_env(self):
        with mock.patch.dict(os.environ, {}, clear=True), mock.patch("sys.stderr", io.StringIO()):
            os.environ.pop("NOTION_TOKEN", None)
            self.assertEqual(ge.load_rows(), [])

    def test_cli_exit_codes(self):
        pages = {"results": [page("cubic", "line limit reached", "midnghtsapphire/*", 1)], "has_more": False}
        with mock.patch.dict(os.environ, self.ENV), mock.patch("sys.stderr", io.StringIO()), \
             mock.patch("sys.stdout", io.StringIO()), \
             mock.patch("urllib.request.urlopen", lambda r, timeout=0: FakeResp(json.dumps(pages).encode())):
            self.assertEqual(ge.main(["--check", "cubic", "--result", "line limit reached", "--repo", REPO, "--findings", "0"]), 0)
            self.assertEqual(ge.main(["--check", "cubic", "--result", "line limit reached", "--repo", REPO, "--findings", "2"]), 1)


if __name__ == "__main__":
    unittest.main()
