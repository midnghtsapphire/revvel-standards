"""Tests for fetch.py: allow-list, redirects, retries, size cap, evidence, secrets."""

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fetch as F  # noqa: E402
from _fakenet import FakeOpener, FakeResponse, read_bytes, read_json  # noqa: E402

# Low-entropy placeholder: a random-looking value here trips secret scanners.
SECRET = "placeholder-" + "secret" * 3


def _fetch(url, opener, **kw):
    kw.setdefault("allowed_hosts", ["api.example.org"])
    kw.setdefault("sleep", lambda s: None)
    return F.fetch(url, opener=opener, **kw)


class AllowList(unittest.TestCase):
    def test_host_patterns(self):
        self.assertTrue(F.host_allowed("a.example.org", ["*.example.org"]))
        self.assertFalse(F.host_allowed("example.org", ["*.example.org"]))
        self.assertFalse(F.host_allowed("evil-example.org", ["*.example.org"]))
        self.assertFalse(F.host_allowed("example.org.evil.net", ["example.org"]))

    def test_refuses_unlisted_host_without_sending(self):
        op = FakeOpener()
        with self.assertRaises(F.PolicyError):
            _fetch("https://evil.example.net/x", op)
        self.assertEqual(op.requests, [])

    def test_refuses_http_userinfo_and_ports(self):
        op = FakeOpener()
        for url in ("http://api.example.org/x", "https://u" + ":p@api.example.org/x",
                    "https://api.example.org:8443/x", "ftp://api.example.org/x", "file:///etc/passwd"):
            with self.assertRaises(F.PolicyError, msg=url):
                _fetch(url, op)
        self.assertEqual(op.requests, [])

    def test_allow_http_opt_in(self):
        op = FakeOpener().add("GET", "http://api.example.org/", (200, b"ok"))
        self.assertEqual(_fetch("http://api.example.org/x", op, allow_http=True).body, b"ok")


class Redirects(unittest.TestCase):
    def test_redirect_to_unlisted_host_refused(self):
        op = FakeOpener().add("GET", "https://api.example.org/", (302, b"", {"Location": "https://evil.example.net/x"}))
        with self.assertRaises(F.PolicyError) as cm:
            _fetch("https://api.example.org/a", op)
        self.assertIn("redirect", str(cm.exception))
        self.assertEqual(len(op.requests), 1)

    def test_redirect_downgrade_to_http_refused(self):
        op = FakeOpener().add("GET", "https://api.example.org/", (301, b"", {"Location": "http://api.example.org/b"}))
        with self.assertRaises(F.PolicyError):
            _fetch("https://api.example.org/a", op)

    def test_allowed_redirect_followed_and_auth_stripped_cross_host(self):
        op = FakeOpener()
        op.add("GET", "https://api.example.org/", (302, b"", {"Location": "https://cdn.example.org/b"}))
        op.add("GET", "https://cdn.example.org/", (200, b"done"))
        r = _fetch("https://api.example.org/a", op, allowed_hosts=["api.example.org", "cdn.example.org"],
                   headers={"Authorization": "Bearer " + SECRET})
        self.assertEqual(r.body, b"done")
        self.assertEqual(r.final_url, "https://cdn.example.org/b")
        self.assertIn("authorization", op.requests[0]["headers"])
        self.assertNotIn("authorization", op.requests[1]["headers"])

    def test_same_host_only(self):
        op = FakeOpener().add("GET", "http://cam.example.org/", (302, b"", {"Location": "http://other.example.org/x"}))
        with self.assertRaises(F.PolicyError):
            _fetch("http://cam.example.org/a.jpg", op, allowed_hosts=["cam.example.org", "other.example.org"],
                   allow_http=True, same_host_redirects_only=True)

    def test_redirect_loop_capped(self):
        op = FakeOpener().add("GET", "https://api.example.org/", (302, b"", {"Location": "/again"}))
        with self.assertRaises(F.FetchError):
            _fetch("https://api.example.org/a", op)
        self.assertEqual(len(op.requests), F.MAX_REDIRECTS + 1)


