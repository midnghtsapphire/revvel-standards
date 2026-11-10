#!/usr/bin/env python3
"""Optional Streamlit viewer for fusion.py and lab_readers.py outputs.

Replaces the display side of ryverly_recon_app-v6.py (docs/case-files). That
app showed typed-in anomaly scores, GC-MS peaks, 16S abundances and alert
delivery logs (Slack/Twilio entries with phone numbers that were never sent),
and defaulted to a street address. This one shows only what you upload:

  * Ranked sites  - the JSON written by fusion.py
  * GC-MS         - a sample TIC, a control TIC and your method JSON
  * 16S           - a feature table (and optional QIIME 2 taxonomy.tsv)

With nothing uploaded every tab is empty. There is no alerting, no sample
data and no default location: a search centre is shown only if you type its
coordinates. All computation is in fusion.py and lab_readers.py.

  pip install streamlit
  streamlit run ryverly_app.py
"""

import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lab_readers  # noqa: E402

try:
    import streamlit as st
except ImportError:
    st = None


def _to_temp(upload, suffix):
    """Streamlit uploads are in memory; the readers take paths."""
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as f:
        f.write(upload.getvalue())
    return path


def _suffix(upload, default):
    name = upload.name.lower()
    for ext in (".mzml.gz", ".mzml", ".csv", ".tsv", ".txt", ".json"):
        if name.endswith(ext):
            return ext
    return default


def parse_centre(lat_text, lon_text):
    """Return (lat, lon) floats, None if both blank, or raise ValueError."""
    if not lat_text.strip() and not lon_text.strip():
        return None
    lat, lon = float(lat_text), float(lon_text)
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError("latitude must be -90..90 and longitude -180..180")
    return lat, lon


def fusion_rows(result):
    """Flatten fusion.py output for display: one row per site, every layer's
    raw value, normalised value and weight."""
    rows = []
    for s in result.get("sites", []):
        row = {"rank": s.get("rank"), "site_id": s.get("site_id"), "score": s.get("score"),
               "lat": s.get("lat"), "lon": s.get("lon"), "missing_layers": ", ".join(s.get("missing_layers", []))}
        for name, e in s.get("layers", {}).items():
            row[f"{name} raw"] = e.get("raw_value")
            row[f"{name} norm"] = e.get("normalised")
            row[f"{name} w"] = e.get("weight")
        rows.append(row)
    return rows


