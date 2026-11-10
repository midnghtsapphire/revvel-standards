#!/usr/bin/env python3
"""
Standard Single-Subject SAR Prosecution Launcher (v17.0)
Executes standard prosecution against master_unified_sar_bootstrap_v17 without code modifications.
"""

import sys
import json
import os

from master_unified_sar_bootstrap_v17 import NineCaseBenchmarkRegistry, FieldDataValidationEngine, OSINTSourceGathererEngine, MunicipalUtilityAndSurveyIngestionEngine, ResidenceWalkawayEngine

def prosecute_subject(subject_query: str):
    registry = NineCaseBenchmarkRegistry()
    
    target_key = None
    query_lower = subject_query.lower()
    for cid, data in registry.cases.items():
        if query_lower in cid.lower() or query_lower in data.get('subject', '').lower():
            target_key = cid
            break
            
    if not target_key:
        print(f"Subject '{subject_query}' not found in master registry. Running dynamic walkaway & survey ingestion...")
        # Fallback to dynamic processing for new query
        util_engine = MunicipalUtilityAndSurveyIngestionEngine()
        walkaway_engine = ResidenceWalkawayEngine()
        surv_data = util_engine.process_property_utility_survey(36.6534, -94.4418)
        wm_data = walkaway_engine.generate_residence_walkaway_matrix(36.6534, -94.4418)
        print("=" * 75)
        print(f"  SINGLE-SUBJECT SAR CASE PROSECUTION ENGINE (v17.0 Standard Dynamic Run)")
        print(f"  Subject Query: {subject_query}")
        print("=" * 75)
        print("\n MUNICIPAL UTILITY & CADASTRAL SURVEY LAYER:")
        print(f"  • Utility Intersections Found: {len(surv_data['detected_utility_conduits'])}")
        print(f"  • Ingested Layers: {len(surv_data['ingested_survey_layers'])}")
        print("\n WALKAWAY TARGET MATRIX:")
        print(f"  • ISRID Category: {wm_data['selected_isrid_category']}")
        print(f"  • Generated Target Vectors: {len(wm_data['walkaway_target_matrix'])}")
        print("=" * 75)
        return

    data = registry.get_case(target_key)
    
    # Run survey layer
    util_engine = MunicipalUtilityAndSurveyIngestionEngine()
    surv_data = util_engine.process_property_utility_survey(data['gps'][0], data['gps'][1])

    print("=" * 75)
    print(f"  SINGLE-SUBJECT SAR CASE PROSECUTION ENGINE (v17.0 Standard Registry Run)")
    print(f"  Target Case ID: {target_key}")
    print("=" * 75)
    print("\n SUBJECT PROFILE & PLS ANCHOR:")
    print(f"  • Name: {data.get('subject')} | Case: {target_key}")
    print(f"  • Location: {data.get('location')}")
    print(f"  • Feature Structure: {data.get('structure')}")
    
    print("\n TARGET VECTOR & GPS COORDINATES:")
    print(f"  • GPS Coordinates: {data.get('gps')[0]}° N, {data.get('gps')[1]}° W")
    print(f"  • Target Composite Probability Score: {data.get('confidence_score') * 100:.1f}%")
    print(f"  • Search Depth: {data.get('depth_m')} meters")
    
    print("\n MUNICIPAL UTILITY & SURVEY LAYER INTEGRATION:")
    print(f"  • Ingested Survey Layers: {len(surv_data['ingested_survey_layers'])}")
    print(f"  • Conduits & Easements Mapped: {len(surv_data['detected_utility_conduits'])}")

    print("\n FORENSIC & LIABILITY AUDIT:")
    print(f"  • Case Status: {data.get('status')}")
    print(f"  • Extraction Protocol: {data.get('protocol')}")
    print("=" * 75)

if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "Lindeman"
    prosecute_subject(query)