class Retries(unittest.TestCase):
    def test_retry_after_honoured(self):
        waits = []
        op = FakeOpener().add("GET", "https://api.example.org/",
                              (429, b"slow down", {"Retry-After": "7"}), (503, b""), (200, b"ok"))
        r = _fetch("https://api.example.org/a", op, sleep=waits.append, backoff=0.5)
        self.assertEqual(r.body, b"ok")
        self.assertEqual(waits, [7.0, 1.0])

    def test_retry_after_over_cap_gives_up(self):
        op = FakeOpener().add("GET", "https://api.example.org/", (429, b"", {"Retry-After": "3600"}))
        with self.assertRaises(F.FetchError) as cm:
            _fetch("https://api.example.org/a", op)
        self.assertEqual(cm.exception.status, 429)

    def test_exhausted_retries_raise(self):
        op = FakeOpener().add("GET", "https://api.example.org/", (500, b"boom"))
        with self.assertRaises(F.FetchError):
            _fetch("https://api.example.org/a", op, retries=2)
        self.assertEqual(len(op.requests), 3)

    def test_network_error_retried(self):
        op = FakeOpener().add("GET", "https://api.example.org/", OSError("reset"), (200, b"ok"))
        self.assertEqual(_fetch("https://api.example.org/a", op).body, b"ok")

    def test_4xx_not_retried(self):
        op = FakeOpener().add("GET", "https://api.example.org/", (404, b"nope"))
        with self.assertRaises(F.FetchError):
            _fetch("https://api.example.org/a", op)
        self.assertEqual(len(op.requests), 1)

    def test_http_date_retry_after(self):
        self.assertEqual(F._retry_after("12"), 12.0)
        self.assertIsNone(F._retry_after("soon"))
        self.assertEqual(F._retry_after("Wed, 21 Oct 2015 07:28:00 GMT"), 0.0)


class SizeAndHeaders(unittest.TestCase):
    def test_size_cap(self):
        op = FakeOpener().add("GET", "https://api.example.org/", (200, b"x" * 2000))
        with self.assertRaises(F.FetchError):
            _fetch("https://api.example.org/a", op, max_bytes=1000)

    def test_size_cap_removes_partial_stream(self):
        op = FakeOpener().add("GET", "https://api.example.org/", (200, b"x" * 200000))
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "out.bin")
            with self.assertRaises(F.FetchError):
                _fetch("https://api.example.org/a", op, max_bytes=100000, stream_to=path)
            self.assertFalse(os.path.exists(path))

    def test_user_agent_names_project(self):
        op = FakeOpener().add("GET", "https://api.example.org/", (200, b"{}"))
        _fetch("https://api.example.org/a", op)
        self.assertIn("revvel-standards", op.requests[0]["headers"]["user-agent"])

    def test_params_and_json_body(self):
        op = FakeOpener().add("POST", "https://api.example.org/", (200, {"ok": True}))
        r = _fetch("https://api.example.org/s", op, method="POST", params={"a": "1 2"}, json_body={"x": 1})
        self.assertEqual(r.json(), {"ok": True})
        self.assertEqual(op.requests[0]["url"], "https://api.example.org/s?a=1+2")
        self.assertEqual(json.loads(op.requests[0]["body"]), {"x": 1})


