"""Tests for fetch.py: allow-list, redirects, retries, size cap, evidence, secrets."""

import datetime as dt
import hashlib
import http.server
import ipaddress
import json
import os
import shutil
import ssl
import sys
import tempfile
import threading
import unittest
import urllib.parse
import urllib.request
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fetch as F  # noqa: E402
from _fakenet import FakeOpener, FakeResponse, read_bytes, read_json  # noqa: E402

# Low-entropy placeholder: a random-looking value here trips secret scanners.
SECRET = "placeholder-" + "secret" * 3
OPERATOR = "Det. A. Example"
SERVER_DATE = "Fri, 16 Oct 2026 12:00:00 GMT"
# A fake certificate fingerprint for the fake opener: the hash of a fixed phrase, not a secret.
FAKE_TLS_FP = hashlib.sha256(b"fake peer certificate").hexdigest()


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

    def test_presigned_url_signatures_redacted(self):
        # Review 2026-10-16: S3 / GCS presigned query parameters were left in logged and saved URLs.
        sig = "placeholder-" + "s" * 8
        u = F.redact_url("https://b.s3.us-west-2.amazonaws.com/G.h5?X-Amz-Algorithm=AWS4-HMAC-SHA256"
                         f"&X-Amz-Credential={sig}c&X-Amz-Security-Token={sig}t&X-Amz-Signature={sig}"
                         f"&X-Goog-Signature={sig}g")
        self.assertNotIn(sig, u)
        self.assertIn("X-Amz-Algorithm=AWS4-HMAC-SHA256", u)

    def test_legacy_withholds_url_quoted_secret(self):
        # Review 2026-10-16: the legacy guard matched only the literal secret, not its URL-quoted form.
        secret = "placeholder-" + "x" * 8 + "/+="
        quoted = urllib.parse.quote(secret, safe="")
        self.assertNotEqual(quoted, secret)
        op = FakeOpener().add("GET", "https://api.example.org/", (200, ('{"next": "?t=%s"}' % quoted).encode()))
        with tempfile.TemporaryDirectory() as d:
            r = _fetch("https://api.example.org/a", op, evidence_dir=d, secrets=[secret])
            self.assertEqual(os.listdir(d), [os.path.basename(r.evidence)])
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


def _evidence_core():
    return F.evidence_core()


def _fresh_response(status=200, body=b'{"ok": true}', headers=None, tls=FAKE_TLS_FP):
    """Route factory: a new FakeResponse per call, carrying a Date header and a TLS fingerprint."""
    def make(url, body_in, hdrs):
        h = {"Content-Type": "application/json", "Date": SERVER_DATE}
        h.update(headers or {})
        r = FakeResponse(status, body, h)
        r.peer_cert_sha256 = tls
        return r
    return make


