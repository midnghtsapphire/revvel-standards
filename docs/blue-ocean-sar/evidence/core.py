"""Shared evidence log: hash-chained, optionally Ed25519-signed, append-only.

Layout of one evidence directory::

    <dir>/evidence.jsonl                 one canonical JSON entry per line
    <dir>/objects/<seq:06d>_<sha256>.bin captured bytes, written once ('xb')
    <dir>/head_<seq:06d>_<head>.tsr      RFC 3161 tokens over a chain head (tsa.py)

Every entry carries all of its metadata (operator, host, tool, clock state,
source, HTTP status, server Date header, TLS fingerprint, content hash, size,
stored file) and ``prev_hash``. ``entry_hash`` is SHA-256 over the canonical
JSON (sorted keys, no whitespace, UTF-8) of every field except ``entry_hash``
and ``signature``, so editing any field breaks the entry, and re-chaining a
forged log changes every later hash and every signature.

``signature`` is Ed25519 over ``SIG_DOMAIN + bytes.fromhex(entry_hash)``. A
log is either signed on every entry or on none; ``key_id`` (SHA-256 of the raw
public key) is inside the hashed body, so a signer change cannot be hidden.

What this proves and what it does not is spelled out in README.md: integrity
since capture and, with an RFC 3161 token or an anchored head, existence by a
point in time. It never proves that the captured content is true.
"""

import base64
import datetime as _dt
import hashlib
import json
import os
import re
import socket
import ssl
import subprocess
import time
import urllib.parse
import urllib.request

try:  # POSIX advisory lock; single-writer elsewhere.
    import fcntl
except ImportError:  # pragma: no cover
    fcntl = None

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

FORMAT = "revvel-evidence/1"
VERSION = "1.0.0"
TOOL_NAME = "revvel-evidence"
GENESIS = "0" * 64
LOG_NAME = "evidence.jsonl"
OBJECTS_DIR = "objects"
LOCK_NAME = ".evidence.lock"
SIG_DOMAIN = b"revvel-evidence/1 entry\x00"
ENV_OPERATOR = "EVIDENCE_OPERATOR"
CHUNK = 1 << 20

HASHED_FIELDS = (
    "format", "seq", "utc", "operator", "host", "tool", "clock", "kind", "source", "status",
    "server_date", "tls_cert_sha256", "sha256", "size", "file", "extra", "key_id", "prev_hash",
)
ENTRY_FIELDS = HASHED_FIELDS + ("entry_hash", "signature")
HEX64 = re.compile(r"^[0-9a-f]{64}$")
GIT_SHA = re.compile(r"^[0-9a-f]{40}([0-9a-f]{24})?$")
OBJECT_RE = re.compile(r"^objects/(\d{6,})_([0-9a-f]{64})\.bin$")


class EvidenceError(Exception):
    """The log cannot be extended or read as asked (bad input or broken chain)."""


# --------------------------------------------------------------------------- canonical form


