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

import sar_dual_comms_publisher  # noqa: E402
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
        # What was wrong: this asserted the "SUCCESS" wording, so the test locked in an overclaim (H4).
        # self.assertTrue(res["primary_status"].startswith("SUCCESS (TCP"), res)
        self.assertTrue(res["primary_status"].startswith("SENT (unacknowledged) (TCP"), res)
        self.assertEqual(srv.received.decode(), cot)
        self.assertEqual(res["secondary_status"], "DISABLED")
        self.assertEqual(res["sent_via"], ["primary"])
        self.assertFalse(res["failover"])

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
        # What was wrong: this asserted the "SUCCESS" wording, so the test locked in an overclaim (H4).
        # self.assertTrue(res["primary_status"].startswith("SUCCESS (TLS"), res)
        self.assertTrue(res["primary_status"].startswith("SENT (unacknowledged) (TLS"), res)
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

    def test_no_success_wording_and_no_failover_claim_without_secondary(self):
        # H4: the primary failed and multicast is off, so nothing was sent and no
        # failover happened; the old status claimed "Switching to Failover".
        pub = DualCommsTAKPublisher(primary_port=_free_port(), multicast=False, timeout=1)
        res = pub.publish_cot_event(build_sample_cot())
        self.assertNotIn("Failover", res["primary_status"])
        self.assertNotIn("SUCCESS", str(res))
        self.assertFalse(res["failover"])
        self.assertEqual(res["sent_via"], [])

    def test_failover_reported_only_when_secondary_sent(self):
        # Unicast loopback stands in for the multicast group so the send works offline.
        rx = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        rx.bind(("127.0.0.1", 0))
        rx.settimeout(5)
        self.addCleanup(rx.close)
        pub = DualCommsTAKPublisher(primary_port=_free_port(), multicast=True, timeout=1,
                                    secondary_mcast_group="127.0.0.1", secondary_mcast_port=rx.getsockname()[1])
        cot = build_sample_cot()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            res = pub.publish_cot_event(cot)
        self.assertTrue(res["primary_status"].startswith("PRIMARY_FAILED"), res)
        self.assertTrue(res["secondary_status"].startswith("SENT (unacknowledged) (UDP"), res)
        self.assertEqual(res["sent_via"], ["secondary"])
        self.assertTrue(res["failover"])
        self.assertEqual(rx.recv(65536).decode(), cot)

    def test_secondary_send_after_primary_success_is_not_failover(self):
        srv = _Server()
        srv.start()
        rx = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        rx.bind(("127.0.0.1", 0))
        self.addCleanup(rx.close)
        pub = DualCommsTAKPublisher(primary_port=srv.port, multicast=True,
                                    secondary_mcast_group="127.0.0.1", secondary_mcast_port=rx.getsockname()[1])
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            res = pub.publish_cot_event(build_sample_cot())
        srv.join(5)
        self.assertEqual(res["sent_via"], ["primary", "secondary"])
        self.assertFalse(res["failover"])

    def test_cli_exits_non_zero_when_nothing_sent(self):
        script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sar_dual_comms_publisher.py")
        proc = subprocess.run([sys.executable, script, "--port", str(_free_port())],
                              capture_output=True, text=True, timeout=30)
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("NOT SENT", proc.stderr)
        self.assertNotIn("SUCCESS", proc.stdout)

    def test_header_makes_no_mesh_radio_claims(self):
        doc = sar_dual_comms_publisher.__doc__
        for word in ("Meshtastic", "GoTenna", "RF Mesh"):
            self.assertNotIn(word, doc)
        self.assertNotIn("RF Mesh", build_sample_cot())

    def test_sample_cot_point_does_not_claim_height_or_accuracy(self):
        import xml.etree.ElementTree as ET

        pt = ET.fromstring(build_sample_cot()).find("point")
        for attr in ("hae", "ce", "le"):
            self.assertEqual(float(pt.get(attr)), 9999999.0)

    def test_sample_cot_uses_current_time(self):
        now = datetime(2030, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
        cot = build_sample_cot(now=now)
        self.assertIn('time="2030-01-02T03:04:05.000Z"', cot)
        self.assertIn('stale="2030-01-03T03:04:05.000Z"', cot)


if __name__ == "__main__":
    unittest.main()
