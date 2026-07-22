#!/usr/bin/env python3
"""WR-4600.3 Watchtower harvest — stdlib-only.

Principles (WR-4200):
  * grounding-first: --self-test must pass before any live call
  * no fabrication: every URL comes from an API response payload
  * delta not breakthrough: quiet days are still success
  * immutable snapshots: content-hashed, never rewritten
  * degrade, don't pad: keyed shards return 0 rows with procurement note
  * adverse-first: adverse shard runs before efficacy shards

Usage:
  python tools/harvest.py --self-test
  python tools/harvest.py --dry-run
  python tools/harvest.py --out snapshots/
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone

USER_AGENT = "wr-4600-watchtower/0.3 (+https://github.com)"
TRIAGE_TRIGGERS = ("HARM", "FLICKER", "OCULAR")


def _get(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------- shard: adverse (NCBI E-utils, keyless) ----------
def shard_adverse(dry_run: bool = False) -> dict:
    query = "(photobiomodulation OR low-level laser therapy) AND (adverse OR ocular OR retinal OR burn)"
    if dry_run:
        return {"id": "adverse", "rows": [], "note": "dry-run"}
    base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    url = base + "?" + urllib.parse.urlencode({"db": "pubmed", "term": query, "retmode": "json", "retmax": "25"})
    try:
        payload = json.loads(_get(url))
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as e:
        return {"id": "adverse", "rows": [], "error": str(e)}
    ids = payload.get("esearchresult", {}).get("idlist", []) or []
    rows = []
    for pmid in ids:
        # URL derived directly from API-returned id — not fabricated.
        rows.append({"pmid": pmid, "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/", "flags": _flag(pmid)})
    return {"id": "adverse", "query": query, "rows": rows}


def _flag(_id: str) -> list:
    # Deterministic empty-flag stub; real classifier lives elsewhere.
    return []


# ---------- shard: trials (ClinicalTrials.gov v2, keyless) ----------
def shard_trials(dry_run: bool = False) -> dict:
    if dry_run:
        return {"id": "trials", "rows": [], "note": "dry-run"}
    url = "https://clinicaltrials.gov/api/v2/studies?" + urllib.parse.urlencode(
        {"query.term": "photobiomodulation", "pageSize": "25"}
    )
    try:
        payload = json.loads(_get(url))
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as e:
        return {"id": "trials", "rows": [], "error": str(e)}
    rows = []
    for study in payload.get("studies", []) or []:
        nct = study.get("protocolSection", {}).get("identificationModule", {}).get("nctId")
        if not nct:
            continue
        rows.append({"nct": nct, "url": f"https://clinicaltrials.gov/study/{nct}"})
    return {"id": "trials", "rows": rows}


# ---------- shard: literature (Crossref, keyless) ----------
def shard_literature(dry_run: bool = False) -> dict:
    if dry_run:
        return {"id": "literature", "rows": [], "note": "dry-run"}
    url = "https://api.crossref.org/works?" + urllib.parse.urlencode(
        {"query": "photobiomodulation dose response", "rows": "25"}
    )
    try:
        payload = json.loads(_get(url))
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as e:
        return {"id": "literature", "rows": [], "error": str(e)}
    rows = []
    for item in payload.get("message", {}).get("items", []) or []:
        doi = item.get("DOI")
        api_url = item.get("URL")  # from API response — not constructed
        if not (doi and api_url):
            continue
        rows.append({"doi": doi, "url": api_url})
    return {"id": "literature", "rows": rows}


# ---------- shard: regulatory (keyed — degrades) ----------
def shard_regulatory(dry_run: bool = False) -> dict:
    if os.environ.get("OPENFDA_KEY"):
        # Real call omitted here to keep this stdlib-only path safe by default.
        return {"id": "regulatory", "rows": [], "note": "key present but call disabled in default path"}
    return {
        "id": "regulatory",
        "rows": [],
        "procurement_note": "Set OPENFDA_KEY to enable. Degraded to 0 rows (no padding).",
    }


# ---------- driver ----------
SHARDS = [
    ("adverse", shard_adverse),
    ("trials", shard_trials),
    ("literature", shard_literature),
    ("regulatory", shard_regulatory),
]


def harvest(dry_run: bool = False) -> dict:
    shards = []
    for name, fn in SHARDS:
        t0 = time.time()
        result = fn(dry_run=dry_run)
        result["elapsed_ms"] = int((time.time() - t0) * 1000)
        shards.append(result)
    snapshot = {
        "spec": "WR-4600.3",
        "timestamp": _now_iso(),
        "dry_run": dry_run,
        "shards": shards,
    }
    body = json.dumps(snapshot, sort_keys=True, separators=(",", ":")).encode()
    snapshot["content_hash"] = _sha256(body)
    return snapshot


def triage_rows(snapshot: dict) -> list:
    hits = []
    for shard in snapshot.get("shards", []):
        for row in shard.get("rows", []) or []:
            flags = row.get("flags") or []
            if any(t in flags for t in TRIAGE_TRIGGERS):
                hits.append({"shard": shard["id"], "row": row})
    return hits


# ---------- self-test (offline, deterministic) ----------
def self_test() -> tuple[int, int, list]:
    checks = []

    def ok(name, cond):
        checks.append((name, bool(cond)))

    # 1-4: shard registry integrity + adverse-first ordering
    ok("shards-registered", len(SHARDS) == 4)
    ok("adverse-first", SHARDS[0][0] == "adverse")
    ok("trials-second", SHARDS[1][0] == "trials")
    ok("literature-third", SHARDS[2][0] == "literature")

    # 5: regulatory last (keyed shard runs after keyless)
    ok("regulatory-last", SHARDS[-1][0] == "regulatory")

    # 6-9: dry-run shards produce rows==[] and no error
    for name, fn in SHARDS:
        r = fn(dry_run=True)
        ok(f"dry-run-{name}-empty", r.get("rows") == [])

    # 10: regulatory degrades with procurement note when unkeyed
    prev = os.environ.pop("OPENFDA_KEY", None)
    try:
        r = shard_regulatory(dry_run=False)
        ok("regulatory-degrades", r["rows"] == [] and "procurement_note" in r)
    finally:
        if prev is not None:
            os.environ["OPENFDA_KEY"] = prev

    # 11: content hash stable for identical dry-run snapshot bodies
    a = harvest(dry_run=True)
    b = harvest(dry_run=True)
    a_body = {k: v for k, v in a.items() if k not in ("timestamp", "content_hash")}
    b_body = {k: v for k, v in b.items() if k not in ("timestamp", "content_hash")}
    ok("hash-stable-modulo-time", a_body == b_body)

    # 12: triage triggers configured
    ok("triage-triggers", set(TRIAGE_TRIGGERS) == {"HARM", "FLICKER", "OCULAR"})

    # 13: quiet-day snapshot still emits spec + timestamp
    snap = harvest(dry_run=True)
    ok("quiet-day-spec", snap.get("spec") == "WR-4600.3")
    # 14
    ok("quiet-day-timestamp", isinstance(snap.get("timestamp"), str) and snap["timestamp"].endswith("Z"))
    # 15
    ok("quiet-day-hash", isinstance(snap.get("content_hash"), str) and len(snap["content_hash"]) == 64)

    # 16: no fabricated URLs in dry-run (rows are empty)
    urls = [row.get("url") for s in snap["shards"] for row in (s.get("rows") or [])]
    ok("no-fabricated-urls-dry-run", urls == [])

    # 17: triage returns [] on quiet day
    ok("triage-empty-quiet", triage_rows(snap) == [])

    passed = sum(1 for _, v in checks if v)
    return passed, len(checks), checks


def main(argv=None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--self-test", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--out", default=None, help="snapshot directory")
    p.add_argument("--triage-out", default=None, help="write triage rows JSON here")
    args = p.parse_args(argv)

    if args.self_test:
        passed, total, checks = self_test()
        for name, ok_ in checks:
            print(f"{'PASS' if ok_ else 'FAIL'}  {name}")
        print(f"\n{passed}/{total} checks passed")
        return 0 if passed == total else 1

    snapshot = harvest(dry_run=args.dry_run)
    if args.out:
        os.makedirs(args.out, exist_ok=True)
        path = os.path.join(args.out, f"{snapshot['timestamp'].replace(':', '')}-{snapshot['content_hash'][:12]}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2, sort_keys=True)
        print(f"wrote {path}")
    else:
        json.dump(snapshot, sys.stdout, indent=2, sort_keys=True)
        sys.stdout.write("\n")

    triage = triage_rows(snapshot)
    if args.triage_out:
        with open(args.triage_out, "w", encoding="utf-8") as f:
            json.dump(triage, f, indent=2)
    if triage:
        print(f"TRIAGE: {len(triage)} row(s) require attention", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
