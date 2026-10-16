"""
Blue Ocean SAR Dual Communications TAK Publisher
------------------------------------------------
Primary Channel: OpenTAKServer TCP/TLS streaming endpoint (any IP link: LAN, LTE, satellite broadband)
Secondary Channel: UDP multicast 239.2.3.1:6969 (optional, unencrypted)

This module has no driver for mesh radios. It sends UDP multicast only;
reaching a mesh radio would need a separate gateway.

Neither channel is acknowledged: "SENT (unacknowledged)" means the bytes left
this machine, not that a TAK server or ATAK device received or displayed them.

NOT VALIDATED against a live OpenTAKServer or ATAK device. See README.md.

Security note: the secondary UDP multicast channel is UNENCRYPTED. Anyone on
the same network segment can read every position sent over it. It is off by
default; turn it on with multicast=True (CLI: --multicast) only for data you
would be comfortable broadcasting.
The primary channel can use TLS (OpenTAKServer's streaming port is usually
8089 with client certificates); plain TCP 8087 is unencrypted too. When no
port is given, TLS uses 8089 and plain TCP 8087.
"""

# What was wrong: the Meshtastic / GoTenna / SDR mesh-failover description came from AI-generated
# material (NotebookLM / chatbot output).
# The code only opens a UDP socket; it cannot drive any radio. Lesson: a header describes what the code
# does, not what it might connect to one day (H4). Original lines:
# Secondary Channel: UDP Multicast / Tactical RF Mesh (239.2.3.1:6969 / Meshtastic / GoTenna / SDR)
# Primary Channel: OpenTAKServer TCP/REST Endpoint (IP / LTE / Satellite Broadband)

import argparse
import json
import socket
import ssl
import sys
import warnings
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone


TCP_PORT = 8087
TLS_PORT = 8089

# Status prefix for a channel whose send call returned without error. No TAK
# acknowledgement exists on either channel (SYSTEM_REVIEW H4).
SENT = "SENT (unacknowledged)"


def default_port(use_tls):
    return TLS_PORT if use_tls else TCP_PORT


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
        # What was wrong: hae=0 and ce/le=10 were placeholders that ATAK shows as a measured height and a
        # 10 m accuracy, and the remarks named an RF mesh this module cannot reach. Lesson: unknown is
        # 9999999 in CoT, and remarks describe only what was actually sent (H3, H4).
        # '<point lat="49.3837" lon="-122.9439" hae="0" ce="10" le="10"/>'
        '<point lat="49.3837" lon="-122.9439" hae="9999999.0" ce="9999999.0" le="9999999.0"/>'
        '<detail><contact callsign="SAR-PRIMARY-TARGET-#1"/>'
        # "<remarks>[Dual Comms] Primary: TCP/IP TAK Server | Secondary: UDP RF Mesh 239.2.3.1:6969</remarks>"
        "<remarks>[Dual Comms TEST] Primary: TCP/TLS TAK server | Secondary: UDP multicast 239.2.3.1:6969</remarks>"
        "</detail></event>"
    )


