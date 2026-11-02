# qgis_sar_panel.py
import os
import json
from qgis.core import QgsProject, QgsVectorLayer, QgsPointXY, QgsGeometry, QgsFeature, QgsField
from qgis.PyQt.QtCore import QVariant
from qgis.PyQt.QtWidgets import QWidget, QVBoxLayout, QPushButton, QLabel, QLineEdit, QComboBox

class SARTargetingPanel(QWidget):
    def __init__(self, iface):
        super().__init__()
        self.iface = iface
        self.initUI()
        
    def initUI(self):
        self.layout = QVBoxLayout(self)
        
        self.label = QLabel("Forensic SAR Inversion & Targeting Matrix", self)
        self.layout.addWidget(self.label)
        
        # Coordinates input
        self.layout.addWidget(QLabel("Last Known Position (LKP) X (Longitude / Easting):"))
        self.input_x = QLineEdit(self)
        self.input_x.setText("-80.608") # Cocoa Beach long baseline
        self.layout.addWidget(self.input_x)
        
        self.layout.addWidget(QLabel("Last Known Position (LKP) Y (Latitude / Northing):"))
        self.input_y = QLineEdit(self)
        self.input_y.setText("28.320") # Cocoa Beach lat baseline
        self.layout.addWidget(self.input_y)
        
        # Feature Profile Selection
        self.layout.addWidget(QLabel("Target Taphonomic Profile:"))
        self.profile_box = QComboBox(self)
        self.profile_box.addItems(["Body Dump Sites (Anoxic Clay/Depressions)", "Sub-surface Voids (Sewers & Storm Pipes)", "Access Corridors (Logging/Unpaved Roads)"])
        self.layout.addWidget(self.profile_box)
        
        # Execution Button
        self.btn_run = QPushButton("Generate Deterministic Search Perimeters", self)
        self.btn_run.clicked.connect(self.generate_search_vectors)
        self.layout.addWidget(self.btn_run)
        
    def generate_search_vectors(self):
        try:
            lkp_x = float(self.input_x.text())
            lkp_y = float(self.input_y.text())
            target_type = self.profile_box.currentText()
            
            # Initialize a memory layer for the search perimeters
            layer_crs = QgsProject.instance().crs().authid()
            layer_name = f"SAR_Search_Vectors_{target_type[:10].replace(' ', '_')}"
            layer = QgsVectorLayer(f"Polygon?crs={layer_crs}", layer_name, "memory")
            provider = layer.dataProvider()
            
            # Attributes mapping metrics
            provider.addAttributes([
                QgsField("TargetType", QVariant.String),
                QgsField("Radius_m", QVariant.Double),
                QgsField("Confidence", QVariant.String)
            ])
            layer.updateFields()
            
            # Generate deterministic buffers based on physical constraints
            # Mixed urban/coastal scenario: walking radius limit vs vehicular drift profiles
            radii = [402.336, 1609.34] # 0.25 mile and 1 mile travel boundaries (705ft - 1 mile profiles)
            confidences = ["High Priority (Foot Travel)", "Secondary (Vehicular/Dispersal Buffer)"]
            
            layer.startEditing()
            for radius, conf in zip(radii, confidences):
                center = QgsPointXY(lkp_x, lkp_y)
                geom = QgsGeometry.fromPointXY(center).buffer(radius, 36)
                
                feat = QgsFeature()
                feat.setGeometry(geom)
                feat.setAttributes([target_type, radius, conf])
                provider.addFeature(feat)
                
            layer.commitChanges()
            QgsProject.instance().addMapLayer(layer)
            self.label.setText(f"Generated layers for {target_type} successfully.")
        except Exception as e:
            self.label.setText(f"Execution Error: {str(e)}")
