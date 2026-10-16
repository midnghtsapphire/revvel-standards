#!/usr/bin/env python3
"""Export your OWN Ring devices' event history and recordings.

This tool is for the Ring account owner only. It signs in with the owner's
credentials, lists the devices that account owns, exports their event history
and downloads their recordings with a tamper-evident manifest.

It deliberately has no way to reach other people's data:

* devices shared *to* this account by another owner ("authorized_doorbots",
  and anything else the library marks ``shared``) are filtered out;
* there is no Neighbors / neighbourhood feed, public post or shared-feed code
  path at all;
* ``download`` only accepts event ids that it finds in the history of one of
  your own devices, so it cannot be pointed at an arbitrary recording id.

It uses the unofficial open-source ``ring_doorbell`` library (python-ring-doorbell,
async API, 0.9.x). Ring's terms of service limit automated access; see RING.md.

Commands::

    login    --token-file PATH
    devices  --token-file PATH
    events   --token-file PATH [--device ID] [--since ISO] [--until ISO]
             [--kind motion|ding|on_demand] --out events.csv|events.json
    download --token-file PATH --ids ID [ID ...] --out-dir DIR [--device ID]
             [--evidence-log LOG --operator NAME [--evidence-key KEY]]
    verify   --out-dir DIR [--evidence-log LOG [--public-key PUB] [--expect-head HEX] [--court]]

Evidence: ``manifest.jsonl`` in --out-dir (the original format) is always
written; ``download`` uses it to skip recordings it already has. With
--evidence-log, each recording is also appended to the shared
revvel-evidence/1 log in ../evidence (SYSTEM_REVIEW C5/M1): an operator is
required (--operator or EVIDENCE_OPERATOR), every metadata field is hashed and
chained, and --evidence-key signs each entry with Ed25519. The HTTPS download
is done by ring_doorbell, so no server Date header or TLS fingerprint is
available to this tool; the entry says so.

Exit codes: 0 ok, 1 incomplete / verify failure, 2 bad input / auth error.

Secrets: the password and 2FA code are only ever read interactively (getpass /
prompt) and are never accepted on argv. Only the refresh token is persisted, to
the token file, with mode 0600, replaced atomically whenever Ring rotates it.
No secret is printed or logged; a logging filter redacts any that leak through
third-party log records.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import getpass
import hashlib
import json
import logging
import os
import stat
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable

EXIT_OK = 0
EXIT_INCOMPLETE = 1
EXIT_BAD_INPUT = 2

USER_AGENT = "revvel-ring-export/1.0"
TOOL_VERSION = "1.1"
MANIFEST_NAME = "manifest.jsonl"
EVIDENCE_KIND = "ring-recording"
NO_TRANSPORT_FACTS = ("downloaded by the ring_doorbell library; this tool does not see the HTTP Date header "
                      "or the TLS certificate")
GENESIS_HASH = "0" * 64
EVENT_KINDS = ("motion", "ding", "on_demand")
EVENT_FIELDS = (
    "event_id",
    "device_id",
    "device_name",
    "kind",
    "created_at_utc",
    "duration_s",
    "answered",
    "recording_status",
)
# Families this tool will touch. "authorized_doorbots" (devices someone else
# shared with you) and "other" (which the library marks shared) are excluded.
OWN_VIDEO_FAMILIES = ("doorbots", "stickup_cams")
OWN_FAMILIES = OWN_VIDEO_FAMILIES + ("chimes",)
# Any argv flag that looks like it carries a secret is refused outright.
FORBIDDEN_FLAGS = (
    "--password",
    "--pass",
    "--passwd",
    "-p",
    "--token",
    "--refresh-token",
    "--access-token",
    "--otp",
    "--2fa",
    "--2fa-code",
    "--code",
)

LOG = logging.getLogger("ring_export")


class ExportError(Exception):
    """An error that maps to an exit code."""

    def __init__(self, message: str, code: int = EXIT_BAD_INPUT) -> None:
        super().__init__(message)
        self.code = code


# --------------------------------------------------------------------------
# Library loading (isolated so tests can substitute fakes)
# --------------------------------------------------------------------------


def _load_ring() -> dict[str, Any]:
    """Import ring_doorbell lazily and return the pieces we use."""
    try:
        from ring_doorbell import Auth, Ring  # type: ignore
        from ring_doorbell.exceptions import (  # type: ignore
            AuthenticationError,
            Requires2FAError,
            RingError,
        )
    except ImportError as exc:  # pragma: no cover - depends on environment
        raise ExportError(
            "The 'ring_doorbell' package is not installed (pip install ring_doorbell)."
        ) from exc
    return {
        "Auth": Auth,
        "Ring": Ring,
        "AuthenticationError": AuthenticationError,
        "Requires2FAError": Requires2FAError,
        "RingError": RingError,
    }


# Rate limiting hook; tests replace this to observe/skip delays.
_sleep: Callable[[float], Any] = asyncio.sleep


# --------------------------------------------------------------------------
# Secret handling
# --------------------------------------------------------------------------


class SecretRedactor(logging.Filter):
    """Replace any registered secret value in log records with ``***``."""

    def __init__(self) -> None:
        super().__init__()
        self._secrets: set[str] = set()

    def add(self, value: Any) -> None:
        if isinstance(value, str) and len(value) >= 4:
            self._secrets.add(value)

    def scrub(self, text: str) -> str:
        for secret in self._secrets:
            if secret in text:
                text = text.replace(secret, "***")
        return text

    def filter(self, record: logging.LogRecord) -> bool:
        if self._secrets:
            try:
                message = record.getMessage()
            except Exception:  # noqa: BLE001 - never let logging crash
                message = str(record.msg)
            record.msg = self.scrub(message)
            record.args = None
        return True


REDACTOR = SecretRedactor()


def _install_redactor() -> None:
    root = logging.getLogger()
    for handler in root.handlers:
        if REDACTOR not in handler.filters:
            handler.addFilter(REDACTOR)
    for name in ("", "ring_doorbell", "ring_export"):
        lg = logging.getLogger(name)
        if REDACTOR not in lg.filters:
            lg.addFilter(REDACTOR)


def reject_secret_argv(argv: Iterable[str]) -> None:
    """Refuse any argv that tries to pass a password, token or 2FA code."""
    for arg in argv:
        flag = arg.split("=", 1)[0]
        if flag in FORBIDDEN_FLAGS:
            # Do not echo the value: name only the flag.
            raise ExportError(
                f"refusing {flag!s} on the command line: secrets are read interactively "
                "(password via getpass, 2FA via prompt) and the token lives in --token-file",
                EXIT_BAD_INPUT,
            )


# --------------------------------------------------------------------------
# Token file
# --------------------------------------------------------------------------


def write_token_file(path: Path, refresh_token: str) -> None:
    """Atomically write ``{"refresh_token": ...}`` to *path* with mode 0600.

    The temp file is created 0600 from the start (no window where it is
    world-readable), fsynced, then renamed over the target.
    """
    if not isinstance(refresh_token, str) or not refresh_token:
        raise ExportError("Ring returned no refresh token; nothing saved", EXIT_BAD_INPUT)
    path = Path(path)
    parent = path.parent if str(path.parent) else Path(".")
    if not parent.exists():
        parent.mkdir(parents=True, mode=0o700)
    fd, tmp = tempfile.mkstemp(prefix=".ring-token-", dir=str(parent))
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump({"refresh_token": refresh_token}, fh)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
        os.chmod(path, 0o600)
    except BaseException:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass
        raise
    try:
        dfd = os.open(str(parent), os.O_RDONLY)
        try:
            os.fsync(dfd)
        finally:
            os.close(dfd)
    except OSError:  # pragma: no cover - platform dependent
        pass


def read_token_file(path: Path) -> str:
    """Return the refresh token, refusing files readable by group/others."""
    path = Path(path)
    try:
        st = path.stat()
    except FileNotFoundError as exc:
        raise ExportError(f"token file not found: {path} (run 'login' first)") from exc
    if os.name == "posix" and st.st_mode & (stat.S_IRWXG | stat.S_IRWXO):
        raise ExportError(
            f"token file {path} is accessible by group/others "
            f"(mode {stat.S_IMODE(st.st_mode):o}); run: chmod 600 {path}"
        )
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        token = data["refresh_token"]
    except (ValueError, KeyError, TypeError) as exc:
        raise ExportError(f"token file {path} is not a valid token file") from exc
    if not isinstance(token, str) or not token:
        raise ExportError(f"token file {path} has an empty refresh token")
    REDACTOR.add(token)
    return token


def make_token_updater(path: Path) -> Callable[[dict[str, Any]], None]:
    """Callback for ring_doorbell.Auth: persist rotated refresh tokens."""

    def _update(token: dict[str, Any]) -> None:
        for key in ("access_token", "refresh_token"):
            REDACTOR.add(token.get(key))
        refresh = token.get("refresh_token")
        if refresh:
            write_token_file(path, refresh)
            LOG.info("token file updated")

    return _update


# --------------------------------------------------------------------------
# Session helpers
# --------------------------------------------------------------------------


async def open_session(token_file: Path, lib: dict[str, Any]):
    """Return (auth, ring) for the owner whose refresh token is in *token_file*."""
    refresh = read_token_file(token_file)
    auth = lib["Auth"](
        USER_AGENT,
        {"refresh_token": refresh},
        make_token_updater(token_file),
    )
    try:
        # Exchange the stored refresh token for an access token; Ring rotates the
        # refresh token here and the updater writes the new one back atomically.
        await auth.async_refresh_tokens()
        ring = lib["Ring"](auth)
        await ring.async_update_data()
    except lib["AuthenticationError"] as exc:
        await _close(auth)
        raise ExportError("Ring rejected the stored token; run 'login' again") from exc
    return auth, ring


async def _close(auth: Any) -> None:
    closer = getattr(auth, "async_close", None)
    if closer is not None:
        await closer()


def own_devices(ring: Any, families: Iterable[str] = OWN_FAMILIES) -> list[Any]:
    """Devices this account owns. Shared-to-you devices are never returned."""
    devs = ring.devices() if callable(getattr(ring, "devices", None)) else ring.devices
    out = []
    for family in families:
        for dev in getattr(devs, family, None) or []:
            if getattr(dev, "shared", False):
                continue
            out.append(dev)
    return out


def _device_kind(dev: Any) -> str:
    try:
        return str(dev.kind)
    except (KeyError, AttributeError):
        return ""


def select_devices(ring: Any, device_id: str | None, video_only: bool) -> list[Any]:
    devices = own_devices(ring, OWN_VIDEO_FAMILIES if video_only else OWN_FAMILIES)
    if device_id is None:
        return devices
    chosen = [d for d in devices if str(d.id) == str(device_id)]
    if not chosen:
        raise ExportError(f"device {device_id} is not one of your own devices")
    return chosen


# --------------------------------------------------------------------------
# Time helpers
# --------------------------------------------------------------------------


def parse_iso(value: str | None) -> datetime | None:
    if value is None:
        return None
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(text)
    except ValueError as exc:
        raise ExportError(f"not an ISO-8601 date/time: {value!r}") from exc
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def to_utc(value: Any) -> datetime:
    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    parsed = parse_iso(str(value))
    assert parsed is not None
    return parsed


def iso_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------
# History paging
# --------------------------------------------------------------------------


async def iter_history(
    device: Any,
    *,
    since: datetime | None,
    until: datetime | None,
    kind: str | None,
    page_size: int,
    page_delay: float,
    max_pages: int,
):
    """Page a device's history newest-first with ``older_than``.

    Returns ``(events, complete)``. ``complete`` is True only when paging stopped
    because history ran out or crossed ``since`` -- not because ``max_pages`` hit.
    """
    events: list[dict[str, Any]] = []
    older_than = None
    seen_cursor = set()
    for page_no in range(max_pages):
        if page_no:
            await _sleep(page_delay)
        kwargs: dict[str, Any] = {"limit": page_size}
        if older_than is not None:
            kwargs["older_than"] = older_than
        page = await device.async_history(**kwargs)
        if not page:
            return events, True
        # Replaced (review 2026-10-16): a repeated page was processed again (duplicate events) and then reported as
        # the end of history. It is now caught before its entries are used, and the export is marked incomplete.
        if page[-1]["id"] in seen_cursor:
            return events, False
        crossed = False
        for entry in page:
            created = to_utc(entry["created_at"])
            if since is not None and created < since:
                crossed = True
                continue
            if until is not None and created > until:
                continue
            if kind is not None and entry.get("kind") != kind:
                continue
            events.append(normalise_event(device, entry, created))
        last_id = page[-1]["id"]
        if crossed:
            return events, True
        # if last_id in seen_cursor:
        #     # API returned the same page again; stop rather than loop forever.
        #     return events, True
        seen_cursor.add(last_id)
        older_than = last_id
        # if len(page) < page_size:
        #     return events, True
        # Replaced (review 2026-10-16): Ring may return fewer than --page-size entries (a service cap), so a short
        # page is not the end of history; only an empty page is.
    return events, False


def normalise_event(device: Any, entry: dict[str, Any], created: datetime) -> dict[str, Any]:
    recording = entry.get("recording") or {}
    return {
        "event_id": str(entry["id"]),
        "device_id": str(device.id),
        "device_name": getattr(device, "name", ""),
        "kind": entry.get("kind", ""),
        "created_at_utc": iso_z(created),
        "duration_s": entry.get("duration"),
        "answered": entry.get("answered"),
        "recording_status": recording.get("status") if isinstance(recording, dict) else None,
    }


def write_events(events: list[dict[str, Any]], out: Path) -> None:
    out = Path(out)
    suffix = out.suffix.lower()
    if suffix == ".json":
        payload = json.dumps(events, indent=2, ensure_ascii=False) + "\n"
        _atomic_write_bytes(out, payload.encode("utf-8"))
    elif suffix == ".csv":
        tmp = out.with_name(out.name + ".part")
        with open(tmp, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(EVENT_FIELDS))
            writer.writeheader()
            for ev in events:
                writer.writerow({k: "" if ev.get(k) is None else ev.get(k) for k in EVENT_FIELDS})
        os.replace(tmp, out)
    else:
        raise ExportError("--out must end in .csv or .json")


def _atomic_write_bytes(path: Path, data: bytes) -> None:
    path = Path(path)
    fd, tmp = tempfile.mkstemp(prefix="." + path.name + ".", dir=str(path.parent or "."))
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass
        raise


# --------------------------------------------------------------------------
# Manifest / hash chain
# --------------------------------------------------------------------------


def _chain_hash(prev_hash: str, record: dict[str, Any]) -> str:
    body = {k: v for k, v in record.items() if k != "chain_hash"}
    canonical = json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256((prev_hash + "\n" + canonical).encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> tuple[str, int]:
    h = hashlib.sha256()
    size = 0
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
            size += len(chunk)
    return h.hexdigest(), size


def read_manifest(out_dir: Path) -> list[dict[str, Any]]:
    path = Path(out_dir) / MANIFEST_NAME
    if not path.exists():
        return []
    records = []
    with open(path, encoding="utf-8") as fh:
        for line_no, line in enumerate(fh, 1):
            if not line.strip():
                continue
            try:
                # records.append(json.loads(line))
                # Replaced (review 2026-10-16): a valid JSON line that is not an object crashed verify at rec.get().
                rec = json.loads(line)
            except ValueError as exc:
                raise ExportError(f"{path}:{line_no}: not valid JSON", EXIT_INCOMPLETE) from exc
            if not isinstance(rec, dict):
                raise ExportError(f"{path}:{line_no}: not a JSON object", EXIT_INCOMPLETE)
            records.append(rec)
    return records


def append_manifest(out_dir: Path, record: dict[str, Any], prev_hash: str) -> str:
    record = dict(record)
    record["prev_hash"] = prev_hash
    record["chain_hash"] = _chain_hash(prev_hash, record)
    line = json.dumps(record, sort_keys=True, ensure_ascii=False) + "\n"
    with open(Path(out_dir) / MANIFEST_NAME, "a", encoding="utf-8") as fh:
        fh.write(line)
        fh.flush()
        os.fsync(fh.fileno())
    return record["chain_hash"]


def verify_dir(out_dir: Path) -> list[str]:
    """Return a list of problems; empty means the directory verifies."""
    out_dir = Path(out_dir)
    problems: list[str] = []
    if not (out_dir / MANIFEST_NAME).exists():
        return [f"no {MANIFEST_NAME} in {out_dir}"]
    try:
        records = read_manifest(out_dir)
    except ExportError as exc:
        return [str(exc)]
    prev = GENESIS_HASH
    listed = set()
    for i, rec in enumerate(records, 1):
        label = f"line {i} (event {rec.get('event_id')})"
        if rec.get("prev_hash") != prev:
            problems.append(f"{label}: prev_hash does not match previous chain_hash")
        if rec.get("chain_hash") != _chain_hash(rec.get("prev_hash", ""), rec):
            problems.append(f"{label}: chain_hash mismatch (record edited)")
        prev = rec.get("chain_hash", "")
        name = rec.get("file")
        if not name or Path(name).name != name:
            problems.append(f"{label}: bad file name {name!r}")
            continue
        listed.add(name)
        fpath = out_dir / name
        if not fpath.is_file():
            problems.append(f"{label}: file missing: {name}")
            continue
        digest, size = sha256_file(fpath)
        if digest != rec.get("sha256"):
            problems.append(f"{label}: sha256 mismatch for {name}")
        if size != rec.get("bytes"):
            problems.append(f"{label}: size mismatch for {name} ({size} != {rec.get('bytes')})")
    for extra in sorted(p.name for p in out_dir.glob("*.mp4")):
        if extra not in listed:
            problems.append(f"unlisted recording not in manifest: {extra}")
    return problems


# --------------------------------------------------------------------------
# Shared evidence log (../evidence, revvel-evidence/1)
# --------------------------------------------------------------------------


def _fetch_module():
    """opendata/fetch.py holds the shared --evidence-log helpers (works as a script or a package)."""
    try:
        from . import fetch as F  # type: ignore
    except ImportError:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import fetch as F  # type: ignore
    return F


def open_evidence_log(args: argparse.Namespace):
    """The shared EvidenceLog asked for on the command line, or None. Checked before Ring is contacted."""
    try:
        return _fetch_module().evidence_log_from_args(args, tool_name="ring_export", tool_version=TOOL_VERSION,
                                                      tool_path=os.path.abspath(__file__))
    except ValueError as exc:
        raise ExportError(str(exc), EXIT_BAD_INPUT) from exc


def log_recording(evidence_log: Any, path: Path, record: dict[str, Any], chain_hash: str) -> dict[str, Any]:
    """Append one downloaded recording (bytes from disk) and its manifest record to the shared log."""
    extra = dict(record)
    extra.update(legacy_manifest=MANIFEST_NAME, legacy_chain_hash=chain_hash, transport=NO_TRANSPORT_FACTS)
    source = f"ring:device/{record['device_id']}/event/{record['event_id']}"
    return evidence_log.append(path=str(path), kind=EVIDENCE_KIND, source=source, extra=extra)


def verify_evidence_log(args: argparse.Namespace) -> tuple[list[str], list[str], dict[str, Any]]:
    """Run the shared library's verify_log on --evidence-log; returns (problems, warnings, report)."""
    F = _fetch_module()
    try:
        core = F.evidence_core()
        public_key = core.load_public_key(args.public_key) if args.public_key else None
        rep = core.verify_log(args.evidence_log, public_key=public_key, expect_head=args.expect_head,
                              court=args.court, tsa_cafile=args.tsa_ca)
    except ImportError as exc:
        raise ExportError(f"--evidence-log needs ../evidence and the 'cryptography' package ({exc})") from exc
    except (OSError, ValueError) as exc:
        raise ExportError(f"cannot verify {args.evidence_log}: {exc}") from exc
    except Exception as exc:  # noqa: BLE001 - core.EvidenceError (no log there)
        raise ExportError(f"cannot verify {args.evidence_log}: {exc}") from exc
    return rep["problems"], rep["warnings"], rep


