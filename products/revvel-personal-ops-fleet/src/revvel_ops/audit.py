"""Append-only, SHA-256 hash-chained audit log (JSONL).

File layout: ``<audit_dir>/<run_id>.jsonl`` — one sealed AuditEvent per line.
The chain starts from GENESIS_HASH. Verification recomputes every hash and
checks linkage plus sequence monotonicity.

Writes are append-only: the writer opens files in "a" mode and never rewrites
existing lines. Redaction happens before the payload reaches this module.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Iterable, Iterator

from .models import AuditEvent, Phase, canonical_json, canonical_timestamp, sha256_hex

GENESIS_HASH = "0" * 64

REDACT_KEYS = {
    "body",
    "content",
    "snippet",
    "text",
    "html",
    "message",
    "token",
    "access_token",
    "refresh_token",
    "password",
    "secret",
    "api_key",
    "authorization",
}


def redact(payload: dict[str, Any]) -> dict[str, Any]:
    """Replace sensitive/content-bearing values with a digest reference."""
    out: dict[str, Any] = {}
    for key, value in payload.items():
        lowered = key.lower()
        if lowered in REDACT_KEYS:
            out[key] = f"redacted:sha256:{sha256_hex(canonical_json(value))[:16]}"
        elif isinstance(value, dict):
            out[key] = redact(value)
        elif isinstance(value, list):
            out[key] = [redact(v) if isinstance(v, dict) else v for v in value]
        else:
            out[key] = value
    return out


class AuditLog:
    """Append-only audit writer/reader for a single run."""

    def __init__(self, audit_dir: Path, run_id: str, redact_content: bool = True) -> None:
        self.audit_dir = Path(audit_dir)
        self.run_id = run_id
        self.redact_content = redact_content
        self.audit_dir.mkdir(parents=True, exist_ok=True)
        self.path = self.audit_dir / f"{run_id}.jsonl"
        self._sequence, self._last_hash = self._resume()

    # ---------------------------------------------------------------- resume
    def _resume(self) -> tuple[int, str]:
        if not self.path.exists():
            return 0, GENESIS_HASH
        last: dict[str, Any] | None = None
        count = 0
        with self.path.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    last = json.loads(line)
                    count += 1
        if last is None:
            return 0, GENESIS_HASH
        return count, last["event_hash"]

    # ----------------------------------------------------------------- write
    def append(
        self,
        event_type: str,
        payload: dict[str, Any] | None = None,
        phase: Phase = Phase.plan,
        identity: str | None = None,
        subject_ref: str | None = None,
        actor: str = "revvel-ops-fleet",
    ) -> AuditEvent:
        body = payload or {}
        if self.redact_content:
            body = redact(body)
        event = AuditEvent(
            sequence=self._sequence,
            run_id=self.run_id,
            phase=phase,
            event_type=event_type,
            actor=actor,
            identity=identity,
            subject_ref=subject_ref,
            payload=body,
            prev_hash=self._last_hash,
        ).seal()
        line = event.model_dump_json()
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
            fh.flush()
            os.fsync(fh.fileno())
        self._sequence += 1
        self._last_hash = event.event_hash
        return event

    @property
    def head_hash(self) -> str:
        return self._last_hash

    @property
    def count(self) -> int:
        return self._sequence

    # ------------------------------------------------------------------ read
    def read(self) -> Iterator[dict[str, Any]]:
        if not self.path.exists():
            return iter(())
        return _iter_jsonl(self.path)


def _iter_jsonl(path: Path) -> Iterator[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                yield json.loads(line)


def verify_chain(path: Path | str) -> dict[str, Any]:
    """Recompute the hash chain. Returns a structured verification report."""
    path = Path(path)
    errors: list[str] = []
    prev = GENESIS_HASH
    count = 0
    head = GENESIS_HASH

    if not path.exists():
        return {"path": str(path), "ok": False, "events": 0, "errors": ["file not found"], "head": None}

    for index, record in enumerate(_iter_jsonl(path)):
        count += 1
        if record.get("sequence") != index:
            errors.append(f"line {index}: sequence mismatch ({record.get('sequence')})")
        if record.get("prev_hash") != prev:
            errors.append(f"line {index}: prev_hash break")
        expected_payload = sha256_hex(canonical_json(record.get("payload", {})))
        if record.get("payload_hash") != expected_payload:
            errors.append(f"line {index}: payload_hash mismatch")
        recomputed = sha256_hex(
            canonical_json(
                {
                    "event_id": record["event_id"],
                    "sequence": record["sequence"],
                    "recorded_at": canonical_timestamp(record["recorded_at"]),
                    "run_id": record["run_id"],
                    "phase": record["phase"],
                    "event_type": record["event_type"],
                    "actor": record["actor"],
                    "identity": record.get("identity"),
                    "subject_ref": record.get("subject_ref"),
                    "payload_hash": record["payload_hash"],
                    "prev_hash": record["prev_hash"],
                }
            )
        )
        if recomputed != record.get("event_hash"):
            errors.append(f"line {index}: event_hash mismatch")
        prev = record.get("event_hash", "")
        head = prev

    return {
        "path": str(path),
        "ok": not errors,
        "events": count,
        "errors": errors,
        "head": head,
    }


def verify_dir(audit_dir: Path | str) -> list[dict[str, Any]]:
    audit_dir = Path(audit_dir)
    if not audit_dir.exists():
        return []
    return [verify_chain(p) for p in sorted(audit_dir.glob("*.jsonl"))]


def summarize(records: Iterable[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for rec in records:
        counts[rec["event_type"]] = counts.get(rec["event_type"], 0) + 1
    return counts
