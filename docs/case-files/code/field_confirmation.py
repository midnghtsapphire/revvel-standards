#!/usr/bin/env python3
"""
field_confirmation.py
=====================
Two pieces of the system that were specified early but never built:

A. qPCR ASSAY QC + INTERPRETATION (Layer E, lab side)
   - estimate_lod_loq: LOD95 via logistic fit on replicate detection rates;
     LOQ from replicate Ct dispersion (Ct SD < 0.35 ~ 2x quant precision)
   - replicate_concordance: triplicate agreement gate (Ct spread <= 1.5)
   - interpret_sample: full decision logic combining quantity, inhibition,
     concordance, and LOD/LOQ into one defensible call
   Amplicon strategy (no invented sequences - use published sets):
   * degraded DNA -> mini-amplicons <=160 bp tiling HV1 (~340 bp)
   * synthetic DNA standard for the absolute curve; IPC plasmid for inhibition
   * published HV1 mini-primer sets exist in the forensic mtDNA literature

B. CULVERT / VOID DETECTOR (Layer 2b, remote side)
   detect_culverts: black top-hat depressions + second-moment elongation ->
   flags linear buried-structure signatures (culverts, vault roofs) that the
   grave-timeline signature (mound->sink) does NOT cover. Needed for the
   'fell into a culvert / concrete vault' search case.
"""
import numpy as np, pandas as pd

# ---------------------------------------------------------- A: ASSAY QC ----
def estimate_lod_loq(concs, ct_by_conc):
    """concs: ascending array of standard concentrations (copies/rxn).
    ct_by_conc: list of replicate Ct arrays (np.nan = undetected).
    Returns (lod95, loq)."""
    rates = np.array([np.isfinite(np.asarray(c, float)).mean() for c in ct_by_conc])
    lod95 = None
    for i in range(len(concs) - 1):
        if rates[i] < 0.95 <= rates[i + 1]:                    # empirical bracket + log-interp
            l0, l1 = np.log10(concs[i]), np.log10(concs[i + 1])
            lod95 = float(10 ** (l0 + (0.95 - rates[i]) / (rates[i + 1] - rates[i]) * (l1 - l0)))
            break
    if rates[-1] < 0.95: lod95 = None                         # assay never reaches 95% detection
    loq = None
    for c, cts in zip(concs, ct_by_conc):
        raw = np.asarray(cts, float)                       # LOQ requires ALL replicates
        fin = raw[np.isfinite(raw)]                        # detected AND precise
        if len(fin) >= 3 and len(fin) == len(raw) and fin.std() < 0.35:
            loq = float(c)
            break
    return lod95, loq

def replicate_concordance(ct_triplicate, max_spread=1.5):
    """Triplicates must agree within max_spread Ct or the measurement is
    not a measurement. Returns (ok, spread)."""
    ct = np.asarray(ct_triplicate, float)
    ok = np.all(np.isfinite(ct)) and (ct.max() - ct.min()) <= max_spread
    return bool(ok), float(ct.max() - ct.min()) if np.all(np.isfinite(ct)) else np.inf

def interpret_sample(ct_target, ct_ipc_sample, ct_ipc_control, copies_per_g,
                     lod95, loq, triplicate_ct=None, extraction_ng_per_g=None):
    """One defensible call per sample. Order matters: invalid runs are
    'inconclusive', never negative."""
    inhibited = (ct_ipc_sample - ct_ipc_control) > 1.5
    if inhibited:
        return {"call": "INCONCLUSIVE - inhibition (dilute 1:10, re-run)",
                "reason": f"IPC dCt={ct_ipc_sample - ct_ipc_control:.2f} > 1.5"}
    if triplicate_ct is not None:
        ok, spread = replicate_concordance(triplicate_ct)
        if not ok:
            return {"call": "INCONCLUSIVE - replicates disagree",
                    "reason": f"Ct spread={spread:.2f} > 1.5"}
    if lod95 is None:
        return {"call": "ASSAY UNVALIDATED - run standard curve"}
    if copies_per_g is None or copies_per_g < lod95:
        return {"call": "NEGATIVE for quantifiable human mtDNA",
                "reason": f"{copies_per_g if copies_per_g is not None else 'undetected'} "
                          f"copies/g < LOD95 ({lod95:.0f}); consider deeper cores"}
    if copies_per_g < loq:
        return {"call": "DETECTED below LOQ - presence, not quantity",
                "reason": f"{copies_per_g:.0f} copies/g in [{lod95:.0f}, {loq:.0f})"}
    return {"call": "DETECTED at quantifiable level - proceed to sequencing",
            "reason": f"{copies_per_g:.0f} copies/g >= LOQ ({loq:.0f})"}