def cross_check_evidence_log(out_dir: Path, log_dir: str) -> tuple[list[str], list[str]]:
    """Check that the shared log describes the recordings in this manifest (review 2026-10-16).

    Each manifest record must have a matching entry in the log: a ``ring-recording``
    entry with the same device and event, file name, sha256 and ``legacy_chain_hash``,
    or an ``import:ring-manifest`` entry whose ``legacy_entry`` has the same chain_hash
    and sha256. ``ring-recording`` entries for other recordings (a case log can serve
    several directories) are reported as warnings.
    Returns (problems, warnings).
    """
    try:
        records = read_manifest(out_dir)
    except ExportError:
        return [], []  # verify_dir already reports an unreadable manifest
    try:
        entries = _fetch_module().evidence_core().EvidenceLog(log_dir).read_entries()
    except Exception as exc:  # noqa: BLE001 - EvidenceError / OSError
        return [f"cannot read entries to cross-check: {exc}"], []
    problems: list[str] = []
    used: set[int] = set()
    for rec in records:
        label = f"event {rec.get('event_id')} ({rec.get('file')})"
        matches = []
        for i, e in enumerate(entries):
            extra = e.get("extra") if isinstance(e.get("extra"), dict) else {}
            if e.get("kind") == EVIDENCE_KIND:
                if (str(extra.get("event_id")), str(extra.get("device_id"))) == (
                        str(rec.get("event_id")), str(rec.get("device_id"))):
                    matches.append((i, e, extra))
            elif str(e.get("kind", "")).startswith("import:ring-manifest"):
                legacy = extra.get("legacy_entry")
                if isinstance(legacy, dict) and legacy.get("chain_hash") == rec.get("chain_hash"):
                    matches.append((i, e, extra))
        if not matches:
            problems.append(f"{label}: in {MANIFEST_NAME} but not in the evidence log")
            continue
        for i, e, extra in matches:
            used.add(i)
            if e.get("kind") == EVIDENCE_KIND:
                bad = [name for name, got, want in (
                    ("sha256", e.get("sha256"), rec.get("sha256")),
                    ("file", extra.get("file"), rec.get("file")),
                    ("legacy_chain_hash", extra.get("legacy_chain_hash"), rec.get("chain_hash")),
                ) if got != want]
            else:
                legacy = extra["legacy_entry"]
                bad = [n for n in ("sha256", "file", "event_id", "device_id") if legacy.get(n) != rec.get(n)]
                if e.get("kind") == "import:ring-manifest" and e.get("sha256") != rec.get("sha256"):
                    bad.append("sha256")
            if bad:
                problems.append(f"{label}: evidence log seq {e.get('seq')} disagrees on {', '.join(sorted(set(bad)))}")
    warnings = [f"evidence log seq {e.get('seq')} (event {(e.get('extra') or {}).get('event_id')}) is a "
                f"{EVIDENCE_KIND} entry not in this {MANIFEST_NAME} (another directory, or a removed record?)"
                for i, e in enumerate(entries) if e.get("kind") == EVIDENCE_KIND and i not in used]
    return problems, warnings


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------


