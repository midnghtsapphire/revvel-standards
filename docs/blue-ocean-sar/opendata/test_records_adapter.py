"""Tests for records_adapter.py. A fake opener stands in for the network; nothing leaves the machine.

Run from this folder:  python3 -m unittest test_records_adapter -v
"""

import contextlib
import copy
import datetime as dt
import email.message
import io
import json
import os
import shutil
import tempfile
import unittest
import urllib.error
from unittest import mock

import authority as A
import fetch as F
import records_adapter as R

HERE = os.path.dirname(os.path.abspath(__file__))
EXAMPLE = os.path.join(HERE, "providers.example.json")
SECRET = "placeholder-" + "vendorkey" * 3
ENV = {"EXAMPLE_VENDOR_API_KEY": SECRET}
CASE = "MP-2026-014"
PURPOSE = "GLBA:6802(e)(8)"
NOW = dt.datetime.now(dt.timezone.utc)
ACTOR = "Analyst B. Example"
# authority.Gate now refuses hash mode without a salt (SYSTEM_REVIEW H2); built at run time from plain words.
HASH_SALT = "-".join(("unit", "test", "only", "subject", "salt"))
# A LICENSED authority must now list its subjects (SYSTEM_REVIEW H2); these are the ones the tests query.
LICENSED_SUBJECTS = ["Jane Example", "J Example", "../../admin?x=1"]


class FakeResponse:
    def __init__(self, status=200, body=b"", headers=None):
        self.status = status
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode("utf-8")
        self._buf = io.BytesIO(body)
        m = email.message.Message()
        for k, v in (headers or {"Content-Type": "application/json"}).items():
            m[k] = v
        self.headers = m

    def read(self, n=-1):
        return self._buf.read(n)


class FakeOpener:
    """Records each request and returns (or raises) the next canned response."""

    def __init__(self, *responses):
        self.responses = list(responses) or [FakeResponse(200, {"results": []})]
        self.requests = []

    def __call__(self, req, timeout):
        self.requests.append({"url": req.full_url, "method": req.get_method(), "timeout": timeout,
                              "headers": {k.lower(): v for k, v in req.header_items()}, "body": req.data})
        r = self.responses.pop(0) if len(self.responses) > 1 else self.responses[0]
        if isinstance(r, Exception):
            raise r
        return r


def example_cfg():
    with open(EXAMPLE, encoding="utf-8") as f:
        return json.load(f)


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.ledger_path = os.path.join(self.tmp, "ledger.jsonl")
        self.audit_path = os.path.join(self.tmp, "audit.jsonl")
        self.evidence = os.path.join(self.tmp, "evidence")
        self.provider_path = os.path.join(self.tmp, "providers.json")
        self.write_provider(example_cfg())
        env = mock.patch.dict(os.environ, {A.ENV_SALT: HASH_SALT, A.ENV_ACTOR: ACTOR})
        env.start()
        self.addCleanup(env.stop)
        os.environ.pop(A.ENV_REQUIRE_COUNTERSIGN, None)
        # Gate(...) used to start with no salt and no actor; it now refuses (SYSTEM_REVIEW H2), so env supplies both.
        self.gate = A.Gate(self.ledger_path, self.audit_path)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def write_provider(self, cfg):
        with open(self.provider_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f)

    def adapter(self, opener, **kw):
        return R.RecordsAdapter(R.load_provider(self.provider_path), self.gate, self.evidence, opener=opener,
                                environ=ENV, sleep=lambda s: None, **kw)

    def add_licensed(self, case=CASE, purposes=(PURPOSE,), **kw):
        kw.setdefault("subjects", LICENSED_SUBJECTS)
        kw.setdefault("expires", str((NOW + dt.timedelta(days=30)).date()))
        kw.setdefault("recorded_by", ACTOR)
        return self.gate.ledger.add(A.build_authority(A.LICENSED, case, purposes=purposes, **kw))

    def add_warrant(self, subjects=("+1 555 0100",)):
        issued = str((NOW - dt.timedelta(days=1)).date())
        expires = str((NOW + dt.timedelta(days=30)).date())
        return self.gate.ledger.add(A.build_authority(
            A.LEGAL_PROCESS, CASE, process_type="warrant", reference="SW-1", issuer="Example Court",
            issued=issued, expires=expires, scope="subscriber records", subjects=list(subjects),
            requesting_officer="Det. A", agency="Example SO", document_sha256="cd" * 32, recorded_by=ACTOR))

    def all_written_text(self):
        """Everything the adapter and gate wrote to disk, as one string."""
        chunks = []
        for root, _, files in os.walk(self.tmp):
            for name in files:
                if name == "providers.json":
                    continue
                with open(os.path.join(root, name), "rb") as f:
                    chunks.append(f.read().decode("utf-8", "replace"))
        return "\n".join(chunks)

    def audit(self):
        return A.ChainLog(self.audit_path).entries()


