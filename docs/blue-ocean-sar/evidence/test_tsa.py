"""RFC 3161 round trip with a local, offline test TSA (openssl ts -reply).

Run from this folder:  python3 -m unittest -v
"""

import datetime as dt
import http.server
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cryptography import x509  # noqa: E402
from cryptography.hazmat.primitives import hashes, serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import ec  # noqa: E402
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID  # noqa: E402

from evidence import core, tsa  # noqa: E402

TSA_CONF = """\
[ tsa ]
default_tsa = tsa_config1

[ tsa_config1 ]
dir = {dir}
serial = $dir/serial
crypto_device = builtin
signer_cert = $dir/tsa.pem
certs = $dir/ca.pem
signer_key = $dir/tsa.key
signer_digest = sha256
default_policy = 1.3.6.1.4.1.99999.1
other_policies = 1.3.6.1.4.1.99999.2
digests = sha256, sha384, sha512
accuracy = secs:1
ordering = yes
tsa_name = yes
ess_cert_id_chain = no
ess_cert_id_alg = sha256
"""


def _name(cn):
    return x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, cn)])


def _pem_key(key):
    return key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                             serialization.NoEncryption())


class LocalTSA:
    """A throwaway CA plus a TSA certificate (EKU timeStamping, critical), driven by openssl ts -reply."""

    def __init__(self, directory, cn="Offline Test TSA"):
        self.dir = directory
        now = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)
        later = now + dt.timedelta(days=30)
        ca_key = ec.generate_private_key(ec.SECP256R1())
        ca = (x509.CertificateBuilder().subject_name(_name(cn + " Root")).issuer_name(_name(cn + " Root"))
              .public_key(ca_key.public_key()).serial_number(x509.random_serial_number())
              .not_valid_before(now).not_valid_after(later)
              .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
              .add_extension(x509.KeyUsage(False, False, False, False, False, True, True, False, False), critical=True)
              .sign(ca_key, hashes.SHA256()))
        tsa_key = ec.generate_private_key(ec.SECP256R1())
        cert = (x509.CertificateBuilder().subject_name(_name(cn)).issuer_name(ca.subject)
                .public_key(tsa_key.public_key()).serial_number(x509.random_serial_number())
                .not_valid_before(now).not_valid_after(later)
                .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
                .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.TIME_STAMPING]), critical=True)
                .sign(ca_key, hashes.SHA256()))
        self._write("ca.pem", ca.public_bytes(serialization.Encoding.PEM))
        self._write("tsa.pem", cert.public_bytes(serialization.Encoding.PEM))
        self._write("tsa.key", _pem_key(tsa_key))
        self._write("serial", b"01\n")
        self._write("tsa.cnf", TSA_CONF.format(dir=directory).encode())
        self.cafile = os.path.join(directory, "ca.pem")

    def _write(self, name, data):
        with open(os.path.join(self.dir, name), "wb") as f:
            f.write(data)

    def reply(self, tsq):
        p = subprocess.run(["openssl", "ts", "-reply", "-config", os.path.join(self.dir, "tsa.cnf"),
                            "-queryfile", "/dev/stdin", "-section", "tsa_config1"],
                           input=tsq, capture_output=True, check=False)
        if p.returncode != 0:
            raise RuntimeError(p.stderr.decode())
        return p.stdout

    def transport(self, url, tsq, timeout=30.0):
        return self.reply(tsq)


class _Handler(http.server.BaseHTTPRequestHandler):
    tsa = None

    def do_POST(self):  # noqa: N802 (http.server API)
        body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        if self.headers.get("Content-Type") != "application/timestamp-query":
            self.send_error(415)
            return
        out = self.tsa.reply(body)
        self.send_response(200)
        self.send_header("Content-Type", "application/timestamp-reply")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a):
        pass


def make_log(directory, n=3, operator="Officer Test"):
    log = core.EvidenceLog(directory, operator=operator, clock=lambda: {"ntp_synchronized": "yes",
                                                                        "method": "test"})
    for i in range(n):
        log.append(f"item {i}".encode(), kind="note", source=f"test:{i}")
    return log