async def cmd_login(args: argparse.Namespace, lib: dict[str, Any], io: "IO") -> int:
    token_file = Path(args.token_file)
    username = io.input("Ring account email: ").strip()
    if not username:
        raise ExportError("no username entered")
    password = io.getpass("Ring password (not echoed): ")
    REDACTOR.add(password)
    if not password:
        raise ExportError("no password entered")

    def updater(token: dict[str, Any]) -> None:
        for key in ("access_token", "refresh_token"):
            REDACTOR.add(token.get(key))

    auth = lib["Auth"](USER_AGENT, None, updater)
    try:
        try:
            token = await auth.async_fetch_token(username, password)
        except lib["Requires2FAError"]:
            code = io.getpass("2FA code sent by Ring (not echoed): ").strip()
            REDACTOR.add(code)
            token = await auth.async_fetch_token(username, password, code)
    except lib["AuthenticationError"] as exc:
        raise ExportError("Ring login failed (check email, password and 2FA code)") from exc
    finally:
        await _close(auth)
    refresh = (token or {}).get("refresh_token")
    REDACTOR.add(refresh)
    write_token_file(token_file, refresh)
    io.out(f"Logged in. Refresh token saved to {token_file} (mode 0600).")
    return EXIT_OK


async def cmd_devices(args: argparse.Namespace, lib: dict[str, Any], io: "IO") -> int:
    auth, ring = await open_session(Path(args.token_file), lib)
    try:
        rows = []
        for dev in own_devices(ring):
            rows.append(
                {
                    "id": str(dev.id),
                    "name": getattr(dev, "name", ""),
                    "kind": _device_kind(dev),
                    "location_id": getattr(dev, "location_id", None),
                }
            )
    finally:
        await _close(auth)
    if args.json:
        io.out(json.dumps(rows, indent=2))
    else:
        io.out("id\tname\tkind\tlocation_id")
        for r in rows:
            io.out(f"{r['id']}\t{r['name']}\t{r['kind']}\t{r['location_id'] or ''}")
    return EXIT_OK


