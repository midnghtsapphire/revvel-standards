import os
import sys
import json
import logging
import sqlite3
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Add path to import stage2_validation_gate and archive_collector_cli
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, "/workspace/artifacts")

try:
    from stage2_validation_gate import Stage2ValidationGate
    from archive_collector_cli import Stage0IngestionEngine
except ImportError as e:
    logging.warning(f"Module import warning: {e}. Will attempt relative imports if running standalone.")

class RealtimeWebhookHandler(BaseHTTPRequestHandler):
    db_path = "stage0_archive.db"

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)

        try:
            payload = json.loads(post_data.decode("utf-8"))
            records = payload if isinstance(payload, list) else [payload]
            
            ingestion_engine = Stage0IngestionEngine(self.db_path)
            validation_gate = Stage2ValidationGate(self.db_path)

            processed_results = []
            for record in records:
                ingested = ingestion_engine.ingest_record(record)
                if ingested:
                    # Run Stage 2 validation pass on newly ingested record
                    record_id = record.get("record_id")
                    validation_res = validation_gate.run_validation_pass()
                    processed_results.append({
                        "record_id": record_id,
                        "status": "ingested_and_validated"
                    })
                else:
                    processed_results.append({
                        "record_id": record.get("record_id"),
                        "status": "skipped_or_duplicate"
                    })

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {
                "status": "success",
                "processed_count": len(processed_results),
                "results": processed_results
            }
            self.wfile.write(json.dumps(response, indent=2).encode("utf-8"))

        except Exception as e:
            logging.error(f"Error processing webhook event: {e}")
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({
            "service": "Stage 0/2 Real-Time Ingestion & Validation Listener",
            "status": "active",
            "db_path": self.db_path
        }).encode("utf-8"))

def run_listener(port=8080, db_path="stage0_archive.db"):
    RealtimeWebhookHandler.db_path = db_path
    server_address = ("", port)
    httpd = HTTPServer(server_address, RealtimeWebhookHandler)
    logging.info(f"Starting real-time validation webhook listener on port {port} using DB: {db_path}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logging.info("Listener stopped by user.")
        httpd.server_close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Real-Time Event Listener & Webhook Server for Ingestion & Validation")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on")
    parser.add_argument("--db", type=str, default="stage0_archive.db", help="Path to SQLite database")
    args = parser.parse_args()

    run_listener(port=args.port, db_path=args.db)