def _tab_sites(centre):
    up = st.file_uploader("fusion.py output (JSON)", type=["json"], key="fusion")
    if up is None:
        st.info("No ranked-site file loaded. Run fusion.py and upload its --out JSON.")
        return
    try:
        result = json.loads(up.getvalue().decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        st.error(f"Not a JSON file: {e}")
        return
    if result.get("tool") != "fusion.py":
        st.error("This JSON was not written by fusion.py.")
        return
    st.caption(f"Score: {result.get('score_kind')}. Formula: {result.get('score_formula')}.")
    st.caption(f"Config {result.get('config_file')} (sha256 {result.get('config_sha256', '')[:12]}...)")
    st.dataframe(result.get("layers", []), use_container_width=True)
    rows = fusion_rows(result)
    st.dataframe(rows, use_container_width=True)
    pts = [{"lat": r["lat"], "lon": r["lon"]} for r in rows if r["lat"] is not None and r["lon"] is not None]
    if centre:
        pts.append({"lat": centre[0], "lon": centre[1]})
    if pts:
        st.map(pts)
    st.download_button("Download this JSON", data=up.getvalue(), file_name=up.name, mime="application/json")


def _tab_gcms():
    c1, c2, c3 = st.columns(3)
    s_up = c1.file_uploader("Sample TIC (CSV or mzML)", key="gc_s")
    c_up = c2.file_uploader("Control TIC (CSV or mzML)", key="gc_c")
    m_up = c3.file_uploader("Method JSON (targets + expected RTs)", type=["json"], key="gc_m")
    allow_example = st.checkbox("Allow a method file marked as an example", value=False)
    if not (s_up and c_up and m_up):
        st.info("Upload a sample TIC, a control TIC and your method file to compare them.")
        return
    paths = [_to_temp(s_up, _suffix(s_up, ".csv")), _to_temp(c_up, _suffix(c_up, ".csv")), _to_temp(m_up, ".json")]
    try:
        method, targets = lab_readers.load_method(paths[2], allow_example)
        sample, control = lab_readers.read_tic(paths[0]), lab_readers.read_tic(paths[1])
        res = lab_readers.compare_gcms(sample, control, targets)
    except (OSError, ValueError) as e:
        st.error(str(e))
        return
    finally:
        for p in paths:
            os.unlink(p)
    if method.get("example"):
        st.warning("The method file is marked as an example; its retention times are not from your method.")
    st.warning(res["identification_note"])
    st.dataframe(res["targets"], use_container_width=True)
    import pandas as pd  # a streamlit dependency

    frames = [pd.DataFrame({"retention_time_min": rt, "intensity": y, "trace": label})
              for label, (rt, y) in (("sample", sample), ("control", control))]
    st.line_chart(pd.concat(frames), x="retention_time_min", y="intensity", color="trace")
    with st.expander("All detected peaks"):
        st.write("Sample")
        st.dataframe(res["sample_peaks"], use_container_width=True)
        st.write("Control")
        st.dataframe(res["control_peaks"], use_container_width=True)


def _tab_16s():
    c1, c2 = st.columns(2)
    t_up = c1.file_uploader("Feature table (biom TSV export, or CSV taxon,sample,count)", key="t16")
    x_up = c2.file_uploader("Optional QIIME 2 taxonomy.tsv", key="x16")
    if t_up is None:
        st.info("Upload a 16S feature table to compare a sample with a control.")
        return
    paths = [_to_temp(t_up, _suffix(t_up, ".tsv"))] + ([_to_temp(x_up, ".tsv")] if x_up else [])
    try:
        tax = lab_readers.read_taxonomy_tsv(paths[1]) if x_up else None
        samples, feats = lab_readers.read_feature_table(paths[0], tax)
    except (OSError, ValueError) as e:
        st.error(str(e))
        return
    finally:
        for p in paths:
            os.unlink(p)
    c1, c2, c3, c4 = st.columns(4)
    sample = c1.selectbox("Sample", samples, index=None, placeholder="choose")
    control = c2.selectbox("Control", samples, index=None, placeholder="choose")
    rank = c3.selectbox("Rank", lab_readers.RANKS, index=lab_readers.RANKS.index("family"))
    pc = c4.number_input("Pseudocount (reads)", min_value=0.001, value=1.0)
    if not sample or not control:
        st.info("Choose which column is the sample and which is the control.")
        return
    try:
        res = lab_readers.compare_16s(samples, feats, sample, control, rank, pc, top=25)
    except ValueError as e:
        st.error(str(e))
        return
    st.caption(f"Fold change = {res['fold_change_formula']}. {res['note']}")
    st.dataframe(res["top_changes"], use_container_width=True)
    st.bar_chart({r["taxon"]: r["log2_fold_change"] for r in res["top_changes"]})


def run_app():
    st.set_page_config(page_title="Ryverly viewer", layout="wide")
    st.title("Ryverly viewer")
    st.caption("Shows only files you upload. No sample data, no alerts, no default location.")
    st.sidebar.subheader("Search centre (optional)")
    lat_text = st.sidebar.text_input("Latitude (decimal degrees)", value="")
    lon_text = st.sidebar.text_input("Longitude (decimal degrees)", value="")
    try:
        centre = parse_centre(lat_text, lon_text)
    except ValueError as e:
        st.sidebar.error(f"Coordinates not understood: {e}")
        centre = None
    if centre:
        st.sidebar.write(f"Centre: {centre[0]:.6f}, {centre[1]:.6f}")
    t1, t2, t3 = st.tabs(["Ranked sites", "GC-MS", "16S"])
    with t1:
        _tab_sites(centre)
    with t2:
        _tab_gcms()
    with t3:
        _tab_16s()


def main():
    if st is None:
        print("ryverly_app: streamlit is not installed (pip install streamlit); the command-line tools "
              "fusion.py and lab_readers.py work without it.", file=sys.stderr)
        return 2
    run_app()
    return 0


if __name__ == "__main__":
    code = main()
    if code:
        sys.exit(code)