async def cmd_events(args: argparse.Namespace, lib: dict[str, Any], io: "IO") -> int:
    since = parse_iso(args.since)
    until = parse_iso(args.until)
    if since and until and since > until:
        raise ExportError("--since is after --until")
    out = Path(args.out)
    if out.suffix.lower() not in (".csv", ".json"):
        raise ExportError("--out must end in .csv or .json")
    auth, ring = await open_session(Path(args.token_file), lib)
    all_events: list[dict[str, Any]] = []
    incomplete = []
    try:
        for idx, dev in enumerate(select_devices(ring, args.device, video_only=True)):
            if idx:
                await _sleep(args.page_delay)
            events, complete = await iter_history(
                dev,
                since=since,
                until=until,
                kind=args.kind,
                page_size=args.page_size,
                page_delay=args.page_delay,
                max_pages=args.max_pages,
            )
            all_events.extend(events)
            if not complete:
                incomplete.append(str(dev.id))
    finally:
        await _close(auth)
    all_events.sort(key=lambda e: (e["created_at_utc"], e["event_id"]), reverse=True)
    write_events(all_events, out)
    io.out(f"Wrote {len(all_events)} events to {out}")
    if incomplete:
        # io.err("INCOMPLETE: --max-pages reached before the start of history/--since for device(s) " + ...)
        # Replaced (review 2026-10-16): paging also stops incomplete when Ring repeats a page.
        io.err(
            "INCOMPLETE: paging stopped (--max-pages reached, or Ring repeated a page) before the start of "
            "history/--since for device(s) "
            + ", ".join(incomplete)
        )
        return EXIT_INCOMPLETE
    return EXIT_OK


