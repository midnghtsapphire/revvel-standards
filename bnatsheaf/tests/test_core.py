import unittest
from bnatsheaf.core import CellularSheaf

class TestCellularSheaf(unittest.TestCase):
    def test_consistent_sheaf(self):
        sheaf = CellularSheaf()

        sheaf.add_node("A", "healthy")
        sheaf.add_node("B", "healthy")

        # Identity restriction maps
        sheaf.add_edge("A", "B", lambda x: x, lambda x: x)

        self.assertEqual(sheaf.compute_laplacian_energy(), 0.0)
        self.assertEqual(len(sheaf.detect_h1_obstructions()), 0)
        self.assertTrue(sheaf.is_consistent())

    def test_inconsistent_sheaf(self):
        sheaf = CellularSheaf()

        sheaf.add_node("A", "healthy")
        sheaf.add_node("B", "degraded")

        # Identity restriction maps, but values differ
        sheaf.add_edge("A", "B", lambda x: x, lambda x: x)

        self.assertTrue(sheaf.compute_laplacian_energy() > 0.0)
        self.assertEqual(len(sheaf.detect_h1_obstructions()), 1)
        self.assertFalse(sheaf.is_consistent())

    def test_numeric_disagreement(self):
        sheaf = CellularSheaf()

        sheaf.add_node("A", 1.0)
        sheaf.add_node("B", 2.0)

        sheaf.add_edge("A", "B", lambda x: x, lambda x: x)

        # Distance squared: |1.0 - 2.0|^2 = 1.0
        self.assertEqual(sheaf.compute_laplacian_energy(), 1.0)

    def test_custom_restriction(self):
        sheaf = CellularSheaf()

        # Nodes have different structures
        sheaf.add_node("A", {"status": "ok", "value": 5})
        sheaf.add_node("B", 5)

        # Restriction maps project to the common edge space (int)
        sheaf.add_edge("A", "B",
                       res_source=lambda x: x["value"],
                       res_target=lambda x: x)

        self.assertTrue(sheaf.is_consistent())

if __name__ == '__main__':
    unittest.main()
