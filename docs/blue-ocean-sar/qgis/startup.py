# QGIS Startup Hook (startup.py)
# Place this file in your QGIS startup directory:
# Windows: %APPDATA%/QGIS/QGIS3/profiles/default/python/startup.py
# Linux: ~/.local/share/QGIS/QGIS3/profiles/default/python/startup.py
# macOS: ~/Library/Application Support/QGIS/QGIS3/profiles/default/python/startup.py

import os
from qgis.core import QgsProject, QgsRasterLayer, QgsVectorLayer


def _find_layer(project, data_file, title):
    """The project layer loaded from data_file (matched on the file name of its
    source, ignoring any "|layername=..." suffix) or named exactly title."""
    for lyr in project.mapLayers().values():
        src = os.path.basename(lyr.source().split("|")[0])
        if src.lower() == data_file.lower() or lyr.name() == title:
            return lyr
    return None


def auto_style_on_startup():
    print("==========================================================")
    print("      PyQGIS AUTOMATED WAVE SEARCH LAYER STYLER           ")
    print("==========================================================")
    project = QgsProject.instance()

    # Target styles map
    styles_map = {
        "chm": ("chm_raster.tif", "chm_raster.qml", "Canopy Height Model (CHM)"),
        "subsurface": (
            "subsurface_probability.tif",
            "subsurface_probability.qml",
            "3D Subsurface Anomaly Probability Grid",
        ),
        "targets": ("subsurface_targets.geojson", "", "Subsurface Target Points"),
    }

    # Active directory
    data_dir = os.path.dirname(os.path.abspath(__file__))

    for key, (data_file, qml_file, title) in styles_map.items():
        data_path = os.path.join(data_dir, data_file)
        qml_path = os.path.join(data_dir, qml_file) if qml_file else None

        # Locate layer
        # Original: substring match on the key, so "subsurface" also matched the
        # "Subsurface Target Points" vector layer and the probability raster was
        # never loaded (and its raster style went onto the points layer).
        # layer = None
        # for l in project.mapLayers().values():  # noqa: E741 (original name kept)
        #     if key.lower() in l.name().lower():
        #         layer = l
        #         break
        layer = _find_layer(project, data_file, title)

        if not layer and os.path.exists(data_path):
            if data_file.endswith(".tif"):
                layer = QgsRasterLayer(data_path, title)
            else:
                layer = QgsVectorLayer(data_path, title, "ogr")
            if layer.isValid():
                project.addMapLayer(layer)
                print(f"[LOADED] Automatically added layer: {title}")

        if layer and qml_path and os.path.exists(qml_path):
            msg, success = layer.loadNamedStyle(qml_path)
            if success:
                layer.triggerRepaint()
                print(f"[STYLED] Applied '{qml_file}' to '{layer.name()}'")


# Connect to project load signal
QgsProject.instance().readProject.connect(auto_style_on_startup)
