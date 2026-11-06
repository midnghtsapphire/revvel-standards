"""Tests for cot_export. Run: python3 -m unittest discover -s docs/cot-export"""

import os
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cot_export as c  # noqa: E402

NOW = datetime(2026, 10, 16, 12, 0, 0, 250000, tzinfo=timezone.utc)


class CoT(unittest.TestCase):
    def build(self, **kw: object) -> ET.Element:
        args = {"lat": 39.7392, "lon": -104.9903, "callsign": "ANOMALY-01", "score": 87.5, "now": NOW}
        args.update(kw)
        return c.build_cot(**args)  # type: ignore[arg-type]

    def test_event_structure(self) -> None:
        e = self.build(hae=1609.0, ce=2.5, uid="u1", sensors=["GPR", "P-SAR"], remarks="note")
        self.assertEqual(e.tag, "event")
        self.assertEqual(e.get("type"), "b-m-p-s-m")
        self.assertEqual(e.get("version"), "2.0")
        self.assertEqual(e.get("uid"), "u1")
        self.assertEqual(e.get("time"), "2026-10-16T12:00:00.250Z")
        self.assertEqual(e.get("stale"), "2026-10-17T12:00:00.250Z")
        p = e.find("point")
        self.assertEqual(
            (p.get("lat"), p.get("lon"), p.get("hae"), p.get("ce")),
            ("39.7392000", "-104.9903000", "1609.00", "2.50"),
        )
        self.assertEqual(p.get("le"), "9999999.0")
        self.assertEqual(e.find("detail/contact").get("callsign"), "ANOMALY-01")
        self.assertEqual(e.find("detail/anomaly").get("fusedScorePct"), "87.5")
        self.assertEqual(e.find("detail/anomaly").get("sensors"), "GPR,P-SAR")
        self.assertEqual(e.find("detail/remarks").text, "note")

    def test_unknown_hae_uses_cot_convention(self) -> None:
        self.assertEqual(self.build().find("point").get("hae"), "9999999.0")

    def test_special_characters_round_trip(self) -> None:
        text = 'GPR & SAR agree <1.9 m> "strong"'
        xml = c.to_xml(self.build(remarks=text))
        self.assertIn("&amp;", xml)
        self.assertEqual(ET.fromstring(xml.split("\n", 1)[1]).find("detail/remarks").text, text)

    def test_color_by_score(self) -> None:
        self.assertEqual(c.score_color_argb(90), -65536)  # opaque red
        self.assertEqual(c.score_color_argb(60) & 0xFFFFFF, 0xFF8C00)
        self.assertEqual(c.score_color_argb(10) & 0xFFFFFF, 0xFFD700)

    def test_validation(self) -> None:
        for bad in ({"lat": 91}, {"lon": -181}, {"score": 101}, {"callsign": " "}, {"stale_hours": 0}):
            with self.assertRaises(ValueError, msg=str(bad)):
                self.build(**bad)

    def test_cli_writes_file(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "a.cot")
            c.main(["--lat", "1", "--lon", "2", "--callsign", "X", "--score", "50", "--out", out])
            self.assertEqual(ET.parse(out).getroot().get("type"), "b-m-p-s-m")


if __name__ == "__main__":
    unittest.main()
