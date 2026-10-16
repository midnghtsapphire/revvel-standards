"""Tests for core.py: chain, metadata hashing, signatures, file naming, court mode, HTTPS capture.

Run from this folder:  python3 -m unittest -v
"""

import datetime as dt
import hashlib
import http.server
import ipaddress
import json
import os
import shutil
import ssl
import stat
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cryptography import x509  # noqa: E402
from cryptography.hazmat.primitives import hashes, serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import ec  # noqa: E402
from cryptography.x509.oid import NameOID  # noqa: E402

from evidence import core  # noqa: E402

FIXED = dt.datetime(2026, 10, 16, 12, 0, 0, tzinfo=dt.timezone.utc)
SYNCED = {"ntp_synchronized": "yes", "method": "test"}


def _clock():
    return dict(SYNCED)


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.dir = os.path.join(self.tmp, "case")
        self.priv = os.path.join(self.tmp, "op.key")
        self.pub = os.path.join(self.tmp, "op.pub")
        core.generate_keypair(self.priv, self.pub)
        self.key = core.load_private_key(self.priv)
        self.pubkey = core.load_public_key(self.pub)

    def tearDown(self):
        for root, dirs, files in os.walk(self.tmp):
            for name in files:
                os.chmod(os.path.join(root, name), 0o600)
        shutil.rmtree(self.tmp)

    def make(self, n=3, signed=True, now=core.utc_now, operator="Det. A. Example"):
        log = core.EvidenceLog(self.dir, operator=operator, private_key=self.key if signed else None,
                               clock=_clock, now=now)
        for i in range(n):
            log.append(f"capture {i}".encode(), kind="http-response", source=f"https://example.org/{i}",
                       status=200, server_date="Fri, 16 Oct 2026 12:00:00 GMT",
                       tls_cert_sha256="ab" * 32, extra={"note": f"n{i}"})
        return log

    @property
    def log_path(self):
        return os.path.join(self.dir, core.LOG_NAME)

    def lines(self):
        with open(self.log_path, "rb") as f:
            return f.read().split(b"\n")[:-1]

    def write_lines(self, lines):
        with open(self.log_path, "wb") as f:
            f.write(b"".join(ln + b"\n" for ln in lines))

    def verify(self, **kw):
        return core.verify_log(self.dir, **kw)

    def assertFails(self, rep, needle):
        self.assertFalse(rep["ok"], rep)
        self.assertTrue(any(needle in p for p in rep["problems"]), rep["problems"])


class RoundTrip(Base):
    def test_signed_log_verifies_with_public_key(self):
        self.make()
        rep = self.verify(public_key=self.pubkey)
        self.assertTrue(rep["ok"], rep["problems"])
        self.assertTrue(rep["signed"])
        self.assertEqual(rep["count"], 3)

    def test_entry_records_all_metadata(self):
        e = core.EvidenceLog(self.dir, operator="Op", clock=_clock).append(b"x", kind="note", source="here")
        for field in core.ENTRY_FIELDS:
            self.assertIn(field, e)
        self.assertEqual(e["operator"], "Op")
        self.assertIsNotNone(core.parse_aware(e["utc"]))
        self.assertEqual(set(e["tool"]), {"name", "version", "git_commit", "git_dirty"})
        self.assertEqual(e["clock"], SYNCED)
        self.assertEqual(e["sha256"], hashlib.sha256(b"x").hexdigest())

    def test_operator_required(self):
        old = os.environ.pop(core.ENV_OPERATOR, None)
        try:
            log = core.EvidenceLog(self.dir, clock=_clock)
            with self.assertRaises(core.EvidenceError):
                log.append(b"x", kind="note", source="s")
            os.environ[core.ENV_OPERATOR] = "From Env"
            self.assertEqual(core.EvidenceLog(self.dir, clock=_clock).append(
                b"x", kind="note", source="s")["operator"], "From Env")
        finally:
            os.environ.pop(core.ENV_OPERATOR, None)
            if old is not None:
                os.environ[core.ENV_OPERATOR] = old

    def test_naive_time_refused(self):
        log = core.EvidenceLog(self.dir, operator="Op", clock=_clock, now=lambda: dt.datetime(2026, 1, 1))
        with self.assertRaises(core.EvidenceError):
            log.append(b"x", kind="note", source="s")

    def test_git_commit_recorded_when_available(self):
        commit, _ = core.git_info(os.path.abspath(__file__))
        if commit is None:
            self.skipTest("not inside a git checkout")
        self.assertRegex(commit, r"^[0-9a-f]{40}$")
        self.assertEqual(core.tool_info()["git_commit"], commit)

    def test_clock_info_shape(self):
        self.assertIn(core.clock_info()["ntp_synchronized"], ("yes", "no", "unknown"))


