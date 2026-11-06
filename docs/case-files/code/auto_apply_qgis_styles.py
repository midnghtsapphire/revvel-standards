import os
from qgis.core import QgsProject, QgsRasterLayer, QgsVectorLayer

# Directory where raster/vector and QML files reside
DATA_DIR = r"/workspace/artifacts"

# Map layer keywords to their dataset and QML style definitions
STYLE_CONFIG = {
    "chm": {
        "data_file": "chm_raster.tif",
        "qml_file": "chm_raster.qml",
        "type": "raster",
        "title": "Canopy Height Model (CHM)"
    },
    "subsurface": {
        "data_file": "subsurface_probability.tif",
        "qml_file": "subsurface_probability.qml",
        "type": "raster",
        "title": "3D Subsurface Anomaly Probability Grid"
    },
    "targets": {
        "data_file": "subsurface_targets.geojson",
        "qml_file": "",
        "type": "vector",
        "title": "Subsurface Target Coordinates (GeoJSON)"
    }
}

def run_qgis_auto_style():
    project = QgsProject.instance()
    print("=" * 70)
    print("      PyQGIS AUTOMATED QML STYMBOLOGY LOADER & LAYER MANAGER")
    print("=" * 70)
    print(f"[+] Scanning Directory: {DATA_DIR}\n")

    for key, spec in STYLE_CONFIG.items():
        qml_path = os.path.join(DATA_DIR, spec["qml_file"]) if spec["qml_file"] else None
        data_path = os.path.join(DATA_DIR, spec["data_file"])

        # Check if layer is already in active canvas
        layer = None
        for l_id, l in project.mapLayers().items():
            if key.lower() in l.name().lower():
                layer = l
                print(f"[FOUND] Existing Layer in Canvas: '{l.name()}'")
                break

        # Auto-load layer if missing
        if not layer and os.path.exists(data_path):
            layer_name = spec["title"]
            if spec["type"] == "raster":
                layer = QgsRasterLayer(data_path, layer_name)
            else:
                layer = QgsVectorLayer(data_path, layer_name, "ogr")

            if layer.isValid():
                project.addMapLayer(layer)
                print(f"[LOADED] Added Layer to QGIS Canvas: '{layer_name}' ({spec['data_file']})")
            else:
                print(f"[ERROR] Invalid Layer File: {data_path}")

        # Automatically load and apply .qml style file
        if layer and qml_path and os.path.exists(qml_path):
            msg, success = layer.loadNamedStyle(qml_path)
            if success:
                layer.triggerRepaint()
                print(f"  └─► [SUCCESS] Automatically Applied Style: '{spec['qml_file']}' -> '{layer.name()}'")
            else:
                print(f"  └─► [ERROR] Could not load QML style: {msg}")
        elif layer and not qml_path:
            print(f"  └─► [INFO] Vector layer loaded without dedicated QML file.")
        elif not os.path.exists(data_path):
            print(f"[SKIPPED] Data file not found on disk: {data_path}")

    print("\n[+] Auto-Styling Complete! Canvas repainted successfully.")
    print("=" * 70)

run_qgis_auto_style()
