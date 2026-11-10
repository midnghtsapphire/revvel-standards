import argparse
import hashlib
import logging
import math
import os
import json
import uuid
from datetime import datetime, timedelta, timezone

import numpy as np
import rasterio
from rasterio.transform import from_origin
from scipy.ndimage import uniform_filter
import xml.etree.ElementTree as ET

# What was wrong: exports used the lenient check, so unsourced locations reached GeoJSON and ATAK (H1).
# from provenance import LABEL_SYNTHETIC, DataSource, provenance_block, require_provenance
from provenance import LABEL_SYNTHETIC, DataSource, provenance_block, require_export_provenance
from sar_person_finder import UNCALIBRATED_UNITS, ca_cfar, lee_filter_intensity

# NOT VALIDATED on real SAR scenes. Scores are relative rankings, not probabilities.

EARTH_RADIUS_KM = 6371.0088  # IUGG mean radius
# CoT "unknown" value for hae/ce/le (MIL-STD CoT convention used by ATAK).
COT_UNKNOWN = 9999999.0


def haversine_km(lat1, lon1, lat2, lon2):
    """Great-circle distance in km (arrays broadcast). Spherical earth: within
    about 0.5% of WGS84 geodesic distance, which is far below the other errors
    here. Replaces "degrees x 111 km", which ignored cos(latitude) (C2)."""
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dlat = p2 - p1
    dlon = np.radians(np.asarray(lon2) - np.asarray(lon1))
    a = np.sin(dlat / 2.0) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dlon / 2.0) ** 2
    return 2.0 * EARTH_RADIUS_KM * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))


def _units_text(units):
    """One label when every band shares it, else 'band: label; ...'."""
    if not isinstance(units, dict):
        return str(units)
    distinct = set(units.values())
    if len(distinct) == 1:
        return distinct.pop()
    return "; ".join(f"{k}: {v}" for k, v in units.items())


