"""Read and independently re-verify the six older evidence formats, and say what each lacks.

Formats (read-only; the producing tools are not imported or changed):

    fetch-sidecars  opendata/fetch.py      <time>_<sha16>.json sidecars + .bin bodies
    rust-manifest   opendata-rs evidence   manifest.jsonl + objects/<sha256>.bin
    authority-chain opendata/authority.py  ChainLog JSON-lines (ledger and audit log)
    ring-manifest   opendata/ring_export   manifest.jsonl (chain_hash) + recordings
    columbus        realdata/columbus_records  run_*/manifest.json + numbered files
    hfmr-ledger     docs/hfmr/hfmr.py      Ledger JSON-lines (sequence/previous_hash/entry_hash)

Each importer recomputes that format's own integrity rule from the bytes on
disk and returns a report::

    {"format", "path", "verified", "count", "head", "problems", "notes",
     "lacks": [{"guarantee", "detail"}], "records": [normalised entries]}

`verified` means only "consistent under that format's own (weaker) rules".
`lacks` lists the guarantees of the shared library that the format does not
give. `to_evidence_log` copies a verified legacy set into a new shared log,
keeping each legacy entry and the legacy head as hashed `extra` metadata.
"""

import glob
import hashlib
import json
import os
import re

from . import core

GUARANTEES = {
    "metadata_hashed": "every metadata field is covered by a hash",
    "chained": "entries are hash-chained, so a deleted, inserted or reordered entry is detected",
    "signed": "each entry is signed with an operator key, so a re-chained forgery is detected",
    "trusted_time": "an RFC 3161 token from a third party fixes when the head existed",
    "operator": "the person (and host) that captured each entry is recorded and hashed",
    "capture_time": "a timezone-aware capture time is recorded and hashed",
    "server_date": "the server's HTTP Date header is recorded",
    "tls_fingerprint": "the TLS peer certificate SHA-256 is recorded for HTTPS captures",
    "tool_version": "tool name, version and git commit are recorded",
    "unique_files": "stored file names cannot collide, and files are never overwritten",
    "head_anchor": "the format's verifier accepts an expected head recorded outside the machine",
}
FORMATS = ("fetch-sidecars", "rust-manifest", "authority-chain", "ring-manifest", "columbus", "hfmr-ledger")
GENESIS = "0" * 64
RUST_FIELDS = ("seq", "utc", "method", "url", "final_url", "status", "request_body_sha256", "sha256",
               "bytes", "file", "prev_hash")
COLUMBUS_SAFE = re.compile(r"^[A-Za-z0-9._-]+$")


def _sha_file(path):
    h, n = hashlib.sha256(), 0
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(core.CHUNK), b""):
            h.update(chunk)
            n += len(chunk)
    return h.hexdigest(), n


def _report(fmt, path):
    return {"format": fmt, "path": os.path.abspath(path), "verified": False, "count": 0, "head": None,
            "problems": [], "notes": [], "lacks": [], "records": []}


def _lack(rep, guarantee, detail):
    rep["lacks"].append({"guarantee": guarantee, "detail": detail})


def _finish(rep, expect_head=None):
    if expect_head is not None and rep["head"] != expect_head:
        rep["problems"].append(f"head {rep['head']} does not match the expected head {expect_head}")
    rep["verified"] = not rep["problems"]
    return rep


def _record(seq, utc, source, sha, size, file, legacy, status=None):
    return {"seq": seq, "utc": utc, "source": source, "sha256": sha, "size": size, "file": file,
            "status": status, "legacy": legacy}


def _check_content(rep, label, full, sha, size):
    if not os.path.isfile(full):
        rep["problems"].append(f"{label}: stored file missing: {full}")
        return
    got, n = _sha_file(full)
    if got != sha:
        rep["problems"].append(f"{label}: stored file does not match its sha256 (content altered)")
    if size is not None and n != size:
        rep["problems"].append(f"{label}: stored file is {n} bytes, record says {size}")


def _read_jsonl(path, rep):
    out = []
    with open(path, "rb") as f:
        data = f.read()
    if data and not data.endswith(b"\n"):
        rep["problems"].append("file does not end with a newline (truncated write?)")
    for lineno, raw in enumerate(data.splitlines(), 1):
        if not raw.strip():
            rep["problems"].append(f"line {lineno}: blank line")
            continue
        try:
            out.append((lineno, json.loads(raw)))
        except ValueError:
            rep["problems"].append(f"line {lineno}: not JSON")
    return out


