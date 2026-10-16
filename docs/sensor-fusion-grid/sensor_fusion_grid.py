#!/usr/bin/env python3
"""
Multi-sensor fusion on a 3D voxel grid (default 15 x 15 x 20).

Fuses four remote-sensing inputs into one anomaly score per voxel and extracts
the peak anomaly with confidence metrics:

  sensor               shape        anomalous when
  P-band SAR (dB)      2D surface   higher than background (disturbed/capped ground)
  thermal LWIR delta   2D surface   warmer or cooler than background (|delta|)
  SIF stress index     2D surface   higher stress (0..1)
  permittivity er      3D volume    lower than the moist host soil (void/fill/target)

Each input is turned into a robust z-score (median / MAD), mapped to 0..1 with a
logistic, and combined with weights. Surface layers apply to every depth and are
damped with depth; permittivity is the only input that localises in depth. The
fused value is reported as 0-100 %.

The fused score is a weighted anomaly index on a 0-100 scale, not a calibrated
probability: turning it into one needs ground-truthed labels. The default
weights are illustrative. All inputs from --simulate are synthetic.

Because the grid has thousands of voxels, pure noise alone yields high-scoring
voxels (about 70 % on the default grid). The peak is therefore tested against a
permutation null: each sensor's values are shuffled across space, the grid is
re-fused, and the empirical p-value is the share of shuffles whose maximum
reaches the observed peak.

Usage:
    python3 sensor_fusion_grid.py --out fusion.json --plot fusion.png
    python3 sensor_fusion_grid.py --target 4 10 12 --seed 3 --threshold 60
"""

import argparse
import json
import sys
from typing import Any, Optional, Sequence

import numpy as np

DEFAULT_WEIGHTS = {"sar": 0.25, "thermal": 0.15, "sif": 0.15, "permittivity": 0.45}
SURFACE_DECAY_M = 1.5  # e-folding depth for surface-sensor influence
LOGISTIC_K = 1.5
LOGISTIC_Z0 = 2.0


def robust_z(a: np.ndarray) -> np.ndarray:
    med = np.median(a)
    mad = np.median(np.abs(a - med)) * 1.4826
    if mad == 0:
        mad = np.std(a) or 1.0
    return (a - med) / mad


def to_unit(z: np.ndarray) -> np.ndarray:
    """Logistic map: z ~ 0 -> ~0.05, z = 2 -> 0.5, z >= 4 -> ~0.95."""
    return 1.0 / (1.0 + np.exp(-LOGISTIC_K * (z - LOGISTIC_Z0)))


def simulate_inputs(
    shape: tuple[int, int, int] = (15, 15, 20),
    target: tuple[int, int, int] = (7, 9, 11),
    radius: float = 1.6,
    seed: int = 42,
) -> dict[str, np.ndarray]:
    nx, ny, nz = shape
    tx, ty, tz = target
    if not (0 <= tx < nx and 0 <= ty < ny and 0 <= tz < nz):
        raise ValueError(f"target {target} outside grid {shape}")
    rng = np.random.default_rng(seed)
    x, y, z = np.meshgrid(np.arange(nx), np.arange(ny), np.arange(nz), indexing="ij")
    blob3 = np.exp(-(((x - tx) ** 2 + (y - ty) ** 2 + (z - tz) ** 2) / (2 * radius**2)))
    blob2 = blob3.max(axis=2)
    return {
        "sar_db": -14.0 + rng.normal(0, 0.8, (nx, ny)) + 3.0 * blob2,
        "thermal_delta_c": rng.normal(0, 0.25, (nx, ny)) + 0.9 * blob2,
        "sif_stress": np.clip(0.2 + rng.normal(0, 0.05, (nx, ny)) + 0.35 * blob2, 0.0, 1.0),
        "permittivity": 20.0 + rng.normal(0, 1.5, (nx, ny, nz)) - 12.0 * blob3,
    }