def _sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


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
        elapsed_hours=6.0,
        spread_kmh=0.25,
        min_spread_km=0.05,
        pfa=1e-6,
        guard_cells=2,
        train_cells=4,
        enl=1.0,
        despeckle_window=5,
        min_detecting_bands=1,
        calibration_constant=None,
        geolocation_error_m=None,
        run_id=None,
        max_targets=10,
    ):
        """elapsed_hours, spread_kmh, min_spread_km: the motion weight is a
        Gaussian around the LKP whose 1-sigma radius is
        max(spread_kmh * elapsed_hours, min_spread_km). ASSUMPTION: linear
        growth at 0.25 km/h, chosen so 6 h gives the earlier fixed 1.5 km. It is
        a placeholder, not lost-person-behaviour data: replace it with
        ISRID/LPB distance rings for the subject category (C2).

        pfa, guard_cells, train_cells: CA-CFAR per band on linear intensity.
        A cell is a candidate when at least min_detecting_bands bands detect
        it, so with 6 bands and min_detecting_bands=1 the per-cell false-alarm
        rate is at most 6 * pfa. enl: looks, for the Lee filter.

        calibration_constant: K so that sigma0 = intensity / K, either one
        number or {band_name: K}. Without it, backscatter is "uncalibrated DN^2".

        geolocation_error_m: stated 1-sigma geolocation error of the product.
        CoT ce combines it with the pixel size; unknown (None) gives
        ce=9999999. run_id: goes into CoT UIDs (random 8 hex chars if None)."""
        # input_is_amplitude: squaring DN to intensity is right for amplitude
        # products; set False when the raster already holds intensity/power.
        self.input_is_amplitude = input_is_amplitude
        self.elapsed_hours = elapsed_hours
        self.spread_kmh = spread_kmh
        self.min_spread_km = min_spread_km
        self.pfa = pfa
        self.guard_cells = guard_cells
        self.train_cells = train_cells
        self.enl = enl
        self.despeckle_window = despeckle_window
        self.min_detecting_bands = min_detecting_bands
        self.calibration_constant = calibration_constant
        self.geolocation_error_m = geolocation_error_m
        self.run_id = run_id
        self.max_targets = max_targets
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

    def motion_sigma_km(self, elapsed_hours):
        """1-sigma spread of the motion weight in km for the elapsed time (see __init__)."""
        if not elapsed_hours >= 0:
            raise ValueError(f"elapsed_hours must be >= 0, got {elapsed_hours!r}")
        return max(self.spread_kmh * elapsed_hours, self.min_spread_km)

    def _calibrate(self, intensity, band_name):
        """(values, units) for one band."""
        k = self.calibration_constant
        if isinstance(k, dict):
            k = k.get(band_name)
        if k is None:
            units = UNCALIBRATED_UNITS if self.input_is_amplitude else "uncalibrated DN (input read as intensity)"
            return intensity, units
        if not k > 0:
            raise ValueError(f"calibration constant for {band_name} must be > 0, got {k!r}")
        return intensity / k, f"sigma0 (intensity / calibration constant {k:g})"

    @staticmethod
    def _pixel_size_m(transform, crs, lat, lon):
        """Larger pixel side in metres at (lat, lon)."""
        rx, ry = abs(transform.a), abs(transform.e)
        if crs is not None and not crs.is_geographic:
            return max(rx, ry)  # projected CRS: units assumed metres
        dx = float(haversine_km(lat, lon, lat, lon + rx)) * 1000.0
        dy = float(haversine_km(lat, lon, lat + ry, lon)) * 1000.0
        return max(dx, dy)

    def cot_ce_m(self, pixel_size_m):
        """CoT ce: stated geolocation error combined with half the pixel diagonal
        (the furthest a point in the pixel is from its centre). Unknown error -> 9999999."""
        if self.geolocation_error_m is None or pixel_size_m is None:
            return COT_UNKNOWN
        return math.hypot(self.geolocation_error_m, pixel_size_m * math.sqrt(2.0) / 2.0)

    @staticmethod
    def lee_filter(img, size=5):
        """DEPRECATED (SYSTEM_REVIEW C1): dB-domain filter with the scene variance as
        noise; not the Lee model. Kept for reference; detection uses
        sar_person_finder.lee_filter_intensity()."""
        mean = uniform_filter(img, size)
        sqr_mean = uniform_filter(img**2, size)
        var = sqr_mean - mean**2
        overall_var = np.var(img)
        weights = var / (var + overall_var + 1e-6)
        return mean + weights * (img - mean)

    def _band_read_order(self, raster_path, descriptions):
        """(1-based band indexes in BAND_CONFIGS order, how the order was decided).

        Band descriptions that name BAND_CONFIGS bands (as generate_multiband_raster
        writes them) decide the order, so a reordered raster is read correctly. A
        raster without such descriptions is read in file order, as before, and the
        targets say so ("assumed_file_order") because nothing checked it."""
        names = list(self.BAND_CONFIGS)
        descs = [d.strip() if isinstance(d, str) else "" for d in (descriptions or ())]
        if not any(d in names for d in descs):
            logging.warning("%s: no band descriptions name %s; assuming file order", raster_path, ", ".join(names))
            return list(range(1, len(names) + 1)), "assumed_file_order"
        if sorted(descs) != sorted(names):
            raise ValueError(
                f"{raster_path} band descriptions {descs} do not name each of {', '.join(names)} exactly once"
            )
        return [descs.index(n) + 1 for n in names], "from_band_descriptions"

    def process_multiband_sar(self, raster_path, sources=None, elapsed_hours=None, allow_unverified=False):
        """sources: DataSource list naming the raster. Without it this raises
        MissingSourceError instead of returning locations (allow_unverified=True,
        for demos, falls back to provenance.STRICT).

        Returns only cells that pass CA-CFAR in at least min_detecting_bands
        bands, best fused_score first, at most max_targets. An empty list means
        nothing passed the threshold. elapsed_hours overrides the engine's."""
        # What was wrong: the docstring said this raises without sources; in default mode it did not.
        # Lesson: a promise in a docstring needs a test that fails when it is broken (H1).
        # prov = provenance_block(sources)
        prov = provenance_block(sources, strict=None if allow_unverified else True)
        elapsed = self.elapsed_hours if elapsed_hours is None else elapsed_hours
        sigma_km = self.motion_sigma_km(elapsed)
        scene_sha256 = _sha256_file(raster_path)
        run_id = self.run_id or uuid.uuid4().hex[:8]
        with rasterio.open(raster_path) as src:
            crs = src.crs
            transform = src.transform
            num_bands = src.count
            # The output reads one value per configured band, so anything other
            # than six bands crashed (fewer) or was mislabelled (more).
            if num_bands != len(self.BAND_CONFIGS):
                raise ValueError(
                    f"{raster_path} has {num_bands} bands; this engine needs exactly {len(self.BAND_CONFIGS)} "
                    f"in the order {', '.join(self.BAND_CONFIGS)}"
                )
            # The count check above says nothing about order: a six-band raster
            # with its bands shuffled was read positionally and mislabelled.
            read_order, band_order = self._band_read_order(raster_path, src.descriptions)
            # Original: every map was grid_size x grid_size, so any raster of another
            # size failed on the first band.
            shape = (src.height, src.width)

            band_db_list = []
            # fused_anomaly_map = np.zeros((self.grid_size, self.grid_size), dtype=np.float32)
            fused_anomaly_map = np.zeros(shape, dtype=np.float32)
            detecting_bands = np.zeros(shape, dtype=np.int32)
            band_units = {}

            band_keys = list(self.BAND_CONFIGS.keys())

            for b in range(1, num_bands + 1):
                # raw_dn = src.read(b)  # original: always positional
                raw_dn = src.read(read_order[b - 1])
                b_name = band_keys[b - 1] if b - 1 < len(band_keys) else f"Band_{b}"
                cfg = self.BAND_CONFIGS.get(b_name, {"weight": 1.0})

                # Calibration to Sigma0 dB
                # What was wrong: "calibration to Sigma0" came from AI-generated material
                # (NotebookLM / chatbot output) and read as
                # authoritative, but the code only squared the DN; no calibration constant was ever applied.
                # Lesson: "calibrated" needs the constant and its source, or the label is false (C1).
                # sigma0_linear = np.square(raw_dn.astype(np.float32))  # original: always squared
                # Changed for precision: float32 loses accuracy in the CFAR running sums on large scenes.
                # raw = raw_dn.astype(np.float32)
                raw = raw_dn.astype(np.float64)
                # What was wrong: the name sigma0_linear claimed a calibration that never happened (C1).
                # sigma0_linear = np.square(raw) if self.input_is_amplitude else raw
                intensity = np.square(raw) if self.input_is_amplitude else raw
                # What was wrong: converting to dB before filtering and detecting put both steps in the wrong
                # domain; speckle is multiplicative in linear intensity (C1).
                # sigma0_db = 10.0 * np.log10(np.maximum(sigma0_linear, 1e-6))

                # Despeckling
                # What was wrong: the "Lee filter" name came from AI-generated material
                # (NotebookLM / chatbot output); the code ran on dB
                # and used the whole-scene variance as noise. The Lee model uses the speckle variance from the
                # number of looks. A method's name was used without the method (C1).
                # filtered_db = self.lee_filter(sigma0_db)
                backscatter, band_units[b_name] = self._calibrate(intensity, b_name)
                filtered = lee_filter_intensity(backscatter, self.despeckle_window, self.enl)
                filtered_db = 10.0 * np.log10(np.maximum(filtered, 1e-12))
                band_db_list.append(filtered_db)

                # Adaptive CFAR Z-score Anomaly detection
                # What was wrong: "Adaptive CFAR" and the 6-band VHF-to-C fusion came from AI-generated
                # material (NotebookLM / chatbot output),
                # never run against real data. The code was one mean and std per band: no false-alarm rate, and
                # a pure-noise raster produced 10 ranked "targets". Lesson: test a detector on noise first (C1).
                # mean_val = np.mean(filtered_db)
                # std_val = np.std(filtered_db)
                # cfar_score = np.clip((filtered_db - mean_val) / (3.0 * std_val + 1e-6), 0.0, 1.0)
                # Cell-averaging CFAR on unfiltered linear intensity (filtering would void the Pfa).
                detections, cfar_score, _, n_train = ca_cfar(intensity, self.guard_cells, self.train_cells, self.pfa)
                detecting_bands += detections

                fused_anomaly_map += cfar_score * cfg["weight"]

            fused_anomaly_map /= sum(c["weight"] for c in self.BAND_CONFIGS.values())

        # Target Motion Probability Model (LKP centered)
        # rows, cols = np.indices((self.grid_size, self.grid_size))
        rows, cols = np.indices(shape)
        xs, ys = rasterio.transform.xy(transform, rows, cols)

        # lons = np.array(xs).reshape((self.grid_size, self.grid_size))
        # lats = np.array(ys).reshape((self.grid_size, self.grid_size))
        lons = np.array(xs).reshape(shape)
        lats = np.array(ys).reshape(shape)

        # What was wrong: the 111 km-per-degree shortcut ignores cos(latitude). At 49 N a degree of longitude
        # is about 73 km, so 1 km east read as 1.53 km and the map was squeezed about 35% east-west.
        # Lesson: the shortcut holds only for latitude; use a geodesic distance (C2).
        # dist_deg = np.sqrt((lats - self.lkp_lat) ** 2 + (lons - self.lkp_lon) ** 2)
        # dist_km = dist_deg * 111.0
        dist_km = haversine_km(lats, lons, self.lkp_lat, self.lkp_lon)

        # 6-hour movement decay PDF
        # What was wrong: the comment said "6-hour" but 1.5 km was a fixed constant with no source, so the
        # area was the same at 1 h and at 10 days. Lesson: a constant standing in for time must say so (C2).
        # motion_pdf = np.exp(-0.5 * (dist_km / 1.5) ** 2)
        motion_pdf = np.exp(-0.5 * (dist_km / sigma_km) ** 2)

        # Multi-band Fused Target Score
        final_score_map = fused_anomaly_map * motion_pdf

        # Extract Top Candidate Targets
        # What was wrong: sorting every pixel meant there were always 10 "targets", even in noise (C1).
        # flat_indices = np.argsort(final_score_map.ravel())[::-1]
        candidates = np.flatnonzero(detecting_bands.ravel() >= self.min_detecting_bands)
        flat_indices = candidates[np.argsort(final_score_map.ravel()[candidates])[::-1]]

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
                    # What was wrong: "confidence" reads as a probability; the value is an unscaled product (C1).
                    # "fused_confidence": round(score, 4),
                    "fused_score": round(score, 4),
                    # anomaly_score is now the weighted mean CFAR ratio (intensity / threshold) (C1)
                    "anomaly_score": round(anomaly, 4),
                    "detecting_bands": int(detecting_bands[r, c]),
                    "cfar_pfa_per_band": self.pfa,
                    "cfar_training_cells": n_train,
                    "motion_pdf_weight": round(pdf, 4),
                    "motion_sigma_km": round(sigma_km, 4),
                    "elapsed_hours": elapsed,
                    "band_backscatter_db": band_readings,
                    "backscatter_units": band_units,
                    "band_order": band_order,
                    "pixel_size_m": round(self._pixel_size_m(transform, crs, lat_val, lon_val), 3),
                    "scene_sha256": scene_sha256,
                    "run_id": run_id,
                    "provenance": prov,
                }
            )

            rank += 1
            # Changed so the cap is a setting (max_targets) rather than a number buried in the loop.
            # if len(targets) >= 10:
            if len(targets) >= self.max_targets:
                break

        return targets

    def export_geojson(self, targets, output_path, allow_unverified=False):
        features = []
        for t in targets:
            # What was wrong: the lenient check let an unsourced location be written to GeoJSON (H1).
            # prov = require_provenance(t)
            prov = require_export_provenance(t, allow_unverified=allow_unverified)
            feat = {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [t["longitude"], t["latitude"]]},
                "properties": {
                    "rank": t["rank"],
                    "callsign": f"SAR-6BAND-TARGET-#{t['rank']}",
                    # What was wrong: "confidence" in GeoJSON reads as a probability in GIS tools (C1).
                    # "confidence": t["fused_confidence"],
                    "fused_score": t["fused_score"],
                    "backscatter_units": t.get("backscatter_units", UNCALIBRATED_UNITS),
                    "motion_sigma_km": t.get("motion_sigma_km"),
                    "scene_sha256": t.get("scene_sha256"),
                    "run_id": t.get("run_id"),
                    "anomaly_score": t["anomaly_score"],
                    "motion_pdf": t["motion_pdf_weight"],
                    "multiband_db": t["band_backscatter_db"],
                    "band_order": t.get("band_order", "assumed_file_order"),
                    "status": prov["status"],
                    "ground_verified": prov["ground_verified"],
                    "sources": prov["sources"],
                },
            }
            features.append(feat)

        geojson = {"type": "FeatureCollection", "name": "BlueOcean_MultiBand_SAR_Targets", "features": features}

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(geojson, f, indent=2)

    @staticmethod
    def cot_uid(target, fallback_run):
        """SAR-<scene sha256[:8]>-<run id>-R<rank>: unique per scene and run, so a
        new run does not overwrite another run's markers on every ATAK device (H3)."""
        scene = (target.get("scene_sha256") or "noscene")[:8]
        return f"SAR-{scene}-{target.get('run_id') or fallback_run}-R{target['rank']}"

    def export_cot_xml(self, targets, xml_path, now=None, allow_unverified=False):
        """All targets in one <events> wrapper. Handy for archiving, but ATAK imports
        one <event> per file or message: use export_cot_files() for the map."""
        root = ET.Element("events", version="2.0", source="BlueOcean-SAR-6Band-Engine")
        now = now or datetime.now(timezone.utc)
        fallback_run = now.strftime("%Y%m%dT%H%M%SZ")

        for t in targets:
            # What was wrong: the lenient check let an unsourced location become an ATAK marker (H1).
            # prov = require_provenance(t)
            prov = require_export_provenance(t, allow_unverified=allow_unverified)
            event = ET.SubElement(
                root,
                "event",
                {
                    "version": "2.0",
                    # What was wrong: the UID was rank only, so every run's rank 1 replaced every other run's
                    # rank 1 on every ATAK device. Lesson: a UID must name the scene and run (H3).
                    # "uid": f"SAR-6BAND-RANK-{t['rank']}",
                    "uid": self.cot_uid(t, fallback_run),
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
            # What was wrong: hae=0 states the point is on the ellipsoid and ce/le=10 states 10 m accuracy.
            # Neither was measured; ATAK displays placeholders as fact. Lesson: when a value is unknown,
            # send the format's "unknown" value (9999999), not a plausible number (H3).
            # ET.SubElement(
            #     event,
            #     "point",
            #     {"lat": str(t["latitude"]), "lon": str(t["longitude"]), "hae": "0.0", "ce": "10.0", "le": "10.0"},
            # )
            ce = self.cot_ce_m(t.get("pixel_size_m"))
            ET.SubElement(
                event,
                "point",
                {
                    "lat": str(t["latitude"]),
                    "lon": str(t["longitude"]),
                    "hae": str(COT_UNKNOWN),
                    "ce": str(COT_UNKNOWN if ce == COT_UNKNOWN else round(ce, 1)),
                    "le": str(COT_UNKNOWN),
                },
            )
            detail = ET.SubElement(event, "detail")
            # Original callsign showed the score as a percentage, which reads as a
            # probability on an ATAK screen:
            # ET.SubElement(
            #     detail, "contact", callsign=f"SAR-6BAND-TARGET-#{t['rank']} ({t['fused_confidence'] * 100:.1f}%)"
            # )
            prefix = "SYNTHETIC " if prov["status"] == LABEL_SYNTHETIC else "UNVERIFIED "
            ET.SubElement(detail, "contact", callsign=f"{prefix}SAR-6BAND-#{t['rank']}")
            ET.SubElement(detail, "usericon", iconsetpath="COT_MAPPING_2525B/Emergency/Search & Rescue")
            ET.SubElement(detail, "color", argb="-65536" if t["rank"] <= 2 else "-256")

            db_summary = ", ".join([f"{k}: {v}dB" for k, v in t["band_backscatter_db"].items()])
            remarks = (
                f"{prov['status']}\n"
                f"Sources: {'; '.join(src['description'] for src in prov['sources'])}\n"
                f"[Blue Ocean 6-Band SAR] Rank {t['rank']} Target\n"
                # What was wrong: "Fused Confidence" on an ATAK screen reads as a probability (C1).
                # f"Fused Confidence: {t['fused_confidence']}\n"
                f"Fused score (ranking, not a probability): {t['fused_score']}\n"
                f"Backscatter units: {_units_text(t.get('backscatter_units', UNCALIBRATED_UNITS))}\n"
                f"Scene sha256: {t.get('scene_sha256', 'unknown')} run {t.get('run_id', fallback_run)}\n"
                f"Position error: {'unknown' if ce == COT_UNKNOWN else f'ce {ce:.1f} m'}\n"
                f"Multi-Band Spectrum: {db_summary}\n"
                # The band-order note reached GeoJSON only, so ATAK users never saw that the
                # band labels were assumed from file order.
                f"Band order: {t.get('band_order', 'assumed_file_order')}\n"
                f"Coords: {t['latitude']:.6f}, {t['longitude']:.6f}"
            )
            ET.SubElement(detail, "remarks").text = remarks

        tree = ET.ElementTree(root)
        ET.indent(tree, space="  ")
        os.makedirs(os.path.dirname(xml_path) or ".", exist_ok=True)
        tree.write(xml_path, encoding="utf-8", xml_declaration=True)

    def export_cot_files(self, targets, out_dir, now=None, allow_unverified=False):
        """One standalone .cot file per target (what ATAK/WinTAK Import Manager expects)."""
        tmp = os.path.join(out_dir, ".combined.xml")
        # Nothing wrong with this line itself; it changed so the --demo opt-out reaches the export (H1).
        # self.export_cot_xml(targets, tmp, now=now)
        self.export_cot_xml(targets, tmp, now=now, allow_unverified=allow_unverified)
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
    ap.add_argument("--elapsed-hours", type=float, default=6.0, help="hours since last known position")
    ap.add_argument("--geolocation-error-m", type=float, default=None,
                    help="stated 1-sigma geolocation error of the product (CoT ce is unknown without it)")
    ap.add_argument("--demo", "--allow-unverified", dest="allow_unverified", action="store_true",
                    help="export even when sources are missing or incomplete (labelled UNSOURCED); demos only")
    # Nothing wrong with this line itself; it changed to read the new options (C2, H1, H3).
    # out_dir = ap.parse_args().out_dir
    args = ap.parse_args()
    out_dir = args.out_dir
    # What was wrong: elapsed time and geolocation error could not be given, so fixed defaults stood in
    # for facts about the case and the product (C2, H3).
    # engine = MultiBandSAREngine()
    engine = MultiBandSAREngine(elapsed_hours=args.elapsed_hours, geolocation_error_m=args.geolocation_error_m)
    # raster_file = "/workspace/scratch/sar_multiband_sample.tif"  # original fixed path
    raster_file = os.path.join(out_dir, "sar_multiband_sample.tif")
    engine.generate_multiband_raster(raster_file)

    # targets = engine.process_multiband_sar(raster_file)  # original: no source named
    targets = engine.process_multiband_sar(
        raster_file,
        sources=[DataSource("generate_multiband_raster(): random speckle with injected targets", "synthetic")],
        allow_unverified=args.allow_unverified,
    )
    print("--- 6-BAND SAR TARGET DETECTION COMPLETED ---")
    print(json.dumps(targets[:5], indent=2))

    # geojson_out = "/workspace/scratch/sar_candidates_v3.geojson"  # original fixed path
    # cot_xml_out = "/workspace/scratch/sar_cot_markers_v3.xml"      # original fixed path
    geojson_out = os.path.join(out_dir, "sar_candidates_v3.geojson")
    cot_xml_out = os.path.join(out_dir, "sar_cot_markers_v3.xml")

    # Nothing wrong with these lines themselves; they changed so --demo reaches the exports (H1).
    # engine.export_geojson(targets, geojson_out)
    # engine.export_cot_xml(targets, cot_xml_out)
    # engine.export_cot_files(targets, os.path.join(out_dir, "cot"))
    engine.export_geojson(targets, geojson_out, allow_unverified=args.allow_unverified)
    engine.export_cot_xml(targets, cot_xml_out, allow_unverified=args.allow_unverified)
    engine.export_cot_files(targets, os.path.join(out_dir, "cot"), allow_unverified=args.allow_unverified)
    print("Successfully exported 6-band GeoJSON and CoT XML markers.")
