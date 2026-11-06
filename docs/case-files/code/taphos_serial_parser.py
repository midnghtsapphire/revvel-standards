import pandas as pd
import json
import os
import sys

def parse_and_inject_log(csv_path):
    print(f"[*] Initializing Taphos-Stick Serial Data Parser...")
    
    if not os.path.exists(csv_path):
        print(f"[!] Error: Target manual operational log '{csv_path}' not found.")
        sys.exit(1)
        
    try:
        # Load the raw field data
        df = pd.read_csv(csv_path)
        print(f"[*] Successfully loaded log file: {csv_path} ({len(df)} rows detected)")
        
        parsed_payloads = []
        
        # Parse records step by step matching the Taphos-Stick dashboard structural schema
        for idx, row in df.iterrows():
            subsystem = str(row.get('Subsystem', '')).strip()
            parameter = str(row.get('Parameter', '')).strip()
            raw_val = row.get('Actual_Field_Value')
            
            # Skip empty or spacer rows
            if pd.isna(raw_val) and not parameter:
                continue
                
            # Construct dashboard injection structure
            telemetry_node = {
                "sequence_id": idx + 1,
                "subsystem": subsystem,
                "parameter_key": parameter.lower().replace(" ", "_").replace("-", "_"),
                "display_name": parameter,
                "expected_threshold": row.get('Expected_Threshold'),
                "logged_value": raw_val if not pd.isna(raw_val) else "PENDING_FIELD_INPUT",
                "status_flag": "VALIDATED" if not pd.isna(raw_val) else "AWAITING_SYNC"
            }
            parsed_payloads.append(telemetry_node)
            
        # Build core dashboard JSON payload
        dashboard_payload = {
            "device_status": "ONLINE",
            "injection_engine": "M-TMAT_SERIAL_v1_0",
            "active_matrix_count": len(parsed_payloads),
            "telemetry_matrix": parsed_payloads
        }
        
        # Simulation dashboard pipe endpoint
        output_endpoint = "taphos_dashboard_stream.json"
        with open(output_endpoint, 'w') as f:
            json.dump(dashboard_payload, f, indent=2)
            
        print(f"[+] Success: Injected {len(parsed_payloads)} operational nodes into {output_endpoint}")
        print(f"[*] Taphos-Stick Application Dashboard state: SYNCHRONIZED.")
        
    except Exception as e:
        print(f"[!] Critical structural parsing failure: {str(e)}")

if __name__ == '__main__':
    # Default pointer to the field crew operational log
    target_log = "st-francisville-ops-log.csv"
    parse_and_inject_log(target_log)
