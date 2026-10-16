"""RFC 3161 trusted timestamps over an evidence-log head, using the openssl CLI.

The message imprint sent to the TSA is the head entry's ``entry_hash``
itself. That value is already SHA-256 over the canonical JSON of the head
entry, so a token proves: "an entry whose canonical form hashes to H existed
no later than genTime", and through the chain, every entry before it.

Files written next to the log (never overwritten):

    head_<seq:06d>_<head>_<n>.tsq       the TimeStampReq sent
    head_<seq:06d>_<head>_<n>.tsr       the TimeStampResp received
    head_<seq:06d>_<head>_<n>.tsr.json  informational sidecar (tsa url, times)

Verification never trusts the file name or sidecar: it reads the imprint out
of the token and looks it up in the recomputed chain.
"""

import datetime as _dt
import json
import os
import re
import shutil
import subprocess
import tempfile
import urllib.request

from . import core

DEFAULT_TSAS = ("http://timestamp.digicert.com", "https://freetsa.org/tsr")
TOKEN_RE = re.compile(r"^head_(\d{6,})_([0-9a-f]{64})_(\d+)\.tsr$")
MAX_REPLY = 1 << 20
CLOCK_SLACK = _dt.timedelta(minutes=5)


class TSAError(core.EvidenceError):
    """A timestamp could not be obtained or checked."""


def _openssl():
    exe = shutil.which("openssl")
    if not exe:
        raise TSAError("the openssl command is required for RFC 3161 and was not found")
    return exe


def _ossl(args, timeout=30, input_bytes=None):
    # p = subprocess.run([_openssl()] + args, input=input_bytes, capture_output=True, timeout=timeout,
    #                    check=False)
    # Replaced (review 2026-10-16): a timeout escaped as TimeoutExpired instead of the documented TSAError.
    try:
        p = subprocess.run([_openssl()] + args, input=input_bytes, capture_output=True, timeout=timeout,
                           check=False)
    except subprocess.TimeoutExpired:
        raise TSAError(f"openssl {' '.join(args[:2])} did not finish within {timeout}s")
    return p.returncode, p.stdout.decode("utf-8", "replace"), p.stderr.decode("utf-8", "replace")


def make_query(digest_hex, out_path):
    """Write a DER TimeStampReq (SHA-256 imprint, random nonce, certReq) for `digest_hex`."""
    if not core.HEX64.match(digest_hex or ""):
        raise TSAError("digest must be 64 lower-case hex digits")
    rc, _, err = _ossl(["ts", "-query", "-digest", digest_hex, "-sha256", "-cert", "-out", out_path])
    if rc != 0:
        raise TSAError(f"openssl ts -query failed: {err.strip()}")
    with open(out_path, "rb") as f:
        return f.read()


def post_query(url, tsq, *, timeout=30.0, proxies=None):
    """POST a TimeStampReq to a TSA and return the DER reply. proxies=None uses the environment."""
    handlers = [] if proxies is None else [urllib.request.ProxyHandler(proxies)]
    opener = urllib.request.build_opener(*handlers)
    req = urllib.request.Request(url, data=tsq, method="POST",
                                 headers={"Content-Type": "application/timestamp-query",
                                          "User-Agent": f"{core.TOOL_NAME}/{core.VERSION}"})
    with opener.open(req, timeout=timeout) as resp:
        body = resp.read(MAX_REPLY + 1)
        ctype = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
    if len(body) > MAX_REPLY:
        raise TSAError(f"{url}: reply larger than {MAX_REPLY} bytes")
    if ctype != "application/timestamp-reply":
        raise TSAError(f"{url}: reply content type {ctype or '(none)'!r} is not application/timestamp-reply")
    return body


def _hexdump_bytes(lines):
    out = ""
    for ln in lines:
        m = re.match(r"^\s*[0-9a-f]{4} - (.{1,47})", ln)
        if not m:
            break
        out += re.sub(r"[^0-9a-f]", "", m.group(1).replace("-", " "))
    return out


def _parse_time(text):
    text = re.sub(r"\s+", " ", text.strip())
    for fmt in ("%b %d %H:%M:%S.%f %Y GMT", "%b %d %H:%M:%S %Y GMT"):
        try:
            return _dt.datetime.strptime(text, fmt).replace(tzinfo=_dt.timezone.utc)
        except ValueError:
            continue
    return None


def read_reply(tsr_path):
    """Parse a TimeStampResp with `openssl ts -reply -text`. Returns a dict (not a trust decision)."""
    rc, out, err = _ossl(["ts", "-reply", "-in", tsr_path, "-text"])
    if rc != 0:
        raise TSAError(f"{tsr_path}: not a readable TimeStampResp ({err.strip()})")
    lines = out.splitlines()
    info = {"status": None, "hash_algorithm": None, "imprint": None, "gen_time": None,
            "serial": None, "policy": None, "tsa_name": None}
    for i, ln in enumerate(lines):
        key, _, val = ln.partition(":")
        key, val = key.strip(), val.strip()
        if key == "Status" and info["status"] is None:
            info["status"] = val.rstrip(".")
        elif key == "Hash Algorithm":
            info["hash_algorithm"] = val
        elif key == "Message data":
            info["imprint"] = _hexdump_bytes(lines[i + 1:])
        elif key == "Time stamp":
            t = _parse_time(val)
            info["gen_time"] = core.iso_utc(t) if t else val
        elif key == "Serial number":
            info["serial"] = val
        elif key == "Policy OID":
            info["policy"] = val
        elif key == "TSA":
            info["tsa_name"] = val
    return info