async def _locate_events(devices, wanted: set[str], args) -> dict[str, tuple[Any, dict[str, Any]]]:
    """Find wanted event ids in your own devices' history."""
    found: dict[str, tuple[Any, dict[str, Any]]] = {}
    for idx, dev in enumerate(devices):
        if len(found) == len(wanted):
            break
        if idx:
            await _sleep(args.page_delay)
        older_than = None
        for page_no in range(args.max_pages):
            if page_no:
                await _sleep(args.page_delay)
            kwargs: dict[str, Any] = {"limit": args.page_size}
            if older_than is not None:
                kwargs["older_than"] = older_than
            page = await dev.async_history(**kwargs)
            if not page:
                break
            for entry in page:
                eid = str(entry["id"])
                if eid in wanted and eid not in found:
                    found[eid] = (dev, entry)
            # if len(found) == len(wanted) or len(page) < args.page_size:
            # Replaced (review 2026-10-16): a short page may be a service cap, not the end of history.
            if len(found) == len(wanted):
                break
            if page[-1]["id"] == older_than:
                break
            older_than = page[-1]["id"]
    return found


async def cmd_download(args: argparse.Namespace, lib: dict[str, Any], io: "IO") -> int:
    wanted = []
    for raw in args.ids:
        for part in str(raw).split(","):
            part = part.strip()
            if not part:
                continue
            if not part.isdigit():
                raise ExportError(f"event id must be numeric: {part!r}")
            if part not in wanted:
                wanted.append(part)
    if not wanted:
        raise ExportError("no event ids given")
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    existing = read_manifest(out_dir)
    if existing and verify_dir(out_dir):
        raise ExportError(
            f"{out_dir} does not verify; refusing to extend a broken chain (run 'verify')",
            EXIT_INCOMPLETE,
        )
    # Review 2026-10-16: with no manifest records, a stray .mp4 was not checked, so a "successful" download left a
    # directory that failed 'verify' straight away.
    orphans = sorted(p.name for p in out_dir.glob("*.mp4")) if not existing else []
    if orphans:
        raise ExportError(
            f"{out_dir} has recordings that are in no manifest ({', '.join(orphans[:5])}); "
            "use an empty directory or move them out",
            EXIT_INCOMPLETE,
        )
    prev = existing[-1]["chain_hash"] if existing else GENESIS_HASH
    done = {str(r.get("event_id")) for r in existing}
    evidence_log = open_evidence_log(args)  # operator/key/log problems stop us before Ring is contacted

    auth, ring = await open_session(Path(args.token_file), lib)
    failures: list[str] = []
    written = 0
    try:
        devices = select_devices(ring, args.device, video_only=True)
        todo = [e for e in wanted if e not in done]
        found = await _locate_events(devices, set(todo), args) if todo else {}
        for n, eid in enumerate(todo):
            if eid not in found:
                failures.append(f"{eid}: not found in your own devices' history")
                continue
            dev, entry = found[eid]
            if n:
                await _sleep(args.page_delay)
            created = to_utc(entry["created_at"])
            name = f"{iso_z(created).replace(':', '').replace('-', '').replace('.', '_')}_{dev.id}_{eid}.mp4"
            target = out_dir / name
            if target.exists():
                failures.append(f"{eid}: {name} already exists but is not in the manifest")
                continue
            try:
                data = await dev.async_recording_download(int(eid))
            except lib["RingError"] as exc:
                failures.append(f"{eid}: download failed ({type(exc).__name__})")
                continue
            if not data:
                failures.append(f"{eid}: no recording (Ring Protect plan required, or not yet available)")
                continue
            _atomic_write_bytes(target, bytes(data))
            digest, size = sha256_file(target)
            record = {
                "event_id": eid,
                "device_id": str(dev.id),
                "device_name": getattr(dev, "name", ""),
                "kind": entry.get("kind", ""),
                "created_at_utc": iso_z(created),
                "file": name,
                "sha256": digest,
                "bytes": size,
                "retrieved_at_utc": iso_z(utc_now()),
            }
            # prev = append_manifest(out_dir, {...same fields as `record`...}, prev)
            # Replaced: the record is built first so the shared evidence log can carry it too.
            prev = append_manifest(out_dir, record, prev)
            written += 1
            io.out(f"{eid}\t{name}\t{size}\t{digest}")
            if evidence_log is not None:
                try:
                    ev = log_recording(evidence_log, target, record, prev)
                except Exception as exc:  # noqa: BLE001 - EvidenceError / OSError: capture not recorded
                    failures.append(f"{eid}: in {MANIFEST_NAME} but not added to the evidence log ({exc}); "
                                    "add it with: python3 -m evidence import OUT_DIR --into LOG")
                    continue
                if ev["sha256"] != digest:
                    failures.append(f"{eid}: file changed between download and evidence capture")
                io.out(f"{eid}\tevidence seq {ev['seq']}\t{ev['entry_hash']}")
    finally:
        await _close(auth)
    io.out(f"Downloaded {written}; already in manifest {len(wanted) - len(todo)}; failed {len(failures)}")
    if evidence_log is not None:
        count, head = evidence_log.head()
        io.out(f"evidence log {evidence_log.dir}: {count} entries, head {head} "
               "(record this head somewhere you do not control)")
    for f in failures:
        io.err(f"FAILED {f}")
    return EXIT_INCOMPLETE if failures else EXIT_OK


