"""
Master Multi-Band Sensor, Wave Physics & Empirical Taphonomy Pipeline (Version 2.0)
Integrates X, C, S, L, P, Ka-Band SAR, VSWIR Hyperspectral, SIF, GNSS-R, Thermal MWIR/LWIR, GPR, ERT & Gravimetry.

NOT VALIDATED. "fused_probability" is a hand-weighted score (0.45/0.25/0.20/0.10),
not a calibrated probability: it has never been fit to or tested against known
cases. Do not report it as a likelihood. See README.md.
"""

import json
import math
import os

from provenance import DataSource, provenance_block

# Unused in this script; kept commented rather than deleted.
# import numpy as np
# import sqlite3

DEFAULT_CONFIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "master_sensor_wave_search_pipeline_v2.json")


class MultiBandWaveEngineV2:
    # Original default only existed on the author's machine:
    # def __init__(self, config_file="/workspace/scratch/master_sensor_wave_search_pipeline_v2.json"):
    def __init__(self, config_file=DEFAULT_CONFIG):
        with open(config_file, "r") as f:
            self.config = json.load(f)
        self.cal = self.config["empirical_calibration_baselines"]

    def calculate_gpr_physics(self, er_soil=25.0, er_target=3.0):
        # Fresnel reflection coefficient at normal incidence
        sqrt_soil = math.sqrt(er_soil)
        sqrt_target = math.sqrt(er_target)
        R = (sqrt_soil - sqrt_target) / (sqrt_soil + sqrt_target)

        # Two-way wave propagation velocity v = c / sqrt(er) where c = 0.3 m/ns
        c = 0.3
        v_soil = c / sqrt_soil
        v_target = c / sqrt_target
        return R, v_soil, v_target

    # Original signature: SWIR and SIF silently defaulted to 0.15 / 0.85, so a
    # call with no hyperspectral data still produced a confident-looking score.
    # def evaluate_multi_band_node(
    #     self, x, y, z_depth, er_observed, er_baseline=25.0, swir_1720_reflectance=0.15, sif_stress=0.85
    # ):
    def evaluate_multi_band_node(
        self,
        x,
        y,
        z_depth,
        er_observed,
        er_baseline=25.0,
        swir_1720_reflectance=None,
        sif_stress=None,
        sources=None,
    ):
        """sources: DataSource list for the inputs. Raises MissingSourceError without it.
        Inputs left unset fall back to the original defaults and are listed in
        "assumed_inputs", which marks the result as built on estimates."""
        assumed = {"er_baseline": er_baseline} if er_baseline == 25.0 else {}
        if swir_1720_reflectance is None:
            swir_1720_reflectance = 0.15
            assumed["swir_1720_reflectance"] = 0.15
        if sif_stress is None:
            sif_stress = 0.85
            assumed["sif_stress"] = 0.85
        # Both are normalised indices; values outside [0, 1] pushed the score past 100.
        for name, value in (("swir_1720_reflectance", swir_1720_reflectance), ("sif_stress", sif_stress)):
            if not isinstance(value, (int, float)) or not math.isfinite(value) or not 0.0 <= value <= 1.0:
                raise ValueError(f"{name} must be a finite number in [0, 1], got {value!r}")
        sources = list(sources) if isinstance(sources, (list, tuple)) else ([sources] if sources else [])
        if assumed and sources:
            sources.append(DataSource("default values used for: " + ", ".join(sorted(assumed)), "estimate"))
        prov = provenance_block(sources)

        R, v_soil, v_target = self.calculate_gpr_physics(er_soil=er_baseline, er_target=er_observed)

        # Probability score based on multi-sensor wave alignment:
        # 1. Dielectric shift towards Adipocere (er ~ 3.0)
        dielectric_score = max(0.0, 1.0 - abs(er_observed - self.cal["adipocere_dielectric_constant"]) / 22.0)

        # 2. SWIR Lipid Absorption (1720 nm dip)
        lipid_score = 1.0 - swir_1720_reflectance if swir_1720_reflectance < 0.3 else 0.2

        # 3. Pre-visual SIF plant stress
        stress_score = sif_stress

        # 4. P-band and L-band Canopy/Subsurface Penetration Weight
        penetration_weight = 0.95 if z_depth <= 3.0 else 0.50

        fused_prob = 0.45 * dielectric_score + 0.25 * lipid_score + 0.20 * stress_score + 0.10 * penetration_weight

        return {
            "coords": {"x": x, "y": y, "z_depth_m": z_depth},
            "fused_probability": round(fused_prob * 100, 2),
            "gpr_reflection_coefficient": round(R, 4),
            "wave_velocity_m_ns": round(v_target, 4),
            "dielectric_er": er_observed,
            "swir_lipid_absorption_flag": bool(swir_1720_reflectance < 0.20),
            "sif_plant_stress_index": sif_stress,
            "score_is_calibrated_probability": False,
            "assumed_inputs": assumed,
            "provenance": prov,
        }


if __name__ == "__main__":
    engine = MultiBandWaveEngineV2()
    R, v1, v2 = engine.calculate_gpr_physics()
    print("Master Multi-Band Wave Engine v2 Initialized successfully!")
    print(f"Dielectric Contrast: Soil={25.0} vs Target={3.0} -> Reflection Coeff R={R:.4f}")
    print(f"Wave Velocity: Soil={v1:.3f} m/ns | Adipocere Mass={v2:.3f} m/ns")

    # Test evaluation
    result = engine.evaluate_multi_band_node(
        x=2.5,
        y=-1.8,
        z_depth=1.2,
        er_observed=3.1,
        swir_1720_reflectance=0.12,
        sif_stress=0.92,
        sources=[DataSource("example values typed into this script", "synthetic")],
    )
    print("Multi-Band Fusion Result:", json.dumps(result, indent=2))