# --------------------------------------------------------------------------- opendata/fetch.py


def import_fetch_sidecars(directory, expect_head=None):
    """Sidecars are independent files: there is no chain and nothing hashes the metadata."""
    rep = _report("fetch-sidecars", directory)
    for side in sorted(glob.glob(os.path.join(directory, "*.json"))):
        name = os.path.basename(side)
        try:
            with open(side, encoding="utf-8") as f:
                meta = json.load(f)
        except (OSError, ValueError):
            rep["notes"].append(f"{name}: not a JSON sidecar, skipped")
            continue
        if not isinstance(meta, dict) or "sha256" not in meta or "fetched_at_utc" not in meta:
            rep["notes"].append(f"{name}: not a fetch.py sidecar, skipped")
            continue
        body = meta.get("body_file")
        full = None
        if body:
            full = body if os.path.isabs(body) else os.path.join(directory, body)
            if os.path.isabs(body):
                rep["notes"].append(f"{name}: body_file is an absolute path outside the evidence dir ({body})")
            _check_content(rep, name, full, meta.get("sha256"), meta.get("bytes"))
        elif meta.get("body_withheld"):
            rep["notes"].append(f"{name}: body withheld (contained a secret); only its sha256 exists")
        rep["records"].append(_record(None, meta.get("fetched_at_utc"), meta.get("final_url") or meta.get("url"),
                                      meta.get("sha256"), meta.get("bytes"), full, meta, meta.get("status")))
    rep["records"].sort(key=lambda r: (str(r["utc"]), r["sha256"] or ""))
    for i, r in enumerate(rep["records"]):
        r["seq"] = i
    rep["count"] = len(rep["records"])
    _lack(rep, "chained", "sidecars are separate files: deleting a capture (both files) leaves no trace")
    _lack(rep, "metadata_hashed", "url, status, time and sha256 in a sidecar can be edited undetectably; "
                                  "only the body is checkable against the sidecar's own sha256")
    _lack(rep, "unique_files", "names are <second>_<sha16>; the same response fetched twice in one second "
                               "is written to the same name ('w' mode) and the first sidecar is overwritten")
    for g in ("signed", "trusted_time", "operator", "server_date", "tls_fingerprint", "head_anchor"):
        _lack(rep, g, "not recorded by fetch.py")
    _lack(rep, "tool_version", "user_agent names the version but no git commit")
    return _finish(rep, expect_head)


# --------------------------------------------------------------------------- opendata-rs evidence.rs


def _rust_hash(entry):
    body = {k: entry.get(k) for k in RUST_FIELDS}  # serde serialises in declaration order
    return core.sha256_hex(json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))


def import_rust_manifest(directory, expect_head=None):
    rep = _report("rust-manifest", directory)
    path = os.path.join(directory, "manifest.jsonl")
    prev, listed = GENESIS, set()
    for lineno, e in _read_jsonl(path, rep):
        if set(e) != set(RUST_FIELDS) | {"entry_hash"}:
            rep["problems"].append(f"line {lineno}: fields {sorted(e)} are not the evidence.rs fields")
        if e.get("seq") != rep["count"]:
            rep["problems"].append(f"line {lineno}: seq {e.get('seq')} where {rep['count']} expected")
        if e.get("prev_hash") != prev:
            rep["problems"].append(f"line {lineno}: prev_hash does not match the entry before it")
        if _rust_hash(e) != e.get("entry_hash"):
            rep["problems"].append(f"line {lineno}: entry_hash mismatch (entry edited)")
        rel = str(e.get("file") or "")
        if ".." in rel.split("/") or os.path.isabs(rel):
            rep["problems"].append(f"line {lineno}: object path escapes the evidence dir")
        else:
            listed.add(rel)
            _check_content(rep, f"line {lineno}", os.path.join(directory, rel), e.get("sha256"), e.get("bytes"))
        rep["records"].append(_record(e.get("seq"), e.get("utc"), e.get("final_url") or e.get("url"),
                                      e.get("sha256"), e.get("bytes"), os.path.join(directory, rel), e,
                                      e.get("status")))
        prev = e.get("entry_hash")
        rep["count"] += 1
    rep["head"] = prev
    for p in sorted(glob.glob(os.path.join(directory, "objects", "*.bin"))):
        if os.path.relpath(p, directory).replace(os.sep, "/") not in listed:
            rep["notes"].append(f"{os.path.relpath(p, directory)}: object not referenced by the manifest")
    for g in ("signed", "trusted_time", "server_date", "tls_fingerprint", "tool_version"):
        _lack(rep, g, "not recorded by evidence.rs")
    _lack(rep, "operator", "no operator or host field")
    _lack(rep, "head_anchor", "verify_manifest takes no expected head; a truncated or re-chained manifest verifies")
    return _finish(rep, expect_head)


