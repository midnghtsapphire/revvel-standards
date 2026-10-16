#!/usr/bin/env python3
"""
Export an anomaly location as Cursor-on-Target (CoT) XML for ATAK / WinTAK / iTAK.

Builds a CoT 2.0 <event> of type "b-m-p-s-m" (a map spot marker) with:
  - <point> lat/lon, height above ellipsoid (HAE), circular/linear error (ce/le)
  - <detail>/<contact callsign>       label shown on the map
  - <detail>/<remarks>                free-text sensor notes
  - <detail>/<color argb>             marker colour (derived from the score)
  - <detail>/<precisionlocation>      how the position was obtained
  - <detail>/<anomaly>                fused score and sensor metadata (custom
                                      element; TAK clients keep unknown detail
                                      elements and pass them along)

Times are UTC ISO-8601 with a trailing Z. All text goes through ElementTree,
so remarks containing <, & or quotes are escaped correctly.

Usage:
    python3 cot_export.py --lat 39.7392 --lon -104.9903 --hae 1609 \
        --callsign ANOMALY-01 --score 87.5 --remarks "GPR + P-band SAR agree" \
        --out anomaly.cot
"""

import argparse
import sys
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Optional, Sequence

COT_TYPE = "b-m-p-s-m"
DEFAULT_HOW = "h-e"  # human-entered
UNKNOWN_ERROR = 9999999.0  # CoT convention for "unknown" ce/le/hae


def _iso(t: datetime) -> str:
    return t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + f"{t.microsecond // 1000:03d}Z"


def score_color_argb(score: float) -> int:
    """Signed 32-bit ARGB as TAK expects: >=75 red, >=50 orange, else yellow."""
    if score >= 75:
        rgb = 0xFF0000
    elif score >= 50:
        rgb = 0xFF8C00
    else:
        rgb = 0xFFD700
    argb = (0xFF << 24) | rgb
    return argb - (1 << 32)


def build_cot(
    lat: float,
    lon: float,
    callsign: str,
    score: float,
    remarks: str = "",
    hae: Optional[float] = None,
    ce: Optional[float] = None,
    le: Optional[float] = None,
    sensors: Optional[Sequence[str]] = None,
    stale_hours: float = 24.0,
    uid: Optional[str] = None,
    now: Optional[datetime] = None,
    how: str = DEFAULT_HOW,
) -> ET.Element:
    if not -90.0 <= lat <= 90.0:
        raise ValueError(f"latitude out of range: {lat}")
    if not -180.0 <= lon <= 180.0:
        raise ValueError(f"longitude out of range: {lon}")
    if not 0.0 <= score <= 100.0:
        raise ValueError(f"score must be 0-100, got {score}")
    if not callsign.strip():
        raise ValueError("callsign must not be empty")
    if stale_hours <= 0:
        raise ValueError("stale_hours must be > 0")

    t = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    event = ET.Element("event", {
        "version": "2.0",
        "uid": uid or f"anomaly-{uuid.uuid4()}",
        "type": COT_TYPE,
        "how": how,
        "time": _iso(t),
        "start": _iso(t),
        "stale": _iso(t + timedelta(hours=stale_hours)),
    })
    ET.SubElement(event, "point", {
        "lat": f"{lat:.7f}",
        "lon": f"{lon:.7f}",
        "hae": f"{hae:.2f}" if hae is not None else f"{UNKNOWN_ERROR:.1f}",
        "ce": f"{ce:.2f}" if ce is not None else f"{UNKNOWN_ERROR:.1f}",
        "le": f"{le:.2f}" if le is not None else f"{UNKNOWN_ERROR:.1f}",
    })
    detail = ET.SubElement(event, "detail")
    ET.SubElement(detail, "contact", {"callsign": callsign})
    ET.SubElement(detail, "precisionlocation", {"geopointsrc": "USER", "altsrc": "USER" if hae is not None else "???"})
    ET.SubElement(detail, "color", {"argb": str(score_color_argb(score))})
    ET.SubElement(detail, "status", {"readiness": "true"})
    ET.SubElement(detail, "archive")
    ET.SubElement(detail, "anomaly", {
        "fusedScorePct": f"{score:.1f}",
        "sensors": ",".join(sensors or []),
        "scoreIsCalibratedProbability": "false",
    })
    rem = ET.SubElement(detail, "remarks")
    rem.text = remarks
    return event


def to_xml(event: ET.Element) -> str:
    ET.indent(event, space="  ")
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + ET.tostring(event, encoding="unicode") + "\n"


def main(argv: Optional[Sequence[str]] = None) -> str:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--hae", type=float, help="height above WGS84 ellipsoid (m); omit if unknown")
    ap.add_argument("--ce", type=float, help="horizontal 1-sigma error (m); omit if unknown")
    ap.add_argument("--le", type=float, help="vertical 1-sigma error (m); omit if unknown")
    ap.add_argument("--callsign", required=True)
    ap.add_argument("--score", type=float, required=True, help="fused score 0-100")
    ap.add_argument("--remarks", default="")
    ap.add_argument("--sensors", nargs="*", default=[], help="e.g. GPR P-SAR LWIR SIF")
    ap.add_argument("--stale-hours", type=float, default=24.0)
    ap.add_argument("--uid", help="stable UID so re-sends update the same marker")
    ap.add_argument("--out", help="write the XML to this file (.cot or .xml)")
    args = ap.parse_args(argv)
    try:
        event = build_cot(args.lat, args.lon, args.callsign, args.score, args.remarks, args.hae, args.ce,
                          args.le, args.sensors, args.stale_hours, args.uid)
    except ValueError as e:
        ap.error(str(e))
    xml = to_xml(event)
    print(xml, end="")
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(xml)
        print(f"written to {args.out}", file=sys.stderr)
    return xml


if __name__ == "__main__":
    main(sys.argv[1:])