class TestProviderFile(Base):
    def test_example_file_loads(self):
        p = R.load_provider(EXAMPLE)
        self.assertEqual(p["provider"], "example-vendor")
        self.assertEqual(p["endpoints"]["people_search"]["source_class"], A.LICENSED)
        self.assertEqual(p["endpoints"]["subscriber_records"]["source_class"], A.LEGAL_PROCESS)
        self.assertIn("OWNER NOTE", p["owner_note"])

    def test_refuses_non_https_base_url(self):
        for url in ("http://api.example.com", "ftp://api.example.com", "api.example.com",
                    "https://user" + ":pw@api.example.com", "https://api.example.com/?k=1", "https://"):
            cfg = example_cfg()
            cfg["base_url"] = url
            self.write_provider(cfg)
            with self.subTest(url=url), self.assertRaises(ValueError):
                R.load_provider(self.provider_path)

    def test_refuses_bad_config(self):
        bad = [
            lambda c: c["auth"].update(style="query"),
            lambda c: c["auth"].update(header_name=None),
            lambda c: c["auth"].update(key_env=None, key_file=None),
            lambda c: c["endpoints"]["people_search"].update(source_class="SECRET"),
            lambda c: c["endpoints"]["people_search"].update(permissible_purposes=[]),
            lambda c: c["endpoints"]["people_search"].update(path="https://evil.example/x"),
            lambda c: c["endpoints"]["people_search"].update(path="/v1/../admin"),
            lambda c: c["endpoints"]["address_history"].update(allowed_params=["since"]),
            lambda c: c["endpoints"]["people_search"].update(subject_params=["ssn"]),
            lambda c: c["endpoints"]["people_search"].update(method="DELETE"),
            lambda c: c.update(rate_limit={"calls": 0, "per_seconds": 60}),
            lambda c: c.update(endpoints={}),
        ]
        for i, mutate in enumerate(bad):
            cfg = example_cfg()
            mutate(cfg)
            self.write_provider(cfg)
            with self.subTest(i=i), self.assertRaises(ValueError):
                R.load_provider(self.provider_path)

    def test_key_from_env_or_file_only(self):
        p = R.load_provider(EXAMPLE)
        self.assertEqual(R.read_key(p, environ=ENV), SECRET)
        kf = os.path.join(self.tmp, "key")
        with open(kf, "w") as f:
            f.write(SECRET + "\n")
        os.chmod(kf, 0o600)
        self.assertEqual(R.read_key(p, key_file=kf, environ={}), SECRET)
        with self.assertRaises(ValueError):
            R.read_key(p, environ={})
        with self.assertRaises(SystemExit):  # there is no argv option for the key itself
            with contextlib.redirect_stderr(io.StringIO()):
                R.build_parser().parse_args(["call", "--provider-file", "p", "--endpoint", "e", "--case", "c",
                                             "--purpose", "p", "--api-key", SECRET])