class SecretsAndEvidence(unittest.TestCase):
    def test_redact_url(self):
        u = F.redact_url(f"https://h.example.org/p?token={SECRET}&sig=abc&q=river", [SECRET])
        self.assertNotIn(SECRET, u)
        self.assertNotIn("abc", u)
        self.assertIn("q=river", u)
        self.assertNotIn(SECRET, F.redact_url(f"https://h.example.org/{SECRET}/x", [SECRET]))

    def test_evidence_and_logs_never_contain_secret(self):
        logs = []
        op = FakeOpener()
        op.add("GET", "https://api.example.org/a", (302, b"", {"Location": f"/b?access_token={SECRET}"}))
        op.add("GET", "https://api.example.org/b", (200, b'{"data": [1, 2, 3]}', {"Content-Type": "application/json"}))
        with tempfile.TemporaryDirectory() as d:
            r = _fetch(f"https://api.example.org/a?api_key={SECRET}", op, evidence_dir=d, log=logs.append,
                       headers={"Authorization": "Bearer " + SECRET}, secrets=[SECRET])
            files = sorted(os.listdir(d))
            self.assertEqual(len(files), 2)
            blob = b"".join(read_bytes(os.path.join(d, f)) for f in files)
            side = read_json(r.evidence)
        self.assertNotIn(SECRET.encode(), blob)
        self.assertTrue(logs)
        for line in logs:
            self.assertNotIn(SECRET, line)
        self.assertEqual(side["status"], 200)
        self.assertEqual(len(side["sha256"]), 64)
        self.assertTrue(side["fetched_at_utc"].endswith("Z"))
        self.assertIn("REDACTED", side["url"])
        self.assertEqual(side["sha256"], r.sha256)

    def test_body_containing_secret_is_withheld(self):
        op = FakeOpener().add("GET", "https://api.example.org/", (200, ('{"echo": "%s"}' % SECRET).encode()))
        with tempfile.TemporaryDirectory() as d:
            r = _fetch("https://api.example.org/a", op, evidence_dir=d, secrets=[SECRET])
            files = os.listdir(d)
            self.assertEqual(files, [os.path.basename(r.evidence)])
            side = read_json(r.evidence)
        self.assertIn("body_withheld", side)

    def test_error_message_redacted(self):
        op = FakeOpener().add("GET", "https://api.example.org/", (403, f"bad token {SECRET}".encode()))
        with self.assertRaises(F.FetchError) as cm:
            _fetch("https://api.example.org/a", op, headers={"Authorization": "Bearer " + SECRET})
        self.assertNotIn(SECRET, str(cm.exception))

    def test_secret_from_env_or_file(self):
        with tempfile.NamedTemporaryFile("w", delete=False) as f:
            f.write(SECRET + "\n")
        try:
            self.assertEqual(F.secret_from_env_or_file("NO_SUCH_VAR_XYZ", f.name), SECRET)
        finally:
            os.remove(f.name)
        os.environ["OPENDATA_TEST_SECRET"] = SECRET
        try:
            self.assertEqual(F.secret_from_env_or_file("OPENDATA_TEST_SECRET"), SECRET)
        finally:
            del os.environ["OPENDATA_TEST_SECRET"]
        self.assertIsNone(F.secret_from_env_or_file("NO_SUCH_VAR_XYZ"))
        with self.assertRaises(ValueError):
            F.secret_from_env_or_file("X", "/nonexistent/secret")


class Parsers(unittest.TestCase):
    def test_bbox(self):
        self.assertEqual(F.parse_bbox("-83.1,39.9,-82.9,40.05"), [-83.1, 39.9, -82.9, 40.05])
        for bad in ("1,2,3", "a,b,c,d", "10,0,5,1", "0,95,1,96"):
            with self.assertRaises(ValueError):
                F.parse_bbox(bad)

    def test_interval(self):
        self.assertEqual(F.parse_interval("2024-06-01/2024-06-30"), ("2024-06-01T00:00:00Z", "2024-06-30T23:59:59Z"))
        self.assertEqual(F.parse_interval("../2024-06-30")[0], None)
        with self.assertRaises(ValueError):
            F.parse_interval("2024-07-01/2024-06-01")


class NegativeValues(unittest.TestCase):
    def test_join_negative_values(self):
        self.assertEqual(F.join_negative_values(["--bbox", "-83.1,39.9,-82.9,40", "--lat", "-1.5", "-v", "--x", "y"]),
                         ["--bbox=-83.1,39.9,-82.9,40", "--lat=-1.5", "-v", "--x", "y"])


class OpenerContract(unittest.TestCase):
    def test_fake_response_shape(self):
        r = FakeResponse(200, {"a": 1})
        self.assertEqual(F._status(r), 200)
        self.assertEqual(F._norm_headers(r.headers)["content-type"], "application/json")


if __name__ == "__main__":
    unittest.main()
