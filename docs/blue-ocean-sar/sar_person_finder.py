"""
Blue Ocean SAR Satellite Person & Anomaly Finder Engine
Grounded in Synthetic Aperture Radar (SAR) processing & Search and Rescue (WiSAR) algorithms.
"""

import argparse
import json
import math  # noqa: F401  (kept from original)
from typing import Dict, List, Tuple

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

from provenance import DataSource, provenance_block, require_provenance

# NOT VALIDATED on real SAR scenes. Scores are relative rankings, not probabilities.


class SatelliteSARAnomalyDetector:
    """
    Processes real satellite SAR backscatter data (e.g., Sentinel-1 GRD/SLC or VHR SAR)
    to detect coherent scatterers, man-made object anomalies (shelters, vehicles, gear),
    and backscatter deviations.
    """

    def __init__(self, despeckle_window: int = 5):
        self.despeckle_window = despeckle_window

    def intensity_to_db(self, intensity_matrix: np.ndarray) -> np.ndarray:
        """
        Converts SAR linear intensity values to decibels (dB) to normalize gamma distributions.
        Grounded in Capella/Sentinel-1 VHR SAR processing pipelines.
        """
        intensity_clean = np.maximum(intensity_matrix, 1e-6)
        return 10.0 * np.log10(intensity_clean)

    def lee_despeckle_filter(self, img_db: np.ndarray) -> np.ndarray:
        """
        Applies Lee despeckling filter to suppress multiplicative radar speckle noise
        while preserving spatial edges and strong point scatterers.
        """
        size = self.despeckle_window
        padding = size // 2
        padded = np.pad(img_db, padding, mode="reflect")

        # Local mean and variance calculation (vectorised; same result as the
        # original per-pixel loop below, which took ~2.4 s for 400x400 and would
        # take tens of minutes on a full satellite scene).
        windows = sliding_window_view(padded, (size, size))
        local_mean = windows.mean(axis=(-2, -1))
        local_var = windows.var(axis=(-2, -1))
        # Original loop, kept for reference (owner's no-delete rule):
        # local_mean = np.zeros_like(img_db)
        # local_var = np.zeros_like(img_db)
        # for i in range(img_db.shape[0]):
        #     for j in range(img_db.shape[1]):
        #         patch = padded[i:i+size, j:j+size]
        #         local_mean[i, j] = np.mean(patch)
        #         local_var[i, j] = np.var(patch)

        overall_var = np.var(img_db)
        weights = local_var / (local_var + overall_var + 1e-6)
        filtered = local_mean + weights * (img_db - local_mean)
        return filtered

    def detect_coherent_scatterers(self, img_db: np.ndarray, k_sigma: float = 3.0) -> Tuple[np.ndarray, np.ndarray]:
        """
        Detects Coherent Scatterers (CS) representing high-reflectivity targets (vehicles, metallic gear,
        improvised structures) against natural clutter background using dynamic CFAR thresholding.
        """
        filtered = self.lee_despeckle_filter(img_db)
        mean_val = np.mean(filtered)
        std_val = np.std(filtered)
        threshold = mean_val + k_sigma * std_val

        cs_mask = filtered > threshold
        confidence_map = np.clip((filtered - mean_val) / (k_sigma * std_val + 1e-6), 0.0, 1.0)
        return cs_mask, confidence_map


class WiSARProbabilisticMotionModel:
    """
    Computes probabilistic lost-person spatial distribution based on Last Known Position (LKP),
    elapsed search time, and terrain movement decay.
    """

    def __init__(self, lkp_lat: float, lkp_lon: float, mean_speed_kmh: float = 2.5):
        self.lkp_lat = lkp_lat
        self.lkp_lon = lkp_lon
        self.mean_speed_kmh = mean_speed_kmh

    def compute_spatial_pdf(self, grid_lats: np.ndarray, grid_lons: np.ndarray, elapsed_hours: float) -> np.ndarray:
        """
        Generates 2D probability density function (PDF) map for target location.
        Uses Gaussian decay around LKP scaled by expected travel radius.
        """
        R_earth = 6371.0  # km

        # Convert lat/lon offset to distance in km
        dlat = np.radians(grid_lats - self.lkp_lat)
        dlon = np.radians(grid_lons - self.lkp_lon)

        a = (
            np.sin(dlat / 2.0) ** 2
            + np.cos(np.radians(self.lkp_lat)) * np.cos(np.radians(grid_lats)) * np.sin(dlon / 2.0) ** 2
        )
        c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
        distance_km = R_earth * c

        expected_radius = max(self.mean_speed_kmh * elapsed_hours, 0.5)
        sigma = expected_radius / 2.0

        # Gaussian PDF model over search grid
        pdf = np.exp(-0.5 * (distance_km / sigma) ** 2)
        pdf /= np.sum(pdf) + 1e-9
        return pdf


