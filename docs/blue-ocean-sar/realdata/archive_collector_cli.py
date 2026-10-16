#!/usr/bin/env python3
"""
Archive Collector CLI & Normalization Pipeline
==============================================
A unified CLI tool and Python module for harvesting, normalizing, deduplicating,
and ingesting historical data from:
  1. Wayback Machine CDX API (Web Archives)
  2. USENET Newsgroups via NNTP (Network News Transfer Protocol)
  3. Local Archival Files (JSON documents and JSONL; MBOX/EML are not parsed yet)

Outputs normalized JSON records complying with Stage 0 Ingestion Schema and
stores them in SQLite with automated SHA-256 deduplication.
"""

import argparse
import datetime
import email.utils
import hashlib
import json
import logging

# Original: `import nntplib` at top level. nntplib was removed from the standard
# library in Python 3.13 (PEP 594), so the whole CLI failed to start. It is now
# optional: only the `nntp` command needs it (pip install standard-nntplib).
# import nntplib
try:
    import nntplib
except ImportError:
    nntplib = None
import re
import sqlite3
import sys
import uuid
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("ArchiveCollector")


# =====================================================================
# Database Initialization & Management
# =====================================================================


def init_database(db_path: str) -> sqlite3.Connection:
    """Initialize SQLite database with Stage 0 ingestion schema."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stage0_historical_records (
        record_id TEXT PRIMARY KEY,
        source_origin TEXT NOT NULL CHECK(source_origin IN (
            'wayback_cdx', 'usenet_nntp', 'git_history', 'forum_archive', 'darkweb_index', 'manual_ingest')),
        archive_timestamp TEXT NOT NULL,
        source_identifier TEXT NOT NULL,
        author_handle TEXT,
        author_ip_snippet TEXT,
        author_email_domain TEXT,
        raw_content TEXT NOT NULL,
        extracted_entities_json TEXT,
        checksum_sha256 TEXT NOT NULL UNIQUE,
        verification_status TEXT DEFAULT 'unverified' CHECK(verification_status IN (
            'unverified', 'corroborated_by_log', 'debunked_by_official_log', 'flagged_speculative')),
        ingested_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_archive_time ON stage0_historical_records(archive_timestamp);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_origin ON stage0_historical_records(source_origin);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_checksum ON stage0_historical_records(checksum_sha256);")
    conn.commit()
    return conn


# =====================================================================
# Entity Extraction & Normalization
# =====================================================================


def extract_entities(text: str) -> Dict[str, List[str]]:
    """Perform light entity extraction using regex patterns."""
    entities = {
        "mentioned_names": [],
        "mentioned_locations": [],
        "phone_numbers": [],
        "ip_addresses": [],
        "keywords": [],
    }

    # IP Addresses
    ip_pattern = r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"
    entities["ip_addresses"] = list(set(re.findall(ip_pattern, text)))

    # Phone numbers (US/North America formats)
    phone_pattern = r"\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
    entities["phone_numbers"] = list(set(re.findall(phone_pattern, text)))

    # Keywords / Handles
    handles = list(set(re.findall(r"@\w+", text)))
    if handles:
        entities["keywords"].extend(handles)

    return entities


def normalize_record(
    source_origin: str,
    archive_timestamp: str,
    source_identifier: str,
    raw_content: str,
    author_handle: Optional[str] = None,
    author_ip_snippet: Optional[str] = None,
    author_email_domain: Optional[str] = None,
    verification_status: str = "unverified",
) -> Dict[str, Any]:
    """Structure and normalize a record before DB insertion."""

    # Compute SHA-256 for deduplication
    checksum = hashlib.sha256(raw_content.encode("utf-8")).hexdigest()

    # Entity extraction
    extracted = extract_entities(raw_content)

    return {
        "record_id": str(uuid.uuid4()),
        "source_origin": source_origin,
        "archive_timestamp": archive_timestamp,
        "source_identifier": source_identifier,
        "author_metadata": {
            "handle": author_handle,
            "ip_snippet": author_ip_snippet,
            "email_domain": author_email_domain,
        },
        "raw_content": raw_content,
        "extracted_entities": extracted,
        "checksum_sha256": checksum,
        "verification_status": verification_status,
    }


def save_record_to_db(conn: sqlite3.Connection, record: Dict[str, Any]) -> bool:
    """Save record into SQLite database, ignoring duplicates."""
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
        INSERT INTO stage0_historical_records (
            record_id, source_origin, archive_timestamp, source_identifier,
            author_handle, author_ip_snippet, author_email_domain,
            raw_content, extracted_entities_json, checksum_sha256, verification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                record["record_id"],
                record["source_origin"],
                record["archive_timestamp"],
                record["source_identifier"],
                record["author_metadata"].get("handle"),
                record["author_metadata"].get("ip_snippet"),
                record["author_metadata"].get("email_domain"),
                record["raw_content"],
                json.dumps(record["extracted_entities"]),
                record["checksum_sha256"],
                record["verification_status"],
            ),
        )
        conn.commit()
        return True
    # Original treated every IntegrityError as a duplicate, so a record rejected
    # by a CHECK constraint (e.g. an unknown source_origin) was silently dropped
    # and logged as "duplicate":
    # except sqlite3.IntegrityError:
    #     logger.warning(f"Duplicate record skipped (SHA-256: {record['checksum_sha256'][:16]}...)")
    #     return False
    except sqlite3.IntegrityError as e:
        if "UNIQUE" not in str(e):
            raise
        logger.warning(f"Duplicate record skipped (SHA-256: {record['checksum_sha256'][:16]}...)")
        return False


# =====================================================================
# 1. Wayback Machine CDX API Collector
# =====================================================================


class WaybackCDXCollector:
    """Collector for Wayback Machine CDX Server API."""

    # BASE_URL = "http://web.archive.org/cdx/search/cdx"  # original; plain http fails behind HTTPS-only proxies
    BASE_URL = "https://web.archive.org/cdx/search/cdx"

    @staticmethod
    def parse_wayback_timestamp(ts: str) -> Optional[str]:
        """Convert YYYYMMDDhhmmss to ISO-8601 UTC; None if it is missing or malformed."""
        try:
            dt = datetime.datetime.strptime(ts[:14], "%Y%m%d%H%M%S")
            return dt.replace(tzinfo=datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        # Original: a bad timestamp became "now", i.e. a made-up historical date.
        # except Exception:
        #     return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        except (TypeError, ValueError):
            return None

    def fetch_cdx_index(
        self, target_url: str, from_date: str = "", to_date: str = "", limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Query CDX API for snapshots of a URL pattern."""
        params = {
            "url": target_url,
            "output": "json",
            "fl": "timestamp,original,mimetype,statuscode,digest",
            "limit": str(limit),
        }
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date

        query_string = urllib.parse.urlencode(params)
        full_url = f"{self.BASE_URL}?{query_string}"
        logger.info(f"Querying Wayback CDX API: {full_url}")

        try:
            req = urllib.request.Request(full_url, headers={"User-Agent": "ArchiveCollectorPipeline/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if not data or len(data) < 2:
                    return []

                headers = data[0]
                results = []
                for row in data[1:]:
                    entry = dict(zip(headers, row))
                    ts_iso = self.parse_wayback_timestamp(entry.get("timestamp", ""))
                    if ts_iso is None:
                        logger.warning(f"Skipping CDX row with bad timestamp: {entry.get('timestamp')!r}")
                        continue
                    archive_url = f"https://web.archive.org/web/{entry.get('timestamp')}/{entry.get('original')}"

                    results.append(
                        {
                            "source_origin": "wayback_cdx",
                            "archive_timestamp": ts_iso,
                            "source_identifier": archive_url,
                            "raw_content": f"Wayback Snapshot [{entry.get('timestamp')}] {entry.get('original')} (MIME: {entry.get('mimetype')}, Status: {entry.get('statuscode')}, Digest: {entry.get('digest')})",  # noqa: E501
                        }
                    )
                return results
        except Exception as e:
            logger.error(f"CDX API Query failed or offline: {e}")
            return []


# =====================================================================
# 2. USENET NNTP Collector
# =====================================================================


def article_timestamp(lines: List[str]) -> Optional[str]:
    """ISO-8601 UTC from an article's Date header (headers end at the first
    blank line); None if there is no parseable Date."""
    for line in lines:
        if not line.strip():
            break
        if line.lower().startswith("date:"):
            try:
                dt = email.utils.parsedate_to_datetime(line.split(":", 1)[1].strip())
            except (TypeError, ValueError):
                return None
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=datetime.timezone.utc)
            return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return None


class UsenetNNTPCollector:
    """Collector for USENET newsgroups via NNTP."""

    def __init__(self, host: str, port: int = 119, user: str = "", password: str = ""):
        self.host = host
        self.port = port
        self.user = user
        self.password = password

    def fetch_articles(self, newsgroup: str, article_count: int = 20) -> List[Dict[str, Any]]:
        """Fetch latest articles from an NNTP newsgroup."""
        logger.info(f"Connecting to NNTP host {self.host}:{self.port} for group '{newsgroup}'...")
        results = []
        if nntplib is None:
            logger.error("nntplib is not available on this Python (removed in 3.13); pip install standard-nntplib")
            return results
        try:
            nntp = nntplib.NNTP(self.host, self.port, user=self.user, password=self.password, timeout=10)
            resp, count, first, last, name = nntp.group(newsgroup)

            start_num = max(int(first), int(last) - article_count + 1)
            end_num = int(last)

            for art_num in range(start_num, end_num + 1):
                try:
                    resp, info = nntp.article(str(art_num))
                    lines = [line.decode("utf-8", errors="replace") for line in info.lines]
                    full_text = "\n".join(lines)

                    msg_id = info.message_id if hasattr(info, "message_id") else f"<{newsgroup}.{art_num}@{self.host}>"
                    posted = article_timestamp(lines)
                    if posted is None:
                        logger.warning(f"Skipping article {art_num}: no parseable Date header")
                        continue

                    results.append(
                        {
                            "source_origin": "usenet_nntp",
                            # Original: every article was stamped with the fetch time.
                            # "archive_timestamp": datetime.datetime.now(datetime.timezone.utc).strftime(
                            #     "%Y-%m-%dT%H:%M:%SZ"
                            # ),
                            "archive_timestamp": posted,
                            "source_identifier": msg_id,
                            "raw_content": full_text,
                        }
                    )
                except Exception as art_err:
                    logger.warning(f"Could not fetch article {art_num}: {art_err}")

            nntp.quit()
        except Exception as e:
            logger.error(f"NNTP Connection failed or host unreachable: {e}")

        return results


def read_archive_file(path: str) -> List[Any]:
    """Records from a JSON document (an object, or an array of objects) or,
    failing that, from JSONL. Blank JSONL lines are skipped; a bad line raises."""
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    try:
        doc = json.loads(text)
    except json.JSONDecodeError:
        doc = None
    if isinstance(doc, list):
        return doc
    if isinstance(doc, dict):
        return [doc]
    items = []
    for n, line in enumerate(text.splitlines(), start=1):
        if line.strip():
            try:
                items.append(json.loads(line))
            except json.JSONDecodeError as e:
                raise ValueError(f"{path}:{n}: not JSON: {e}") from None
    return items


def ingest_file(conn: sqlite3.Connection, path: str, origin: str) -> Dict[str, int]:
    """Ingest a JSON/JSONL file. Returns saved / duplicate / failed counts;
    failures are logged per record, not hidden."""
    counts = {"saved": 0, "duplicate": 0, "failed": 0}
    try:
        items = read_archive_file(path)
    except ValueError as e:
        logger.error(str(e))
        counts["failed"] += 1
        return counts
    for i, data in enumerate(items):
        try:
            if not isinstance(data, dict):
                raise ValueError(f"record is a {type(data).__name__}, not an object")
            rec = normalize_record(
                source_origin=data.get("source_origin", origin),
                archive_timestamp=data.get(
                    "archive_timestamp",
                    datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                ),
                source_identifier=data.get("source_identifier", path),
                raw_content=data.get("raw_content", str(data)),
                author_handle=data.get("author_handle"),
            )
            counts["saved" if save_record_to_db(conn, rec) else "duplicate"] += 1
        except (ValueError, TypeError, AttributeError, sqlite3.Error) as e:
            logger.error(f"Record {i} in {path} not ingested: {e}")
            counts["failed"] += 1
    return counts


# =====================================================================
# CLI Commands & Entry Point
# =====================================================================


def main():
    parser = argparse.ArgumentParser(description="Archive Collector CLI & Ingestion Pipeline")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # CDX Command
    cdx_parser = subparsers.add_parser("cdx", help="Query Wayback CDX API")
    cdx_parser.add_argument("--url", required=True, help="Target URL or pattern (e.g. example.com/*)")
    cdx_parser.add_argument("--from-date", default="", help="Start date YYYYMMDD")
    cdx_parser.add_argument("--to-date", default="", help="End date YYYYMMDD")
    cdx_parser.add_argument("--limit", type=int, default=50, help="Max records")
    cdx_parser.add_argument(
        "--db", default="stage0_archive.db", help="SQLite DB path"
    )  # was /workspace/scratch/stage0_archive.db

    # NNTP Command
    nntp_parser = subparsers.add_parser("nntp", help="Fetch USENET newsgroup via NNTP")
    nntp_parser.add_argument("--host", required=True, help="NNTP server host")
    nntp_parser.add_argument("--port", type=int, default=119, help="NNTP port")
    nntp_parser.add_argument("--group", required=True, help="Newsgroup name")
    nntp_parser.add_argument("--limit", type=int, default=20, help="Max articles")
    nntp_parser.add_argument(
        "--db", default="stage0_archive.db", help="SQLite DB path"
    )  # was /workspace/scratch/stage0_archive.db

    # Ingest Local File Command
    file_parser = subparsers.add_parser("ingest-file", help="Ingest local JSON or JSONL archive file")
    file_parser.add_argument("--file", required=True, help="Path to JSON/JSONL file")
    file_parser.add_argument("--origin", default="forum_archive", help="Source origin tag")
    file_parser.add_argument(
        "--db", default="stage0_archive.db", help="SQLite DB path"
    )  # was /workspace/scratch/stage0_archive.db

    # Stats Command
    stats_parser = subparsers.add_parser("stats", help="Show database record statistics")
    stats_parser.add_argument(
        "--db", default="stage0_archive.db", help="SQLite DB path"
    )  # was /workspace/scratch/stage0_archive.db

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    db_conn = init_database(args.db)

    if args.command == "cdx":
        collector = WaybackCDXCollector()
        items = collector.fetch_cdx_index(args.url, args.from_date, args.to_date, args.limit)
        saved_count = 0
        for item in items:
            rec = normalize_record(
                source_origin=item["source_origin"],
                archive_timestamp=item["archive_timestamp"],
                source_identifier=item["source_identifier"],
                raw_content=item["raw_content"],
            )
            if save_record_to_db(db_conn, rec):
                saved_count += 1
        logger.info(f"CDX Processed: {len(items)} fetched, {saved_count} new records ingested.")

    elif args.command == "nntp":
        collector = UsenetNNTPCollector(args.host, args.port)
        items = collector.fetch_articles(args.group, args.limit)
        saved_count = 0
        for item in items:
            rec = normalize_record(
                source_origin=item["source_origin"],
                archive_timestamp=item["archive_timestamp"],
                source_identifier=item["source_identifier"],
                raw_content=item["raw_content"],
            )
            if save_record_to_db(db_conn, rec):
                saved_count += 1
        logger.info(f"NNTP Processed: {len(items)} fetched, {saved_count} new records ingested.")

    elif args.command == "ingest-file":
        # Original: read the file one physical line at a time (so pretty-printed
        # JSON and arrays were skipped) and logged every failure but still exited 0.
        # saved_count = 0
        # with open(args.file, "r", encoding="utf-8") as f:
        #     for line in f:
        #         line = line.strip()
        #         if not line:
        #             continue
        #         try:
        #             data = json.loads(line)
        #             rec = normalize_record(
        #                 source_origin=data.get("source_origin", args.origin),
        #                 archive_timestamp=data.get(
        #                     "archive_timestamp",
        #                     datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        #                 ),
        #                 source_identifier=data.get("source_identifier", args.file),
        #                 raw_content=data.get("raw_content", str(data)),
        #                 author_handle=data.get("author_handle"),
        #             )
        #             if save_record_to_db(db_conn, rec):
        #                 saved_count += 1
        #         except Exception as e:
        #             logger.error(f"Error parsing file line: {e}")
        # logger.info(f"File Ingestion Complete: {saved_count} records saved.")
        counts = ingest_file(db_conn, args.file, args.origin)
        logger.info(f"File Ingestion Complete: {counts['saved']} saved, {counts['duplicate']} duplicate, "
                    f"{counts['failed']} failed.")
        if counts["failed"]:
            sys.exit(1)

    elif args.command == "stats":
        cursor = db_conn.cursor()
        cursor.execute("SELECT source_origin, COUNT(*) FROM stage0_historical_records GROUP BY source_origin;")
        rows = cursor.fetchall()
        print("\n=== Stage 0 Ingestion Database Statistics ===")
        total = 0
        for origin, count in rows:
            print(f" - {origin}: {count} records")
            total += count
        print(f"Total Unique Records: {total}\n")


if __name__ == "__main__":
    main()
