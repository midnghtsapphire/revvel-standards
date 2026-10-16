#!/usr/bin/env python3
"""
GPR wave-physics model for subsurface target anomaly detection,
with attenuation for conductive (clay-rich) soils.

Models a single buried target in a homogeneous soil host, assuming
non-magnetic media (mu_r = 1) at normal incidence. Each medium is described
by its relative permittivity er and DC conductivity sigma, combined into the
complex permittivity

  er* = er - j * sigma / (omega * eps0)
  loss tangent  tan_d = sigma / (omega * eps0 * er)

Propagation constant gamma = alpha + j*beta = j*omega*sqrt(mu0*eps0*er*):

  alpha = omega*sqrt(er)/c * sqrt( (sqrt(1 + tan_d^2) - 1) / 2 )   [Np/m]
  beta  = omega*sqrt(er)/c * sqrt( (sqrt(1 + tan_d^2) + 1) / 2 )   [rad/m]
  attenuation             = 8.686 * alpha                           [dB/m]
  phase velocity      v   = omega / beta  (-> c/sqrt(er) when sigma=0) [m/ns]

  Low-loss check: for tan_d << 1, alpha_dB ~= 1.636 * sigma[mS/m] / sqrt(er).

  Fresnel reflection (complex, normal incidence)
      R = (n1 - n2) / (n1 + n2),  n = sqrt(er*)      soil = 1, target = 2
  Two-way travel time   TWT = 2 * d / v_soil                        [ns]
  Two-way path loss     L   = 2 * alpha_dB * d (+ optional spreading) [dB]
  Target return level   A   = 20*log10|R| - L                        [dB re incident]
  Detectable if A >= -loss_budget.

The loss budget is the dB margin left for ground losses after system,
antenna-coupling and transmission losses -- an illustrative figure you
should replace with your instrument's value. Conductivity is treated as
frequency-independent (DC); real clays show dispersion, so attenuation at
high frequency is usually somewhat higher than predicted here.

Usage:
    python3 gpr_wave_model.py
    python3 gpr_wave_model.py --soil 15 20 25 --sigma 10 30 60 \
        --target 3 6 9 16.4 --freq 250 --loss-budget 60 --spreading \
        --out results.json
"""

import argparse
import cmath
import json
import math
import sys
from typing import Any, Optional, Sequence, Union

C_M_PER_NS = 0.299792458        # speed of light in vacuum, m/ns
C_M_PER_S = 299792458.0
EPS0 = 8.8541878128e-12         # F/m
NP_TO_DB = 20.0 / math.log(10)  # 8.686 dB per neper

DEFAULT_SOIL_ER = [15.0, 20.0, 25.0]      # clay / silt, moist to wet
DEFAULT_SOIL_SIGMA = [10.0, 30.0, 60.0]   # mS/m, paired with DEFAULT_SOIL_ER
DEFAULT_TARGET_ER = [3.0, 6.0, 9.0, 12.0, 16.4]

# |R| thresholds for a qualitative contrast label (independent of depth)
CONTRAST_BANDS = [
    (0.20, "strong"),
    (0.10, "moderate"),
    (0.03, "weak"),
    (0.00, "marginal"),
]

# tan_d below this: low-loss approximation holds well
LOW_LOSS_LIMIT = 0.1


def _omega(freq_mhz: float) -> float:
    return 2.0 * math.pi * freq_mhz * 1e6


def complex_er(er: float, sigma_ms_m: float, freq_mhz: float) -> complex:
    """Complex relative permittivity er* = er - j*sigma/(omega*eps0)."""
    if er < 1.0:
        raise ValueError(f"Relative permittivity must be >= 1.0, got {er}")
    if sigma_ms_m < 0:
        raise ValueError(f"Conductivity must be >= 0, got {sigma_ms_m}")
    sigma = sigma_ms_m * 1e-3
    return complex(er, -sigma / (_omega(freq_mhz) * EPS0))


def loss_tangent(er: float, sigma_ms_m: float, freq_mhz: float) -> float:
    return (sigma_ms_m * 1e-3) / (_omega(freq_mhz) * EPS0 * er)


def propagation(er: float, sigma_ms_m: float, freq_mhz: float) -> tuple[float, float, float]:
    """Return (alpha Np/m, beta rad/m, phase velocity m/ns) for a lossy medium."""
    tan_d = loss_tangent(er, sigma_ms_m, freq_mhz)
    k0 = _omega(freq_mhz) * math.sqrt(er) / C_M_PER_S
    root = math.sqrt(1.0 + tan_d * tan_d)
    alpha = k0 * math.sqrt((root - 1.0) / 2.0)
    beta = k0 * math.sqrt((root + 1.0) / 2.0)
    v = _omega(freq_mhz) / beta * 1e-9  # m/s -> m/ns
    return alpha, beta, v