# --------------------------------------------------------------------------- opendata/authority.py ChainLog


def _authority_hash(entry):
    body = {k: v for k, v in entry.items() if k != "hash"}
    return core.sha256_hex(json.dumps(body, sort_keys=True, separators=(",", ":"),
                                      ensure_ascii=False).encode("utf-8"))


def _authority_actor(e):
    auth = e.get("authority") if isinstance(e.get("authority"), dict) else {}
    return e.get("actor") or e.get("by") or e.get("recorded_by") or auth.get("recorded_by")


def import_authority_chain(path, expect_head=None):
    rep = _report("authority-chain", path)
    prev, no_actor = GENESIS, 0
    for lineno, e in _read_jsonl(path, rep):
        rep["count"] += 1
        if not isinstance(e, dict) or "hash" not in e:
            rep["problems"].append(f"line {lineno}: no hash field")
            continue
        if e.get("seq") != rep["count"]:
            rep["problems"].append(f"line {lineno}: seq {e.get('seq')} where {rep['count']} expected")
        if e.get("prev") != prev:
            rep["problems"].append(f"line {lineno}: prev does not match the entry before it")
        if _authority_hash(e) != e["hash"]:
            rep["problems"].append(f"line {lineno}: content does not match its hash (entry edited)")
        if not _authority_actor(e):
            no_actor += 1
        if core.parse_aware(e.get("ts")) is None:
            rep["problems"].append(f"line {lineno}: ts {e.get('ts')!r} is not a timezone-aware time")
        rep["records"].append(_record(e.get("seq"), e.get("ts"), f"authority:{e.get('op') or e.get('event')}",
                                      None, None, None, e))
        prev = e["hash"]
    rep["head"] = prev
    if no_actor:
        _lack(rep, "operator", f"{no_actor} of {rep['count']} entries name no actor/recorded_by/by")
    _lack(rep, "signed", "entries are hashed but not signed: anyone with write access can re-chain the file")
    _lack(rep, "trusted_time", "ts is the local clock's claim; no third-party time")
    _lack(rep, "tool_version", "no tool version or git commit")
    rep["notes"].append("audit/ledger log of decisions: no captured content, so server_date, TLS and "
                        "stored-file guarantees do not apply")
    return _finish(rep, expect_head)


# --------------------------------------------------------------------------- opendata/ring_export.py


def _ring_hash(prev, record):
    body = {k: v for k, v in record.items() if k != "chain_hash"}
    canon = json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256((prev + "\n" + canon).encode("utf-8")).hexdigest()


def import_ring_manifest(directory, expect_head=None):
    rep = _report("ring-manifest", directory)
    prev, listed = GENESIS, set()
    for lineno, rec in _read_jsonl(os.path.join(directory, "manifest.jsonl"), rep):
        label = f"line {lineno} (event {rec.get('event_id')})"
        if rec.get("prev_hash") != prev:
            rep["problems"].append(f"{label}: prev_hash does not match the previous chain_hash")
        if rec.get("chain_hash") != _ring_hash(str(rec.get("prev_hash", "")), rec):
            rep["problems"].append(f"{label}: chain_hash mismatch (record edited)")
        name = rec.get("file")
        full = None
        if not name or os.path.basename(name) != name:
            rep["problems"].append(f"{label}: bad file name {name!r}")
        else:
            listed.add(name)
            full = os.path.join(directory, name)
            _check_content(rep, label, full, rec.get("sha256"), rec.get("bytes"))
        rep["records"].append(_record(rep["count"], rec.get("retrieved_at_utc"),
                                      f"ring:{rec.get('device_id')}/{rec.get('event_id')}",
                                      rec.get("sha256"), rec.get("bytes"), full, rec))
        prev = rec.get("chain_hash", "")
        rep["count"] += 1
    rep["head"] = prev
    for p in sorted(glob.glob(os.path.join(directory, "*.mp4"))):
        if os.path.basename(p) not in listed:
            rep["problems"].append(f"unlisted recording not in manifest: {os.path.basename(p)}")
    for g in ("signed", "trusted_time", "tool_version"):
        _lack(rep, g, "not recorded by ring_export.py")
    _lack(rep, "operator", "no operator field (the Ring account owner is implied, not recorded)")
    _lack(rep, "server_date", "the Ring API response Date header is not kept")
    _lack(rep, "tls_fingerprint", "not recorded")
    _lack(rep, "head_anchor", "ring_export verify takes no expected head; a truncated manifest verifies")
    return _finish(rep, expect_head)