def fuse(
    inputs: dict[str, np.ndarray],
    weights: Optional[dict[str, float]] = None,
    dz_m: float = 0.15,
) -> np.ndarray:
    w = dict(DEFAULT_WEIGHTS if weights is None else weights)
    total = sum(w.values())
    if total <= 0 or any(v < 0 for v in w.values()):
        raise ValueError("weights must be non-negative and sum to > 0")
    w = {k: v / total for k, v in w.items()}

    er = np.asarray(inputs["permittivity"], dtype=float)
    if er.ndim != 3:
        raise ValueError("permittivity must be a 3D array")
    nx, ny, nz = er.shape
    for key in ("sar_db", "thermal_delta_c", "sif_stress"):
        if np.asarray(inputs[key]).shape != (nx, ny):
            raise ValueError(f"{key} must have shape {(nx, ny)}")

    s_sar = to_unit(robust_z(np.asarray(inputs["sar_db"], dtype=float)))
    s_th = to_unit(np.abs(robust_z(np.asarray(inputs["thermal_delta_c"], dtype=float))))
    s_sif = to_unit(robust_z(np.asarray(inputs["sif_stress"], dtype=float)))
    s_er = to_unit(-robust_z(er))

    depth = (np.arange(nz) + 0.5) * dz_m
    decay = np.exp(-depth / SURFACE_DECAY_M)[None, None, :]
    surface = (w["sar"] * s_sar + w["thermal"] * s_th + w["sif"] * s_sif)[:, :, None] * decay
    surface_max = w["sar"] + w["thermal"] + w["sif"]
    # Renormalise per depth so a voxel scoring 1.0 on every input reaches 100 % at any depth.
    norm = w["permittivity"] + surface_max * decay
    return 100.0 * (surface + w["permittivity"] * s_er) / norm


def analyze_grid(score: np.ndarray, dx_m: float = 0.5, dz_m: float = 0.15, threshold: float = 50.0) -> dict[str, Any]:
    idx = tuple(int(i) for i in np.unravel_index(int(np.argmax(score)), score.shape))
    peak = float(score[idx])
    med = float(np.median(score))
    mad = float(np.median(np.abs(score - med)) * 1.4826) or 1.0
    above = score >= threshold
    n_above = int(above.sum())
    cluster = _cluster_size(above, idx) if above[idx] else 0
    second = _second_peak(score, idx, exclusion=2)
    return {
        "peak_index": {"x": idx[0], "y": idx[1], "z": idx[2]},
        "peak_position_m": {
            "x": round(idx[0] * dx_m, 3),
            "y": round(idx[1] * dx_m, 3),
            "depth": round((idx[2] + 0.5) * dz_m, 3),
        },
        "peak_score_pct": round(peak, 2),
        "grid_median_pct": round(med, 2),
        "peak_robust_z": round((peak - med) / mad, 2),
        "second_peak_pct": round(second, 2),
        "peak_to_second_ratio": round(peak / second, 3) if second > 0 else None,
        "threshold_pct": threshold,
        "voxels_above_threshold": n_above,
        "fraction_above_threshold": round(n_above / score.size, 5),
        "peak_cluster_voxels": cluster,
    }


def _cluster_size(mask: np.ndarray, start: tuple[int, ...]) -> int:
    seen = np.zeros_like(mask, dtype=bool)
    stack = [start]
    seen[start] = True
    count = 0
    while stack:
        p = stack.pop()
        count += 1
        for axis in range(3):
            for step in (-1, 1):
                q = list(p)
                q[axis] += step
                if 0 <= q[axis] < mask.shape[axis]:
                    qt = tuple(q)
                    if mask[qt] and not seen[qt]:
                        seen[qt] = True
                        stack.append(qt)
    return count


def _second_peak(score: np.ndarray, idx: tuple[int, ...], exclusion: int) -> float:
    masked = score.copy()
    sl = tuple(slice(max(0, i - exclusion), i + exclusion + 1) for i in idx)
    masked[sl] = -np.inf
    return float(masked.max())


def permutation_null(
    inputs: dict[str, np.ndarray],
    peak: float,
    runs: int,
    seed: int,
    weights: Optional[dict[str, float]] = None,
    dz_m: float = 0.15,
) -> dict[str, Any]:
    """Shuffle every sensor across space independently, re-fuse, and compare maxima with the peak."""
    rng = np.random.default_rng(seed + 1_000_003)
    maxima = []
    for _ in range(runs):
        shuffled = {k: rng.permutation(np.asarray(v).ravel()).reshape(np.asarray(v).shape) for k, v in inputs.items()}
        maxima.append(float(fuse(shuffled, weights, dz_m).max()))
    arr = np.array(maxima)
    exceed = int((arr >= peak).sum())
    return {
        "runs": runs,
        "null_max_median_pct": round(float(np.median(arr)), 2),
        "null_max_p95_pct": round(float(np.percentile(arr, 95)), 2),
        "empirical_p_value": round((exceed + 1) / (runs + 1), 4),
    }


