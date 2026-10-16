"""The sample camera/OSINT fixture must say, in a field a program reads, that
it is unvalidated sample data and not a live feed (stdlib only)."""

import json
import os
import unittest

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "sar_camera_osint_feeds.json")
SAMPLE = "SAMPLE_UNVALIDATED"


class CameraFeedFixture(unittest.TestCase):
    def setUp(self):
        with open(DATA, encoding="utf-8") as f:
            self.doc = json.load(f)

    def test_document_and_every_channel_marked_sample(self):
        self.assertEqual(self.doc["status"], SAMPLE)
        self.assertEqual(self.doc["validation_status"], SAMPLE)
        self.assertIs(self.doc["is_sample"], True)
        self.assertTrue(self.doc["ingestion_channels"])
        for ch in self.doc["ingestion_channels"]:
            self.assertEqual(ch["status"], SAMPLE, ch["channel_id"])

    def test_camera_material_kept(self):
        ids = [ch["channel_id"] for ch in self.doc["ingestion_channels"]]
        self.assertEqual(ids, ["CAM-LIVE-001", "CAM-HIST-002", "CAM-TACTICAL-003"])
        self.assertEqual(self.doc["claimed_operational_status"], "ACTIVE_OPERATIONAL")
        self.assertTrue(self.doc["camera_osint_frameworks"])


if __name__ == "__main__":
    unittest.main()