class SharedEvidenceLog(unittest.TestCase):
    """fetch(evidence_log=...): the shared revvel-evidence/1 log (SYSTEM_REVIEW C5/M1)."""

    def setUp(self):
        self.core = _evidence_core()
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.logdir = os.path.join(self.tmp, "case")
        self.key_path = os.path.join(self.tmp, "op.key")
        self.pub_path = os.path.join(self.tmp, "op.pub")
        self.core.generate_keypair(self.key_path, self.pub_path)  # throwaway test key in a temp dir
        env = mock.patch.dict(os.environ, {}, clear=False)
        env.start()
        self.addCleanup(env.stop)
        os.environ.pop(self.core.ENV_OPERATOR, None)
        os.environ.pop(F.ENV_EVIDENCE_PASSPHRASE, None)

    def log(self, signed=True):
        return F.open_evidence_log(self.logdir, operator=OPERATOR, key_path=self.key_path if signed else None)

    def entries(self):
        with open(os.path.join(self.logdir, self.core.LOG_NAME), "rb") as f:
            return [json.loads(line) for line in f.read().splitlines()]

    def verify(self, **kw):
        kw.setdefault("public_key", self.core.load_public_key(self.pub_path))
        return self.core.verify_log(self.logdir, **kw)

    def test_same_second_captures_do_not_collide(self):
        op = FakeOpener().add("GET", "https://api.example.org/", _fresh_response())
        log = self.log()
        with mock.patch.object(F, "utc_now", lambda: "2026-10-16T12:00:00Z"):
            r1 = _fetch("https://api.example.org/a", op, evidence_log=log)
            r2 = _fetch("https://api.example.org/a", op, evidence_log=log)
        self.assertNotEqual(r1.evidence_entry["file"], r2.evidence_entry["file"])
        self.assertEqual(r1.evidence_entry["sha256"], r2.evidence_entry["sha256"])
        self.assertEqual([e["seq"] for e in self.entries()], [0, 1])
        self.assertEqual(len(os.listdir(os.path.join(self.logdir, "objects"))), 2)
        self.assertTrue(self.verify()["ok"])

    def test_entry_records_full_metadata(self):
        op = FakeOpener()
        op.add("POST", "https://api.example.org/a", (307, b"", {"Location": "/b"}))  # 307 keeps POST
        op.add("POST", "https://api.example.org/b", _fresh_response(headers={"Set-Cookie": "session=1"}))
        r = _fetch("https://api.example.org/a?api_key=" + SECRET, op, method="POST", json_body={"q": 1},
                   evidence_log=self.log(), secrets=[SECRET])
        e = r.evidence_entry
        self.assertEqual(e["operator"], OPERATOR)
        self.assertEqual(e["status"], 200)
        self.assertEqual(e["server_date"], SERVER_DATE)
        self.assertEqual(e["tls_cert_sha256"], FAKE_TLS_FP)
        self.assertEqual(r.tls_cert_sha256, FAKE_TLS_FP)
        self.assertEqual(e["source"], "https://api.example.org/b")
        self.assertEqual(e["tool"]["name"], "opendata-fetch")
        self.assertIn("ntp_synchronized", e["clock"])
        self.assertIsNotNone(e["signature"])
        x = e["extra"]
        self.assertIn("REDACTED", x["url"])
        self.assertEqual(x["redirects"], [x["url"]])
        self.assertEqual(x["response_headers"]["set-cookie"], "REDACTED")
        self.assertEqual(x["request_body_sha256"], hashlib.sha256(b'{"q": 1}').hexdigest())
        self.assertEqual(x["sha256_as_received"], e["sha256"])
        self.assertTrue(self.verify()["ok"])
        self.assertNotIn(SECRET, json.dumps(self.entries()))

    def test_metadata_edits_detected_by_verify(self):
        op = FakeOpener().add("GET", "https://api.example.org/", _fresh_response())
        _fetch("https://api.example.org/a", op, evidence_log=self.log())
        path = os.path.join(self.logdir, self.core.LOG_NAME)
        original = self.entries()[0]
        for field, value in (("server_date", "Sat, 17 Oct 2026 09:00:00 GMT"), ("tls_cert_sha256", "0" * 64),
                             ("operator", "Someone Else"), ("status", 404), ("source", "https://elsewhere/")):
            edited = dict(original, **{field: value})
            with open(path, "wb") as f:
                f.write(self.core.canonical(edited) + b"\n")
            rep = self.verify(public_key=None)
            self.assertFalse(rep["ok"], field)
            self.assertTrue(any("entry edited" in p for p in rep["problems"]), (field, rep["problems"]))
        with open(path, "wb") as f:
            f.write(self.core.canonical(original) + b"\n")
        self.assertTrue(self.verify()["ok"])

    def test_signing_with_test_key_and_wrong_key_fails(self):
        op = FakeOpener().add("GET", "https://api.example.org/", _fresh_response())
        _fetch("https://api.example.org/a", op, evidence_log=self.log())
        e = self.entries()[0]
        self.assertEqual(e["key_id"], self.core.key_id(self.core.load_public_key(self.pub_path)))
        other_pub = os.path.join(self.tmp, "other.pub")
        self.core.generate_keypair(os.path.join(self.tmp, "other.key"), other_pub)
        rep = self.verify(public_key=self.core.load_public_key(other_pub))
        self.assertFalse(rep["ok"])
        self.assertTrue(any("signature does not verify" in p for p in rep["problems"]))
        with self.assertRaises(ValueError):  # a signed log cannot be extended unsigned
            self.log(signed=False)

    def test_secret_in_body_is_stored_redacted(self):
        echo = ('{"echo": "%s"}' % SECRET).encode()
        op = FakeOpener().add("GET", "https://api.example.org/", _fresh_response(body=echo))
        r = _fetch("https://api.example.org/a", op, evidence_log=self.log(), secrets=[SECRET])
        e = r.evidence_entry
        self.assertEqual(e["extra"]["secret_redactions"], 1)
        self.assertNotEqual(e["sha256"], e["extra"]["sha256_as_received"])
        for root, _, files in os.walk(self.logdir):
            for name in files:
                self.assertNotIn(SECRET.encode(), read_bytes(os.path.join(root, name)))
        self.assertTrue(self.verify()["ok"])

    def test_rejected_status_is_recorded_then_raised(self):
        op = FakeOpener().add("GET", "https://api.example.org/", _fresh_response(status=404, body=b"nope"))
        with self.assertRaises(F.FetchError):
            _fetch("https://api.example.org/a", op, evidence_log=self.log())
        self.assertEqual(self.entries()[0]["status"], 404)

    def test_streamed_body_is_captured_from_disk(self):
        op = FakeOpener().add("GET", "https://api.example.org/", _fresh_response(body=b"GEOTIFF" * 100))
        target = os.path.join(self.tmp, "dem.tif")
        r = _fetch("https://api.example.org/a", op, evidence_log=self.log(), stream_to=target)
        self.assertIsNone(r.body)
        self.assertEqual(r.evidence_entry["sha256"], hashlib.sha256(b"GEOTIFF" * 100).hexdigest())
        self.assertTrue(self.verify()["ok"])

    def test_streamed_body_containing_secret_is_not_stored(self):
        # Review 2026-10-16: a streamed body was copied into the log without the secret check.
        body = b"GEOTIFF" * 50 + ("token=" + urllib.parse.quote(SECRET, safe="")).encode() + b"GEOTIFF" * 50
        op = FakeOpener().add("GET", "https://api.example.org/", _fresh_response(body=body))
        target = os.path.join(self.tmp, "dem.tif")
        r = _fetch("https://api.example.org/a", op, evidence_log=self.log(), stream_to=target, secrets=[SECRET])
        e = r.evidence_entry
        self.assertIn("body_withheld", e["extra"])
        self.assertEqual(e["extra"]["sha256_as_received"], hashlib.sha256(body).hexdigest())
        self.assertEqual(e["size"], 0)
        for root, _, files in os.walk(self.logdir):
            for name in files:
                self.assertNotIn(SECRET.encode(), read_bytes(os.path.join(root, name)))
        self.assertTrue(self.verify()["ok"])

    def test_secret_across_chunk_boundary_is_found(self):
        path = os.path.join(self.tmp, "blob.bin")
        with open(path, "wb") as f:
            f.write(b"a" * 10 + SECRET.encode() + b"b" * 10)
        for size in range(1, len(SECRET) + 12):
            self.assertTrue(F._file_contains_secret(path, [SECRET], chunk_size=size), size)
        self.assertFalse(F._file_contains_secret(path, ["placeholder-" + "z" * 8], chunk_size=4))

    def test_log_with_altered_object_or_bad_signature_is_not_extended(self):
        # Review 2026-10-16: open_evidence_log checked only the chain, not stored files or signatures.
        op = FakeOpener().add("GET", "https://api.example.org/", _fresh_response())
        _fetch("https://api.example.org/a", op, evidence_log=self.log())
        self.log()  # an intact log opens
        obj = os.path.join(self.logdir, self.entries()[0]["file"])
        original = read_bytes(obj)
        os.chmod(obj, 0o644)
        with open(obj, "wb") as f:
            f.write(b'{"ok": false}')
        with self.assertRaises(ValueError) as cm:
            self.log()
        self.assertIn("does not verify", str(cm.exception))
        with open(obj, "wb") as f:
            f.write(original)
        self.log()
        path = os.path.join(self.logdir, self.core.LOG_NAME)
        entry = self.entries()[0]
        other = self.core.sign_hash(self.core.load_private_key(self.key_path), "0" * 64)
        with open(path, "wb") as f:
            f.write(self.core.canonical(dict(entry, signature=other)) + b"\n")
        with self.assertRaises(ValueError) as cm:
            self.log()
        self.assertIn("signature", str(cm.exception))

    def test_operator_required_and_checked_before_network(self):
        with self.assertRaises(ValueError) as cm:
            F.open_evidence_log(self.logdir)
        self.assertIn("operator", str(cm.exception))
        os.environ[self.core.ENV_OPERATOR] = OPERATOR
        self.assertEqual(F.open_evidence_log(self.logdir).operator, OPERATOR)

    def test_cli_flags(self):
        import census  # a connector that uses add_common_args / common_kwargs / cli_main
        op = FakeOpener()
        base = ["--address", "1 Main St, Columbus OH", "--retries", "0", "--evidence-log", self.logdir]
        with mock.patch("sys.stderr"), mock.patch("sys.stdout"):
            self.assertEqual(census.main(base, opener=op), 2)  # no operator
            self.assertEqual(census.main(["--address", "x", "--evidence-key", self.key_path], opener=op), 2)
        self.assertEqual(op.requests, [])