def run(
    shape: tuple[int, int, int] = (15, 15, 20),
    target: tuple[int, int, int] = (7, 9, 11),
    seed: int = 42,
    dx_m: float = 0.5,
    dz_m: float = 0.15,
    threshold: float = 50.0,
    weights: Optional[dict[str, float]] = None,
    null_runs: int = 50,
) -> tuple[dict[str, Any], np.ndarray]:
    inputs = simulate_inputs(shape, target, seed=seed)
    score = fuse(inputs, weights, dz_m)
    stats = analyze_grid(score, dx_m, dz_m, threshold)
    if null_runs > 0:
        stats["permutation_null"] = permutation_null(inputs, stats["peak_score_pct"], null_runs, seed, weights, dz_m)
    t = stats["peak_index"]
    stats["matches_simulated_target"] = all(abs(t[k] - target[i]) <= 1 for i, k in enumerate("xyz"))
    report = {
        "model": "weighted robust-z fusion on a voxel grid",
        "synthetic": True,
        "score_is_calibrated_probability": False,
        "parameters": {
            "grid_shape": list(shape),
            "voxel_size_m": {"x": dx_m, "y": dx_m, "z": dz_m},
            "simulated_target_index": list(target),
            "seed": seed,
            "weights": weights or DEFAULT_WEIGHTS,
            "surface_decay_m": SURFACE_DECAY_M,
        },
        "result": stats,
    }
    return report, score


def plot(score: np.ndarray, report: dict[str, Any], path: str, threshold: float) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    p = report["result"]["peak_index"]
    dz = report["parameters"]["voxel_size_m"]["z"]
    fig = plt.figure(figsize=(13, 5.5))
    ax1 = fig.add_subplot(1, 2, 1)
    im = ax1.imshow(score[:, :, p["z"]].T, origin="lower", cmap="viridis", vmin=0, vmax=100)
    ax1.plot(p["x"], p["y"], "r+", ms=14, mew=2)
    ax1.set_title(f"Fused score at peak depth layer z={p['z']} ({(p['z'] + 0.5) * dz:.2f} m)")
    ax1.set_xlabel("x index")
    ax1.set_ylabel("y index")
    fig.colorbar(im, ax=ax1, label="fused score (%)")

    ax2 = fig.add_subplot(1, 2, 2, projection="3d")
    xs, ys, zs = np.nonzero(score >= threshold)
    vals = score[xs, ys, zs]
    sc = ax2.scatter(xs, ys, (zs + 0.5) * dz, c=vals, cmap="viridis", vmin=0, vmax=100, s=18)
    ax2.scatter([p["x"]], [p["y"]], [(p["z"] + 0.5) * dz], c="red", s=80, marker="x")
    ax2.set_zlim((score.shape[2]) * dz, 0)
    ax2.set_xlabel("x")
    ax2.set_ylabel("y")
    ax2.set_zlabel("depth (m)")
    ax2.set_title(f"Voxels >= {threshold:.0f} %")
    fig.colorbar(sc, ax=ax2, shrink=0.6, pad=0.12, label="fused score (%)")
    fig.suptitle("Multi-sensor fused anomaly grid (synthetic; score is not a calibrated probability)")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def main(argv: Optional[Sequence[str]] = None) -> dict[str, Any]:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--shape", type=int, nargs=3, default=[15, 15, 20], metavar=("NX", "NY", "NZ"))
    ap.add_argument("--target", type=int, nargs=3, default=[7, 9, 11], metavar=("X", "Y", "Z"))
    ap.add_argument("--dx", type=float, default=0.5, help="horizontal voxel size (m)")
    ap.add_argument("--dz", type=float, default=0.15, help="vertical voxel size (m)")
    ap.add_argument("--threshold", type=float, default=50.0, help="score (%%) counted as anomalous")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--null-runs", type=int, default=50, help="permutation shuffles for the p-value (0 to skip)")
    ap.add_argument("--plot", help="write a dual-panel PNG to this path")
    ap.add_argument("--out", help="write JSON here instead of stdout")
    args = ap.parse_args(argv)
    try:
        report, score = run(tuple(args.shape), tuple(args.target), args.seed, args.dx, args.dz, args.threshold,
                            null_runs=args.null_runs)
    except ValueError as e:
        ap.error(str(e))
    r = report["result"]
    print(f"\npeak voxel {r['peak_index']} at {r['peak_position_m']} m | score {r['peak_score_pct']} % | "
          f"robust z {r['peak_robust_z']} | next peak {r['second_peak_pct']} % | "
          f"cluster {r['peak_cluster_voxels']} voxels >= {r['threshold_pct']} % | "
          f"matches simulated target: {r['matches_simulated_target']}")
    if "permutation_null" in r:
        nl = r["permutation_null"]
        print(f"permutation null ({nl['runs']} shuffles): noise peaks median {nl['null_max_median_pct']} %, "
              f"95th pct {nl['null_max_p95_pct']} % -> empirical p = {nl['empirical_p_value']}")
    print()
    if args.plot:
        plot(score, report, args.plot, args.threshold)
        print(f"plot written to {args.plot}")
    payload = json.dumps(report, indent=2)
    if args.out:
        with open(args.out, "w") as f:
            f.write(payload + "\n")
        print(f"JSON written to {args.out}")
    else:
        print(payload)
    return report


if __name__ == "__main__":
    main(sys.argv[1:])
