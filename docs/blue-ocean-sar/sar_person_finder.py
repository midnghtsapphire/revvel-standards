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

# What was wrong: exports used the lenient check, so a location with no named source could be written to
# GeoJSON as if it were clean. Lesson: the place a location leaves the program is where to refuse (H1).
# from provenance import DataSource, provenance_block, require_provenance
from provenance import DataSource, provenance_block, require_export_provenance

# NOT VALIDATED on real SAR scenes. Scores are relative rankings, not probabilities.

# Units label for backscatter when no calibration constant is supplied. The
# earlier "calibration to Sigma0" was DN squared with no calibration LUT, so it
# is labelled for what it is (SYSTEM_REVIEW C1).
UNCALIBRATED_UNITS = "uncalibrated DN^2"


def _box_sum(x: np.ndarray, half: int) -> np.ndarray:
    """Sum over the (2*half+1)^2 window centred on each cell (reflect padding at edges)."""
    size = 2 * half + 1
    padded = np.pad(x, half, mode="reflect")
    c = np.cumsum(np.cumsum(padded, axis=0), axis=1)
    c = np.pad(c, ((1, 0), (1, 0)))
    return c[size:, size:] - c[:-size, size:] - c[size:, :-size] + c[:-size, :-size]


def cfar_alpha(n_train: int, pfa: float) -> float:
    """CA-CFAR threshold multiplier for N training cells and false-alarm rate Pfa.

    alpha = N * (Pfa^(-1/N) - 1). Exact for single-look (exponential) intensity
    in homogeneous clutter. For multi-look (gamma) intensity the tail is lighter,
    so the real false-alarm rate is lower than Pfa (conservative)."""
    if not 0.0 < pfa < 1.0:
        raise ValueError(f"pfa must be in (0, 1), got {pfa!r}")
    if n_train < 1:
        raise ValueError(f"need at least one training cell, got {n_train}")
    return n_train * (pfa ** (-1.0 / n_train) - 1.0)


def ca_cfar(intensity: np.ndarray, guard: int = 2, train: int = 4, pfa: float = 1e-6):
    """Cell-averaging CFAR on LINEAR intensity (not dB).

    For each cell, the clutter level is the mean of the training ring: the
    (2*(guard+train)+1)^2 window minus the (2*guard+1)^2 guard block around
    the cell under test. The cell is a detection when it exceeds
    alpha * clutter_mean, with alpha from cfar_alpha(N, pfa).

    Returns (detections, ratio, threshold, n_train): detections is a bool mask,
    ratio is intensity / threshold (> 1 means detected). Run it on unfiltered
    intensity: despeckling correlates neighbouring cells, which voids the Pfa."""
    x = np.asarray(intensity, dtype=np.float64)
    if x.ndim != 2:
        raise ValueError("intensity must be a 2-D array")
    if not np.all(np.isfinite(x)) or np.any(x < 0):
        raise ValueError("intensity must be finite and non-negative (linear power, not dB)")
    if guard < 0 or train < 1:
        raise ValueError("guard must be >= 0 and train >= 1")
    outer = guard + train
    n_train = (2 * outer + 1) ** 2 - (2 * guard + 1) ** 2
    clutter = (_box_sum(x, outer) - _box_sum(x, guard)) / n_train
    threshold = cfar_alpha(n_train, pfa) * clutter
    ratio = x / np.maximum(threshold, np.finfo(np.float64).tiny)
    return x > threshold, ratio, threshold, n_train


def lee_filter_intensity(intensity: np.ndarray, size: int = 5, enl: float = 1.0) -> np.ndarray:
    """Lee filter on LINEAR intensity, speckle variance set by the looks.

    Multiplicative speckle has normalised variance Cu^2 = 1/ENL. With local
    mean m and variance v over a size x size window, the signal variance is
    var_x = (v - m^2 Cu^2) / (1 + Cu^2) (floored at 0) and the output is
    m + (var_x / v) * (I - m). Homogeneous clutter is smoothed towards m;
    strong point scatterers (v >> m^2 Cu^2) are kept."""
    if size < 1 or size % 2 == 0:
        raise ValueError(f"window size must be a positive odd number, got {size}")
    if enl <= 0:
        raise ValueError(f"enl must be > 0, got {enl}")
    x = np.asarray(intensity, dtype=np.float64)
    half, n = size // 2, size * size
    mean = _box_sum(x, half) / n
    var = np.maximum(_box_sum(x * x, half) / n - mean ** 2, 0.0)
    cu2 = 1.0 / enl
    var_x = np.maximum((var - mean ** 2 * cu2) / (1.0 + cu2), 0.0)
    weight = np.divide(var_x, var, out=np.zeros_like(var), where=var > 0)
    return mean + weight * (x - mean)