def verify_reply(tsr_path, digest_hex, cafile, *, queryfile=None, untrusted=None):
    """Cryptographically verify a token against a CA bundle. Returns (ok, openssl message)."""
    args = ["ts", "-verify", "-in", tsr_path, "-CAfile", cafile]
    args += ["-queryfile", queryfile] if queryfile else ["-digest", digest_hex]
    if untrusted:
        args += ["-untrusted", untrusted]
    # rc, out, err = _ossl(args)
    # Replaced (review 2026-10-16): an openssl failure to run is a failed verification, not an exception.
    try:
        rc, out, err = _ossl(args)
    except TSAError as exc:
        return False, str(exc)
    msg = (out + err).strip()
    return rc == 0 and "Verification: OK" in out, msg


def _next_base(directory, seq, head):
    n = 0
    while True:
        base = os.path.join(directory, f"head_{seq:06d}_{head}_{n}")
        if not os.path.exists(base + ".tsr") and not os.path.exists(base + ".tsq"):
            return base
        n += 1


def _write_once(path, data):
    with open(path, "xb") as f:
        f.write(data)


def _try_tsa(url, tsq, digest_hex, transport, timeout, cafile, workdir):
    tsr = transport(url, tsq, timeout=timeout)
    tmp = os.path.join(workdir, "reply.tsr")
    with open(tmp, "wb") as f:
        f.write(tsr)
    info = read_reply(tmp)
    if (info["status"] or "").lower() not in ("granted", "granted with modifications"):
        raise TSAError(f"{url}: TSA did not grant the request (status {info['status']!r})")
    if info["imprint"] != digest_hex:
        raise TSAError(f"{url}: reply imprint {info['imprint']} is not the head {digest_hex}")
    verified = None
    if cafile:
        verified, msg = verify_reply(tmp, digest_hex, cafile, queryfile=os.path.join(workdir, "q.tsq"))
        if not verified:
            raise TSAError(f"{url}: reply does not verify against {cafile} (nonce/imprint/signature): {msg}")
    return tsr, info, verified


def stamp_head(directory, *, tsa_urls=DEFAULT_TSAS, cafile=None, transport=post_query, timeout=30.0):
    """Get an RFC 3161 token for the current head from the first TSA that answers.

    The chain is re-checked first (a broken chain is never stamped). Returns a
    dict describing the stored token. Raises TSAError if every TSA failed.
    """
    log = core.EvidenceLog(directory, operator="(stamp)")
    entries = log.read_entries()
    if not entries:
        raise TSAError("the log is empty; nothing to timestamp")
    count, head = core.chain_head(entries)
    seq = count - 1
    errors = []
    with tempfile.TemporaryDirectory() as work:
        tsq = make_query(head, os.path.join(work, "q.tsq"))
        for url in tsa_urls:
            try:
                tsr, info, verified = _try_tsa(url, tsq, head, transport, timeout, cafile, work)
            except (OSError, core.EvidenceError, ValueError) as exc:
                errors.append(f"{url}: {exc}")
                continue
            base = _next_base(log.dir, seq, head)
            _write_once(base + ".tsq", tsq)
            _write_once(base + ".tsr", tsr)
            meta = {"head": head, "seq": seq, "tsa_url": url, "requested_utc": core.iso_utc(core.utc_now()),
                    "gen_time": info["gen_time"], "serial": info["serial"], "policy": info["policy"],
                    "verified_against_ca": bool(verified), "note": "informational; verify reads the .tsr"}
            _write_once(base + ".tsr.json", json.dumps(meta, indent=1, sort_keys=True).encode() + b"\n")
            return dict(meta, token=base + ".tsr")
    raise TSAError("no TSA issued a timestamp: " + "; ".join(errors))


def _token_record(directory, name, heads, entries, final_head, cafile):
    path = os.path.join(directory, name)
    rec = {"file": name, "problems": [], "warnings": [], "signature_verified": None, "covers_head": False}
    try:
        info = read_reply(path)
    except core.EvidenceError as exc:
        rec["problems"].append(f"{name}: {exc}")
        return rec
    rec.update(imprint=info["imprint"], gen_time=info["gen_time"], status=info["status"], tsa_name=info["tsa_name"])
    if (info["status"] or "").lower() not in ("granted", "granted with modifications"):
        rec["problems"].append(f"{name}: token status is {info['status']!r}, not granted")
    if (info["hash_algorithm"] or "").lower() != "sha256":
        rec["problems"].append(f"{name}: imprint algorithm {info['hash_algorithm']!r} is not sha256")
    seq = heads.get(info["imprint"])
    if seq is None:
        rec["problems"].append(f"{name}: token covers {info['imprint']}, which is not any entry_hash in this "
                               "chain (the log was rewritten after it was timestamped)")
        return rec
    rec["covers_seq"] = seq
    rec["covers_head"] = info["imprint"] == final_head
    gen = core.parse_aware(info["gen_time"])
    captured = core.parse_aware(entries[seq].get("utc")) if seq < len(entries) else None
    if gen and captured and gen + CLOCK_SLACK < captured:
        rec["warnings"].append(f"{name}: TSA time {info['gen_time']} is before the entry's own utc "
                               f"{entries[seq].get('utc')}: the capture host clock was fast")
    if cafile:
        ok, msg = verify_reply(path, info["imprint"], cafile)
        rec["signature_verified"] = ok
        if not ok:
            rec["problems"].append(f"{name}: token signature/chain does not verify against {cafile}: {msg}")
    return rec


def check_tokens(directory, heads, entries, *, cafile=None):
    """Check every head_*.tsr next to the log against the recomputed chain."""
    final_head = entries[-1].get("entry_hash") if entries else None
    out = []
    for name in sorted(os.listdir(directory)):
        if name.endswith(".tsr") and name.startswith("head_"):
            out.append(_token_record(directory, name, heads, entries, final_head, cafile))
    return out