class TestGatedCalls(Base):
    def test_licensed_call_allowed_with_authority(self):
        auth = self.add_licensed()
        op = FakeOpener(FakeResponse(200, {"results": [{"person_id": "P1", "name": "Jane Example"}]}))
        res = self.adapter(op).call("people_search", CASE, PURPOSE,
                                    {"first_name": "Jane", "last_name": "Example", "state": "OH"})
        self.assertTrue(res["ok"])
        self.assertEqual(res["data"]["results"][0]["person_id"], "P1")
        self.assertEqual(res["authority"]["authority_id"], auth["id"])
        req = op.requests[0]
        self.assertEqual(req["method"], "GET")
        self.assertEqual(req["url"],
                         "https://api.example.com/v1/people/search?first_name=Jane&last_name=Example&state=OH")
        self.assertEqual(req["headers"]["x-api-key"], SECRET)
        self.assertEqual(req["timeout"], 30.0)

        events = [e["event"] for e in self.audit()]
        self.assertEqual(events, ["allow", "result"])
        result = self.audit()[-1]
        self.assertEqual(result["evidence_manifest_sha256"], res["evidence"]["manifest_sha256"])
        self.assertTrue(A.ChainLog(self.audit_path).verify()["ok"])

        d = res["evidence"]["dir"]
        self.assertEqual(sorted(os.listdir(d)), ["manifest.json", "request.json", "response.body",
                                                 "response.meta.json"])
        with open(os.path.join(d, "manifest.json"), "rb") as f:
            man = f.read()
        self.assertEqual(A.sha256_bytes(man), res["evidence"]["manifest_sha256"])
        for name, digest in json.loads(man)["files"].items():
            self.assertEqual(A.sha256_file(os.path.join(d, name)), digest)
            self.assertEqual(os.stat(os.path.join(d, name)).st_mode & 0o077, 0)
        with open(os.path.join(d, "request.json"), encoding="utf-8") as f:
            reqrec = json.load(f)
        self.assertEqual(reqrec["headers"]["X-Api-Key"], R.REDACTED)
        self.assertEqual(reqrec["params"]["last_name"], "Example")

    def test_secret_never_written_or_printed(self):
        self.add_licensed()
        echo = FakeResponse(200, {"echo_key": SECRET, "results": []},
                            {"Content-Type": "application/json", "X-Debug-Key": SECRET, "Set-Cookie": "s=1"})
        res = self.adapter(FakeOpener(echo)).call("people_search", CASE, PURPOSE,
                                                  {"first_name": "Jane", "last_name": "Example"})
        self.assertNotIn(SECRET, json.dumps(res))
        self.assertEqual(res["data"]["echo_key"], R.REDACTED)
        self.assertNotIn(SECRET, self.all_written_text())
        with open(os.path.join(res["evidence"]["dir"], "response.meta.json"), encoding="utf-8") as f:
            meta = json.load(f)
        self.assertEqual(meta["secret_redactions"], 1)
        self.assertNotEqual(meta["sha256_as_received"], meta["sha256_saved"])
        self.assertEqual(meta["headers"]["Set-Cookie"], R.REDACTED)

    def test_network_error_message_redacted(self):
        self.add_licensed()
        op = FakeOpener(urllib.error.URLError(f"proxy said no to key {SECRET}"))
        res = self.adapter(op).call("people_search", CASE, PURPOSE, {"last_name": "Example", "first_name": "J"})
        self.assertFalse(res["ok"])
        self.assertIn(R.REDACTED, res["error"])
        self.assertNotIn(SECRET, json.dumps(res) + self.all_written_text())

    def test_licensed_refused_without_authority_or_wrong_purpose(self):
        op = FakeOpener()
        ad = self.adapter(op)
        params = {"first_name": "Jane", "last_name": "Example"}
        with self.assertRaises(A.AuthorityError):
            ad.call("people_search", CASE, PURPOSE, params)
        self.add_licensed(purposes=[PURPOSE, "marketing"])
        with self.assertRaises(A.AuthorityError):  # recorded, but not on the endpoint's list
            ad.call("people_search", CASE, "marketing", params)
        with self.assertRaises(A.AuthorityError):
            ad.call("people_search", "MP-OTHER", PURPOSE, params)
        self.assertEqual(op.requests, [])
        self.assertEqual({e["event"] for e in self.audit()}, {"refuse"})
        self.assertFalse(os.path.exists(self.evidence))

    def test_declared_subject_must_match_query(self):
        self.add_licensed(subjects=["Jane Example"])
        op = FakeOpener()
        ad = self.adapter(op)
        with self.assertRaises(A.AuthorityError):
            ad.call("people_search", CASE, PURPOSE, {"first_name": "John", "last_name": "Other"},
                    subject="Jane Example")
        with self.assertRaises(A.AuthorityError):  # query for someone outside the authority's subject list
            ad.call("people_search", CASE, PURPOSE, {"first_name": "John", "last_name": "Other"})
        self.assertEqual(op.requests, [])
        self.assertTrue(ad.call("people_search", CASE, PURPOSE, {"first_name": "jane", "last_name": "EXAMPLE"},
                                subject="Jane Example")["ok"])

    def test_parameters_not_allowed_are_refused_before_anything_else(self):
        self.add_licensed()
        op = FakeOpener()
        ad = self.adapter(op)
        with self.assertRaises(ValueError) as cm:
            ad.call("people_search", CASE, PURPOSE, {"last_name": "Example", "ssn": "000-00-0000"})
        self.assertIn("ssn", str(cm.exception))
        with self.assertRaises(ValueError):
            ad.call("people_search", CASE, PURPOSE, {"first_name": "Jane"})  # last_name required
        with self.assertRaises(ValueError):
            ad.call("no_such_endpoint", CASE, PURPOSE, {})
        self.assertEqual(op.requests, [])
        self.assertEqual(self.audit(), [])

    def test_path_parameters_are_quoted(self):
        self.add_licensed()
        op = FakeOpener()
        self.adapter(op).call("address_history", CASE, PURPOSE, {"person_id": "../../admin?x=1"})
        url = op.requests[0]["url"]
        self.assertTrue(url.startswith("https://api.example.com/v1/people/..%2F..%2Fadmin%3Fx%3D1/addresses"), url)

    def test_legal_process_endpoint(self):
        op = FakeOpener()
        ad = self.adapter(op)
        params = {"phone": "+1 555 0100", "legal_process_reference": "SW-1"}
        lp_purpose = "law-enforcement-legal-process"
        with self.assertRaises(A.AuthorityError):
            ad.call("subscriber_records", CASE, lp_purpose, params)
        self.add_licensed(subjects=["+1 555 0100"])  # a LICENSED authority is not legal process
        with self.assertRaises(A.AuthorityError):
            ad.call("subscriber_records", CASE, lp_purpose, params)
        w = self.add_warrant()
        with self.assertRaises(A.AuthorityError):
            ad.call("subscriber_records", CASE, lp_purpose, dict(params, phone="+1 555 0199"))
        self.assertEqual(op.requests, [])
        res = ad.call("subscriber_records", CASE, lp_purpose, params)
        self.assertTrue(res["ok"])
        self.assertEqual(res["authority"]["reference"], "SW-1")
        self.assertEqual(op.requests[0]["method"], "POST")
        self.assertEqual(json.loads(op.requests[0]["body"]), params)
        self.gate.ledger.revoke(w["id"], "returned to court", ACTOR)
        with self.assertRaises(A.AuthorityError):
            ad.call("subscriber_records", CASE, lp_purpose, params)

    def test_public_endpoint_needs_no_authority(self):
        op = FakeOpener()
        res = self.adapter(op).call("public_court_index", "", "", {"name": "Jane Example"})
        self.assertTrue(res["ok"])
        self.assertEqual(self.audit()[0]["source_class"], A.PUBLIC)

    def test_http_error_saved_as_evidence(self):
        self.add_licensed()
        op = FakeOpener(urllib.error.HTTPError("https://api.example.com/v1/people/search", 503, "busy",
                                               email.message.Message(), io.BytesIO(b'{"error":"busy"}')))
        res = self.adapter(op).call("people_search", CASE, PURPOSE, {"last_name": "Example", "first_name": "J"})
        self.assertFalse(res["ok"])
        self.assertEqual(res["status"], 503)
        self.assertEqual(res["data"], {"error": "busy"})
        self.assertTrue(os.path.isdir(res["evidence"]["dir"]))
        self.assertEqual(self.audit()[-1]["status"], 503)

    def test_oversized_response(self):
        cfg = example_cfg()
        cfg["max_response_bytes"] = 10
        self.write_provider(cfg)
        self.add_licensed()
        res = self.adapter(FakeOpener(FakeResponse(200, b"x" * 50))).call(
            "people_search", CASE, PURPOSE, {"last_name": "Example", "first_name": "J"})
        self.assertFalse(res["ok"])
        self.assertIn("max_response_bytes", res["error"])


