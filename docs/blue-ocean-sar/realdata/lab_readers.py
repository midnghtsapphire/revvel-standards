#!/usr/bin/env python3
"""Read real GC-MS and 16S lab exports and compare a sample with a control.

Replaces the GC-MS and 16S tabs of ryverly_recon_app-v6.py (docs/case-files),
whose peak counts, retention times and abundances were typed in.

GC-MS (needs numpy; uses scipy.signal.find_peaks when installed):
  Reads a total-ion chromatogram for a sample and a control, either as CSV
  (columns retention_time_min, intensity) or as mzML (needs pyteomics or
  pymzml). Detects peaks, integrates each above a straight baseline drawn
  between the ends of its window (trapezoid rule), and, for each target in
  YOUR method file, reports whether a peak sits within +/- tolerance of the
  expected retention time, its area in sample and control, and their ratio.
  Retention times depend on the column, temperature programme and carrier
  flow, so they must come from your lab's method (run reference standards).
  gcms_method.example.json is an example only and is refused unless you pass
  --allow-example-method.
  A peak at the expected retention time is not an identification. Confirming
  a compound needs its mass spectrum (library match and a reference standard).

16S (standard library only):
  Reads a feature table (QIIME 2 / biom TSV export: rows are features or
  taxa, columns are samples, values are counts; taxonomy either in a
  "taxonomy"/"Taxon" column, in a separate QIIME 2 taxonomy.tsv, or as the
  row ID itself) or a long CSV with columns taxon,sample,count. Aggregates
  counts to a rank (domain .. species), computes relative abundance per
  sample, and the fold change sample vs control with a pseudocount added to
  the counts:  FC = ((n_s + pc) / N_s) / ((n_c + pc) / N_c).
  One sample against one control is a description, not a statistical test;
  use replicates and a compositional method (ANCOM-BC, ALDEx2) for inference.

Examples:
  python lab_readers.py gcms --sample eff.csv --control ctrl.csv --method my_method.json --out gcms.json
  python lab_readers.py 16s --table feature-table.tsv --taxonomy taxonomy.tsv \\
      --sample EFF-A1 --control CTRL-A1 --rank family --top 15 --out 16s.json
"""

import argparse
import csv
import json
import math
import os
import sys

try:
    import numpy as np
except ImportError:  # 16S still works without numpy
    np = None

try:
    from scipy.signal import find_peaks as _scipy_find_peaks
except ImportError:
    _scipy_find_peaks = None

DEFAULT_TARGET_NAMES = ("putrescine", "cadaverine", "indole", "skatole", "dimethyl disulfide")
IDENTIFICATION_NOTE = ("A peak at the expected retention time is not an identification. Mass-spectral confirmation "
                       "(library match of the peak's spectrum and a reference standard run on the same method) "
                       "is required before naming a compound.")


class LabInputError(ValueError):
    """Input file is missing, malformed or needs an optional reader that is not installed."""


def _need_numpy():
    if np is None:
        raise LabInputError("GC-MS reading needs numpy (pip install numpy)")


# --------------------------------------------------------------------------- GC-MS: readers

def read_tic_csv(path):
    """Return (rt_min, intensity) numpy arrays sorted by retention time."""
    _need_numpy()
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        cols = {(c or "").strip().lower(): c for c in (reader.fieldnames or [])}
        if "retention_time_min" not in cols or "intensity" not in cols:
            raise LabInputError(f"{path}: needs columns retention_time_min, intensity; found {reader.fieldnames}")
        rt, y = [], []
        for i, rec in enumerate(reader, start=2):
            try:
                rt.append(float(rec[cols["retention_time_min"]]))
                y.append(float(rec[cols["intensity"]]))
            except (TypeError, ValueError):
                raise LabInputError(f"{path}: line {i} is not numeric") from None
    return _clean_trace(path, rt, y)