class MetadataEdits(Base):
    FIELDS = {
        "operator": "Someone Else", "utc": "2026-10-15T00:00:00.000000+00:00", "host": "other-host",
        "source": "https://example.org/forged", "status": 404, "server_date": "Thu, 15 Oct 2026 00:00:00 GMT",
        "tls_cert_sha256": "cd" * 32, "kind": "photo", "extra": {"note": "changed"}, "size": 1,
        "clock": {"ntp_synchronized": "no", "method": "test"},
        "tool": {"name": "x", "version": "9", "git_commit": None, "git_dirty": None},
    }

    def test_every_metadata_edit_detected(self):
        self.make(signed=False)
        original = self.lines()
        for field, value in self.FIELDS.items():
            with self.subTest(field=field):
                e = json.loads(original[1])
                e[field] = value
                self.write_lines([original[0], core.canonical(e), original[2]])
                self.assertFails(self.verify(), "metadata does not match entry_hash")
        self.write_lines(original)
        self.assertTrue(self.verify()["ok"])

    def test_rehashed_edit_breaks_the_next_link(self):
        self.make(signed=False)
        lines = self.lines()
        e = json.loads(lines[1])
        e["source"] = "https://example.org/forged"
        e["entry_hash"] = core.entry_hash(e)
        self.write_lines([lines[0], core.canonical(e), lines[2]])
        self.assertFails(self.verify(), "line 3: prev_hash does not match")

    def test_non_canonical_and_duplicate_keys_flagged(self):
        self.make(signed=False)
        lines = self.lines()
        pretty = json.dumps(json.loads(lines[0]), indent=1).replace("\n", " ").encode()
        self.write_lines([pretty] + lines[1:])
        self.assertFails(self.verify(), "not in canonical form")
        dup = lines[0][:-1] + b',"operator":"X"}'
        self.write_lines([dup] + lines[1:])
        self.assertFails(self.verify(), "duplicate key")


class Forgery(Base):
    def _rechain(self, lines, edit, sign_with=None, key_id=None):
        """Edit entry 1 and recompute every later hash, as an attacker without the key would."""
        out, prev = [], core.GENESIS
        for i, raw in enumerate(lines):
            e = json.loads(raw)
            if i == 1:
                edit(e)
            e["prev_hash"] = prev
            if key_id is not None:
                e["key_id"] = key_id or None
            e["entry_hash"] = core.entry_hash(e)
            if sign_with is not None:
                e["signature"] = core.sign_hash(sign_with, e["entry_hash"]) if sign_with else None
            prev = e["entry_hash"]
            out.append(core.canonical(e))
        return out

    def test_rechained_forgery_fails_signature_check(self):
        self.make()
        forged = self._rechain(self.lines(), lambda e: e.update(source="https://example.org/forged"))
        self.write_lines(forged)
        rep = self.verify(public_key=self.pubkey)
        self.assertFails(rep, "line 2: signature does not verify")
        self.assertFails(rep, "line 3: signature does not verify")
        self.assertFalse(any("prev_hash" in p for p in rep["problems"]), "chain itself is consistent")

    def test_rechained_with_attackers_own_key_fails(self):
        self.make()
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
        mallory = Ed25519PrivateKey.generate()
        forged = self._rechain(self.lines(), lambda e: e.update(status=500), sign_with=mallory,
                               key_id=core.key_id(mallory.public_key()))
        self.write_lines(forged)
        rep = self.verify(public_key=self.pubkey)
        self.assertFails(rep, "is not the given public key")
        self.assertFails(rep, "signature does not verify")

    def test_stripped_signatures_fail_with_public_key_and_in_court(self):
        self.make()
        forged = self._rechain(self.lines(), lambda e: e.update(status=500), sign_with=False, key_id=False)
        self.write_lines(forged)
        self.assertFails(self.verify(public_key=self.pubkey), "signature does not verify")
        rep = self.verify()  # no key, no head: an unsigned re-chain is internally consistent
        self.assertTrue(rep["ok"])
        self.assertTrue(any("unsigned" in w for w in rep["warnings"]))
        self.assertFails(self.verify(court=True), "court mode needs")

    def test_mixed_signing_refused_and_detected(self):
        self.make(n=2)
        with self.assertRaises(core.EvidenceError):
            core.EvidenceLog(self.dir, operator="Op", clock=_clock).append(b"x", kind="note", source="s")
        lines = self.lines()
        e = json.loads(lines[1])
        e["signature"] = None
        self.write_lines([lines[0], core.canonical(e)])
        self.assertFails(self.verify(), "mixes signed and unsigned")

    def test_unsigned_log_cannot_become_signed(self):
        self.make(n=1, signed=False)
        with self.assertRaises(core.EvidenceError):
            core.EvidenceLog(self.dir, operator="Op", private_key=self.key, clock=_clock).append(
                b"x", kind="note", source="s")

    def test_signed_log_without_public_key_warns_and_court_fails(self):
        self.make()
        rep = self.verify()
        self.assertTrue(rep["ok"])
        self.assertTrue(any("not checked" in w for w in rep["warnings"]))
        _, head = core.chain_head(core.EvidenceLog(self.dir).read_entries())
        self.assertFails(self.verify(court=True, expect_head=head), "no --public-key")