def velocity(er: float) -> float:
    """Lossless EM wave velocity in m/ns for relative permittivity er."""
    if er < 1.0:
        raise ValueError(f"Relative permittivity must be >= 1.0, got {er}")
    return C_M_PER_NS / math.sqrt(er)


def fresnel_r(er_upper: float, er_lower: float) -> float:
    """Lossless normal-incidence amplitude reflection coefficient."""
    n1, n2 = math.sqrt(er_upper), math.sqrt(er_lower)
    return (n1 - n2) / (n1 + n2)


def fresnel_r_complex(er1c: complex, er2c: complex) -> complex:
    """Normal-incidence reflection coefficient for complex permittivities."""
    n1, n2 = cmath.sqrt(er1c), cmath.sqrt(er2c)
    return (n1 - n2) / (n1 + n2)


def twt_ns(depth_m: float, v_m_per_ns: float) -> float:
    """Two-way travel time (ns) to a reflector at depth_m."""
    return 2.0 * depth_m / v_m_per_ns


def spreading_loss_db(depth_m: float, r_ref: float = 1.0) -> float:
    """Two-way geometric spreading (image source at 2d), 0 dB inside r_ref."""
    return 20.0 * math.log10(max(2.0 * depth_m, r_ref) / r_ref)


def path_loss_db(depth_m: float, atten_db_m: float, spreading: bool) -> float:
    loss = 2.0 * atten_db_m * depth_m
    if spreading:
        loss += spreading_loss_db(depth_m)
    return loss


def max_detectable_depth(
    r_mag: float, atten_db_m: float, budget_db: float, spreading: bool, search_max: float = 100.0
) -> Optional[float]:
    """Deepest d where 20log10|R| - path_loss(d) >= -budget. None if never."""
    if r_mag <= 0:
        return None
    margin = budget_db + 20.0 * math.log10(r_mag)
    if margin < 0:
        return None
    if not spreading:
        return math.inf if atten_db_m == 0 else margin / (2.0 * atten_db_m)
    if path_loss_db(search_max, atten_db_m, True) <= margin:
        return math.inf
    lo, hi = 0.0, search_max
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        if path_loss_db(mid, atten_db_m, True) <= margin:
            lo = mid
        else:
            hi = mid
    return lo


def contrast_label(r: Union[float, complex]) -> str:
    mag = abs(r)
    for threshold, label in CONTRAST_BANDS:
        if mag >= threshold:
            return label
    return "marginal"


def depth_grid(max_depth: float, step: float) -> list[float]:
    if step <= 0 or max_depth < 0:
        raise ValueError("step must be > 0 and max_depth must be >= 0")
    n = int(round(max_depth / step))
    return [round(i * step, 6) for i in range(n + 1)]


def pair_sigma(soil_ers: Sequence[float], sigmas: Sequence[float]) -> list[float]:
    if len(sigmas) == 1:
        return list(sigmas) * len(soil_ers)
    if len(sigmas) == len(soil_ers):
        return list(sigmas)
    raise ValueError("--sigma takes one value or one per --soil value")


def _round_depth(d: Optional[float]) -> Union[float, str, None]:
    if d is None:
        return None
    return "inf" if math.isinf(d) else round(d, 3)


