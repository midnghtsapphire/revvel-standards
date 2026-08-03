#!/usr/bin/env python3
"""
Imprint-at-Spawn script.
Forces an agent to read the global Knowledge Sheaf before starting its work.
Fails if the system is currently obstructed (H^1 > 0).
"""
import sys
import os

# Add parent dir to path to import bnatsheaf
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from bnatsheaf.ph import PHLayer

def main():
    agent_id = sys.argv[1] if len(sys.argv) > 1 else "unknown_agent"

    print(f"[{agent_id}] Initiating imprint-at-spawn sequence...")

    try:
        ph_layer = PHLayer()
        barcode = ph_layer.generate_barcode()

        if barcode.get('H1_bars', 0) > 0:
            print(f"[{agent_id}] FATAL: Cannot spawn agent. Knowledge Sheaf is obstructed (H^1 > 0).")
            print(f"[{agent_id}] Fix obstructions first or override if you are the MOTU.")
            sys.exit(1)

        print(f"[{agent_id}] Imprint successful. System energy is {barcode.get('energy', 0.0)}.")
        sys.exit(0)

    except FileNotFoundError:
        print(f"[{agent_id}] Warning: BIOME feed not found, bypassing imprint (assuming fresh start).")
        sys.exit(0)
    except Exception as e:
        print(f"[{agent_id}] Error during imprint: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