def _clean_trace(path, rt, y):
    rt, y = np.asarray(rt, dtype=float), np.asarray(y, dtype=float)
    if rt.size < 5:
        raise LabInputError(f"{path}: fewer than 5 points")
    if not (np.isfinite(rt).all() and np.isfinite(y).all()):
        raise LabInputError(f"{path}: contains non-finite values")
    order = np.argsort(rt, kind="stable")
    rt, y = rt[order], y[order]
    if np.any(np.diff(rt) <= 0):
        raise LabInputError(f"{path}: duplicate retention times")
    return rt, y


def read_tic_mzml(path):
    """Sum MS1 intensities per scan from an mzML file. Needs pyteomics or pymzml."""
    _need_numpy()
    try:
        from pyteomics import mzml  # type: ignore
    except ImportError:
        mzml = None
    if mzml is not None:
        rt, y = [], []
        with mzml.MzML(path) as reader:
            for spec in reader:
                if spec.get("ms level", 1) != 1:
                    continue
                scan = spec["scanList"]["scan"][0]
                t = scan["scan start time"]
                unit = getattr(t, "unit_info", "minute") or "minute"
                rt.append(float(t) / 60.0 if unit.startswith("second") else float(t))
                y.append(float(np.sum(spec["intensity array"])))
        return _clean_trace(path, rt, y)
    try:
        import pymzml  # type: ignore
    except ImportError:
        raise LabInputError("reading mzML needs pyteomics or pymzml (pip install pyteomics lxml); "
                            "or export the TIC as CSV with columns retention_time_min, intensity") from None
    rt, y = [], []
    for spec in pymzml.run.Reader(path):
        if spec.ms_level != 1:
            continue
        rt.append(float(spec.scan_time_in_minutes()))
        y.append(float(np.sum(spec.i)))
    return _clean_trace(path, rt, y)


def read_tic(path):
    if not os.path.exists(path):
        raise LabInputError(f"{path}: file not found")
    if path.lower().endswith((".mzml", ".mzml.gz")):
        return read_tic_mzml(path)
    return read_tic_csv(path)


# --------------------------------------------------------------------------- GC-MS: peaks

def noise_and_baseline(y):
    """Median as the baseline level, 1.4826*MAD as the noise sd. Valid when
    peaks occupy less than half the run, which is normal for a TIC."""
    base = float(np.median(y))
    sd = float(1.4826 * np.median(np.abs(y - base)))
    return base, sd


def _prominences(y, idx):
    out = []
    n = len(y)
    for i in idx:
        left = i
        lmin = y[i]
        while left > 0 and y[left - 1] <= y[i]:
            left -= 1
            lmin = min(lmin, y[left])
        right = i
        rmin = y[i]
        while right < n - 1 and y[right + 1] <= y[i]:
            right += 1
            rmin = min(rmin, y[right])
        out.append(y[i] - max(lmin, rmin))
    return np.asarray(out, dtype=float)


def _numpy_find_peaks(y, prominence):
    """Local maxima with prominence >= threshold. A flat-topped peak is placed
    at the first point of its plateau."""
    cand = []
    n = len(y)
    i = 1
    while i < n - 1:
        if y[i] > y[i - 1]:
            j = i
            while j < n - 1 and y[j + 1] == y[i]:
                j += 1
            if j < n - 1 and y[j + 1] < y[i]:
                cand.append(i)
            i = j + 1
        else:
            i += 1
    if not cand:
        return np.array([], dtype=int)
    prom = _prominences(y, cand)
    return np.asarray([i for i, p in zip(cand, prom) if p >= prominence], dtype=int)


def _window(y, apex, floor, noise_sd):
    """Walk out from the apex until the signal reaches `floor` or starts to rise
    again by more than the noise (a valley shared with a neighbouring peak)."""
    tol = 3.0 * noise_sd
    lo = apex
    while lo > 0 and y[lo] > floor:
        if y[lo - 1] > y[lo] + tol:
            break
        lo -= 1
    hi = apex
    n = len(y)
    while hi < n - 1 and y[hi] > floor:
        if y[hi + 1] > y[hi] + tol:
            break
        hi += 1
    return lo, hi