class MissingExtraReordered(Base):
    def test_missing_middle_entry(self):
        self.make()
        lines = self.lines()
        self.write_lines([lines[0], lines[2]])
        rep = self.verify(public_key=self.pubkey)
        self.assertFails(rep, "seq 2 where 1 expected")
        self.assertFails(rep, "prev_hash does not match")
        self.assertFails(rep, "present on disk but not in the log")

    def test_missing_last_entry_needs_expected_head(self):
        log = self.make()
        _, head = log.head()
        lines = self.lines()
        e = json.loads(lines[2])
        os.chmod(os.path.join(self.dir, e["file"]), 0o600)
        os.remove(os.path.join(self.dir, e["file"]))
        self.write_lines(lines[:2])
        self.assertTrue(self.verify(public_key=self.pubkey)["ok"], "truncation alone is invisible")
        self.assertFails(self.verify(public_key=self.pubkey, expect_head=head), "does not match the expected head")

    def test_extra_entry(self):
        self.make()
        lines = self.lines()
        self.write_lines(lines + [lines[2]])
        self.assertFails(self.verify(public_key=self.pubkey), "seq 2 where 3 expected")

    def test_reordered_entries(self):
        self.make()
        lines = self.lines()
        self.write_lines([lines[0], lines[2], lines[1]])
        rep = self.verify(public_key=self.pubkey)
        self.assertFails(rep, "entry missing, inserted or reordered")

    def test_extra_object_file(self):
        self.make()
        with open(os.path.join(self.dir, core.OBJECTS_DIR, "000009_" + "0" * 64 + ".bin"), "wb") as f:
            f.write(b"planted")
        self.assertFails(self.verify(public_key=self.pubkey), "present on disk but not in the log")

    def test_altered_and_missing_content(self):
        self.make()
        e = json.loads(self.lines()[0])
        path = os.path.join(self.dir, e["file"])
        os.chmod(path, 0o600)
        with open(path, "wb") as f:
            f.write(b"capture X")
        self.assertFails(self.verify(public_key=self.pubkey), "does not match its sha256")
        os.remove(path)
        self.assertFails(self.verify(public_key=self.pubkey), "stored file missing")

    def test_truncated_last_line(self):
        self.make()
        with open(self.log_path, "rb+") as f:
            f.truncate(os.path.getsize(self.log_path) - 5)
        self.assertFails(self.verify(public_key=self.pubkey), "does not end with a newline")