@unittest.skipUnless(shutil.which("openssl"), "openssl CLI not installed")
class TSARoundTrip(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.tmp, "tsa"))
        self.tsa = LocalTSA(os.path.join(self.tmp, "tsa"))
        self.logdir = os.path.join(self.tmp, "case")
        self.log = make_log(self.logdir)

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_http_query_reply_verify_round_trip(self):
        _Handler.tsa = self.tsa
        server = http.server.HTTPServer(("127.0.0.1", 0), _Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            url = f"http://127.0.0.1:{server.server_port}/tsr"
            res = tsa.stamp_head(self.logdir, tsa_urls=[url], cafile=self.tsa.cafile,
                                 transport=lambda u, q, timeout: tsa.post_query(u, q, timeout=timeout, proxies={}))
        finally:
            server.shutdown()
            server.server_close()
        count, head = self.log.head()
        self.assertEqual(res["head"], head)
        self.assertTrue(res["verified_against_ca"])
        self.assertTrue(os.path.exists(res["token"]))
        rep = core.verify_log(self.logdir, tsa_cafile=self.tsa.cafile, court=True)
        self.assertTrue(rep["ok"], rep["problems"])
        self.assertEqual(len(rep["tokens"]), 1)
        self.assertTrue(rep["tokens"][0]["covers_head"])
        self.assertTrue(rep["tokens"][0]["signature_verified"])
        self.assertEqual(rep["tokens"][0]["covers_seq"], count - 1)

    def test_falls_back_to_next_tsa(self):
        def transport(url, tsq, timeout):
            if "down" in url:
                raise OSError("connection refused")
            return self.tsa.reply(tsq)
        res = tsa.stamp_head(self.logdir, tsa_urls=["http://down.invalid", "http://up.invalid"],
                             cafile=self.tsa.cafile, transport=transport)
        self.assertEqual(res["tsa_url"], "http://up.invalid")

    def test_all_tsas_down_raises(self):
        def transport(url, tsq, timeout):
            raise OSError("network blocked")
        with self.assertRaises(tsa.TSAError):
            tsa.stamp_head(self.logdir, tsa_urls=list(tsa.DEFAULT_TSAS), transport=transport)

    def test_wrong_imprint_reply_rejected(self):
        other = tempfile.mkdtemp()
        try:
            q = tsa.make_query("ab" * 32, os.path.join(other, "q.tsq"))
            wrong = self.tsa.reply(q)
        finally:
            shutil.rmtree(other)
        with self.assertRaises(tsa.TSAError):
            tsa.stamp_head(self.logdir, tsa_urls=["http://x.invalid"], transport=lambda u, q, timeout: wrong)

    def test_token_from_other_ca_fails_court(self):
        tsa.stamp_head(self.logdir, tsa_urls=["x"], transport=self.tsa.transport)
        os.makedirs(os.path.join(self.tmp, "other"))
        other = LocalTSA(os.path.join(self.tmp, "other"), cn="Untrusted TSA")
        rep = core.verify_log(self.logdir, tsa_cafile=other.cafile, court=True)
        self.assertFalse(rep["ok"])
        self.assertTrue(any("does not verify" in p for p in rep["problems"]), rep["problems"])

    def test_token_detects_rewrite_and_extension(self):
        tsa.stamp_head(self.logdir, tsa_urls=["x"], cafile=self.tsa.cafile, transport=self.tsa.transport)
        # Appending after the stamp: token still valid for its seq but no longer covers the head.
        self.log.append(b"late", kind="note", source="test:late")
        rep = core.verify_log(self.logdir, tsa_cafile=self.tsa.cafile, court=True)
        self.assertFalse(rep["ok"])
        self.assertFalse(rep["tokens"][0]["covers_head"])
        self.assertEqual(rep["tokens"][0]["covers_seq"], 2)
        # Expect-head from an outside record satisfies court mode again.
        _, head = self.log.head()
        rep = core.verify_log(self.logdir, tsa_cafile=self.tsa.cafile, court=True, expect_head=head)
        self.assertTrue(rep["ok"], rep["problems"])

    def test_token_over_rewritten_chain_is_flagged(self):
        tsa.stamp_head(self.logdir, tsa_urls=["x"], cafile=self.tsa.cafile, transport=self.tsa.transport)
        # Rebuild the whole log with different content: the old token's imprint is no longer in the chain.
        os.remove(os.path.join(self.logdir, core.LOG_NAME))
        for name in os.listdir(os.path.join(self.logdir, core.OBJECTS_DIR)):
            p = os.path.join(self.logdir, core.OBJECTS_DIR, name)
            os.chmod(p, 0o644)
            os.remove(p)
        log = core.EvidenceLog(self.logdir, operator="Forger", clock=lambda: {"ntp_synchronized": "yes"})
        for i in range(3):
            log.append(f"forged {i}".encode(), kind="note", source=f"test:{i}")
        rep = core.verify_log(self.logdir, tsa_cafile=self.tsa.cafile)
        self.assertFalse(rep["ok"])
        self.assertTrue(any("not any entry_hash" in p for p in rep["problems"]), rep["problems"])

    def test_read_reply_fields(self):
        res = tsa.stamp_head(self.logdir, tsa_urls=["x"], transport=self.tsa.transport)
        info = tsa.read_reply(res["token"])
        self.assertEqual(info["imprint"], res["head"])
        self.assertEqual(info["hash_algorithm"].lower(), "sha256")
        self.assertIsNotNone(core.parse_aware(info["gen_time"]))
        self.assertFalse(res["verified_against_ca"])

    def test_openssl_timeout_is_a_tsa_error_and_a_verify_problem(self):
        # Review 2026-10-16: subprocess.TimeoutExpired used to escape both stamping and verification.
        tsa.stamp_head(self.logdir, tsa_urls=["x"], cafile=self.tsa.cafile, transport=self.tsa.transport)
        hang = subprocess.TimeoutExpired("openssl", 30)
        with mock.patch.object(tsa.subprocess, "run", side_effect=hang):
            with self.assertRaises(tsa.TSAError):
                tsa.stamp_head(self.logdir, tsa_urls=["x"], transport=self.tsa.transport)
            ok, msg = tsa.verify_reply("x.tsr", "ab" * 32, self.tsa.cafile)
            self.assertFalse(ok)
            self.assertIn("did not finish", msg)
            rep = core.verify_log(self.logdir, tsa_cafile=self.tsa.cafile)
        self.assertFalse(rep["ok"])
        self.assertTrue(any("did not finish" in p for p in rep["problems"]), rep["problems"])


if __name__ == "__main__":
    unittest.main()
