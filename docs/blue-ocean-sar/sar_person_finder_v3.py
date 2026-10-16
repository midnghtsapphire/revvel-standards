import argparse
import os
import json
from datetime import datetime, timedelta, timezone

import numpy as np
import rasterio
from rasterio.transform import from_origin
from scipy.ndimage import uniform_filter
import xml.etree.ElementTree as ET

# NOT VALIDATED on real SAR scenes. Scores are relative rankings, not probabilities.


def _cot_time(t):
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


class MultiBandSAREngine:
    """
    Blue Ocean SAR Multi-Band Processing Engine (Bands A, B, C, D, E, F)

    Band Definitions & Radar Spectrum Sensitivity:
      - Band A (VHF / ~200 MHz): Maximum canopy & sub-surface penetration
      - Band B (UHF / ~400 MHz): P-Band equivalent, heavy biomass penetration
      - Band C (800 MHz): Low L-band transition, branch/trunk scattering
      - Band D (1.5 GHz): L-Band standard (ALOS/NISAR), deep forest canopy penetration
      - Band E (3.0 GHz): S-Band standard, foliage/ground hybrid sensitivity
      - Band F (5.5 GHz): C-Band standard (Sentinel-1), fine surface structure / shelter detection
    """

    BAND_CONFIGS = {
        "Band_A": {"freq_ghz": 0.2, "wavelength_m": 1.50, "weight": 1.1, "desc": "VHF Canopy & Ground Penetration"},
        "Band_B": {"freq_ghz": 0.4, "wavelength_m": 0.75, "weight": 1.1, "desc": "P-band Heavy Biomass Penetration"},
        "Band_C": {"freq_ghz": 0.8, "wavelength_m": 0.375, "weight": 1.0, "desc": "Low L-band Trunk/Branch Scattering"},
        "Band_D": {"freq_ghz": 1.5, "wavelength_m": 0.20, "weight": 1.2, "desc": "L-band Forest Canopy Penetration"},
        "Band_E": {"freq_ghz": 3.0, "wavelength_m": 0.10, "weight": 1.0, "desc": "S-band Foliage/Ground Hybrid"},
        "Band_F": {
            "freq_ghz": 5.5,
            "wavelength_m": 0.055,
            "weight": 1.3,
            "desc": "C-band Fine Structure / Tarp Detection",
        },
    }

    def __init__(
        self,
        lkp_lat=49.3825,
        lkp_lon=-122.9415,
        grid_size=100,
        res_deg=0.0001,
        input_is_amplitude=True,
        min_separation_px=2,
        stale_hours=24.0,
    ):
        # input_is_amplitude: squaring DN to intensity is right for amplitude
        # products; set False when the raster already holds intensity/power.
        self.input_is_amplitude = input_is_amplitude
        self.min_separation_px = min_separation_px
        self.stale_hours = stale_hours
        self.lkp_lat = lkp_lat
        self.lkp_lon = lkp_lon
        self.grid_size = grid_size
        self.res_deg = res_deg

    def generate_multiband_raster(self, raster_path):
        """Generates a synthetic 6-band Sentinel/Multi-SAR GeoTIFF raster for testing."""
        os.makedirs(os.path.dirname(raster_path) or ".", exist_ok=True)
        transform = from_origin(self.lkp_lon - 0.005, self.lkp_lat + 0.005, self.res_deg, self.res_deg)

        np.random.seed(101)
        bands_data = []

        for band_name, cfg in self.BAND_CONFIGS.items():
            base = np.random.gamma(shape=2.0, scale=5.0, size=(self.grid_size, self.grid_size))

            # Inject anomalies into specific bands
            base[52, 49] += 450.0 * (cfg["freq_ghz"] ** 0.5)
            base[60, 32] += 500.0 / (cfg["freq_ghz"] ** 0.3)
            base[53, 49] += 250.0
            base[62, 16] += 200.0 * cfg["weight"]

            bands_data.append(base.astype(np.float32))

        stacked_bands = np.array(bands_data)

        with rasterio.open(
            raster_path,
            "w",
            driver="GTiff",
            height=self.grid_size,
            width=self.grid_size,
            count=6,
            dtype=stacked_bands.dtype,
            crs="EPSG:4326",
            transform=transform,
        ) as dst:
            for idx, data in enumerate(stacked_bands, start=1):
                dst.write(data, idx)
                dst.set_band_description(idx, list(self.BAND_CONFIGS.keys())[idx - 1])

        return raster_path

    @staticmethod
    def lee_filter(img, size=5):
        mean = uniform_filter(img, size)
        sqr_mean = uniform_filter(img**2, size)
        var = sqr_mean - mean**2
        overall_var = np.var(img)
        weights = var / (var + overall_var + 1e-6)
        return mean + weights * (img - mean)

    def process_multiband_sar(self, raster_path):
        with rasterio.open(raster_path) as src:
            transform = src.transform
            num_bands = src.count

            band_db_list = []
            fused_anomaly_map = np.zeros((self.grid_size, self.grid_size), dtype=np.float32)

            band_keys = list(self.BAND_CONFIGS.keys())

            for b in range(1, num_bands + 1):
                raw_dn = src.read(b)
                b_name = band_keys[b - 1] if b - 1 < len(band_keys) else f"Band_{b}"
                cfg = self.BAND_CONFIGS.get(b_name, {"weight": 1.0})

                # Calibration to Sigma0 dB
                # sigma0_linear = np.square(raw_dn.astype(np.float32))  # original: always squared
                raw = raw_dn.astype(np.float32)
                sigma0_linear = np.square(raw) if self.input_is_amplitude else raw
                sigma0_db = 10.0 * np.log10(np.maximum(sigma0_linear, 1e-6))

                # Despeckling
                filtered_db = self.lee_filter(sigma0_db)
                band_db_list.append(filtered_db)

                # Adaptive CFAR Z-score Anomaly detection
                mean_val = np.mean(filtered_db)
                std_val = np.std(filtered_db)
                cfar_score = np.clip((filtered_db - mean_val) / (3.0 * std_val + 1e-6), 0.0, 1.0)

                fused_anomaly_map += cfar_score * cfg["weight"]

            fused_anomaly_map /= sum(c["weight"] for c in self.BAND_CONFIGS.values())

        # Target Motion Probability Model (LKP centered)
        rows, cols = np.indices((self.grid_size, self.grid_size))
        xs, ys = rasterio.transform.xy(transform, rows, cols)

        lons = np.array(xs).reshape((self.grid_size, self.grid_size))
        lats = np.array(ys).reshape((self.grid_size, self.grid_size))

        dist_deg = np.sqrt((lats - self.lkp_lat) ** 2 + (lons - self.lkp_lon) ** 2)
        dist_km = dist_deg * 111.0

        # 6-hour movement decay PDF
        motion_pdf = np.exp(-0.5 * (dist_km / 1.5) ** 2)

        # Multi-band Fused Target Score
        final_score_map = fused_anomaly_map * motion_pdf

        # Extract Top Candidate Targets
        flat_indices = np.argsort(final_score_map.ravel())[::-1]

        targets = []
        seen_coords = set()
        picked = []  # accepted (row, col) for non-maximum suppression
        rank = 1

        for idx in flat_indices:
            r, c = np.unravel_index(idx, final_score_map.shape)
            # Adjacent pixels of one object were ranked as separate targets.
            if any(max(abs(r - pr), abs(c - pc)) <= self.min_separation_px for pr, pc in picked):
                continue
            picked.append((r, c))
            lat_val = float(lats[r, c])
            lon_val = float(lons[r, c])

            coord_key = (round(lat_val, 4), round(lon_val, 4))
            if coord_key in seen_coords:
                continue
            seen_coords.add(coord_key)

            score = float(final_score_map[r, c])
            anomaly = float(fused_anomaly_map[r, c])
            pdf = float(motion_pdf[r, c])

            band_readings = {
                b_name: round(float(band_db_list[i][r, c]), 2) for i, b_name in enumerate(self.BAND_CONFIGS.keys())
            }

            targets.append(
                {
                    "rank": rank,
                    "latitude": lat_val,
                    "longitude": lon_val,
                    "fused_confidence": round(score, 4),
                    "anomaly_score": round(anomaly, 4),
                    "motion_pdf_weight": round(pdf, 4),
                    "band_backscatter_db": band_readings,
                }
            )

            rank += 1
            if len(targets) >= 10:
                break

        return targets

    def export_geojson(self, targets, output_path):
        features = []
        for t in targets:
            feat = {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [t["longitude"], t["latitude"]]},
                "properties": {
                    "rank": t["rank"],
                    "callsign": f"SAR-6BAND-TARGET-#{t['rank']}",
                    "confidence": t["fused_confidence"],
                    "anomaly_score": t["anomaly_score"],
                    "motion_pdf": t["motion_pdf_weight"],
                    "multiband_db": t["band_backscatter_db"],
                },
            }
            features.append(feat)

        geojson = {"type": "FeatureCollection", "name": "BlueOcean_MultiBand_SAR_Targets", "features": features}

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(geojson, f, indent=2)

    def export_cot_xml(self, targets, xml_path, now=None):
        """All targets in one <events> wrapper. Handy for archiving, but ATAK imports
        one <event> per file or message: use export_cot_files() for the map."""
        root = ET.Element("events", version="2.0", source="BlueOcean-SAR-6Band-Engine")
        now = now or datetime.now(timezone.utc)

        for t in targets:
            event = ET.SubElement(
                root,
                "event",
                {
                    "version": "2.0",
                    "uid": f"SAR-6BAND-RANK-{t['rank']}",
                    "type": "b-r-a-p-s",
                    # Original fixed times (markers went stale on 2026-10-15):
                    # "time": "2026-10-14T21:03:00Z",
                    # "start": "2026-10-14T21:03:00Z",
                    # "stale": "2026-10-15T21:03:00Z",
                    "time": _cot_time(now),
                    "start": _cot_time(now),
                    "stale": _cot_time(now + timedelta(hours=self.stale_hours)),
                    "how": "h-e",
                },
            )
            ET.SubElement(
                event,
                "point",
                {"lat": str(t["latitude"]), "lon": str(t["longitude"]), "hae": "0.0", "ce": "10.0", "le": "10.0"},
            )
            detail = ET.SubElement(event, "detail")
            ET.SubElement(
                detail, "contact", callsign=f"SAR-6BAND-TARGET-#{t['rank']} ({t['fused_confidence'] * 100:.1f}%)"
            )
            ET.SubElement(detail, "usericon", iconsetpath="COT_MAPPING_2525B/Emergency/Search & Rescue")
            ET.SubElement(detail, "color", argb="-65536" if t["rank"] <= 2 else "-256")

            db_summary = ", ".join([f"{k}: {v}dB" for k, v in t["band_backscatter_db"].items()])
            remarks = (
                f"[Blue Ocean 6-Band SAR] Rank {t['rank']} Target\n"
                f"Fused Confidence: {t['fused_confidence']}\n"
                f"Multi-Band Spectrum: {db_summary}\n"
                f"Coords: {t['latitude']:.6f}, {t['longitude']:.6f}"
            )
            ET.SubElement(detail, "remarks").text = remarks

        tree = ET.ElementTree(root)
        ET.indent(tree, space="  ")
        os.makedirs(os.path.dirname(xml_path) or ".", exist_ok=True)
        tree.write(xml_path, encoding="utf-8", xml_declaration=True)

    def export_cot_files(self, targets, out_dir, now=None):
        """One standalone .cot file per target (what ATAK/WinTAK Import Manager expects)."""
        tmp = os.path.join(out_dir, ".combined.xml")
        self.export_cot_xml(targets, tmp, now=now)
        root = ET.parse(tmp).getroot()
        os.replace(tmp, tmp + ".last")  # keep the combined file rather than removing it
        paths = []
        for ev in root.findall("event"):
            path = os.path.join(out_dir, f"{ev.get('uid')}.cot")
            ET.ElementTree(ev).write(path, encoding="utf-8", xml_declaration=True)
            paths.append(path)
        return paths


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Blue Ocean 6-band SAR engine demo (synthetic raster)")
    ap.add_argument("--out-dir", default="sar_v3_output", help="directory for raster, GeoJSON and CoT output")
    out_dir = ap.parse_args().out_dir
    engine = MultiBandSAREngine()
    # raster_file = "/workspace/scratch/sar_multiband_sample.tif"  # original fixed path
    raster_file = os.path.join(out_dir, "sar_multiband_sample.tif")
    engine.generate_multiband_raster(raster_file)

    targets = engine.process_multiband_sar(raster_file)
    print("--- 6-BAND SAR TARGET DETECTION COMPLETED ---")
    print(json.dumps(targets[:5], indent=2))

    # geojson_out = "/workspace/scratch/sar_candidates_v3.geojson"  # original fixed path
    # cot_xml_out = "/workspace/scratch/sar_cot_markers_v3.xml"      # original fixed path
    geojson_out = os.path.join(out_dir, "sar_candidates_v3.geojson")
    cot_xml_out = os.path.join(out_dir, "sar_cot_markers_v3.xml")

    engine.export_geojson(targets, geojson_out)
    engine.export_cot_xml(targets, cot_xml_out)
    engine.export_cot_files(targets, os.path.join(out_dir, "cot"))
    print("Successfully exported 6-band GeoJSON and CoT XML markers.")
