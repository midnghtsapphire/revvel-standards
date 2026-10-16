"""Bounded public HTTPS acquisition with provenance; no inferred acquisition dates."""

import csv
import hashlib
import json
import os
# unused (flake8 F401), kept for reference: import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
# unused (flake8 F401), kept for reference: from urllib.parse import urljoin
# Original: from urllib.request import Request, urlopen
#   urlopen is no longer the default opener (it followed redirects before they were checked).
from urllib.request import Request
from .safe_redirect import checked_urlopen

MAX_BYTES = 100 * 1024 * 1024


def validate_url(url, allowed_hosts):
    u = urlsplit(url)
    if u.scheme != "https" or not u.hostname or u.username or u.password or u.port not in (None, 443):
        raise ValueError("Only HTTPS URLs on explicitly allowed hosts are supported")
    if u.hostname.lower() not in {h.lower() for h in allowed_hosts}:
        raise ValueError("Host not on allowlist")
    return url


def utcnow():
    return datetime.now(timezone.utc).isoformat()


# Original: def fetch(url, destination, allowed_hosts, max_bytes=MAX_BYTES, opener=urlopen):
#   plain urlopen followed redirects to any host before the final URL was validated (SSRF).
def fetch(url, destination, allowed_hosts, max_bytes=MAX_BYTES, opener=None):
    """Download into new file; never overwrite. Redirect target is checked before reading response."""
    validate_url(url, allowed_hosts)
    if opener is None:
        # Every redirect Location is validated before urllib follows it.
        opener = checked_urlopen(lambda target: validate_url(target, allowed_hosts))
    if not 0 < max_bytes <= 2 * 1024 * 1024 * 1024:
        raise ValueError("Invalid maximum download size")
    out = Path(destination)
    if out.exists():
        raise FileExistsError(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    request = Request(url, headers={"User-Agent": "HFMR-Research/0.3 (public archival evidence)"})
    with opener(request, timeout=30) as response:
        final_url = response.geturl()
        validate_url(final_url, allowed_hosts)
        length = response.headers.get("Content-Length")
        if length is not None and int(length) > max_bytes:
            raise ValueError("Download exceeds size limit")
        digest = hashlib.sha256()
        count = 0
        fd, tmp = tempfile.mkstemp(prefix=".hfmr-", dir=out.parent)
        try:
            with os.fdopen(fd, "wb") as f:
                while True:
                    block = response.read(min(1024 * 1024, max_bytes - count + 1))
                    if not block:
                        break
                    count += len(block)
                    if count > max_bytes:
                        raise ValueError("Download exceeds size limit")
                    digest.update(block)
                    f.write(block)
                f.flush()
                os.fsync(f.fileno())
            # Atomic exclusive creation: no silent replacement.
            os.link(tmp, out)
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)
        return {
            "schema": "hfmr.acquisition.v1",
            "requested_url": url,
            "resolved_url": final_url,
            "retrieved_utc": utcnow(),
            "http_last_modified": response.headers.get("Last-Modified"),
            "http_etag": response.headers.get("ETag"),
            "bytes": count,
            "sha256": digest.hexdigest(),
            "acquisition_date": None,
            "acquisition_date_status": "UNVERIFIED",
            "file": str(out),
            "note": "HTTP Last-Modified is not the sensor acquisition date",
        }


def save_manifest(manifest, path):
    out = Path(path)
    if out.exists():
        raise FileExistsError(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("x", encoding="utf8") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)
        f.write("\n")


def verify_manifest(path):
    m = json.loads(Path(path).read_text(encoding="utf8"))
    p = Path(m["file"])
    h = hashlib.sha256()
    with p.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return p.stat().st_size == m["bytes"] and h.hexdigest() == m["sha256"]


def timeline(registry):
    """Registry rows are leads, not confirmed acquisition events."""
    with open(registry, newline="", encoding="utf8") as f:
        rows = list(csv.DictReader(f))
    return [
        {
            "source_id": r.get("source_id"),
            "modality": r.get("modality"),
            "claimed_window": r.get("acquisition_window"),
            "acquisition_verified": False,
            "source_url": r.get("source_url"),
            "verification_needed": r.get("validation_needed"),
        }
        for r in rows
    ]
