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
  * The Stage 2 gate gets no ground truth unless one is given
    (--ground-truth FILE or --use-shaffer-default); without it records stay
    'unverified' instead of being judged against another case's search logs.
  * A non-loopback --host needs a bearer token (environment variable
    SAR_LISTENER_TOKEN, never on the command line) and a TLS certificate
    (--tls-cert/--tls-key); otherwise it refuses to start. With a token set,
    POSTs without "Authorization: Bearer <token>" get 401.
"""

import argparse
import hmac
import ipaddress
import json
import logging
import os
import sqlite3
import ssl
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
from stage2_validation_gate import DEFAULT_VERIFIED_GROUND_TRUTH, Stage2ValidationGate  # noqa: E402

MAX_BODY_BYTES = 1024 * 1024
REQUIRED_FIELDS = ("source_origin", "archive_timestamp", "source_identifier", "raw_content")
# Must match the CHECK constraint in archive_collector_cli.init_database.
SOURCE_ORIGINS = ("wayback_cdx", "usenet_nntp", "git_history", "forum_archive", "darkweb_index", "manual_ingest")


def check_ground_truth(gt):
    """Raise ValueError unless gt is None or has the shape Stage2ValidationGate reads.
    A wrong shape (e.g. a JSON array) otherwise passed startup and then crashed
    every POST inside the gate."""
    if gt is None:
        return
    if not isinstance(gt, dict):
        raise ValueError(f"ground truth must be a JSON object, not {type(gt).__name__}")
    needed = {"cleared_sectors": ("sector_id", "cleared_by", "cleared_date"), "verified_unmonitored_gaps": ("gap_id",)}
    for key, fields in needed.items():
        items = gt.get(key, [])
        if not isinstance(items, list):
            raise ValueError(f"ground truth {key!r} must be a list")
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValueError(f"ground truth {key}[{i}] must be an object")
            missing = [f for f in fields if f not in item]
            if missing:
                raise ValueError(f"ground truth {key}[{i}] is missing {missing}")
            kws = item.get("keywords", []) if key == "verified_unmonitored_gaps" else item.get("keywords")
            if not isinstance(kws, list) or not all(isinstance(k, str) for k in kws):
                raise ValueError(f"ground truth {key}[{i}] keywords must be a list of strings")


def _is_loopback(host):
    if host == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


# def ingest_records(db_path, records):
def ingest_records(db_path, records, ground_truth=None):
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
    # stats = Stage2ValidationGate(db_path).validate_records()
    stats = Stage2ValidationGate(db_path, ground_truth).validate_records()
    by_id = {d["record_id"]: d for d in stats["details"]}
    for res in results:
        d = by_id.get(res["record_id"])
        if d:
            res["status"] = "ingested_and_validated"
            res["validation_status"] = d["assigned_status"]
            res["validation_reason"] = d["reason"]
    # return results, {k: stats[k] for k in ("processed", "debunked", "corroborated", "flagged_speculative")}
    return results, {k: stats[k] for k in ("processed", "debunked", "corroborated", "flagged_speculative",
                                           "abstained")}


class RealtimeWebhookHandler(BaseHTTPRequestHandler):
    db_path = "stage0_archive.db"
    ground_truth = None
    token = None

    def _reply(self, code, body):
        data = json.dumps(body, indent=2).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.token and not hmac.compare_digest(self.headers.get("Authorization", ""), f"Bearer {self.token}"):
            self._reply(401, {"status": "error", "message": "missing or wrong bearer token"})
            return
        # Original: a non-integer Content-Length raised a traceback and a negative
        # one slipped past the size limit.
        # content_length = int(self.headers.get("Content-Length", 0))
        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            content_length = -1
        if content_length < 0:
            self._reply(400, {"status": "error", "message": "invalid Content-Length"})
            return
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
            # results, stats = ingest_records(self.db_path, records)
            results, stats = ingest_records(self.db_path, records, self.ground_truth)
            self._reply(200, {"status": "success", "processed_count": len(results),
                              "results": results, "validation": stats})
        except (ValueError, json.JSONDecodeError, sqlite3.Error) as e:
            logging.error(f"Error processing webhook event: {e}")
            self._reply(400, {"status": "error", "message": str(e)})

    def do_GET(self):
        self._reply(200, {"service": "Stage 0/2 Real-Time Ingestion & Validation Listener",
                          "status": "active", "db_path": self.db_path})


# def make_server(host="127.0.0.1", port=8080, db_path="stage0_archive.db"):
def make_server(host="127.0.0.1", port=8080, db_path="stage0_archive.db", ground_truth=None, token=None,
                tls_cert=None, tls_key=None):
    if not _is_loopback(host) and not (token and tls_cert):
        raise ValueError(f"refusing to listen on {host}: a non-loopback bind needs SAR_LISTENER_TOKEN "
                         "and --tls-cert, or the write endpoint is open to anyone who can reach it")
    check_ground_truth(ground_truth)
    # Original set these on the shared class, so a second server in the same
    # process rewrote the first one's database, ground truth and token:
    # RealtimeWebhookHandler.db_path = db_path
    # RealtimeWebhookHandler.ground_truth = ground_truth
    # RealtimeWebhookHandler.token = token
    handler = type("BoundRealtimeWebhookHandler", (RealtimeWebhookHandler,),
                   {"db_path": db_path, "ground_truth": ground_truth, "token": token})
    # Original bound every interface: server_address = ("", port)
    # return HTTPServer((host, port), RealtimeWebhookHandler)
    # httpd = HTTPServer((host, port), RealtimeWebhookHandler)
    httpd = HTTPServer((host, port), handler)
    if tls_cert:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(tls_cert, tls_key)
        httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
    return httpd


# def run_listener(host="127.0.0.1", port=8080, db_path="stage0_archive.db"):
#     httpd = make_server(host, port, db_path)
def run_listener(host="127.0.0.1", port=8080, db_path="stage0_archive.db", **server_kw):
    httpd = make_server(host, port, db_path, **server_kw)
    logging.info(f"Listening on {host}:{httpd.server_port} using DB: {db_path}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logging.info("Listener stopped by user.")
    finally:
        httpd.server_close()


def load_ground_truth(parser, args):
    """Ground truth chosen on the command line, or None (the gate then abstains)."""
    # Original: with both flags, the file silently won over --use-shaffer-default.
    if args.ground_truth and args.use_shaffer_default:
        parser.error("use --ground-truth or --use-shaffer-default, not both")
    gt = None
    # Original: any JSON was accepted, so a file holding [] started the server
    # and every POST then crashed in the gate.
    # if args.ground_truth:
    #     with open(args.ground_truth, encoding="utf-8") as f:
    #         gt = json.load(f)
    if args.ground_truth:
        try:
            with open(args.ground_truth, encoding="utf-8") as f:
                gt = json.load(f)
            check_ground_truth(gt)
        except (OSError, ValueError) as e:
            parser.error(f"--ground-truth {args.ground_truth}: {e}")
    elif args.use_shaffer_default:
        gt = DEFAULT_VERIFIED_GROUND_TRUTH
    return gt


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8080")))
    parser.add_argument("--db", default=os.environ.get("DB_PATH", "stage0_archive.db"))
    parser.add_argument("--ground-truth", help="case ground-truth JSON for the Stage 2 gate")
    parser.add_argument("--use-shaffer-default", action="store_true",
                        help="judge records against the built-in Shaffer logs (Shaffer-only archives)")
    parser.add_argument("--tls-cert", help="PEM certificate; required with a non-loopback --host")
    parser.add_argument("--tls-key", help="PEM private key for --tls-cert")
    args = parser.parse_args(argv)
    gt = load_ground_truth(parser, args)
    run_listener(args.host, args.port, args.db, ground_truth=gt, token=os.environ.get("SAR_LISTENER_TOKEN"),
                 tls_cert=args.tls_cert, tls_key=args.tls_key)


# Original entry point, moved into main()/load_ground_truth() so the argument
# checks can be tested without starting a server:
# if __name__ == "__main__":
#     parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
#     parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
#     parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8080")))
#     parser.add_argument("--db", default=os.environ.get("DB_PATH", "stage0_archive.db"))
#     parser.add_argument("--ground-truth", help="case ground-truth JSON for the Stage 2 gate")
#     parser.add_argument("--use-shaffer-default", action="store_true",
#                         help="judge records against the built-in Shaffer logs (Shaffer-only archives)")
#     parser.add_argument("--tls-cert", help="PEM certificate; required with a non-loopback --host")
#     parser.add_argument("--tls-key", help="PEM private key for --tls-cert")
#     args = parser.parse_args()
#     gt = None
#     if args.ground_truth:
#         with open(args.ground_truth, encoding="utf-8") as f:
#             gt = json.load(f)
#     elif args.use_shaffer_default:
#         gt = DEFAULT_VERIFIED_GROUND_TRUTH
#     # run_listener(args.host, args.port, args.db)
#     run_listener(args.host, args.port, args.db, ground_truth=gt, token=os.environ.get("SAR_LISTENER_TOKEN"),
#                  tls_cert=args.tls_cert, tls_key=args.tls_key)


if __name__ == "__main__":
    main()