def _trapezoid(x, y):
    return float(np.sum((y[1:] + y[:-1]) * np.diff(x)) / 2.0)


def detect_peaks(rt, y, min_prominence=None, snr=5.0, rel_prominence=0.01, use_scipy=True):
    """Return a list of peaks sorted by retention time.

    Each peak: apex_rt_min, apex_intensity, height (above the window baseline),
    start_rt_min, end_rt_min, area (intensity x minutes, above the baseline).
    Default prominence threshold: max(snr * noise_sd, rel_prominence * signal range)."""
    _need_numpy()
    rt, y = np.asarray(rt, dtype=float), np.asarray(y, dtype=float)
    base, noise = noise_and_baseline(y)
    if min_prominence is None:
        min_prominence = max(snr * noise, rel_prominence * float(y.max() - y.min()))
    if use_scipy and _scipy_find_peaks is not None:
        idx, _ = _scipy_find_peaks(y, prominence=min_prominence)
    else:
        idx = _numpy_find_peaks(y, min_prominence)
    peaks = []
    for i in idx:
        i = int(i)
        floor = base + max(3.0 * noise, 0.005 * (y[i] - base))
        lo, hi = _window(y, i, floor, noise)
        x, s = rt[lo:hi + 1], y[lo:hi + 1]
        line = y[lo] + (y[hi] - y[lo]) * (x - rt[lo]) / (rt[hi] - rt[lo]) if hi > lo else s
        above = np.clip(s - line, 0.0, None)
        peaks.append({
            "apex_rt_min": float(rt[i]), "apex_intensity": float(y[i]),
            "height": float(y[i] - (line[i - lo] if hi > lo else y[i])),
            "start_rt_min": float(rt[lo]), "end_rt_min": float(rt[hi]),
            "area": _trapezoid(x, above) if hi > lo else 0.0,
        })
    return peaks


def window_area(rt, y, start, end):
    """Area above a straight baseline between the trace's values at start and end."""
    m = (rt >= start) & (rt <= end)
    if m.sum() < 2:
        return 0.0
    x, s = rt[m], y[m]
    line = s[0] + (s[-1] - s[0]) * (x - x[0]) / (x[-1] - x[0])
    return _trapezoid(x, np.clip(s - line, 0.0, None))


# --------------------------------------------------------------------------- GC-MS: method + comparison

def load_method(path, allow_example=False):
    with open(path, encoding="utf-8") as f:
        method = json.load(f)
    if method.get("example") and not allow_example:
        raise LabInputError(f"{path} is marked as an example (\"example\": true). Its retention times are not from "
                            "your column or method. Copy it, fill in retention times from your own reference "
                            "standards, remove the \"example\" key, or pass --allow-example-method to run anyway.")
    tol = method.get("rt_tolerance_min")
    targets = method.get("targets")
    if not isinstance(targets, list) or not targets:
        raise LabInputError(f"{path}: needs a non-empty \"targets\" list")
    out = []
    for t in targets:
        name, rt = t.get("name"), t.get("expected_rt_min")
        if not name or not isinstance(rt, (int, float)):
            raise LabInputError(f"{path}: every target needs a name and a numeric expected_rt_min (got {t})")
        t_tol = t.get("tolerance_min", tol)
        if not isinstance(t_tol, (int, float)) or t_tol <= 0:
            raise LabInputError(f"{path}: target {name!r} has no positive tolerance (set rt_tolerance_min)")
        out.append({"name": name, "expected_rt_min": float(rt), "tolerance_min": float(t_tol)})
    return method, out


def _nearest(peaks, rt, tol):
    best = None
    for p in peaks:
        d = abs(p["apex_rt_min"] - rt)
        if d <= tol and (best is None or d < abs(best["apex_rt_min"] - rt)):
            best = p
    return best


