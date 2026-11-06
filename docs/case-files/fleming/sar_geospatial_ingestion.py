# sar_geospatial_ingestion.py
import numpy as np
import rasterio
from rasterio.transform import from_origin

def ingest_dem_and_detect_depressions(dem_path, output_raster_path):
    """
    Ingests high-resolution Digital Elevation Model (DEM) data and isolates subtle topographical
    depressions (Phase 2/Phase 3 anomalies) that match sub-slab voids, sinkholes, or potential grave cuts.
    """
    with rasterio.open(dem_path) as src:
        dem = src.read(1)
        transform = src.transform
        crs = src.crs
        nodata = src.nodata
        
    # Mask out missing entries
    valid_mask = (dem != nodata) if nodata is not None else np.ones_like(dem, dtype=bool)
    
    # Mathematical Subtraction & Depression Detection via Neighborhood Minima Window
    # Simulates calculating local elevation loss by comparing a moving window
    from scipy.ndimage import generic_filter
    
    def local_minima_diff(buffer):
        center = buffer[len(buffer) // 2]
        return center - np.min(buffer)
        
    # Apply a 5x5 structural window filter to map fine-scale local elevation pits
    print("[+] Executing neighborhood subtraction metrics...")
    depression_map = generic_filter(dem, local_minima_diff, size=5)
    
    # Isolate definitive local drops (e.g., matching trench lines or collapsed voids)
    anomaly_threshold = 0.5 # Meters of distinct localized elevation drop
    anomalies = np.where((depression_map > anomaly_threshold) & valid_mask, 1, 0).astype(np.uint8)
    
    # Save the processed anomalies as a standard GeoTIFF with embedded geospatial headers
    with rasterio.open(
        output_raster_path, 'w',
        driver='GTiff',
        height=anomalies.shape[0],
        width=anomalies.shape[1],
        count=1,
        dtype=anomalies.dtype,
        crs=crs,
        transform=transform
    ) as dst:
        dst.write(anomalies, 1)
    print(f"[+] Multi-era inversion layer exported to: {output_raster_path}")