class TestSharedEvidenceLog(Base):
    """--evidence-log: request and response in the shared revvel-evidence/1 log (SYSTEM_REVIEW C5/M1)."""

    OPERATOR = "Analyst B. Example"
    DATE = "Fri, 16 Oct 2026 12:00:00 GMT"
    TLS = A.sha256_bytes(b"fake peer certificate")  # hash of a fixed phrase, not a secret

    def setUp(self):
        super().setUp()
        self.core = F.evidence_core()
        os.environ.pop(self.core.ENV_OPERATOR, None)
        self.log_dir = os.path.join(self.tmp, "case-log")
        self.key = os.path.join(self.tmp, "op.key")
        self.pub = os.path.join(self.tmp, "op.pub")
        self.core.generate_keypair(self.key, self.pub)  # throwaway test key in a temp dir

    def response(self, status=200, body=None):
        r = FakeResponse(status, body if body is not None else {"results": [{"person_id": "P1"}]},
                         {"Content-Type": "application/json", "Date": self.DATE})
        r.peer_cert_sha256 = self.TLS
        return r

    def shared(self):
        return F.open_evidence_log(self.log_dir, operator=self.OPERATOR, key_path=self.key)

    def entries(self):
        with open(os.path.join(self.log_dir, self.core.LOG_NAME), "rb") as f:
            return [json.loads(line) for line in f.read().splitlines()]

    def verify(self):
        return self.core.verify_log(self.log_dir, public_key=self.core.load_public_key(self.pub))

    def test_request_and_response_logged_with_full_metadata(self):
        self.add_licensed()
        res = self.adapter(FakeOpener(self.response()), evidence_log=self.shared()).call(
            "people_search", CASE, PURPOSE, {"first_name": "Jane", "last_name": "Example"})
        self.assertTrue(res["ok"], res["error"])
        req, resp = self.entries()
        self.assertEqual((req["kind"], resp["kind"]), ("records-request", "records-response"))
        self.assertEqual(resp["status"], 200)
        self.assertEqual(resp["server_date"], self.DATE)
        self.assertEqual(resp["tls_cert_sha256"], self.TLS)
        self.assertEqual(resp["operator"], self.OPERATOR)
        self.assertEqual(resp["extra"]["case_id"], CASE)
        self.assertEqual(resp["extra"]["purpose"], PURPOSE)
        self.assertEqual(resp["extra"]["request_entry_hash"], req["entry_hash"])
        self.assertEqual(resp["extra"]["legacy_manifest_sha256"], res["evidence"]["manifest_sha256"])
        self.assertTrue(os.path.isdir(res["evidence"]["dir"]))  # legacy per-call directory still written
        self.assertEqual(res["evidence"]["evidence_log"]["head"], resp["entry_hash"])
        self.assertTrue(res["evidence"]["evidence_log"]["signed"])
        result = self.audit()[-1]
        self.assertEqual(result["evidence_log_head"], resp["entry_hash"])
        self.assertTrue(A.ChainLog(self.audit_path).verify()["ok"])
        self.assertTrue(self.verify()["ok"])

    def test_secret_never_reaches_shared_log(self):
        self.add_licensed()
        echo = self.response(body={"echo_key": SECRET})
        self.adapter(FakeOpener(echo), evidence_log=self.shared()).call(
            "people_search", CASE, PURPOSE, {"first_name": "Jane", "last_name": "Example"})
        self.assertNotIn(SECRET, self.all_written_text())
        req, resp = self.entries()
        self.assertEqual(resp["extra"]["secret_redactions"], 1)
        self.assertNotEqual(resp["sha256"], resp["extra"]["sha256_as_received"])
        with open(os.path.join(self.log_dir, req["file"]), encoding="utf-8") as f:
            self.assertEqual(json.load(f)["headers"]["X-Api-Key"], R.REDACTED)
        self.assertTrue(self.verify()["ok"])

    def test_metadata_edit_detected_by_verify(self):
        self.add_licensed()
        self.adapter(FakeOpener(self.response()), evidence_log=self.shared()).call(
            "people_search", CASE, PURPOSE, {"first_name": "Jane", "last_name": "Example"})
        req, resp = self.entries()
        resp["extra"]["purpose"] = "marketing"
        with open(os.path.join(self.log_dir, self.core.LOG_NAME), "wb") as f:
            f.write(self.core.canonical(req) + b"\n" + self.core.canonical(resp) + b"\n")
        rep = self.verify()
        self.assertFalse(rep["ok"])
        self.assertTrue(any("entry edited" in p for p in rep["problems"]), rep["problems"])

    def test_http_error_keeps_tls_fingerprint(self):
        self.add_licensed()
        err = urllib.error.HTTPError("https://api.example.com/v1/people/search", 503, "busy",
                                     email.message.Message(), io.BytesIO(b'{"error":"busy"}'))
        err.peer_cert_sha256 = self.TLS
        res = self.adapter(FakeOpener(err), evidence_log=self.shared()).call(
            "people_search", CASE, PURPOSE, {"first_name": "Jane", "last_name": "Example"})
        self.assertFalse(res["ok"])
        resp = self.entries()[1]
        self.assertEqual((resp["status"], resp["tls_cert_sha256"]), (503, self.TLS))

    def test_cli_operator_required_and_signing(self):
        self.add_licensed()
        base = ("call", "--provider-file", self.provider_path, "--endpoint", "people_search", "--case", CASE,
                "--purpose", PURPOSE, "--ledger", self.ledger_path, "--audit-log", self.audit_path,
                "--evidence-dir", self.evidence, "--param", "first_name=Jane", "--param", "last_name=Example",
                "--evidence-log", self.log_dir)
        op = FakeOpener(self.response())
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = R.main(list(base), opener=op, environ=ENV)
        self.assertEqual(code, 2)
        self.assertIn("operator", err.getvalue())
        self.assertEqual(op.requests, [])
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = R.main(list(base) + ["--operator", self.OPERATOR, "--evidence-key", self.key],
                          opener=op, environ=ENV)
        self.assertEqual(code, 0, err.getvalue())
        self.assertEqual(len(self.entries()), 2)
        self.assertTrue(self.verify()["ok"])


