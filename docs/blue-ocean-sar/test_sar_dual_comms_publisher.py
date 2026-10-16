"""Tests for sar_dual_comms_publisher.py using local sockets only."""

import os
import shutil
import socket
import ssl
import subprocess
import sys
import tempfile
import threading
import unittest
import warnings
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sar_dual_comms_publisher import DualCommsTAKPublisher, build_sample_cot, parse_args  # noqa: E402


def _free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class _Server(threading.Thread):
    """Accept one connection and record everything it sends."""

    def __init__(self, tls_context=None):
        super().__init__(daemon=True)
        self.sock = socket.socket()
        self.sock.bind(("127.0.0.1", 0))
        self.sock.listen(1)
        self.sock.settimeout(5)
        self.port = self.sock.getsockname()[1]
        self.tls_context = tls_context
        self.received = b""

    def run(self):
        conn, _ = self.sock.accept()
        if self.tls_context:
            try:
                conn = self.tls_context.wrap_socket(conn, server_side=True)
            except (ssl.SSLError, OSError):
                conn.close()
                self.sock.close()
                return
        with conn:
            while True:
                chunk = conn.recv(4096)
                if not chunk:
                    break
                self.received += chunk
        self.sock.close()


class PublisherTests(unittest.TestCase):
    def test_plain_tcp_delivers_payload(self):
        srv = _Server()
        srv.start()
        cot = build_sample_cot()
        pub = DualCommsTAKPublisher(primary_port=srv.port, multicast=False)
        res = pub.publish_cot_event(cot)
        srv.join(5)
        self.assertTrue(res["primary_status"].startswith("SUCCESS (TCP"), res)
        self.assertEqual(srv.received.decode(), cot)
        self.assertEqual(res["secondary_status"], "DISABLED")

    @unittest.skipUnless(shutil.which("openssl"), "openssl CLI not available")
    def test_tls_delivers_payload(self):
        d = tempfile.mkdtemp()
        cert, key = os.path.join(d, "c.pem"), os.path.join(d, "k.pem")
        subprocess.run(
            ["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
             "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost",
             "-keyout", key, "-out", cert],
            check=True, capture_output=True,
        )
        server_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        server_ctx.load_cert_chain(cert, key)
        srv = _Server(server_ctx)
        srv.start()
        cot = build_sample_cot()
        pub = DualCommsTAKPublisher(
            primary_host="localhost", primary_port=srv.port, use_tls=True, tls_ca_file=cert, multicast=False
        )
        res = pub.publish_cot_event(cot)
        srv.join(5)
        self.assertTrue(res["primary_status"].startswith("SUCCESS (TLS"), res)
        self.assertEqual(srv.received.decode(), cot)

    def test_tls_rejects_untrusted_server(self):
        d = tempfile.mkdtemp()
        if not shutil.which("openssl"):
            self.skipTest("openssl CLI not available")
        cert, key = os.path.join(d, "c.pem"), os.path.join(d, "k.pem")
        subprocess.run(
            ["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
             "-subj", "/CN=localhost", "-keyout", key, "-out", cert],
            check=True, capture_output=True,
        )
        server_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        server_ctx.load_cert_chain(cert, key)
        srv = _Server(server_ctx)
        srv.start()
        # No CA file: the self-signed server must not be trusted.
        pub = DualCommsTAKPublisher(primary_host="localhost", primary_port=srv.port, use_tls=True, multicast=False)
        res = pub.publish_cot_event(build_sample_cot())
        self.assertTrue(res["primary_status"].startswith("PRIMARY_FAILED"), res)
        self.assertEqual(srv.received, b"")

    def test_unreachable_primary_reports_failure(self):
        pub = DualCommsTAKPublisher(primary_port=_free_port(), multicast=False, timeout=1)
        res = pub.publish_cot_event(build_sample_cot())
        self.assertTrue(res["primary_status"].startswith("PRIMARY_FAILED"), res)

    def test_malformed_xml_rejected(self):
        pub = DualCommsTAKPublisher(multicast=False)
        with self.assertRaises(ValueError):
            pub.publish_cot_event("<event><point></event>")
        with self.assertRaises(ValueError):
            pub.publish_cot_event("<events><event/></events>")

    def test_multicast_warns_unencrypted(self):
        # Multicast is opt-in now; the original constructed with the default:
        # pub = DualCommsTAKPublisher(primary_port=_free_port(), timeout=1)
        pub = DualCommsTAKPublisher(primary_port=_free_port(), timeout=1, multicast=True)
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            res = pub.publish_cot_event(build_sample_cot())
        self.assertTrue(any("unencrypted" in str(x.message) for x in w))
        self.assertIsNotNone(res["secondary_status"])

    def test_multicast_off_by_default(self):
        pub = DualCommsTAKPublisher(primary_port=_free_port(), timeout=1)
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            res = pub.publish_cot_event(build_sample_cot())
        self.assertEqual(res["secondary_status"], "DISABLED")
        self.assertFalse(any("unencrypted" in str(x.message) for x in w))
        self.assertFalse(parse_args([]).multicast)
        self.assertTrue(parse_args(["--multicast"]).multicast)
        self.assertFalse(parse_args(["--multicast", "--no-multicast"]).multicast)

    def test_tls_defaults_to_tls_port_unless_port_given(self):
        self.assertEqual(parse_args(["--tls"]).port, 8089)
        self.assertEqual(parse_args([]).port, 8087)
        self.assertEqual(parse_args(["--tls", "--port", "9000"]).port, 9000)
        self.assertEqual(DualCommsTAKPublisher(use_tls=True).primary_port, 8089)
        self.assertEqual(DualCommsTAKPublisher().primary_port, 8087)

    def test_sample_cot_uses_current_time(self):
        now = datetime(2030, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
        cot = build_sample_cot(now=now)
        self.assertIn('time="2030-01-02T03:04:05.000Z"', cot)
        self.assertIn('stale="2030-01-03T03:04:05.000Z"', cot)


if __name__ == "__main__":
    unittest.main()