class FileNames(Base):
    def test_unique_names_for_same_second_identical_captures(self):
        log = core.EvidenceLog(self.dir, operator="Op", private_key=self.key, clock=_clock, now=lambda: FIXED)
        entries = [log.append(b"same bytes", kind="http-response", source="https://example.org/x")
                   for _ in range(5)]
        names = [e["file"] for e in entries]
        self.assertEqual(len(set(names)), 5)
        self.assertEqual({e["utc"] for e in entries}, {core.iso_utc(FIXED)})
        for n in names:
            self.assertTrue(os.path.isfile(os.path.join(self.dir, n)))
        self.assertTrue(self.verify(public_key=self.pubkey)["ok"])

    def test_existing_object_is_never_overwritten(self):
        self.make(n=1)
        sha = hashlib.sha256(b"next").hexdigest()
        planted = os.path.join(self.dir, core.OBJECTS_DIR, f"000001_{sha}.bin")
        with open(planted, "wb") as f:
            f.write(b"original")
        log = core.EvidenceLog(self.dir, operator="Op", private_key=self.key, clock=_clock)
        with self.assertRaises(core.EvidenceError):
            log.append(b"next", kind="note", source="s")
        with open(planted, "rb") as f:
            self.assertEqual(f.read(), b"original")
        self.assertEqual(len(log.read_entries()), 1)

    def test_broken_log_is_not_extended(self):
        self.make()
        lines = self.lines()
        self.write_lines([lines[1]])
        with self.assertRaises(core.EvidenceError):
            core.EvidenceLog(self.dir, operator="Op", private_key=self.key, clock=_clock).append(
                b"x", kind="note", source="s")


class Keys(Base):
    def test_private_key_mode_and_no_overwrite(self):
        self.assertEqual(stat.S_IMODE(os.stat(self.priv).st_mode), 0o600)
        with self.assertRaises(FileExistsError):
            core.generate_keypair(self.priv, self.pub + ".2")
        with self.assertRaises(core.EvidenceError):
            core.generate_keypair(self.priv + ".2", self.pub)

    def test_group_readable_private_key_refused(self):
        os.chmod(self.priv, 0o640)
        with self.assertRaises(core.EvidenceError):
            core.load_private_key(self.priv)

    def test_passphrase_protected_key(self):
        p2, q2 = os.path.join(self.tmp, "k2.key"), os.path.join(self.tmp, "k2.pub")
        core.generate_keypair(p2, q2, passphrase=b"correct horse")
        with self.assertRaises((TypeError, ValueError)):
            core.load_private_key(p2)
        self.assertIsNotNone(core.load_private_key(p2, b"correct horse"))


class Court(Base):
    def test_court_mode_refuses_without_head_or_token(self):
        log = self.make()
        rep = self.verify(public_key=self.pubkey, court=True)
        self.assertFails(rep, "court mode needs --expect-head")
        _, head = log.head()
        rep = self.verify(public_key=self.pubkey, court=True, expect_head=head)
        self.assertTrue(rep["ok"], rep["problems"])

    def test_court_mode_rejects_wrong_head(self):
        self.make()
        self.assertFails(self.verify(public_key=self.pubkey, court=True, expect_head="1" * 64),
                         "does not match the expected head")

    def test_court_mode_rejects_unverified_token(self):
        log = self.make()
        _, head = log.head()

        def fake_tokens(directory, heads, entries, cafile=None):
            return [{"file": "t.tsr", "covers_head": True, "signature_verified": None, "problems": []}]
        rep = core.verify_log(self.dir, public_key=self.pubkey, court=True, token_checker=fake_tokens)
        self.assertFails(rep, "court mode needs")


def _self_signed(tmp):
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
        body = b"hello evidence"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


class HTTPSCapture(Base):
    def test_fetch_https_records_tls_fingerprint_and_date(self):
        cert, key, fp = _self_signed(self.tmp)
        server = http.server.HTTPServer(("127.0.0.1", 0), _Hello)
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(cert, key)
        server.socket = ctx.wrap_socket(server.socket, server_side=True)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            url = f"https://127.0.0.1:{server.server_port}/page"
            r = core.fetch_https(url, cafile=cert, use_env_proxy=False)
            self.assertEqual(r["status"], 200)
            self.assertEqual(r["body"], b"hello evidence")
            self.assertEqual(r["tls_cert_sha256"], fp)
            self.assertIsNotNone(r["server_date"])
            log = core.EvidenceLog(self.dir, operator="Op", private_key=self.key, clock=_clock)
            e = log.capture_https(url, cafile=cert, use_env_proxy=False)
        finally:
            server.shutdown()
            server.server_close()
        self.assertEqual(e["tls_cert_sha256"], fp)
        self.assertEqual(e["status"], 200)
        self.assertEqual(e["source"], url)
        self.assertEqual(e["extra"]["content_type"], "text/plain")
        self.assertTrue(self.verify(public_key=self.pubkey)["ok"])

    def test_untrusted_certificate_refused(self):
        cert, key, _ = _self_signed(self.tmp)
        server = http.server.HTTPServer(("127.0.0.1", 0), _Hello)
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(cert, key)
        server.socket = ctx.wrap_socket(server.socket, server_side=True)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with self.assertRaises(ssl.SSLError):
                core.fetch_https(f"https://127.0.0.1:{server.server_port}/", use_env_proxy=False)
        finally:
            server.shutdown()
            server.server_close()

    def test_http_url_refused(self):
        with self.assertRaises(core.EvidenceError):
            core.fetch_https("http://example.org/")


