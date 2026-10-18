#!/usr/bin/env python3
"""
==============================================================================
AI DECONSTRUCT - PROSECUTE - RECURSE TEST HARNESS
==============================================================================
Demonstrates the 3-stage deterministic execution loop:
  1. DECOMPOSE: Break complex SAR/lab state into atomic, modular arrays.
  2. PROSECUTE: Hold data to strict guard clauses & mathematical assertions.
  3. RECURSE:   Traverse hierarchical spatial/sector trees until Guard Exit.
==============================================================================
"""

import sys
import numpy as np

# =============================================================================
# STAGE 1: DECOMPOSE
# =============================================================================
class Decomposer:
    """Decomposes a complex SAR target search space into atomic feature vectors."""
    @staticmethod
    def decompose_sector(sector_data):
        """Breaks unorganized sector payloads into clean, isolated state arrays."""
        return {
            "sector_id": sector_data.get("id", "UNKNOWN"),
            "depth_m": sector_data.get("depth", None),
            "edna_yield_ng_ul": sector_data.get("edna_yield", None),
            "control_yield_ng_ul": sector_data.get("control_yield", None),
            "gpr_ringdown": sector_data.get("gpr_ringdown", False),
            "sub_sectors": sector_data.get("sub_sectors", [])
        }


# =============================================================================
# STAGE 2: PROSECUTE
# =============================================================================
class Prosecutor:
    """Prosecutes atomic data against strict, uncompromising guard clauses."""
    @staticmethod
    def prosecute_target(decomposed):
        """
        Applies dual-sided Guard Clauses & Assertions.
        Returns (Status, Reason, Confidence)
        """
        s_yield = decomposed["edna_yield_ng_ul"]
        c_yield = decomposed["control_yield_ng_ul"]

        # Dual-Side Guard Exit: Stop immediately if both sides are NULL/None
        if s_yield is None and c_yield is None:
            return ("GUARD_EXIT", "Dual-Side NULL (0 Tokens Consumed)", 0.0)

        # Handle missing control (Pair with Master Control Baseline 0.02)
        effective_control = c_yield if c_yield is not None else 0.02
        effective_sample = s_yield if s_yield is not None else 0.0

        # Gate 0 Prosecution Assertion: Sample >= 0.25 ng/uL
        if effective_sample < 0.25:
            return ("REJECTED", f"eDNA Yield ({effective_sample:.2f} ng/µL) below 0.25 Threshold", 0.0)

        # Differential Check: Sample must be at least 5x control
        differential_ratio = effective_sample / max(0.001, effective_control)
        if differential_ratio < 5.0:
            return ("REJECTED", f"Sample-to-Control Ratio ({differential_ratio:.1f}x) insufficient", 0.1)

        # GPR Verification Prosecution
        if decomposed["gpr_ringdown"]:
            confidence = min(0.98, 0.85 + (differential_ratio * 0.01))
            return ("PROSECUTED_HIGH_CONFIDENCE", f"Valid eDNA ({effective_sample:.2f} ng/µL) + GPR Ringdown Confirmed", confidence)
        else:
            return ("PROSECUTED_MEDIUM_CONFIDENCE", f"Valid eDNA ({effective_sample:.2f} ng/µL), awaiting GPR confirmation", 0.75)


# =============================================================================
# STAGE 3: RECURSE
# =============================================================================
class Recurser:
    """Recursively traverses spatial trees using Prosecutor guard exits."""
    def __init__(self):
        self.results_log = []

    def recurse_tree(self, node, depth=0):
        indent = "  " * depth
        # Step 1: Decompose current node
        decomposed = Decomposer.decompose_sector(node)
        sector_id = decomposed["sector_id"]

        # Step 2: Prosecute current node
        status, reason, conf = Prosecutor.prosecute_target(decomposed)
        
        self.results_log.append({
            "sector": sector_id,
            "depth": depth,
            "status": status,
            "reason": reason,
            "confidence": conf
        })

        print(f"{indent}► Sector [{sector_id}] (Depth {depth}): {status} -> {reason}")

        # Guard Exit: If Guard Exit or Rejected, do NOT waste CPU recursing empty leaves
        if status == "GUARD_EXIT":
            print(f"{indent}  └─ [HALT RECURSION] Guard Exit Hit. Tree Pruned.")
            return

        # Step 3: Recurse through sub-sectors
        for child in decomposed["sub_sectors"]:
            self.recurse_tree(child, depth + 1)


# =============================================================================
# HARNESS VERIFICATION MAIN
# =============================================================================
def main():
    print("=" * 75)
    print("  AI DECONSTRUCT -> PROSECUTE -> RECURSE DETERMINISTIC HARNESS")
    print("=" * 75)

    # Hierarchical Sector Tree Payload
    sample_tree = {
        "id": "BURFIELD_CATCHMENT_SECTOR_A",
        "depth": 0.85,
        "edna_yield": 0.48,
        "control_yield": 0.04,
        "gpr_ringdown": True,
        "sub_sectors": [
            {
                "id": "TARGET_DELTA_SUB_01",
                "depth": 1.10,
                "edna_yield": 0.32,
                "control_yield": 0.03,
                "gpr_ringdown": True,
                "sub_sectors": [
                    {
                        "id": "DEEP_CREVICE_VOID",
                        "depth": 1.40,
                        "edna_yield": None,  # Will trigger Guard Exit
                        "control_yield": None,
                        "gpr_ringdown": False,
                        "sub_sectors": []
                    }
                ]
            },
            {
                "id": "SURFACE_RUNOFF_SUB_02",
                "depth": 0.30,
                "edna_yield": 0.08, # Fails Gate 0 Prosecution (< 0.25)
                "control_yield": 0.02,
                "gpr_ringdown": False,
                "sub_sectors": []
            }
        ]
    }

    runner = Recurser()
    runner.recurse_tree(sample_tree)

    print("\n" + "=" * 75)
    print("  PROSECUTION SUMMARY REPORT")
    print("=" * 75)
    high_conf = [r for r in runner.results_log if "HIGH_CONFIDENCE" in r["status"]]
    print(f"Total Sectors Evaluated : {len(runner.results_log)}")
    print(f"High-Confidence Targets : {len(high_conf)}")
    for h in high_conf:
        print(f"  🚨 TARGET: {h['sector']} | Conf: {int(h['confidence']*100)}% | Details: {h['reason']}")
    print("=" * 75)

if __name__ == "__main__":
    main()