def model(
    soil_ers: Sequence[float],
    target_ers: Sequence[float],
    max_depth: float = 3.0,
    step: float = 0.25,
    freq_mhz: float = 400.0,
    soil_sigmas: Optional[Sequence[float]] = None,
    target_sigma: float = 0.0,
    loss_budget_db: float = 60.0,
    spreading: bool = False,
) -> dict[str, Any]:
    if freq_mhz <= 0:
        raise ValueError("frequency must be > 0")
    soil_sigmas = pair_sigma(soil_ers, soil_sigmas if soil_sigmas is not None else [0.0])
    depths = depth_grid(max_depth, step)
    freq_ghz = freq_mhz / 1000.0  # m/ns / GHz = m

    results = []
    for es, sig in zip(soil_ers, soil_sigmas):
        alpha, _, v_soil = propagation(es, sig, freq_mhz)
        atten_db_m = alpha * NP_TO_DB
        tan_d = loss_tangent(es, sig, freq_mhz)
        wavelength = v_soil / freq_ghz
        es_c = complex_er(es, sig, freq_mhz)

        profile = []
        for d in depths:
            profile.append({
                "depth_m": d,
                "twt_ns": round(twt_ns(d, v_soil), 4),
                "two_way_loss_db": round(path_loss_db(d, atten_db_m, spreading), 3),
            })

        targets = []
        for et in target_ers:
            r = fresnel_r(es, et)
            rc = fresnel_r_complex(es_c, complex_er(et, target_sigma, freq_mhz))
            r_mag = abs(rc)
            r_db = 20.0 * math.log10(r_mag) if r_mag > 0 else -math.inf
            d_max = max_detectable_depth(r_mag, atten_db_m, loss_budget_db, spreading)
            returns = []
            for p in profile:
                level = r_db - p["two_way_loss_db"]
                returns.append({
                    "depth_m": p["depth_m"],
                    "return_level_db": round(level, 3) if math.isfinite(level) else None,
                    "detectable": math.isfinite(level) and level >= -loss_budget_db,
                })
            targets.append({
                "target_er": et,
                "target_velocity_m_per_ns": round(velocity(et), 5),
                "reflection_coefficient_R": round(r, 5),
                "reflectivity_R2": round(r * r, 5),
                "transmission_coefficient_T": round(1.0 + r, 5),
                "R_complex_magnitude": round(r_mag, 5),
                "R_complex_phase_deg": round(math.degrees(cmath.phase(rc)), 3),
                "R_db": round(r_db, 3) if math.isfinite(r_db) else None,
                "polarity": "same" if r > 0 else ("reversed" if r < 0 else "none"),
                "contrast": contrast_label(r_mag),
                "max_detectable_depth_m": _round_depth(d_max),
                "return_profile": returns,
            })

        results.append({
            "soil_er": es,
            "soil_sigma_mS_per_m": sig,
            "loss_tangent": round(tan_d, 5),
            "low_loss_regime": tan_d < LOW_LOSS_LIMIT,
            "attenuation_db_per_m": round(atten_db_m, 4),
            "attenuation_np_per_m": round(alpha, 5),
            "skin_depth_m": round(1.0 / alpha, 4) if alpha > 0 else None,
            "soil_velocity_lossless_m_per_ns": round(velocity(es), 5),
            "soil_velocity_m_per_ns": round(v_soil, 5),
            "wavelength_m": round(wavelength, 4),
            "vertical_resolution_m": round(wavelength / 4.0, 4),
            "max_twt_ns": profile[-1]["twt_ns"],
            "depth_profile": profile,
            "targets": targets,
        })

    return {
        "model": "GPR normal-incidence reflection / travel-time / attenuation",
        "assumptions": [
            "non-magnetic media (mu_r = 1)",
            "frequency-independent (DC) conductivity",
            "normal incidence, planar interface",
            "homogeneous soil above target",
            "geometric spreading " + ("included (image source, 1 m ref)" if spreading else "ignored"),
        ],
        "constants": {"c_m_per_ns": C_M_PER_NS, "eps0_F_per_m": EPS0},
        "parameters": {
            "soil_er": list(soil_ers),
            "soil_sigma_mS_per_m": soil_sigmas,
            "target_er": list(target_ers),
            "target_sigma_mS_per_m": target_sigma,
            "max_depth_m": max_depth,
            "depth_step_m": step,
            "center_frequency_mhz": freq_mhz,
            "loss_budget_db": loss_budget_db,
            "geometric_spreading": spreading,
        },
        "results": results,
    }


def _fmt_depth(d: Union[float, str, None]) -> str:
    if d is None:
        return "none"
    if d == "inf":
        return ">100"
    return f"{d:.2f}"