class ReviewRegressions(Base):
    """Review 2026-10-16: an append must not extend a log that would fail verify."""

    def _rewrite(self, edit_first, sign_rest=True):
        out, prev = [], core.GENESIS
        for i, raw in enumerate(self.lines()):
            e = json.loads(raw)
            if i == 0:
                edit_first(e)
            e["prev_hash"] = prev
            e["entry_hash"] = core.entry_hash(e)
            if i > 0 and sign_rest:
                e["signature"] = core.sign_hash(self.key, e["entry_hash"])
            prev = e["entry_hash"]
            out.append(core.canonical(e))
        self.write_lines(out)

    def _append_signed(self):
        return core.EvidenceLog(self.dir, operator="Op", private_key=self.key, clock=_clock).append(
            b"x", kind="note", source="s")

    def test_mixed_log_with_matching_tail_is_not_extended(self):
        self.make(n=2)
        self._rewrite(lambda e: e.update(key_id=None, signature=None))
        self.assertFails(self.verify(public_key=self.pubkey), "mixes signed and unsigned")
        with self.assertRaises(core.EvidenceError):
            self._append_signed()
        self.assertEqual(len(self.lines()), 2)

    def test_bad_signature_under_the_right_key_is_not_extended(self):
        self.make(n=2)
        lines = self.lines()
        e = json.loads(lines[0])
        e["signature"] = core.sign_hash(self.key, "00" * 32)
        self.write_lines([core.canonical(e)] + lines[1:])
        with self.assertRaises(core.EvidenceError):
            self._append_signed()

    def test_reserialised_log_is_not_extended(self):
        self.make(n=2, signed=False)
        lines = self.lines()
        pretty = json.dumps(json.loads(lines[0]), indent=1).replace("\n", " ").encode()
        self.write_lines([pretty] + lines[1:])
        with self.assertRaises(core.EvidenceError) as cm:
            core.EvidenceLog(self.dir, operator="Op", clock=_clock).append(b"x", kind="note", source="s")
        self.assertIn("canonical", str(cm.exception))
        self.assertEqual(len(self.lines()), 2)

    def test_repeated_appends_still_verify(self):
        log = core.EvidenceLog(self.dir, operator="Op", private_key=self.key, clock=_clock)
        for i in range(4):
            log.append(f"n{i}".encode(), kind="note", source="s")
        self.assertTrue(self.verify(public_key=self.pubkey)["ok"])

    def test_symlinked_object_fails_verification(self):
        self.make(n=1)
        e = json.loads(self.lines()[0])
        inside = os.path.join(self.dir, e["file"])
        outside = os.path.join(self.tmp, "outside.bin")
        shutil.copyfile(inside, outside)
        os.chmod(inside, 0o600)
        os.remove(inside)
        os.symlink(outside, inside)
        self.assertFails(self.verify(public_key=self.pubkey), "is a symlink")

    def test_expect_sha256_refuses_before_anything_is_written(self):
        log = core.EvidenceLog(self.dir, operator="Op", clock=_clock)
        with self.assertRaises(core.EvidenceError):
            log.append(b"changed", kind="note", source="s", expect_sha256=core.sha256_hex(b"original"))
        self.assertEqual(log.read_entries(), [])
        self.assertEqual(os.listdir(os.path.join(self.dir, core.OBJECTS_DIR)), [])
        e = log.append(b"original", kind="note", source="s", expect_sha256=core.sha256_hex(b"original"))
        self.assertEqual(e["seq"], 0)


if __name__ == "__main__":
    unittest.main()
