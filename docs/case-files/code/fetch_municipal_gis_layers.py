#!/usr/bin/env python3
"""
fetch_municipal_gis_layers.py
=============================
Modular CLI and Python library to query public municipal GIS REST endpoints,
USGS 3DEP / NRCan LiDAR elevation servers, and SUE utility layers for any input GPS bounding box.

Uses ogr2ogr, pdal, and standard Python geospatial libraries.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

# Mandatory Data Provenance and Taphonomic Standards Metadata
DATA_PROVENANCE_SCHEMA = {
    "sensor_types": ["ArcGIS REST", "USGS 3DEP LiDAR", "NRCan Elevation API", "SUE Quality Level A/B"],
    "temporal_window_defaults": ["Spring Thaw Runoff (Apr)", "Autumn Stack-Effect (Oct)"],
    "taphonomic_stages": {
        "Year_0_1": "Initial displacement, vegetation crushing, peak VOC release (>15 PPM)",
        "Year_2_3": "Soft tissue decay, void collapse, soil slumping / mound indentation",
        "Year_4_5_Plus": "Siltation, leaf litter burial, soil eDNA / nitrogen flushes persist"
    }
}


def build_pdal_ground_pipeline(input_laz: str, output_laz: str) -> dict:
    """Generates a PDAL pipeline JSON specification for bare-earth ground filtering."""
    pipeline = {
        "pipeline": [
            input_laz,
            {
                "type": "filters.assign",
                "assignment": "Classification[:]=0"
            },
            {
                "type": "filters.elm"
            },
            {
                "type": "filters.outlier"
            },
            {
                "type": "filters.smrf",
                "ignore": "Classification[7:7]",
                "slope": 0.2,
                "window": 16.0,
                "threshold": 0.45,
                "scalar": 1.2
            },
            {
                "type": "filters.range",
                "limits": "Classification[2:2]"
            },
            output_laz
        ]
    }
    return pipeline


def query_arcgis_rest_vector(endpoint_url: str, bbox: tuple, output_geojson: str) -> bool:
    """
    Queries an ArcGIS REST FeatureServer using ogr2ogr for vector layers
    (Sewer inverts, catch basins, utility vaults, SUE layers).
    bbox: (lon_min, lat_min, lon_max, lat_max)
    """
    lon_min, lat_min, lon_max, lat_max = bbox
    bbox_str = f"{lon_min},{lat_min},{lon_max},{lat_max}"
    
    # Construct ogr2ogr command for ESRI ArcGIS REST Endpoint
    cmd = [
        "ogr2ogr",
        "-f", "GeoJSON",
        output_geojson,
        f"ESRI:{endpoint_url}",
        "-spat", str(lon_min), str(lat_min), str(lon_max), str(lat_max),
        "-skipfailures"
    ]
    
    print(f"[*] Querying ArcGIS REST Vector Endpoint: {endpoint_url}")
    print(f"[*] Bounding Box: {bbox_str}")
    
    try:
        # Check if ogr2ogr is installed
        if not shutil.which("ogr2ogr"):
            print("[!] Warning: ogr2ogr CLI utility not found in PATH. Saving query definition instead.")
            query_meta = {
                "endpoint": endpoint_url,
                "bbox": bbox,
                "status": "CLI_PENDING_INSTALL",
                "recommended_command": " ".join(cmd)
            }
            with open(output_geojson, "w") as f:
                json.dump(query_meta, f, indent=2)
            return True
            
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            print(f"[+] Successfully exported vector layer to {output_geojson}")
            return True
        else:
            print(f"[!] ogr2ogr exited with error: {result.stderr.strip()}")
            return False
    except Exception as e:
        print(f"[!] Execution failed: {e}")
        return False


def fetch_usgs_3dep_lidar(bbox: tuple, output_dir: str) -> str:
    """
    Constructs a PDAL / Py3DEP pipeline configuration to fetch bare-earth LiDAR point clouds
    from the USGS 3DEP AWS Public Dataset bucket.
    """
    lon_min, lat_min, lon_max, lat_max = bbox
    os.makedirs(output_dir, exist_ok=True)
    
    pipeline_file = os.path.join(output_dir, "usgs_3dep_pdal_pipeline.json")
    output_laz = os.path.join(output_dir, "bare_earth_pointcloud.laz")
    
    # EPT (Entwine Point Tile) resource for USGS 3DEP
    ept_url = "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_PA_SouthCentral_2019_D19/"
    
    pdal_pipeline = {
        "pipeline": [
            {
                "type": "readers.ept",
                "filename": ept_url,
                "bounds": f"([{lon_min}, {lon_max}], [{lat_min}, {lat_max}])"
            },
            {
                "type": "filters.smrf"
            },
            {
                "type": "writers.las",
                "filename": output_laz,
                "compression": "laszip"
            }
        ]
    }
    
    with open(pipeline_file, "w") as f:
        json.dump(pdal_pipeline, f, indent=2)
        
    print(f"[+] Generated PDAL 3DEP Pipeline Spec: {pipeline_file}")
    return pipeline_file


def main():
    parser = argparse.ArgumentParser(
        description="Municipal GIS, SUE Utility, and Bare-Earth LiDAR Data Acquisition Engine"
    )
    parser.add_argument("--lat-min", type=float, default=39.995, help="Min Latitude")
    parser.add_argument("--lat-max", type=float, default=40.002, help="Max Latitude")
    parser.add_argument("--lon-min", type=float, default=-83.010, help="Min Longitude")
    parser.add_argument("--lon-max", type=float, default=-83.000, help="Max Longitude")
    parser.add_argument("--out-dir", type=str, default="/workspace/scratch/gis_layers", help="Output directory")
    
    args = parser.parse_args()
    bbox = (args.lon_min, args.lat_min, args.lon_max, args.lat_max)
    
    os.makedirs(args.out_dir, exist_ok=True)
    
    print("==========================================================================")
    print("  PROJECT AEGIS: MUNICIPAL GIS & LiDAR DATA ACQUISITION PIPELINE")
    print("==========================================================================")
    print(f"Target Bounding Box: {bbox}")
    
    # 1. Generate USGS 3DEP LiDAR Pipeline
    lidar_spec = fetch_usgs_3dep_lidar(bbox, args.out_dir)
    
    # 2. Query Municipal Vector Layers (Sewer inverts & Stormwater)
    sewer_geojson = os.path.join(args.out_dir, "municipal_sewer_inverts.geojson")
    sample_endpoint = "https://services.arcgis.com/sample/ArcGIS/rest/services/Sewer_Utility/FeatureServer/0"
    query_arcgis_rest_vector(sample_endpoint, bbox, sewer_geojson)
    
    # 3. Log Data Provenance Manifest
    manifest_path = os.path.join(args.out_dir, "data_provenance_manifest.json")
    manifest_data = {
        "bbox": bbox,
        "provenance_metadata": DATA_PROVENANCE_SCHEMA,
        "generated_files": [lidar_spec, sewer_geojson]
    }
    with open(manifest_path, "w") as f:
        json.dump(manifest_data, f, indent=2)
        
    print(f"[+] Acquisition Manifest written to: {manifest_path}")
    print("==========================================================================")

if __name__ == "__main__":
    main()