def compare_gcms(sample, control, targets, **peak_kw):
    """sample/control: (rt, intensity). targets: [{name, expected_rt_min, tolerance_min}]."""
    sp = detect_peaks(*sample, **peak_kw)
    cp = detect_peaks(*control, **peak_kw)
    rows = []
    for t in targets:
        s = _nearest(sp, t["expected_rt_min"], t["tolerance_min"])
        c = _nearest(cp, t["expected_rt_min"], t["tolerance_min"])
        row = {
            "target": t["name"], "expected_rt_min": t["expected_rt_min"], "tolerance_min": t["tolerance_min"],
            "sample_peak_at_expected_rt": s is not None, "control_peak_at_expected_rt": c is not None,
            "sample_apex_rt_min": s["apex_rt_min"] if s else None,
            "sample_area": s["area"] if s else None,
            "control_apex_rt_min": c["apex_rt_min"] if c else None,
            "control_area": c["area"] if c else None,
            "ratio_sample_to_control": (s["area"] / c["area"]) if s and c and c["area"] > 0 else None,
            "control_area_over_sample_window": (window_area(*control, s["start_rt_min"], s["end_rt_min"])
                                                if s else None),
        }
        if s and not c:
            row["note"] = "no control peak at this RT; ratio not defined (see control_area_over_sample_window)"
        rows.append(row)
    return {"targets": rows, "sample_peaks": sp, "control_peaks": cp, "identification_note": IDENTIFICATION_NOTE,
            "peak_finder": "scipy.signal.find_peaks" if (peak_kw.get("use_scipy", True) and _scipy_find_peaks)
            else "numpy local maxima + prominence"}


# --------------------------------------------------------------------------- 16S

RANKS = ("domain", "phylum", "class", "order", "family", "genus", "species")
_RANK_ALIASES = {"kingdom": "domain"}
_PREFIX = {"d": "domain", "k": "domain", "p": "phylum", "c": "class", "o": "order", "f": "family", "g": "genus",
           "s": "species"}


def _split_taxonomy(tax):
    """Return {rank: name} from 'd__Bacteria; p__Firmicutes; ...' (Greengenes/SILVA,
    also 'D_0__' style) or an unprefixed 'Bacteria;Firmicutes;...' (positional)."""
    parts = [p.strip() for p in str(tax).split(";")]
    out = {}
    for pos, p in enumerate(parts):
        rank, name = None, p
        if len(p) >= 3 and p[1:3] == "__" and p[0].lower() in _PREFIX:
            rank, name = _PREFIX[p[0].lower()], p[3:]
        elif p[:2] == "D_" and "__" in p:
            lvl, name = p[2:].split("__", 1)
            rank = RANKS[int(lvl)] if lvl.isdigit() and int(lvl) < len(RANKS) else None
        elif pos < len(RANKS):
            rank = RANKS[pos]
        if rank and name.strip() and name.strip().lower() not in ("unassigned", "unclassified"):
            out[rank] = name.strip()
    return out


def taxon_at_rank(tax, rank):
    rank = _RANK_ALIASES.get(rank, rank)
    if rank not in RANKS:
        raise LabInputError(f"unknown rank {rank!r}; use one of {', '.join(RANKS)}")
    named = _split_taxonomy(tax)
    if rank in named:
        return named[rank]
    deeper_known = [r for r in RANKS[:RANKS.index(rank)] if r in named]
    if deeper_known:
        return f"{named[deeper_known[-1]]} (unassigned {rank})"
    return "Unassigned"


def _sniff_delim(path, first_line):
    return "\t" if "\t" in first_line or path.lower().endswith((".tsv", ".txt")) else ","


def read_taxonomy_tsv(path):
    """QIIME 2 taxonomy.tsv: Feature ID <tab> Taxon [<tab> Confidence]."""
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f, delimiter="\t"))
    if not rows:
        raise LabInputError(f"{path}: empty")
    head = [h.strip().lower() for h in rows[0]]
    if "taxon" not in head:
        raise LabInputError(f"{path}: needs a Taxon column")
    ti = head.index("taxon")
    return {r[0].strip(): r[ti].strip() for r in rows[1:] if r and not r[0].startswith("#") and len(r) > ti}