# --------------------------------------------------------------------------- realdata/columbus_records.py


def _columbus_entries(rep, directory, files):
    chain, listed = GENESIS, set()
    for pos, item in enumerate(files, 1):
        item = item if isinstance(item, dict) else {}
        name, sha = item.get("name"), item.get("sha256")
        if not isinstance(name, str) or not COLUMBUS_SAFE.match(name) or name == "manifest.json":
            rep["problems"].append(f"entry {pos}: unsafe or missing file name {name!r}")
            continue
        listed.add(name)
        if item.get("seq") != pos:
            rep["problems"].append(f"{name}: seq {item.get('seq')} at position {pos}")
        chain = core.sha256_hex((chain + (sha if isinstance(sha, str) else "")).encode("ascii"))
        if item.get("chain") != chain:
            rep["problems"].append(f"{name}: hash chain breaks at position {pos}")
        full = os.path.join(directory, name)
        _check_content(rep, name, full, sha, item.get("bytes"))
        rep["records"].append(_record(pos - 1, item.get("retrieved_utc"), item.get("final_url") or item.get("url")
                                      or f"columbus:{name}", sha, item.get("bytes"), full, item, item.get("status")))
    return chain, listed


def import_columbus(directory, expect_head=None):
    rep = _report("columbus", directory)
    try:
        with open(os.path.join(directory, "manifest.json"), encoding="utf-8") as f:
            manifest = json.load(f)
    except (OSError, ValueError) as exc:
        rep["problems"].append(f"manifest.json unreadable: {exc}")
        return _finish(rep)
    files = manifest.get("files") if isinstance(manifest, dict) else None
    if not isinstance(files, list):
        rep["problems"].append("manifest.json has no file list")
        return _finish(rep)
    chain, listed = _columbus_entries(rep, directory, files)
    rep["count"], rep["head"] = len(files), chain
    if manifest.get("file_count") != len(files):
        rep["problems"].append(f"file_count {manifest.get('file_count')} != {len(files)} listed entries")
    if manifest.get("chain_head") != chain:
        rep["problems"].append("chain_head does not match the recomputed chain")
    for name in sorted(os.listdir(directory)):
        if name != "manifest.json" and name not in listed:
            rep["problems"].append(f"{name}: present on disk but not in manifest")
    unprotected = sorted({k for item in files if isinstance(item, dict) for k in item}
                         - {"seq", "name", "sha256", "chain"})
    top = sorted(set(manifest) - {"files", "chain_head", "file_count"})
    _lack(rep, "metadata_hashed", "the chain covers only each file's sha256; these per-file fields can be "
                                  f"edited undetectably: {unprotected}; and these top-level fields: {top}")
    _lack(rep, "capture_time", "retrieved_utc exists but is outside the chain")
    for g in ("signed", "trusted_time", "operator", "server_date", "tls_fingerprint", "tool_version"):
        _lack(rep, g, "not recorded by columbus_records.py")
    return _finish(rep, expect_head)


# --------------------------------------------------------------------------- docs/hfmr/hfmr.py Ledger


