#!/usr/bin/env python3
"""
Logs the current PH barcode to a log file to track filtrations over time.
"""
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from bnatsheaf.ph import PHLayer

def main():
    log_file = "docs/bnatsheaf/ph_log.json"

    # Simple filtration step based on unix timestamp
    step = int(time.time())

    try:
        ph_layer = PHLayer()
        barcode = ph_layer.log_filtration(step, log_file)

        print(f"Logged PH step {step}. E(x)={barcode.get('energy')}, H^1={barcode.get('H1_bars')}")
    except Exception as e:
        print(f"Failed to log PH filtration: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