class DualCommsTAKPublisher:
    # Original defaults: primary_port=8087 even with use_tls=True (a TLS handshake
    # sent to the plain-TCP port), and multicast=True (positions broadcast in clear).
    # primary_port=8087,
    # multicast=True,
    def __init__(
        self,
        primary_host="127.0.0.1",
        primary_port=None,
        secondary_mcast_group="239.2.3.1",
        secondary_mcast_port=6969,
        use_tls=False,
        tls_ca_file=None,
        tls_cert_file=None,
        tls_key_file=None,
        multicast=False,
        timeout=3.0,
    ):
        self.primary_host = primary_host
        # self.primary_port = primary_port
        self.primary_port = default_port(use_tls) if primary_port is None else primary_port
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
        """Send one CoT event. Returns a dict:
        primary_status / secondary_status: "SENT (unacknowledged) (...)", "..._FAILED (...)" or "DISABLED";
        sent_via: channels whose send returned without error (empty = nothing left this machine);
        failover: True only when the primary failed AND the secondary actually sent."""
        # What was wrong: nothing recorded which channel actually sent, so a caller could not tell a real
        # failover from a claimed one (H4).
        # results = {"primary_status": None, "secondary_status": None}
        results = {"primary_status": None, "secondary_status": None, "sent_via": [], "failover": False}

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
            # What was wrong: "SUCCESS" meant only that sendall() returned; no TAK server acknowledges CoT.
            # Lesson: report what was observed (bytes sent), not what was hoped (H4).
            # results["primary_status"] = f"SUCCESS ({proto} -> {self.primary_host}:{self.primary_port})"
            results["primary_status"] = f"{SENT} ({proto} -> {self.primary_host}:{self.primary_port})"
            results["sent_via"].append("primary")
        except Exception as e:
            # What was wrong: "Switching to Failover" printed on every primary failure, even with multicast
            # off and nothing sent. The status described a plan, not an event (H4).
            # results["primary_status"] = f"PRIMARY_FAILED ({e}) - Switching to Failover"
            results["primary_status"] = f"PRIMARY_FAILED ({e})"

        # Secondary Comms Channel: UDP multicast (no mesh-radio support; SYSTEM_REVIEW H4)
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
            # What was wrong: "SUCCESS" on UDP multicast, which has no delivery confirmation of any kind (H4).
            # results["secondary_status"] = f"SUCCESS (UDP Multicast -> {self.mcast_group}:{self.mcast_port})"
            results["secondary_status"] = f"{SENT} (UDP multicast -> {self.mcast_group}:{self.mcast_port})"
            results["sent_via"].append("secondary")
            results["failover"] = "primary" not in results["sent_via"]
        except Exception as e:
            results["secondary_status"] = f"SECONDARY_FAILED ({e})"

        return results


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=None, help=f"default {TLS_PORT} with --tls, else {TCP_PORT}")
    ap.add_argument("--tls", action="store_true", help=f"TLS to the TAK server (port {TLS_PORT} unless --port)")
    ap.add_argument("--ca-file")
    ap.add_argument("--cert-file")
    ap.add_argument("--key-file")
    ap.add_argument("--multicast", action="store_true",
                    help="also send an UNENCRYPTED copy over UDP multicast (off by default)")
    ap.add_argument("--no-multicast", action="store_true", help="kept for old scripts; multicast is off by default")
    args = ap.parse_args(argv)
    if args.port is None:
        args.port = default_port(args.tls)
    if args.no_multicast:
        args.multicast = False
    return args


if __name__ == "__main__":
    # Original parser (moved into parse_args() so the TLS port default can be
    # resolved after parsing and tested):
    # ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    # ap.add_argument("--host", default="127.0.0.1")
    # ap.add_argument("--port", type=int, default=8087)
    # ap.add_argument("--tls", action="store_true", help="TLS to the TAK server (usually port 8089)")
    # ap.add_argument("--ca-file")
    # ap.add_argument("--cert-file")
    # ap.add_argument("--key-file")
    # ap.add_argument("--no-multicast", action="store_true", help="do not send the unencrypted multicast copy")
    # args = ap.parse_args()
    args = parse_args()

    print("Initializing Blue Ocean SAR Dual Comms TAK Publisher...")
    publisher = DualCommsTAKPublisher(
        primary_host=args.host,
        primary_port=args.port,
        use_tls=args.tls,
        tls_ca_file=args.ca_file,
        tls_cert_file=args.cert_file,
        tls_key_file=args.key_file,
        # multicast=not args.no_multicast,
        multicast=args.multicast,
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
    if res["failover"]:
        print("Primary failed; the event went out on the secondary UDP multicast channel only.")
    # Exit status reflects the outcome: non-zero when nothing was sent on any channel.
    if not res["sent_via"]:
        print("NOT SENT on any channel.", file=sys.stderr)
        sys.exit(1)
