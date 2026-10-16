#!/usr/bin/env python3
"""Real-time ingestion + Stage 2 validation webhook listener.

POST a JSON record (or a list of records) and each one is normalised,
SHA-256 de-duplicated and stored in the stage-0 SQLite database by
archive_collector_cli, then the Stage 2 validation gate runs over every
still-unverified record. GET / returns a health response.

Record fields: source_origin, archive_timestamp, source_identifier and
raw_content are required; author_handle is optional. source_origin must be
one of wayback_cdx, usenet_nntp, git_history, forum_archive, darkweb_index
or manual_ingest (the database's CHECK constraint).

  python realtime_validation_listener.py --port 8080 --db stage0_archive.db

Changes from the uploaded version (originals kept as comments below):
  * It imported Stage0IngestionEngine from archive_collector_cli and called
    Stage2ValidationGate.run_validation_pass(); neither exists, so every
    POST failed. It now uses normalize_record/save_record_to_db and
    validate_records(), which do.
  * It listened on all interfaces; the default is now 127.0.0.1 (--host to
    change it).
  * Request bodies over 1 MiB and records missing required fields get 400.
"""

import argparse
import json
import logging
import os
import sqlite3
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

sys.path.insert(0, str(Path(__file__).parent))
# Original: also searched a hard-coded build path; nothing lives there here.
# sys.path.insert(0, "/workspace/artifacts")

# Original imports; Stage0IngestionEngine is not defined in archive_collector_cli:
# try:
#     from stage2_validation_gate import Stage2ValidationGate
#     from archive_collector_cli import Stage0IngestionEngine
# except ImportError as e:
#     logging.warning(f"Module import warning: {e}. Will attempt relative imports if running standalone.")
from archive_collector_cli import init_database, normalize_record, save_record_to_db  # noqa: E402
from stage2_validation_gate import Stage2ValidationGate  # noqa: E402

MAX_BODY_BYTES = 1024 * 1024
REQUIRED_FIELDS = ("source_origin", "archive_timestamp", "source_identifier", "raw_content")
# Must match the CHECK constraint in archive_collector_cli.init_database.
SOURCE_ORIGINS = ("wayback_cdx", "usenet_nntp", "git_history", "forum_archive", "darkweb_index", "manual_ingest")


def ingest_records(db_path, records):
    """Store records and run Stage 2 once. Returns per-record results plus
    the gate's statistics."""
    for r in records:
        missing = [f for f in REQUIRED_FIELDS if not isinstance(r, dict) or not r.get(f)]
        if missing:
            raise ValueError(f"record missing required fields: {missing}")
        if r["source_origin"] not in SOURCE_ORIGINS:
            raise ValueError(f"source_origin must be one of {SOURCE_ORIGINS}")
    results = []
    conn = init_database(db_path)
    try:
        for r in records:
            rec = normalize_record(r["source_origin"], r["archive_timestamp"], r["source_identifier"],
                                   r["raw_content"], author_handle=r.get("author_handle"))
            stored = save_record_to_db(conn, rec)
            results.append({"record_id": rec["record_id"] if stored else None,
                            "checksum_sha256": rec["checksum_sha256"],
                            "status": "ingested" if stored else "duplicate_skipped"})
    finally:
        conn.close()
    stats = Stage2ValidationGate(db_path).validate_records()
    by_id = {d["record_id"]: d for d in stats["details"]}
    for res in results:
        d = by_id.get(res["record_id"])
        if d:
            res["status"] = "ingested_and_validated"
            res["validation_status"] = d["assigned_status"]
            res["validation_reason"] = d["reason"]
    return results, {k: stats[k] for k in ("processed", "debunked", "corroborated", "flagged_speculative")}


class RealtimeWebhookHandler(BaseHTTPRequestHandler):
    db_path = "stage0_archive.db"

    def _reply(self, code, body):
        data = json.dumps(body, indent=2).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > MAX_BODY_BYTES:
            self._reply(400, {"status": "error", "message": "body too large"})
            return
        post_data = self.rfile.read(content_length)
        try:
            payload = json.loads(post_data.decode("utf-8"))
            records = payload if isinstance(payload, list) else [payload]
            # Original per-record loop; run_validation_pass() does not exist on the gate:
            # ingestion_engine = Stage0IngestionEngine(self.db_path)
            # validation_gate = Stage2ValidationGate(self.db_path)
            # for record in records:
            #     ingested = ingestion_engine.ingest_record(record)
            #     if ingested:
            #         validation_res = validation_gate.run_validation_pass()
            results, stats = ingest_records(self.db_path, records)
            self._reply(200, {"status": "success", "processed_count": len(results),
                              "results": results, "validation": stats})
        except (ValueError, json.JSONDecodeError, sqlite3.Error) as e:
            logging.error(f"Error processing webhook event: {e}")
            self._reply(400, {"status": "error", "message": str(e)})

    def do_GET(self):
        self._reply(200, {"service": "Stage 0/2 Real-Time Ingestion & Validation Listener",
                          "status": "active", "db_path": self.db_path})


def make_server(host="127.0.0.1", port=8080, db_path="stage0_archive.db"):
    RealtimeWebhookHandler.db_path = db_path
    # Original bound every interface: server_address = ("", port)
    return HTTPServer((host, port), RealtimeWebhookHandler)


def run_listener(host="127.0.0.1", port=8080, db_path="stage0_archive.db"):
    httpd = make_server(host, port, db_path)
    logging.info(f"Listening on {host}:{httpd.server_port} using DB: {db_path}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logging.info("Listener stopped by user.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8080")))
    parser.add_argument("--db", default=os.environ.get("DB_PATH", "stage0_archive.db"))
    args = parser.parse_args()
    run_listener(args.host, args.port, args.db)