class TestRateLimiter(unittest.TestCase):
    def test_waits_when_window_full_and_persists(self):
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, True)
        t = [1000.0]
        slept = []

        def sleep(s):
            slept.append(s)
            t[0] += s
        path = os.path.join(tmp, "rl", "v.json")
        rl = R.RateLimiter(path, 2, 60, clock=lambda: t[0], sleep=sleep)
        self.assertEqual(rl.acquire(), 0)
        t[0] += 10
        self.assertEqual(rl.acquire(), 0)
        t[0] += 5
        # a fresh limiter (a new CLI run) sees the same window
        rl2 = R.RateLimiter(path, 2, 60, clock=lambda: t[0], sleep=sleep)
        self.assertAlmostEqual(rl2.acquire(), 45.0)
        self.assertAlmostEqual(slept[0], 45.0)

    def test_no_redirect_handler(self):
        self.assertIsNone(R._NoRedirect().redirect_request(None, None, 302, "Found", {}, "https://evil/"))


class TestCLI(Base):
    def run_cli(self, *args, opener=None, environ=ENV):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = R.main(list(args), opener=opener or FakeOpener(), environ=environ)
        self.assertNotIn(SECRET, out.getvalue() + err.getvalue())
        return code, out.getvalue(), err.getvalue()

    def call_args(self, *extra, purpose=PURPOSE):
        return ("call", "--provider-file", self.provider_path, "--endpoint", "people_search", "--case", CASE,
                "--purpose", purpose, "--ledger", self.ledger_path, "--audit-log", self.audit_path,
                "--evidence-dir", self.evidence, "--param", "first_name=Jane", "--param", "last_name=Example",
                *extra)

    def test_exit_codes(self):
        echo = FakeResponse(200, {"key": SECRET})
        self.assertEqual(self.run_cli(*self.call_args(), opener=FakeOpener(echo))[0], 3)
        self.add_licensed()
        code, out, err = self.run_cli(*self.call_args(), opener=FakeOpener(echo))
        self.assertEqual(code, 0, err)
        self.assertTrue(json.loads(out)["ok"])
        self.assertEqual(self.run_cli(*self.call_args(purpose="marketing"))[0], 3)
        self.assertEqual(self.run_cli(*self.call_args("--param", "ssn=1"))[0], 2)
        self.assertEqual(self.run_cli(*self.call_args("--param", "novalue"))[0], 2)
        self.assertEqual(self.run_cli(*self.call_args("--param", "first_name=Again"))[0], 2)
        self.assertEqual(self.run_cli(*self.call_args(), environ={})[0], 2)  # no key
        self.assertEqual(self.run_cli(*self.call_args(), opener=FakeOpener(FakeResponse(500, b"oops")))[0], 4)
        self.assertNotIn(SECRET, self.all_written_text())
        self.assertTrue(A.ChainLog(self.audit_path).verify()["ok"])

    def test_gate_needs_salt_and_actor(self):
        self.add_licensed()
        os.environ.pop(A.ENV_SALT)
        code, _, err = self.run_cli(*self.call_args())
        self.assertEqual(code, 2)
        self.assertIn(A.ENV_SALT, err)
        os.environ[A.ENV_SALT] = HASH_SALT
        os.environ.pop(A.ENV_ACTOR)
        self.assertEqual(self.run_cli(*self.call_args())[0], 3)
        self.assertEqual(self.audit()[-1]["event"], "refuse")
        code, _, err = self.run_cli(*self.call_args("--actor", ACTOR))
        self.assertEqual(code, 0, err)
        self.assertEqual(self.audit()[-1]["actor"], ACTOR)

    def test_bad_provider_file_exit_2(self):
        cfg = copy.deepcopy(example_cfg())
        cfg["base_url"] = "http://api.example.com"
        self.write_provider(cfg)
        self.assertEqual(self.run_cli(*self.call_args())[0], 2)
        self.assertEqual(self.run_cli("validate", "--provider-file", self.provider_path)[0], 2)

    def test_validate(self):
        code, out, _ = self.run_cli("validate", "--provider-file", EXAMPLE)
        self.assertEqual(code, 0)
        self.assertIn("people_search", json.loads(out)["endpoints"])


if __name__ == "__main__":
    unittest.main()
