#!/usr/bin/env python3
"""
Checks the current BIOME status for sheaf consistency (H1 ~ 0).
Used as a gating mechanism before allowing agents to commit or deploy.
"""
import sys
import os

# Add parent dir to path to import bnatsheaf
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from bnatsheaf.ph import PHLayer

def main():
    try:
        ph_layer = PHLayer()
        barcode = ph_layer.generate_barcode()

        energy = barcode.get('energy', 0.0)
        h1_bars = barcode.get('H1_bars', 0)

        print(f"BNAT Sheaf Laplacian Energy E(x): {energy}")
        print(f"H^1 Obstructions: {h1_bars}")

        if h1_bars > 0:
            print("\n[ERROR] System is NOT topologically consistent.")
            print("Obstructions found on edges:")
            for obs in barcode.get('obstructions', []):
                print(f"  - {obs[0]} <-> {obs[1]}")
            sys.exit(1)
        else:
            print("\n[OK] System is topologically consistent (H^1 ~ 0).")
            sys.exit(0)

    except Exception as e:
        print(f"Error checking consistency: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