def cmd_verify(args: argparse.Namespace, io: "IO") -> int:
    problems = verify_dir(Path(args.out_dir))
    if args.evidence_log:
        ev_problems, warnings, rep = verify_evidence_log(args)
        problems += [f"evidence log: {p}" for p in ev_problems]
        # Review 2026-10-16: the two chains were verified independently; a log of other recordings also passed.
        if not ev_problems:
            cross_problems, cross_warnings = cross_check_evidence_log(Path(args.out_dir), args.evidence_log)
            problems += [f"evidence log: {p}" for p in cross_problems]
            warnings = list(warnings) + cross_warnings
        for w in warnings:
            io.err(f"WARN evidence log: {w}")
        if not ev_problems:
            io.out(f"evidence log OK: {rep['count']} entr{'y' if rep['count'] == 1 else 'ies'}, head {rep['head']}"
                   + (", signed" if rep["signed"] else ", unsigned"))
    elif args.public_key or args.expect_head or args.court:
        raise ExportError("--public-key, --expect-head and --court need --evidence-log")
    if problems:
        for p in problems:
            io.err(f"FAIL {p}")
        io.err(f"verify FAILED: {len(problems)} problem(s)")
        return EXIT_INCOMPLETE
    count = len(read_manifest(Path(args.out_dir)))
    io.out(f"verify OK: {count} recording(s), hash chain intact")
    return EXIT_OK