def read_feature_table(path, taxonomy=None):
    """Return (samples, [(taxonomy_string, {sample: count})]).

    Wide TSV/CSV: optional '# Constructed from biom file' line, then a header
    whose first cell is the feature ID column; a 'taxonomy' / 'Taxon' column
    if present. Long CSV: columns taxon, sample, count."""
    with open(path, newline="", encoding="utf-8-sig") as f:
        lines = f.read().splitlines()
    lines = [ln for ln in lines if ln.strip()]
    while lines and lines[0].startswith("#") and not lines[0].lower().startswith(("#otu id", "#feature id", "#otuid")):
        lines.pop(0)
    if not lines:
        raise LabInputError(f"{path}: no header row")
    delim = _sniff_delim(path, lines[0])
    rows = list(csv.reader(lines, delimiter=delim))
    head = [h.strip().lstrip("#").strip() for h in rows[0]]
    low = [h.lower() for h in head]
    if sorted(low) == ["count", "sample", "taxon"]:
        return _read_long(path, rows, low)
    tax_col = next((i for i, h in enumerate(low) if h in ("taxonomy", "taxon")), None)
    sample_cols = [i for i in range(1, len(head)) if i != tax_col and low[i] != "confidence"]
    if not sample_cols:
        raise LabInputError(f"{path}: no sample columns")
    samples = [head[i] for i in sample_cols]
    out = []
    for ln, r in enumerate(rows[1:], start=2):
        if not r or r[0].startswith("#"):
            continue
        fid = r[0].strip()
        if tax_col is not None and tax_col < len(r):
            tax = r[tax_col].strip()
        elif taxonomy is not None:
            if fid not in taxonomy:
                raise LabInputError(f"{path}: feature {fid!r} (line {ln}) is not in the taxonomy file")
            tax = taxonomy[fid]
        else:
            tax = fid
        try:
            counts = {head[i]: float(r[i]) for i in sample_cols}
        except (IndexError, ValueError):
            raise LabInputError(f"{path}: line {ln} has a missing or non-numeric count") from None
        if any(v < 0 or not math.isfinite(v) for v in counts.values()):
            raise LabInputError(f"{path}: line {ln} has a negative or non-finite count")
        out.append((tax, counts))
    return samples, out


def _read_long(path, rows, low):
    ti, si, ci = low.index("taxon"), low.index("sample"), low.index("count")
    acc, samples = {}, []
    for ln, r in enumerate(rows[1:], start=2):
        if not r:
            continue
        try:
            tax, s, n = r[ti].strip(), r[si].strip(), float(r[ci])
        except (IndexError, ValueError):
            raise LabInputError(f"{path}: line {ln} is malformed") from None
        if n < 0 or not math.isfinite(n):
            raise LabInputError(f"{path}: line {ln} has a negative or non-finite count")
        if s not in samples:
            samples.append(s)
        acc.setdefault(tax, {})
        acc[tax][s] = acc[tax].get(s, 0.0) + n
    return samples, [(t, {s: c.get(s, 0.0) for s in samples}) for t, c in acc.items()]


def aggregate(features, rank):
    """Sum counts per taxon name at `rank`. Returns {taxon: {sample: count}}."""
    agg = {}
    for tax, counts in features:
        name = taxon_at_rank(tax, rank)
        slot = agg.setdefault(name, {})
        for s, n in counts.items():
            slot[s] = slot.get(s, 0.0) + n
    return agg