def _self_signed_localhost(tmp):
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.x509.oid import NameOID
    key = ec.generate_private_key(ec.SECP256R1())
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "localhost")])
    now = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now)
            .not_valid_after(now + dt.timedelta(days=2))
            .add_extension(x509.SubjectAlternativeName([x509.IPAddress(ipaddress.ip_address("127.0.0.1"))]),
                           critical=False)
            .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
            .sign(key, hashes.SHA256()))
    cert_path, key_path = os.path.join(tmp, "srv.pem"), os.path.join(tmp, "srv.key")
    with open(cert_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    with open(key_path, "wb") as f:
        f.write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                  serialization.NoEncryption()))
    return cert_path, key_path, hashlib.sha256(cert.public_bytes(serialization.Encoding.DER)).hexdigest()


class _Hello(http.server.BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        code = 404 if self.path.startswith("/missing") else 200
        body = b"hello"
        self.send_response(code)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


class DefaultOpenerTLS(unittest.TestCase):
    def test_default_opener_records_peer_certificate(self):
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, True)
        cert, key, fp = _self_signed_localhost(tmp)
        server = http.server.HTTPServer(("127.0.0.1", 0), _Hello)
        sctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        sctx.load_cert_chain(cert, key)
        server.socket = sctx.wrap_socket(server.socket, server_side=True)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            opener = F.default_opener(context=ssl.create_default_context(cafile=cert), proxies={})
            base = f"https://127.0.0.1:{server.server_port}"
            ok = opener(urllib.request.Request(base + "/page"), 5)
            self.assertEqual(F._status(ok), 200)
            self.assertEqual(F.peer_cert_of(ok), fp)
            self.assertIsNotNone(F._norm_headers(ok.headers).get("date"))
            ok.read()
            missing = opener(urllib.request.Request(base + "/missing"), 5)  # HTTPError returned, not raised
            self.assertEqual(F._status(missing), 404)
            self.assertEqual(F.peer_cert_of(missing), fp)
        finally:
            server.shutdown()
            server.server_close()


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
