"""
Blue Ocean SAR Dual Communications TAK Publisher
------------------------------------------------
Primary Channel: OpenTAKServer TCP/REST Endpoint (IP / LTE / Satellite Broadband)
Secondary Channel: UDP Multicast / Tactical RF Mesh (239.2.3.1:6969 / Meshtastic / GoTenna / SDR)
"""

import socket
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

class DualCommsTAKPublisher:
    def __init__(self, primary_host="127.0.0.1", primary_port=8087,
                 secondary_mcast_group="239.2.3.1", secondary_mcast_port=6969):
        self.primary_host = primary_host
        self.primary_port = primary_port
        self.mcast_group = secondary_mcast_group
        self.mcast_port = secondary_mcast_port

    def publish_cot_event(self, xml_cot_str: str):
        results = {"primary_status": None, "secondary_status": None}
        
        # Primary Comms Channel: TCP Direct Stream to OpenTAKServer
        try:
            sock_tcp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock_tcp.settimeout(3.0)
            sock_tcp.connect((self.primary_host, self.primary_port))
            sock_tcp.sendall(xml_cot_str.encode('utf-8'))
            sock_tcp.close()
            results["primary_status"] = f"SUCCESS (TCP -> {self.primary_host}:{self.primary_port})"
        except Exception as e:
            results["primary_status"] = f"PRIMARY_FAILED ({e}) - Switching to Failover"

        # Secondary Comms Channel: UDP Multicast / Tactical RF Mesh
        try:
            sock_udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
            sock_udp.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
            sock_udp.sendto(xml_cot_str.encode('utf-8'), (self.mcast_group, self.mcast_port))
            sock_udp.close()
            results["secondary_status"] = f"SUCCESS (UDP Multicast -> {self.mcast_group}:{self.mcast_port})"
        except Exception as e:
            results["secondary_status"] = f"SECONDARY_FAILED ({e})"

        return results

if __name__ == "__main__":
    print("Initializing Blue Ocean SAR Dual Comms TAK Publisher...")
    publisher = DualCommsTAKPublisher()
    
    # Example CoT payload broadcast
    sample_cot = """<event version="2.0" uid="SAR-DUAL-COMMS-TEST" type="b-r-a-p-s" time="2026-10-15T04:00:00Z" start="2026-10-15T04:00:00Z" stale="2026-10-16T04:00:00Z" how="h-e"><point lat="49.3837" lon="-122.9439" hae="0" ce="10" le="10"/><detail><contact callsign="SAR-PRIMARY-TARGET-#1"/><remarks>[Dual Comms] Primary: TCP/IP TAK Server | Secondary: UDP RF Mesh 239.2.3.1:6969</remarks></detail></event>"""
    
    res = publisher.publish_cot_event(sample_cot)
    print("Dual Comms Broadcast Results:", json.dumps(res, indent=2))