# --------------------------------------------------------------------------
# CLI plumbing
# --------------------------------------------------------------------------


class IO:
    """Indirection over terminal I/O so tests can capture it; output is scrubbed."""

    def __init__(self, stdout=None, stderr=None, input_fn=input, getpass_fn=getpass.getpass):
        self._stdout = stdout or sys.stdout
        self._stderr = stderr or sys.stderr
        self.input = input_fn
        self.getpass = getpass_fn

    def out(self, text: str) -> None:
        print(REDACTOR.scrub(text), file=self._stdout)

    def err(self, text: str) -> None:
        print(REDACTOR.scrub(text), file=self._stderr)


def _positive_int(value: str) -> int:
    n = int(value)
    if n < 1:
        raise argparse.ArgumentTypeError("must be >= 1")
    return n


def _non_negative_float(value: str) -> float:
    f = float(value)
    if f < 0:
        raise argparse.ArgumentTypeError("must be >= 0")
    return f


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="ring_export.py",
        description="Export your OWN Ring devices' events and recordings (owner account only).",
    )
    p.add_argument("-v", "--verbose", action="store_true", help="info-level logging (secrets redacted)")
    sub = p.add_subparsers(dest="command", required=True)

    def token(sp):
        sp.add_argument("--token-file", required=True, help="refresh-token file (created 0600 by 'login')")

    def paging(sp):
        sp.add_argument("--page-size", type=_positive_int, default=50)
        sp.add_argument("--page-delay", type=_non_negative_float, default=1.0,
                        help="seconds to sleep between API pages (rate limit; default 1.0)")
        sp.add_argument("--max-pages", type=_positive_int, default=200)

    sp = sub.add_parser("login", help="one-time interactive login; saves refresh token only")
    token(sp)

    sp = sub.add_parser("devices", help="list your own devices")
    token(sp)
    sp.add_argument("--json", action="store_true")

    sp = sub.add_parser("events", help="export event history of your own devices")
    token(sp)
    sp.add_argument("--device")
    sp.add_argument("--since")
    sp.add_argument("--until")
    sp.add_argument("--kind", choices=EVENT_KINDS)
    sp.add_argument("--out", required=True, help="events.csv or events.json")
    paging(sp)

    sp = sub.add_parser("download", help="download your own recordings with a hash-chained manifest")
    token(sp)
    sp.add_argument("--ids", nargs="+", required=True, help="event ids (space or comma separated)")
    sp.add_argument("--out-dir", required=True)
    sp.add_argument("--device")
    paging(sp)
    _fetch_module().add_evidence_log_args(sp.add_argument_group("shared evidence log"))

    sp = sub.add_parser("verify", help="re-hash recordings and check the manifest chain")
    sp.add_argument("--out-dir", required=True)
    g = sp.add_argument_group("shared evidence log")
    g.add_argument("--evidence-log", metavar="DIR", help="also verify this revvel-evidence/1 log")
    g.add_argument("--public-key", metavar="PEM", help="operator's Ed25519 public key (checks every signature)")
    g.add_argument("--expect-head", metavar="HEX", help="head recorded outside this machine (detects truncation)")
    g.add_argument("--court", action="store_true", help="also require --expect-head or a verified RFC 3161 token")
    g.add_argument("--tsa-ca", metavar="PEM", help="CA bundle to verify RFC 3161 tokens")
    return p


