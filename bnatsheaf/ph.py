import json
import os
from typing import Dict, Any, List, Tuple
from .core import CellularSheaf

class PHLayer:
    """
    Persistent Homology layer for the BNAT Sheaf.
    Parses BIOME status JSONs and extracts filtration logic and H0/H1 barcodes.
    """
    def __init__(self, biome_feed_path: str = "docs/biome/biome-status.json"):
        self.biome_feed_path = biome_feed_path

    def load_biome_status(self) -> Dict[str, Any]:
        if not os.path.exists(self.biome_feed_path):
            raise FileNotFoundError(f"BIOME feed not found at {self.biome_feed_path}")
        with open(self.biome_feed_path, 'r') as f:
            return json.load(f)

    def generate_sheaf_from_biome(self) -> CellularSheaf:
        """
        Constructs a CellularSheaf based on the workers defined in the BIOME status.
        Connects them to a central 'global' node representing overall fleet health.
        """
        status_data = self.load_biome_status()
        sheaf = CellularSheaf()

        # Central global node
        overall_status = status_data.get('overall', 'healthy')
        sheaf.add_node('global_health', overall_status)

        workers = status_data.get('workers', {})
        for worker_name, worker_data in workers.items():
            sheaf.add_node(worker_name, worker_data.get('status', 'healthy'))

            # The restriction map: worker status must exactly equal the overall status,
            # or it triggers an obstruction (disagreement).
            # In a real topological space, the global is worse_of(all local),
            # but for consistency, we expect all nodes in a perfectly healthy
            # state to just be 'healthy' and agree.
            # Here we map local -> health and global -> health to see if they align.
            sheaf.add_edge(
                worker_name, 'global_health',
                res_source=lambda x: x,
                res_target=lambda x: x
            )

        return sheaf

    def generate_barcode(self) -> Dict[str, Any]:
        """
        A simplified barcode generation.
        H0 components = connected components (always 1 for our star graph).
        H1 bars = active obstructions (disagreeing edges).
        """
        sheaf = self.generate_sheaf_from_biome()
        energy = sheaf.compute_laplacian_energy()
        h1_obstructions = sheaf.detect_h1_obstructions()

        barcode = {
            "H0_components": 1,
            "H1_bars": len(h1_obstructions),
            "energy": energy,
            "obstructions": h1_obstructions
        }
        return barcode

    def log_filtration(self, filtration_step: int, out_file: str = "docs/bnatsheaf/ph_log.json"):
        """
        Logs the barcode at a given step.
        """
        barcode = self.generate_barcode()
        barcode['step'] = filtration_step

        log_data = []
        if os.path.exists(out_file):
            with open(out_file, 'r') as f:
                try:
                    log_data = json.load(f)
                except json.JSONDecodeError:
                    log_data = []

        log_data.append(barcode)

        with open(out_file, 'w') as f:
            json.dump(log_data, f, indent=2)

        return barcode
