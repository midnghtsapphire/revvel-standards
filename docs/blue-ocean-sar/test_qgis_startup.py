"""Tests for qgis/startup.py with a stand-in qgis.core (no QGIS needed)."""

import importlib.util
import os
import sys
import types
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))


class _Layer:
    def __init__(self, name, source, kind):
        self._name, self._source, self.kind = name, source, kind
        self.styles = []

    def name(self):
        return self._name

    def source(self):
        return self._source

    def isValid(self):
        return True

    def loadNamedStyle(self, path):
        self.styles.append(os.path.basename(path))
        return "", True

    def triggerRepaint(self):
        pass


class _Signal:
    def connect(self, fn):
        self.fn = fn


class _Project:
    inst = None

    def __init__(self):
        self.layers = {}
        self.readProject = _Signal()

    @classmethod
    def instance(cls):
        return cls.inst

    def mapLayers(self):
        return self.layers

    def addMapLayer(self, layer):
        self.layers[layer.name()] = layer


def _load_startup(project):
    core = types.ModuleType("qgis.core")
    core.QgsProject = _Project
    core.QgsRasterLayer = lambda path, title: _Layer(title, path, "raster")
    core.QgsVectorLayer = lambda path, title, provider: _Layer(title, path, "vector")
    _Project.inst = project
    saved = {k: sys.modules.get(k) for k in ("qgis", "qgis.core")}
    sys.modules["qgis"] = types.ModuleType("qgis")
    sys.modules["qgis.core"] = core
    try:
        path = os.path.join(HERE, "qgis", "startup.py")
        spec = importlib.util.spec_from_file_location("qgis_startup_under_test", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
    finally:
        for k, v in saved.items():
            if v is None:
                sys.modules.pop(k, None)
            else:
                sys.modules[k] = v
    return mod


class StartupStyler(unittest.TestCase):
    def test_targets_layer_does_not_stand_in_for_probability_raster(self):
        project = _Project()
        targets = _Layer("Subsurface Target Points", os.path.join(HERE, "qgis", "subsurface_targets.geojson"),
                         "vector")
        project.addMapLayer(targets)
        mod = _load_startup(project)
        self.assertIsNone(mod._find_layer(project, "subsurface_probability.tif",
                                          "3D Subsurface Anomaly Probability Grid"))
        self.assertIs(mod._find_layer(project, "subsurface_targets.geojson", "Subsurface Target Points"), targets)
        mod.auto_style_on_startup()
        self.assertNotIn("subsurface_probability.qml", targets.styles)

    def test_layer_matched_by_source_file_with_layername_suffix(self):
        project = _Project()
        chm = _Layer("my renamed layer", "/data/chm_raster.tif|layername=x", "raster")
        project.addMapLayer(chm)
        mod = _load_startup(project)
        self.assertIs(mod._find_layer(project, "chm_raster.tif", "Canopy Height Model (CHM)"), chm)


if __name__ == "__main__":
    unittest.main()