def main(argv: list[str] | None = None, io: IO | None = None, lib: dict[str, Any] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    io = io or IO()
    try:
        reject_secret_argv(argv)
    except ExportError as exc:
        io.err(f"error: {exc}")
        return exc.code
    parser = build_parser()
    try:
        args = parser.parse_args(argv)
    except SystemExit as exc:
        return EXIT_OK if exc.code == 0 else EXIT_BAD_INPUT

    logging.basicConfig(
        level=logging.INFO if args.verbose else logging.WARNING,
        format="%(levelname)s %(name)s: %(message)s",
    )
    _install_redactor()

    try:
        if args.command == "verify":
            return cmd_verify(args, io)
        lib = lib or _load_ring()
        handler = {
            "login": cmd_login,
            "devices": cmd_devices,
            "events": cmd_events,
            "download": cmd_download,
        }[args.command]
        return asyncio.run(handler(args, lib, io))
    except ExportError as exc:
        io.err(f"error: {exc}")
        return exc.code
    except (EOFError, KeyboardInterrupt):
        io.err("error: aborted")
        return EXIT_BAD_INPUT
    except Exception as exc:  # noqa: BLE001 - library errors
        auth_error = lib.get("AuthenticationError") if lib else None
        if auth_error is not None and isinstance(exc, auth_error):
            io.err("error: Ring authentication failed; run 'login' again")
            return EXIT_BAD_INPUT
        ring_error = lib.get("RingError") if lib else None
        if ring_error is not None and isinstance(exc, ring_error):
            io.err(f"error: Ring API error ({type(exc).__name__}); export incomplete")
            return EXIT_INCOMPLETE
        raise


if __name__ == "__main__":
    sys.exit(main())