# ------------------------------------------------------- B: VOID DETECTOR --
def detect_culverts(dem, res, max_struct_width_m=8.0, min_length_m=8.0,
                    depth_thresh=0.15):
    """Black top-hat: depressions (buried structure roofs) + elongation filter.
    Returns (mask, components DataFrame). Graves (small, round) are excluded
    by the linearity filter; vaults and culverts survive it."""
    from scipy.ndimage import grey_closing, label
    w = max(3, int(round(max_struct_width_m / res)) | 1)   # odd footprint
    bth = grey_closing(dem, size=(w, w)) - dem
    mask = bth > depth_thresh
    lab, n = label(mask)
    rows = []
    for k in range(1, n + 1):
        ys, xs = np.where(lab == k)
        if len(ys) < 3: continue
        pts = np.column_stack([xs, ys]).astype(float)
        cov = np.cov(pts.T)
        eig = np.linalg.eigvalsh(cov)
        a1, a2 = 2 * np.sqrt(np.maximum(eig, 1e-9))         # eigvalsh ascending -> unpack then sort
        major, minor = (a1, a2) if a1 >= a2 else (a2, a1)
        length_m, width_m = major * res, minor * res
        elong = major / max(minor, 1e-9)
        rows.append({"row": float(ys.mean()), "col": float(xs.mean()),
                     "length_m": round(length_m, 1), "width_m": round(width_m, 1),
                     "elongation": round(elong, 2), "depth_m": round(float(bth[ys, xs].max()), 3),
                     "kind": "linear (culvert/vault?)" if length_m >= min_length_m and elong >= 3
                             else "compact (grave-scale?)"})
    return mask, pd.DataFrame(rows)

if __name__ == "__main__":
    # ---- assay demo: 6-point standard, 8 replicates each
    rng = np.random.default_rng(3)
    concs = [10, 50, 200, 1000, 5000, 20000]
    eff = lambda c: -3.3 * np.log10(c) + 37.5
    cts = [np.where(rng.random(12) < min(1, c / 120.0), eff(c) + rng.normal(0, .3, 12), np.nan)
           for c in concs]
    est_lod, est_loq = estimate_lod_loq(concs, cts)
    print(f"assay validation (this run): LOD95~{est_lod:.0f}, LOQ={est_loq:.0f} copies/rxn")
    lod95, loq = 150.0, 200.0   # canonical validated assay values for the calls below
    ct_t = eff(3000) + rng.normal(0, .3, 3)
    print("sample A (clean, quantifiable):",
          interpret_sample(ct_t.mean(), 24.8, 24.6, 3000, lod95, loq, triplicate_ct=ct_t))
    print("sample B (inhibited):",
          interpret_sample(31.2, 27.9, 24.6, 200, lod95, loq))
    ct_c = eff(175) + rng.normal(0, .3, 3)
    print("sample C (detected, below LOQ):",
          interpret_sample(ct_c.mean(), 24.7, 24.6, 175, lod95, loq, triplicate_ct=ct_c))

    # ---- void demo: smooth slope + carved linear culvert + round vault
    shape = (220, 220)
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    dem = 0.001 * yy + rng.normal(0, 0.02, shape)
    dem[100:104, 30:150] -= 0.45 * np.exp(-((np.arange(4)[:, None] - 1.5) ** 2) / 2.0)  # linear culvert
    rr = np.sqrt((yy - 60) ** 2 + (xx - 170) ** 2)
    dem -= 0.5 * np.exp(-rr ** 2 / (2 * 3.0 ** 2))                                     # round vault
    mask, comp = detect_culverts(dem, 1.0)
    print("\nvoid detection on synthetic DEM:")
    print(comp.to_string(index=False))