def print_summary(data: dict[str, Any]) -> None:
    p = data["parameters"]
    print(f"\nGPR model  |  f = {p['center_frequency_mhz']:.0f} MHz  |  depth 0-{p['max_depth_m']} m  |  "
          f"loss budget {p['loss_budget_db']:.0f} dB  |  spreading {'on' if p['geometric_spreading'] else 'off'}\n")

    print("SOIL PROPAGATION")
    print(f"{'soil er':>8} {'sigma mS/m':>11} {'tan d':>7} {'dB/m':>7} {'skin (m)':>9} "
          f"{'v (m/ns)':>9} {'res (m)':>8} {'TWT@max':>8}")
    print("-" * 74)
    for s in data["results"]:
        skin = f"{s['skin_depth_m']:.2f}" if s["skin_depth_m"] else "inf"
        flag = "" if s["low_loss_regime"] else "*"
        print(f"{s['soil_er']:>8.1f} {s['soil_sigma_mS_per_m']:>11.1f} {s['loss_tangent']:>6.3f}{flag:1} "
              f"{s['attenuation_db_per_m']:>7.2f} {skin:>9} {s['soil_velocity_m_per_ns']:>9.4f} "
              f"{s['vertical_resolution_m']:>8.3f} {s['max_twt_ns']:>8.2f}")
    if any(not s["low_loss_regime"] for s in data["results"]):
        print(f"  * tan d >= {LOW_LOSS_LIMIT}: outside low-loss regime (full lossy solution used)")

    print("\nREFLECTION & DETECTION (soil -> target)")
    print(f"{'soil er':>8} {'target er':>10} {'R':>9} {'|R*|':>7} {'R dB':>7} {'polarity':>9} "
          f"{'contrast':>9} {'max depth (m)':>14}")
    print("-" * 80)
    for s in data["results"]:
        for t in s["targets"]:
            rdb = f"{t['R_db']:.1f}" if t["R_db"] is not None else "-inf"
            print(f"{s['soil_er']:>8.1f} {t['target_er']:>10.1f} {t['reflection_coefficient_R']:>+9.4f} "
                  f"{t['R_complex_magnitude']:>7.4f} {rdb:>7} {t['polarity']:>9} {t['contrast']:>9} "
                  f"{_fmt_depth(t['max_detectable_depth_m']):>14}")

    cols = data["results"]
    print("\nTWT (ns) / TWO-WAY LOSS (dB) vs TARGET DEPTH")
    header = f"{'depth (m)':>9}" + "".join(
        f"{'er=' + format(s['soil_er'], 'g') + ' s=' + format(s['soil_sigma_mS_per_m'], 'g'):>18}" for s in cols)
    print(header)
    print("-" * len(header))
    for i, row in enumerate(cols[0]["depth_profile"]):
        line = f"{row['depth_m']:>9.2f}"
        for s in cols:
            dp = s["depth_profile"][i]
            line += f"{dp['twt_ns']:>9.2f} /{dp['two_way_loss_db']:>6.1f}"
        print(line)
    print()


def main(argv: Optional[Sequence[str]] = None) -> dict[str, Any]:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--soil", type=float, nargs="+", default=DEFAULT_SOIL_ER, help="soil er values")
    ap.add_argument("--sigma", type=float, nargs="+", default=None,
                    help="soil conductivity in mS/m: one value, or one per --soil "
                         f"(default {DEFAULT_SOIL_SIGMA} paired with default soils)")
    ap.add_argument("--target", type=float, nargs="+", default=DEFAULT_TARGET_ER, help="target er values")
    ap.add_argument("--target-sigma", type=float, default=0.0, help="target conductivity in mS/m (default 0)")
    ap.add_argument("--max-depth", type=float, default=3.0, help="max depth in m (default 3.0)")
    ap.add_argument("--step", type=float, default=0.25, help="depth step in m (default 0.25)")
    ap.add_argument("--freq", type=float, default=400.0, help="antenna center frequency in MHz (default 400)")
    ap.add_argument("--loss-budget", type=float, default=60.0,
                    help="dB available for ground path loss before the return hits the noise floor (default 60)")
    ap.add_argument("--spreading", action="store_true", help="include two-way geometric spreading loss")
    ap.add_argument("--out", help="write JSON to this file instead of stdout")
    ap.add_argument("--no-table", action="store_true", help="skip the summary table")
    args = ap.parse_args(argv)

    sigmas = args.sigma
    if sigmas is None:
        sigmas = DEFAULT_SOIL_SIGMA if args.soil == DEFAULT_SOIL_ER else [DEFAULT_SOIL_SIGMA[1]]

    try:
        data = model(args.soil, args.target, args.max_depth, args.step, args.freq,
                     soil_sigmas=sigmas, target_sigma=args.target_sigma,
                     loss_budget_db=args.loss_budget, spreading=args.spreading)
    except ValueError as e:
        ap.error(str(e))

    if not args.no_table:
        print_summary(data)

    payload = json.dumps(data, indent=2)
    if args.out:
        with open(args.out, "w") as f:
            f.write(payload + "\n")
        print(f"JSON written to {args.out}")
    else:
        print(payload)
    return data


if __name__ == "__main__":
    main(sys.argv[1:])