def import_hfmr_ledger(path, expect_head=None):
    rep = _report("hfmr-ledger", path)
    prev = GENESIS
    for lineno, e in _read_jsonl(path, rep):
        if not isinstance(e, dict):
            rep["problems"].append(f"line {lineno}: not an object")
            continue
        body = {k: v for k, v in e.items() if k != "entry_hash"}
        try:
            digest = core.sha256_hex(json.dumps(body, sort_keys=True, separators=(",", ":"),
                                                allow_nan=False).encode())
        except ValueError:
            digest = None
        if e.get("sequence") != rep["count"]:
            rep["problems"].append(f"line {lineno}: sequence {e.get('sequence')} where {rep['count']} expected")
        if e.get("previous_hash") != prev:
            rep["problems"].append(f"line {lineno}: previous_hash does not match the entry before it")
        if digest != e.get("entry_hash"):
            rep["problems"].append(f"line {lineno}: entry_hash mismatch (entry edited)")
        rep["records"].append(_record(e.get("sequence"), None, "hfmr:ledger", None, None, None, e))
        prev = e.get("entry_hash")
        rep["count"] += 1
    rep["head"] = prev
    _lack(rep, "capture_time", "entries carry no time at all")
    _lack(rep, "operator", "entries name no operator or host")
    _lack(rep, "signed", "the Ledger docstring says signatures are external; none are made")
    _lack(rep, "trusted_time", "no third-party time")
    _lack(rep, "tool_version", "no tool version or calibration-code commit")
    rep["notes"].append("decision/inference ledger: input files are referenced by source_sha256 only, "
                        "so stored-file, server_date and TLS guarantees do not apply")
    return _finish(rep, expect_head)


# --------------------------------------------------------------------------- dispatch and migration


IMPORTERS = {
    "fetch-sidecars": import_fetch_sidecars,
    "rust-manifest": import_rust_manifest,
    "authority-chain": import_authority_chain,
    "ring-manifest": import_ring_manifest,
    "columbus": import_columbus,
    "hfmr-ledger": import_hfmr_ledger,
}


def detect_format(path):
    """Best guess at the format of a file or directory, or None."""
    if os.path.isdir(path):
        if os.path.isfile(os.path.join(path, "manifest.json")):
            return "columbus"
        mf = os.path.join(path, "manifest.jsonl")
        if os.path.isfile(mf):
            with open(mf, "rb") as f:
                first = f.readline()
            return "rust-manifest" if b'"entry_hash"' in first else "ring-manifest"
        return "fetch-sidecars" if glob.glob(os.path.join(path, "*.json")) else None
    with open(path, "rb") as f:
        first = f.readline()
    if b'"previous_hash"' in first:
        return "hfmr-ledger"
    if b'"prev"' in first and b'"hash"' in first:
        return "authority-chain"
    return None


def import_any(path, fmt=None, expect_head=None):
    fmt = fmt or detect_format(path)
    if fmt not in IMPORTERS:
        raise core.EvidenceError(f"cannot tell the evidence format of {path}; pass one of {', '.join(FORMATS)}")
    return IMPORTERS[fmt](path, expect_head=expect_head)


def to_evidence_log(report, log):
    """Copy a verified legacy set into a shared EvidenceLog. Returns the new entries.

    The capture time of each new entry is the import time; the legacy time is
    kept only as a claim inside `extra`, with the legacy record and head, so the
    import itself is hashed and (if the log is signed) signed.
    """
    if not report["verified"]:
        raise core.EvidenceError(f"refusing to import a {report['format']} set that does not verify: "
                                 + "; ".join(report["problems"][:5]))
    out = []
    for r in report["records"]:
        extra = {"legacy_format": report["format"], "legacy_path": report["path"], "legacy_seq": r["seq"],
                 "legacy_head": report["head"], "legacy_utc_claim": r["utc"], "legacy_entry": r["legacy"],
                 "legacy_lacks": sorted({x["guarantee"] for x in report["lacks"]})}
        kind = f"import:{report['format']}"
        if r["file"] and os.path.isfile(r["file"]):
            e = log.append(path=r["file"], kind=kind, source=str(r["source"]), status=r["status"], extra=extra)
            if r["sha256"] and e["sha256"] != r["sha256"]:
                raise core.EvidenceError(f"{r['file']} changed while it was being imported "
                                         f"(seq {e['seq']} now records sha256 {e['sha256']})")
            out.append(e)
        else:
            out.append(log.append(core.canonical(r["legacy"]), kind=kind + ":record", source=str(r["source"]),
                                  status=r["status"], extra=extra))
    return out