class BlueOceanSARPersonFinder:
    """
    Unified Engine fusing Satellite SAR Coherent Scatterer Detection with Lost-Person Motion Models
    to extract real geographic coordinates for Search and Rescue ground teams.
    """

    def __init__(self, lkp_lat: float, lkp_lon: float):
        self.sar_detector = SatelliteSARAnomalyDetector()
        self.motion_model = WiSARProbabilisticMotionModel(lkp_lat, lkp_lon)
        self.lkp_lat = lkp_lat
        self.lkp_lon = lkp_lon

    def process_sar_scene(
        self,
        sar_intensity_data: np.ndarray,
        grid_lats: np.ndarray,
        grid_lons: np.ndarray,
        elapsed_hours: float,
        top_n: int = 5,
        min_separation_px: int = 2,
        sources=None,
    ) -> List[Dict]:
        """
        Reprocesses SAR satellite data, fuses with spatial motion PDF, and extracts real coordinates.

        sources: DataSource list naming the SAR scene (and anything else used).
        Without it this raises MissingSourceError instead of returning locations.
        """
        prov = provenance_block(sources)
        # 1. Convert SAR intensity to dB scale & detect scatterer anomalies
        img_db = self.sar_detector.intensity_to_db(sar_intensity_data)
        cs_mask, sar_confidence = self.sar_detector.detect_coherent_scatterers(img_db)

        # 2. Compute motion probability density function (PDF)
        motion_pdf = self.motion_model.compute_spatial_pdf(grid_lats, grid_lons, elapsed_hours)
        motion_confidence = motion_pdf / (np.max(motion_pdf) + 1e-9)

        # 3. Fuse SAR anomaly confidence with Motion probability map
        fused_score = sar_confidence * motion_confidence

        # 4. Extract top candidate target coordinates
        flat_indices = np.argsort(fused_score.ravel())[::-1]
        results = []
        seen_coords = set()
        picked = []  # (row, col) of accepted targets, for non-maximum suppression

        for idx in flat_indices:
            r, c = np.unravel_index(idx, fused_score.shape)
            # One bright object spreads over neighbouring pixels after despeckling;
            # without this check, rank 2..n were often the same object's neighbours.
            if any(max(abs(r - pr), abs(c - pc)) <= min_separation_px for pr, pc in picked):
                continue
            picked.append((r, c))
            lat = float(grid_lats[r, c])
            lon = float(grid_lons[r, c])
            coord_key = (round(lat, 5), round(lon, 5))

            if coord_key in seen_coords:
                continue
            seen_coords.add(coord_key)

            results.append(
                {
                    "rank": len(results) + 1,
                    "latitude": lat,
                    "longitude": lon,
                    "fused_confidence": float(fused_score[r, c]),
                    "sar_backscatter_db": float(img_db[r, c]),
                    "sar_anomaly_score": float(sar_confidence[r, c]),
                    "motion_pdf_weight": float(motion_confidence[r, c]),
                    "provenance": prov,
                }
            )

            if len(results) >= top_n:
                break

        return results


def run_demo(out_path: str = "candidates.geojson"):
    print("Initializing Blue Ocean SAR Satellite Person Finder...")
    # Real-world scenario coordinates: Wilderness region near Mount Seymour / Cascade range
    lkp_lat, lkp_lon = 49.3850, -122.9450  # Mount Seymour LKP

    # Generate 50x50 search grid spanning ~5km x 5km
    lat_vec = np.linspace(49.3600, 49.4100, 50)
    lon_vec = np.linspace(-122.9700, -122.9200, 50)
    grid_lons, grid_lats = np.meshgrid(lon_vec, lat_vec)

    # Create realistic SAR intensity scene background clutter + target reflections
    np.random.seed(42)
    sar_intensity = np.random.gamma(shape=2.0, scale=1.0, size=(50, 50))  # Rayleigh/Gamma speckle clutter

    # Inject real physical target scatterers (e.g., stranded vehicle at row 22, col 28;
    # temporary tarp/shelter at row 30, col 20)
    sar_intensity[22, 28] += 85.0  # High backscatter point
    sar_intensity[30, 20] += 60.0  # Medium-high backscatter point

    finder = BlueOceanSARPersonFinder(lkp_lat, lkp_lon)
    candidates = finder.process_sar_scene(
        sar_intensity_data=sar_intensity,
        grid_lats=grid_lats,
        grid_lons=grid_lons,
        elapsed_hours=6.0,
        top_n=5,
        sources=[DataSource("random gamma speckle with two injected bright points", "synthetic")],
    )

    print("\n--- PRIORITIZED SEARCH AND RESCUE TARGET LOCATIONS ---")
    print(json.dumps(candidates, indent=2))

    # Export to GeoJSON
    features = []
    for cand in candidates:
        require_provenance(cand)
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [cand["longitude"], cand["latitude"]]},
                "properties": cand,
            }
        )
    geojson_out = {"type": "FeatureCollection", "features": features}
    # with open("/workspace/scratch/sar_person_finder/candidates.geojson", "w") as f:  # original fixed path
    with open(out_path, "w") as f:
        json.dump(geojson_out, f, indent=2)
    print("\nSuccessfully exported candidate target locations to GeoJSON.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Blue Ocean SAR person finder demo (synthetic scene)")
    ap.add_argument("--out", default="candidates.geojson", help="GeoJSON output path")
    run_demo(ap.parse_args().out)
