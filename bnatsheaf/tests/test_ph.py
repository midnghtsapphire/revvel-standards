import unittest
import json
import os
import tempfile
from bnatsheaf.ph import PHLayer

class TestPHLayer(unittest.TestCase):
    def setUp(self):
        # Create a temporary mock BIOME status file
        self.temp_dir = tempfile.TemporaryDirectory()
        self.mock_biome_path = os.path.join(self.temp_dir.name, "biome-status.json")

        self.mock_data = {
            "overall": "healthy",
            "workers": {
                "sentinel": {"status": "healthy"},
                "medic": {"status": "healthy"}
            }
        }

        with open(self.mock_biome_path, 'w') as f:
            json.dump(self.mock_data, f)

        self.ph_layer = PHLayer(self.mock_biome_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_barcode_generation_healthy(self):
        barcode = self.ph_layer.generate_barcode()

        self.assertEqual(barcode['energy'], 0.0)
        self.assertEqual(barcode['H1_bars'], 0)

    def test_barcode_generation_degraded(self):
        # Introduce an obstruction: worker is degraded but overall is healthy
        # (This is technically an invalid BIOME state, but perfect for testing the sheaf)
        self.mock_data['workers']['medic']['status'] = 'degraded'

        with open(self.mock_biome_path, 'w') as f:
            json.dump(self.mock_data, f)

        barcode = self.ph_layer.generate_barcode()

        self.assertTrue(barcode['energy'] > 0.0)
        self.assertEqual(barcode['H1_bars'], 1)
        self.assertEqual(len(barcode['obstructions']), 1)
        self.assertIn(('medic', 'global_health'), barcode['obstructions'])

    def test_log_filtration(self):
        log_file = os.path.join(self.temp_dir.name, "ph_log.json")

        self.ph_layer.log_filtration(1, log_file)

        with open(log_file, 'r') as f:
            data = json.load(f)
            self.assertEqual(len(data), 1)
            self.assertEqual(data[0]['step'], 1)

if __name__ == '__main__':
    unittest.main()