class SatelliteSARAnomalyDetector:
    """
    Processes real satellite SAR backscatter data (e.g., Sentinel-1 GRD/SLC or VHR SAR)
    to detect coherent scatterers, man-made object anomalies (shelters, vehicles, gear),
    and backscatter deviations.
    """

    # What was wrong: the only setting was a window size. A real CFAR needs a false-alarm rate and window
    # sizes, and a Lee filter needs the number of looks; none existed, so neither method could be real (C1).
    # def __init__(self, despeckle_window: int = 5):
    def __init__(
        self,
        despeckle_window: int = 5,
        enl: float = 1.0,
        pfa: float = 1e-6,
        guard_cells: int = 2,
        train_cells: int = 4,
        calibration_constant: float = None,
    ):
        """enl: equivalent number of looks of the input (1 = single-look).
        pfa: CA-CFAR false-alarm rate per cell. guard_cells/train_cells: CFAR
        window half-widths. calibration_constant: divisor K so that
        sigma0 = intensity / K (e.g. the squared Sentinel-1 sigmaNought LUT
        value). Without it, backscatter is reported as "uncalibrated DN^2"."""
        self.despeckle_window = despeckle_window
        self.enl = enl
        self.pfa = pfa
        self.guard_cells = guard_cells
        self.train_cells = train_cells
        self.calibration_constant = calibration_constant

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

        DEPRECATED (SYSTEM_REVIEW C1): this works on dB and uses the scene
        variance as the noise variance, which is not the Lee model. It is no
        longer used for detection; see lee_filter_intensity().
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

    def lee_filter_intensity(self, intensity: np.ndarray) -> np.ndarray:
        """Lee filter on linear intensity with speckle variance 1/ENL."""
        return lee_filter_intensity(intensity, self.despeckle_window, self.enl)

    def calibrate(self, intensity: np.ndarray) -> Tuple[np.ndarray, str]:
        """(values, units): sigma0 when a calibration constant is set, else uncalibrated."""
        if self.calibration_constant is None:
            return np.asarray(intensity, dtype=np.float64), UNCALIBRATED_UNITS
        if not self.calibration_constant > 0:
            raise ValueError("calibration_constant must be > 0")
        return (
            np.asarray(intensity, dtype=np.float64) / self.calibration_constant,
            f"sigma0 (intensity / calibration constant {self.calibration_constant:g})",
        )

    def detect_cfar(self, intensity: np.ndarray):
        """CA-CFAR on linear intensity: (detections, ratio, threshold, n_train)."""
        return ca_cfar(intensity, self.guard_cells, self.train_cells, self.pfa)

    def detect_coherent_scatterers(self, img_db: np.ndarray, k_sigma: float = 3.0) -> Tuple[np.ndarray, np.ndarray]:
        """
        Detects Coherent Scatterers (CS) representing high-reflectivity targets (vehicles, metallic gear,
        improvised structures) against natural clutter background using dynamic CFAR thresholding.

        Now converts dB back to linear intensity and runs CA-CFAR at self.pfa;
        k_sigma is ignored (the threshold comes from the false-alarm rate).
        Returns (detections, intensity / threshold).
        """
        # What was wrong: "CFAR" came from AI-generated material (NotebookLM / chatbot output) and was
        # never run against real data.
        # The code was a whole-scene z-score (mean + 3 std): no false-alarm rate, so pure noise produced
        # "targets". Lesson: a method's name is not the method; check the maths and test on noise (C1).
        # filtered = self.lee_despeckle_filter(img_db)
        # mean_val = np.mean(filtered)
        # std_val = np.std(filtered)
        # threshold = mean_val + k_sigma * std_val
        #
        # cs_mask = filtered > threshold
        # confidence_map = np.clip((filtered - mean_val) / (k_sigma * std_val + 1e-6), 0.0, 1.0)
        # return cs_mask, confidence_map
        detections, ratio, _, _ = self.detect_cfar(10.0 ** (np.asarray(img_db, dtype=np.float64) / 10.0))
        return detections, ratio


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
        allow_unverified: bool = False,
    ) -> List[Dict]:
        """
        Reprocesses SAR satellite data, fuses with spatial motion PDF, and extracts real coordinates.

        sar_intensity_data: LINEAR intensity (not dB, not amplitude).
        sources: DataSource list naming the SAR scene (and anything else used).
        Without it this raises MissingSourceError instead of returning locations;
        allow_unverified=True (demos only) falls back to provenance.STRICT.

        Only cells that pass CA-CFAR at the detector's Pfa are candidates. When
        nothing passes, the result is an empty list: no targets, not "the
        least-dim noise". fused_score = (intensity / CFAR threshold) x motion
        weight; it ranks candidates and is not a probability.
        """
        # What was wrong: the docstring promised a refusal without sources, but default mode returned
        # locations anyway. Lesson: a promise in a docstring needs a test that fails when it is broken (H1).
        # prov = provenance_block(sources)
        prov = provenance_block(sources, strict=None if allow_unverified else True)
        det = self.sar_detector
        # 1. Convert SAR intensity to dB scale & detect scatterer anomalies
        # What was wrong: the "Lee filter" and "CFAR" steps, named in AI-generated material
        # (NotebookLM / chatbot output),
        # ran on dB with a global z-score. Speckle is multiplicative in linear intensity, so both steps
        # were in the wrong domain, and neither was the named method (C1).
        # img_db = self.sar_detector.intensity_to_db(sar_intensity_data)
        # cs_mask, sar_confidence = self.sar_detector.detect_coherent_scatterers(img_db)
        intensity = np.asarray(sar_intensity_data, dtype=np.float64)
        cs_mask, cfar_ratio, _, n_train = det.detect_cfar(intensity)
        backscatter, units = det.calibrate(det.lee_filter_intensity(intensity))
        img_db = det.intensity_to_db(backscatter)

        # 2. Compute motion probability density function (PDF)
        motion_pdf = self.motion_model.compute_spatial_pdf(grid_lats, grid_lons, elapsed_hours)
        motion_confidence = motion_pdf / (np.max(motion_pdf) + 1e-9)

        # 3. Fuse SAR anomaly confidence with Motion probability map
        # What was wrong: every pixel got a score, so ranking always returned top_n "targets" even
        # with nothing there. Lesson: a ranking needs a threshold before it, or noise gets ranked (C1).
        # fused_score = sar_confidence * motion_confidence
        fused_score = cfar_ratio * motion_confidence

        # 4. Extract top candidate target coordinates
        # What was wrong: this sorted every pixel in the scene, so the output could never be empty (C1).
        # flat_indices = np.argsort(fused_score.ravel())[::-1]
        detected = np.flatnonzero(cs_mask.ravel())
        flat_indices = detected[np.argsort(fused_score.ravel()[detected])[::-1]]
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
                    # What was wrong: "confidence" reads as a probability on a map, but the value is a
                    # product of two unitless weights. Lesson: name a number for what it is (C1).
                    # "fused_confidence": float(fused_score[r, c]),
                    "fused_score": float(fused_score[r, c]),
                    "sar_backscatter_db": float(img_db[r, c]),
                    "backscatter_units": units,
                    # What was wrong: a z-score clipped to 0..1 looked like a probability and was not one (C1).
                    # "sar_anomaly_score": float(sar_confidence[r, c]),
                    "cfar_ratio": float(cfar_ratio[r, c]),
                    "cfar_pfa": det.pfa,
                    "cfar_training_cells": n_train,
                    "motion_pdf_weight": float(motion_confidence[r, c]),
                    "provenance": prov,
                }
            )

            if len(results) >= top_n:
                break

        return results


def run_demo(out_path: str = "candidates.geojson", allow_unverified: bool = False):
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
        allow_unverified=allow_unverified,
    )

    print("\n--- PRIORITIZED SEARCH AND RESCUE TARGET LOCATIONS ---")
    print(json.dumps(candidates, indent=2))

    # Export to GeoJSON
    features = []
    for cand in candidates:
        # What was wrong: the lenient check let an unsourced location be exported (H1).
        # require_provenance(cand)
        require_export_provenance(cand, allow_unverified=allow_unverified)
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
    ap.add_argument("--demo", "--allow-unverified", dest="allow_unverified", action="store_true",
                    help="export even when sources are missing or incomplete (labelled UNSOURCED); demos only")
    # Nothing wrong with this line itself; it changed so --demo can reach the strict export (H1).
    # run_demo(ap.parse_args().out)
    _args = ap.parse_args()
    run_demo(_args.out, allow_unverified=_args.allow_unverified)
