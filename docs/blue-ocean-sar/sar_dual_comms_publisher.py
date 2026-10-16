"""
Blue Ocean SAR Dual Communications TAK Publisher
------------------------------------------------
Primary Channel: OpenTAKServer TCP/REST Endpoint (IP / LTE / Satellite Broadband)
Secondary Channel: UDP Multicast / Tactical RF Mesh (239.2.3.1:6969 / Meshtastic / GoTenna / SDR)

NOT VALIDATED against a live OpenTAKServer or ATAK device. See README.md.

Security note: the secondary UDP multicast channel is UNENCRYPTED. Anyone on
the same network segment can read every position sent over it. Use it only
for data you would be comfortable broadcasting, or pass multicast=False.
The primary channel can use TLS (OpenTAKServer's streaming port is usually
8089 with client certificates); plain TCP 8087 is unencrypted too.
"""

import argparse
import json
import socket
import ssl
import warnings
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone


def _cot_time(t):
    return t.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def build_sample_cot(now=None, stale_hours=24.0):
    """Sample CoT event stamped with the current time (the original upload
    hardcoded 2026-10-15, which ATAK drops as stale once that day passes)."""
    now = now or datetime.now(timezone.utc)
    stale = now + timedelta(hours=stale_hours)
    return (
        f'<event version="2.0" uid="SAR-DUAL-COMMS-TEST" type="b-r-a-p-s" '
        f'time="{_cot_time(now)}" start="{_cot_time(now)}" stale="{_cot_time(stale)}" how="h-e">'
        '<point lat="49.3837" lon="-122.9439" hae="0" ce="10" le="10"/>'
        '<detail><contact callsign="SAR-PRIMARY-TARGET-#1"/>'
        "<remarks>[Dual Comms] Primary: TCP/IP TAK Server | Secondary: UDP RF Mesh 239.2.3.1:6969</remarks>"
        "</detail></event>"
    )


class DualCommsTAKPublisher:
    def __init__(
        self,
        primary_host="127.0.0.1",
        primary_port=8087,
        secondary_mcast_group="239.2.3.1",
        secondary_mcast_port=6969,
        use_tls=False,
        tls_ca_file=None,
        tls_cert_file=None,
        tls_key_file=None,
        multicast=True,
        timeout=3.0,
    ):
        self.primary_host = primary_host
        self.primary_port = primary_port
        self.mcast_group = secondary_mcast_group
        self.mcast_port = secondary_mcast_port
        self.use_tls = use_tls
        self.tls_ca_file = tls_ca_file
        self.tls_cert_file = tls_cert_file
        self.tls_key_file = tls_key_file
        self.multicast = multicast
        self.timeout = timeout

    def _tls_context(self):
        ctx = ssl.create_default_context(cafile=self.tls_ca_file)
        if self.tls_cert_file:
            ctx.load_cert_chain(self.tls_cert_file, self.tls_key_file)
        return ctx

    def publish_cot_event(self, xml_cot_str: str):
        results = {"primary_status": None, "secondary_status": None}

        # Refuse malformed XML before it goes anywhere: a TAK server silently
        # drops it and the sender would otherwise report SUCCESS.
        try:
            root = ET.fromstring(xml_cot_str)
        except ET.ParseError as e:
            raise ValueError(f"CoT payload is not well-formed XML: {e}") from e
        if root.tag != "event":
            raise ValueError(f"CoT payload root must be <event>, got <{root.tag}>")
        payload = xml_cot_str.encode("utf-8")

        # Primary Comms Channel: TCP Direct Stream to OpenTAKServer
        # Original (kept for reference): plain TCP only, socket not closed on error.
        # sock_tcp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        # sock_tcp.settimeout(3.0)
        # sock_tcp.connect((self.primary_host, self.primary_port))
        # sock_tcp.sendall(xml_cot_str.encode('utf-8'))
        # sock_tcp.close()
        try:
            with socket.create_connection((self.primary_host, self.primary_port), timeout=self.timeout) as raw:
                if self.use_tls:
                    with self._tls_context().wrap_socket(raw, server_hostname=self.primary_host) as tls:
                        tls.sendall(payload)
                else:
                    raw.sendall(payload)
            proto = "TLS" if self.use_tls else "TCP"
            results["primary_status"] = f"SUCCESS ({proto} -> {self.primary_host}:{self.primary_port})"
        except Exception as e:
            results["primary_status"] = f"PRIMARY_FAILED ({e}) - Switching to Failover"

        # Secondary Comms Channel: UDP Multicast / Tactical RF Mesh
        if not self.multicast:
            results["secondary_status"] = "DISABLED"
            return results
        warnings.warn(
            "UDP multicast CoT is unencrypted; anyone on the segment can read it",
            RuntimeWarning,
            stacklevel=2,
        )
        try:
            sock_udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
            try:
                sock_udp.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
                sock_udp.sendto(payload, (self.mcast_group, self.mcast_port))
            finally:
                sock_udp.close()
            results["secondary_status"] = f"SUCCESS (UDP Multicast -> {self.mcast_group}:{self.mcast_port})"
        except Exception as e:
            results["secondary_status"] = f"SECONDARY_FAILED ({e})"

        return results


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8087)
    ap.add_argument("--tls", action="store_true", help="TLS to the TAK server (usually port 8089)")
    ap.add_argument("--ca-file")
    ap.add_argument("--cert-file")
    ap.add_argument("--key-file")
    ap.add_argument("--no-multicast", action="store_true", help="do not send the unencrypted multicast copy")
    args = ap.parse_args()

    print("Initializing Blue Ocean SAR Dual Comms TAK Publisher...")
    publisher = DualCommsTAKPublisher(
        primary_host=args.host,
        primary_port=args.port,
        use_tls=args.tls,
        tls_ca_file=args.ca_file,
        tls_cert_file=args.cert_file,
        tls_key_file=args.key_file,
        multicast=not args.no_multicast,
    )

    # Example CoT payload broadcast
    # Original (kept for reference): hardcoded timestamps, stale after 2026-10-16.
    # sample_cot = """<event version="2.0" uid="SAR-DUAL-COMMS-TEST" type="b-r-a-p-s"
    #     time="2026-10-15T04:00:00Z" start="2026-10-15T04:00:00Z" stale="2026-10-16T04:00:00Z"
    #     how="h-e"><point lat="49.3837" lon="-122.9439" hae="0" ce="10" le="10"/><detail>
    #     <contact callsign="SAR-PRIMARY-TARGET-#1"/><remarks>[Dual Comms] Primary: TCP/IP TAK
    #     Server | Secondary: UDP RF Mesh 239.2.3.1:6969</remarks></detail></event>"""
    sample_cot = build_sample_cot()

    res = publisher.publish_cot_event(sample_cot)
    print("Dual Comms Broadcast Results:", json.dumps(res, indent=2))