def compare_16s(samples, features, sample, control, rank="family", pseudocount=1.0, top=20):
    for s in (sample, control):
        if s not in samples:
            raise LabInputError(f"sample {s!r} not in table; samples are: {', '.join(samples)}")
    if pseudocount <= 0:
        raise LabInputError("pseudocount must be > 0")
    agg = aggregate(features, rank)
    tot_s = sum(c.get(sample, 0.0) for c in agg.values())
    tot_c = sum(c.get(control, 0.0) for c in agg.values())
    if tot_s <= 0 or tot_c <= 0:
        raise LabInputError("sample or control has zero total reads")
    rows = []
    for name, c in agg.items():
        ns, nc = c.get(sample, 0.0), c.get(control, 0.0)
        fc = ((ns + pseudocount) / tot_s) / ((nc + pseudocount) / tot_c)
        rows.append({"taxon": name, "sample_count": ns, "control_count": nc,
                     "sample_rel_abundance": ns / tot_s, "control_rel_abundance": nc / tot_c,
                     "fold_change": fc, "log2_fold_change": math.log2(fc)})
    rows.sort(key=lambda r: (-abs(r["log2_fold_change"]), r["taxon"]))
    rel = {}
    for s in samples:
        total = sum(c.get(s, 0.0) for c in agg.values())
        if total > 0:
            rel[s] = {name: c.get(s, 0.0) / total for name, c in agg.items()}
    return {
        "rank": rank, "sample": sample, "control": control, "pseudocount": pseudocount,
        "sample_total_reads": tot_s, "control_total_reads": tot_c,
        "fold_change_formula": "((n_sample + pc) / N_sample) / ((n_control + pc) / N_control)",
        "top_changes": rows[:top], "all_taxa": rows, "relative_abundance": rel,
        "note": "One sample vs one control is descriptive, not a statistical test. Use replicates and a "
                "compositional method (ANCOM-BC, ALDEx2) for inference.",
    }


# --------------------------------------------------------------------------- CLI

def _write(obj, out):
    text = json.dumps(obj, indent=2)
    if out:
        with open(out, "w", encoding="utf-8") as f:
            f.write(text + "\n")
    else:
        print(text)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("gcms", help="compare a sample TIC with a control TIC at your method's retention times")
    g.add_argument("--sample", required=True, help="TIC CSV (retention_time_min,intensity) or .mzML")
    g.add_argument("--control", required=True)
    g.add_argument("--method", required=True, help="method JSON with targets and expected_rt_min")
    g.add_argument("--allow-example-method", action="store_true")
    g.add_argument("--min-prominence", type=float, help="absolute peak prominence (default: from noise)")
    g.add_argument("--snr", type=float, default=5.0)
    g.add_argument("--out")
    t = sub.add_parser("16s", help="relative abundance and fold change, sample vs control")
    t.add_argument("--table", required=True, help="feature table TSV/CSV, or long CSV taxon,sample,count")
    t.add_argument("--taxonomy", help="QIIME 2 taxonomy.tsv (Feature ID, Taxon) if the table has no taxonomy")
    t.add_argument("--sample", required=True)
    t.add_argument("--control", required=True)
    t.add_argument("--rank", default="family", choices=RANKS + tuple(_RANK_ALIASES))
    t.add_argument("--pseudocount", type=float, default=1.0)
    t.add_argument("--top", type=int, default=20)
    t.add_argument("--out")
    a = ap.parse_args(argv)
    try:
        if a.cmd == "gcms":
            method, targets = load_method(a.method, a.allow_example_method)
            res = compare_gcms(read_tic(a.sample), read_tic(a.control), targets, min_prominence=a.min_prominence,
                               snr=a.snr)
            res.update({"sample_file": a.sample, "control_file": a.control, "method_file": a.method,
                        "method_is_example": bool(method.get("example"))})
        else:
            tax = read_taxonomy_tsv(a.taxonomy) if a.taxonomy else None
            samples, feats = read_feature_table(a.table, tax)
            res = compare_16s(samples, feats, a.sample, a.control, a.rank, a.pseudocount, a.top)
            res.update({"table_file": a.table, "taxonomy_file": a.taxonomy})
    except (OSError, json.JSONDecodeError, LabInputError) as e:
        print(f"lab_readers: {e}", file=sys.stderr)
        return 2
    _write(res, a.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
