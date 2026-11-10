import os
import json
import sqlite3
import urllib.request
from datetime import datetime, timezone

def check_system_and_notify():
    # Detect SQLite database location
    db_paths = [
        "/workspace/out/expanded_osint_spatial_master.db",
        "/workspace/artifacts/expanded_osint_spatial_master.db",
        "/workspace/scratch/expanded_osint_spatial_master.db"
    ]
    
    db_path = None
    for p in db_paths:
        if os.path.exists(p):
            db_path = p
            break

    tables = [
        "gis_parcel_adjacency",
        "relational_graph_degrees",
        "surname_trajectories",
        "community_chatter_leads",
        "search_parameters_log",
        "investigator_cognitive_profile",
        "image_comparison_features",
        "image_similarity_pairs_matrix"
    ]

    table_counts = {}
    if db_path and os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        for t in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {t}")
                table_counts[t] = cursor.fetchone()[0]
            except Exception as e:
                table_counts[t] = f"ERROR: {str(e)}"
        conn.close()
    else:
        table_counts = {t: "DB_FILE_NOT_FOUND" for t in tables}

    webhook_url = os.environ.get("WEBHOOK_URL", "")

    payload = {
        "title": "🚨 OSINT & Spatial Pipeline Automated Health Report [v30.0]",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "database_status": "HEALTHY_8_TABLES_VERIFIED" if all(isinstance(v, int) and v > 0 for v in table_counts.values()) else "ATTENTION_REQUIRED",
        "table_row_counts": table_counts,
        "environment": "Docker Local Worker / GitHub CI"
    }

    print("================================================================================")
    print("  AUTOMATED PIPELINE HEALTH & WEBHOOK NOTIFICATION SUMMARY")
    print("================================================================================")
    print(json.dumps(payload, indent=2))
    print("================================================================================")

    if webhook_url and webhook_url.startswith("http"):
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"[Success] Webhook notification delivered. Status Code: {resp.status}")
        except Exception as e:
            print(f"[Warning] Webhook delivery skipped/failed: {e}")
    else:
        print("[Notice] No WEBHOOK_URL environment variable configured. Standard log output generated.")

if __name__ == "__main__":
    check_system_and_notify()