def canonical(obj):
    """Canonical JSON bytes: sorted keys, no whitespace, UTF-8, no NaN/Infinity."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
                      allow_nan=False).encode("utf-8")


def sha256_hex(data):
    return hashlib.sha256(data).hexdigest()


def entry_hash(entry):
    """SHA-256 of the canonical JSON of the hashed body (all but entry_hash/signature)."""
    body = {k: v for k, v in entry.items() if k not in ("entry_hash", "signature")}
    return sha256_hex(canonical(body))


def _no_duplicate_keys(pairs):
    out = {}
    for k, v in pairs:
        if k in out:
            raise ValueError(f"duplicate key {k!r}")
        out[k] = v
    return out


def parse_line(raw):
    """Parse one log line strictly (duplicate keys rejected)."""
    return json.loads(raw.decode("utf-8"), object_pairs_hook=_no_duplicate_keys)


def utc_now():
    return _dt.datetime.now(_dt.timezone.utc)


def iso_utc(t):
    if t.tzinfo is None:
        raise EvidenceError("timestamps must be timezone-aware")
    return t.astimezone(_dt.timezone.utc).isoformat(timespec="microseconds")


def parse_aware(text):
    """Parse an ISO time and insist on a UTC offset; returns an aware datetime or None."""
    try:
        t = _dt.datetime.fromisoformat(str(text).replace("Z", "+00:00"))
    except ValueError:
        return None
    return t if t.tzinfo is not None else None


# --------------------------------------------------------------------------- keys


def key_id(public_key):
    raw = public_key.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    return sha256_hex(raw)


def generate_keypair(private_path, public_path, passphrase=None):
    """Write a new Ed25519 private key (PEM, mode 0600, never overwritten) and its public key."""
    key = Ed25519PrivateKey.generate()
    enc = (serialization.BestAvailableEncryption(passphrase) if passphrase
           else serialization.NoEncryption())
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, enc)
    pub = key.public_key().public_bytes(serialization.Encoding.PEM,
                                        serialization.PublicFormat.SubjectPublicKeyInfo)
    if os.path.exists(public_path):
        raise EvidenceError(f"refusing to overwrite {public_path}")
    fd = os.open(private_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as f:
        f.write(pem)
    os.chmod(private_path, 0o600)
    with open(public_path, "xb") as f:
        f.write(pub)
    return key_id(key.public_key())


def load_private_key(path, passphrase=None):
    st = os.stat(path)
    if os.name == "posix" and st.st_mode & 0o077:
        raise EvidenceError(f"private key {path} is readable by others (mode {st.st_mode & 0o777:o}); chmod 600")
    with open(path, "rb") as f:
        key = serialization.load_pem_private_key(f.read(), password=passphrase)
    if not isinstance(key, Ed25519PrivateKey):
        raise EvidenceError(f"{path} is not an Ed25519 private key")
    return key


def load_public_key(path):
    with open(path, "rb") as f:
        key = serialization.load_pem_public_key(f.read())
    if not isinstance(key, Ed25519PublicKey):
        raise EvidenceError(f"{path} is not an Ed25519 public key")
    return key


def sign_hash(private_key, digest_hex):
    return base64.b64encode(private_key.sign(SIG_DOMAIN + bytes.fromhex(digest_hex))).decode("ascii")


def signature_ok(public_key, digest_hex, signature_b64):
    try:
        public_key.verify(base64.b64decode(signature_b64, validate=True), SIG_DOMAIN + bytes.fromhex(digest_hex))
        return True
    except (InvalidSignature, ValueError, TypeError):
        return False


# --------------------------------------------------------------------------- environment facts


def _run(cmd, timeout=5):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
    except (OSError, subprocess.SubprocessError):
        return None
    return p.stdout.strip() if p.returncode == 0 else None


def git_info(path):
    """Commit of the git checkout holding `path` (and whether that path is modified), if any."""
    if not path:
        return None, None
    d = path if os.path.isdir(path) else os.path.dirname(os.path.abspath(path))
    commit = _run(["git", "-C", d, "rev-parse", "HEAD"])
    if not commit or not GIT_SHA.match(commit):
        return None, None
    status = _run(["git", "-C", d, "status", "--porcelain", "--", os.path.abspath(path)])
    return commit, (None if status is None else bool(status))


def tool_info(name=TOOL_NAME, version=VERSION, path=None):
    commit, dirty = git_info(path or os.path.dirname(os.path.abspath(__file__)))
    return {"name": str(name), "version": str(version), "git_commit": commit, "git_dirty": dirty}


def clock_info():
    """Whether the system clock reports NTP synchronisation (timedatectl), else 'unknown'."""
    out = _run(["timedatectl", "show", "-p", "NTPSynchronized", "--value"])
    if out in ("yes", "no"):
        return {"ntp_synchronized": out, "method": "timedatectl"}
    if os.path.exists("/run/systemd/timesync/synchronized"):
        return {"ntp_synchronized": "yes", "method": "systemd-timesyncd flag file"}
    return {"ntp_synchronized": "unknown", "method": None}


# --------------------------------------------------------------------------- HTTPS capture helper


def _proxy_for(url, use_env_proxy):
    if not use_env_proxy:
        return None
    host = urllib.parse.urlsplit(url).hostname or ""
    if urllib.request.proxy_bypass(host):
        return None
    return urllib.request.getproxies().get("https")


def fetch_https(url, *, timeout=30.0, max_bytes=50 * 1024 * 1024, cafile=None, use_env_proxy=True,
                headers=None):
    """GET one https URL and return status, headers, body, server Date and the peer cert SHA-256.

    Redirects are not followed: the 3xx response itself is the evidence; the
    caller decides whether to capture the Location next. Behind a TLS-
    intercepting proxy the fingerprint is the proxy's certificate, not the
    origin's; it records the TLS endpoint actually spoken to.
    """
    import http.client

    parts = urllib.parse.urlsplit(url)
    if parts.scheme != "https" or not parts.hostname:
        raise EvidenceError("fetch_https needs an https:// URL")
    ctx = ssl.create_default_context(cafile=cafile)
    port = parts.port or 443
    proxy = _proxy_for(url, use_env_proxy)
    if proxy:
        p = urllib.parse.urlsplit(proxy)
        conn = http.client.HTTPSConnection(p.hostname, p.port or 8080, timeout=timeout, context=ctx)
        conn.set_tunnel(parts.hostname, port)
    else:
        conn = http.client.HTTPSConnection(parts.hostname, port, timeout=timeout, context=ctx)
    path = urllib.parse.urlunsplit(("", "", parts.path or "/", parts.query, ""))
    try:
        conn.request("GET", path, headers=dict({"User-Agent": f"{TOOL_NAME}/{VERSION}"}, **(headers or {})))
        der = conn.sock.getpeercert(binary_form=True)
        resp = conn.getresponse()
        body = resp.read(max_bytes + 1)
        if len(body) > max_bytes:
            raise EvidenceError(f"response exceeds the {max_bytes}-byte cap")
        return {
            "url": url, "status": resp.status, "headers": {k.lower(): v for k, v in resp.getheaders()},
            "server_date": resp.getheader("Date"), "body": body,
            "tls_cert_sha256": sha256_hex(der) if der else None,
        }
    finally:
        conn.close()


# --------------------------------------------------------------------------- the log


def chain_head(entries):
    """Structural chain check (seq, prev_hash, entry_hash). Returns (count, head) or raises."""
    prev = GENESIS
    for i, e in enumerate(entries):
        if e.get("seq") != i or e.get("prev_hash") != prev or entry_hash(e) != e.get("entry_hash"):
            raise EvidenceError(f"existing log is broken at line {i + 1}; run verify, do not extend it")
        prev = e["entry_hash"]
    return len(entries), prev


class EvidenceLog:
    """Append-only evidence directory. Use one instance per writer process."""

    def __init__(self, directory, *, operator=None, private_key=None, tool=None, host=None,
                 clock=clock_info, now=utc_now):
        self.dir = os.path.abspath(directory)
        self.log_path = os.path.join(self.dir, LOG_NAME)
        self.operator = (operator if operator is not None else os.environ.get(ENV_OPERATOR, "")).strip()
        self.private_key = private_key
        self.key_id = key_id(private_key.public_key()) if private_key else None
        self.tool = tool or tool_info()
        self.host = host or socket.gethostname()
        self._clock = clock
        self._now = now

    # -- reading

    def read_entries(self):
        if not os.path.exists(self.log_path):
            return []
        with open(self.log_path, "rb") as f:
            data = f.read()
        if data and not data.endswith(b"\n"):
            raise EvidenceError(f"{self.log_path} does not end with a newline (truncated write?)")
        return [parse_line(raw) for raw in data.split(b"\n")[:-1]] if data else []

    def head(self):
        entries = self.read_entries()
        return (len(entries), entries[-1]["entry_hash"]) if entries else (0, GENESIS)

    # -- writing

    def _check_tail(self, entries):
        """Refuse to extend a log whose chain or signing mode does not hold."""
        count, prev = chain_head(entries)
        if entries:
            existing = entries[-1].get("key_id")
            if existing != self.key_id:
                raise EvidenceError(
                    "this log is " + (f"signed by key {existing[:16]}" if existing else "unsigned")
                    + "; every entry must use the same signing mode and key")
        return count, prev

    def append(self, content=None, *, path=None, kind, source, status=None, server_date=None,
               tls_cert_sha256=None, extra=None):
        """Store `content` (bytes) or the file at `path` and append one entry. Returns the entry."""
        if not self.operator:
            raise EvidenceError(f"an operator is required (--operator or {ENV_OPERATOR})")
        if (content is None) == (path is None):
            raise EvidenceError("give exactly one of content or path")
        if not kind or not source:
            raise EvidenceError("kind and source are required")
        if tls_cert_sha256 is not None and not HEX64.match(tls_cert_sha256):
            raise EvidenceError("tls_cert_sha256 must be 64 lower-case hex digits")
        os.makedirs(os.path.join(self.dir, OBJECTS_DIR), exist_ok=True)
        with open(os.path.join(self.dir, LOCK_NAME), "a") as lock:
            if fcntl is not None:
                fcntl.flock(lock, fcntl.LOCK_EX)
            seq, prev = self._check_tail(self.read_entries())
            sha, size, rel = self._store(seq, content, path)
            entry = {
                "format": FORMAT, "seq": seq, "utc": iso_utc(self._now()), "operator": self.operator,
                "host": self.host, "tool": self.tool, "clock": self._clock(), "kind": str(kind),
                "source": str(source), "status": status, "server_date": server_date,
                "tls_cert_sha256": tls_cert_sha256, "sha256": sha, "size": size, "file": rel,
                "extra": extra or {}, "key_id": self.key_id, "prev_hash": prev,
            }
            entry["entry_hash"] = entry_hash(entry)
            entry["signature"] = sign_hash(self.private_key, entry["entry_hash"]) if self.private_key else None
            with open(self.log_path, "ab") as f:
                f.write(canonical(entry) + b"\n")
                f.flush()
                os.fsync(f.fileno())
        return entry

    def _store(self, seq, content, path):
        """Write the bytes once under a name no other entry can have; returns (sha, size, rel)."""
        h = hashlib.sha256()
        tmp = os.path.join(self.dir, OBJECTS_DIR, f".{seq:06d}.{os.getpid()}.{time.monotonic_ns()}.tmp")
        size = 0
        with open(tmp, "xb") as out:
            if content is not None:
                h.update(content)
                out.write(content)
                size = len(content)
            else:
                with open(path, "rb") as src:
                    for chunk in iter(lambda: src.read(CHUNK), b""):
                        h.update(chunk)
                        out.write(chunk)
                        size += len(chunk)
            out.flush()
            os.fsync(out.fileno())
        sha = h.hexdigest()
        rel = f"{OBJECTS_DIR}/{seq:06d}_{sha}.bin"
        final = os.path.join(self.dir, rel)
        try:
            os.link(tmp, final)  # fails if the name exists: never overwrite
        except FileExistsError:
            os.unlink(tmp)
            raise EvidenceError(f"{rel} already exists; refusing to overwrite (stale object from a failed append?)")
        except OSError:  # no hard links on this filesystem: fall back to exclusive create + copy
            with open(tmp, "rb") as src, open(final, "xb") as dst:
                for chunk in iter(lambda: src.read(CHUNK), b""):
                    dst.write(chunk)
        os.unlink(tmp)
        os.chmod(final, 0o444)
        return sha, size, rel

    def capture_https(self, url, *, kind="http-response", extra=None, **fetch_kw):
        """Fetch an https URL and log the body with status, server Date and TLS fingerprint."""
        r = fetch_https(url, **fetch_kw)
        meta = dict(extra or {})
        meta.setdefault("content_type", r["headers"].get("content-type"))
        if r["status"] in (301, 302, 303, 307, 308):
            meta.setdefault("location", r["headers"].get("location"))
        return self.append(r["body"], kind=kind, source=url, status=r["status"], server_date=r["server_date"],
                           tls_cert_sha256=r["tls_cert_sha256"], extra=meta)


# --------------------------------------------------------------------------- verification


def _read_raw_lines(log_path, problems):
    with open(log_path, "rb") as f:
        data = f.read()
    if data and not data.endswith(b"\n"):
        problems.append("log does not end with a newline (truncated or appended by hand)")
        data += b"\n"
    return data.split(b"\n")[:-1] if data else []


def _check_fields(lineno, e, problems):
    missing = [k for k in ENTRY_FIELDS if k not in e]
    unknown = [k for k in e if k not in ENTRY_FIELDS]
    if missing:
        problems.append(f"line {lineno}: missing fields {missing}")
    if unknown:
        problems.append(f"line {lineno}: unknown fields {unknown} (added after capture?)")
    if e.get("format") != FORMAT:
        problems.append(f"line {lineno}: format {e.get('format')!r} is not {FORMAT}")
    if not str(e.get("operator") or "").strip():
        problems.append(f"line {lineno}: no operator")
    if parse_aware(e.get("utc")) is None:
        problems.append(f"line {lineno}: utc {e.get('utc')!r} is not a timezone-aware ISO time")


def _check_object(directory, lineno, e, problems):
    rel = str(e.get("file") or "")
    m = OBJECT_RE.match(rel)
    if not m or int(m.group(1)) != e.get("seq") or m.group(2) != e.get("sha256"):
        problems.append(f"line {lineno}: stored file name {rel!r} does not match seq/sha256")
        return None
    full = os.path.join(directory, rel)
    if not os.path.isfile(full):
        problems.append(f"line {lineno}: stored file missing: {rel}")
        return rel
    h, size = hashlib.sha256(), 0
    with open(full, "rb") as f:
        for chunk in iter(lambda: f.read(CHUNK), b""):
            h.update(chunk)
            size += len(chunk)
    if h.hexdigest() != e.get("sha256"):
        problems.append(f"line {lineno}: stored file {rel} does not match its sha256 (content altered)")
    if size != e.get("size"):
        problems.append(f"line {lineno}: stored file {rel} is {size} bytes, entry says {e.get('size')}")
    return rel


def _check_signature(lineno, e, public_key, pub_id, problems):
    sig, kid = e.get("signature"), e.get("key_id")
    if public_key is None:
        return
    if kid != pub_id:
        problems.append(f"line {lineno}: key_id {str(kid)[:16]} is not the given public key {pub_id[:16]}")
    if not sig or not signature_ok(public_key, str(e.get("entry_hash")), sig):
        problems.append(f"line {lineno}: signature does not verify with the given public key")


def _check_entry(directory, lineno, raw, prev, public_key, pub_id, report):
    """Check one raw line; returns (entry_hash or None, entry or None)."""
    problems = report["problems"]
    try:
        e = parse_line(raw)
    except ValueError as exc:
        problems.append(f"line {lineno}: not a JSON entry ({exc})")
        return None, None
    if not isinstance(e, dict):
        problems.append(f"line {lineno}: not a JSON object")
        return None, None
    _check_fields(lineno, e, problems)
    if e.get("seq") != lineno - 1:
        problems.append(f"line {lineno}: seq {e.get('seq')} where {lineno - 1} expected "
                        "(entry missing, inserted or reordered)")
    if prev is not None and e.get("prev_hash") != prev:
        problems.append(f"line {lineno}: prev_hash does not match the entry before it "
                        "(entry missing, inserted or reordered)")
    try:
        recomputed = entry_hash(e)
        exact = canonical(e) == raw
    except ValueError:
        recomputed, exact = None, False
    if recomputed != e.get("entry_hash"):
        problems.append(f"line {lineno}: metadata does not match entry_hash (entry edited)")
    elif not exact:
        problems.append(f"line {lineno}: line is not in canonical form (re-serialised or edited)")
    rel = _check_object(directory, lineno, e, problems)
    if rel:
        report["_listed"].add(rel)
    _check_signature(lineno, e, public_key, pub_id, problems)
    return e.get("entry_hash"), e


def _check_extra_objects(directory, report):
    obj_dir = os.path.join(directory, OBJECTS_DIR)
    if not os.path.isdir(obj_dir):
        return
    for name in sorted(os.listdir(obj_dir)):
        rel = f"{OBJECTS_DIR}/{name}"
        if rel not in report["_listed"]:
            report["problems"].append(f"{rel}: present on disk but not in the log (extra or orphaned file)")


def _signing_mode(entries, public_key, court, report):
    signed = [bool(e.get("signature")) for e in entries]
    kids = {e.get("key_id") for e in entries}
    report["signed"] = bool(signed) and all(signed)
    if any(signed) and not all(signed):
        report["problems"].append("log mixes signed and unsigned entries; a signed log must sign every entry")
    if len(kids) > 1:
        report["problems"].append(f"log uses {len(kids)} different key_id values")
    if report["signed"] and public_key is None:
        msg = "entries are signed but no --public-key was given, so signatures were not checked"
        (report["problems"] if court else report["warnings"]).append(msg)
    if not report["signed"] and entries:
        report["warnings"].append("log is unsigned: anyone with write access can re-chain it; "
                                  "rely on an anchored head or an RFC 3161 token")


def verify_log(directory, *, public_key=None, expect_head=None, court=False, tsa_cafile=None,
               token_checker=None):
    """Re-verify everything. Returns a report dict; report["ok"] is the verdict.

    court=True additionally requires either expect_head or a cryptographically
    valid RFC 3161 token whose imprint is the final head.
    """
    directory = os.path.abspath(directory)
    log_path = os.path.join(directory, LOG_NAME)
    if not os.path.isfile(log_path):
        raise EvidenceError(f"no {LOG_NAME} in {directory}")
    report = {"log": log_path, "count": 0, "head": GENESIS, "problems": [], "warnings": [],
              "signed": False, "tokens": [], "court": court, "_listed": set()}
    pub_id = key_id(public_key) if public_key is not None else None
    raws = _read_raw_lines(log_path, report["problems"])
    prev, entries, heads = GENESIS, [], {}
    for lineno, raw in enumerate(raws, 1):
        h, e = _check_entry(directory, lineno, raw, prev, public_key, pub_id, report)
        prev = h
        if e is not None:
            entries.append(e)
            heads[h] = e.get("seq")
    report["count"] = len(raws)
    report["head"] = prev if raws and prev else GENESIS
    _check_extra_objects(directory, report)
    _signing_mode(entries, public_key, court, report)
    _check_clock(entries, report)
    if expect_head is not None and expect_head != report["head"]:
        report["problems"].append(f"head {report['head']} does not match the expected head {expect_head} "
                                  "(log truncated, extended or rewritten)")
    if token_checker is None:
        from . import tsa as _tsa
        token_checker = _tsa.check_tokens
    report["tokens"] = token_checker(directory, heads, entries, cafile=tsa_cafile)
    for t in report["tokens"]:
        report["problems"].extend(t.get("problems", []))
        report["warnings"].extend(t.get("warnings", []))
    if court:
        _court_requirements(report, expect_head)
    report.pop("_listed")
    report["ok"] = not report["problems"]
    return report


def _check_clock(entries, report):
    last, unsynced = None, False
    for e in entries:
        t = parse_aware(e.get("utc"))
        if t is not None and last is not None and t < last:
            report["warnings"].append(f"seq {e.get('seq')}: utc goes backwards (clock stepped?)")
        last = t if t is not None else last
        clock = e.get("clock") if isinstance(e.get("clock"), dict) else {}
        unsynced = unsynced or clock.get("ntp_synchronized") != "yes"
    if unsynced:
        report["warnings"].append("some entries were captured without a confirmed NTP-synchronised clock; "
                                  "their utc is the capture host's claim only")


def _court_requirements(report, expect_head):
    covering = [t for t in report["tokens"] if t.get("covers_head") and t.get("signature_verified")]
    if expect_head is None and not covering:
        report["problems"].append(
            "court mode needs --expect-head (a head recorded outside this machine) or an RFC 3161 token "
            "over the final head verified against --tsa-ca")
    if report["count"] == 0:
        report["problems"].append("court mode: the log is empty")
