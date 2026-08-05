#!/usr/bin/env python3
"""
verifiable_logger.py — Audit-Chain Wrapper
penny-sovereign-yield-scout | Freedom Angel Corp / Audrey Evans

Provides a tamper-evident JSONL logging system where every entry includes
a SHA-256 hash of the previous entry, forming an immutable audit chain.

Usage:
    # Log an event
    from tools.verifiable_logger import VerifiableLogger
    logger = VerifiableLogger()
    logger.log("SWEEP_START", {"protocols": 50})

    # Verify the chain from CLI
    python tools/verifiable_logger.py --verify ./logs/audit_log.jsonl

    # Export to CSV for tax tools
    python tools/verifiable_logger.py --export csv --output yield_events_2026.csv

    # Stream and verify in real time
    python tools/verifiable_logger.py --stream-verify
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sys
import threading
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, Optional

from rich.console import Console
from rich.table import Table
from rich.progress import track

console = Console()

DEFAULT_LOG_DIR = Path(os.getenv("VERIFIABLE_LOG_DIR", "./logs"))
DEFAULT_LOG_FILE = DEFAULT_LOG_DIR / "audit_log.jsonl"


# ─── Core logger ─────────────────────────────────────────────────────────────

class VerifiableLogger:
    """
    Append-only, tamper-evident logger.

    Each entry is a JSON object containing:
      - event:       Event type string
      - data:        Arbitrary event data dict
      - timestamp:   ISO 8601 UTC timestamp
      - prev_hash:   SHA-256 hash of the previous entry (or "0"×64 for first)
      - entry_hash:  SHA-256 hash of this entry (excluding entry_hash itself)
    """

    def __init__(
        self,
        log_file: Optional[Path] = None,
        auto_create: bool = True,
    ) -> None:
        self.log_file = log_file or DEFAULT_LOG_FILE
        if auto_create:
            self.log_file.parent.mkdir(parents=True, exist_ok=True)
        self._write_lock = threading.Lock()
        self._last_hash: str = self._read_last_hash()

    def _read_last_hash(self) -> str:
        """Read the hash of the last entry in the log file."""
        if not self.log_file.exists() or self.log_file.stat().st_size == 0:
            return "0" * 64

        last_hash = "0" * 64
        try:
            # Attempt to seek to the end and read backwards for performance
            with open(self.log_file, "rb") as f:
                f.seek(0, os.SEEK_END)
                pointer = f.tell()
                buffer = bytearray()
                read_size = 4096

                while pointer > 0:
                    step = min(pointer, read_size)
                    pointer -= step
                    f.seek(pointer)
                    chunk = f.read(step)
                    buffer = chunk + buffer

                    lines = buffer.splitlines()
                    # If we found a newline or we're at the start of the file,
                    # we can attempt to parse the lines we have.
                    if b"\n" in chunk or pointer == 0:
                        for line in reversed(lines):
                            line = line.strip()
                            if line:
                                try:
                                    entry = json.loads(line.decode("utf-8"))
                                    if "entry_hash" in entry:
                                        return entry["entry_hash"]
                                except (json.JSONDecodeError, UnicodeDecodeError):
                                    continue
                        # If we processed all lines in buffer and didn't find a valid hash,
                        # but we haven't reached the start of the file, we continue.
        except (OSError, IOError):
            pass

        # Fallback to O(N) full file read if optimized seek fails
        with open(self.log_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        entry = json.loads(line)
                        last_hash = entry.get("entry_hash", last_hash)
                    except json.JSONDecodeError:
                        continue
        return last_hash

    def _compute_hash(self, entry_without_hash: dict) -> str:
        entry_str = json.dumps(entry_without_hash, default=str, sort_keys=True)
        return hashlib.sha256(entry_str.encode()).hexdigest()

    def log(self, event: str, data: dict) -> str:
        """
        Append an audit entry to the chain.

        Thread-safe: concurrent calls are serialized via an internal lock so
        that hash-chain linkage and file writes remain consistent.

        Returns:
            The entry_hash (SHA-256) of the new entry.
        """
        with self._write_lock:
            entry: dict = {
                "event": event,
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "prev_hash": self._last_hash,
            }
            entry_hash = self._compute_hash(entry)
            entry["entry_hash"] = entry_hash

            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, default=str) + "\n")

            self._last_hash = entry_hash
            return entry_hash

    def read_entries(self) -> Iterator[dict]:
        """Iterate over all entries in the log file."""
        if not self.log_file.exists():
            return
        with open(self.log_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        yield json.loads(line)
                    except json.JSONDecodeError:
                        continue

    def verify(self) -> tuple[bool, int, list[int]]:
        """
        Verify the integrity of the entire chain.

        Returns:
            (is_valid, entry_count, tampered_lines)
        """
        entries = 0
        prev_hash = "0" * 64
        tampered_at: list[int] = []

        with open(self.log_file, encoding="utf-8") as f:
            for line_no, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    stored_hash = entry.pop("entry_hash", "")

                    if entry.get("prev_hash") != prev_hash:
                        tampered_at.append(line_no)

                    entry_str = json.dumps(entry, default=str, sort_keys=True)
                    computed_hash = hashlib.sha256(entry_str.encode()).hexdigest()

                    if computed_hash != stored_hash:
                        tampered_at.append(line_no)

                    prev_hash = stored_hash
                    entries += 1
                except (json.JSONDecodeError, KeyError):
                    tampered_at.append(line_no)

        return len(tampered_at) == 0, entries, tampered_at


# ─── Export functions ─────────────────────────────────────────────────────────

def export_csv(log_file: Path, output: str) -> None:
    """Export JSONL log to CSV for tax tools (Koinly, CoinTracker, etc.)."""
    logger = VerifiableLogger(log_file=log_file)
    rows: list[dict] = []

    for entry in logger.read_entries():
        data = entry.get("data", {})
        rows.append({
            "timestamp": entry.get("timestamp", ""),
            "event": entry.get("event", ""),
            "protocol": data.get("protocol", ""),
            "pool_id": data.get("pool_id", ""),
            "wallet": data.get("wallet", ""),
            "position_usd": data.get("position_usd", ""),
            "accumulated_yield_usd": data.get("accumulated_yield_usd", ""),
            "gas_cost_usd": data.get("gas_cost_usd", ""),
            "apy": data.get("apy", ""),
            "chain": data.get("chain", ""),
            "entry_hash": entry.get("entry_hash", ""),
        })

    if not rows:
        console.print("[yellow]No entries to export.[/]")
        return

    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    console.print(f"✅ Exported [bold]{len(rows)}[/] entries to [cyan]{output}[/]")


def tail_and_verify(log_file: Path) -> None:
    """Stream new log entries from stdin and verify each against the chain."""
    console.print("[bold green]Stream verify mode — pipe log lines to stdin[/]")
    prev_hash: str = VerifiableLogger(log_file=log_file)._read_last_hash()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
            stored_hash = entry.get("entry_hash", "")
            entry_copy = {k: v for k, v in entry.items() if k != "entry_hash"}

            entry_str = json.dumps(entry_copy, default=str, sort_keys=True)
            computed = hashlib.sha256(entry_str.encode()).hexdigest()

            if computed == stored_hash and entry_copy.get("prev_hash") == prev_hash:
                console.print(f"[green]✅ VALID[/] | {entry.get('event', '?')} | {entry.get('timestamp', '')}")
                prev_hash = stored_hash
            else:
                console.print(f"[bold red]❌ TAMPERED[/] | {entry.get('event', '?')} | {entry.get('timestamp', '')}")
        except json.JSONDecodeError:
            console.print(f"[red]⚠️  Invalid JSON: {line[:80]}[/]")


def display_log_summary(log_file: Path, limit: int = 20) -> None:
    """Display a formatted summary of recent audit log entries."""
    logger = VerifiableLogger(log_file=log_file)
    entries = list(logger.read_entries())

    if not entries:
        console.print("[yellow]No audit log entries found.[/]")
        return

    table = Table(title=f"🔗 Audit Chain — {log_file} ({len(entries)} entries)", show_lines=True)
    table.add_column("Timestamp", style="dim")
    table.add_column("Event", style="bold cyan")
    table.add_column("Protocol", style="white")
    table.add_column("Hash (short)", style="dim")

    for entry in entries[-limit:]:
        data = entry.get("data", {})
        table.add_row(
            entry.get("timestamp", "")[:19],
            entry.get("event", "—"),
            data.get("protocol", "—"),
            entry.get("entry_hash", "")[:12] + "...",
        )

    console.print(table)


# ─── CLI entry point ──────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Verifiable Logger — Audit chain management"
    )
    parser.add_argument("--log-file", type=str, default=str(DEFAULT_LOG_FILE))
    parser.add_argument("--verify", action="store_true", help="Verify chain integrity")
    parser.add_argument("--export", choices=["csv"], help="Export format")
    parser.add_argument("--output", type=str, help="Output file for export")
    parser.add_argument("--stream-verify", action="store_true",
                        help="Stream stdin entries and verify")
    parser.add_argument("--summary", action="store_true",
                        help="Show recent audit log entries")
    parser.add_argument("--limit", type=int, default=20,
                        help="Number of entries to display in summary")
    parser.add_argument("--log-event", type=str, help="Log a test event")
    parser.add_argument("--log-data", type=str, default="{}", help="JSON data for test event")

    args = parser.parse_args()
    log_file = Path(args.log_file)

    console.rule("[bold cyan]🔗 Verifiable Logger — Audit Chain[/]")

    if args.stream_verify:
        tail_and_verify(log_file)
        return

    if args.log_event:
        try:
            data = json.loads(args.log_data)
        except json.JSONDecodeError:
            console.print("[red]--log-data must be valid JSON[/]")
            return
        logger = VerifiableLogger(log_file=log_file)
        entry_hash = logger.log(args.log_event, data)
        console.print(f"✅ Logged: [cyan]{args.log_event}[/] | hash: [dim]{entry_hash[:16]}...[/]")
        return

    if args.verify:
        if not log_file.exists():
            console.print(f"[yellow]Log file not found: {log_file}[/]")
            return
        logger = VerifiableLogger(log_file=log_file)
        valid, count, tampered = logger.verify()
        if valid:
            console.print(f"[bold green]✅ Chain integrity verified — {count} entries, no tampering detected[/]")
        else:
            console.print(f"[bold red]❌ Chain integrity FAILED — tampering at lines: {tampered}[/]")
        return

    if args.export == "csv":
        output = args.output or "yield_events.csv"
        export_csv(log_file, output)
        return

    # Default: summary
    display_log_summary(log_file, limit=args.limit)


if __name__ == "__main__":
    main()
